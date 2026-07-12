"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Wallet,
  PackageCheck,
  Truck,
  PackageOpen,
  Star,
  RotateCcw,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type OrderStatusCounts = {
  unpaid: number;
  packed: number;
  shipped: number;
  arrived: number;
  completed: number;
  cancelled: number;
};

const orderItems = [
  { key: "unpaid", label: "Perlu Dibayar", icon: Wallet, tab: "unpaid" },
  { key: "packed", label: "Dikemas", icon: PackageOpen, tab: "packed" },
  { key: "shipped", label: "Dikirim", icon: Truck, tab: "shipped" },
  { key: "arrived", label: "Diterima", icon: PackageCheck, tab: "arrived" },
  { key: "completed", label: "Untuk Diulas", icon: Star, tab: "completed" },
] as const;

export function OrderStatusGrid({
  counts,
  returnsCount = 0,
}: {
  counts: OrderStatusCounts;
  returnsCount?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="premium-card p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">Pesanan Saya</h2>
        <Link
          href="/akun/pesanan"
          className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          Lihat Semua
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {orderItems.map(({ key, label, icon: Icon, tab }) => {
          const count = counts[key as keyof OrderStatusCounts];
          return (
            <Tile key={key} href={`/akun/pesanan?status=${tab}`} icon={Icon} label={label} count={count} />
          );
        })}

        {/* Return & Refund sekarang berdiri sendiri (fitur retur sungguhan,
            bukan lagi proxy dari pesanan berstatus 'cancelled'). */}
        <Tile href="/akun/retur" icon={RotateCcw} label="Return & Refund" count={returnsCount} />
      </div>
    </motion.div>
  );
}

function Tile({
  href,
  icon: Icon,
  label,
  count,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className="ripple group flex flex-col items-center gap-2 rounded-2xl py-1 text-center transition active:scale-95"
    >
      <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-secondary/50 transition group-hover:border-foreground/30 group-hover:bg-secondary">
        <Icon className="h-5 w-5" strokeWidth={1.7} />
        {count > 0 && (
          <span
            className={cn(
              "absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background"
            )}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
      <span className="text-[10.5px] leading-tight text-muted-foreground group-hover:text-foreground">
        {label}
      </span>
    </Link>
  );
}
