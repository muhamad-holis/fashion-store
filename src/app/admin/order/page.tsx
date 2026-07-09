import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatRupiah, formatDate, ORDER_STATUS_LABEL } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  "unpaid",
  "waiting_verification",
  "processing",
  "packed",
  "shipped",
  "arrived",
  "completed",
  "cancelled",
];

export default async function AdminOrderListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("id, order_number, guest_name, guest_phone, grand_total, status, created_at")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data: orders } = await query.limit(100);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Order</h1>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/order"
          className={`rounded-lg border px-3 py-1.5 text-xs ${!status ? "border-foreground bg-foreground text-background" : "border-border"}`}
        >
          Semua
        </Link>
        {STATUS_OPTIONS.map((s) => (
          <Link
            key={s}
            href={`/admin/order?status=${s}`}
            className={`rounded-lg border px-3 py-1.5 text-xs ${status === s ? "border-foreground bg-foreground text-background" : "border-border"}`}
          >
            {ORDER_STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">No. Order</th>
              <th className="p-3">Pelanggan</th>
              <th className="p-3">Total</th>
              <th className="p-3">Status</th>
              <th className="p-3">Tanggal</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0">
                <td className="p-3 font-medium">{o.order_number}</td>
                <td className="p-3">
                  <p>{o.guest_name}</p>
                  <p className="text-xs text-muted-foreground">{o.guest_phone}</p>
                </td>
                <td className="p-3">{formatRupiah(o.grand_total)}</td>
                <td className="p-3">
                  <span className="rounded-full bg-secondary px-2 py-1 text-xs">{ORDER_STATUS_LABEL[o.status]}</span>
                </td>
                <td className="p-3 text-muted-foreground">{formatDate(o.created_at)}</td>
                <td className="p-3">
                  <Link href={`/admin/order/${o.id}`} className="text-xs underline">
                    Detail
                  </Link>
                </td>
              </tr>
            ))}
            {(orders ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                  Belum ada order.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
