import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ isAdmin: false, role: null }, { status: 200 });
  }

  const db = createServiceRoleClient();
  const { data: admin } = await db
    .from("admins")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({ isAdmin: !!admin, role: admin?.role ?? null });
}
