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

// Helper terpusat untuk filter berdasarkan pemilik cart (user_id ATAU
// session_id, tidak pernah dua-duanya null). Sebelumnya PATCH & DELETE
// tidak memvalidasi identitas sama sekali (beda dengan GET & POST) -
// akibatnya query .eq("session_id", null) bisa terkirim ke database
// dan berpotensi salah target/tidak konsisten. Dipusatkan di sini agar
// semua method punya perilaku keamanan yang sama.
function requireIdentity(userId: string | null, sessionId: string | null) {
  if (!userId && !sessionId) {
    return null;
  }
  return userId ? { column: "user_id" as const, value: userId } : { column: "session_id" as const, value: sessionId as string };
}

export async function GET(request: NextRequest) {
  const { userId, sessionId } = await getIdentity(request);
  const identity = requireIdentity(userId, sessionId);
  if (!identity) {
    return NextResponse.json({ items: [] });
  }

  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("cart_items")
    .select(
      "*, products(id, name, slug, price, compare_at_price, stock, weight_grams, product_images(url, is_primary)), product_variants(id, stock, price_override, colors(name, hex_code), sizes(label))"
    )
    .eq(identity.column, identity.value)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

export async function POST(request: NextRequest) {
  const { userId, sessionId } = await getIdentity(request);
  const identity = requireIdentity(userId, sessionId);
  if (!identity) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 400 });
  }

  const body = await request.json();
  const { product_id, variant_id, quantity = 1, note } = body;

  if (!product_id) {
    return NextResponse.json({ error: "product_id wajib diisi" }, { status: 400 });
  }

  const db = createServiceRoleClient();

  // Cek apakah item dengan produk+variant yang sama sudah ada di cart -> tambah qty
  const { data: existing } = await db
    .from("cart_items")
    .select("id, quantity")
    .eq("product_id", product_id)
    .eq("variant_id", variant_id ?? null)
    .eq(identity.column, identity.value)
    .maybeSingle();

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
  const identity = requireIdentity(userId, sessionId);
  if (!identity) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 400 });
  }

  const body = await request.json();
  const { id, quantity, note } = body;

  if (!id) return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });

  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("cart_items")
    .update({ quantity, note })
    .eq("id", id)
    .eq(identity.column, identity.value)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(request: NextRequest) {
  const { userId, sessionId } = await getIdentity(request);
  const identity = requireIdentity(userId, sessionId);
  if (!identity) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 400 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });

  const db = createServiceRoleClient();
  const { error } = await db
    .from("cart_items")
    .delete()
    .eq("id", id)
    .eq(identity.column, identity.value);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
