"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { OrderStatus } from "@/types/database";

export function OrderCardActions({
  orderNumber,
  status,
}: {
  orderNumber: string;
  status: OrderStatus;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [confirming, setConfirming] = useState(false);

  function notBuiltYet(label: string) {
    toast("Fitur ini akan segera hadir", { description: `${label} sedang kami siapkan.` });
  }

  async function handleConfirmReceived() {
    setConfirming(true);
    // RLS "user confirm own arrived order" hanya mengizinkan transisi
    // arrived -> completed milik user ini sendiri, jadi aman dipanggil
    // langsung dari client tanpa API route tambahan.
    const { error } = await supabase
      .from("orders")
      .update({ status: "completed" })
      .eq("order_number", orderNumber);

    setConfirming(false);

    if (error) {
      toast.error(error.message || "Gagal mengonfirmasi pesanan");
      return;
    }

    toast.success("Pesanan dikonfirmasi diterima. Terima kasih!");
    router.refresh();
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
          onClick={handleConfirmReceived}
          disabled={confirming}
          className="ripple flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition active:scale-95 disabled:opacity-60"
        >
          {confirming && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {confirming ? "Memproses..." : "Pesanan Diterima"}
        </button>
      )}

      {status === "completed" && (
        <Link
          href={`/akun/pesanan/${orderNumber}/ulasan`}
          className="ripple rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition active:scale-95"
        >
          Beri Ulasan
        </Link>
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
