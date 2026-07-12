"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ReturnReason } from "@/types/database";

type ReturnOrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  color_name: string | null;
  size_label: string | null;
  quantity: number;
};

const REASONS: { value: ReturnReason; label: string }[] = [
  { value: "damaged", label: "Barang rusak/cacat" },
  { value: "wrong_item", label: "Barang salah kirim" },
  { value: "not_as_described", label: "Tidak sesuai deskripsi" },
  { value: "wrong_size", label: "Ukuran tidak sesuai" },
  { value: "changed_mind", label: "Berubah pikiran" },
  { value: "other", label: "Lainnya" },
];

export function ReturnForm({ orderId, items }: { orderId: string; items: ReturnOrderItem[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [selectedItemId, setSelectedItemId] = useState(items.length === 1 ? items[0].id : "");
  const [reason, setReason] = useState<ReturnReason | "">("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    setFiles((prev) => [...prev, ...picked].slice(0, 3));
    e.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length > 1 && !selectedItemId) {
      toast.error("Pilih produk yang ingin diretur");
      return;
    }
    if (!reason) {
      toast.error("Pilih alasan retur dulu ya");
      return;
    }
    if (!description.trim()) {
      toast.error("Jelaskan sedikit masalahnya ya");
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi kamu berakhir, silakan masuk lagi.");

      const imageUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${orderId}/${Date.now()}-${i}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("returns")
          .upload(path, file, { upsert: false });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("returns").getPublicUrl(path);
        imageUrls.push(urlData.publicUrl);
      }

      const { error: insertError } = await supabase.from("returns").insert({
        order_id: orderId,
        order_item_id: selectedItemId || null,
        user_id: user.id,
        reason,
        description: description.trim(),
        images: imageUrls,
      });
      if (insertError) throw insertError;

      toast.success("Pengajuan retur berhasil dikirim. Kami akan meninjaunya segera.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim pengajuan retur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="premium-card space-y-4 p-5">
      {items.length > 1 && (
        <div>
          <p className="mb-2 text-xs text-muted-foreground">Pilih Produk</p>
          <div className="space-y-2">
            {items.map((item) => (
              <label
                key={item.id}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition ${
                  selectedItemId === item.id ? "border-foreground" : "border-border"
                }`}
              >
                <input
                  type="radio"
                  name="item"
                  checked={selectedItemId === item.id}
                  onChange={() => setSelectedItemId(item.id)}
                  className="h-4 w-4"
                />
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-secondary">
                  {item.product_image && (
                    <Image
                      src={item.product_image}
                      alt={item.product_name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm">{item.product_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {[item.color_name, item.size_label].filter(Boolean).join(", ")}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs text-muted-foreground">Alasan Retur</p>
        <div className="grid grid-cols-2 gap-2">
          {REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setReason(r.value)}
              className={`ripple rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition ${
                reason === r.value
                  ? "border-foreground bg-secondary"
                  : "border-border text-muted-foreground hover:bg-secondary/40"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs text-muted-foreground">Jelaskan Masalahnya</p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 500))}
          rows={4}
          className="w-full resize-none rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm outline-none transition focus:border-foreground/30 focus:ring-2 focus:ring-ring"
          placeholder="Ceritakan detail masalah pada produk yang diterima..."
        />
        <p className="mt-1 text-right text-[11px] text-muted-foreground">{description.length}/500</p>
      </div>

      <div>
        <p className="mb-1.5 text-xs text-muted-foreground">Foto Bukti (Opsional)</p>
        <div className="flex flex-wrap gap-2">
          {files.map((file, i) => (
            <div key={i} className="relative h-16 w-16 overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {files.length < 3 && (
            <label className="ripple flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-border text-muted-foreground transition hover:bg-secondary">
              <ImagePlus className="h-5 w-5" />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handleFilesSelected}
              />
            </label>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="ripple flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-3 text-sm font-semibold text-background transition active:scale-[0.98] disabled:opacity-60"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? "Mengirim..." : "Kirim Pengajuan Retur"}
      </button>
    </form>
  );
}
