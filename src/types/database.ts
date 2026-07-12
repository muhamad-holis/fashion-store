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
export type NotificationChannel = "toast" | "email";
export type DiscountType = "percent" | "fixed";
export type ReturnStatus = "pending" | "approved" | "rejected" | "refunded";
export type ReturnReason =
  | "wrong_item"
  | "damaged"
  | "not_as_described"
  | "wrong_size"
  | "changed_mind"
  | "other";

export type Product = {
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
  meta_title: string | null;
  meta_description: string | null;
  estimated_ship_days: string | null;
  created_at: string;
  updated_at: string;
  // relasi (di-join saat query)
  product_images?: ProductImage[];
  product_videos?: ProductVideo[];
  product_variants?: ProductVariant[];
  categories?: Category;
  reviews?: Review[];
}

export type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  sort_order: number;
  is_primary: boolean;
}

export type ProductVideo = {
  id: string;
  product_id: string;
  url: string;
  thumbnail_url: string | null;
}

export type Color = {
  id: string;
  name: string;
  hex_code: string;
}

export type Size = {
  id: string;
  label: string;
  sort_order: number;
}

export type ProductVariant = {
  id: string;
  product_id: string;
  color_id: string | null;
  size_id: string | null;
  sku_suffix: string | null;
  stock: number;
  price_override: number | null;
  created_at: string;
  colors?: Color;
  sizes?: Size;
}

export type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export type CartItem = {
  id: string;
  session_id: string | null;
  user_id: string | null;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  note: string | null;
  created_at: string;
  products?: Product;
  product_variants?: ProductVariant;
}

export type WishlistItem = {
  id: string;
  session_id: string | null;
  user_id: string | null;
  product_id: string;
  created_at: string;
  products?: Product;
}

export type Address = {
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
  created_at: string;
}

export type Courier = {
  id: string;
  code: string;
  name: string;
  logo_url: string | null;
  is_active: boolean;
}

export type Order = {
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
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  payments?: Payment[];
}

export type OrderItem = {
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

export type Payment = {
  id: string;
  order_id: string;
  method: PaymentMethod;
  channel_detail: string | null;
  amount: number;
  status: PaymentStatus;
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  payment_proofs?: PaymentProof[];
  orders?: Order;
}

export type PaymentProof = {
  id: string;
  payment_id: string;
  image_url: string;
  uploaded_at: string;
}

export type ShippingLog = {
  id: string;
  order_id: string;
  status: string;
  description: string | null;
  created_at: string;
}

export type Review = {
  id: string;
  product_id: string;
  order_item_id: string | null;
  user_id: string | null;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  images: string[];
  is_visible: boolean;
  created_at: string;
  products?: Product;
}

export type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_purchase: number | null;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
}

export type Banner = {
  id: string;
  title: string | null;
  image_url: string;
  link_url: string | null;
  placement: string;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type Admin = {
  id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  created_at: string;
}

export type Notification = {
  id: string;
  user_id: string | null;
  order_id: string | null;
  channel: NotificationChannel;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export type Return = {
  id: string;
  order_id: string;
  order_item_id: string | null;
  user_id: string | null;
  reason: ReturnReason;
  description: string | null;
  images: string[];
  status: ReturnStatus;
  admin_note: string | null;
  refund_amount: number | null;
  created_at: string;
  updated_at: string;
}

export type Faq = {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export type ActivityLog = {
  id: string;
  actor_id: string | null;
  actor_type: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export type StoreSettings = {
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
  bank_accounts: {
    bank: string;
    account_number: string;
    account_name: string;
    logo_url?: string;
    is_active?: boolean;
  }[];
  ewallet_accounts: {
    provider: string;
    number: string;
    name: string;
    logo_url?: string;
    is_active?: boolean;
  }[];
  privacy_policy: string | null;
  terms_conditions: string | null;
  about_us: string | null;
  updated_at: string;
}

// =========================================================
// DATABASE TYPE (dipakai oleh createBrowserClient<Database> /
// createServerClient<Database> supaya query .from()/.insert()/.update()
// type-safe sesuai schema asli di supabase/migrations).
//
// PENTING: setiap tabel WAJIB didaftarkan secara eksplisit di sini
// (bukan pakai `Record<string, ...>` generik). Kalau nama tabel tidak
// terdaftar di sini, TypeScript diam-diam meng-infer tipe query jadi
// `never`, sehingga semua .insert()/.update() ke tabel tersebut gagal
// type-check dengan pesan seperti:
//   "Object literal may only specify known properties, and 'x' does
//    not exist in type 'never[]'"
// (persis error yang menyebabkan build Vercel gagal sebelumnya).
// Setiap kali menambah tabel baru di migration SQL, tambahkan juga
// entrinya di sini.
// =========================================================
type TableDef<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: any[];
};

export type Database = {
  public: {
    Tables: {
      settings: TableDef<StoreSettings>;
      profiles: TableDef<Profile>;
      admins: TableDef<Admin>;
      categories: TableDef<Category>;
      products: TableDef<Product>;
      colors: TableDef<Color>;
      sizes: TableDef<Size>;
      product_variants: TableDef<ProductVariant>;
      product_images: TableDef<ProductImage>;
      product_videos: TableDef<ProductVideo>;
      cart_items: TableDef<CartItem>;
      wishlist_items: TableDef<WishlistItem>;
      addresses: TableDef<Address>;
      couriers: TableDef<Courier>;
      orders: TableDef<Order>;
      order_items: TableDef<OrderItem>;
      payments: TableDef<Payment>;
      payment_proofs: TableDef<PaymentProof>;
      shipping_logs: TableDef<ShippingLog>;
      reviews: TableDef<Review>;
      coupons: TableDef<Coupon>;
      banners: TableDef<Banner>;
      notifications: TableDef<Notification>;
      activity_logs: TableDef<ActivityLog>;
      faqs: TableDef<Faq>;
      returns: TableDef<Return>;
      order_number_counters: TableDef<{ day: string; seq: number }>;
    };
    Views: Record<string, never>;
    Functions: {
      generate_order_number: {
        Args: Record<string, never>;
        Returns: string;
      };
      next_order_number: {
        Args: Record<string, never>;
        Returns: string;
      };
      create_order_atomic: {
        Args: {
          [key: string]: unknown;
          p_idempotency_key: string | null;
          p_cart_item_ids: string[];
          p_user_id: string | null;
          p_session_id: string | null;
          p_guest_name: string | null;
          p_guest_phone: string | null;
          p_guest_email: string | null;
          p_shipping_address: Record<string, any>;
          p_courier_code: string | null;
          p_courier_service: string | null;
          p_shipping_cost: number;
          p_shipping_eta: string | null;
          p_payment_method: string;
          p_payment_channel_detail: string | null;
          p_buyer_note: string | null;
          p_coupon_code: string | null;
        };
        Returns: { order_id: string; payment_id: string; already_existed: boolean };
      };
      confirm_order_received: {
        Args: { p_order_number: string };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
