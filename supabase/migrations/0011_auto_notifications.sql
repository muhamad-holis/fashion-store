-- =========================================================
-- 0011: Notifikasi Otomatis (perubahan status pesanan & pembayaran)
-- =========================================================
-- Tabel `notifications` sudah ada sejak awal (lengkap dengan RLS), tapi
-- belum ada satu pun tempat di kode yang mengisinya. Trigger di bawah ini
-- membuat notifikasi OTOMATIS setiap kali status pesanan atau status
-- pembayaran berubah - dari mana pun perubahan itu terjadi (panel admin,
-- tombol "Pesanan Diterima" pembeli, dll), sehingga tidak perlu menambah
-- kode insert notifikasi di banyak tempat terpisah.

create or replace function notify_order_status_change() returns trigger
language plpgsql security definer as $$
declare
  v_title text;
  v_message text;
begin
  -- Pesanan tanpa akun (guest) tidak punya tempat untuk melihat notifikasi
  -- in-app, jadi dilewati.
  if new.user_id is null then
    return new;
  end if;

  case new.status
    when 'waiting_verification' then
      v_title := 'Pembayaran Sedang Diverifikasi';
      v_message := 'Bukti pembayaran untuk pesanan ' || new.order_number || ' sedang kami periksa.';
    when 'processing' then
      v_title := 'Pesanan Diproses';
      v_message := 'Pesanan ' || new.order_number || ' sedang diproses oleh tim kami.';
    when 'packed' then
      v_title := 'Pesanan Dikemas';
      v_message := 'Pesanan ' || new.order_number || ' sedang dikemas, siap dikirim.';
    when 'shipped' then
      v_title := 'Pesanan Dikirim';
      v_message := 'Pesanan ' || new.order_number || ' sudah dikirim. Cek nomor resi di halaman pesanan.';
    when 'arrived' then
      v_title := 'Pesanan Tiba';
      v_message := 'Pesanan ' || new.order_number || ' sudah sampai. Yuk konfirmasi penerimaan.';
    when 'completed' then
      v_title := 'Pesanan Selesai';
      v_message := 'Pesanan ' || new.order_number || ' selesai. Yuk beri ulasan produknya.';
    when 'cancelled' then
      v_title := 'Pesanan Dibatalkan';
      v_message := 'Pesanan ' || new.order_number || ' telah dibatalkan.';
    else
      return new; -- status 'unpaid' (awal) tidak perlu notifikasi
  end case;

  insert into notifications (user_id, order_id, channel, title, message)
  values (new.user_id, new.id, 'toast', v_title, v_message);

  return new;
end;
$$;

drop trigger if exists trg_notify_order_status on orders;
create trigger trg_notify_order_status
after update of status on orders
for each row
when (old.status is distinct from new.status)
execute function notify_order_status_change();


create or replace function notify_payment_status_change() returns trigger
language plpgsql security definer as $$
declare
  v_order record;
  v_title text;
  v_message text;
begin
  if new.status not in ('approved', 'rejected') then
    return new;
  end if;

  select id, user_id, order_number into v_order from orders where id = new.order_id;
  if v_order.user_id is null then
    return new;
  end if;

  if new.status = 'approved' then
    v_title := 'Pembayaran Dikonfirmasi';
    v_message := 'Pembayaran untuk pesanan ' || v_order.order_number || ' telah dikonfirmasi. Terima kasih!';
  else
    v_title := 'Pembayaran Ditolak';
    v_message := 'Bukti pembayaran untuk pesanan ' || v_order.order_number ||
                 ' ditolak. Silakan upload ulang atau hubungi admin.';
  end if;

  insert into notifications (user_id, order_id, channel, title, message)
  values (v_order.user_id, v_order.id, 'toast', v_title, v_message);

  return new;
end;
$$;

drop trigger if exists trg_notify_payment_status on payments;
create trigger trg_notify_payment_status
after update of status on payments
for each row
when (old.status is distinct from new.status)
execute function notify_payment_status_change();
