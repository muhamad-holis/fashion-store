"use client";

import { useEffect, useMemo, useState } from "react";
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

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("qris");
  const [paymentChannel, setPaymentChannel] = useState("");
  const [note, setNote] = useState("");

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
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingShipping(false);
    }
  }

  const paymentChannels = useMemo(() => {
    if (!settings) return [];
    if (paymentMethod === "bank_transfer") {
      return settings.bank_accounts?.map((b) => `${b.bank} - ${b.account_number} a.n ${b.account_name}`) ?? [];
    }
    if (paymentMethod === "ewallet") {
      return settings.ewallet_accounts?.map((e) => `${e.provider} - ${e.number} a.n ${e.name}`) ?? [];
    }
    return ["QRIS"];
  }, [settings, paymentMethod]);

  async function submitOrder() {
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

    setSubmitting(true);
    try {
      const { order, payment } = await apiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({
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
          <div className="space-y-2">
            {shippingOptions.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedShipping(opt)}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                  selectedShipping?.courier_code === opt.courier_code && selectedShipping.service === opt.service
                    ? "border-foreground"
                    : "border-border"
                }`}
              >
                <span>
                  <span className="font-medium">{opt.courier_name}</span> · {opt.service} · {opt.eta}
                </span>
                <span className="font-semibold">{formatRupiah(opt.cost)}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* PEMBAYARAN */}
      <section className="rounded-xl border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold">Metode Pembayaran</h2>
        <div className="mb-3 grid grid-cols-3 gap-2">
          {(["qris", "bank_transfer", "ewallet"] as PaymentMethod[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setPaymentMethod(m);
                setPaymentChannel("");
              }}
              className={`rounded-lg border px-3 py-2 text-xs capitalize transition ${
                paymentMethod === m ? "border-foreground bg-foreground text-background" : "border-border"
              }`}
            >
              {m === "qris" ? "QRIS" : m === "bank_transfer" ? "Transfer Bank" : "E-Wallet"}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          {paymentChannels.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Belum ada channel {paymentMethod} yang diatur admin.
            </p>
          )}
          {paymentChannels.map((ch) => (
            <button
              key={ch}
              onClick={() => setPaymentChannel(ch)}
              className={`block w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                paymentChannel === ch ? "border-foreground" : "border-border"
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </section>

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
