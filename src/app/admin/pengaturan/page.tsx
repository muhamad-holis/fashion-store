"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Upload, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface BankAccount {
  bank: string;
  account_number: string;
  account_name: string;
}
interface EwalletAccount {
  provider: string;
  number: string;
  name: string;
}

export default function AdminSettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingQris, setUploadingQris] = useState(false);

  const [form, setForm] = useState({
    store_name: "",
    logo_url: "",
    favicon_url: "",
    address: "",
    whatsapp: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    email: "",
    operational_hours: "",
    qris_image_url: "",
  });
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [ewalletAccounts, setEwalletAccounts] = useState<EwalletAccount[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
      if (data) {
        setForm({
          store_name: data.store_name ?? "",
          logo_url: data.logo_url ?? "",
          favicon_url: data.favicon_url ?? "",
          address: data.address ?? "",
          whatsapp: data.whatsapp ?? "",
          instagram: data.instagram ?? "",
          facebook: data.facebook ?? "",
          tiktok: data.tiktok ?? "",
          email: data.email ?? "",
          operational_hours: data.operational_hours ?? "",
          qris_image_url: data.qris_image_url ?? "",
        });
        setBankAccounts(data.bank_accounts ?? []);
        setEwalletAccounts(data.ewallet_accounts ?? []);
      }
      setLoading(false);
    })();
  }, []);

  async function uploadFile(file: File, bucket: string, setter: (url: string) => void, setUploading: (v: boolean) => void) {
    setUploading(true);
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    setter(data.publicUrl);
    setUploading(false);
  }

  function addBank() {
    setBankAccounts((prev) => [...prev, { bank: "", account_number: "", account_name: "" }]);
  }
  function addEwallet() {
    setEwalletAccounts((prev) => [...prev, { provider: "", number: "", name: "" }]);
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("settings")
      .update({
        ...form,
        bank_accounts: bankAccounts,
        ewallet_accounts: ewalletAccounts,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pengaturan toko berhasil disimpan");
  }

  if (loading) return <div className="skeleton h-64 w-full max-w-2xl rounded-xl" />;

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-lg font-semibold">Pengaturan Toko</h1>

      <Section title="Identitas Toko">
        <Field label="Nama Brand / Toko">
          <input
            value={form.store_name}
            onChange={(e) => setForm({ ...form, store_name: e.target.value })}
            className="input"
            placeholder="Nama brand kamu"
          />
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Logo</label>
            <div className="flex items-center gap-3">
              {form.logo_url && (
                <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-border bg-white">
                  <Image src={form.logo_url} alt="Logo" fill className="object-contain" />
                </div>
              )}
              <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 text-xs text-muted-foreground">
                <Upload className="h-4 w-4" />
                {uploadingLogo ? "..." : "Upload Logo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "logo", (u) => setForm((f) => ({ ...f, logo_url: u })), setUploadingLogo)}
                />
              </label>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Favicon</label>
            <div className="flex items-center gap-3">
              {form.favicon_url && (
                <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-border bg-white">
                  <Image src={form.favicon_url} alt="Favicon" fill className="object-contain" />
                </div>
              )}
              <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 text-xs text-muted-foreground">
                <Upload className="h-4 w-4" />
                {"Upload"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "logo", (u) => setForm((f) => ({ ...f, favicon_url: u })), setUploadingLogo)}
                />
              </label>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Kontak & Sosial Media">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Alamat">
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" />
          </Field>
          <Field label="Nomor WhatsApp">
            <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="input" />
          </Field>
          <Field label="Email">
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
          </Field>
          <Field label="Jam Operasional">
            <input
              value={form.operational_hours}
              onChange={(e) => setForm({ ...form, operational_hours: e.target.value })}
              className="input"
              placeholder="09.00 - 21.00 WIB"
            />
          </Field>
          <Field label="Instagram">
            <input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} className="input" />
          </Field>
          <Field label="Facebook">
            <input value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} className="input" />
          </Field>
          <Field label="TikTok">
            <input value={form.tiktok} onChange={(e) => setForm({ ...form, tiktok: e.target.value })} className="input" />
          </Field>
        </div>
      </Section>

      <Section title="Rekening Bank">
        <div className="space-y-2">
          {bankAccounts.map((b, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
              <input
                value={b.bank}
                onChange={(e) => setBankAccounts((prev) => prev.map((x, i) => (i === idx ? { ...x, bank: e.target.value } : x)))}
                placeholder="BCA"
                className="input"
              />
              <input
                value={b.account_number}
                onChange={(e) =>
                  setBankAccounts((prev) => prev.map((x, i) => (i === idx ? { ...x, account_number: e.target.value } : x)))
                }
                placeholder="1234567890"
                className="input"
              />
              <input
                value={b.account_name}
                onChange={(e) =>
                  setBankAccounts((prev) => prev.map((x, i) => (i === idx ? { ...x, account_name: e.target.value } : x)))
                }
                placeholder="Nama Pemilik"
                className="input"
              />
              <button
                type="button"
                onClick={() => setBankAccounts((prev) => prev.filter((_, i) => i !== idx))}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={addBank} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Plus className="h-3.5 w-3.5" />
            Tambah Rekening
          </button>
        </div>
      </Section>

      <Section title="E-Wallet">
        <div className="space-y-2">
          {ewalletAccounts.map((e, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
              <input
                value={e.provider}
                onChange={(ev) => setEwalletAccounts((prev) => prev.map((x, i) => (i === idx ? { ...x, provider: ev.target.value } : x)))}
                placeholder="DANA"
                className="input"
              />
              <input
                value={e.number}
                onChange={(ev) => setEwalletAccounts((prev) => prev.map((x, i) => (i === idx ? { ...x, number: ev.target.value } : x)))}
                placeholder="08123456789"
                className="input"
              />
              <input
                value={e.name}
                onChange={(ev) => setEwalletAccounts((prev) => prev.map((x, i) => (i === idx ? { ...x, name: ev.target.value } : x)))}
                placeholder="Nama Pemilik"
                className="input"
              />
              <button
                type="button"
                onClick={() => setEwalletAccounts((prev) => prev.filter((_, i) => i !== idx))}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={addEwallet} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Plus className="h-3.5 w-3.5" />
            Tambah E-Wallet
          </button>
        </div>
      </Section>

      <Section title="QRIS">
        <div className="flex items-center gap-3">
          {form.qris_image_url && (
            <div className="relative h-32 w-32 overflow-hidden rounded-lg border border-border bg-white">
              <Image src={form.qris_image_url} alt="QRIS" fill className="object-contain" />
            </div>
          )}
          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 text-xs text-muted-foreground">
            <Upload className="h-4 w-4" />
            {uploadingQris ? "..." : form.qris_image_url ? "Ganti QRIS" : "Upload QRIS"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "qris", (u) => setForm((f) => ({ ...f, qris_image_url: u })), setUploadingQris)}
            />
          </label>
        </div>
      </Section>

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-foreground px-6 py-3 text-sm font-medium text-background disabled:opacity-50"
      >
        {saving ? "Menyimpan..." : "Simpan Pengaturan"}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="space-y-3">{children}</div>
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
