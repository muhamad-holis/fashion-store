import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

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
  if (!userId && !sessionId) return NextResponse.json({ items: [] });

  const db = createServiceRoleClient();
  let query = db
    .from("wishlist_items")
    .select("*, products(id, name, slug, price, compare_at_price, rating_avg, sold_count, discount_percent, product_images(url, is_primary))")
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
  const { product_id } = await request.json();
  const db = createServiceRoleClient();

  let existingQuery = db.from("wishlist_items").select("id").eq("product_id", product_id);
  existingQuery = userId ? existingQuery.eq("user_id", userId) : existingQuery.eq("session_id", sessionId);
  const { data: existing } = await existingQuery.maybeSingle();

  if (existing) {
    await db.from("wishlist_items").delete().eq("id", existing.id);
    return NextResponse.json({ wishlisted: false });
  }

  const { error } = await db.from("wishlist_items").insert({
    product_id,
    user_id: userId,
    session_id: userId ? null : sessionId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ wishlisted: true });
}

export async function DELETE(request: NextRequest) {
  const { userId, sessionId } = await getIdentity(request);
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });

  const db = createServiceRoleClient();
  let query = db.from("wishlist_items").delete().eq("id", id);
  query = userId ? query.eq("user_id", userId) : query.eq("session_id", sessionId);
  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
