import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const orderNumber = request.nextUrl.searchParams.get("order_number");
  const phone = request.nextUrl.searchParams.get("phone");

  if (!orderNumber || !phone) {
    return NextResponse.json(
      { error: "Nomor order dan nomor HP wajib diisi" },
      { status: 400 }
    );
  }

  const db = createServiceRoleClient();
  const { data: order, error } = await db
    .from("orders")
    .select("*, order_items(*), payments(*, payment_proofs(*)), shipping_logs(*)")
    .eq("order_number", orderNumber.trim())
    .eq("guest_phone", phone.trim())
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!order) {
    return NextResponse.json(
      { error: "Pesanan tidak ditemukan. Periksa kembali nomor order dan nomor HP." },
      { status: 404 }
    );
  }

  return NextResponse.json({ order });
}
