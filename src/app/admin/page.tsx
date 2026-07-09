import { createClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/utils";
import { DashboardChart } from "@/components/admin/dashboard-chart";
import { Package, ShoppingCart, Users, Wallet, Clock, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

async function getStats() {
  const supabase = await createClient();

  const [
    { count: productCount },
    { count: orderCount },
    { count: pendingCount },
    { count: completedCount },
    { data: orders },
    { data: topProducts },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["unpaid", "waiting_verification", "processing", "packed"]),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase
      .from("orders")
      .select("grand_total, created_at, status")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("products")
      .select("name, sold_count")
      .order("sold_count", { ascending: false })
      .limit(5),
  ]);

  const totalRevenue = (orders ?? [])
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + Number(o.grand_total), 0);

  // Kelompokkan penjualan 7 hari terakhir untuk grafik
  const salesByDay: Record<string, number> = {};
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
    salesByDay[key] = 0;
  }
  (orders ?? []).forEach((o) => {
    const d = new Date(o.created_at);
    const key = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
    if (key in salesByDay) salesByDay[key] += Number(o.grand_total);
  });

  return {
    productCount: productCount ?? 0,
    orderCount: orderCount ?? 0,
    pendingCount: pendingCount ?? 0,
    completedCount: completedCount ?? 0,
    totalRevenue,
    chartData: Object.entries(salesByDay).map(([date, total]) => ({ date, total })),
    topProducts: topProducts ?? [],
  };
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const cards = [
    { label: "Total Pendapatan", value: formatRupiah(stats.totalRevenue), icon: Wallet },
    { label: "Total Order", value: stats.orderCount, icon: ShoppingCart },
    { label: "Order Pending", value: stats.pendingCount, icon: Clock },
    { label: "Order Selesai", value: stats.completedCount, icon: CheckCircle2 },
    { label: "Total Produk", value: stats.productCount, icon: Package },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border p-4">
            <Icon className="mb-2 h-5 w-5 text-muted-foreground" />
            <p className="text-lg font-semibold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-border p-4">
          <h2 className="mb-3 text-sm font-semibold">Grafik Penjualan (7 Hari Terakhir)</h2>
          <DashboardChart data={stats.chartData} />
        </div>

        <div className="rounded-xl border border-border p-4">
          <h2 className="mb-3 text-sm font-semibold">Produk Terlaris</h2>
          <div className="space-y-2">
            {stats.topProducts.length === 0 && (
              <p className="text-sm text-muted-foreground">Belum ada data penjualan.</p>
            )}
            {stats.topProducts.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="line-clamp-1">{p.name}</span>
                <span className="text-muted-foreground">{p.sold_count} terjual</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
