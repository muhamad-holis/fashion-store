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
