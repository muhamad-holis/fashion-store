"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSignedPaymentProofUrl } from "@/lib/storage";
import { PaymentProofLightbox } from "@/components/admin/payment-proof-lightbox";
import { formatRupiah, formatDate } from "@/lib/utils";

export default function AdminPaymentPage() {
  const supabase = createClient();
  const [payments, setPayments] = useState<any[]>([]);
  const [codPayments, setCodPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("payments")
      .select("*, payment_proofs(*), orders(id, order_number, guest_name, guest_phone, status)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    const list = data ?? [];

    // COD tidak butuh verifikasi bukti transfer - dipisah ke daftar
    // tersendiri yang cukup ditandai manual "Cash Diterima" oleh admin
    // setelah uang benar-benar diterima (lihat migrations/0016).
    const transferList = list.filter((p: any) => p.method !== "cod");
    const codList = list.filter((p: any) => p.method === "cod");

    // BUG FIX: bucket payment-proof privat, jadi image_url yang tersimpan
    // (public URL) tidak akan pernah bisa diakses langsung - selalu gagal
    // dimuat. Perlu dikonversi ke signed URL dulu (lihat lib/storage.ts).
    await Promise.all(
      transferList.map(async (p: any) => {
        const proof = p.payment_proofs?.[0];
        if (proof?.image_url) {
          proof.signed_url = await getSignedPaymentProofUrl(supabase, proof.image_url);
        }
      })
    );

    setPayments(transferList);
    setCodPayments(codList);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function verify(paymentId: string, orderId: string, approve: boolean) {
    setProcessingId(paymentId);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: paymentError } = await supabase
      .from("payments")
      .update({
        status: approve ? "approved" : "rejected",
        verified_by: user?.id,
        verified_at: new Date().toISOString(),
      })
      .eq("id", paymentId);

    const { error: orderError } = await supabase
      .from("orders")
      .update({ status: approve ? "processing" : "cancelled" })
      .eq("id", orderId);

    setProcessingId(null);

    if (paymentError || orderError) {
      toast.error(paymentError?.message || orderError?.message);
      return;
    }

    toast.success(approve ? "Pembayaran diverifikasi, order diproses" : "Pembayaran ditolak, order dibatalkan");
    load();
  }

  // Order COD sudah otomatis berstatus "processing" sejak dibuat (tidak ada
  // bukti transfer yang perlu diverifikasi). Tombol ini HANYA menandai
  // payment.status jadi "approved" untuk keperluan pembukuan - setelah
  // admin benar-benar menerima cash dari kurir/toko. Status order TIDAK
  // diubah karena sudah berjalan (diproses/dikemas/dikirim dst).
  async function markCodReceived(paymentId: string) {
    setProcessingId(paymentId);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("payments")
      .update({
        status: "approved",
        verified_by: user?.id,
        verified_at: new Date().toISOString(),
      })
      .eq("id", paymentId);

    setProcessingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Cash COD ditandai sudah diterima");
    load();
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-lg font-semibold">Verifikasi Pembayaran</h1>
        <p className="text-sm text-muted-foreground">
          Menampilkan pembayaran berstatus "pending" yang menunggu diverifikasi.
        </p>

        {loading ? (
          <div className="skeleton h-40 w-full rounded-xl" />
        ) : payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada pembayaran yang menunggu verifikasi.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {payments.map((p) => (
              <div key={p.id} className="rounded-xl border border-border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <Link href={`/admin/order/${p.orders.id}`} className="text-sm font-medium underline">
                    {p.orders.order_number}
                  </Link>
                  <span className="text-xs text-muted-foreground">{formatDate(p.created_at)}</span>
                </div>
                <p className="text-sm">{p.orders.guest_name} · {p.orders.guest_phone}</p>
                <p className="mt-1 text-sm">
                  {p.method.toUpperCase()} · {p.channel_detail} · <strong>{formatRupiah(p.amount)}</strong>
                </p>

                {p.payment_proofs?.length > 0 ? (
                  p.payment_proofs[0].signed_url ? (
                    <PaymentProofLightbox
                      src={p.payment_proofs[0].signed_url}
                      wrapperClassName="relative mt-2 h-48 w-full overflow-hidden rounded-lg border border-border"
                    >
                      <Image src={p.payment_proofs[0].signed_url} alt="Bukti bayar" fill className="object-contain" />
                    </PaymentProofLightbox>
                  ) : (
                    <p className="mt-2 text-xs text-destructive">Gagal memuat bukti bayar, coba muat ulang halaman.</p>
                  )
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">Belum ada bukti bayar diupload.</p>
                )}

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => verify(p.id, p.orders.id, true)}
                    disabled={processingId === p.id}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-foreground py-2 text-sm font-medium text-background disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    Terima
                  </button>
                  <button
                    onClick={() => verify(p.id, p.orders.id, false)}
                    disabled={processingId === p.id}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-destructive py-2 text-sm font-medium text-destructive disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    Tolak
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">COD - Menunggu Konfirmasi Cash</h2>
          <p className="text-sm text-muted-foreground">
            Order COD sudah otomatis diproses. Tandai di sini setelah cash benar-benar diterima dari
            kurir/toko - tidak perlu cek bukti bayar.
          </p>
        </div>

        {loading ? (
          <div className="skeleton h-32 w-full rounded-xl" />
        ) : codPayments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada COD yang menunggu konfirmasi cash.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {codPayments.map((p) => (
              <div key={p.id} className="rounded-xl border border-border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <Link href={`/admin/order/${p.orders.id}`} className="text-sm font-medium underline">
                    {p.orders.order_number}
                  </Link>
                  <span className="text-xs text-muted-foreground">{formatDate(p.created_at)}</span>
                </div>
                <p className="text-sm">{p.orders.guest_name} · {p.orders.guest_phone}</p>
                <p className="mt-1 text-sm">
                  COD · <strong>{formatRupiah(p.amount)}</strong>
                </p>
                <button
                  onClick={() => markCodReceived(p.id)}
                  disabled={processingId === p.id}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-foreground py-2 text-sm font-medium text-background disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Tandai Cash Diterima
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
