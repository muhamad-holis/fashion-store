"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Copy, Landmark, QrCode, Wallet } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatRupiah } from "@/lib/utils";
import type { Order, StoreSettings } from "@/types/database";
import { getBankMeta, getEwalletMeta } from "./brand-meta";
import { PaymentGuide } from "./payment-guide";
import { VerificationStatus, type VerificationStep } from "./verification-status";
import { UploadProof } from "./upload-proof";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.05, ease: "easeOut" as const },
  }),
};

function SectionSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-40 w-full animate-pulse rounded-[20px] bg-[#151515]" />
      ))}
    </div>
  );
}

// useSearchParams() mewajibkan boundary <Suspense> di sekelilingnya supaya
// Next.js tidak gagal saat prerender halaman statis ini (build error:
// "useSearchParams() should be wrapped in a suspense boundary").
export default function MetodePembayaranPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-[#0B0B0B] px-4 py-6 text-white">
          <SectionSkeleton />
        </div>
      }
    >
      <MetodePembayaranContent />
    </Suspense>
  );
}

function MetodePembayaranContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order");
  const phone = searchParams.get("phone") ?? "";

  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [selectedEwallet, setSelectedEwallet] = useState<string | null>(null);

  async function load() {
    try {
      const requests: Promise<any>[] = [apiFetch("/api/settings")];
      if (orderNumber) {
        requests.push(
          phone
            ? apiFetch(`/api/orders/track?order_number=${orderNumber}&phone=${phone}`)
            : apiFetch(`/api/orders/mine/${orderNumber}`)
        );
      }
      const [settingsRes, orderRes] = await Promise.all(requests);
      setSettings(settingsRes.settings);
      if (orderRes) setOrder(orderRes.order);
    } catch (e: any) {
      if (orderNumber) toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeBanks = useMemo(
    () => (settings?.bank_accounts ?? []).filter((b) => b.is_active !== false && b.bank),
    [settings]
  );
  const activeEwallets = useMemo(
    () => (settings?.ewallet_accounts ?? []).filter((e) => e.is_active !== false && e.provider),
    [settings]
  );

  const payment = order?.payments?.[0] as any;
  const hasProof = payment && payment.payment_proofs?.length > 0;

  const verificationStep: VerificationStep = useMemo(() => {
    if (!payment) return "belum_upload";
    if (payment.status === "rejected") return "ditolak";
    if (payment.status === "approved") return "diverifikasi";
    if (hasProof || payment.status === "pending") return "menunggu";
    return "belum_upload";
  }, [payment, hasProof]);

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} berhasil disalin`);
  }

  function handleFinish() {
    if (orderNumber) {
      router.push(`/invoice/${orderNumber}${phone ? `?phone=${phone}` : ""}`);
    } else {
      router.push("/checkout");
    }
  }

  return (
    <div className="min-h-dvh bg-[#0B0B0B] pb-28 text-white">
      {/* HEADER */}
      <div className="sticky top-0 z-30 border-b border-[#262626] bg-[#0B0B0B]/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#262626] bg-[#151515] transition hover:bg-white/10"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-base font-semibold leading-tight">Metode Pembayaran</h1>
            <p className="text-xs leading-snug text-white/45">
              Pilih metode pembayaran yang ingin digunakan saat checkout.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-5 px-4 py-5">
        {loading ? (
          <SectionSkeleton />
        ) : (
          <>
            {order && (
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className="rounded-[20px] border border-[#262626] bg-[#151515] p-4"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50">No. Order</span>
                  <span className="font-medium">{order.order_number}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-sm">
                  <span className="text-white/50">Total Tagihan</span>
                  <span className="font-semibold">{formatRupiah(order.grand_total)}</span>
                </div>
              </motion.div>
            )}

            {/* SECTION KHUSUS COD - order COD tidak butuh instruksi
                transfer/QRIS ataupun upload bukti pembayaran sama sekali. */}
            {payment?.method === "cod" ? (
              <motion.section
                variants={fadeUp}
                custom={1}
                initial="hidden"
                animate="show"
                className="rounded-[20px] border border-[#262626] bg-[#151515] p-5"
              >
                <h2 className="text-sm font-semibold">Pembayaran COD (Bayar di Tempat)</h2>
                <p className="mt-1 text-xs text-white/45">
                  Pesanan ini dibayar cash langsung saat barang tiba, tidak perlu transfer.
                </p>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5 text-sm">
                  <span className="text-white/50">Siapkan Uang Cash</span>
                  <span className="font-semibold">{formatRupiah(payment.amount)}</span>
                </div>
              </motion.section>
            ) : (
              <>
                {/* SECTION 1: TRANSFER BANK */}
                <motion.section variants={fadeUp} custom={1} initial="hidden" animate="show" className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Landmark className="h-4 w-4 text-white/50" />
                <h2 className="text-xs font-semibold tracking-wide text-white/50">TRANSFER BANK</h2>
              </div>

              {activeBanks.length === 0 ? (
                <div className="rounded-[20px] border border-[#262626] bg-[#151515] p-5 text-center text-sm text-white/40">
                  Belum ada rekening bank yang tersedia.
                </div>
              ) : (
                <div className="space-y-3">
                  {activeBanks.map((b, idx) => {
                    const meta = getBankMeta(b.bank, b.logo_url);
                    const key = `${b.bank}-${b.account_number}`;
                    const active = selectedBank === key;
                    return (
                      <div
                        key={idx}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedBank(key)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") setSelectedBank(key);
                        }}
                        className={`w-full cursor-pointer rounded-[20px] border p-4 text-left transition-colors ${
                          active ? "border-white bg-[#1c1c1c]" : "border-[#262626] bg-[#151515]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                              active ? "border-white" : "border-[#3a3a3a]"
                            }`}
                          >
                            {active && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
                          </span>

                          {meta.logoUrl ? (
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white">
                              <Image src={meta.logoUrl} alt={b.bank} fill className="object-contain p-1" />
                            </div>
                          ) : (
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold"
                              style={{ backgroundColor: meta.bg, color: meta.fg }}
                            >
                              {meta.initials}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{b.bank}</p>
                            <p className="mt-0.5 text-sm tracking-wide text-white/70">{b.account_number}</p>
                            <p className="text-xs text-white/40">
                              Atas Nama: <span className="text-white/60">{b.account_name || "EMYU FASHION STORE"}</span>
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyText(b.account_number, "Nomor rekening");
                            }}
                            className="shrink-0 rounded-full border border-[#262626] p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                            aria-label="Salin nomor rekening"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyText(b.account_number, "Nomor rekening");
                          }}
                          className="mt-3 w-full rounded-xl bg-white/5 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10"
                        >
                          Salin Nomor Rekening
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.section>

            {/* SECTION 2: E-WALLET */}
            <motion.section variants={fadeUp} custom={2} initial="hidden" animate="show" className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Wallet className="h-4 w-4 text-white/50" />
                <h2 className="text-xs font-semibold tracking-wide text-white/50">E-WALLET</h2>
              </div>

              {activeEwallets.length === 0 ? (
                <div className="rounded-[20px] border border-[#262626] bg-[#151515] p-5 text-center text-sm text-white/40">
                  Belum ada e-wallet yang tersedia.
                </div>
              ) : (
                <div className="space-y-3">
                  {activeEwallets.map((e, idx) => {
                    const meta = getEwalletMeta(e.provider, e.logo_url);
                    const key = `${e.provider}-${e.number}`;
                    const active = selectedEwallet === key;
                    return (
                      <div
                        key={idx}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedEwallet(key)}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter" || ev.key === " ") setSelectedEwallet(key);
                        }}
                        className={`w-full cursor-pointer rounded-[20px] border p-4 text-left transition-colors ${
                          active ? "border-white bg-[#1c1c1c]" : "border-[#262626] bg-[#151515]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                              active ? "border-white" : "border-[#3a3a3a]"
                            }`}
                          >
                            {active && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
                          </span>

                          {meta.logoUrl ? (
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white">
                              <Image src={meta.logoUrl} alt={e.provider} fill className="object-contain p-1" />
                            </div>
                          ) : (
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold"
                              style={{ backgroundColor: meta.bg, color: meta.fg }}
                            >
                              {meta.initials}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{e.provider}</p>
                            <p className="mt-0.5 text-sm tracking-wide text-white/70">{e.number}</p>
                            <p className="text-xs text-white/40">
                              Nama: <span className="text-white/60">{e.name}</span>
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              copyText(e.number, "Nomor");
                            }}
                            className="shrink-0 rounded-full border border-[#262626] p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                            aria-label="Salin nomor"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            copyText(e.number, "Nomor");
                          }}
                          className="mt-3 w-full rounded-xl bg-white/5 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10"
                        >
                          Salin Nomor
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.section>

            {/* SECTION 3: QRIS */}
            <motion.section variants={fadeUp} custom={3} initial="hidden" animate="show" className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <QrCode className="h-4 w-4 text-white/50" />
                <h2 className="text-xs font-semibold tracking-wide text-white/50">QRIS</h2>
              </div>

              <div className="rounded-[20px] border border-[#262626] bg-[#151515] p-5">
                <h3 className="text-sm font-semibold">Pembayaran QRIS</h3>
                <p className="mt-1 text-xs text-white/45">
                  Scan QRIS menggunakan aplikasi pembayaran apa saja.
                </p>

                <div className="mt-4 flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-white">
                  {settings?.qris_image_url ? (
                    <div className="relative h-full w-full">
                      <Image src={settings.qris_image_url} alt="QRIS" fill className="object-contain p-4" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-6 text-center">
                      <QrCode className="h-10 w-10 text-black/20" />
                      <p className="text-sm text-black/40">QRIS belum tersedia.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.section>

            {/* SECTION 4: UPLOAD BUKTI PEMBAYARAN */}
            <motion.div variants={fadeUp} custom={4} initial="hidden" animate="show">
              <UploadProof paymentId={payment?.id} phone={phone} disabled={!payment} onUploaded={load} />
              {!payment && (
                <p className="mt-2 px-1 text-xs text-white/35">
                  Upload bukti pembayaran akan aktif setelah kamu menyelesaikan checkout.
                </p>
              )}
            </motion.div>

            {/* SECTION 5: STATUS VERIFIKASI */}
            <motion.div variants={fadeUp} custom={5} initial="hidden" animate="show">
              <VerificationStatus current={verificationStep} rejectionReason={payment?.rejection_reason} />
            </motion.div>
              </>
            )}

            {/* SECTION 6: PANDUAN PEMBAYARAN */}
            <motion.div variants={fadeUp} custom={6} initial="hidden" animate="show">
              <PaymentGuide />
            </motion.div>
          </>
        )}
      </div>

      {/* BOTTOM BUTTON */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#262626] bg-[#0B0B0B]/95 backdrop-blur">
        <div className="mx-auto max-w-lg px-4 py-3">
          <button
            onClick={handleFinish}
            className="w-full rounded-[20px] bg-white py-3.5 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            Wajib Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
