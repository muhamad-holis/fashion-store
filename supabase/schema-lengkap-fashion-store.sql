-- =========================================================================
-- FASHION STORE - SKEMA DATABASE LENGKAP (GABUNGAN SEMUA MIGRATION)
-- Update: mencakup migration 0001 - 0014
-- =========================================================================
-- File ini adalah GABUNGAN dari seluruh migration 0001 - 0014 yang ada di
-- folder supabase/migrations/, digabung berurutan persis seperti urutan
-- aslinya dijalankan. Isinya 100% sama dengan yang sudah aktif di database
-- production saat ini - tidak ada logic yang diubah, cuma disatukan.
--
-- KAPAN PAKAI FILE INI:
--   Untuk setup Supabase project BARU dari nol (kosong) - misalnya saat
--   menjual/memindahtangankan project ini ke pemilik baru, atau membuat
--   environment staging/testing terpisah.
--
-- CARA PAKAI:
--   1. Buat project Supabase baru (KOSONG, belum ada tabel apa pun).
--   2. Buka SQL Editor -> paste seluruh isi file ini -> Run.
--   3. Selesai - seluruh tabel, RLS policy, function, trigger, storage
--      bucket, dan data referensi awal akan langsung tersedia dalam satu
--      kali jalan. Termasuk: akun & pesanan, voucher (dengan validasi
--      server yang sudah diperbaiki), notifikasi otomatis, review, retur
--      & refund, FAQ, dan konten legal (privasi/syarat/tentang kami).
--
-- JANGAN jalankan file ini di database yang SUDAH berisi data produksi -
-- gunakan file migration satuan (0001, 0002, dst) di folder migrations/
-- untuk mengupdate database yang sudah berjalan, supaya data yang sudah
-- ada tidak tertimpa/hilang.
--
-- Catatan: fungsi process_checkout(), stock_is_available(), dan
-- decrement_stock_atomic() di bagian "0005_atomic_operations" adalah sisa
-- migration lama yang TIDAK dipakai oleh aplikasi saat ini (aplikasi
-- memakai create_order_atomic() dari bagian "0005_atomic_checkout", yang
-- kemudian disempurnakan lagi di bagian "0013"). Aman diikutkan (tidak
-- menimbulkan konflik), boleh dibersihkan nanti kalau mau rapi-rapi.
-- =========================================================================



-- =========================================================================
-- SUMBER ASLI: supabase/migrations/0001_init_schema.sql
-- =========================================================================
-- =========================================================
-- FASHION STORE - FULL DATABASE SCHEMA (Supabase / Postgres)
-- =========================================================
-- Jalankan file ini di Supabase SQL Editor, atau via
-- `supabase db push` setelah menautkan project.
-- =========================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =========================================================
-- ENUMS
-- =========================================================
create type user_role as enum ('customer', 'admin', 'super_admin');
create type order_status as enum (
  'unpaid', 'waiting_verification', 'processing',
  'packed', 'shipped', 'arrived', 'completed', 'cancelled'
);
create type payment_method as enum (
  'bank_transfer', 'ewallet', 'qris'
);
create type payment_status as enum ('pending', 'approved', 'rejected');
create type notification_channel as enum ('toast', 'email');

-- =========================================================
-- SETTINGS (Pengaturan Toko - nama brand di-set di sini)
-- =========================================================
create table settings (
  id int primary key default 1,
  store_name text not null default 'Fashion Store',
  logo_url text,
  favicon_url text,
  address text,
  whatsapp text,
  instagram text,
  facebook text,
  tiktok text,
  email text,
  operational_hours text,
  qris_image_url text,
  bank_accounts jsonb default '[]'::jsonb, -- [{bank, account_number, account_name}]
  ewallet_accounts jsonb default '[]'::jsonb, -- [{provider, number, name}]
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);
insert into settings (id, store_name) values (1, 'Fashion Store');

-- =========================================================
-- USERS (extends Supabase auth.users) - opsional, guest checkout tetap didukung
-- =========================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role user_role not null default 'customer',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table admins (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'admin',
  created_at timestamptz not null default now()
);

-- =========================================================
-- CATEGORIES
-- =========================================================
create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  parent_id uuid references categories(id) on delete set null,
  image_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- =========================================================
-- PRODUCTS
-- =========================================================
create table products (
  id uuid primary key default uuid_generate_v4(),
  sku text not null unique,
  name text not null,
  slug text not null unique,
  category_id uuid references categories(id) on delete set null,
  description text,
  material_detail text,
  size_guide text,
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2),
  discount_percent int default 0,
  weight_grams int not null default 500,
  stock int not null default 0,
  is_flash_sale boolean not null default false,
  flash_sale_start timestamptz,
  flash_sale_end timestamptz,
  is_new_arrival boolean not null default true,
  is_active boolean not null default true,
  rating_avg numeric(2,1) not null default 0,
  review_count int not null default 0,
  sold_count int not null default 0,
  meta_title text,
  meta_description text,
  estimated_ship_days text default '2-4 hari',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_products_category on products(category_id);
create index idx_products_active on products(is_active);
create index idx_products_flash_sale on products(is_flash_sale) where is_flash_sale = true;

create table colors (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  hex_code text not null
);

create table sizes (
  id uuid primary key default uuid_generate_v4(),
  label text not null unique, -- S, M, L, XL, 38, 39, 40 dst
  sort_order int not null default 0
);

-- Variant = kombinasi warna x ukuran, masing-masing punya stock sendiri
create table product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  color_id uuid references colors(id) on delete set null,
  size_id uuid references sizes(id) on delete set null,
  sku_suffix text,
  stock int not null default 0,
  price_override numeric(12,2),
  created_at timestamptz not null default now(),
  unique (product_id, color_id, size_id)
);

create table product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  sort_order int not null default 0,
  is_primary boolean not null default false
);

create table product_videos (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  thumbnail_url text
);

-- =========================================================
-- CART & WISHLIST (mendukung guest via session_id, atau user_id jika login)
-- =========================================================
create table cart_items (
  id uuid primary key default uuid_generate_v4(),
  session_id text, -- dipakai untuk guest (cookie id)
  user_id uuid references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete set null,
  quantity int not null default 1 check (quantity > 0),
  note text,
  created_at timestamptz not null default now(),
  check (session_id is not null or user_id is not null)
);
create index idx_cart_session on cart_items(session_id);
create index idx_cart_user on cart_items(user_id);

create table wishlist_items (
  id uuid primary key default uuid_generate_v4(),
  session_id text,
  user_id uuid references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (session_id, product_id),
  unique (user_id, product_id),
  check (session_id is not null or user_id is not null)
);

-- =========================================================
-- ADDRESSES
-- =========================================================
create table addresses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  recipient_name text not null,
  phone text not null,
  province text not null,
  city text not null,
  district text not null,
  subdistrict text not null,
  postal_code text not null,
  full_address text not null,
  map_lat numeric(10,6),
  map_lng numeric(10,6),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- =========================================================
-- SHIPPING COURIERS (data referensi, dipakai untuk kalkulasi ongkir)
-- =========================================================
create table couriers (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique, -- jne, jnt, sicepat, dst
  name text not null,
  logo_url text,
  is_active boolean not null default true
);
insert into couriers (code, name) values
  ('jne', 'JNE'), ('jnt', 'J&T Express'), ('sicepat', 'SiCepat'),
  ('ninja', 'Ninja Express'), ('anteraja', 'AnterAja'),
  ('pos', 'Pos Indonesia'), ('tiki', 'TIKI'),
  ('lion', 'Lion Parcel'), ('idexpress', 'ID Express'), ('sap', 'SAP Express');

-- =========================================================
-- ORDERS
-- =========================================================
create table orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text not null unique, -- INV-20260709-XXXX
  user_id uuid references auth.users(id) on delete set null,
  guest_name text,
  guest_phone text,
  guest_email text,
  shipping_address jsonb not null, -- snapshot alamat saat order dibuat
  courier_code text,
  courier_service text, -- REG / YES / OKE dst
  shipping_cost numeric(12,2) not null default 0,
  shipping_eta text,
  subtotal numeric(12,2) not null default 0,
  discount_total numeric(12,2) not null default 0,
  total_weight_grams int not null default 0,
  grand_total numeric(12,2) not null default 0,
  coupon_code text,
  buyer_note text,
  status order_status not null default 'unpaid',
  tracking_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_orders_user on orders(user_id);
create index idx_orders_status on orders(status);
create index idx_orders_number on orders(order_number);

create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  variant_id uuid references product_variants(id) on delete set null,
  product_name text not null, -- snapshot
  product_image text,
  color_name text,
  size_label text,
  unit_price numeric(12,2) not null,
  quantity int not null check (quantity > 0),
  line_total numeric(12,2) not null
);

-- =========================================================
-- PAYMENTS
-- =========================================================
create table payments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  method payment_method not null,
  channel_detail text, -- BCA / DANA / dst
  amount numeric(12,2) not null,
  status payment_status not null default 'pending',
  verified_by uuid references admins(id),
  verified_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create table payment_proofs (
  id uuid primary key default uuid_generate_v4(),
  payment_id uuid not null references payments(id) on delete cascade,
  image_url text not null,
  uploaded_at timestamptz not null default now()
);

