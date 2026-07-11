-- =========================================================
-- 0009: Konfirmasi Terima (customer) + Storage untuk Foto Ulasan
-- =========================================================

-- Izinkan pembeli mengonfirmasi SENDIRI bahwa pesanan sudah diterima.
-- Sengaja dibatasi ketat lewat USING + WITH CHECK:
--   - USING   : baris lama harus milik user ini DAN statusnya 'arrived'
--   - WITH CHECK : baris baru statusnya harus 'completed'
-- Jadi user tidak bisa mengubah ke status lain, dan tidak bisa
-- "melompat" dari status selain arrived langsung ke completed.
create policy "user confirm own arrived order" on orders for update
  using (auth.uid() = user_id and status = 'arrived')
  with check (status = 'completed');

-- Bucket untuk foto produk yang dilampirkan pembeli saat memberi ulasan.
insert into storage.buckets (id, name, public)
values ('reviews', 'reviews', true)
on conflict (id) do nothing;

create policy "public read reviews bucket"
  on storage.objects for select
  using (bucket_id = 'reviews');

-- User hanya boleh upload ke folder miliknya sendiri (folder pertama = user id),
-- pola yang sama seperti bucket avatars.
create policy "user upload own review photos"
  on storage.objects for insert
  with check (bucket_id = 'reviews' and (storage.foldername(name))[1] = auth.uid()::text);
