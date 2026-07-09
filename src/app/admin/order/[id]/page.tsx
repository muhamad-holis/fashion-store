"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, formatDate, ORDER_STATUS_LABEL } from "@/lib/utils";
import type { OrderStatus } from "@/types/database";

const STATUS_FLOW: OrderStatus[] = [
  "unpaid",
  "waiting_verification",
  "processing",
  "packed",
  "shipped",
  "arrived",
  "completed",
  "cancelled",
];

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const supabase = createClient();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [tracking, setTracking] = useState("");

  async function load() {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*), payments(*, payment_proofs(*))")
      .eq("id", params.id)
      .maybeSingle();
    setOrder(data);
    setStatus(data?.status ?? "");
    setTracking(data?.tracking_number ?? "");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [params.id]);

  async function handleSave() {
    if (!status) {
      toast.error("Status tidak valid");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("orders")
      .update({ status, tracking_number: tracking || null })
      .eq("id", params.id);

    if (!error && tracking && status === "shipped") {
      await supabase.from("shipping_logs").insert({
        order_id: params.id,
        status: "shipped",
        description: `Nomor resi: ${tracking}`,
      });
    }

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Order diperbarui");
    load();
  }

  if (loading) return <div className="skeleton h-64 w-full rounded-xl" />;
  if (!order) return <p className="text-sm text-muted-foreground">Order tidak ditemukan.</p>;

  const payment = order.payments?.[0];

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Order {order.order_number}</h1>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs"
        >
          <Printer className="h-3.5 w-3.5" />
          Cetak Invoice
        </button>
      </div>

      <div className="rounded-xl border border-border p-4">
        <h2 className="mb-2 text-sm font-semibold">Info Pelanggan</h2>
        <p className="text-sm">{order.guest_name} · {order.guest_phone}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {order.shipping_address?.full_address}, {order.shipping_address?.subdistrict}, {order.shipping_address?.district},{" "}
          {order.shipping_address?.city}, {order.shipping_address?.province} {order.shipping_address?.postal_code}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Dipesan {formatDate(order.created_at)}</p>
      </div>

      <div className="rounded-xl border border-border p-4">
        <h2 className="mb-2 text-sm font-semibold">Item Pesanan</h2>
        <div className="space-y-1.5 text-sm">
          {order.order_items.map((item: any) => (
            <div key={item.id} className="flex justify-between">
              <span>
                {item.product_name} {item.color_name && `(${item.color_name}${item.size_label ? ", " + item.size_label : ""})`} x{item.quantity}
              </span>
              <span>{formatRupiah(item.line_total)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-border pt-1.5 text-muted-foreground">
            <span>Ongkir ({order.courier_code?.toUpperCase()} {order.courier_service})</span>
            <span>{formatRupiah(order.shipping_cost)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
            <span>Grand Total</span>
            <span>{formatRupiah(order.grand_total)}</span>
          </div>
        </div>
        {order.buyer_note && (
          <p className="mt-2 rounded-lg bg-secondary/50 p-2 text-xs text-muted-foreground">
            Catatan: {order.buyer_note}
          </p>
        )}
      </div>

      {payment && (
        <div className="rounded-xl border border-border p-4">
          <h2 className="mb-2 text-sm font-semibold">Pembayaran</h2>
          <p className="text-sm">
            {payment.method.toUpperCase()} · {payment.channel_detail} · {formatRupiah(payment.amount)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Status: {payment.status}</p>
          {payment.payment_proofs?.length > 0 && (
            <div className="relative mt-2 h-40 w-40 overflow-hidden rounded-lg border border-border">
              <Image src={payment.payment_proofs[0].image_url} alt="Bukti bayar" fill className="object-cover" />
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold">Update Status Pesanan</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)} className="input">
              {STATUS_FLOW.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Nomor Resi</label>
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} className="input" placeholder="Opsional" />
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-3 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </div>
  );
}
