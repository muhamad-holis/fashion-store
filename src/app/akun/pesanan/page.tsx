import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, PackageX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatRupiah, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/account/status-badge";
import { OrderCardActions } from "@/components/account/order-card-actions";
import { Reveal } from "@/components/account/reveal";
import type { OrderItem, OrderStatus } from "@/types/database";

type OrderRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  grand_total: number;
  created_at: string;
  order_items: OrderItem[];
};

export const metadata = { title: "Pesanan Saya" };

const TABS: { key: string; label: string; statuses: OrderStatus[] | null }[] = [
  { key: "semua", label: "Semua", statuses: null },
  { key: "unpaid", label: "Perlu Dibayar", statuses: ["unpaid", "waiting_verification"] },
  { key: "packed", label: "Dikemas", statuses: ["processing", "packed"] },
  { key: "shipped", label: "Dikirim", statuses: ["shipped"] },
  { key: "arrived", label: "Diterima", statuses: ["arrived"] },
  { key: "completed", label: "Diulas", statuses: ["completed"] },
  { key: "cancelled", label: "Batal", statuses: ["cancelled"] },
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeTab = TABS.find((t) => t.key === status) ?? TABS[0];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let orders: OrderRow[] = [];
  if (user) {
    let query = supabase
      .from("orders")
      .select("id, order_number, status, grand_total, created_at, order_items(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (activeTab.statuses) query = query.in("status", activeTab.statuses);

    const { data } = await query;
    orders = (data ?? []) as unknown as OrderRow[];
  }

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-30 glass">
        <div className="container flex h-14 max-w-md items-center gap-3">
          <Link href="/akun" className="rounded-full p-1.5 transition hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-semibold">Pesanan Saya</h1>
        </div>
        <div className="container max-w-md pb-2">
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {TABS.map((tab) => (
              <Link
                key={tab.key}
                href={tab.key === "semua" ? "/akun/pesanan" : `/akun/pesanan?status=${tab.key}`}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                  activeTab.key === tab.key
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="container max-w-md space-y-3 py-4">
        {!user ? (
          <div className="premium-card flex flex-col items-center gap-2 p-10 text-center">
            <PackageX className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Masuk untuk melihat riwayat pesanan kamu.
            </p>
            <Link
              href="/akun/login"
              className="mt-2 rounded-full bg-foreground px-5 py-2 text-xs font-semibold text-background"
            >
              Masuk Sekarang
            </Link>
          </div>
        ) : orders.length === 0 ? (
          <div className="premium-card flex flex-col items-center gap-2 p-10 text-center">
            <PackageX className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Belum ada pesanan di kategori ini.</p>
          </div>
        ) : (
          orders.map((order, i) => (
            <Reveal key={order.id} delay={Math.min(i * 0.04, 0.2)}>
              <div className="premium-card p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{order.order_number}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDate(order.created_at)}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                <div className="space-y-2.5 border-t border-border pt-3">
                  {order.order_items?.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-secondary">
                        {item.product_image ? (
                          <Image
                            src={item.product_image}
                            alt={item.product_name}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{item.product_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {[item.color_name, item.size_label].filter(Boolean).join(", ")}
                          {item.color_name || item.size_label ? " · " : ""}x{item.quantity}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-medium">
                        {formatRupiah(item.line_total)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                  <span className="text-muted-foreground">Total Pesanan</span>
                  <span className="font-semibold">{formatRupiah(order.grand_total)}</span>
                </div>

                <OrderCardActions orderNumber={order.order_number} status={order.status} />
              </div>
            </Reveal>
          ))
        )}
      </div>
    </div>
  );
}
