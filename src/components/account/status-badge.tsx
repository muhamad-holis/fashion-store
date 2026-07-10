import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/database";

export const ORDER_STATUS_LABEL_ID: Record<OrderStatus, string> = {
  unpaid: "Perlu Dibayar",
  waiting_verification: "Menunggu Verifikasi",
  processing: "Diproses",
  packed: "Dikemas",
  shipped: "Dikirim",
  arrived: "Diterima",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

// Sesuai spesifikasi: Perlu Dibayar = Orange, Dikemas = Biru, Dikirim = Ungu,
// Diterima = Hijau, Diulas/Selesai = Kuning, Return/Batal = Merah.
export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  unpaid: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  waiting_verification: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  processing: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  packed: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  shipped: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  arrived: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  completed: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/25",
};

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none",
        ORDER_STATUS_COLOR[status],
        className
      )}
    >
      {ORDER_STATUS_LABEL_ID[status]}
    </span>
  );
}
