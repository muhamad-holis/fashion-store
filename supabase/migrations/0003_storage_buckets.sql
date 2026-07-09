-- =========================================================
-- SUPABASE STORAGE BUCKETS
-- =========================================================
insert into storage.buckets (id, name, public)
values
  ('products', 'products', true),
  ('payment-proof', 'payment-proof', false),
  ('banner', 'banner', true),
  ('logo', 'logo', true),
  ('qris', 'qris', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public read untuk bucket yang memang publik
create policy "public read products bucket"
  on storage.objects for select
  using (bucket_id in ('products', 'banner', 'logo', 'qris', 'avatars'));

-- Admin only write untuk bucket konten toko
create policy "admin write products bucket"
  on storage.objects for insert
  with check (bucket_id in ('products', 'banner', 'logo', 'qris') and is_admin());
create policy "admin update products bucket"
  on storage.objects for update
  using (bucket_id in ('products', 'banner', 'logo', 'qris') and is_admin());
create policy "admin delete products bucket"
  on storage.objects for delete
  using (bucket_id in ('products', 'banner', 'logo', 'qris') and is_admin());

-- Payment proof: siapa saja (termasuk guest via signed upload dari server) boleh insert,
-- tapi hanya admin yang boleh membaca/mengelola secara langsung dari client.
create policy "insert payment proof"
  on storage.objects for insert
  with check (bucket_id = 'payment-proof');
create policy "admin read payment proof"
  on storage.objects for select
  using (bucket_id = 'payment-proof' and is_admin());
create policy "admin delete payment proof"
  on storage.objects for delete
  using (bucket_id = 'payment-proof' and is_admin());

-- Avatar: user boleh upload/update miliknya sendiri (folder = user id)
create policy "user write own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "user update own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
