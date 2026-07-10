"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Copy, Upload } from "lucide-react";
import { formatRupiah, formatDate, ORDER_STATUS_LABEL } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import type { Order, StoreSettings } from "@/types/database";

export default function InvoicePage() {
  const params = useParams<{ orderNumber: string }>();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") ?? "";

  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  async function loadOrder() {
    try {
      const [{ order }, { settings }] = await Promise.all([
        phone
          ? apiFetch(`/api/orders/track?order_number=${params.orderNumber}&phone=${phone}`)
          : apiFetch(`/api/orders/mine/${params.orderNumber}`),
        apiFetch("/api/settings"),
      ]);
      setOrder(order);
      setSettings(settings);
    } catch (e: any) {
      setOrder(null);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrder();
  }, [phone]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !order?.payments?.[0]) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("payment_id", order.payments[0].id);

    try {
      const res = await fetch("/api/orders/payment-proof", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Bukti pembayaran berhasil diupload, menunggu verifikasi admin");
      loadOrder();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Disalin");
  }

  if (loading) {
    return (
      <div className="container space-y-3 py-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container py-16 text-center text-sm text-muted-foreground">
        {phone
          ? "Pesanan tidak ditemukan."
          : "Pesanan tidak ditemukan, atau silakan login untuk melihat pesanan ini."}
      </div>
    );
  }

  const payment = order.payments?.[0];
  const hasProof = payment && (payment as any).payment_proofs?.length > 0;

  return (
    <div className="container max-w-lg space-y-5 py-6">
      <div className="text-center">
        <CheckCircle2 className="mx-auto mb-2 h-10 w-10" />
        <h1 className="text-lg font-semibold">Pesanan Dibuat!</h1>
        <p className="text-sm text-muted-foreground">No. Order: {order.order_number}</p>
      </div>

      <div className="rounded-xl border border-border p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status</span>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
            {ORDER_STATUS_LABEL[order.status]}
          </span>
        </div>
        <div className="space-y-1.5 text-sm">
          {order.order_items?.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span className="text-muted-foreground">
                {item.product_name} x{item.quantity}
              </span>
              <span>{formatRupiah(item.line_total)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-border pt-1.5">
            <span className="text-muted-foreground">Ongkir ({order.courier_code?.toUpperCase()})</span>
            <span>{formatRupiah(order.shipping_cost)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
            <span>Total</span>
            <span>{formatRupiah(order.grand_total)}</span>
          </div>
        </div>
      </div>

      {order.status === "unpaid" && payment && (
        <div className="rounded-xl border border-border p-4">
          <h2 className="mb-3 text-sm font-semibold">Instruksi Pembayaran</h2>

          {payment.method === "qris" && settings?.qris_image_url && (
            <div className="mb-3 flex justify-center">
              <div className="relative h-56 w-56 overflow-hidden rounded-lg bg-white">
                <Image src={settings.qris_image_url} alt="QRIS" fill className="object-contain" />
              </div>
            </div>
          )}

          {payment.method !== "qris" && payment.channel_detail && (
            <div className="mb-3 flex items-center justify-between rounded-lg bg-secondary px-3 py-2.5 text-sm">
              <span>{payment.channel_detail}</span>
              <button onClick={() => copyText(payment.channel_detail!)}>
                <Copy className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="mb-3 flex items-center justify-between rounded-lg bg-secondary px-3 py-2.5 text-sm">
            <span>Jumlah Transfer</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{formatRupiah(payment.amount)}</span>
              <button onClick={() => copyText(String(payment.amount))}>
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!hasProof ? (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border py-4 text-sm text-muted-foreground transition hover:bg-secondary">
              <Upload className="h-4 w-4" />
              {uploading ? "Mengupload..." : "Upload Bukti Pembayaran"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Bukti pembayaran sudah diupload, menunggu verifikasi admin.
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
        Simpan nomor order <strong className="text-foreground">{order.order_number}</strong> dan
        nomor HP kamu untuk melacak status pesanan kapan saja lewat menu Lacak Pesanan.
      </div>
    </div>
  );
}
