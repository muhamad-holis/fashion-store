import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Route ini KHUSUS untuk user yang sedang login. Tidak pakai service role -
// sengaja pakai client biasa (scoped ke sesi user) supaya RLS
// "user read own orders" (auth.uid() = user_id) yang menentukan boleh/tidaknya
// baca order tersebut. Jadi user A tidak akan pernah bisa lihat order user B
// lewat endpoint ini walau tahu nomor order-nya.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Silakan login untuk melihat pesanan ini." }, { status: 401 });
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select("*, order_items(*), payments(*, payment_proofs(*)), shipping_logs(*)")
    .eq("order_number", orderNumber.trim())
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!order) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ order });
}