-- =========================================================
-- SHIPPING TRACKING LOG
-- =========================================================
create table shipping_logs (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null,
  description text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- REVIEWS
-- =========================================================
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  order_item_id uuid references order_items(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  reviewer_name text not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  images jsonb default '[]'::jsonb,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_reviews_product on reviews(product_id);

-- =========================================================
-- COUPONS
-- =========================================================
create table coupons (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  description text,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric(12,2) not null,
  min_purchase numeric(12,2) default 0,
  max_discount numeric(12,2),
  usage_limit int,
  used_count int not null default 0,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  is_active boolean not null default true
);

-- =========================================================
-- BANNERS
-- =========================================================
create table banners (
  id uuid primary key default uuid_generate_v4(),
  title text,
  image_url text not null,
  link_url text,
  placement text not null default 'hero', -- hero, promo
  sort_order int not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz
);

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  order_id uuid references orders(id) on delete cascade,
  channel notification_channel not null default 'toast',
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- =========================================================
-- ACTIVITY LOGS (audit trail admin)
-- =========================================================
create table activity_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid,
  actor_type text not null default 'admin', -- admin / system
  action text not null,
  entity text,
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- =========================================================
-- UPDATED_AT TRIGGER HELPER
-- =========================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_products_updated_at before update on products
  for each row execute function set_updated_at();
create trigger trg_orders_updated_at before update on orders
  for each row execute function set_updated_at();
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger trg_settings_updated_at before update on settings
  for each row execute function set_updated_at();

-- =========================================================
-- ORDER NUMBER GENERATOR
-- =========================================================
create or replace function generate_order_number()
returns text as $$
declare
  today text := to_char(now(), 'YYYYMMDD');
  seq int;
  result text;
begin
  select count(*) + 1 into seq from orders where order_number like 'INV-' || today || '-%';
  result := 'INV-' || today || '-' || lpad(seq::text, 4, '0');
  return result;
end;
$$ language plpgsql;


-- =========================================================================
-- SUMBER ASLI: supabase/migrations/0002_row_level_security.sql
-- =========================================================================
-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
-- Prinsip:
-- 1. Data publik (produk, kategori, banner, review, settings) -> siapa saja boleh SELECT
-- 2. Data milik user (cart, wishlist, address, order) -> hanya pemilik atau admin
-- 3. Data admin (manajemen produk, order, payment) -> hanya role admin/super_admin
-- 4. Guest checkout: cart/wishlist/order boleh dibuat tanpa auth (session_id based)
--    tapi tetap dibatasi lewat kolom session_id yang dicocokkan di application layer.
-- =========================================================

alter table settings enable row level security;
alter table profiles enable row level security;
alter table admins enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table colors enable row level security;
alter table sizes enable row level security;
alter table product_variants enable row level security;
alter table product_images enable row level security;
alter table product_videos enable row level security;
alter table cart_items enable row level security;
alter table wishlist_items enable row level security;
alter table addresses enable row level security;
alter table couriers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table payment_proofs enable row level security;
alter table shipping_logs enable row level security;
alter table reviews enable row level security;
alter table coupons enable row level security;
alter table banners enable row level security;
alter table notifications enable row level security;
alter table activity_logs enable row level security;

-- Helper: cek apakah user saat ini admin
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from admins where id = auth.uid()
  );
$$ language sql security definer stable;

-- ---------- PUBLIC READ (katalog & konten publik) ----------
create policy "public read settings" on settings for select using (true);
create policy "public read categories" on categories for select using (is_active = true or is_admin());
create policy "public read products" on products for select using (is_active = true or is_admin());
create policy "public read colors" on colors for select using (true);
create policy "public read sizes" on sizes for select using (true);
create policy "public read variants" on product_variants for select using (true);
create policy "public read product images" on product_images for select using (true);
create policy "public read product videos" on product_videos for select using (true);
create policy "public read couriers" on couriers for select using (true);
create policy "public read banners" on banners for select using (is_active = true or is_admin());
create policy "public read reviews" on reviews for select using (is_visible = true or is_admin());
create policy "public read active coupons" on coupons for select using (is_active = true);

-- ---------- ADMIN FULL ACCESS (write) ----------
create policy "admin manage settings" on settings for update using (is_admin());
create policy "admin manage categories" on categories for all using (is_admin()) with check (is_admin());
create policy "admin manage products" on products for all using (is_admin()) with check (is_admin());
create policy "admin manage colors" on colors for all using (is_admin()) with check (is_admin());
create policy "admin manage sizes" on sizes for all using (is_admin()) with check (is_admin());
create policy "admin manage variants" on product_variants for all using (is_admin()) with check (is_admin());
create policy "admin manage images" on product_images for all using (is_admin()) with check (is_admin());
create policy "admin manage videos" on product_videos for all using (is_admin()) with check (is_admin());
create policy "admin manage couriers" on couriers for all using (is_admin()) with check (is_admin());
create policy "admin manage banners" on banners for all using (is_admin()) with check (is_admin());
create policy "admin manage coupons" on coupons for all using (is_admin()) with check (is_admin());
create policy "admin moderate reviews" on reviews for update using (is_admin());
create policy "admin view admins" on admins for select using (is_admin());
create policy "admin view logs" on activity_logs for select using (is_admin());
create policy "system insert logs" on activity_logs for insert with check (true);

-- ---------- PROFILES ----------
create policy "user read own profile" on profiles for select using (auth.uid() = id or is_admin());
create policy "user update own profile" on profiles for update using (auth.uid() = id);
create policy "user insert own profile" on profiles for insert with check (auth.uid() = id);

-- ---------- CART (guest via session_id ditangani di application layer dengan service role
--             untuk operasi guest; user login pakai policy langsung) ----------
create policy "user manage own cart" on cart_items for all
  using (auth.uid() = user_id or is_admin())
  with check (auth.uid() = user_id or is_admin());

create policy "user manage own wishlist" on wishlist_items for all
  using (auth.uid() = user_id or is_admin())
  with check (auth.uid() = user_id or is_admin());

-- ---------- ADDRESSES ----------
create policy "user manage own addresses" on addresses for all
  using (auth.uid() = user_id or is_admin())
  with check (auth.uid() = user_id or is_admin());

-- ---------- ORDERS ----------
-- Guest order dibuat lewat API route dengan service role key (server-side),
-- sehingga RLS di sini fokus melindungi akses baca/tulis dari client langsung.
create policy "user read own orders" on orders for select
  using (auth.uid() = user_id or is_admin());
create policy "user insert own orders" on orders for insert
  with check (auth.uid() = user_id or user_id is null);
create policy "admin update orders" on orders for update using (is_admin());

create policy "read order items of own order" on order_items for select
  using (
    exists (
      select 1 from orders o where o.id = order_id
      and (o.user_id = auth.uid() or is_admin())
    )
  );
create policy "insert order items" on order_items for insert with check (true);
create policy "admin manage order items" on order_items for update using (is_admin());

-- ---------- PAYMENTS ----------
create policy "read own payments" on payments for select
  using (
    exists (
      select 1 from orders o where o.id = order_id
      and (o.user_id = auth.uid() or is_admin())
    )
  );
create policy "insert payment for own order" on payments for insert with check (true);
create policy "admin verify payments" on payments for update using (is_admin());

create policy "read own payment proofs" on payment_proofs for select
  using (
    exists (
      select 1 from payments p join orders o on o.id = p.order_id
      where p.id = payment_id and (o.user_id = auth.uid() or is_admin())
    )
  );
create policy "upload payment proof" on payment_proofs for insert with check (true);

-- ---------- SHIPPING LOGS ----------
create policy "read own shipping logs" on shipping_logs for select
  using (
    exists (
      select 1 from orders o where o.id = order_id
      and (o.user_id = auth.uid() or is_admin())
    )
  );
create policy "admin write shipping logs" on shipping_logs for insert with check (is_admin());

-- ---------- REVIEWS ----------
create policy "user create review" on reviews for insert
  with check (auth.uid() = user_id or user_id is null);

-- ---------- NOTIFICATIONS ----------
create policy "user read own notifications" on notifications for select
  using (auth.uid() = user_id or is_admin());
create policy "user update own notifications" on notifications for update
  using (auth.uid() = user_id);
create policy "system insert notifications" on notifications for insert with check (true);


-- =========================================================================
-- SUMBER ASLI: supabase/migrations/0003_storage_buckets.sql
-- =========================================================================
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


-- =========================================================================
-- SUMBER ASLI: supabase/migrations/0004_seed_data.sql
-- =========================================================================
-- =========================================================
-- SEED DATA AWAL (aman dijalankan sekali, dipakai agar toko tidak kosong)
-- =========================================================

insert into sizes (label, sort_order) values
  ('XS', 1), ('S', 2), ('M', 3), ('L', 4), ('XL', 5), ('XXL', 6)
on conflict (label) do nothing;

insert into colors (name, hex_code) values
  ('Hitam', '#111111'),
  ('Putih', '#FAFAFA'),
  ('Abu-abu', '#8A8A8A'),
  ('Krem', '#E8DFCB'),
  ('Navy', '#1B2A4A')
on conflict do nothing;

insert into categories (name, slug, sort_order) values
  ('Fashion Pria', 'fashion-pria', 1),
  ('Fashion Wanita', 'fashion-wanita', 2),
  ('Aksesoris', 'aksesoris', 3)
on conflict (slug) do nothing;


-- =========================================================================
-- SUMBER ASLI: supabase/migrations/0005_atomic_checkout.sql
-- =========================================================================
-- =========================================================
-- ATOMIC CHECKOUT
-- =========================================================
-- Masalah yang diperbaiki di sini:
-- 1. RACE CONDITION STOK: proses checkout lama membaca stok, lalu
--    mengurangi stok dengan beberapa query terpisah (read -> validate ->
--    write). Jika dua pembeli checkout produk yang sama di waktu yang
--    hampir bersamaan, keduanya bisa lolos validasi stok dengan nilai
--    yang sama-sama "lama" (belum ter-update), sehingga stok bisa minus
--    atau order dibuat padahal barang sudah habis (oversell).
-- 2. ORDER SETENGAH JADI: proses lama membuat order, order_items,
--    payment, dan mengurangi stok lewat banyak request terpisah tanpa
--    transaksi. Jika salah satu langkah gagal di tengah jalan (mis. koneksi
--    putus), order bisa "menggantung" (order dibuat tapi item/pembayaran
--    tidak, atau stok tidak berkurang) - data jadi tidak konsisten.
-- 3. NOMOR ORDER GANDA: generate_order_number() lama pakai count(*), yang
--    juga bisa balapan (dua checkout bersamaan bisa dapat nomor yang sama).
-- 4. SUBMIT GANDA (double-submit): user klik tombol bayar dua kali / retry
--    jaringan bisa membuat 2 order untuk satu kali checkout.
--
-- Solusi: satu fungsi Postgres (`create_order_atomic`) yang menjalankan
-- SEMUA langkah checkout dalam SATU transaksi database, dengan row-level
-- locking (`for update`) di baris produk/varian yang terlibat, dan
-- idempotency key supaya request yang sama tidak pernah membuat 2 order.
-- =========================================================

-- Kolom idempotency: setiap percobaan checkout dari client membawa 1 key
-- unik (dibuat sekali oleh browser). Jika request yang sama terkirim lagi
-- (retry/double click), kita kembalikan order yang sudah ada, bukan buat baru.
alter table orders add column if not exists idempotency_key text unique;

-- Counter nomor order per hari, diupdate secara atomic (insert ... on
-- conflict do update) sehingga tidak mungkin dua transaksi mendapat
-- nomor urut yang sama meski berjalan bersamaan.
create table if not exists order_number_counters (
  day text primary key,
  seq int not null default 0
);

create or replace function next_order_number()
returns text as $$
declare
  today text := to_char(now(), 'YYYYMMDD');
  next_seq int;
begin
  insert into order_number_counters (day, seq)
  values (today, 1)
  on conflict (day) do update set seq = order_number_counters.seq + 1
  returning seq into next_seq;

  return 'INV-' || today || '-' || lpad(next_seq::text, 4, '0');
end;
$$ language plpgsql;

-- Fungsi utama checkout. Semua langkah (validasi stok, kurangi stok,
-- buat order, order_items, payment, hapus cart) berjalan dalam satu
-- transaksi implisit milik fungsi ini. Jika ada error di tengah (mis.
-- stok kurang), seluruh perubahan otomatis di-rollback oleh Postgres -
-- tidak ada order/produk yang "setengah jadi".
create or replace function create_order_atomic(
  p_idempotency_key text,
  p_cart_item_ids uuid[],
  p_user_id uuid,
  p_session_id text,
  p_guest_name text,
  p_guest_phone text,
  p_guest_email text,
  p_shipping_address jsonb,
  p_courier_code text,
  p_courier_service text,
  p_shipping_cost numeric,
  p_shipping_eta text,
  p_payment_method text,
  p_payment_channel_detail text,
  p_buyer_note text,
  p_coupon_code text
)
returns jsonb as $$
declare
  v_existing_order_id uuid;
  v_existing_payment_id uuid;
  v_cart record;
  v_stock int;
  v_price numeric;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_total_weight int := 0;
  v_discount numeric := 0;
  v_grand_total numeric;
  v_coupon record;
  v_order_id uuid;
  v_order_number text;
  v_payment_id uuid;
  v_cart_count int;
begin
  -- 0. Idempotency: kalau key ini sudah pernah dipakai untuk membuat
  --    order, langsung kembalikan order yang sudah ada (tidak membuat
  --    order baru / tidak mengurangi stok lagi).
  if p_idempotency_key is not null then
    select id into v_existing_order_id from orders where idempotency_key = p_idempotency_key;
    if v_existing_order_id is not null then
      select id into v_existing_payment_id from payments where order_id = v_existing_order_id limit 1;
      return jsonb_build_object(
        'order_id', v_existing_order_id,
        'payment_id', v_existing_payment_id,
        'already_existed', true
      );
    end if;
  end if;

  -- 1. Validasi cart tidak kosong
  select count(*) into v_cart_count from cart_items where id = any(p_cart_item_ids);
  if v_cart_count = 0 then
    raise exception 'Keranjang kosong atau tidak valid' using errcode = 'P0001';
  end if;

  -- 2. Kunci baris produk & varian yang terlibat, urutkan berdasarkan id
  --    supaya kalau ada 2 checkout bersamaan yang sama-sama menyentuh
  --    beberapa produk, urutan lock-nya selalu konsisten (mencegah deadlock).
  --    "for update" membuat transaksi lain yang mencoba mengunci baris yang
  --    sama HARUS menunggu transaksi ini selesai -> tidak ada lagi
  --    race condition baca-stok-lama.
  for v_cart in
    select ci.id as cart_item_id, ci.product_id, ci.variant_id, ci.quantity,
           p.name as product_name, p.price as product_price, p.weight_grams,
           pv.price_override
    from cart_items ci
    join products p on p.id = ci.product_id
    left join product_variants pv on pv.id = ci.variant_id
    where ci.id = any(p_cart_item_ids)
      and (
        (p_user_id is not null and ci.user_id = p_user_id) or
        (p_user_id is null and ci.session_id = p_session_id)
      )
    order by ci.product_id, ci.variant_id
  loop
    if v_cart.variant_id is not null then
      select stock into v_stock from product_variants where id = v_cart.variant_id for update;
    else
      select stock into v_stock from products where id = v_cart.product_id for update;
    end if;

    if v_stock is null or v_stock < v_cart.quantity then
      raise exception 'Stok "%" tidak mencukupi', v_cart.product_name using errcode = 'P0002';
    end if;

    v_price := coalesce(v_cart.price_override, v_cart.product_price);
    v_line_total := v_price * v_cart.quantity;
    v_subtotal := v_subtotal + v_line_total;
    v_total_weight := v_total_weight + (v_cart.weight_grams * v_cart.quantity);
  end loop;

  -- 3. Voucher (jika ada) - divalidasi ulang di server, bukan percaya client
  if p_coupon_code is not null then
    select * into v_coupon from coupons
      where code = upper(p_coupon_code) and is_active = true
      for update;
    if found and v_subtotal >= coalesce(v_coupon.min_purchase, 0) then
      if v_coupon.discount_type = 'percent' then
        v_discount := least(v_subtotal * v_coupon.discount_value / 100, coalesce(v_coupon.max_discount, v_subtotal));
      else
        v_discount := v_coupon.discount_value;
      end if;
      update coupons set used_count = used_count + 1 where id = v_coupon.id;
    end if;
  end if;

  v_grand_total := greatest(0, v_subtotal - v_discount + coalesce(p_shipping_cost, 0));

  -- 4. Nomor order - atomic, tidak mungkin duplikat walau checkout bersamaan
  v_order_number := next_order_number();

  -- 5. Buat order
  insert into orders (
    order_number, user_id, guest_name, guest_phone, guest_email,
    shipping_address, courier_code, courier_service, shipping_cost, shipping_eta,
    subtotal, discount_total, total_weight_grams, grand_total,
    coupon_code, buyer_note, status, idempotency_key
  ) values (
    v_order_number, p_user_id, p_guest_name, p_guest_phone, p_guest_email,
    p_shipping_address, p_courier_code, p_courier_service, coalesce(p_shipping_cost, 0), p_shipping_eta,
    v_subtotal, v_discount, v_total_weight, v_grand_total,
    p_coupon_code, p_buyer_note, 'unpaid', p_idempotency_key
  ) returning id into v_order_id;

  -- 6. Order items + kurangi stok sekaligus (baris sudah terkunci dari langkah 2)
  for v_cart in
    select ci.id as cart_item_id, ci.product_id, ci.variant_id, ci.quantity,
           p.name as product_name, p.price as product_price, p.stock as product_stock,
           pv.stock as variant_stock, pv.price_override,
           (select url from product_images where product_id = ci.product_id and is_primary = true limit 1) as primary_image,
           (select url from product_images where product_id = ci.product_id order by sort_order limit 1) as fallback_image,
           c.name as color_name, s.label as size_label
    from cart_items ci
    join products p on p.id = ci.product_id
    left join product_variants pv on pv.id = ci.variant_id
    left join colors c on c.id = pv.color_id
    left join sizes s on s.id = pv.size_id
    where ci.id = any(p_cart_item_ids)
      and (
        (p_user_id is not null and ci.user_id = p_user_id) or
        (p_user_id is null and ci.session_id = p_session_id)
      )
  loop
    v_price := coalesce(v_cart.price_override, v_cart.product_price);

    insert into order_items (
      order_id, product_id, variant_id, product_name, product_image,
      color_name, size_label, unit_price, quantity, line_total
    ) values (
      v_order_id, v_cart.product_id, v_cart.variant_id, v_cart.product_name,
      coalesce(v_cart.primary_image, v_cart.fallback_image),
      v_cart.color_name, v_cart.size_label, v_price, v_cart.quantity, v_price * v_cart.quantity
    );

    if v_cart.variant_id is not null then
      update product_variants set stock = stock - v_cart.quantity where id = v_cart.variant_id;
    end if;
    update products set stock = stock - v_cart.quantity where id = v_cart.product_id;
    update products set sold_count = sold_count + v_cart.quantity where id = v_cart.product_id;
  end loop;

  -- 7. Payment (status pending, menunggu bukti bayar)
  -- CATATAN FIX: parameter p_payment_method bertipe `text` (dikirim dari
  -- API route sebagai string biasa), sedangkan kolom payments.method
  -- bertipe enum `payment_method`. Postgres TIDAK otomatis cast text ->
  -- enum ketika sumbernya adalah variabel/parameter (hanya literal string
  -- yang bisa implisit). Karena itu insert ini gagal dengan error
  -- 'column "method" is of type payment_method but expression is of type text'.
  -- Solusinya: cast eksplisit p_payment_method::payment_method.
  insert into payments (order_id, method, channel_detail, amount, status)
  values (v_order_id, p_payment_method::payment_method, p_payment_channel_detail, v_grand_total, 'pending')
  returning id into v_payment_id;

  -- 8. Kosongkan cart yang sudah checkout
  delete from cart_items where id = any(p_cart_item_ids);

  -- 9. Log aktivitas
  insert into activity_logs (actor_type, action, entity, entity_id, metadata)
  values ('system', 'order_created', 'orders', v_order_id::text, jsonb_build_object('order_number', v_order_number));

  return jsonb_build_object(
    'order_id', v_order_id,
    'payment_id', v_payment_id,
    'already_existed', false
  );
end;
$$ language plpgsql security definer;


-- =========================================================================
-- SUMBER ASLI: supabase/migrations/0005_atomic_operations.sql
-- =========================================================================
-- =========================================================
-- ATOMIC OPERATIONS FOR DATA INTEGRITY
-- =========================================================
-- Prevents race conditions during concurrent checkouts
-- and ensures stock is properly decremented.

-- =========================================================
-- 1. IDEMPOTENT ORDER CREATION WITH DEDUPLICATION
-- =========================================================
create or replace function process_checkout(
  p_user_id uuid,
  p_session_id text,
  p_cart_item_ids uuid[],
  p_order_data jsonb
)
returns jsonb as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_payment_id uuid;
  v_checkout_token text;
  v_lock_acquired boolean;
begin
  -- Use advisory lock for this session to prevent concurrent checkouts
  v_checkout_token := coalesce(p_user_id::text, p_session_id);
  v_lock_acquired := pg_advisory_xact_lock(
    ('x' || substr(md5(v_checkout_token), 1, 16))::bit(64)::bigint
  );
  
  -- Verify stock availability before proceeding
  if not stock_is_available(p_cart_item_ids) then
    raise exception 'Stok tidak mencukupi untuk checkout';
  end if;

  -- Generate order number atomically
  v_order_number := generate_order_number();

  -- Create order with lock
  insert into orders (
    order_number,
    user_id,
    guest_name,
    guest_phone,
    guest_email,
    shipping_address,
    courier_code,
    courier_service,
    shipping_cost,
    shipping_eta,
    subtotal,
    discount_total,
    total_weight_grams,
    grand_total,
    coupon_code,
    buyer_note,
    status
  ) values (
    v_order_number,
    p_user_id,
    p_order_data->>'guest_name',
    p_order_data->>'guest_phone',
    p_order_data->>'guest_email',
    p_order_data->'shipping_address',
    p_order_data->>'courier_code',
    p_order_data->>'courier_service',
    (p_order_data->>'shipping_cost')::numeric,
    p_order_data->>'shipping_eta',
    (p_order_data->>'subtotal')::numeric,
    (p_order_data->>'discount_total')::numeric,
    (p_order_data->>'total_weight_grams')::int,
    (p_order_data->>'grand_total')::numeric,
    p_order_data->>'coupon_code',
    p_order_data->>'buyer_note',
    'unpaid'::order_status
  ) returning id into v_order_id;

  -- Create payment record
  insert into payments (order_id, method, channel_detail, amount, status)
  values (
    v_order_id,
    (p_order_data->>'payment_method')::payment_method,
    p_order_data->>'payment_channel_detail',
    (p_order_data->>'grand_total')::numeric,
    'pending'
  ) returning id into v_payment_id;

  -- Insert order items (from order_data)
  insert into order_items (
    order_id, product_id, variant_id, product_name,
    product_image, color_name, size_label,
    unit_price, quantity, line_total
  )
  select
    v_order_id,
    (item->>'product_id')::uuid,
    (item->>'variant_id')::uuid,
    item->>'product_name',
    item->>'product_image',
    item->>'color_name',
    item->>'size_label',
    (item->>'unit_price')::numeric,
    (item->>'quantity')::int,
    (item->>'line_total')::numeric
  from jsonb_array_elements(p_order_data->'order_items') as item;

  -- Decrement stock atomically using FOR UPDATE
  perform decrement_stock_atomic(p_order_data->'order_items');

  -- Delete cart items
  delete from cart_items where id = any(p_cart_item_ids);

  -- Log activity
  insert into activity_logs (actor_type, action, entity, entity_id, metadata)
  values ('system', 'order_created', 'orders', v_order_id::text, 
    jsonb_build_object('order_number', v_order_number));

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'payment_id', v_payment_id,
    'status', 'unpaid'
  );
