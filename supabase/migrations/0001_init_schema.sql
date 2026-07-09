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
