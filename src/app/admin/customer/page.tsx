import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminCustomerPage() {
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Customer</h1>
      <p className="text-sm text-muted-foreground">
        Menampilkan pelanggan yang memiliki akun terdaftar. Sebagian besar transaksi berasal dari
        checkout tamu (guest) dan datanya bisa dilihat langsung di halaman Order.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Nama</th>
              <th className="p-3">No. HP</th>
              <th className="p-3">Terdaftar</th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="p-3">{p.full_name || "-"}</td>
                <td className="p-3">{p.phone || "-"}</td>
                <td className="p-3 text-muted-foreground">{formatDate(p.created_at)}</td>
              </tr>
            ))}
            {(profiles ?? []).length === 0 && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-sm text-muted-foreground">
                  Belum ada customer yang mendaftar akun.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
