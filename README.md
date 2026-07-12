# Fashion Store — E-Commerce Fashion Modern

Toko fashion online production-ready. Tema hitam-putih, elegant, mobile-first
ala TikTok Shop. Nama brand, logo, kontak, rekening, dan seluruh konten
legal diatur lewat **Admin Panel** (tidak hardcode di kode).

## Status Project

Dibangun **bertahap**, sudah melewati beberapa audit bug. Berikut yang
sudah selesai dan berjalan:

### Toko (customer-facing)

- ✅ Halaman **Home** — hero, kategori, flash sale (dengan countdown), produk
  terbaru, produk terlaris, semua data live dari Supabase
- ✅ **Listing produk** dengan filter (kategori, harga, warna, ukuran,
  rating) & sort, serta halaman **detail produk** — gallery foto/video +
  zoom, pilih varian warna/ukuran, deskripsi, detail bahan, panduan ukuran,
  ulasan pembeli, produk serupa
- ✅ **Keranjang** — tambah, ubah jumlah, hapus, mendukung guest
  (`session_id` di localStorage) maupun user login
- ✅ **Wishlist** — toggle dari halaman produk, guest & user login
- ✅ **Checkout guest-friendly**:
  - Alamat, cek ongkir real-time per kurir, pilih metode bayar
    (QRIS/transfer bank/e-wallet), voucher, catatan pembeli
  - **Auto-isi alamat dari alamat tersimpan di akun** (alamat utama
    otomatis terisi kalau user sudah login & punya alamat tersimpan; bisa
    ganti ke alamat lain kalau punya lebih dari satu)
  - Anti-order-ganda lewat idempotency key, kalkulasi harga/stok/diskon
    final selalu dihitung ulang di server (`create_order_atomic`), tidak
    percaya input client
- ✅ **Invoice & upload bukti pembayaran** — tampilkan QRIS/rekening
  tujuan sesuai channel yang dipilih, upload bukti transfer, status
  verifikasi real-time
- ✅ **Lacak pesanan tanpa login** — cukup nomor order + nomor HP
- ✅ **Akun pelanggan** (opsional, checkout tetap bisa tanpa akun):
  - Login & register (Supabase Auth)
  - Edit profil (nama, HP, foto avatar)
  - **Kelola alamat** (`/akun/alamat`) — banyak alamat, tandai alamat utama
  - Riwayat & status pesanan, **konfirmasi "Pesanan Diterima"**
    (arrived → completed)
  - **Beri ulasan produk** setelah pesanan selesai — rating produk & jumlah
    ulasan ter-update otomatis lewat trigger
  - **Ajukan retur/refund** per item pesanan (alasan, deskripsi, foto),
    lihat status pengajuan
  - **Notifikasi otomatis** setiap status pesanan/retur berubah
  - Voucher aktif yang bisa dipakai
  - Pusat Bantuan (FAQ dari database + link WhatsApp CS)
  - Halaman statis: Tentang Kami, Syarat & Ketentuan, Kebijakan Privasi
    (isinya diatur dari Admin, bukan hardcode)
  - Pengaturan tema (dark/light) & logout

### Admin Panel

- ✅ Login admin (`/admin/login`) dengan cek role di tabel `admins`,
  proteksi seluruh `/admin/*` via middleware
- ✅ Dashboard — total pendapatan, order, produk, grafik penjualan 7 hari,
  produk terlaris
- ✅ CRUD Produk — nama, harga, stok, upload multi-foto, varian
  warna & ukuran dengan stok per kombinasi, SEO, status
  aktif/flash sale/new arrival
- ✅ CRUD Kategori (dengan upload foto)
- ✅ CRUD Banner (hero & promo)
- ✅ CRUD Voucher (persen/nominal, min. pembelian, limit pemakaian —
  kuota berkurang tepat 1x per pemakaian, sudah diperbaiki dari bug double count)
- ✅ Manajemen Order — filter status, detail order, update status, input
  nomor resi, cetak invoice
- ✅ **Verifikasi Pembayaran** — lihat bukti transfer/QRIS yang diupload
  user, terima/tolak, otomatis mengubah status order & mengirim notifikasi
