"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Upload, X, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import type { Category, Color, Size, SizeChart } from "@/types/database";

interface ImageItem {
  url: string;
  is_primary: boolean;
  isNew?: boolean;
}

interface Props {
  productId?: string; // jika ada -> mode edit
}

export function ProductForm({ productId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const isEdit = Boolean(productId);

  const [categories, setCategories] = useState<Category[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [sizeCharts, setSizeCharts] = useState<SizeChart[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    sku: "",
    category_id: "",
    description: "",
    material_detail: "",
    size_guide: "",
    size_chart_id: "",
    price: "",
    compare_at_price: "",
    weight_grams: "500",
    stock: "0",
    estimated_ship_days: "2-4 hari",
    is_flash_sale: false,
    is_new_arrival: true,
    is_active: true,
    meta_title: "",
    meta_description: "",
  });

  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);
  const [selectedSizeIds, setSelectedSizeIds] = useState<string[]>([]);
  const [variantStock, setVariantStock] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const [{ data: cats }, { data: cols }, { data: szs }, { data: charts }] = await Promise.all([
        supabase.from("categories").select("*").order("sort_order"),
        supabase.from("colors").select("*"),
        supabase.from("sizes").select("*").order("sort_order"),
        supabase.from("size_charts").select("*").order("name"),
      ]);
      setCategories(cats ?? []);
      setColors(cols ?? []);
      setSizes(szs ?? []);
      setSizeCharts(charts ?? []);

      if (productId) {
        const { data: product } = await supabase
          .from("products")
          .select("*, product_images(*), product_variants(*, colors(id), sizes(id))")
          .eq("id", productId)
          .maybeSingle();

        if (product) {
          setForm({
            name: product.name,
            slug: product.slug,
            sku: product.sku,
            category_id: product.category_id ?? "",
            description: product.description ?? "",
            material_detail: product.material_detail ?? "",
            size_guide: product.size_guide ?? "",
            size_chart_id: product.size_chart_id ?? "",
            price: String(product.price),
            compare_at_price: product.compare_at_price ? String(product.compare_at_price) : "",
            weight_grams: String(product.weight_grams),
            stock: String(product.stock),
            estimated_ship_days: product.estimated_ship_days ?? "2-4 hari",
            is_flash_sale: product.is_flash_sale,
            is_new_arrival: product.is_new_arrival,
            is_active: product.is_active,
            meta_title: product.meta_title ?? "",
            meta_description: product.meta_description ?? "",
          });
          setImages(
            (product.product_images ?? [])
              .sort((a: any, b: any) => a.sort_order - b.sort_order)
              .map((i: any) => ({ url: i.url, is_primary: i.is_primary }))
          );
          const colorIds = Array.from(
            new Set((product.product_variants ?? []).map((v: any) => v.colors?.id).filter(Boolean))
          ) as string[];
          const sizeIds = Array.from(
            new Set((product.product_variants ?? []).map((v: any) => v.sizes?.id).filter(Boolean))
          ) as string[];
          setSelectedColorIds(colorIds);
          setSelectedSizeIds(sizeIds);
          const stockMap: Record<string, number> = {};
          (product.product_variants ?? []).forEach((v: any) => {
            stockMap[`${v.colors?.id ?? "none"}_${v.sizes?.id ?? "none"}`] = v.stock;
          });
          setVariantStock(stockMap);
        }
        setLoading(false);
      }
    })();
  }, [productId]);

  function handleNameChange(name: string) {
    setForm((f) => ({ ...f, name, slug: isEdit ? f.slug : slugify(name) }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: ImageItem[] = [];
      for (const file of Array.from(files)) {
        const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
        const { error } = await supabase.storage.from("products").upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage.from("products").getPublicUrl(fileName);
        uploaded.push({ url: data.publicUrl, is_primary: false });
      }
      setImages((prev) => {
        const next = [...prev, ...uploaded];
        if (!next.some((i) => i.is_primary) && next.length > 0) next[0].is_primary = true;
        return next;
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  function removeImage(url: string) {
    setImages((prev) => {
      const next = prev.filter((i) => i.url !== url);
      if (next.length > 0 && !next.some((i) => i.is_primary)) next[0].is_primary = true;
      return next;
    });
  }

  function setPrimary(url: string) {
    setImages((prev) => prev.map((i) => ({ ...i, is_primary: i.url === url })));
  }

  function toggleColor(id: string) {
    setSelectedColorIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }
  function toggleSize(id: string) {
    setSelectedSizeIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  const variantCombos = (() => {
    if (selectedColorIds.length === 0 && selectedSizeIds.length === 0) return [];
    const colorList = selectedColorIds.length > 0 ? selectedColorIds : [undefined];
    const sizeList = selectedSizeIds.length > 0 ? selectedSizeIds : [undefined];
    const combos: { colorId?: string; sizeId?: string; key: string }[] = [];
    colorList.forEach((c) => {
      sizeList.forEach((s) => {
        combos.push({ colorId: c, sizeId: s, key: `${c ?? "none"}_${s ?? "none"}` });
      });
    });
    return combos;
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.sku || !form.price) {
      toast.error("Nama, SKU, dan harga wajib diisi");
      return;
    }
    setSaving(true);

    try {
      const payload = {
        name: form.name,
        slug: form.slug || slugify(form.name),
        sku: form.sku,
        category_id: form.category_id || null,
        description: form.description || null,
        material_detail: form.material_detail || null,
        size_guide: form.size_guide || null,
        size_chart_id: form.size_chart_id || null,
        price: Number(form.price),
        compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
        discount_percent:
          form.compare_at_price && Number(form.compare_at_price) > Number(form.price)
            ? Math.round(((Number(form.compare_at_price) - Number(form.price)) / Number(form.compare_at_price)) * 100)
            : 0,
        weight_grams: Number(form.weight_grams),
        stock: Number(form.stock),
        estimated_ship_days: form.estimated_ship_days,
        is_flash_sale: form.is_flash_sale,
        is_new_arrival: form.is_new_arrival,
        is_active: form.is_active,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
      };

      let currentId = productId;

      if (isEdit && currentId) {
        const { error } = await supabase.from("products").update(payload).eq("id", currentId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select().single();
        if (error) throw error;
        currentId = data.id;
      }

      // Simpan ulang gambar
      await supabase.from("product_images").delete().eq("product_id", currentId);
      if (images.length > 0) {
        await supabase.from("product_images").insert(
          images.map((img, idx) => ({
            product_id: currentId,
            url: img.url,
            sort_order: idx,
            is_primary: img.is_primary,
          }))
        );
      }

      // Simpan ulang variant (hapus semua lalu insert ulang - sederhana & aman untuk admin panel)
      await supabase.from("product_variants").delete().eq("product_id", currentId);
      if (variantCombos.length > 0) {
        await supabase.from("product_variants").insert(
          variantCombos.map((c) => ({
            product_id: currentId,
            color_id: c.colorId ?? null,
            size_id: c.sizeId ?? null,
            stock: variantStock[c.key] ?? 0,
          }))
        );
      }

      toast.success(isEdit ? "Produk berhasil diperbarui" : "Produk berhasil ditambahkan");
      router.push("/admin/produk");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <Section title="Informasi Dasar">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nama Produk">
            <input
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Slug URL">
            <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="input" />
          </Field>
          <Field label="SKU">
            <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input" />
          </Field>
          <Field label="Kategori">
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="input"
            >
              <option value="">Pilih kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Deskripsi">
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            className="input"
          />
        </Field>
        <Field label="Detail Bahan">
          <textarea
            value={form.material_detail}
            onChange={(e) => setForm({ ...form, material_detail: e.target.value })}
            rows={2}
            className="input"
          />
        </Field>
        <Field label="Panduan Ukuran">
          <textarea
            value={form.size_guide}
            onChange={(e) => setForm({ ...form, size_guide: e.target.value })}
            rows={2}
            className="input"
          />
        </Field>
        <Field label="Size Chart (tabel ukuran interaktif)">
          <select
            value={form.size_chart_id}
            onChange={(e) => setForm({ ...form, size_chart_id: e.target.value })}
            className="input"
          >
            <option value="">Tidak pakai size chart</option>
            {sizeCharts.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Kelola daftar size chart di menu Size Chart pada sidebar.
          </p>
        </Field>
      </Section>

      <Section title="Harga & Stok">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Harga Jual">
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input" />
          </Field>
          <Field label="Harga Coret (opsional)">
            <input
              type="number"
              value={form.compare_at_price}
              onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Berat (gram)">
            <input
              type="number"
              value={form.weight_grams}
              onChange={(e) => setForm({ ...form, weight_grams: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Stok Utama (jika tanpa varian)">
            <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="input" />
          </Field>
          <Field label="Estimasi Kirim">
            <input
              value={form.estimated_ship_days}
              onChange={(e) => setForm({ ...form, estimated_ship_days: e.target.value })}
              className="input"
            />
          </Field>
        </div>
      </Section>

      <Section title="Foto Produk">
        <div className="flex flex-wrap gap-3">
          {images.map((img) => (
            <div key={img.url} className="group relative h-24 w-24 overflow-hidden rounded-lg border border-border">
              <Image src={img.url} alt="" fill className="object-cover" />
              <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition group-hover:opacity-100">
                <button type="button" onClick={() => setPrimary(img.url)} title="Jadikan utama">
                  <Star className={`h-4 w-4 text-white ${img.is_primary ? "fill-white" : ""}`} />
                </button>
                <button type="button" onClick={() => removeImage(img.url)} title="Hapus">
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
              {img.is_primary && (
                <span className="absolute left-1 top-1 rounded bg-foreground px-1 text-[9px] text-background">
                  Utama
                </span>
              )}
            </div>
          ))}
          <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground">
            <Upload className="h-4 w-4" />
            {uploading ? "Upload..." : "Tambah"}
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
          </label>
        </div>
      </Section>

      <Section title="Varian (Warna & Ukuran)">
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">Warna tersedia</p>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => toggleColor(c.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${
                    selectedColorIds.includes(c.id) ? "border-foreground" : "border-border"
                  }`}
                >
                  <span className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: c.hex_code }} />
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">Ukuran tersedia</p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => toggleSize(s.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs ${
                    selectedSizeIds.includes(s.id) ? "border-foreground bg-foreground text-background" : "border-border"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {variantCombos.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-secondary/40">
                  <tr>
                    <th className="p-2 text-left">Warna</th>
                    <th className="p-2 text-left">Ukuran</th>
                    <th className="p-2 text-left">Stok</th>
                  </tr>
                </thead>
                <tbody>
                  {variantCombos.map((c) => {
                    const color = colors.find((col) => col.id === c.colorId);
                    const size = sizes.find((s) => s.id === c.sizeId);
                    return (
                      <tr key={c.key} className="border-t border-border">
                        <td className="p-2">{color?.name ?? "-"}</td>
                        <td className="p-2">{size?.label ?? "-"}</td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={variantStock[c.key] ?? 0}
                            onChange={(e) =>
                              setVariantStock((prev) => ({ ...prev, [c.key]: Number(e.target.value) }))
                            }
                            className="w-20 rounded border border-border bg-secondary/50 px-2 py-1"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Section>

      <Section title="SEO">
        <Field label="Meta Title">
          <input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} className="input" />
        </Field>
        <Field label="Meta Description">
          <textarea
            value={form.meta_description}
            onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
            rows={2}
            className="input"
          />
        </Field>
      </Section>

      <Section title="Status">
        <div className="flex flex-wrap gap-4">
          <Toggle label="Aktif (tampil di toko)" checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
          <Toggle label="Flash Sale" checked={form.is_flash_sale} onChange={(v) => setForm({ ...form, is_flash_sale: v })} />
          <Toggle label="New Arrival" checked={form.is_new_arrival} onChange={(v) => setForm({ ...form, is_new_arrival: v })} />
        </div>
      </Section>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-foreground px-6 py-3 text-sm font-medium text-background disabled:opacity-50"
      >
        {saving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Produk"}
      </button>
    </form>
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

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
      {label}
    </label>
  );
}
