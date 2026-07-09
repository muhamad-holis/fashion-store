"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/utils";
import { DeleteButton } from "@/components/admin/delete-button";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_purchase: number | null;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
}

export default function AdminVoucherPage() {
  const supabase = createClient();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: "",
    description: "",
    discount_type: "percent" as "percent" | "fixed",
    discount_value: "",
    min_purchase: "",
    max_discount: "",
    usage_limit: "",
  });

  async function load() {
    const { data } = await supabase.from("coupons").select("*").order("valid_from", { ascending: false });
    setCoupons(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    if (!form.code || !form.discount_value) {
      toast.error("Kode dan nilai diskon wajib diisi");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("coupons").insert({
      code: form.code.toUpperCase(),
      description: form.description || null,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_purchase: form.min_purchase ? Number(form.min_purchase) : 0,
      max_discount: form.max_discount ? Number(form.max_discount) : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Voucher ditambahkan");
    setForm({ code: "", description: "", discount_type: "percent", discount_value: "", min_purchase: "", max_discount: "", usage_limit: "" });
    load();
  }

  async function toggleActive(id: string, isActive: boolean) {
    await supabase.from("coupons").update({ is_active: !isActive }).eq("id", id);
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Voucher</h1>

      <div className="rounded-xl border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold">Tambah Voucher</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Kode Voucher</label>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="input" placeholder="DISKON10" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Tipe Diskon</label>
            <select
              value={form.discount_type}
              onChange={(e) => setForm({ ...form, discount_type: e.target.value as "percent" | "fixed" })}
              className="input"
            >
              <option value="percent">Persentase (%)</option>
              <option value="fixed">Nominal (Rp)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Nilai Diskon</label>
            <input
              type="number"
              value={form.discount_value}
              onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Min. Pembelian</label>
            <input
              type="number"
              value={form.min_purchase}
              onChange={(e) => setForm({ ...form, min_purchase: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Maks. Diskon (jika %)</label>
            <input
              type="number"
              value={form.max_discount}
              onChange={(e) => setForm({ ...form, max_discount: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Limit Penggunaan</label>
            <input
              type="number"
              value={form.usage_limit}
              onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
              className="input"
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs text-muted-foreground">Deskripsi</label>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" />
        </div>
        <button
          onClick={handleAdd}
          disabled={saving}
          className="mt-3 flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Tambah Voucher
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Kode</th>
              <th className="p-3">Diskon</th>
              <th className="p-3">Min. Beli</th>
              <th className="p-3">Terpakai</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="p-3 font-medium">{c.code}</td>
                <td className="p-3">
                  {c.discount_type === "percent" ? `${c.discount_value}%` : formatRupiah(c.discount_value)}
                </td>
                <td className="p-3">{formatRupiah(c.min_purchase ?? 0)}</td>
                <td className="p-3">
                  {c.used_count}
                  {c.usage_limit ? ` / ${c.usage_limit}` : ""}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => toggleActive(c.id, c.is_active)}
                    className={`rounded-full px-2 py-1 text-xs ${c.is_active ? "bg-secondary" : "bg-destructive/20 text-destructive"}`}
                  >
                    {c.is_active ? "Aktif" : "Nonaktif"}
                  </button>
                </td>
                <td className="p-3">
                  <DeleteButton table="coupons" id={c.id} label="voucher" onDeleted={load} />
                </td>
              </tr>
            ))}
            {!loading && coupons.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                  Belum ada voucher.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
