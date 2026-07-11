"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ticket, Copy, Check } from "lucide-react";
import { formatRupiah, formatDate } from "@/lib/utils";
import type { Coupon } from "@/types/database";

export function VoucherList({ coupons }: { coupons: Coupon[] }) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  async function handleCopy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Kode "${code}" disalin`);
      setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 2000);
    } catch {
      toast.error("Gagal menyalin kode");
    }
  }

  if (coupons.length === 0) {
    return (
      <div className="premium-card flex flex-col items-center gap-2 p-10 text-center">
        <Ticket className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Belum ada voucher aktif saat ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {coupons.map((c) => {
        const soldOut = c.usage_limit != null && c.used_count >= c.usage_limit;
        const discountLabel =
          c.discount_type === "percent"
            ? `${c.discount_value}% OFF`
            : `${formatRupiah(c.discount_value)} OFF`;

        return (
          <div
            key={c.id}
            className={`premium-card relative overflow-hidden p-4 ${soldOut ? "opacity-50" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-secondary/50">
                  <Ticket className="h-5 w-5" strokeWidth={1.7} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{discountLabel}</p>
                  {c.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{c.description}</p>
                  )}
                  <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                    {c.min_purchase ? <p>Min. belanja {formatRupiah(c.min_purchase)}</p> : null}
                    {c.discount_type === "percent" && c.max_discount ? (
                      <p>Maks. potongan {formatRupiah(c.max_discount)}</p>
                    ) : null}
                    {c.valid_until ? <p>Berlaku sampai {formatDate(c.valid_until)}</p> : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-dashed border-border px-3 py-2">
              <span className="font-mono text-sm font-semibold tracking-wide">{c.code}</span>
              <button
                onClick={() => handleCopy(c.code)}
                disabled={soldOut}
                className="ripple flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-[11px] font-semibold text-background transition active:scale-95 disabled:opacity-60"
              >
                {copiedCode === c.code ? (
                  <>
                    <Check className="h-3 w-3" /> Disalin
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> {soldOut ? "Kuota Habis" : "Salin Kode"}
                  </>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
