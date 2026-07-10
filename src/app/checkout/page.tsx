"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { PROVINCES, CITIES_BY_PROVINCE } from "@/lib/regions";
import type { CartItem, StoreSettings } from "@/types/database";
import type { ShippingOption } from "@/lib/shipping";

type PaymentMethod = "bank_transfer" | "ewallet" | "qris";

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    recipient_name: "",
    phone: "",
    email: "",
    province: "",
    city: "",
    district: "",
    subdistrict: "",
    postal_code: "",
    full_address: "",
  });

  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [shippingDropdownOpen, setShippingDropdownOpen] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("qris");
  const [paymentChannel, setPaymentChannel] = useState("");
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [note, setNote] = useState("");

  // Kunci idempotency dibuat SEKALI per kunjungan halaman checkout dan
  // tetap sama walau tombol diklik beberapa kali atau request di-retry
  // (mis. koneksi lambat). Server akan mengenali kunci yang sama dan
  // mengembalikan order yang sudah dibuat, bukan membuat order baru -
  // ini mencegah pesanan ganda (double order) dari 1x checkout.
  const idempotencyKeyRef = useRef<string>(
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
  );
  // Guard tambahan terhadap klik ganda yang terjadi sebelum React sempat
  // me-render ulang tombol menjadi disabled (state React bersifat async).
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const [cartRes, settingsRes] = await Promise.all([
          apiFetch("/api/cart"),
          apiFetch("/api/settings"),
        ]);
        setItems(cartRes.items ?? []);
        setSettings(settingsRes.settings);
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const subtotal = items.reduce((sum, item) => {
    const price = item.product_variants?.price_override ?? item.products?.price ?? 0;
    return sum + price * item.quantity;
  }, 0);
  const totalWeight = items.reduce(
    (sum, item) => sum + (item.products?.weight_grams ?? 0) * item.quantity,
    0
  );
  const grandTotal = subtotal + (selectedShipping?.cost ?? 0);

  const cities = form.province ? CITIES_BY_PROVINCE[form.province] ?? [] : [];

  async function fetchShipping() {
    if (!form.city) {
      toast.error("Pilih kota tujuan terlebih dahulu");
      return;
    }
    setLoadingShipping(true);
    setSelectedShipping(null);
    try {
      const { options } = await apiFetch("/api/shipping", {
        method: "POST",
        body: JSON.stringify({ destinationCity: form.city, totalWeightGrams: totalWeight }),
      });
      setShippingOptions(options);
      setShippingDropdownOpen(options.length > 0);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingShipping(false);
    }
  }

  // Semua channel pembayaran, dikelompokkan per metode - dipakai untuk
  // tampilan bottom sheet ala TikTok Shop/Shopee (satu daftar, langsung
  // pilih metode + channel sekaligus).
  const paymentGroups = useMemo(() => {
    if (!settings) return [];
    return [
      {
        method: "qris" as PaymentMethod,
        label: "QRIS",
        channels: ["QRIS"],
      },
      {
        method: "bank_transfer" as PaymentMethod,
        label: "Transfer Bank",
        channels:
          settings.bank_accounts?.map((b) => `${b.bank} - ${b.account_number} a.n ${b.account_name}`) ?? [],
      },
      {
        method: "ewallet" as PaymentMethod,
        label: "E-Wallet",
        channels:
          settings.ewallet_accounts?.map((e) => `${e.provider} - ${e.number} a.n ${e.name}`) ?? [],
      },
    ];
  }, [settings]);

  async function submitOrder() {
    // Cegah klik ganda: kalau request sebelumnya masih berjalan, abaikan
    // klik berikutnya sepenuhnya (tidak menunggu re-render state React).
    if (isSubmittingRef.current) return;

    if (!form.recipient_name || !form.phone || !form.province || !form.city || !form.full_address) {
      toast.error("Lengkapi data alamat pengiriman");
      return;
    }
    if (!selectedShipping) {
      toast.error("Pilih jasa pengiriman terlebih dahulu");
      return;
    }
    if (!paymentChannel) {
      toast.error("Pilih channel pembayaran");
      return;
    }

    isSubmittingRef.current = true;
    setSubmitting(true);
    try {
      const { order, payment } = await apiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          idempotency_key: idempotencyKeyRef.current,
          cart_item_ids: items.map((i) => i.id),
          address: form,
          guest_email: form.email || undefined,
          courier_code: selectedShipping.courier_code,
          courier_service: selectedShipping.service,
          shipping_cost: selectedShipping.cost,
          shipping_eta: selectedShipping.eta,
          payment_method: paymentMethod,
          payment_channel_detail: paymentChannel,
          buyer_note: note || undefined,
        }),
      });
      toast.success("Pesanan berhasil dibuat");
      router.push(`/invoice/${order.order_number}?phone=${encodeURIComponent(form.phone)}`);
    } catch (e: any) {
      toast.error(e.message);
      // Hanya buka guard lagi kalau gagal, supaya user bisa coba ulang.
      // Idempotency key TETAP sama sehingga retry ini aman (tidak dobel).
      isSubmittingRef.current = false;
    } finally {
      setSubmitting(false);
    }
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

  if (items.length === 0) {
    return (
      <div className="container py-16 text-center text-sm text-muted-foreground">
        Keranjang kosong. Silakan pilih produk terlebih dahulu.
      </div>
    );
  }

  return (
    <div className="container space-y-6 py-4 pb-40">
      <h1 className="text-lg font-semibold">Checkout</h1>

      {/* ALAMAT */}
      <section className="rounded-xl border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold">Alamat Pengiriman</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Nama Penerima" value={form.recipient_name} onChange={(v) => setForm({ ...form, recipient_name: v })} />
          <Input label="Nomor HP" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Input label="Email (opsional)" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Select
            label="Provinsi"
            value={form.province}
            options={PROVINCES}
            onChange={(v) => setForm({ ...form, province: v, city: "" })}
          />
          <Select label="Kota/Kabupaten" value={form.city} options={cities} onChange={(v) => setForm({ ...form, city: v })} />
          <Input label="Kecamatan" value={form.district} onChange={(v) => setForm({ ...form, district: v })} />
          <Input label="Kelurahan" value={form.subdistrict} onChange={(v) => setForm({ ...form, subdistrict: v })} />
          <Input label="Kode Pos" value={form.postal_code} onChange={(v) => setForm({ ...form, postal_code: v })} />
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs text-muted-foreground">Alamat Lengkap</label>
          <textarea
            value={form.full_address}
            onChange={(e) => setForm({ ...form, full_address: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none"
            placeholder="Nama jalan, nomor rumah, RT/RW, patokan..."
          />
        </div>
      </section>

      {/* ONGKIR */}
      <section className="rounded-xl border border-border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Jasa Pengiriman</h2>
          <button
            onClick={fetchShipping}
            disabled={loadingShipping}
            className="rounded-lg border border-border px-3 py-1.5 text-xs disabled:opacity-50"
          >
            {loadingShipping ? "Menghitung..." : "Cek Ongkir"}
          </button>
        </div>
        {shippingOptions.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Pilih kota tujuan lalu klik "Cek Ongkir" untuk melihat pilihan kurir.
          </p>
        ) : (
          <div className="relative">
            {/* Tombol dropdown: menampilkan kurir terpilih, klik untuk buka/tutup daftar */}
            <button
              type="button"
              onClick={() => setShippingDropdownOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left text-sm"
            >
              {selectedShipping ? (
                <span>
                  <span className="font-medium">{selectedShipping.courier_name}</span> ·{" "}
                  {selectedShipping.service} · {selectedShipping.eta} ·{" "}
                  <span className="font-semibold">{formatRupiah(selectedShipping.cost)}</span>
                </span>
              ) : (
                <span className="text-muted-foreground">Pilih jasa pengiriman</span>
              )}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`ml-2 shrink-0 transition-transform ${shippingDropdownOpen ? "rotate-180" : ""}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {/* Daftar kurir: hanya tampil saat dropdown dibuka. Memilih salah
                satu langsung menutup dropdown otomatis. */}
            {shippingDropdownOpen && (
              <div className="mt-1.5 max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-border p-1.5">
                {shippingOptions.map((opt, idx) => {
                  const active =
                    selectedShipping?.courier_code === opt.courier_code &&
                    selectedShipping.service === opt.service;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedShipping(opt);
                        setShippingDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                        active ? "border-foreground bg-secondary/50" : "border-transparent hover:bg-secondary/30"
                      }`}
                    >
                      <span>
                        <span className="font-medium">{opt.courier_name}</span> · {opt.service} · {opt.eta}
                      </span>
                      <span className="font-semibold">{formatRupiah(opt.cost)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* PEMBAYARAN - gaya marketplace (TikTok Shop / Shopee):
          baris ringkasan yang menampilkan metode terpilih, tap untuk
          membuka bottom sheet berisi semua pilihan. Memilih salah satu
          langsung menutup sheet. */}
      <section className="rounded-xl border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold">Metode Pembayaran</h2>
        <button
          type="button"
          onClick={() => setPaymentSheetOpen(true)}
          className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left text-sm"
        >
          {paymentChannel ? (
            <span className="flex items-center gap-2 min-w-0">
              <PaymentIcon method={paymentMethod} />
              <span className="truncate">
                <span className="font-medium">
                  {paymentMethod === "qris" ? "QRIS" : paymentMethod === "bank_transfer" ? "Transfer Bank" : "E-Wallet"}
                </span>
                {paymentMethod !== "qris" && <span className="text-muted-foreground"> · {paymentChannel}</span>}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">Pilih metode pembayaran</span>
          )}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-2 shrink-0">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </section>

      {/* Bottom sheet pilihan pembayaran */}
      {paymentSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setPaymentSheetOpen(false)}>
          <div
            className="max-h-[75vh] w-full max-w-[480px] overflow-y-auto rounded-t-2xl bg-background p-4 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <h3 className="mb-3 text-sm font-semibold">Pilih Metode Pembayaran</h3>
            <div className="space-y-4">
              {paymentGroups.map((group) => (
                <div key={group.method}>
                  <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <PaymentIcon method={group.method} />
                    {group.label}
                  </div>
                  {group.channels.length === 0 ? (
                    <p className="pl-6 text-xs text-muted-foreground">Belum ada channel yang diatur admin.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {group.channels.map((ch) => {
                        const active = paymentMethod === group.method && paymentChannel === ch;
                        return (
                          <button
                            key={ch}
                            type="button"
                            onClick={() => {
                              setPaymentMethod(group.method);
                              setPaymentChannel(ch);
                              setPaymentSheetOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                              active ? "border-foreground bg-secondary/50" : "border-border"
                            }`}
                          >
                            <span>{ch}</span>
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                active ? "border-foreground" : "border-muted-foreground"
                              }`}
                            >
                              {active && <span className="h-2 w-2 rounded-full bg-foreground" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CATATAN */}
      <section className="rounded-xl border border-border p-4">
        <label className="mb-1 block text-sm font-semibold">Catatan Pembeli (opsional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none"
          placeholder="Contoh: titip pesan ke kurir, warna alternatif, dll."
        />
      </section>

      {/* RINGKASAN */}
      <section className="rounded-xl border border-border p-4 text-sm">
        <h2 className="mb-3 font-semibold">Ringkasan Pembayaran</h2>
        <div className="space-y-1.5 text-muted-foreground">
          <Row label="Subtotal" value={formatRupiah(subtotal)} />
          <Row label="Ongkir" value={selectedShipping ? formatRupiah(selectedShipping.cost) : "-"} />
          <Row label="Total Berat" value={`${(totalWeight / 1000).toFixed(1)} kg`} />
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-base font-semibold text-foreground">
          <span>Grand Total</span>
          <span>{formatRupiah(grandTotal)}</span>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-background/95 p-4 backdrop-blur md:bottom-0">
        <div className="container flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total Bayar</p>
            <p className="text-lg font-semibold">{formatRupiah(grandTotal)}</p>
          </div>
          <button
            onClick={submitOrder}
            disabled={submitting}
            className="rounded-lg bg-foreground px-6 py-3 text-sm font-medium text-background disabled:opacity-50"
          >
            {submitting ? "Memproses..." : "Buat Pesanan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentIcon({ method }: { method: PaymentMethod }) {
  const base = "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold";
  if (method === "qris") {
    return <span className={`${base} bg-blue-500/15 text-blue-500`}>QR</span>;
  }
  if (method === "bank_transfer") {
    return <span className={`${base} bg-emerald-500/15 text-emerald-500`}>🏦</span>;
  }
  return <span className={`${base} bg-purple-500/15 text-purple-500`}>💳</span>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none"
      />
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none"
      >
        <option value="">Pilih {label}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
