import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

interface CheckoutBody {
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
  const db = createServiceRoleClient();

  // 1. Ambil cart items yang dipilih beserta harga & stok TERKINI dari database
  //    (jangan pernah percaya harga yang dikirim dari client)
  let cartQuery = db
    .from("cart_items")
    .select(
      "*, products(id, name, price, stock, weight_grams, product_images(url, is_primary)), product_variants(id, stock, price_override, colors(name), sizes(label))"
    )
    .in("id", body.cart_item_ids);
  cartQuery = user ? cartQuery.eq("user_id", user.id) : cartQuery.eq("session_id", sessionId);
  const { data: cartItems, error: cartError } = await cartQuery;

  if (cartError) return NextResponse.json({ error: cartError.message }, { status: 500 });
  if (!cartItems || cartItems.length === 0) {
    return NextResponse.json({ error: "Keranjang kosong atau tidak valid" }, { status: 400 });
  }

  // 2. Validasi stok
  for (const item of cartItems) {
    const stock = item.product_variants?.stock ?? item.products?.stock ?? 0;
    if (stock < item.quantity) {
      return NextResponse.json(
        { error: `Stok "${item.products?.name}" tidak mencukupi` },
        { status: 400 }
      );
    }
  }

  // 3. Hitung total di server
  const orderItemsPayload = cartItems.map((item: any) => {
    const price = item.product_variants?.price_override ?? item.products?.price ?? 0;
    return {
      product_id: item.product_id,
      variant_id: item.variant_id,
      product_name: item.products?.name ?? "",
      product_image:
        item.products?.product_images?.find((i: any) => i.is_primary)?.url ??
        item.products?.product_images?.[0]?.url ??
        null,
      color_name: item.product_variants?.colors?.name ?? null,
      size_label: item.product_variants?.sizes?.label ?? null,
      unit_price: price,
      quantity: item.quantity,
      line_total: price * item.quantity,
    };
  });

  const subtotal = orderItemsPayload.reduce((s, i) => s + i.line_total, 0);
  const totalWeight = cartItems.reduce(
    (s: number, item: any) => s + (item.products?.weight_grams ?? 0) * item.quantity,
    0
  );

  // 4. Validasi & hitung voucher (jika ada)
  let discountTotal = 0;
  if (body.coupon_code) {
    const { data: coupon } = await db
      .from("coupons")
      .select("*")
      .eq("code", body.coupon_code.toUpperCase())
      .eq("is_active", true)
      .maybeSingle();

    if (coupon && subtotal >= (coupon.min_purchase ?? 0)) {
      discountTotal =
        coupon.discount_type === "percent"
          ? Math.min(
              (subtotal * coupon.discount_value) / 100,
              coupon.max_discount ?? Infinity
            )
          : coupon.discount_value;
    }
  }

  const grandTotal = Math.max(0, subtotal - discountTotal + body.shipping_cost);

  // 5. Generate nomor order
  const { data: orderNumberResult } = await db.rpc("generate_order_number");
  const orderNumber = orderNumberResult || `INV-${Date.now()}`;

  // 6. Buat order
  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({
      order_number: orderNumber,
      user_id: user?.id ?? null,
      guest_name: body.address.recipient_name,
      guest_phone: body.address.phone,
      guest_email: body.guest_email ?? null,
      shipping_address: body.address,
      courier_code: body.courier_code,
      courier_service: body.courier_service,
      shipping_cost: body.shipping_cost,
      shipping_eta: body.shipping_eta,
      subtotal,
      discount_total: discountTotal,
      total_weight_grams: totalWeight,
      grand_total: grandTotal,
      coupon_code: body.coupon_code ?? null,
      buyer_note: body.buyer_note ?? null,
      status: "unpaid",
    })
    .select()
    .single();

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });

  // 7. Simpan order items
  const { error: itemsError } = await db
    .from("order_items")
    .insert(orderItemsPayload.map((i) => ({ ...i, order_id: order.id })));
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });

  // 8. Kurangi stok (produk & variant jika ada)
  //    Catatan: untuk trafik tinggi, ganti dengan RPC atomic increment/decrement
  //    di Postgres agar terhindar dari race condition antar checkout bersamaan.
  for (const item of cartItems as any[]) {
    if (item.variant_id && item.product_variants) {
      await db
        .from("product_variants")
        .update({ stock: Math.max(0, item.product_variants.stock - item.quantity) })
        .eq("id", item.variant_id);
    }
    await db
      .from("products")
      .update({ stock: Math.max(0, item.products.stock - item.quantity) })
      .eq("id", item.product_id);
  }

  // 9. Buat record pembayaran (status pending, menunggu upload bukti)
  const { data: payment, error: paymentError } = await db
    .from("payments")
    .insert({
      order_id: order.id,
      method: body.payment_method,
      channel_detail: body.payment_channel_detail ?? null,
      amount: grandTotal,
      status: "pending",
    })
    .select()
    .single();
  if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 500 });

  // 10. Kosongkan cart yang sudah di-checkout
  await db.from("cart_items").delete().in("id", body.cart_item_ids);

  // 11. Catat aktivitas
  await db.from("activity_logs").insert({
    actor_type: "system",
    action: "order_created",
    entity: "orders",
    entity_id: order.id,
    metadata: { order_number: orderNumber },
  });

  return NextResponse.json({ order, payment });
}
