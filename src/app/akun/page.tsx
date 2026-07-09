import Link from "next/link";
import { PackageSearch, LogIn, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="container max-w-md space-y-3 py-6">
      <h1 className="mb-1 text-lg font-semibold">Akun</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Belanja di sini tidak wajib punya akun — kamu bisa checkout langsung sebagai tamu.
        Login bersifat opsional, hanya jika ingin riwayat order tersimpan otomatis.
      </p>

      {user ? (
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm">Masuk sebagai <strong>{user.email}</strong></p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/akun/login"
            className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-sm transition hover:bg-secondary"
          >
            <LogIn className="h-5 w-5" />
            Login
          </Link>
          <Link
            href="/akun/register"
            className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-sm transition hover:bg-secondary"
          >
            <UserPlus className="h-5 w-5" />
            Daftar
          </Link>
        </div>
      )}

      <Link
        href="/lacak"
        className="flex items-center gap-3 rounded-xl border border-border p-4 text-sm transition hover:bg-secondary"
      >
        <PackageSearch className="h-5 w-5" />
        <div>
          <p className="font-medium">Lacak Pesanan</p>
          <p className="text-xs text-muted-foreground">Tanpa perlu login</p>
        </div>
      </Link>
    </div>
  );
}
