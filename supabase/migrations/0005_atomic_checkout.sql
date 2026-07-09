-- =========================================================
-- ATOMIC CHECKOUT
-- =========================================================
-- Masalah yang diperbaiki di sini:
-- 1. RACE CONDITION STOK: proses checkout lama membaca stok, lalu
--    mengurangi stok dengan beberapa query terpisah (read -> validate ->
--    write). Jika dua pembeli checkout produk yang sama di waktu yang
--    hampir bersamaan, keduanya bisa lolos validasi stok dengan nilai
--    yang sama-sama "lama" (belum ter-update), sehingga stok bisa minus
--    atau order dibuat padahal barang sudah habis (oversell).
-- 2. ORDER SETENGAH JADI: proses lama membuat order, order_items,
--    payment, dan mengurangi stok lewat banyak request terpisah tanpa
--    transaksi. Jika salah satu langkah gagal di tengah jalan (mis. koneksi
--    putus), order bisa "menggantung" (order dibuat tapi item/pembayaran
--    tidak, atau stok tidak berkurang) - data jadi tidak konsisten.
-- 3. NOMOR ORDER GANDA: generate_order_number() lama pakai count(*), yang
--    juga bisa balapan (dua checkout bersamaan bisa dapat nomor yang sama).
-- 4. SUBMIT GANDA (double-submit): user klik tombol bayar dua kali / retry
--    jaringan bisa membuat 2 order untuk satu kali checkout.
--
-- Solusi: satu fungsi Postgres (`create_order_atomic`) yang menjalankan
-- SEMUA langkah checkout dalam SATU transaksi database, dengan row-level
-- locking (`for update`) di baris produk/varian yang terlibat, dan
-- idempotency key supaya request yang sama tidak pernah membuat 2 order.
-- =========================================================

-- Kolom idempotency: setiap percobaan checkout dari client membawa 1 key
-- unik (dibuat sekali oleh browser). Jika request yang sama terkirim lagi
-- (retry/double click), kita kembalikan order yang sudah ada, bukan buat baru.
alter table orders add column if not exists idempotency_key text unique;

-- Counter nomor order per hari, diupdate secara atomic (insert ... on
-- conflict do update) sehingga tidak mungkin dua transaksi mendapat
-- nomor urut yang sama meski berjalan bersamaan.
create table if not exists order_number_counters (
  day text primary key,
  seq int not null default 0
);

create or replace function next_order_number()
returns text as $$
declare
  today text := to_char(now(), 'YYYYMMDD');
  next_seq int;
begin
  insert into order_number_counters (day, seq)
  values (today, 1)
  on conflict (day) do update set seq = order_number_counters.seq + 1
  returning seq into next_seq;

  return 'INV-' || today || '-' || lpad(next_seq::text, 4, '0');
end;
$$ language plpgsql;

-- Fungsi utama checkout. Semua langkah (validasi stok, kurangi stok,
-- buat order, order_items, payment, hapus cart) berjalan dalam satu
-- transaksi implisit milik fungsi ini. Jika ada error di tengah (mis.
-- stok kurang), seluruh perubahan otomatis di-rollback oleh Postgres -
-- tidak ada order/produk yang "setengah jadi".
create or replace function create_order_atomic(
  p_idempotency_key text,
  p_cart_item_ids uuid[],
  p_user_id uuid,
  p_session_id text,
  p_guest_name text,
  p_guest_phone text,
  p_guest_email text,
  p_shipping_address jsonb,
  p_courier_code text,
  p_courier_service text,
  p_shipping_cost numeric,
  p_shipping_eta text,
  p_payment_method text,
  p_payment_channel_detail text,
  p_buyer_note text,
  p_coupon_code text
)
returns jsonb as $$
declare
  v_existing_order_id uuid;
  v_existing_payment_id uuid;
  v_cart record;
  v_stock int;
  v_price numeric;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_total_weight int := 0;
  v_discount numeric := 0;
  v_grand_total numeric;
  v_coupon record;
  v_order_id uuid;
  v_order_number text;
  v_payment_id uuid;
  v_cart_count int;
