import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/utils";
import { DeleteButton } from "@/components/admin/delete-button";

export const dynamic = "force-dynamic";

export default async function AdminProductListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select("id, name, sku, price, stock, is_active, is_flash_sale, product_images(url, is_primary), categories(name)")
    .order("created_at", { ascending: false });

  if (q) query = query.ilike("name", `%${q}%`);

  const { data: products } = await query.limit(100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Produk</h1>
        <Link
          href="/admin/produk/baru"
          className="flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          <Plus className="h-4 w-4" />
          Tambah Produk
        </Link>
      </div>

      <form className="max-w-sm">
        <input
          name="q"
          defaultValue={q}
          placeholder="Cari produk..."
          className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none"
        />
      </form>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Produk</th>
              <th className="p-3">Kategori</th>
              <th className="p-3">Harga</th>
              <th className="p-3">Stok</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((p: any) => {
              const image = p.product_images?.find((i: any) => i.is_primary) ?? p.product_images?.[0];
              return (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-secondary">
                        {image && <Image src={image.url} alt="" fill className="object-cover" />}
                      </div>
                      <div>
                        <p className="line-clamp-1 font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{p.categories?.name ?? "-"}</td>
                  <td className="p-3">{formatRupiah(p.price)}</td>
                  <td className="p-3">{p.stock}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        p.is_active ? "bg-secondary" : "bg-destructive/20 text-destructive"
                      }`}
                    >
                      {p.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                    {p.is_flash_sale && (
                      <span className="ml-1 rounded-full bg-foreground px-2 py-1 text-xs text-background">
                        Flash Sale
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/produk/${p.id}`} className="text-xs underline">
                        Edit
                      </Link>
                      <DeleteButton table="products" id={p.id} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {(products ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                  Belum ada produk. Klik "Tambah Produk" untuk mulai.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
