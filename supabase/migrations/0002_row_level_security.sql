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
create policy "admin write shipping logs" on shipping_logs for insert using (is_admin());

-- ---------- REVIEWS ----------
create policy "user create review" on reviews for insert
  with check (auth.uid() = user_id or user_id is null);

-- ---------- NOTIFICATIONS ----------
create policy "user read own notifications" on notifications for select
  using (auth.uid() = user_id or is_admin());
create policy "user update own notifications" on notifications for update
  using (auth.uid() = user_id);
create policy "system insert notifications" on notifications for insert with check (true);
