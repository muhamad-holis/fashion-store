"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Plus, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import { DeleteButton } from "@/components/admin/delete-button";
import type { Category } from "@/types/database";

export default function AdminCategoryPage() {
  const supabase = createClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase.from("categories").select("*").order("sort_order");
    setCategories(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fileName = `category-${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
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
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("categories").insert({
      name,
      slug: slugify(name),
      image_url: imageUrl || null,
      sort_order: categories.length,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Kategori ditambahkan");
    setName("");
    setImageUrl("");
    load();
  }

  async function toggleActive(id: string, isActive: boolean) {
    await supabase.from("categories").update({ is_active: !isActive }).eq("id", id);
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Kategori</h1>

      <div className="rounded-xl border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold">Tambah Kategori</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Nama Kategori</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Fashion Pria" />
          </div>
          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 text-xs text-muted-foreground">
            <Upload className="h-4 w-4" />
            {uploading ? "..." : imageUrl ? "Ganti Foto" : "Upload Foto"}
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>
          <button
            onClick={handleAdd}
            disabled={saving}
            className="flex h-10 items-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Tambah
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Foto</th>
              <th className="p-3">Nama</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="p-3">
                  <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-secondary">
                    {c.image_url && <Image src={c.image_url} alt="" fill className="object-cover" />}
                  </div>
                </td>
                <td className="p-3">{c.name}</td>
                <td className="p-3 text-muted-foreground">{c.slug}</td>
                <td className="p-3">
                  <button
                    onClick={() => toggleActive(c.id, c.is_active)}
                    className={`rounded-full px-2 py-1 text-xs ${c.is_active ? "bg-secondary" : "bg-destructive/20 text-destructive"}`}
                  >
                    {c.is_active ? "Aktif" : "Nonaktif"}
                  </button>
                </td>
                <td className="p-3">
                  <DeleteButton table="categories" id={c.id} label="kategori" onDeleted={load} />
                </td>
              </tr>
            ))}
            {!loading && categories.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                  Belum ada kategori.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
