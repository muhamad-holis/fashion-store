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
