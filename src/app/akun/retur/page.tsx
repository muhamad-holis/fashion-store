import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ReturnStatusCard } from "@/components/account/return-status-card";
import type { Return } from "@/types/database";

export const metadata = { title: "Retur & Refund" };

type ReturnWithOrder = Return & { orders: { order_number: string } | null };

export default async function MyReturnsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let returns: ReturnWithOrder[] = [];
  if (user) {
    const { data } = await supabase
      .from("returns")
      .select("*, orders(order_number)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    returns = (data as unknown as ReturnWithOrder[]) ?? [];
  }

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-30 glass">
        <div className="container flex h-14 max-w-md items-center gap-3">
          <Link href="/akun" className="rounded-full p-1.5 transition hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-semibold">Retur & Refund</h1>
        </div>
      </div>

      <div className="container max-w-md space-y-3 py-4">
        {!user ? (
          <div className="premium-card flex flex-col items-center gap-2 p-10 text-center">
            <p className="text-sm text-muted-foreground">Masuk untuk melihat riwayat retur kamu.</p>
          </div>
        ) : returns.length === 0 ? (
          <div className="premium-card flex flex-col items-center gap-2 p-10 text-center">
            <RotateCcw className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Belum ada pengajuan retur.</p>
            <p className="text-xs text-muted-foreground">
              Ajukan retur dari halaman detail pesanan yang sudah selesai.
            </p>
          </div>
        ) : (
          returns.map((ret) => (
            <div key={ret.id}>
              {ret.orders?.order_number && (
                <p className="mb-1.5 px-1 text-xs text-muted-foreground">
                  Pesanan {ret.orders.order_number}
                </p>
              )}
              <ReturnStatusCard ret={ret} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