begin
  -- 0. Idempotency: kalau key ini sudah pernah dipakai untuk membuat
  --    order, langsung kembalikan order yang sudah ada (tidak membuat
  --    order baru / tidak mengurangi stok lagi).
  if p_idempotency_key is not null then
    select id into v_existing_order_id from orders where idempotency_key = p_idempotency_key;
    if v_existing_order_id is not null then
      select id into v_existing_payment_id from payments where order_id = v_existing_order_id limit 1;
      return jsonb_build_object(
        'order_id', v_existing_order_id,
        'payment_id', v_existing_payment_id,
        'already_existed', true
      );
    end if;
  end if;

  -- 1. Validasi cart tidak kosong
  select count(*) into v_cart_count from cart_items where id = any(p_cart_item_ids);
  if v_cart_count = 0 then
    raise exception 'Keranjang kosong atau tidak valid' using errcode = 'P0001';
  end if;

  -- 2. Kunci baris produk & varian yang terlibat, urutkan berdasarkan id
  --    supaya kalau ada 2 checkout bersamaan yang sama-sama menyentuh
  --    beberapa produk, urutan lock-nya selalu konsisten (mencegah deadlock).
  --    "for update" membuat transaksi lain yang mencoba mengunci baris yang
  --    sama HARUS menunggu transaksi ini selesai -> tidak ada lagi
  --    race condition baca-stok-lama.
  for v_cart in
    select ci.id as cart_item_id, ci.product_id, ci.variant_id, ci.quantity,
           p.name as product_name, p.price as product_price, p.weight_grams,
           pv.price_override
    from cart_items ci
    join products p on p.id = ci.product_id
    left join product_variants pv on pv.id = ci.variant_id
    where ci.id = any(p_cart_item_ids)
      and (
        (p_user_id is not null and ci.user_id = p_user_id) or
        (p_user_id is null and ci.session_id = p_session_id)
      )
    order by ci.product_id, ci.variant_id
  loop
    if v_cart.variant_id is not null then
      select stock into v_stock from product_variants where id = v_cart.variant_id for update;
    else
      select stock into v_stock from products where id = v_cart.product_id for update;
    end if;

    if v_stock is null or v_stock < v_cart.quantity then
      raise exception 'Stok "%" tidak mencukupi', v_cart.product_name using errcode = 'P0002';
    end if;

    v_price := coalesce(v_cart.price_override, v_cart.product_price);
    v_line_total := v_price * v_cart.quantity;
    v_subtotal := v_subtotal + v_line_total;
    v_total_weight := v_total_weight + (v_cart.weight_grams * v_cart.quantity);
  end loop;

  -- 3. Voucher (jika ada) - divalidasi ulang di server, bukan percaya client
  if p_coupon_code is not null then
    select * into v_coupon from coupons
      where code = upper(p_coupon_code) and is_active = true
      for update;
    if found and v_subtotal >= coalesce(v_coupon.min_purchase, 0) then
      if v_coupon.discount_type = 'percent' then
        v_discount := least(v_subtotal * v_coupon.discount_value / 100, coalesce(v_coupon.max_discount, v_subtotal));
      else
        v_discount := v_coupon.discount_value;
      end if;
      update coupons set used_count = used_count + 1 where id = v_coupon.id;
    end if;
  end if;

  v_grand_total := greatest(0, v_subtotal - v_discount + coalesce(p_shipping_cost, 0));

  -- 4. Nomor order - atomic, tidak mungkin duplikat walau checkout bersamaan
  v_order_number := next_order_number();

  -- 5. Buat order
  insert into orders (
    order_number, user_id, guest_name, guest_phone, guest_email,
    shipping_address, courier_code, courier_service, shipping_cost, shipping_eta,
    subtotal, discount_total, total_weight_grams, grand_total,
    coupon_code, buyer_note, status, idempotency_key
  ) values (
    v_order_number, p_user_id, p_guest_name, p_guest_phone, p_guest_email,
    p_shipping_address, p_courier_code, p_courier_service, coalesce(p_shipping_cost, 0), p_shipping_eta,
    v_subtotal, v_discount, v_total_weight, v_grand_total,
    p_coupon_code, p_buyer_note, 'unpaid', p_idempotency_key
  ) returning id into v_order_id;

  -- 6. Order items + kurangi stok sekaligus (baris sudah terkunci dari langkah 2)
  for v_cart in
    select ci.id as cart_item_id, ci.product_id, ci.variant_id, ci.quantity,
           p.name as product_name, p.price as product_price, p.stock as product_stock,
           pv.stock as variant_stock, pv.price_override,
           (select url from product_images where product_id = ci.product_id and is_primary = true limit 1) as primary_image,
           (select url from product_images where product_id = ci.product_id order by sort_order limit 1) as fallback_image,
           c.name as color_name, s.label as size_label
    from cart_items ci
    join products p on p.id = ci.product_id
    left join product_variants pv on pv.id = ci.variant_id
    left join colors c on c.id = pv.color_id
    left join sizes s on s.id = pv.size_id
    where ci.id = any(p_cart_item_ids)
      and (
        (p_user_id is not null and ci.user_id = p_user_id) or
        (p_user_id is null and ci.session_id = p_session_id)
      )
  loop
    v_price := coalesce(v_cart.price_override, v_cart.product_price);

    insert into order_items (
      order_id, product_id, variant_id, product_name, product_image,
      color_name, size_label, unit_price, quantity, line_total
    ) values (
      v_order_id, v_cart.product_id, v_cart.variant_id, v_cart.product_name,
      coalesce(v_cart.primary_image, v_cart.fallback_image),
      v_cart.color_name, v_cart.size_label, v_price, v_cart.quantity, v_price * v_cart.quantity
    );

    if v_cart.variant_id is not null then
      update product_variants set stock = stock - v_cart.quantity where id = v_cart.variant_id;
    end if;
    update products set stock = stock - v_cart.quantity where id = v_cart.product_id;
    update products set sold_count = sold_count + v_cart.quantity where id = v_cart.product_id;
  end loop;

  -- 7. Payment (status pending, menunggu bukti bayar)
  insert into payments (order_id, method, channel_detail, amount, status)
  values (v_order_id, p_payment_method, p_payment_channel_detail, v_grand_total, 'pending')
  returning id into v_payment_id;

  -- 8. Kosongkan cart yang sudah checkout
  delete from cart_items where id = any(p_cart_item_ids);

  -- 9. Log aktivitas
  insert into activity_logs (actor_type, action, entity, entity_id, metadata)
  values ('system', 'order_created', 'orders', v_order_id::text, jsonb_build_object('order_number', v_order_number));

  return jsonb_build_object(
    'order_id', v_order_id,
    'payment_id', v_payment_id,
    'already_existed', false
  );
end;
$$ language plpgsql security definer;
