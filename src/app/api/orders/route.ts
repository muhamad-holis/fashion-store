import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

interface CheckoutBody {
  idempotency_key: string;
  cart_item_ids: string[];
  address: {
    recipient_name: string;
    phone: string;
    province: string;
    city: string;
    district: string;
    subdistrict: string;
    postal_code: string;
    full_address: string;
    map_lat?: number;
    map_lng?: number;
  };
  guest_email?: string;
  courier_code: string;
  courier_service: string;
  shipping_cost: number;
  shipping_eta: string;
  payment_method: "bank_transfer" | "ewallet" | "qris";
  payment_channel_detail?: string;
  buyer_note?: string;
  coupon_code?: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const sessionId = request.headers.get("x-session-id");

  if (!user && !sessionId) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 400 });
  }

  const body: CheckoutBody = await request.json();

  if (!body.idempotency_key) {
    return NextResponse.json({ error: "idempotency_key wajib diisi" }, { status: 400 });
  }
  if (!body.cart_item_ids || body.cart_item_ids.length === 0) {
    return NextResponse.json({ error: "Keranjang kosong atau tidak valid" }, { status: 400 });
  }

  const db = createServiceRoleClient();

  // Seluruh proses checkout (validasi stok, kurangi stok, buat order,
  // order_items, payment, kosongkan cart) dijalankan dalam SATU transaksi
  // atomic di database (lihat migrations/0005_atomic_checkout.sql). Ini
  // mencegah race condition saat ada beberapa checkout bersamaan untuk
  // produk yang sama (oversell stok) dan mencegah order "setengah jadi"
  // jika salah satu langkah gagal. idempotency_key mencegah request yang
  // sama (klik ganda / retry jaringan) membuat order duplikat.
  const { data, error } = await db.rpc("create_order_atomic", {
    p_idempotency_key: body.idempotency_key,
    p_cart_item_ids: body.cart_item_ids,
    p_user_id: user?.id ?? null,
    p_session_id: sessionId,
    p_guest_name: body.address.recipient_name,
    p_guest_phone: body.address.phone,
    p_guest_email: body.guest_email ?? null,
    p_shipping_address: body.address,
    p_courier_code: body.courier_code,
    p_courier_service: body.courier_service,
    p_shipping_cost: body.shipping_cost,
    p_shipping_eta: body.shipping_eta,
    p_payment_method: body.payment_method,
    p_payment_channel_detail: body.payment_channel_detail ?? null,
    p_buyer_note: body.buyer_note ?? null,
    p_coupon_code: body.coupon_code ?? null,
  });

  if (error) {
    // P0002 = stok tidak mencukupi, P0001 = keranjang kosong/tidak valid
    // (dilempar manual di dalam fungsi SQL create_order_atomic)
    const status = error.code === "P0002" || error.code === "P0001" ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  const result = data as { order_id: string; payment_id: string; already_existed: boolean };

  const { data: order, error: orderFetchError } = await db
    .from("orders")
    .select("*")
    .eq("id", result.order_id)
    .single();
  if (orderFetchError) return NextResponse.json({ error: orderFetchError.message }, { status: 500 });

  const { data: payment, error: paymentFetchError } = await db
    .from("payments")
    .select("*")
    .eq("id", result.payment_id)
    .single();
  if (paymentFetchError) return NextResponse.json({ error: paymentFetchError.message }, { status: 500 });

  return NextResponse.json({ order, payment });
}
