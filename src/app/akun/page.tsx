import Link from "next/link";
import { PackageSearch, LogIn, UserPlus, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/account/sign-out-button";
import { formatRupiah, formatDate, ORDER_STATUS_LABEL } from "@/lib/utils";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const orders = user
    ? (
        await supabase
          .from("orders")
          .select("order_number, status, grand_total, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10)
      ).data ?? []
    : [];

  return (
    <div className="container max-w-md space-y-3 py-6">
      <h1 className="mb-1 text-lg font-semibold">Akun</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Belanja di sini tidak wajib punya akun — kamu bisa checkout langsung sebagai tamu.
        Login bersifat opsional, kalau ingin riwayat order tersimpan otomatis.
      </p>

      {user ? (
        <>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-4">
            <p className="text-sm">
              Masuk sebagai <strong>{user.email}</strong>
            </p>
            <SignOutButton />
          </div>

          <div className="pt-2">
            <h2 className="mb-2 text-sm font-semibold">Riwayat Pesanan</h2>
            {orders.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                Belum ada pesanan yang tersimpan di akun ini.
              </p>
            ) : (
              <div className="space-y-2">
                {orders.map((o) => (
                  <Link
                    key={o.order_number}
                    href={`/invoice/${o.order_number}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border p-3.5 text-sm transition hover:bg-secondary"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{o.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(o.created_at)} · {ORDER_STATUS_LABEL[o.status] ?? o.status}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="text-sm font-semibold">{formatRupiah(o.grand_total)}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
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
