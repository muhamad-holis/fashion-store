# Catatan Perbaikan — Audit Keamanan (13 Juli 2026)

## 🔴 KRITIS — Manipulasi shipping_cost (SUDAH DIPERBAIKI)
**File:** `src/app/api/orders/route.ts`

`shipping_cost` dari body request tidak lagi dipakai sama sekali. Sebelum
memanggil `create_order_atomic`, server sekarang:
1. Mengambil ulang isi cart dari DB (bukan dari client) untuk menghitung total berat asli.
2. Memanggil `getShippingOptions()` sendiri berdasarkan berat + kota tujuan.
3. Mencocokkan `courier_code` yang dipilih client dengan daftar opsi resmi hasil hitungan server.
4. Memakai `cost`, `service`, dan `eta` dari hasil hitungan server itu — bukan dari client — saat insert order.

Kalau courier_code tidak ditemukan di hasil hitungan server (misal sudah kedaluwarsa atau dipalsukan), request ditolak dengan 400.

## 🟠 TINGGI — Suspense boundary (SUDAH DIPERBAIKI)
- `src/app/invoice/[orderNumber]/page.tsx` — dipecah jadi wrapper `<Suspense>` + komponen konten, sama seperti pola di `pembayaran/page.tsx`.
- `src/app/produk/page.tsx` — kedua pemakaian `<ProductFilters>` (desktop & mobile) dibungkus `<Suspense>`.

Sudah lolos `tsc --noEmit` tanpa error. Build penuh tidak bisa dijalankan sampai selesai di sandbox saya karena `next/font` butuh akses ke `fonts.googleapis.com` yang diblokir jaringan sandbox — ini bukan terkait kode, jalankan `npm run build` di Termux kamu untuk verifikasi akhir.

## 🟡 MENENGAH — Upload bukti bayar tanpa cek kepemilikan (SUDAH DIPERBAIKI)
**File:** `src/app/api/orders/payment-proof/route.ts`

Sekarang endpoint memverifikasi kepemilikan sebelum menerima upload:
- Order milik user login → dicek `auth.getUser()` harus cocok dengan `order.user_id`.
- Order guest → wajib menyertakan `phone` di form-data yang harus persis sama dengan `guest_phone` order tersebut.

Komponen yang memanggil endpoint ini (`invoice` page & `UploadProof` di halaman pembayaran) sudah disesuaikan untuk ikut mengirim nomor HP saat tersedia.

## Langkah selanjutnya di HP kamu
```bash
cd fashion-store
unzip -o /sdcard/Download/fashion-store-fixed.zip -d .
npm install
npm run build   # pastikan sukses di device kamu
git add -A
git commit -m "fix: validasi ongkir server-side, suspense boundary, cek kepemilikan upload bukti bayar"
git push
```

Tidak ada perubahan skema database yang diperlukan untuk ketiga perbaikan ini — semuanya di level API/komponen.

---

## Update 14 Juli 2026 — Bug bukti bayar tidak tampil di Admin Panel (SUDAH DIPERBAIKI)

**Gejala:** gambar bukti bayar di `/admin/pembayaran` dan `/admin/order/[id]` selalu muncul broken image, sudah reload berkali-kali tetap sama.

**Penyebab:** bucket storage `payment-proof` sengaja dibuat **private** (`public: false` di migration 0003) supaya hanya admin yang bisa baca. Tapi saat upload, kode memakai `getPublicUrl()` untuk membuat URL yang disimpan ke DB — URL jenis ini cuma bisa diakses kalau bucket-nya public. Karena bucket-nya private, URL itu **tidak akan pernah bisa dimuat**, di device manapun, semenjak awal.

**Perbaikan:**
- File baru `src/lib/storage.ts` — helper `getSignedPaymentProofUrl()` yang mengonversi URL "public" yang tersimpan menjadi *signed URL* sementara (berlaku 1 jam), dibuat khusus untuk sesi admin yang sedang login (lewat RLS policy `admin read payment proof` yang sudah ada).
- `src/app/admin/pembayaran/page.tsx` dan `src/app/admin/order/[id]/page.tsx` — sekarang menampilkan signed URL, bukan public URL yang tersimpan.
- `next.config.mjs` — pola `remotePatterns` untuk gambar Supabase diperluas dari `/storage/v1/object/public/**` menjadi `/storage/v1/object/**` supaya signed URL (`/object/sign/...`) juga diizinkan Next/Image.

Semua bukti bayar yang **sudah pernah diupload** (termasuk yang lama, sebelum fix ini) akan otomatis bisa tampil setelah deploy — karena path file di storage tidak berubah, cuma cara generate URL-nya yang diperbaiki. Tidak perlu upload ulang.

---

## Update 14 Juli 2026 — Fitur zoom bukti bayar di Admin Panel

Ditambahkan komponen `src/components/admin/payment-proof-lightbox.tsx` yang membungkus thumbnail bukti bayar di `/admin/pembayaran` dan `/admin/order/[id]`. Klik/tap gambarnya sekarang membuka tampilan penuh layar dengan:
- Tombol perbesar (+), perkecil (-), dan reset zoom
- Cubit dua jari (pinch-to-zoom) di layar sentuh
- Tap dua kali (double tap) untuk toggle zoom 2x
- Geser (drag) gambar saat sedang di-zoom
- Tombol X atau tap tombol close untuk menutup

Tidak ada perubahan database atau dependency baru — murni komponen React di sisi client.

