/**
 * Tipe ini dibuat manual mengikuti schema di supabase/migrations.
 * Setelah project di-link ke Supabase, disarankan generate ulang otomatis dengan:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
 * agar selalu sinkron dengan schema terbaru.
 */
export type OrderStatus =
  | "unpaid"
  | "waiting_verification"
  | "processing"
  | "packed"
  | "shipped"
  | "arrived"
  | "completed"
  | "cancelled";

export type PaymentMethod = "bank_transfer" | "ewallet" | "qris";
export type PaymentStatus = "pending" | "approved" | "rejected";
export type UserRole = "customer" | "admin" | "super_admin";

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  category_id: string | null;
  description: string | null;
  material_detail: string | null;
  size_guide: string | null;
  price: number;
  compare_at_price: number | null;
  discount_percent: number;
  weight_grams: number;
  stock: number;
  is_flash_sale: boolean;
  flash_sale_start: string | null;
  flash_sale_end: string | null;
  is_new_arrival: boolean;
  is_active: boolean;
  rating_avg: number;
  review_count: number;
  sold_count: number;
  estimated_ship_days: string | null;
  created_at: string;
  updated_at: string;
  // relasi (di-join saat query)
  product_images?: ProductImage[];
  product_videos?: ProductVideo[];
  product_variants?: ProductVariant[];
  categories?: Category;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  sort_order: number;
  is_primary: boolean;
}

export interface ProductVideo {
  id: string;
  product_id: string;
  url: string;
  thumbnail_url: string | null;
}

export interface Color {
  id: string;
  name: string;
  hex_code: string;
}

export interface Size {
  id: string;
  label: string;
  sort_order: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  color_id: string | null;
  size_id: string | null;
  stock: number;
  price_override: number | null;
  colors?: Color;
  sizes?: Size;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface CartItem {
  id: string;
  session_id: string | null;
  user_id: string | null;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  note: string | null;
  products?: Product;
  product_variants?: ProductVariant;
}

export interface Address {
  id: string;
  user_id: string;
  recipient_name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  subdistrict: string;
  postal_code: string;
  full_address: string;
  map_lat: number | null;
  map_lng: number | null;
  is_default: boolean;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  shipping_address: Record<string, any>;
  courier_code: string | null;
  courier_service: string | null;
  shipping_cost: number;
  shipping_eta: string | null;
  subtotal: number;
  discount_total: number;
  total_weight_grams: number;
  grand_total: number;
  coupon_code: string | null;
  buyer_note: string | null;
  status: OrderStatus;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  payments?: Payment[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  product_image: string | null;
  color_name: string | null;
  size_label: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface Payment {
  id: string;
  order_id: string;
  method: PaymentMethod;
  channel_detail: string | null;
  amount: number;
  status: PaymentStatus;
  created_at: string;
}

export interface StoreSettings {
  id: number;
  store_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  address: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  email: string | null;
  operational_hours: string | null;
  qris_image_url: string | null;
  bank_accounts: { bank: string; account_number: string; account_name: string }[];
  ewallet_accounts: { provider: string; number: string; name: string }[];
}

// Placeholder generic Database type supaya createBrowserClient/createServerClient
// tetap type-safe tanpa perlu generate penuh dulu.
export type Database = {
  public: {
    Tables: Record<string, { Row: any; Insert: any; Update: any }>;
  };
};
