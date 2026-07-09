-- =========================================================
-- SUPER ADMIN: kelola admin lain (tambah/hapus/ubah role)
-- =========================================================

-- Simpan email di tabel admins agar mudah ditampilkan di panel
-- (auth.users tidak bisa di-query langsung dari client).
alter table admins add column if not exists email text;

-- Fungsi cek apakah user saat ini super_admin
create or replace function is_super_admin()
returns boolean as $$
  select exists (
    select 1 from admins where id = auth.uid() and role = 'super_admin'
  );
$$ language sql security definer stable;

-- Hanya super_admin yang boleh menambah/mengubah/menghapus data admin.
-- (select tetap pakai policy lama "admin view admins" - semua admin boleh lihat daftar)
create policy "super admin insert admins" on admins
  for insert
  with check (is_super_admin());

create policy "super admin update admins" on admins
  for update
  using (is_super_admin());

create policy "super admin delete admins" on admins
  for delete
  using (is_super_admin());
