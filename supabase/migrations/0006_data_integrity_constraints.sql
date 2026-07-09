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
