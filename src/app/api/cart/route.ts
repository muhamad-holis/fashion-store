import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Cart mendukung guest (session_id dari localStorage, dikirim via header
 * x-session-id) maupun user yang login (auth.uid()). Route ini pakai
 * service role client supaya bisa query bebas berdasarkan salah satu
 * dari keduanya, lalu tetap validasi manual bahwa hanya baris milik
 * session/user yang diminta yang diakses.
 */

async function getIdentity(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const sessionId = request.headers.get("x-session-id");
  return { userId: user?.id ?? null, sessionId };
}

export async function GET(request: NextRequest) {
  const { userId, sessionId } = await getIdentity(request);
  if (!userId && !sessionId) {
    return NextResponse.json({ items: [] });
  }

  const db = createServiceRoleClient();
  let query = db
    .from("cart_items")
    .select(
      "*, products(id, name, slug, price, compare_at_price, stock, weight_grams, product_images(url, is_primary)), product_variants(id, stock, price_override, colors(name, hex_code), sizes(label))"
    )
    .order("created_at", { ascending: false });

  query = userId ? query.eq("user_id", userId) : query.eq("session_id", sessionId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

export async function POST(request: NextRequest) {
  const { userId, sessionId } = await getIdentity(request);
  if (!userId && !sessionId) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 400 });
  }

  const body = await request.json();
  const { product_id, variant_id, quantity = 1, note } = body;

  if (!product_id) {
    return NextResponse.json({ error: "product_id wajib diisi" }, { status: 400 });
  }

  const db = createServiceRoleClient();

  // Cek apakah item dengan produk+variant yang sama sudah ada di cart -> tambah qty
  let existingQuery = db
    .from("cart_items")
    .select("id, quantity")
    .eq("product_id", product_id)
    .eq("variant_id", variant_id ?? null);
  existingQuery = userId ? existingQuery.eq("user_id", userId) : existingQuery.eq("session_id", sessionId);

  const { data: existing } = await existingQuery.maybeSingle();

  if (existing) {
    const { data, error } = await db
      .from("cart_items")
      .update({ quantity: existing.quantity + quantity })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data });
  }

  const { data, error } = await db
    .from("cart_items")
    .insert({
      product_id,
      variant_id: variant_id ?? null,
      quantity,
      note,
      user_id: userId,
      session_id: userId ? null : sessionId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function PATCH(request: NextRequest) {
  const { userId, sessionId } = await getIdentity(request);
  const body = await request.json();
  const { id, quantity, note } = body;

  if (!id) return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });

  const db = createServiceRoleClient();
  let query = db.from("cart_items").update({ quantity, note }).eq("id", id);
  query = userId ? query.eq("user_id", userId) : query.eq("session_id", sessionId);

  const { data, error } = await query.select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(request: NextRequest) {
  const { userId, sessionId } = await getIdentity(request);
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });

  const db = createServiceRoleClient();
  let query = db.from("cart_items").delete().eq("id", id);
  query = userId ? query.eq("user_id", userId) : query.eq("session_id", sessionId);

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
