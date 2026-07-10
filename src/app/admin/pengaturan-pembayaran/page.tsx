"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Landmark,
  Wallet,
  QrCode,
  Plus,
  Pencil,
  Trash2,
  Upload,
  X,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { getBankMeta, getEwalletMeta } from "@/app/pembayaran/brand-meta";

type BankAccount = {
  bank: string;
  account_number: string;
  account_name: string;
  logo_url?: string;
  is_active?: boolean;
};
type EwalletAccount = {
  provider: string;
  number: string;
  name: string;
  logo_url?: string;
  is_active?: boolean;
};

const TABS = [
  { key: "bank", label: "Transfer Bank", icon: Landmark },
  { key: "ewallet", label: "E-Wallet", icon: Wallet },
  { key: "qris", label: "QRIS", icon: QrCode },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AdminPaymentSettingsPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<TabKey>("bank");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [ewallets, setEwallets] = useState<EwalletAccount[]>([]);
  const [qrisUrl, setQrisUrl] = useState<string>("");
  const [uploadingQris, setUploadingQris] = useState(false);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<BankAccount & EwalletAccount>({
    bank: "",
    account_number: "",
    account_name: "",
    provider: "",
    number: "",
    name: "",
  } as any);
  const [uploadingDraftLogo, setUploadingDraftLogo] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
    if (data) {
      setBanks((data.bank_accounts ?? []) as BankAccount[]);
      setEwallets((data.ewallet_accounts ?? []) as EwalletAccount[]);
      setQrisUrl(data.qris_image_url ?? "");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function persist(next: { bank_accounts?: BankAccount[]; ewallet_accounts?: EwalletAccount[]; qris_image_url?: string }) {
    setSaving(true);
    const { error } = await supabase.from("settings").update(next).eq("id", 1);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    return true;
  }

  function openAdd() {
    setEditingIndex(-1);
    setDraft({
      bank: "",
      account_number: "",
      account_name: "EMYU FASHION STORE",
      provider: "",
      number: "",
      name: "EMYU FASHION STORE",
      is_active: true,
    } as any);
  }

  function openEdit(idx: number) {
    setEditingIndex(idx);
    if (tab === "bank") setDraft({ ...(banks[idx] as any) });
    else setDraft({ ...(ewallets[idx] as any) });
  }

  function closeEditor() {
    setEditingIndex(null);
  }

  async function uploadDraftLogo(file: File) {
    setUploadingDraftLogo(true);
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { error } = await supabase.storage.from("logo").upload(fileName, file);
    if (error) {
      toast.error(error.message);
      setUploadingDraftLogo(false);
      return;
    }
    const { data } = supabase.storage.from("logo").getPublicUrl(fileName);
    setDraft((d) => ({ ...d, logo_url: data.publicUrl }));
    setUploadingDraftLogo(false);
  }

  async function saveDraft() {
    if (tab === "bank") {
      if (!draft.bank || !draft.account_number) {
        toast.error("Nama bank dan nomor rekening wajib diisi");
        return;
      }
      const item: BankAccount = {
        bank: draft.bank,
        account_number: draft.account_number,
        account_name: draft.account_name || "EMYU FASHION STORE",
        logo_url: draft.logo_url,
        is_active: draft.is_active ?? true,
      };
      const next = editingIndex === -1 ? [...banks, item] : banks.map((b, i) => (i === editingIndex ? item : b));
      const ok = await persist({ bank_accounts: next });
      if (ok) {
        setBanks(next);
        toast.success(editingIndex === -1 ? "Rekening bank ditambahkan" : "Rekening bank diperbarui");
        closeEditor();
      }
    } else {
      if (!draft.provider || !draft.number) {
        toast.error("Nama provider dan nomor wajib diisi");
        return;
      }
      const item: EwalletAccount = {
        provider: draft.provider,
        number: draft.number,
        name: draft.name || "EMYU FASHION STORE",
        logo_url: draft.logo_url,
        is_active: draft.is_active ?? true,
      };
      const next = editingIndex === -1 ? [...ewallets, item] : ewallets.map((e, i) => (i === editingIndex ? item : e));
      const ok = await persist({ ewallet_accounts: next });
      if (ok) {
        setEwallets(next);
        toast.success(editingIndex === -1 ? "E-wallet ditambahkan" : "E-wallet diperbarui");
        closeEditor();
      }
    }
  }

  async function toggleActive(idx: number) {
    if (tab === "bank") {
      const next = banks.map((b, i) => (i === idx ? { ...b, is_active: b.is_active === false } : b));
      const ok = await persist({ bank_accounts: next });
      if (ok) setBanks(next);
    } else {
      const next = ewallets.map((e, i) => (i === idx ? { ...e, is_active: e.is_active === false } : e));
      const ok = await persist({ ewallet_accounts: next });
      if (ok) setEwallets(next);
    }
  }

  async function remove(idx: number) {
    if (!confirm("Hapus metode pembayaran ini?")) return;
    if (tab === "bank") {
      const next = banks.filter((_, i) => i !== idx);
      const ok = await persist({ bank_accounts: next });
      if (ok) {
        setBanks(next);
        toast.success("Rekening bank dihapus");
      }
    } else {
      const next = ewallets.filter((_, i) => i !== idx);
      const ok = await persist({ ewallet_accounts: next });
      if (ok) {
        setEwallets(next);
        toast.success("E-wallet dihapus");
      }
    }
  }

  async function uploadQris(file: File) {
    setUploadingQris(true);
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { error } = await supabase.storage.from("qris").upload(fileName, file);
    if (error) {
      toast.error(error.message);
      setUploadingQris(false);
      return;
    }
    const { data } = supabase.storage.from("qris").getPublicUrl(fileName);
    const ok = await persist({ qris_image_url: data.publicUrl });
    if (ok) setQrisUrl(data.publicUrl);
    setUploadingQris(false);
  }

  if (loading) return <div className="skeleton h-64 w-full max-w-2xl rounded-xl" />;

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Pengaturan Pembayaran</h1>
        <p className="text-sm text-muted-foreground">
          Kelola rekening bank, e-wallet, dan QRIS yang tersedia untuk pelanggan saat checkout.
        </p>
      </div>

      <div className="flex gap-1 rounded-xl border border-border bg-secondary/40 p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition",
              tab === key ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "bank" && (
        <div className="space-y-2.5">
          {banks.map((b, idx) => {
            const meta = getBankMeta(b.bank, b.logo_url);
            const active = b.is_active !== false;
            return (
              <div key={idx} className="flex items-center gap-3 rounded-xl border border-border p-3">
                {meta.logoUrl ? (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white">
                    <Image src={meta.logoUrl} alt={b.bank} fill className="object-contain p-1" />
                  </div>
                ) : (
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
                    style={{ backgroundColor: meta.bg, color: meta.fg }}
                  >
                    {meta.initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{b.bank}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {b.account_number} · {b.account_name}
                  </p>
                </div>
                <button
                  onClick={() => toggleActive(idx)}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                    active ? "bg-emerald-500" : "bg-secondary"
                  )}
                  aria-label="Aktifkan/nonaktifkan"
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                      active ? "translate-x-5" : "translate-x-0.5"
                    )}
                  />
                </button>
                <button onClick={() => openEdit(idx)} className="shrink-0 text-muted-foreground hover:text-foreground">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => remove(idx)} className="shrink-0 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
          <button
            onClick={openAdd}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-3 text-xs font-medium text-muted-foreground hover:bg-secondary"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Rekening Bank
          </button>
        </div>
      )}

      {tab === "ewallet" && (
        <div className="space-y-2.5">
          {ewallets.map((e, idx) => {
            const meta = getEwalletMeta(e.provider, e.logo_url);
            const active = e.is_active !== false;
            return (
              <div key={idx} className="flex items-center gap-3 rounded-xl border border-border p-3">
                {meta.logoUrl ? (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white">
                    <Image src={meta.logoUrl} alt={e.provider} fill className="object-contain p-1" />
                  </div>
                ) : (
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
                    style={{ backgroundColor: meta.bg, color: meta.fg }}
                  >
                    {meta.initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.provider}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {e.number} · {e.name}
                  </p>
                </div>
                <button
                  onClick={() => toggleActive(idx)}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                    active ? "bg-emerald-500" : "bg-secondary"
                  )}
                  aria-label="Aktifkan/nonaktifkan"
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                      active ? "translate-x-5" : "translate-x-0.5"
                    )}
                  />
                </button>
                <button onClick={() => openEdit(idx)} className="shrink-0 text-muted-foreground hover:text-foreground">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => remove(idx)} className="shrink-0 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
          <button
            onClick={openAdd}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-3 text-xs font-medium text-muted-foreground hover:bg-secondary"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah E-Wallet
          </button>
        </div>
      )}

      {tab === "qris" && (
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center gap-4">
            <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-border bg-white">
              {qrisUrl ? (
                <Image src={qrisUrl} alt="QRIS" fill className="object-contain p-2" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-center text-xs text-muted-foreground">
                  QRIS belum tersedia
                </div>
              )}
            </div>
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 text-xs text-muted-foreground hover:bg-secondary">
              <Upload className="h-4 w-4" />
              {uploadingQris ? "Mengupload..." : qrisUrl ? "Ganti QRIS" : "Upload QRIS"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingQris}
                onChange={(e) => e.target.files?.[0] && uploadQris(e.target.files[0])}
              />
            </label>
          </div>
        </div>
      )}

      {editingIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" onClick={closeEditor}>
          <div
            className="w-full max-w-md rounded-t-2xl bg-background p-5 md:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {editingIndex === -1 ? "Tambah" : "Edit"} {tab === "bank" ? "Rekening Bank" : "E-Wallet"}
              </h3>
              <button onClick={closeEditor} className="text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {tab === "bank" ? (
                <>
                  <Field label="Nama Bank">
                    <input
                      value={draft.bank}
                      onChange={(e) => setDraft((d) => ({ ...d, bank: e.target.value }))}
                      placeholder="Bank BCA"
                      className="input"
                    />
                  </Field>
                  <Field label="Nomor Rekening">
                    <input
                      value={draft.account_number}
                      onChange={(e) => setDraft((d) => ({ ...d, account_number: e.target.value }))}
                      placeholder="1234567890"
                      className="input"
                    />
                  </Field>
                  <Field label="Atas Nama">
                    <input
                      value={draft.account_name}
                      onChange={(e) => setDraft((d) => ({ ...d, account_name: e.target.value }))}
                      placeholder="EMYU FASHION STORE"
                      className="input"
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Nama Provider">
                    <input
                      value={draft.provider}
                      onChange={(e) => setDraft((d) => ({ ...d, provider: e.target.value }))}
                      placeholder="DANA"
                      className="input"
                    />
                  </Field>
                  <Field label="Nomor">
                    <input
                      value={draft.number}
                      onChange={(e) => setDraft((d) => ({ ...d, number: e.target.value }))}
                      placeholder="08123456789"
                      className="input"
                    />
                  </Field>
                  <Field label="Nama Pemilik">
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                      placeholder="EMYU FASHION STORE"
                      className="input"
                    />
                  </Field>
                </>
              )}

              <Field label="Logo (opsional)">
                <div className="flex items-center gap-3">
                  {draft.logo_url && (
                    <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-border bg-white">
                      <Image src={draft.logo_url} alt="Logo" fill className="object-contain p-1" />
                    </div>
                  )}
                  <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 text-xs text-muted-foreground hover:bg-secondary">
                    <Upload className="h-3.5 w-3.5" />
                    {uploadingDraftLogo ? "..." : "Upload Logo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && uploadDraftLogo(e.target.files[0])}
                    />
                  </label>
                </div>
              </Field>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.is_active !== false}
                  onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-border"
                />
                Aktifkan metode pembayaran ini
              </label>
            </div>

            <button
              onClick={saveDraft}
              disabled={saving}
              className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-foreground py-2.5 text-sm font-medium text-background disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
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
