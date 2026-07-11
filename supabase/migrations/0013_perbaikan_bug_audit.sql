-- =========================================================
-- 0013: Perbaikan Bug Hasil Audit
-- =========================================================
-- Migration ini memperbaiki beberapa bug yang ditemukan saat audit
-- menyeluruh. Beberapa bug sebenarnya berasal dari migration lama
-- (0005/0006), baru ketahuan dampaknya setelah fitur Voucher & Konfirmasi
-- Terima aktif dipakai.

-- ---------------------------------------------------------
-- BUG 1 (KRITIS): used_count voucher dihitung DUA KALI setiap dipakai.
-- create_order_atomic() (0005/0008) sudah menambah used_count +1 saat
-- voucher dipakai. Trigger trg_increment_coupon_usage (0006) ikut
-- menambah +1 LAGI setiap ada order baru berstatus 'unpaid' dengan
-- coupon_code - padahal SEMUA order baru selalu berstatus 'unpaid' di
-- awal. Akibatnya kuota voucher habis 2x lebih cepat dari seharusnya.
-- Perbaikan: hapus trigger duplikat ini, biarkan create_order_atomic()
-- jadi satu-satunya sumber kebenaran.
-- ---------------------------------------------------------
drop trigger if exists trg_increment_coupon_usage on orders;

-- ---------------------------------------------------------
-- BUG 2 (KRITIS): create_order_atomic() tidak memeriksa usage_limit
-- maupun valid_until voucher di server - hanya dicek di sisi client
-- (yang bisa dilewati siapa pun yang memanggil API langsung). Voucher
-- yang kuotanya sudah habis atau sudah kedaluwarsa tetap bisa dipakai
-- lewat panggilan API langsung.
-- Perbaikan: create or replace dengan validasi tambahan. Fungsi ini
-- disalin PERSIS dari migration 0008 (versi yang aktif di production),
-- HANYA blok "Voucher" yang ditambah pengecekan usage_limit & valid_until.
-- Tidak ada baris lain yang diubah.
-- ---------------------------------------------------------
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

  select count(*) into v_cart_count from cart_items where id = any(p_cart_item_ids);
  if v_cart_count = 0 then
    raise exception 'Keranjang kosong atau tidak valid' using errcode = 'P0001';
  end if;

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

  -- FIX BUG 2 (audit 0013): validasi voucher sekarang juga memeriksa
  -- usage_limit (kuota) dan valid_until (kedaluwarsa) di server.
  if p_coupon_code is not null then
    select * into v_coupon from coupons
      where code = upper(p_coupon_code) and is_active = true
      for update;
    if found
       and v_subtotal >= coalesce(v_coupon.min_purchase, 0)
       and (v_coupon.valid_until is null or v_coupon.valid_until >= now())
       and (v_coupon.usage_limit is null or v_coupon.used_count < v_coupon.usage_limit)
    then
      if v_coupon.discount_type = 'percent' then
        v_discount := least(v_subtotal * v_coupon.discount_value / 100, coalesce(v_coupon.max_discount, v_subtotal));
      else
        v_discount := v_coupon.discount_value;
      end if;
      update coupons set used_count = used_count + 1 where id = v_coupon.id;
    end if;
  end if;

  v_grand_total := greatest(0, v_subtotal - v_discount + coalesce(p_shipping_cost, 0));

  v_order_number := next_order_number();

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

  insert into payments (order_id, method, channel_detail, amount, status)
  values (v_order_id, p_payment_method::payment_method, p_payment_channel_detail, v_grand_total, 'pending')
  returning id into v_payment_id;

  delete from cart_items where id = any(p_cart_item_ids);

  insert into activity_logs (actor_type, action, entity, entity_id, metadata)
  values ('system', 'order_created', 'orders', v_order_id::text, jsonb_build_object('order_number', v_order_number));

  return jsonb_build_object(
    'order_id', v_order_id,
    'payment_id', v_payment_id,
    'already_existed', false
  );
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------
-- BUG 3: Review bisa terkirim dobel untuk order_item yang sama kalau
-- user klik cepat 2x atau membuka halaman ulasan di 2 tab. Tidak ada
-- unique constraint yang mencegahnya di database.
-- Perbaikan: unique index (dikombinasikan dengan penanganan error yang
-- rapi di frontend, lihat perubahan review-form-list.tsx).
-- ---------------------------------------------------------
create unique index if not exists uniq_review_per_order_item
  on reviews(order_item_id)
  where order_item_id is not null;

-- ---------------------------------------------------------
-- BUG 4: Policy "user confirm own arrived order" (migration 0009)
-- mengizinkan UPDATE langsung ke tabel orders. WITH CHECK hanya
-- memvalidasi status='completed', TIDAK membatasi kolom lain di baris
-- yang sama - artinya panggilan API langsung (di luar UI resmi kita)
-- secara teori bisa menumpangi update itu untuk ikut mengubah kolom
-- lain juga (misal grand_total) selama status akhirnya 'completed'.
-- Perbaikan: ganti dengan function khusus (security definer) yang HANYA
-- pernah mengubah kolom status, lalu policy UPDATE mentah dicabut.
-- ---------------------------------------------------------
drop policy if exists "user confirm own arrived order" on orders;

create or replace function confirm_order_received(p_order_number text)
returns void
language plpgsql security definer as $$
declare
  v_order_id uuid;
begin
  update orders
  set status = 'completed'
  where order_number = p_order_number
    and user_id = auth.uid()
    and status = 'arrived'
  returning id into v_order_id;

  if v_order_id is null then
    raise exception 'Pesanan tidak ditemukan atau belum berstatus diterima' using errcode = 'P0003';
  end if;
end;
$$;

grant execute on function confirm_order_received(text) to authenticated;

-- ---------------------------------------------------------
-- BUG 5 (dormant, belum pernah ke-trigger sejauh ini): trigger
-- trg_update_product_metrics (0006) mereferensikan order_items.status,
-- padahal kolom itu TIDAK ADA di tabel order_items. Kalau suatu saat ada
-- fitur yang meng-UPDATE baris order_items, ini akan langsung gagal
-- dengan error database. sold_count sendiri sudah dihitung dengan benar
-- di create_order_atomic() saat order dibuat, jadi trigger ini memang
-- tidak diperlukan lagi.
-- ---------------------------------------------------------
drop trigger if exists trg_update_product_metrics on order_items;
