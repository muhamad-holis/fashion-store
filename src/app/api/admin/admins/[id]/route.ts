import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Belum login", status: 401 as const };

  // Pakai service role supaya pengecekan role tidak tergantung RLS.
  const db = createServiceRoleClient();
  const { data: caller } = await db
    .from("admins")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!caller || caller.role !== "super_admin") {
    return { error: "Hanya super admin yang boleh mengelola admin", status: 403 as const };
  }

  return { user };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireSuperAdmin();
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const { id } = await params;
  const { role } = (await request.json()) as { role?: "admin" | "super_admin" };

  if (role !== "admin" && role !== "super_admin") {
    return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
  }

  const db = createServiceRoleClient();

  // Cegah super admin terakhir diturunkan jadi admin biasa
  if (role === "admin") {
    const { count } = await db
      .from("admins")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin");

    const { data: target } = await db.from("admins").select("role").eq("id", id).maybeSingle();

    if (target?.role === "super_admin" && (count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "Tidak bisa menurunkan satu-satunya super admin yang tersisa" },
        { status: 400 }
      );
    }
  }

  const { error } = await db.from("admins").update({ role }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireSuperAdmin();
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const { id } = await params;

  if (id === check.user.id) {
    return NextResponse.json(
      { error: "Tidak bisa menghapus akun sendiri" },
      { status: 400 }
    );
  }

  const db = createServiceRoleClient();

  const { data: target } = await db.from("admins").select("role").eq("id", id).maybeSingle();

  if (target?.role === "super_admin") {
    const { count } = await db
      .from("admins")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin");

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "Tidak bisa menghapus satu-satunya super admin yang tersisa" },
        { status: 400 }
      );
    }
  }

  // Cabut akses admin. Akun auth-nya tetap ada (tidak dihapus total)
  // supaya tidak menghapus riwayat/log yang mereferensikan user id ini.
  const { error } = await db.from("admins").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