- ✅ **Kelola Retur/Refund** — approve/reject pengajuan retur, catat nominal
  refund
- ✅ Moderasi Review (sembunyikan/tampilkan ulasan)
- ✅ Daftar Customer terdaftar
- ✅ **Kelola FAQ** untuk Pusat Bantuan
- ✅ **Pengaturan Pembayaran** — rekening bank, e-wallet, upload QRIS,
  dikelola terpisah dari pengaturan umum
- ✅ **Pengaturan Toko** — nama brand, logo, favicon, kontak, sosial media,
  konten Tentang Kami/Syarat/Privasi
- ✅ **Kelola Admin** (khusus super_admin) — tambah/hapus admin lain
  langsung dari panel, tanpa perlu SQL Editor lagi

### Infrastruktur

- ✅ Next.js 15 + TypeScript + Tailwind, tema dark elegant, skeleton loading
- ✅ Schema database lengkap (migration 0000–0014) + Row Level Security +
  Storage buckets, atomic checkout, integrity constraints
- ✅ Modul ongkir siap plug ke RajaOngkir/Komerce, fallback kalkulasi manual
  kalau API key kosong
- ✅ Notifikasi otomatis via trigger database (status pesanan & retur)
- ✅ API routes: `/api/cart`, `/api/wishlist`, `/api/shipping`,
  `/api/orders`, `/api/orders/track`, `/api/orders/payment-proof`,
  `/api/orders/mine/[orderNumber]`, `/api/settings`, `/api/admin/me`,
  `/api/admin/admins` — semua validasi harga/stok/hak akses dilakukan di
  server, tidak percaya input client

Yang **belum** dibangun (opsional, tidak menghalangi operasional toko):

- ⬜ Notifikasi email otomatis (saat ini notifikasi hanya muncul in-app di
  menu Akun > Notifikasi)
- ⬜ Ikon PWA (192x192, 512x512) — tinggal taruh file PNG di `public/icons/`,
  `manifest.json` sudah menunjuk ke path tersebut

> Tanpa dua bagian di atas, toko **sudah bisa dioperasikan penuh dari ujung
> ke ujung**: admin isi produk & atur toko, customer belanja (guest atau
> login), checkout, bayar, admin verifikasi, kirim, customer konfirmasi
> terima, kasih ulasan, atau ajukan retur kalau ada masalah.

## Catatan Arsitektur Cart/Wishlist/Checkout

- Pengunjung (guest) mendapat `session_id` unik yang disimpan di
  `localStorage` browser (lihat `getGuestSessionId()` di `src/lib/utils.ts`),
  dikirim lewat header `x-session-id` di setiap request `apiFetch()`.
- Semua API cart/wishlist/order menggunakan **service role client** di
  server (bypass RLS) tapi tetap memfilter berdasarkan `session_id` atau
  `user_id` yang sah, sehingga guest checkout tetap aman tanpa perlu akun.
- Saat checkout, kalau user login dan punya alamat tersimpan, form alamat
  otomatis terisi dari alamat utama (`is_default`) — lihat effect kedua di
  `src/app/checkout/page.tsx`. Fallback tetap ke pengisian manual untuk
  guest atau kalau belum punya alamat tersimpan.
- **Harga, stok, dan diskon voucher selalu dihitung ulang dari database di
  server** (`create_order_atomic`, migration `0005_atomic_checkout.sql` +
  perbaikan di `0013_perbaikan_bug_audit.sql`), bukan dari data yang
  dikirim client — mencegah manipulasi harga dari sisi browser. Idempotency
  key mencegah order ganda dari double-klik atau retry.

## Cara Menjalankan

### 1. Install dependency

```bash
npm install
```

### 2. Setup Supabase

**Project baru / kosong (fresh setup) — paling mudah:**

Jalankan satu file `supabase/schema-lengkap-fashion-store.sql` (gabungan
seluruh migration 0001–0014) di **SQL Editor**. Selesai dalam satu kali Run.

**Project yang sudah berjalan (update bertahap):**

Jalankan file di `supabase/migrations/` **berurutan sesuai nomor**, mulai
dari migration terakhir yang belum pernah dijalankan:

