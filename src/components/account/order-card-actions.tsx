"use client";

import Link from "next/link";
import { toast } from "sonner";
import type { OrderStatus } from "@/types/database";

export function OrderCardActions({
  orderNumber,
  status,
}: {
  orderNumber: string;
  status: OrderStatus;
}) {
  function notBuiltYet(label: string) {
    toast("Fitur ini akan segera hadir", { description: `${label} sedang kami siapkan.` });
  }

  return (
    <div className="flex flex-wrap justify-end gap-2 pt-3">
      <Link
        href={`/invoice/${orderNumber}`}
        className="ripple rounded-full border border-border px-4 py-2 text-xs font-medium transition hover:bg-secondary"
      >
        Butuh Bantuan
      </Link>

      {status === "unpaid" && (
        <Link
          href={`/pembayaran?order=${orderNumber}`}
          className="ripple rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition active:scale-95"
        >
          Bayar Sekarang
        </Link>
      )}

      {(status === "processing" || status === "packed" || status === "shipped") && (
        <Link
          href={`/invoice/${orderNumber}`}
          className="ripple rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition active:scale-95"
        >
          Lacak Pesanan
        </Link>
      )}

      {status === "arrived" && (
        <button
          onClick={() => notBuiltYet("Konfirmasi Terima")}
          className="ripple rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition active:scale-95"
        >
          Pesanan Diterima
        </button>
      )}

      {status === "completed" && (
        <button
          onClick={() => notBuiltYet("Beri Ulasan")}
          className="ripple rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition active:scale-95"
        >
          Beri Ulasan
        </button>
      )}

      {status === "cancelled" && (
        <button
          onClick={() => notBuiltYet("Ajukan Retur")}
          className="ripple rounded-full border border-border px-4 py-2 text-xs font-medium transition hover:bg-secondary"
        >
          Ajukan Retur
        </button>
      )}
    </div>
  );
}
