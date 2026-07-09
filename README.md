# Fashion Store — E-Commerce Fashion Modern

Fondasi production-ready untuk toko fashion online. Tema hitam-putih, elegant,
mobile-first ala TikTok Shop. Nama brand diatur lewat **Admin > Pengaturan Toko**
(bukan hardcode), jadi tabel `settings` sudah punya default `"Fashion Store"`
yang bisa diganti kapan saja.

## Status Project

Ini dibangun **bertahap**. Yang sudah selesai:

- ✅ Struktur project Next.js 15 + TypeScript + Tailwind + Shadcn-ready
- ✅ Schema database lengkap (25 tabel) + Row Level Security + Storage buckets
- ✅ Tema dark elegant hitam-putih, font Inter, komponen skeleton loading
- ✅ Halaman Home (hero, kategori, flash sale, terbaru, terlaris) — data live dari Supabase
- ✅ Header + bottom navigation mobile
- ✅ Middleware auth untuk proteksi `/admin`
- ✅ Modul ongkir siap plug ke RajaOngkir/Komerce, fallback kalkulasi manual
- ✅ **Halaman listing produk** dengan filter (kategori, harga, warna, ukuran, rating) & sort
- ✅ **Halaman detail produk** — gallery foto/video, zoom, pilih varian warna/ukuran, deskripsi, detail bahan, panduan ukuran, ulasan, produk serupa
- ✅ **Keranjang** — tambah, edit jumlah, hapus, input voucher, mendukung guest (session_id) & user login
- ✅ **Wishlist** — toggle dari halaman produk, mendukung guest & user login
- ✅ **Checkout guest-friendly** — alamat, cek ongkir real-time per kurir, pilih metode bayar (QRIS/transfer/e-wallet), catatan pembeli
- ✅ **Invoice & upload bukti pembayaran** — tampilkan QRIS/rekening tujuan, upload bukti transfer
- ✅ **Lacak pesanan** tanpa login — cukup nomor order + nomor HP
- ✅ API routes: `/api/cart`, `/api/wishlist`, `/api/shipping`, `/api/orders`, `/api/orders/track`, `/api/orders/payment-proof`, `/api/settings` — semua validasi harga & stok dilakukan di server, tidak percaya input client

- ✅ **Admin Panel lengkap**:
  - Login admin (`/admin/login`) dengan cek role di tabel `admins`
  - Dashboard: total pendapatan, order, produk, grafik penjualan 7 hari, produk terlaris
  - CRUD Produk: nama, harga, stok, upload multi-foto, varian warna & ukuran dengan stok per kombinasi, SEO, status aktif/flash sale/new arrival
  - CRUD Kategori (dengan upload foto)
  - CRUD Banner (hero & promo)
  - CRUD Voucher (persen/nominal, min. pembelian, limit pemakaian)
  - Manajemen Order: filter status, detail order, update status, input nomor resi, cetak invoice
  - **Verifikasi Pembayaran**: lihat bukti transfer/QRIS yang diupload user, terima/tolak — otomatis mengubah status order
  - Daftar Customer & moderasi Review
  - **Pengaturan Toko**: nama brand (bisa diganti kapan saja tanpa redeploy), logo, favicon, kontak, sosial media, rekening bank, e-wallet, upload QRIS

Yang **belum** dibangun (lanjutan pengembangan opsional):

- ⬜ Halaman login/register untuk customer (opsional, karena checkout tetap guest-friendly)
- ⬜ Notifikasi email otomatis (status pesanan, pembayaran diterima, dikirim)
- ⬜ Ikon PWA (192x192, 512x512) — tinggal taruh file PNG di `public/icons/`
- ⬜ Halaman statis: Tentang, Kontak, FAQ, Kebijakan Privasi, Syarat Ketentuan

> Tanpa bagian di atas, toko **sudah bisa dioperasikan penuh**: admin bisa isi
> produk, atur nama brand, kelola banner/voucher, dan proses order dari masuk
> sampai selesai.

> Beri tahu saya bagian mana yang ingin dilanjutkan dulu — saya bangun modul
> demi modul agar setiap bagian benar-benar teruji jalan, bukan sekadar stub.

## Catatan Arsitektur Cart/Wishlist/Checkout

- Pengunjung (guest) mendapat `session_id` unik yang disimpan di `localStorage`
  browser (lihat `getGuestSessionId()` di `src/lib/utils.ts`), dikirim lewat
  header `x-session-id` di setiap request `apiFetch()`.
- Semua API cart/wishlist/order menggunakan **service role client** di server
  (bypass RLS) tapi tetap memfilter berdasarkan `session_id` atau `user_id`
  yang sah, sehingga guest checkout tetap aman tanpa perlu akun.
- Saat checkout, **harga dan stok selalu diambil ulang dari database di
  server** (`/api/orders`), bukan dari data yang dikirim client — mencegah
  manipulasi harga dari sisi browser.

## Cara Menjalankan

### 1. Install dependency

```bash
npm install
```

### 2. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com)
2. Buka **SQL Editor**, jalankan file di `supabase/migrations/` **berurutan**:
   - `0001_init_schema.sql`
   - `0002_row_level_security.sql`
   - `0003_storage_buckets.sql`
   - `0004_seed_data.sql`
3. Buat akun admin pertama:
   - Buka **Authentication > Users**, tambah user baru (email + password)
   - Jalankan SQL ini di SQL Editor (ganti `USER_ID` dengan id user yang baru dibuat):
     ```sql
     insert into admins (id, full_name, role) values ('USER_ID', 'Super Admin', 'super_admin');
     ```

### 3. Environment Variables

Salin `.env.example` menjadi `.env.local`, isi dengan kredensial dari
**Supabase Dashboard > Project Settings > API**:

```bash
cp .env.example .env.local
```

### 4. Jalankan development server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## Deploy ke Vercel

1. Push project ini ke GitHub
2. Import repo di [vercel.com/new](https://vercel.com/new)
3. Masukkan environment variables yang sama seperti `.env.local`
4. Deploy

## Struktur Folder

```
src/
  app/                # Routing Next.js App Router
  components/
    layout/           # Header, bottom nav
    product/          # Product card, gallery, dsb
    ui/               # Komponen dasar (button, input, dst — Shadcn style)
  lib/
    supabase/         # Client & server Supabase client
    shipping.ts       # Modul kalkulasi ongkir (RajaOngkir-ready)
    utils.ts          # Helper umum (format harga, slug, dsb)
  types/
    database.ts       # Tipe data sesuai schema Supabase
supabase/
  migrations/         # SQL schema, RLS, storage, seed data
```

## Keamanan

- **Row Level Security** aktif di semua tabel — akses publik hanya baca data
  katalog, sedangkan data pribadi (cart, order, address) dibatasi per user via `auth.uid()`.
- **Service role key** hanya dipakai di server (API routes), tidak pernah
  diekspos ke client.
- Guest checkout memakai kombinasi `session_id` (disimpan di localStorage
  browser) dan API route server-side untuk membuat order tanpa perlu login.
- Validasi input memakai `zod` di setiap form (akan ditambahkan bertahap
  seiring pembangunan halaman checkout & admin).

## Integrasi Ongkir

Secara default sistem menghitung ongkir manual berbasis berat & zona kota
(lihat `src/lib/shipping.ts`). Untuk data real-time JNE/J&T/dll, daftar akun
di [RajaOngkir](https://rajaongkir.com) atau [Komerce](https://rajaongkir.komerce.id),
lalu isi `RAJAONGKIR_API_KEY` di `.env.local` — sistem otomatis beralih
memakai API asli tanpa perlu ubah kode lain.
