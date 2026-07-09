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

export async function GET() {
  const check = await requireSuperAdmin();
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("admins")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ admins: data, myId: check.user.id });
}

export async function POST(request: NextRequest) {
  const check = await requireSuperAdmin();
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const body = await request.json();
  const { full_name, email, password, role } = body as {
    full_name?: string;
    email?: string;
    password?: string;
    role?: "admin" | "super_admin";
  };

  if (!full_name || !email || !password) {
    return NextResponse.json(
      { error: "Nama, email, dan password wajib diisi" },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
  }
  if (role && role !== "admin" && role !== "super_admin") {
    return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
  }

  const db = createServiceRoleClient();

  const { data: created, error: createError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message || "Gagal membuat akun" },
      { status: 400 }
    );
  }

  const { error: insertError } = await db.from("admins").insert({
    id: created.user.id,
    full_name,
    email,
    role: role || "admin",
  });

  if (insertError) {
    // Rollback: hapus auth user supaya tidak jadi akun "gantung"
    await db.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
