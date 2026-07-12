-- =========================================================
-- 0014: Fitur Ajukan Retur / Refund (sungguhan, bukan placeholder)
-- =========================================================

create type return_status as enum ('pending', 'approved', 'rejected', 'refunded');
create type return_reason as enum ('wrong_item', 'damaged', 'not_as_described', 'wrong_size', 'changed_mind', 'other');

create table returns (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  order_item_id uuid references order_items(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  reason return_reason not null,
  description text,
  images jsonb not null default '[]',
  status return_status not null default 'pending',
  admin_note text,
  refund_amount numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table returns enable row level security;

create policy "user create own return" on returns for insert
  with check (auth.uid() = user_id);
create policy "user read own return" on returns for select
  using (auth.uid() = user_id or is_admin());
create policy "admin update return" on returns for update
  using (is_admin());

create index idx_returns_order_id on returns(order_id);
create index idx_returns_user_id on returns(user_id);

-- updated_at otomatis
create or replace function touch_returns_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_touch_returns_updated_at
before update on returns
for each row execute function touch_returns_updated_at();

-- Storage bucket untuk foto bukti retur (barang rusak/salah, dll)
insert into storage.buckets (id, name, public)
values ('returns', 'returns', true)
on conflict (id) do nothing;

create policy "public read returns bucket" on storage.objects for select
  using (bucket_id = 'returns');
create policy "user upload own return photos" on storage.objects for insert
  with check (bucket_id = 'returns' and (storage.foldername(name))[1] = auth.uid()::text);

-- Notifikasi otomatis saat status retur berubah (approve/reject/refund),
-- pola yang sama seperti trigger notifikasi status pesanan (0011).
create or replace function notify_return_status_change() returns trigger
language plpgsql security definer as $$
declare
  v_order_number text;
  v_title text;
  v_message text;
begin
  if new.user_id is null then
    return new;
  end if;

  select order_number into v_order_number from orders where id = new.order_id;

  case new.status
    when 'approved' then
      v_title := 'Retur Disetujui';
      v_message := 'Pengajuan retur untuk pesanan ' || v_order_number || ' telah disetujui. Ikuti instruksi pengembalian barang dari admin.';
    when 'rejected' then
      v_title := 'Retur Ditolak';
      v_message := 'Pengajuan retur untuk pesanan ' || v_order_number || ' ditolak.' ||
                   case when new.admin_note is not null then ' Alasan: ' || new.admin_note else '' end;
    when 'refunded' then
      v_title := 'Dana Retur Dikembalikan';
      v_message := 'Refund untuk pesanan ' || v_order_number || ' telah selesai diproses.';
    else
      return new; -- 'pending' (status awal) tidak perlu notifikasi
  end case;

  insert into notifications (user_id, order_id, channel, title, message)
  values (new.user_id, new.order_id, 'toast', v_title, v_message);

  return new;
end;
$$;

drop trigger if exists trg_notify_return_status on returns;
create trigger trg_notify_return_status
after update of status on returns
for each row
when (old.status is distinct from new.status)
execute function notify_return_status_change();
