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

// Lihat penjelasan lengkap di src/app/api/cart/route.ts - helper ini
// memastikan filter kepemilikan (user_id / session_id) selalu divalidasi
// dan tidak pernah mengirim nilai null ke query .eq().
function requireIdentity(userId: string | null, sessionId: string | null) {
  if (!userId && !sessionId) {
    return null;
  }
  return userId ? { column: "user_id" as const, value: userId } : { column: "session_id" as const, value: sessionId as string };
}

export async function GET(request: NextRequest) {
  const { userId, sessionId } = await getIdentity(request);
  const identity = requireIdentity(userId, sessionId);
  if (!identity) return NextResponse.json({ items: [] });

  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("wishlist_items")
    .select(
      "*, products(id, name, slug, price, compare_at_price, rating_avg, sold_count, discount_percent, product_images(url, is_primary))"
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
  const { product_id } = await request.json();
  const db = createServiceRoleClient();

  const { data: existing } = await db
    .from("wishlist_items")
    .select("id")
    .eq("product_id", product_id)
    .eq(identity.column, identity.value)
    .maybeSingle();

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
  const identity = requireIdentity(userId, sessionId);
  if (!identity) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 400 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });

  const db = createServiceRoleClient();
  const { error } = await db
    .from("wishlist_items")
    .delete()
    .eq("id", id)
    .eq(identity.column, identity.value);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
