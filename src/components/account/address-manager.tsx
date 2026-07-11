"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MapPin, Pencil, Trash2, Plus, Star, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PROVINCES, CITIES_BY_PROVINCE } from "@/lib/regions";
import type { Address } from "@/types/database";

type FormState = {
  id?: string;
  recipient_name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  subdistrict: string;
  postal_code: string;
  full_address: string;
  is_default: boolean;
};

const EMPTY_FORM: FormState = {
  recipient_name: "",
  phone: "",
  province: "",
  city: "",
  district: "",
  subdistrict: "",
  postal_code: "",
  full_address: "",
  is_default: false,
};

export function AddressManager({ initialAddresses }: { initialAddresses: Address[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const cities = form.province ? CITIES_BY_PROVINCE[form.province] ?? [] : [];

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(addr: Address) {
    setForm({
      id: addr.id,
      recipient_name: addr.recipient_name,
      phone: addr.phone,
      province: addr.province,
      city: addr.city,
      district: addr.district,
      subdistrict: addr.subdistrict,
      postal_code: addr.postal_code,
      full_address: addr.full_address,
      is_default: addr.is_default,
    });
    setFormOpen(true);
  }

  async function refresh() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    setAddresses((data as Address[]) ?? []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !form.recipient_name.trim() ||
      !form.phone.trim() ||
      !form.province ||
      !form.city ||
      !form.district.trim() ||
      !form.subdistrict.trim() ||
      !form.postal_code.trim() ||
      !form.full_address.trim()
    ) {
      toast.error("Lengkapi semua kolom alamat dulu ya");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi kamu berakhir, silakan masuk lagi.");

      // Kalau alamat ini dijadikan utama, lepas status default dari alamat lain dulu.
      if (form.is_default) {
        await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
      }

      const payload = {
        user_id: user.id,
        recipient_name: form.recipient_name.trim(),
        phone: form.phone.trim(),
        province: form.province,
        city: form.city,
        district: form.district.trim(),
        subdistrict: form.subdistrict.trim(),
        postal_code: form.postal_code.trim(),
        full_address: form.full_address.trim(),
        is_default: form.is_default,
      };

      const { error } = form.id
        ? await supabase.from("addresses").update(payload).eq("id", form.id)
        : await supabase.from("addresses").insert(payload);

      if (error) throw error;

      toast.success(form.id ? "Alamat berhasil diperbarui" : "Alamat baru berhasil ditambahkan");
      setFormOpen(false);
      await refresh();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan alamat");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const { error } = await supabase.from("addresses").delete().eq("id", id);
    setDeletingId(null);
    if (error) {
      toast.error(error.message || "Gagal menghapus alamat");
      return;
    }
    toast.success("Alamat dihapus");
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    router.refresh();
  }

  async function handleSetDefault(id: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    if (error) {
      toast.error(error.message || "Gagal mengubah alamat utama");
      return;
    }
    toast.success("Alamat utama diperbarui");
    await refresh();
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <button
        onClick={openAdd}
        className="ripple flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
        Tambah Alamat Baru
      </button>

      {addresses.length === 0 ? (
        <div className="premium-card flex flex-col items-center gap-2 p-10 text-center">
          <MapPin className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Belum ada alamat tersimpan.</p>
        </div>
      ) : (
        addresses.map((addr) => (
          <div key={addr.id} className="premium-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold">{addr.recipient_name}</p>
                {addr.is_default && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground/80">
                    Utama
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => openEdit(addr)}
                  className="ripple rounded-full p-2 transition hover:bg-secondary"
                  aria-label="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(addr.id)}
                  disabled={deletingId === addr.id}
                  className="ripple rounded-full p-2 text-red-400 transition hover:bg-red-500/10"
                  aria-label="Hapus"
                >
                  {deletingId === addr.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{addr.phone}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {addr.full_address}, {addr.subdistrict}, {addr.district}, {addr.city}, {addr.province}{" "}
              {addr.postal_code}
            </p>

            {!addr.is_default && (
              <button
                onClick={() => handleSetDefault(addr.id)}
                className="ripple mt-3 flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-secondary"
              >
                <Star className="h-3 w-3" />
                Jadikan Alamat Utama
              </button>
            )}
          </div>
        ))
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] border border-border bg-card p-5 md:rounded-[28px]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {form.id ? "Edit Alamat" : "Tambah Alamat Baru"}
              </h2>
              <button
                onClick={() => setFormOpen(false)}
                className="rounded-full p-1.5 transition hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <Field label="Nama Penerima">
                <input
                  value={form.recipient_name}
                  onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                  className="input"
                  placeholder="Nama lengkap penerima"
                />
              </Field>

              <Field label="Nomor HP">
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input"
                  placeholder="08xxxxxxxxxx"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Provinsi">
                  <select
                    value={form.province}
                    onChange={(e) => setForm({ ...form, province: e.target.value, city: "" })}
                    className="input"
                  >
                    <option value="">Pilih</option>
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Kota/Kabupaten">
                  <select
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="input"
                    disabled={!form.province}
                  >
                    <option value="">Pilih</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Kecamatan">
                  <input
                    value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="Kelurahan">
                  <input
                    value={form.subdistrict}
                    onChange={(e) => setForm({ ...form, subdistrict: e.target.value })}
                    className="input"
                  />
                </Field>
              </div>

              <Field label="Kode Pos">
                <input
                  value={form.postal_code}
                  onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                  className="input"
                  inputMode="numeric"
                />
              </Field>

              <Field label="Alamat Lengkap">
                <textarea
                  value={form.full_address}
                  onChange={(e) => setForm({ ...form, full_address: e.target.value })}
                  rows={3}
                  className="input resize-none"
                  placeholder="Nama jalan, nomor rumah, RT/RW, patokan"
                />
              </Field>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
                Jadikan alamat utama
              </label>

              <button
                type="submit"
                disabled={saving}
                className="ripple flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-3 text-sm font-semibold text-background transition active:scale-[0.98] disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Menyimpan..." : "Simpan Alamat"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