```
0001_init_schema.sql
0002_row_level_security.sql
0003_storage_buckets.sql
0004_seed_data.sql
0005_atomic_checkout.sql
0005_atomic_operations.sql
0006_data_integrity_constraints.sql
0007_admin_roles.sql
0008_fix_payment_method_enum_cast.sql
0009_confirm_receipt_and_reviews.sql
0010_sync_product_rating_stats.sql
0011_auto_notifications.sql
0012_konten_legal_dan_faq.sql
0013_perbaikan_bug_audit.sql
0014_fitur_retur_refund.sql
```

> Jangan pernah menjalankan file gabungan (`schema-lengkap-fashion-store.sql`)
> di database yang sudah berisi data produksi — dia untuk setup awal saja.

Buat akun admin pertama (super admin):

1. Buka **Authentication > Users**, tambah user baru (email + password)
2. Jalankan SQL ini di SQL Editor (ganti `USER_ID` dan `EMAIL`):
   ```sql
   insert into admins (id, full_name, email, role)
   values ('USER_ID', 'Super Admin', 'EMAIL', 'super_admin');
   ```
3. Setelah itu, admin lain bisa ditambahkan langsung dari panel
   **Admin > Kelola Admin** (menu ini hanya muncul untuk super admin) —
   tidak perlu lagi lewat SQL Editor.

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

### 5. Cek tipe sebelum push (opsional tapi disarankan)

```bash
npm run type-check
```

## Deploy ke Vercel

1. Push project ini ke GitHub
2. Import repo di [vercel.com/new](https://vercel.com/new)
3. Masukkan environment variables yang sama seperti `.env.local`
4. Deploy — setiap push ke branch `main` otomatis trigger redeploy

Checklist lengkap sebelum & sesudah deploy ada di `DEPLOYMENT_CHECKLIST.md`.

## Struktur Folder

```
src/
  app/
    admin/            # Panel admin (produk, order, retur, pengaturan, dst)
    akun/              # Halaman akun customer (login, alamat, pesanan, retur, dst)
    api/               # API routes (cart, orders, shipping, wishlist, admin, settings)
    cart/ checkout/ produk/ invoice/ pembayaran/ wishlist/  # Alur belanja
  components/
    account/          # Komponen halaman akun (address-manager, return-form, dst)
    admin/            # Komponen panel admin
    layout/           # Header, bottom nav
    product/          # Product card, gallery, filter, countdown flash sale
  lib/
    supabase/         # Client & server Supabase client
    shipping.ts       # Modul kalkulasi ongkir (RajaOngkir-ready)
    regions.ts        # Data provinsi/kota
    utils.ts          # Helper umum (format harga, slug, session guest, dst)
  types/
    database.ts       # Tipe data sesuai schema Supabase
supabase/
  migrations/         # SQL schema, RLS, storage, seed data — bernomor urut
  schema-lengkap-fashion-store.sql  # Gabungan semua migration, untuk setup awal
```

## Keamanan

- **Row Level Security** aktif di semua tabel — akses publik hanya baca
  data katalog, sedangkan data pribadi (cart, order, address, return)
  dibatasi per user via `auth.uid()`.
- **Service role key** hanya dipakai di server (API routes & middleware),
  tidak pernah diekspos ke client.
- Guest checkout memakai kombinasi `session_id` (localStorage browser) dan
  API route server-side untuk membuat order tanpa perlu login.
- Middleware memproteksi seluruh `/admin/*`, mengecek role di tabel
  `admins` lewat service role client (tidak bergantung ke RLS), dan
  membatasi `/admin/kelola-admin` khusus `super_admin`.
- Konfirmasi "Pesanan Diterima" dibatasi ketat lewat RLS policy: hanya bisa
  dari status `arrived` ke `completed`, dan hanya oleh pemilik order.

## Integrasi Ongkir

Secara default sistem menghitung ongkir manual berbasis berat & zona kota
(lihat `src/lib/shipping.ts`). Untuk data real-time JNE/J&T/dll, daftar akun
di [RajaOngkir](https://rajaongkir.com) atau
[Komerce](https://rajaongkir.komerce.id), lalu isi `RAJAONGKIR_API_KEY` di
`.env.local` — sistem otomatis beralih memakai API asli tanpa perlu ubah
kode lain.
