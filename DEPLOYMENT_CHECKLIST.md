# Deployment Checklist - Fashion Store

## 1. Setup Database (Supabase)

**Project baru / kosong (fresh setup):**
Jalankan satu file `schema-lengkap-fashion-store.sql` (gabungan seluruh
migration 0001-0014) di SQL Editor project Supabase yang masih kosong.
Selesai dalam satu kali Run.

**Project yang sudah berjalan (update):**
Jalankan file migration satu-satu secara berurutan sesuai nomornya, dari
`supabase/migrations/`, dimulai dari migration terakhir yang belum pernah
dijalankan. Jangan pernah menjalankan file gabungan di database yang sudah
berisi data produksi.

## 2. Environment Variables (Vercel)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, jangan pernah diekspos ke client)

## 3. Fungsi & Trigger Kunci yang Perlu Diverifikasi Aktif

Setelah migration dijalankan, cek fungsi-fungsi ini benar-benar ada
(`select proname from pg_proc where proname = '...'`):

| Fungsi | Kegunaan |
|---|---|
| `create_order_atomic` | Membuat pesanan + validasi stok & voucher secara atomik saat checkout |
| `confirm_order_received` | Konfirmasi terima pesanan oleh pembeli (arrived -> completed) |
| `sync_product_rating_stats` (trigger) | Sinkron otomatis rating & jumlah ulasan produk |
| `notify_order_status_change` (trigger) | Notifikasi otomatis saat status pesanan berubah |
| `notify_return_status_change` (trigger) | Notifikasi otomatis saat status retur berubah |

Catatan: `process_checkout()`, `stock_is_available()`, dan
`decrement_stock_atomic()` adalah sisa migration lama yang **tidak dipakai**
aplikasi - `create_order_atomic()` adalah fungsi checkout yang sesungguhnya
aktif.

## 4. Uji Coba Setelah Deploy

- [ ] Buat pesanan sebagai guest & sebagai user login
- [ ] Pakai kode voucher saat checkout, verifikasi diskon & kuota berkurang
      dengan benar (hanya berkurang 1x per pemakaian)
- [ ] Upload bukti pembayaran, verifikasi dari panel admin
- [ ] Ubah status pesanan dari admin, verifikasi notifikasi muncul di akun
      pembeli
- [ ] Konfirmasi "Pesanan Diterima" dari akun pembeli
- [ ] Beri ulasan produk, verifikasi rating produk ter-update
- [ ] Ajukan retur, proses approve/reject/refund dari admin
- [ ] Cek FAQ dan konten Kebijakan Privasi/Syarat Ketentuan tampil (dan bisa
      diedit dari Admin > Pengaturan)

## 5. Monitoring

- **Vercel** - tab Logs untuk error runtime (fungsi server, RSC boundary)
- **Supabase** - tab Logs untuk error database/RLS
- Checkout dan konfirmasi pesanan sebaiknya selesai dalam < 2 detik

## Catatan

- Struktur database dikelola lewat migration bernomor urut di
  `supabase/migrations/` - jangan mengedit file migration lama yang sudah
  pernah dijalankan; selalu buat file migration baru untuk perubahan baru.
- `schema-lengkap-fashion-store.sql` dibuat manual dengan menggabungkan
  seluruh file migration secara berurutan - kalau ada migration baru
  ditambahkan di kemudian hari, file gabungan ini perlu dibuat ulang.
