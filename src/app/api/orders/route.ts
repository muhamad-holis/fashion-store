import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getShippingOptions } from "@/lib/shipping";
import { isAreaAllowedForCod } from "@/lib/cod";

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
  payment_method: "bank_transfer" | "ewallet" | "qris" | "cod";
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

  // CATATAN FIX (audit keamanan - shipping_cost manipulation):
  // Sebelumnya body.shipping_cost dari client dipercaya mentah-mentah dan
  // diteruskan langsung ke create_order_atomic() untuk menghitung
  // grand_total. Siapa pun yang memanggil endpoint ini langsung (bypass UI
  // checkout) bisa mengirim shipping_cost: 0 atau nilai kecil sembarang.
  //
  // Perbaikan: ongkir dihitung ULANG sepenuhnya di server berdasarkan berat
  // asli isi keranjang (diambil dari DB, bukan dari client) + kurir yang
  // dipilih, lalu dicocokkan dengan daftar opsi ongkir resmi dari
  // getShippingOptions(). Nilai shipping_cost dari client TIDAK PERNAH
  // dipakai lagi mulai baris ini ke bawah.
  const { data: cartItemsForWeight, error: cartWeightError } = await db
    .from("cart_items")
    .select("id, quantity, products(weight_grams)")
    .in("id", body.cart_item_ids)
    .eq(user?.id ? "user_id" : "session_id", (user?.id ?? sessionId) as string);

  if (cartWeightError || !cartItemsForWeight || cartItemsForWeight.length === 0) {
    return NextResponse.json({ error: "Keranjang kosong atau tidak valid" }, { status: 400 });
  }

  const totalWeightGrams = cartItemsForWeight.reduce((sum, item: any) => {
    const weight = item.products?.weight_grams ?? 0;
    return sum + weight * item.quantity;
  }, 0);

  if (!body.address?.city) {
    return NextResponse.json({ error: "Kota tujuan wajib diisi" }, { status: 400 });
  }

  // CATATAN COD (validasi server - lihat lib/cod.ts): metode COD tidak
  // dikirim lewat kurir nasional, jadi TIDAK pakai getShippingOptions()
  // seperti metode lain. Sebagai gantinya ongkir adalah flat fee yang
  // diatur admin (settings.cod_shipping_fee), dan area alamat WAJIB
  // dicek ulang di sini - tidak boleh cuma percaya pengecekan di client,
  // sama seperti kasus manipulasi shipping_cost sebelumnya.
  let verifiedShipping: { courier_code: string; service: string; cost: number; eta: string };

  if (body.payment_method === "cod") {
    const { data: settings, error: settingsError } = await db
      .from("settings")
      .select("cod_enabled, cod_areas, cod_shipping_fee")
      .eq("id", 1)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json({ error: "Gagal memuat pengaturan COD" }, { status: 500 });
    }
    if (!settings.cod_enabled) {
      return NextResponse.json({ error: "COD sedang tidak tersedia" }, { status: 400 });
    }
    if (!isAreaAllowedForCod(body.address.district, body.address.subdistrict, settings.cod_areas as any)) {
      return NextResponse.json(
        { error: "COD tidak tersedia untuk alamat ini. Silakan pilih metode pembayaran lain." },
        { status: 400 }
      );
    }

    verifiedShipping = {
      courier_code: "cod",
      service: "COD",
      cost: settings.cod_shipping_fee ?? 0,
      eta: "Diantar langsung",
    };
  } else {
    const shippingOptions = await getShippingOptions({
      destinationCity: body.address.city,
      totalWeightGrams,
    });

    const matchedShipping = shippingOptions.find(
      (opt) => opt.courier_code === body.courier_code
    );

    if (!matchedShipping) {
      return NextResponse.json(
        { error: "Opsi pengiriman tidak valid atau sudah kedaluwarsa, silakan pilih ulang kurir." },
        { status: 400 }
      );
    }
    verifiedShipping = matchedShipping;
  }

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
    p_courier_code: verifiedShipping.courier_code,
    p_courier_service: verifiedShipping.service,
    p_shipping_cost: verifiedShipping.cost,
    p_shipping_eta: verifiedShipping.eta,
    p_payment_method: body.payment_method,
    p_payment_channel_detail: body.payment_channel_detail ?? null,
    p_buyer_note: body.buyer_note ?? null,
    p_coupon_code: body.coupon_code ?? null,
  });

  if (error) {
    // P0001 = keranjang kosong/tidak valid, P0002 = stok tidak mencukupi,
    // P0003 = total pesanan melebihi batas maksimal COD
    // (dilempar manual di dalam fungsi SQL create_order_atomic)
    const knownErrors = ["P0001", "P0002", "P0003"];
    const status = knownErrors.includes(error.code) ? 400 : 500;
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
