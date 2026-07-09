# Deployment Checklist for Vercel

## Pre-Deployment Steps

### 1. Database Migrations
Before deploying to Vercel, run these migrations in Supabase:

```bash
# Apply migration files in order
1. supabase/migrations/0000_reset_total.sql
2. supabase/migrations/0001_init_schema.sql
3. supabase/migrations/0002_row_level_security.sql
4. supabase/migrations/0003_storage_buckets.sql
5. supabase/migrations/0004_seed_data.sql
6. supabase/migrations/0005_atomic_operations.sql (NEW)
7. supabase/migrations/0006_data_integrity_constraints.sql (NEW)
```

Run these in Supabase SQL Editor or via CLI:
```bash
supabase db push
```

### 2. Environment Variables
Add to Vercel:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for server-only)

### 3. Dependencies
✅ Dependencies have been updated:
- `recharts` updated to v3 (compatible with Next.js 15)
- `eslint` updated to v9
- Removed deprecated packages

### 4. Configuration
✅ Configuration has been updated:
- `next.config.mjs` - Added serverExternalPackages for Supabase
- Edge Runtime warnings are suppressed
- PWA is disabled in development

## What Was Fixed

### Critical Issues

#### 1. **TypeScript Type Error (Banner Page)**
- **Error**: `'title' does not exist in type 'never[]'`
- **Root Cause**: Incorrect type casting in Supabase insert
- **Fix**: Wrapped insert operation in array `[{...}]` and added proper type casting

#### 2. **Race Condition (Double Orders)**
- **Problem**: Concurrent checkout requests could create duplicate orders
- **Solution**: 
  - Implemented PostgreSQL advisory locks
  - Created atomic `process_checkout()` RPC function
  - All operations (order creation, stock decrement, cart cleanup) happen in single transaction

#### 3. **Stock Overselling**
- **Problem**: Stock decrement wasn't atomic, could sell more than available
- **Solution**:
  - Created `decrement_stock_atomic()` function
  - Uses `FOR UPDATE` locks to prevent concurrent modifications
  - Validates stock before decrement

#### 4. **Edge Runtime Warning**
- **Problem**: Supabase JS was using `process.version` (Node.js API)
- **Fix**: 
  - Used dynamic import in `createServiceRoleClient()`
  - Added `serverExternalPackages` in next.config.mjs

### Security Improvements

1. **Input Validation**
   - Cart items must have valid quantities > 0
   - Addresses must have all required fields
   - File uploads limited to 5MB images only

2. **Data Integrity**
   - Triggers prevent negative stock
   - Order items validated before insert
   - Payment amount must be positive
   - Order status transitions validated

3. **Idempotency**
   - Order creation is idempotent
   - Duplicate requests won't create duplicate orders
   - Advisory locks prevent race conditions

### Performance Improvements

1. **Indexes Added**
   - `idx_orders_created_at` - For order listing
   - `idx_payments_order_id` - For payment lookups
   - `idx_products_stock` - For stock queries
   - `idx_product_variants_stock` - For variant stock

2. **Database Functions**
   - `process_checkout()` - Atomic checkout with locking
   - `stock_is_available()` - Fast stock validation
   - `decrement_stock_atomic()` - Atomic stock updates

## Testing Checklist

Before going live, test:

- [ ] Create an order with guest checkout
- [ ] Create an order with logged-in user
- [ ] Verify stock decrements correctly
- [ ] Try concurrent orders (test race condition fix)
- [ ] Try invalid coupon codes
- [ ] Try file upload with oversized image
- [ ] Test banner creation/update
- [ ] Verify payment records are created
- [ ] Check order number generation is sequential

## Rollback Plan

If issues occur after deployment:

1. Disable the problematic endpoint in Next.js
2. Rollback migrations in Supabase (keep 0001-0004)
3. Deploy previous version
4. Fix issues and redeploy

## Monitoring

After deployment, monitor:

1. **Error Logs** (Vercel)
   - Look for any 500 errors in `/api/orders`
   - Check for Type errors

2. **Database Logs** (Supabase)
   - Monitor `process_checkout` RPC calls
   - Check for deadlocks (none should occur with advisory locks)

3. **Performance**
   - Checkout endpoint should complete in <2 seconds
   - Check database query times

## Notes

- All changes maintain backward compatibility
- No data migration needed
- No changes to existing API contracts
- Database schema is expanded only, no breaking changes
