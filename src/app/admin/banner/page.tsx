"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Plus, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DeleteButton } from "@/components/admin/delete-button";

interface Banner {
  id: string;
  title: string | null;
  image_url: string;
  link_url: string | null;
  placement: string;
  is_active: boolean;
}

export default function AdminBannerPage() {
  const supabase = createClient();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [placement, setPlacement] = useState("hero");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase.from("banners").select("*").order("sort_order");
    setBanners(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { error } = await supabase.storage.from("banner").upload(fileName, file);
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("banner").getPublicUrl(fileName);
    setImageUrl(data.publicUrl);
    setUploading(false);
  }

  async function handleAdd() {
    if (!imageUrl) {
      toast.error("Upload gambar banner terlebih dahulu");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("banners").insert({
      title: title || null,
      image_url: imageUrl,
      link_url: linkUrl || null,
      placement,
      sort_order: banners.length,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Banner ditambahkan");
    setTitle("");
    setLinkUrl("");
    setImageUrl("");
    load();
  }

  async function toggleActive(id: string, isActive: boolean) {
    await supabase.from("banners").update({ is_active: !isActive }).eq("id", id);
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Banner</h1>

      <div className="rounded-xl border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold">Tambah Banner</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Judul (opsional)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Link Tujuan (opsional)</label>
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="/produk?kategori=..." className="input" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Penempatan</label>
            <select value={placement} onChange={(e) => setPlacement(e.target.value)} className="input">
              <option value="hero">Hero (halaman utama)</option>
              <option value="promo">Promo</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Gambar</label>
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 text-xs text-muted-foreground">
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : imageUrl ? "Ganti Gambar" : "Upload Gambar"}
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </label>
          </div>
        </div>
        {imageUrl && (
          <div className="relative mt-3 aspect-[21/9] w-full max-w-md overflow-hidden rounded-lg bg-secondary">
            <Image src={imageUrl} alt="" fill className="object-cover" />
          </div>
        )}
        <button
          onClick={handleAdd}
          disabled={saving}
          className="mt-3 flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Tambah Banner
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {banners.map((b) => (
          <div key={b.id} className="rounded-xl border border-border p-3">
            <div className="relative mb-2 aspect-[21/9] w-full overflow-hidden rounded-lg bg-secondary">
              <Image src={b.image_url} alt="" fill className="object-cover" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>{b.title || "(tanpa judul)"} · {b.placement}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(b.id, b.is_active)}
                  className={`rounded-full px-2 py-1 text-xs ${b.is_active ? "bg-secondary" : "bg-destructive/20 text-destructive"}`}
                >
                  {b.is_active ? "Aktif" : "Nonaktif"}
                </button>
                <DeleteButton table="banners" id={b.id} label="banner" onDeleted={load} />
              </div>
            </div>
          </div>
        ))}
        {!loading && banners.length === 0 && (
          <p className="text-sm text-muted-foreground">Belum ada banner.</p>
        )}
      </div>
    </div>
  );
}
