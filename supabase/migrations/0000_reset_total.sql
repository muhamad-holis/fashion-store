-- =========================================================
-- RESET TOTAL DATABASE
-- =========================================================
-- Jalankan file ini SEKALI saja kalau kamu ingin mulai dari nol
-- (misalnya karena sempat error di tengah jalan migrasi).
-- Setelah ini selesai jalan tanpa error, lanjutkan urutan normal:
--   0001_init_schema.sql
--   0002_row_level_security.sql
--   0003_storage_buckets.sql
--   0004_seed_data.sql
--
-- Catatan: Supabase memblokir DELETE langsung ke storage.objects/
-- storage.buckets lewat SQL Editor (harus lewat Storage API). Tidak
-- masalah — file 0003_storage_buckets.sql sudah pakai
-- "on conflict do nothing", jadi aman dijalankan ulang meski bucket
-- sudah ada sebelumnya.
-- =========================================================

drop schema public cascade;
create schema public;

-- Kembalikan izin default schema public (wajib, karena drop schema menghapusnya)
grant all on schema public to postgres;
grant all on schema public to public;

-- Selesai. Schema public sekarang benar-benar kosong.
-- Lanjutkan jalankan 0001, 0002, 0003, 0004 secara berurutan.