end;
$$ language plpgsql;

-- =========================================================
-- 2. CHECK STOCK AVAILABILITY
-- =========================================================
create or replace function stock_is_available(p_cart_item_ids uuid[])
returns boolean as $$
declare
  v_item record;
  v_available_stock int;
begin
  for v_item in
    select ci.id, ci.quantity, ci.variant_id, ci.product_id
    from cart_items ci
    where ci.id = any(p_cart_item_ids)
  loop
    -- Get variant stock if exists, else product stock
    select coalesce(pv.stock, p.stock, 0) into v_available_stock
    from cart_items ci
    left join product_variants pv on ci.variant_id = pv.id
    left join products p on ci.product_id = p.id
    where ci.id = v_item.id;

    if v_available_stock < v_item.quantity then
      return false;
    end if;
  end loop;

  return true;
end;
$$ language plpgsql;

-- =========================================================
-- 3. ATOMIC STOCK DECREMENT
-- =========================================================
create or replace function decrement_stock_atomic(p_order_items jsonb)
returns void as $$
declare
  v_item jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_quantity int;
begin
  for v_item in select * from jsonb_array_elements(p_order_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_quantity := (v_item->>'quantity')::int;

    -- Decrement variant stock if exists
    if v_variant_id is not null then
      update product_variants
      set stock = stock - v_quantity
      where id = v_variant_id
      and stock >= v_quantity; -- Only update if stock is sufficient
    end if;

    -- Always decrement product stock
    update products
    set stock = stock - v_quantity
    where id = v_product_id
    and stock >= v_quantity; -- Only update if stock is sufficient
  end loop;
end;
$$ language plpgsql;

-- =========================================================
-- 4. GRANT PERMISSIONS TO AUTHENTICATED USERS
-- =========================================================
grant execute on function process_checkout(uuid, text, uuid[], jsonb) to authenticated;
grant execute on function stock_is_available(uuid[]) to authenticated;
grant execute on function decrement_stock_atomic(jsonb) to authenticated;
grant execute on function generate_order_number() to authenticated;


-- =========================================================================
-- SUMBER ASLI: supabase/migrations/0006_data_integrity_constraints.sql
-- =========================================================================
-- =========================================================
-- DATA INTEGRITY CONSTRAINTS & SAFETY CHECKS
-- =========================================================

-- =========================================================
-- 1. ENSURE ORDER ITEMS MATCH ORDER
-- =========================================================
create or replace function validate_order_items()
returns trigger as $$
begin
  -- Ensure order exists
  if not exists(select 1 from orders where id = new.order_id) then
    raise exception 'Order dengan ID % tidak ditemukan', new.order_id;
  end if;

  -- Ensure quantity is positive
  if new.quantity <= 0 then
    raise exception 'Quantity harus lebih besar dari 0';
  end if;

  -- Ensure unit_price is non-negative
  if new.unit_price < 0 then
    raise exception 'Unit price tidak boleh negatif';
  end if;

  -- Ensure line_total matches unit_price * quantity
  if new.line_total != (new.unit_price * new.quantity) then
    raise exception 'Line total tidak sesuai dengan unit_price × quantity';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_validate_order_items before insert or update on order_items
  for each row execute function validate_order_items();

-- =========================================================
-- 2. VALIDATE PRODUCT STOCK
-- =========================================================
create or replace function validate_product_stock()
returns trigger as $$
begin
  -- Ensure stock is non-negative
  if new.stock < 0 then
    new.stock := 0;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_validate_product_stock before insert or update on products
  for each row execute function validate_product_stock();

create trigger trg_validate_variant_stock before insert or update on product_variants
  for each row execute function validate_product_stock();

-- =========================================================
-- 3. VALIDATE ORDERS BEFORE STATE TRANSITIONS
-- =========================================================
create or replace function validate_order_status_transition()
returns trigger as $$
declare
  v_old_status order_status;
  v_payment_status payment_status;
begin
  v_old_status := old.status;

  -- unpaid -> waiting_verification (only with pending payment)
  if v_old_status = 'unpaid' and new.status = 'waiting_verification' then
    select status into v_payment_status from payments 
    where order_id = new.id 
    order by created_at desc 
    limit 1;

    if v_payment_status != 'pending' then
      raise exception 'Hanya order dengan status pembayaran pending yang bisa masuk waiting_verification';
    end if;
  end if;

  -- waiting_verification -> processing (only when payment approved)
  if v_old_status = 'waiting_verification' and new.status = 'processing' then
    select status into v_payment_status from payments 
    where order_id = new.id 
    order by created_at desc 
    limit 1;

    if v_payment_status != 'approved' then
      raise exception 'Pembayaran harus disetujui sebelum pesanan masuk status processing';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_validate_order_status before update on orders
  for each row execute function validate_order_status_transition();

-- =========================================================
-- 4. PREVENT DUPLICATE CART ITEMS
-- =========================================================
alter table cart_items
add constraint unique_cart_item_per_user_product unique (
  product_id, 
  variant_id,
  user_id
) where user_id is not null;

alter table cart_items
add constraint unique_cart_item_per_session_product unique (
  product_id, 
  variant_id,
  session_id
) where session_id is not null;

-- =========================================================
-- 5. COUPON USAGE TRACKING
-- =========================================================
create or replace function increment_coupon_usage()
returns trigger as $$
begin
  if new.coupon_code is not null and new.status = 'unpaid' then
    update coupons
    set used_count = used_count + 1
    where code = new.coupon_code;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_increment_coupon_usage after insert on orders
  for each row execute function increment_coupon_usage();

-- =========================================================
-- 6. UPDATE PRODUCT METRICS
-- =========================================================
create or replace function update_product_metrics()
returns trigger as $$
begin
  if new.status = 'completed' then
    update products
    set sold_count = sold_count + new.quantity
    where id = new.product_id;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_update_product_metrics after update on order_items
  for each row execute function update_product_metrics();

-- =========================================================
-- 7. VALIDATE CART ITEMS
-- =========================================================
create or replace function validate_cart_item()
returns trigger as $$
begin
  -- Ensure quantity is positive
  if new.quantity <= 0 then
    raise exception 'Quantity harus lebih besar dari 0';
  end if;

  -- Ensure either user_id or session_id exists
  if new.user_id is null and new.session_id is null then
    raise exception 'Harus ada user_id atau session_id';
  end if;

  -- Ensure product exists
  if not exists(select 1 from products where id = new.product_id) then
    raise exception 'Produk tidak ditemukan';
  end if;

  -- Ensure variant (if specified) belongs to product
  if new.variant_id is not null then
    if not exists(
      select 1 from product_variants 
      where id = new.variant_id and product_id = new.product_id
    ) then
      raise exception 'Variant tidak cocok dengan produk';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_validate_cart_item before insert or update on cart_items
  for each row execute function validate_cart_item();

-- =========================================================
-- 8. VALIDATE PAYMENT
-- =========================================================
create or replace function validate_payment()
returns trigger as $$
begin
  -- Ensure amount is positive
  if new.amount <= 0 then
    raise exception 'Jumlah pembayaran harus lebih besar dari 0';
  end if;

  -- Ensure order exists
  if not exists(select 1 from orders where id = new.order_id) then
    raise exception 'Order tidak ditemukan';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_validate_payment before insert or update on payments
  for each row execute function validate_payment();

-- =========================================================
-- 9. INDEXES FOR PERFORMANCE
-- =========================================================
create index idx_orders_created_at on orders(created_at desc);
create index idx_orders_updated_at on orders(updated_at desc);
create index idx_payments_order_id on payments(order_id);
create index idx_payments_status on payments(status);
create index idx_coupons_code on coupons(code) where is_active = true;
create index idx_products_stock on products(stock) where stock > 0;
create index idx_product_variants_stock on product_variants(stock) where stock > 0;


-- =========================================================================
-- SUMBER ASLI: supabase/migrations/0007_admin_roles.sql
-- =========================================================================
-- =========================================================
-- SUPER ADMIN: kelola admin lain (tambah/hapus/ubah role)
-- =========================================================

-- Simpan email di tabel admins agar mudah ditampilkan di panel
-- (auth.users tidak bisa di-query langsung dari client).
alter table admins add column if not exists email text;

-- Fungsi cek apakah user saat ini super_admin
create or replace function is_super_admin()
returns boolean as $$
  select exists (
    select 1 from admins where id = auth.uid() and role = 'super_admin'
  );
$$ language sql security definer stable;

-- Hanya super_admin yang boleh menambah/mengubah/menghapus data admin.
-- (select tetap pakai policy lama "admin view admins" - semua admin boleh lihat daftar)
create policy "super admin insert admins" on admins
  for insert
  with check (is_super_admin());

create policy "super admin update admins" on admins
  for update
  using (is_super_admin());

create policy "super admin delete admins" on admins
  for delete
  using (is_super_admin());


-- =========================================================================
-- SUMBER ASLI: supabase/migrations/0008_fix_payment_method_enum_cast.sql
-- =========================================================================
-- =========================================================
-- FIX: "column method is of type payment_method but expression is of type text"
-- =========================================================
-- Root cause: fungsi create_order_atomic() menerima p_payment_method
-- sebagai parameter bertipe `text`, lalu memasukkannya langsung ke kolom
-- payments.method yang bertipe enum `payment_method`. Postgres hanya bisa
-- meng-cast text -> enum secara implisit untuk LITERAL string (mis. saat
-- kamu menulis 'qris' langsung di query), TIDAK untuk nilai yang datang
-- dari variabel/parameter fungsi. Karena p_payment_method adalah
-- parameter, cast implisit itu tidak terjadi -> insert gagal setiap kali
-- checkout dijalankan.
--
-- Fix: tambahkan cast eksplisit `::payment_method` saat insert ke tabel
-- payments. Migration ini me-replace fungsi yang sudah ada di database
-- (CREATE OR REPLACE), jadi aman dijalankan di project Supabase yang
-- sudah live tanpa perlu reset data.
-- =========================================================

create or replace function create_order_atomic(
  p_idempotency_key text,
  p_cart_item_ids uuid[],
  p_user_id uuid,
  p_session_id text,
  p_guest_name text,
  p_guest_phone text,
  p_guest_email text,
  p_shipping_address jsonb,
  p_courier_code text,
  p_courier_service text,
  p_shipping_cost numeric,
  p_shipping_eta text,
  p_payment_method text,
  p_payment_channel_detail text,
  p_buyer_note text,
  p_coupon_code text
)
returns jsonb as $$
declare
  v_existing_order_id uuid;
  v_existing_payment_id uuid;
  v_cart record;
  v_stock int;
  v_price numeric;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_total_weight int := 0;
  v_discount numeric := 0;
  v_grand_total numeric;
  v_coupon record;
  v_order_id uuid;
  v_order_number text;
  v_payment_id uuid;
  v_cart_count int;
begin
  if p_idempotency_key is not null then
    select id into v_existing_order_id from orders where idempotency_key = p_idempotency_key;
    if v_existing_order_id is not null then
      select id into v_existing_payment_id from payments where order_id = v_existing_order_id limit 1;
      return jsonb_build_object(
        'order_id', v_existing_order_id,
        'payment_id', v_existing_payment_id,
        'already_existed', true
      );
    end if;
  end if;

  select count(*) into v_cart_count from cart_items where id = any(p_cart_item_ids);
  if v_cart_count = 0 then
    raise exception 'Keranjang kosong atau tidak valid' using errcode = 'P0001';
  end if;

  for v_cart in
    select ci.id as cart_item_id, ci.product_id, ci.variant_id, ci.quantity,
           p.name as product_name, p.price as product_price, p.weight_grams,
           pv.price_override
    from cart_items ci
    join products p on p.id = ci.product_id
    left join product_variants pv on pv.id = ci.variant_id
    where ci.id = any(p_cart_item_ids)
      and (
        (p_user_id is not null and ci.user_id = p_user_id) or
        (p_user_id is null and ci.session_id = p_session_id)
      )
    order by ci.product_id, ci.variant_id
  loop
    if v_cart.variant_id is not null then
      select stock into v_stock from product_variants where id = v_cart.variant_id for update;
    else
      select stock into v_stock from products where id = v_cart.product_id for update;
    end if;

    if v_stock is null or v_stock < v_cart.quantity then
      raise exception 'Stok "%" tidak mencukupi', v_cart.product_name using errcode = 'P0002';
    end if;

    v_price := coalesce(v_cart.price_override, v_cart.product_price);
    v_line_total := v_price * v_cart.quantity;
    v_subtotal := v_subtotal + v_line_total;
    v_total_weight := v_total_weight + (v_cart.weight_grams * v_cart.quantity);
  end loop;

  if p_coupon_code is not null then
    select * into v_coupon from coupons
      where code = upper(p_coupon_code) and is_active = true
      for update;
    if found and v_subtotal >= coalesce(v_coupon.min_purchase, 0) then
      if v_coupon.discount_type = 'percent' then
        v_discount := least(v_subtotal * v_coupon.discount_value / 100, coalesce(v_coupon.max_discount, v_subtotal));
      else
        v_discount := v_coupon.discount_value;
      end if;
      update coupons set used_count = used_count + 1 where id = v_coupon.id;
    end if;
  end if;

  v_grand_total := greatest(0, v_subtotal - v_discount + coalesce(p_shipping_cost, 0));

  v_order_number := next_order_number();

  insert into orders (
    order_number, user_id, guest_name, guest_phone, guest_email,
    shipping_address, courier_code, courier_service, shipping_cost, shipping_eta,
    subtotal, discount_total, total_weight_grams, grand_total,
    coupon_code, buyer_note, status, idempotency_key
  ) values (
    v_order_number, p_user_id, p_guest_name, p_guest_phone, p_guest_email,
    p_shipping_address, p_courier_code, p_courier_service, coalesce(p_shipping_cost, 0), p_shipping_eta,
    v_subtotal, v_discount, v_total_weight, v_grand_total,
    p_coupon_code, p_buyer_note, 'unpaid', p_idempotency_key
  ) returning id into v_order_id;

  for v_cart in
    select ci.id as cart_item_id, ci.product_id, ci.variant_id, ci.quantity,
           p.name as product_name, p.price as product_price, p.stock as product_stock,
           pv.stock as variant_stock, pv.price_override,
           (select url from product_images where product_id = ci.product_id and is_primary = true limit 1) as primary_image,
           (select url from product_images where product_id = ci.product_id order by sort_order limit 1) as fallback_image,
           c.name as color_name, s.label as size_label
    from cart_items ci
    join products p on p.id = ci.product_id
    left join product_variants pv on pv.id = ci.variant_id
    left join colors c on c.id = pv.color_id
    left join sizes s on s.id = pv.size_id
    where ci.id = any(p_cart_item_ids)
      and (
        (p_user_id is not null and ci.user_id = p_user_id) or
        (p_user_id is null and ci.session_id = p_session_id)
      )
  loop
    v_price := coalesce(v_cart.price_override, v_cart.product_price);

    insert into order_items (
      order_id, product_id, variant_id, product_name, product_image,
      color_name, size_label, unit_price, quantity, line_total
    ) values (
      v_order_id, v_cart.product_id, v_cart.variant_id, v_cart.product_name,
      coalesce(v_cart.primary_image, v_cart.fallback_image),
      v_cart.color_name, v_cart.size_label, v_price, v_cart.quantity, v_price * v_cart.quantity
    );

    if v_cart.variant_id is not null then
      update product_variants set stock = stock - v_cart.quantity where id = v_cart.variant_id;
    end if;
    update products set stock = stock - v_cart.quantity where id = v_cart.product_id;
    update products set sold_count = sold_count + v_cart.quantity where id = v_cart.product_id;
  end loop;

  -- FIX: cast eksplisit text -> enum payment_method
  insert into payments (order_id, method, channel_detail, amount, status)
  values (v_order_id, p_payment_method::payment_method, p_payment_channel_detail, v_grand_total, 'pending')
  returning id into v_payment_id;

  delete from cart_items where id = any(p_cart_item_ids);

  insert into activity_logs (actor_type, action, entity, entity_id, metadata)
  values ('system', 'order_created', 'orders', v_order_id::text, jsonb_build_object('order_number', v_order_number));

  return jsonb_build_object(
    'order_id', v_order_id,
    'payment_id', v_payment_id,
    'already_existed', false
  );
end;
$$ language plpgsql security definer;


-- =========================================================================
-- SUMBER ASLI: supabase/migrations/0009_confirm_receipt_and_reviews.sql
-- =========================================================================
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


-- =========================================================================
-- SUMBER ASLI: supabase/migrations/0010_sync_product_rating_stats.sql
-- =========================================================================
-- =========================================================
-- 0010: Sinkronisasi Otomatis rating_avg & review_count
-- =========================================================
-- Sebelumnya kolom products.rating_avg dan products.review_count adalah
-- kolom "cache" yang tidak pernah diupdate otomatis - jadi review baru
-- (dari pembeli) atau perubahan visibilitas review (dari admin) tidak
-- pernah tercermin di kartu/detail produk. Trigger ini memperbaikinya:
-- setiap INSERT/UPDATE/DELETE di tabel reviews akan menghitung ulang
-- rata-rata rating & jumlah review (yang is_visible = true saja) untuk
-- produk terkait.

create or replace function sync_product_rating_stats() returns trigger
language plpgsql security definer as $$
declare
  target_product_id uuid;
begin
  target_product_id := coalesce(new.product_id, old.product_id);

  update products p
  set
    rating_avg = coalesce(
      (select round(avg(rating)::numeric, 1) from reviews
       where product_id = target_product_id and is_visible = true),
      0
    ),
    review_count = (
      select count(*) from reviews
      where product_id = target_product_id and is_visible = true
    )
  where p.id = target_product_id;

  return null;
end;
$$;

drop trigger if exists trg_reviews_sync_product_stats on reviews;
create trigger trg_reviews_sync_product_stats
after insert or update or delete on reviews
for each row execute function sync_product_rating_stats();

-- Backfill: sinkronkan data review yang sudah terlanjur masuk sebelum
-- trigger ini ada, supaya begitu migration dijalankan angkanya langsung benar.
update products p
set
  rating_avg = coalesce(
    (select round(avg(rating)::numeric, 1) from reviews
     where product_id = p.id and is_visible = true),
    0
  ),
  review_count = (
    select count(*) from reviews
    where product_id = p.id and is_visible = true
  );


-- =========================================================================
-- SUMBER ASLI: supabase/migrations/0011_auto_notifications.sql
-- =========================================================================
-- =========================================================
-- 0011: Notifikasi Otomatis (perubahan status pesanan & pembayaran)
-- =========================================================
-- Tabel `notifications` sudah ada sejak awal (lengkap dengan RLS), tapi
-- belum ada satu pun tempat di kode yang mengisinya. Trigger di bawah ini
-- membuat notifikasi OTOMATIS setiap kali status pesanan atau status
-- pembayaran berubah - dari mana pun perubahan itu terjadi (panel admin,
-- tombol "Pesanan Diterima" pembeli, dll), sehingga tidak perlu menambah
-- kode insert notifikasi di banyak tempat terpisah.

create or replace function notify_order_status_change() returns trigger
language plpgsql security definer as $$
declare
  v_title text;
  v_message text;
begin
  -- Pesanan tanpa akun (guest) tidak punya tempat untuk melihat notifikasi
  -- in-app, jadi dilewati.
  if new.user_id is null then
    return new;
  end if;

  case new.status
    when 'waiting_verification' then
      v_title := 'Pembayaran Sedang Diverifikasi';
      v_message := 'Bukti pembayaran untuk pesanan ' || new.order_number || ' sedang kami periksa.';
    when 'processing' then
      v_title := 'Pesanan Diproses';
      v_message := 'Pesanan ' || new.order_number || ' sedang diproses oleh tim kami.';
    when 'packed' then
      v_title := 'Pesanan Dikemas';
      v_message := 'Pesanan ' || new.order_number || ' sedang dikemas, siap dikirim.';
    when 'shipped' then
      v_title := 'Pesanan Dikirim';
      v_message := 'Pesanan ' || new.order_number || ' sudah dikirim. Cek nomor resi di halaman pesanan.';
    when 'arrived' then
      v_title := 'Pesanan Tiba';
      v_message := 'Pesanan ' || new.order_number || ' sudah sampai. Yuk konfirmasi penerimaan.';
    when 'completed' then
      v_title := 'Pesanan Selesai';
      v_message := 'Pesanan ' || new.order_number || ' selesai. Yuk beri ulasan produknya.';
    when 'cancelled' then
      v_title := 'Pesanan Dibatalkan';
      v_message := 'Pesanan ' || new.order_number || ' telah dibatalkan.';
    else
      return new; -- status 'unpaid' (awal) tidak perlu notifikasi
  end case;

  insert into notifications (user_id, order_id, channel, title, message)
  values (new.user_id, new.id, 'toast', v_title, v_message);

  return new;
end;
$$;

drop trigger if exists trg_notify_order_status on orders;
create trigger trg_notify_order_status
after update of status on orders
for each row
when (old.status is distinct from new.status)
execute function notify_order_status_change();


create or replace function notify_payment_status_change() returns trigger
language plpgsql security definer as $$
declare
  v_order record;
  v_title text;
  v_message text;
begin
  if new.status not in ('approved', 'rejected') then
    return new;
  end if;

  select id, user_id, order_number into v_order from orders where id = new.order_id;
  if v_order.user_id is null then
    return new;
  end if;

  if new.status = 'approved' then
    v_title := 'Pembayaran Dikonfirmasi';
    v_message := 'Pembayaran untuk pesanan ' || v_order.order_number || ' telah dikonfirmasi. Terima kasih!';
  else
    v_title := 'Pembayaran Ditolak';
    v_message := 'Bukti pembayaran untuk pesanan ' || v_order.order_number ||
                 ' ditolak. Silakan upload ulang atau hubungi admin.';
  end if;

  insert into notifications (user_id, order_id, channel, title, message)
  values (v_order.user_id, v_order.id, 'toast', v_title, v_message);

  return new;
end;
$$;

drop trigger if exists trg_notify_payment_status on payments;
create trigger trg_notify_payment_status
after update of status on payments
for each row
when (old.status is distinct from new.status)
execute function notify_payment_status_change();


-- =========================================================================
-- SUMBER ASLI: supabase/migrations/0012_konten_legal_dan_faq.sql
-- =========================================================================
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


-- =========================================================================
-- SUMBER ASLI: supabase/migrations/0013_perbaikan_bug_audit.sql
-- =========================================================================
-- =========================================================
-- 0013: Perbaikan Bug Hasil Audit
-- =========================================================
-- Migration ini memperbaiki beberapa bug yang ditemukan saat audit
-- menyeluruh. Beberapa bug sebenarnya berasal dari migration lama
-- (0005/0006), baru ketahuan dampaknya setelah fitur Voucher & Konfirmasi
-- Terima aktif dipakai.

-- ---------------------------------------------------------
-- BUG 1 (KRITIS): used_count voucher dihitung DUA KALI setiap dipakai.
-- create_order_atomic() (0005/0008) sudah menambah used_count +1 saat
-- voucher dipakai. Trigger trg_increment_coupon_usage (0006) ikut
-- menambah +1 LAGI setiap ada order baru berstatus 'unpaid' dengan
-- coupon_code - padahal SEMUA order baru selalu berstatus 'unpaid' di
-- awal. Akibatnya kuota voucher habis 2x lebih cepat dari seharusnya.
-- Perbaikan: hapus trigger duplikat ini, biarkan create_order_atomic()
-- jadi satu-satunya sumber kebenaran.
-- ---------------------------------------------------------
drop trigger if exists trg_increment_coupon_usage on orders;

-- ---------------------------------------------------------
-- BUG 2 (KRITIS): create_order_atomic() tidak memeriksa usage_limit
-- maupun valid_until voucher di server - hanya dicek di sisi client
-- (yang bisa dilewati siapa pun yang memanggil API langsung). Voucher
-- yang kuotanya sudah habis atau sudah kedaluwarsa tetap bisa dipakai
-- lewat panggilan API langsung.
-- Perbaikan: create or replace dengan validasi tambahan. Fungsi ini
-- disalin PERSIS dari migration 0008 (versi yang aktif di production),
-- HANYA blok "Voucher" yang ditambah pengecekan usage_limit & valid_until.
-- Tidak ada baris lain yang diubah.
-- ---------------------------------------------------------
create or replace function create_order_atomic(
  p_idempotency_key text,
  p_cart_item_ids uuid[],
  p_user_id uuid,
  p_session_id text,
  p_guest_name text,
  p_guest_phone text,
  p_guest_email text,
  p_shipping_address jsonb,
  p_courier_code text,
  p_courier_service text,
  p_shipping_cost numeric,
  p_shipping_eta text,
  p_payment_method text,
  p_payment_channel_detail text,
  p_buyer_note text,
  p_coupon_code text
)
returns jsonb as $$
declare
  v_existing_order_id uuid;
  v_existing_payment_id uuid;
  v_cart record;
  v_stock int;
  v_price numeric;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_total_weight int := 0;
  v_discount numeric := 0;
  v_grand_total numeric;
  v_coupon record;
  v_order_id uuid;
  v_order_number text;
  v_payment_id uuid;
  v_cart_count int;
begin
  if p_idempotency_key is not null then
    select id into v_existing_order_id from orders where idempotency_key = p_idempotency_key;
    if v_existing_order_id is not null then
      select id into v_existing_payment_id from payments where order_id = v_existing_order_id limit 1;
      return jsonb_build_object(
        'order_id', v_existing_order_id,
        'payment_id', v_existing_payment_id,
        'already_existed', true
      );
    end if;
  end if;

  select count(*) into v_cart_count from cart_items where id = any(p_cart_item_ids);
  if v_cart_count = 0 then
    raise exception 'Keranjang kosong atau tidak valid' using errcode = 'P0001';
  end if;

  for v_cart in
    select ci.id as cart_item_id, ci.product_id, ci.variant_id, ci.quantity,
           p.name as product_name, p.price as product_price, p.weight_grams,
           pv.price_override
    from cart_items ci
    join products p on p.id = ci.product_id
    left join product_variants pv on pv.id = ci.variant_id
    where ci.id = any(p_cart_item_ids)
      and (
        (p_user_id is not null and ci.user_id = p_user_id) or
        (p_user_id is null and ci.session_id = p_session_id)
      )
    order by ci.product_id, ci.variant_id
  loop
    if v_cart.variant_id is not null then
      select stock into v_stock from product_variants where id = v_cart.variant_id for update;
    else
      select stock into v_stock from products where id = v_cart.product_id for update;
    end if;

    if v_stock is null or v_stock < v_cart.quantity then
      raise exception 'Stok "%" tidak mencukupi', v_cart.product_name using errcode = 'P0002';
    end if;

    v_price := coalesce(v_cart.price_override, v_cart.product_price);
    v_line_total := v_price * v_cart.quantity;
    v_subtotal := v_subtotal + v_line_total;
    v_total_weight := v_total_weight + (v_cart.weight_grams * v_cart.quantity);
  end loop;

  -- FIX BUG 2 (audit 0013): validasi voucher sekarang juga memeriksa
  -- usage_limit (kuota) dan valid_until (kedaluwarsa) di server.
  if p_coupon_code is not null then
    select * into v_coupon from coupons
      where code = upper(p_coupon_code) and is_active = true
      for update;
    if found
       and v_subtotal >= coalesce(v_coupon.min_purchase, 0)
       and (v_coupon.valid_until is null or v_coupon.valid_until >= now())
       and (v_coupon.usage_limit is null or v_coupon.used_count < v_coupon.usage_limit)
    then
      if v_coupon.discount_type = 'percent' then
        v_discount := least(v_subtotal * v_coupon.discount_value / 100, coalesce(v_coupon.max_discount, v_subtotal));
      else
        v_discount := v_coupon.discount_value;
      end if;
      update coupons set used_count = used_count + 1 where id = v_coupon.id;
    end if;
  end if;

  v_grand_total := greatest(0, v_subtotal - v_discount + coalesce(p_shipping_cost, 0));

  v_order_number := next_order_number();

  insert into orders (
    order_number, user_id, guest_name, guest_phone, guest_email,
    shipping_address, courier_code, courier_service, shipping_cost, shipping_eta,
    subtotal, discount_total, total_weight_grams, grand_total,
    coupon_code, buyer_note, status, idempotency_key
  ) values (
    v_order_number, p_user_id, p_guest_name, p_guest_phone, p_guest_email,
    p_shipping_address, p_courier_code, p_courier_service, coalesce(p_shipping_cost, 0), p_shipping_eta,
    v_subtotal, v_discount, v_total_weight, v_grand_total,
    p_coupon_code, p_buyer_note, 'unpaid', p_idempotency_key
  ) returning id into v_order_id;

  for v_cart in
    select ci.id as cart_item_id, ci.product_id, ci.variant_id, ci.quantity,
           p.name as product_name, p.price as product_price, p.stock as product_stock,
           pv.stock as variant_stock, pv.price_override,
           (select url from product_images where product_id = ci.product_id and is_primary = true limit 1) as primary_image,
           (select url from product_images where product_id = ci.product_id order by sort_order limit 1) as fallback_image,
           c.name as color_name, s.label as size_label
    from cart_items ci
    join products p on p.id = ci.product_id
    left join product_variants pv on pv.id = ci.variant_id
    left join colors c on c.id = pv.color_id
    left join sizes s on s.id = pv.size_id
    where ci.id = any(p_cart_item_ids)
      and (
        (p_user_id is not null and ci.user_id = p_user_id) or
        (p_user_id is null and ci.session_id = p_session_id)
      )
  loop
    v_price := coalesce(v_cart.price_override, v_cart.product_price);

    insert into order_items (
      order_id, product_id, variant_id, product_name, product_image,
      color_name, size_label, unit_price, quantity, line_total
    ) values (
      v_order_id, v_cart.product_id, v_cart.variant_id, v_cart.product_name,
      coalesce(v_cart.primary_image, v_cart.fallback_image),
      v_cart.color_name, v_cart.size_label, v_price, v_cart.quantity, v_price * v_cart.quantity
    );

    if v_cart.variant_id is not null then
      update product_variants set stock = stock - v_cart.quantity where id = v_cart.variant_id;
    end if;
    update products set stock = stock - v_cart.quantity where id = v_cart.product_id;
    update products set sold_count = sold_count + v_cart.quantity where id = v_cart.product_id;
  end loop;

  insert into payments (order_id, method, channel_detail, amount, status)
  values (v_order_id, p_payment_method::payment_method, p_payment_channel_detail, v_grand_total, 'pending')
  returning id into v_payment_id;

  delete from cart_items where id = any(p_cart_item_ids);

  insert into activity_logs (actor_type, action, entity, entity_id, metadata)
  values ('system', 'order_created', 'orders', v_order_id::text, jsonb_build_object('order_number', v_order_number));

  return jsonb_build_object(
    'order_id', v_order_id,
    'payment_id', v_payment_id,
    'already_existed', false
  );
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------
-- BUG 3: Review bisa terkirim dobel untuk order_item yang sama kalau
-- user klik cepat 2x atau membuka halaman ulasan di 2 tab. Tidak ada
-- unique constraint yang mencegahnya di database.
-- Perbaikan: unique index (dikombinasikan dengan penanganan error yang
-- rapi di frontend, lihat perubahan review-form-list.tsx).
-- ---------------------------------------------------------
create unique index if not exists uniq_review_per_order_item
  on reviews(order_item_id)
  where order_item_id is not null;

-- ---------------------------------------------------------
-- BUG 4: Policy "user confirm own arrived order" (migration 0009)
-- mengizinkan UPDATE langsung ke tabel orders. WITH CHECK hanya
-- memvalidasi status='completed', TIDAK membatasi kolom lain di baris
-- yang sama - artinya panggilan API langsung (di luar UI resmi kita)
-- secara teori bisa menumpangi update itu untuk ikut mengubah kolom
-- lain juga (misal grand_total) selama status akhirnya 'completed'.
-- Perbaikan: ganti dengan function khusus (security definer) yang HANYA
-- pernah mengubah kolom status, lalu policy UPDATE mentah dicabut.
-- ---------------------------------------------------------
drop policy if exists "user confirm own arrived order" on orders;

create or replace function confirm_order_received(p_order_number text)
returns void
language plpgsql security definer as $$
declare
  v_order_id uuid;
begin
  update orders
  set status = 'completed'
  where order_number = p_order_number
    and user_id = auth.uid()
    and status = 'arrived'
  returning id into v_order_id;

  if v_order_id is null then
    raise exception 'Pesanan tidak ditemukan atau belum berstatus diterima' using errcode = 'P0003';
  end if;
end;
$$;

grant execute on function confirm_order_received(text) to authenticated;

-- ---------------------------------------------------------
-- BUG 5 (dormant, belum pernah ke-trigger sejauh ini): trigger
-- trg_update_product_metrics (0006) mereferensikan order_items.status,
-- padahal kolom itu TIDAK ADA di tabel order_items. Kalau suatu saat ada
-- fitur yang meng-UPDATE baris order_items, ini akan langsung gagal
-- dengan error database. sold_count sendiri sudah dihitung dengan benar
-- di create_order_atomic() saat order dibuat, jadi trigger ini memang
-- tidak diperlukan lagi.
-- ---------------------------------------------------------
drop trigger if exists trg_update_product_metrics on order_items;


-- =========================================================================
-- SUMBER ASLI: supabase/migrations/0014_fitur_retur_refund.sql
-- =========================================================================
-- =========================================================
-- 0014: Fitur Ajukan Retur / Refund (sungguhan, bukan placeholder)
-- =========================================================

create type return_status as enum ('pending', 'approved', 'rejected', 'refunded');
create type return_reason as enum ('wrong_item', 'damaged', 'not_as_described', 'wrong_size', 'changed_mind', 'other');

create table returns (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  order_item_id uuid references order_items(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  reason return_reason not null,
  description text,
  images jsonb not null default '[]',
  status return_status not null default 'pending',
  admin_note text,
  refund_amount numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table returns enable row level security;

create policy "user create own return" on returns for insert
  with check (auth.uid() = user_id);
create policy "user read own return" on returns for select
  using (auth.uid() = user_id or is_admin());
create policy "admin update return" on returns for update
  using (is_admin());

create index idx_returns_order_id on returns(order_id);
create index idx_returns_user_id on returns(user_id);

-- updated_at otomatis
create or replace function touch_returns_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_touch_returns_updated_at
before update on returns
for each row execute function touch_returns_updated_at();

-- Storage bucket untuk foto bukti retur (barang rusak/salah, dll)
insert into storage.buckets (id, name, public)
values ('returns', 'returns', true)
on conflict (id) do nothing;

create policy "public read returns bucket" on storage.objects for select
  using (bucket_id = 'returns');
create policy "user upload own return photos" on storage.objects for insert
  with check (bucket_id = 'returns' and (storage.foldername(name))[1] = auth.uid()::text);

-- Notifikasi otomatis saat status retur berubah (approve/reject/refund),
-- pola yang sama seperti trigger notifikasi status pesanan (0011).
create or replace function notify_return_status_change() returns trigger
language plpgsql security definer as $$
declare
  v_order_number text;
  v_title text;
  v_message text;
begin
  if new.user_id is null then
    return new;
  end if;

  select order_number into v_order_number from orders where id = new.order_id;

  case new.status
    when 'approved' then
      v_title := 'Retur Disetujui';
      v_message := 'Pengajuan retur untuk pesanan ' || v_order_number || ' telah disetujui. Ikuti instruksi pengembalian barang dari admin.';
    when 'rejected' then
      v_title := 'Retur Ditolak';
      v_message := 'Pengajuan retur untuk pesanan ' || v_order_number || ' ditolak.' ||
                   case when new.admin_note is not null then ' Alasan: ' || new.admin_note else '' end;
    when 'refunded' then
      v_title := 'Dana Retur Dikembalikan';
      v_message := 'Refund untuk pesanan ' || v_order_number || ' telah selesai diproses.';
    else
      return new; -- 'pending' (status awal) tidak perlu notifikasi
  end case;

  insert into notifications (user_id, order_id, channel, title, message)
  values (new.user_id, new.order_id, 'toast', v_title, v_message);

  return new;
end;
$$;

drop trigger if exists trg_notify_return_status on returns;
create trigger trg_notify_return_status
after update of status on returns
for each row
when (old.status is distinct from new.status)
execute function notify_return_status_change();


-- =========================================================================
-- SUMBER ASLI: supabase/migrations/0015_cod_area_terbatas.sql
-- =========================================================================
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


-- =========================================================================
-- SUMBER ASLI: supabase/migrations/0016_cod_create_order_atomic.sql
-- =========================================================================
-- =========================================================
-- 0016: create_order_atomic - dukungan status & proteksi COD
-- =========================================================
-- Perubahan dari versi sebelumnya (migrations/0009 dst - lihat versi
-- efektif terakhir di schema-lengkap-fashion-store.sql):
--
-- 1. Kalau p_payment_method = 'cod', order LANGSUNG dibuat dengan status
--    'processing' (bukan 'unpaid'), karena tidak ada bukti transfer yang
--    perlu diverifikasi - cash baru diserahkan saat barang tiba.
-- 2. Proteksi risiko: kalau p_payment_method = 'cod', grand_total order
--    divalidasi ULANG terhadap settings.cod_max_amount di server (bukan
--    cuma dicegah di UI client). Ini authoritative karena grand_total
--    baru pasti setelah subtotal, diskon, dan ongkir dihitung di sini.
--    Kalau order tetap dipaksa lewat COD padahal melebihi batas (mis.
--    lewat curl langsung), transaksi dibatalkan (exception).
-- =========================================================

create or replace function create_order_atomic(
  p_idempotency_key text,
  p_cart_item_ids uuid[],
  p_user_id uuid,
  p_session_id text,
  p_guest_name text,
  p_guest_phone text,
  p_guest_email text,
  p_shipping_address jsonb,
  p_courier_code text,
  p_courier_service text,
  p_shipping_cost numeric,
  p_shipping_eta text,
  p_payment_method text,
  p_payment_channel_detail text,
  p_buyer_note text,
  p_coupon_code text
)
returns jsonb as $$
declare
  v_existing_order_id uuid;
  v_existing_payment_id uuid;
  v_cart record;
  v_stock int;
  v_price numeric;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_total_weight int := 0;
  v_discount numeric := 0;
  v_grand_total numeric;
  v_coupon record;
  v_order_id uuid;
  v_order_number text;
  v_payment_id uuid;
  v_cart_count int;
  v_initial_status order_status;
  v_cod_max_amount numeric;
begin
  if p_idempotency_key is not null then
    select id into v_existing_order_id from orders where idempotency_key = p_idempotency_key;
    if v_existing_order_id is not null then
      select id into v_existing_payment_id from payments where order_id = v_existing_order_id limit 1;
      return jsonb_build_object(
        'order_id', v_existing_order_id,
        'payment_id', v_existing_payment_id,
        'already_existed', true
      );
    end if;
  end if;

  select count(*) into v_cart_count from cart_items where id = any(p_cart_item_ids);
  if v_cart_count = 0 then
    raise exception 'Keranjang kosong atau tidak valid' using errcode = 'P0001';
  end if;

  for v_cart in
    select ci.id as cart_item_id, ci.product_id, ci.variant_id, ci.quantity,
           p.name as product_name, p.price as product_price, p.weight_grams,
           pv.price_override
    from cart_items ci
    join products p on p.id = ci.product_id
    left join product_variants pv on pv.id = ci.variant_id
    where ci.id = any(p_cart_item_ids)
      and (
        (p_user_id is not null and ci.user_id = p_user_id) or
        (p_user_id is null and ci.session_id = p_session_id)
      )
    order by ci.product_id, ci.variant_id
  loop
    if v_cart.variant_id is not null then
      select stock into v_stock from product_variants where id = v_cart.variant_id for update;
    else
      select stock into v_stock from products where id = v_cart.product_id for update;
    end if;

    if v_stock is null or v_stock < v_cart.quantity then
      raise exception 'Stok "%" tidak mencukupi', v_cart.product_name using errcode = 'P0002';
    end if;

    v_price := coalesce(v_cart.price_override, v_cart.product_price);
    v_line_total := v_price * v_cart.quantity;
    v_subtotal := v_subtotal + v_line_total;
    v_total_weight := v_total_weight + (v_cart.weight_grams * v_cart.quantity);
  end loop;

  -- FIX BUG 2 (audit 0013): validasi voucher sekarang juga memeriksa
  -- usage_limit (kuota) dan valid_until (kedaluwarsa) di server.
  if p_coupon_code is not null then
    select * into v_coupon from coupons
      where code = upper(p_coupon_code) and is_active = true
      for update;
    if found
       and v_subtotal >= coalesce(v_coupon.min_purchase, 0)
       and (v_coupon.valid_until is null or v_coupon.valid_until >= now())
       and (v_coupon.usage_limit is null or v_coupon.used_count < v_coupon.usage_limit)
    then
      if v_coupon.discount_type = 'percent' then
        v_discount := least(v_subtotal * v_coupon.discount_value / 100, coalesce(v_coupon.max_discount, v_subtotal));
      else
        v_discount := v_coupon.discount_value;
      end if;
      update coupons set used_count = used_count + 1 where id = v_coupon.id;
    end if;
  end if;

  v_grand_total := greatest(0, v_subtotal - v_discount + coalesce(p_shipping_cost, 0));

  -- COD: order langsung 'processing' (skip 'unpaid' - tidak ada bukti
  -- transfer yang perlu diverifikasi), dan grand_total divalidasi ulang
  -- terhadap batas maksimal COD yang diatur admin (proteksi risiko,
  -- authoritative di server - lihat catatan di kepala file migration ini).
  if p_payment_method = 'cod' then
    select cod_max_amount into v_cod_max_amount from settings where id = 1;
    if v_cod_max_amount is not null and v_grand_total > v_cod_max_amount then
      raise exception 'Total pesanan melebihi batas maksimal COD' using errcode = 'P0003';
    end if;
    v_initial_status := 'processing';
  else
    v_initial_status := 'unpaid';
  end if;

  v_order_number := next_order_number();

  insert into orders (
    order_number, user_id, guest_name, guest_phone, guest_email,
    shipping_address, courier_code, courier_service, shipping_cost, shipping_eta,
    subtotal, discount_total, total_weight_grams, grand_total,
    coupon_code, buyer_note, status, idempotency_key
  ) values (
    v_order_number, p_user_id, p_guest_name, p_guest_phone, p_guest_email,
    p_shipping_address, p_courier_code, p_courier_service, coalesce(p_shipping_cost, 0), p_shipping_eta,
    v_subtotal, v_discount, v_total_weight, v_grand_total,
    p_coupon_code, p_buyer_note, v_initial_status, p_idempotency_key
  ) returning id into v_order_id;

  for v_cart in
    select ci.id as cart_item_id, ci.product_id, ci.variant_id, ci.quantity,
           p.name as product_name, p.price as product_price, p.stock as product_stock,
           pv.stock as variant_stock, pv.price_override,
           (select url from product_images where product_id = ci.product_id and is_primary = true limit 1) as primary_image,
           (select url from product_images where product_id = ci.product_id order by sort_order limit 1) as fallback_image,
           c.name as color_name, s.label as size_label
    from cart_items ci
    join products p on p.id = ci.product_id
    left join product_variants pv on pv.id = ci.variant_id
    left join colors c on c.id = pv.color_id
    left join sizes s on s.id = pv.size_id
    where ci.id = any(p_cart_item_ids)
      and (
        (p_user_id is not null and ci.user_id = p_user_id) or
        (p_user_id is null and ci.session_id = p_session_id)
      )
  loop
    v_price := coalesce(v_cart.price_override, v_cart.product_price);

    insert into order_items (
      order_id, product_id, variant_id, product_name, product_image,
      color_name, size_label, unit_price, quantity, line_total
    ) values (
      v_order_id, v_cart.product_id, v_cart.variant_id, v_cart.product_name,
      coalesce(v_cart.primary_image, v_cart.fallback_image),
      v_cart.color_name, v_cart.size_label, v_price, v_cart.quantity, v_price * v_cart.quantity
    );

    if v_cart.variant_id is not null then
      update product_variants set stock = stock - v_cart.quantity where id = v_cart.variant_id;
    end if;
    update products set stock = stock - v_cart.quantity where id = v_cart.product_id;
    update products set sold_count = sold_count + v_cart.quantity where id = v_cart.product_id;
  end loop;

  insert into payments (order_id, method, channel_detail, amount, status)
  values (v_order_id, p_payment_method::payment_method, p_payment_channel_detail, v_grand_total, 'pending')
  returning id into v_payment_id;

  delete from cart_items where id = any(p_cart_item_ids);

  insert into activity_logs (actor_type, action, entity, entity_id, metadata)
  values ('system', 'order_created', 'orders', v_order_id::text, jsonb_build_object('order_number', v_order_number));

  return jsonb_build_object(
    'order_id', v_order_id,
    'payment_id', v_payment_id,
    'already_existed', false
  );
end;
$$ language plpgsql security definer;
