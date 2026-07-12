"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatRupiah } from "@/lib/utils";
import type { Return, ReturnReason, ReturnStatus } from "@/types/database";

type ReturnRow = Return & {
  orders: { order_number: string; grand_total: number } | null;
  order_items: { product_name: string } | null;
};

const REASON_LABEL: Record<ReturnReason, string> = {
  wrong_item: "Barang salah kirim",
  damaged: "Barang rusak/cacat",
  not_as_described: "Tidak sesuai deskripsi",
  wrong_size: "Ukuran tidak sesuai",
  changed_mind: "Berubah pikiran",
  other: "Lainnya",
};

const STATUS_COLOR: Record<ReturnStatus, string> = {
  pending: "bg-orange-500/15 text-orange-500",
  approved: "bg-blue-500/15 text-blue-500",
  rejected: "bg-red-500/15 text-red-500",
  refunded: "bg-emerald-500/15 text-emerald-500",
};

export default function AdminReturPage() {
  const supabase = createClient();
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [refundDrafts, setRefundDrafts] = useState<Record<string, string>>({});

  async function load() {
    const { data } = await supabase
      .from("returns")
      .select("*, orders(order_number, grand_total), order_items(product_name)")
      .order("created_at", { ascending: false });
    setReturns((data as unknown as ReturnRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(ret: ReturnRow, status: ReturnStatus) {
    const payload: Partial<Return> = { status };
    if (status === "rejected" && noteDrafts[ret.id]?.trim()) {
      payload.admin_note = noteDrafts[ret.id].trim();
    }
    if (status === "refunded") {
      payload.refund_amount = Number(refundDrafts[ret.id] ?? ret.orders?.grand_total ?? 0);
    }

    const { error } = await supabase.from("returns").update(payload).eq("id", ret.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Status retur diperbarui");
    load();
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-lg font-semibold">Retur & Refund</h1>

      {loading ? (
        <div className="skeleton h-40 w-full rounded-xl" />
      ) : returns.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border p-10 text-center">
          <RotateCcw className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Belum ada pengajuan retur.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {returns.map((ret) => (
            <div key={ret.id} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{ret.orders?.order_number ?? "-"}</p>
                  {ret.order_items?.product_name && (
                    <p className="text-xs text-muted-foreground">{ret.order_items.product_name}</p>
                  )}
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[ret.status]}`}>
                  {ret.status}
                </span>
              </div>

              <div className="mt-2 space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Alasan: </span>
                  {REASON_LABEL[ret.reason]}
                </p>
                {ret.description && <p className="text-muted-foreground">{ret.description}</p>}
                <p className="text-xs text-muted-foreground">{formatDate(ret.created_at)}</p>
              </div>

              {ret.images.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {ret.images.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={url} alt="" className="h-16 w-16 rounded-lg border border-border object-cover" />
                  ))}
                </div>
              )}

              {ret.status === "pending" && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  <input
                    value={noteDrafts[ret.id] ?? ""}
                    onChange={(e) => setNoteDrafts({ ...noteDrafts, [ret.id]: e.target.value })}
                    placeholder="Catatan (wajib diisi kalau menolak)"
                    className="input"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => updateStatus(ret, "approved")}
                      className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background"
                    >
                      Setujui
                    </button>
                    <button
                      onClick={() => updateStatus(ret, "rejected")}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-destructive"
                    >
                      Tolak
                    </button>
                  </div>
                </div>
              )}

              {ret.status === "approved" && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <input
                    type="number"
                    value={refundDrafts[ret.id] ?? String(ret.orders?.grand_total ?? "")}
                    onChange={(e) => setRefundDrafts({ ...refundDrafts, [ret.id]: e.target.value })}
                    placeholder="Nominal refund"
                    className="input max-w-[180px]"
                  />
                  <button
                    onClick={() => updateStatus(ret, "refunded")}
                    className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background"
                  >
                    Tandai Sudah Refund
                  </button>
                </div>
              )}

              {ret.status === "rejected" && ret.admin_note && (
                <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                  Catatan: {ret.admin_note}
                </p>
              )}
              {ret.status === "refunded" && ret.refund_amount != null && (
                <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                  Direfund: {formatRupiah(ret.refund_amount)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
