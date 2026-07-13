-- =========================================================
-- 0015: COD (Bayar di Tempat) terbatas wilayah
-- =========================================================
-- Fitur COD versi "Opsi A + gerbang validasi wilayah": buyer bayar cash
-- langsung ke toko/kurir internal saat barang tiba, BUKAN lewat integrasi
-- API kurir (itu "Opsi B" yang jauh lebih berat - lihat diskusi project).
-- COD hanya dimunculkan sebagai pilihan kalau alamat buyer (kecamatan +
-- kelurahan) cocok dengan daftar area yang diizinkan admin.
-- =========================================================

-- 1. Tambah 'cod' ke enum payment_method.
alter type payment_method add value if not exists 'cod';

-- 2. Kolom pengaturan COD di tabel settings, semuanya bisa diatur admin
--    dari halaman Pengaturan Pembayaran (tab baru "COD").
alter table settings add column if not exists cod_enabled boolean not null default false;
-- cod_areas: daftar area yang diizinkan, format [{district, subdistrict}].
-- Dicocokkan case-insensitive terhadap district & subdistrict alamat buyer.
alter table settings add column if not exists cod_areas jsonb not null default '[]'::jsonb;
-- cod_max_amount: batas nominal maksimal grand_total per order COD, biar
-- kalau ada yang iseng order barang mahal terus tidak bayar, kerugiannya
-- kecil. NULL berarti tidak ada batas.
alter table settings add column if not exists cod_max_amount numeric(12,2);
-- cod_shipping_fee: ongkir flat untuk COD (pengiriman lokal), BUKAN hasil
-- hitungan kurir nasional (RajaOngkir/estimasi manual) karena itu dihitung
-- untuk pengiriman antar kota dan tidak relevan buat pengiriman lokal ini.
alter table settings add column if not exists cod_shipping_fee numeric(12,2) not null default 0;

comment on column settings.cod_areas is
  'Daftar area yang diizinkan COD, format: [{"district": "...", "subdistrict": "..."}]';
