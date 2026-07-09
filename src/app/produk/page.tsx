import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/product/product-card";
import { ProductFilters } from "@/components/product/product-filters";
import type { Product, Category, Color, Size } from "@/types/database";
import { SlidersHorizontal } from "lucide-react";

export const revalidate = 30;

interface SearchParams {
  q?: string;
  kategori?: string;
  sort?: string;
  min?: string;
  max?: string;
  warna?: string;
  ukuran?: string;
  rating?: string;
  filter?: string;
}

async function getProducts(params: SearchParams) {
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select(
      "*, product_images(*), categories(name, slug), product_variants(colors(name, hex_code), sizes(label))",
      { count: "exact" }
    )
    .eq("is_active", true);

  if (params.q) query = query.ilike("name", `%${params.q}%`);
  if (params.kategori) query = query.eq("categories.slug", params.kategori);
  if (params.min) query = query.gte("price", Number(params.min));
  if (params.max) query = query.lte("price", Number(params.max));
  if (params.rating) query = query.gte("rating_avg", Number(params.rating));
  if (params.filter === "flash-sale") query = query.eq("is_flash_sale", true);

  switch (params.sort) {
    case "terbaru":
      query = query.order("created_at", { ascending: false });
      break;
    case "terlaris":
      query = query.order("sold_count", { ascending: false });
      break;
    case "harga-rendah":
      query = query.order("price", { ascending: true });
      break;
    case "harga-tinggi":
      query = query.order("price", { ascending: false });
      break;
    case "rating":
      query = query.order("rating_avg", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, count } = await query.limit(40);
  return { products: (data as Product[]) ?? [], count: count ?? 0 };
}

async function getFilterData() {
  const supabase = await createClient();
  const [{ data: categories }, { data: colors }, { data: sizes }] = await Promise.all([
    supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("colors").select("*"),
    supabase.from("sizes").select("*").order("sort_order"),
  ]);
  return {
    categories: (categories as Category[]) ?? [],
    colors: (colors as Color[]) ?? [],
    sizes: (sizes as Size[]) ?? [],
  };
}

export default async function ProductListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [{ products, count }, filterData] = await Promise.all([
    getProducts(params),
    getFilterData(),
  ]);

  return (
    <div className="container py-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">
            {params.q ? `Hasil untuk "${params.q}"` : "Semua Produk"}
          </h1>
          <p className="text-xs text-muted-foreground">{count} produk ditemukan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
        <aside className="hidden md:block">
          <ProductFilters {...filterData} currentParams={params} />
        </aside>

        <div>
          <div className="mb-3 flex items-center justify-between md:hidden">
            <ProductFilters {...filterData} currentParams={params} mobile />
          </div>

          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
              <SlidersHorizontal className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Belum ada produk yang cocok dengan filter ini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
