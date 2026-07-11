-- =========================================================
-- 0012: Konten Legal (Privasi/Syarat/Tentang Kami) + FAQ
-- =========================================================

alter table settings add column if not exists privacy_policy text;
alter table settings add column if not exists terms_conditions text;
alter table settings add column if not exists about_us text;

create table if not exists faqs (
  id uuid primary key default uuid_generate_v4(),
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table faqs enable row level security;

create policy "public read active faqs" on faqs for select
  using (is_active = true or is_admin());
create policy "admin manage faqs" on faqs for insert with check (is_admin());
create policy "admin update faqs" on faqs for update using (is_admin());
create policy "admin delete faqs" on faqs for delete using (is_admin());

-- Seed draft konten legal (hanya mengisi jika masih kosong, supaya aman
-- dijalankan ulang dan tidak menimpa konten yang sudah diedit admin).
update settings set
  privacy_policy = coalesce(privacy_policy, $$Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi pribadi Anda saat menggunakan layanan toko kami.

1. Informasi yang Kami Kumpulkan
Kami mengumpulkan informasi yang Anda berikan secara langsung, seperti nama, alamat, nomor telepon, email, dan data pesanan saat Anda berbelanja atau membuat akun.

2. Penggunaan Informasi
Informasi yang dikumpulkan digunakan untuk memproses pesanan, mengirimkan produk, memberikan layanan pelanggan, dan mengirimkan informasi promosi apabila Anda menyetujuinya.

3. Keamanan Data
Kami menerapkan langkah-langkah keamanan yang wajar untuk melindungi data pribadi Anda dari akses, perubahan, atau pengungkapan yang tidak sah.

4. Berbagi Informasi
Kami tidak menjual atau menyewakan data pribadi Anda kepada pihak ketiga. Data hanya dibagikan kepada mitra pengiriman (kurir) seperlunya untuk memproses pesanan Anda.

5. Cookie
Situs kami dapat menggunakan cookie untuk meningkatkan pengalaman berbelanja Anda, seperti mengingat isi keranjang belanja.

6. Hak Anda
Anda berhak untuk mengakses, memperbarui, atau menghapus data pribadi Anda dengan menghubungi layanan pelanggan kami.

7. Perubahan Kebijakan
Kebijakan privasi ini dapat diperbarui sewaktu-waktu. Perubahan akan diinformasikan melalui halaman ini.

Jika ada pertanyaan mengenai kebijakan privasi ini, silakan hubungi kami melalui menu Pusat Bantuan.$$),

  terms_conditions = coalesce(terms_conditions, $$Dengan mengakses dan menggunakan situs ini, Anda dianggap telah membaca, memahami, dan menyetujui seluruh syarat dan ketentuan berikut.

1. Akun Pengguna
Anda bertanggung jawab menjaga kerahasiaan informasi akun dan password Anda. Segala aktivitas yang terjadi melalui akun Anda menjadi tanggung jawab Anda.

2. Pemesanan
Pesanan dianggap sah setelah pembayaran diterima dan dikonfirmasi oleh sistem/admin kami. Kami berhak membatalkan pesanan apabila terjadi kesalahan harga, stok habis, atau indikasi kecurangan.

3. Harga & Pembayaran
Seluruh harga tercantum dalam Rupiah (IDR) dan dapat berubah sewaktu-waktu tanpa pemberitahuan sebelumnya. Pembayaran dilakukan melalui metode yang tersedia di halaman checkout.

4. Pengiriman
Estimasi waktu pengiriman bersifat perkiraan dan dapat dipengaruhi oleh faktor di luar kendali kami, seperti cuaca atau kendala pihak ekspedisi. Biaya pengiriman dihitung otomatis berdasarkan lokasi dan berat produk.

5. Retur & Pembatalan
Permintaan retur/pertukaran produk dapat diajukan sesuai kebijakan retur yang berlaku, dengan syarat produk belum digunakan dan dalam kondisi asli. Hubungi Pusat Bantuan untuk mengajukan retur.

6. Hak Kekayaan Intelektual
Seluruh konten di situs ini, termasuk logo, foto produk, dan teks, adalah milik toko kami dan dilindungi hak cipta. Dilarang menggunakan tanpa izin tertulis.

7. Batasan Tanggung Jawab
Kami tidak bertanggung jawab atas kerugian tidak langsung yang timbul dari penggunaan situs ini, sepanjang diizinkan oleh hukum yang berlaku.

8. Perubahan Ketentuan
Kami berhak mengubah syarat dan ketentuan ini sewaktu-waktu. Versi terbaru akan selalu tersedia di halaman ini.$$),

  about_us = coalesce(about_us, $$Kami adalah brand fashion lokal yang berdiri dengan semangat menghadirkan produk berkualitas dengan desain yang mengikuti tren terkini, namun tetap terjangkau untuk semua kalangan.

Setiap produk yang kami hadirkan dipilih dan diproduksi dengan memperhatikan kualitas bahan, kenyamanan, dan detail jahitan - karena kami percaya penampilan terbaik dimulai dari kualitas yang bisa diandalkan.

Kami berkomitmen memberikan pengalaman belanja online yang mudah, aman, dan menyenangkan - mulai dari proses pemesanan, pengemasan yang rapi, hingga pengiriman yang cepat ke seluruh Indonesia.

Terima kasih telah mempercayai kami sebagai bagian dari gaya berpakaian Anda.$$)
where id = 1;

-- Seed FAQ awal (hanya jika tabel masih kosong sama sekali, supaya aman
-- dijalankan ulang tanpa membuat data dobel).
insert into faqs (question, answer, sort_order)
select * from (values
  ('Bagaimana cara memesan produk?', 'Pilih produk yang diinginkan, tentukan warna/ukuran, lalu tekan tombol "Tambah Keranjang" atau "Beli Sekarang". Lanjutkan ke halaman checkout untuk mengisi alamat pengiriman dan memilih metode pembayaran.', 1),
  ('Metode pembayaran apa saja yang tersedia?', 'Kami menerima pembayaran melalui QRIS, transfer bank, dan e-wallet. Detail rekening/nomor tujuan dapat dilihat di halaman Metode Pembayaran saat checkout.', 2),
  ('Berapa lama estimasi pengiriman?', 'Estimasi pengiriman umumnya 2-4 hari kerja tergantung lokasi dan jasa kurir yang dipilih. Ongkos kirim dihitung otomatis berdasarkan alamat dan berat produk saat checkout.', 3),
  ('Bagaimana cara melacak status pesanan saya?', 'Buka menu Akun > Pesanan Saya, pilih pesanan yang ingin dilacak, lalu tekan tombol "Lacak Pesanan" untuk melihat status dan nomor resi terbaru.', 4),
  ('Apakah bisa melakukan retur atau tukar barang?', 'Bisa, selama produk belum digunakan, masih dalam kondisi asli, dan diajukan dalam batas waktu yang berlaku. Hubungi Pusat Bantuan atau gunakan tombol "Ajukan Retur" pada pesanan terkait.', 5),
  ('Bagaimana cara memilih ukuran yang tepat?', 'Setiap produk memiliki panduan ukuran pada halaman detail produk. Silakan sesuaikan dengan ukuran badan Anda sebelum melakukan pemesanan.', 6),
  ('Bagaimana cara menggunakan kode voucher?', 'Salin kode voucher dari menu Akun > Voucher Saya, lalu tempelkan pada kolom "Voucher / Kode Promo" saat checkout sebelum menyelesaikan pembayaran.', 7),
  ('Bagaimana cara menghubungi admin?', 'Anda dapat menghubungi kami melalui menu Akun > Hubungi Admin, atau melalui kontak yang tertera di halaman Pusat Bantuan.', 8)
) as seed(question, answer, sort_order)
where not exists (select 1 from faqs);
