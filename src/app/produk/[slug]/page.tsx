import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductActions } from "@/components/product/product-actions";
import { ProductCard } from "@/components/product/product-card";
import { formatDate } from "@/lib/utils";
import type { Product } from "@/types/database";

export const revalidate = 60;

async function getProduct(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(
      "*, product_images(*), product_videos(*), product_variants(*, colors(*), sizes(*)), categories(name, slug), reviews(*)"
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data as (Product & { reviews: any[] }) | null;
}

async function getRelated(categoryId: string | null, excludeId: string) {
  if (!categoryId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, product_images(*)")
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .neq("id", excludeId)
    .limit(4);
  return (data as Product[]) ?? [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};

  return {
    title: product.meta_title || product.name,
    description: product.meta_description || product.description?.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.description?.slice(0, 160),
      images: product.product_images?.[0]?.url ? [product.product_images[0].url] : [],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const related = await getRelated(product.category_id, product.id);

  return (
    <div className="container py-4">
      <div className="grid gap-6 md:grid-cols-2">
        <ProductGallery images={product.product_images ?? []} videos={product.product_videos ?? []} />

        <div>
          <p className="text-xs text-muted-foreground">{product.categories?.name}</p>
          <h1 className="mt-1 text-xl font-semibold leading-snug">{product.name}</h1>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-current" />
              {product.rating_avg.toFixed(1)} ({product.review_count} ulasan)
            </span>
            <span>·</span>
            <span>{product.sold_count} terjual</span>
            <span>·</span>
            <span>SKU {product.sku}</span>
          </div>

          <div className="my-5 border-t border-border" />

          <ProductActions product={product} />

          <div className="mt-4 rounded-xl border border-border p-4 text-sm">
            <p className="mb-1.5 font-medium">Estimasi Pengiriman</p>
            <p className="text-muted-foreground">
              Dikirim dalam {product.estimated_ship_days}. Ongkir dihitung otomatis saat checkout
              berdasarkan alamat dan berat produk ({product.weight_grams} gram).
            </p>
          </div>
        </div>
      </div>

      {/* DESKRIPSI & DETAIL */}
      <div className="mt-10 max-w-2xl space-y-6">
        <Section title="Deskripsi Produk">
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {product.description || "Belum ada deskripsi untuk produk ini."}
          </p>
        </Section>

        {product.material_detail && (
          <Section title="Detail Bahan">
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {product.material_detail}
            </p>
          </Section>
        )}

        {product.size_guide && (
          <Section title="Panduan Ukuran">
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {product.size_guide}
            </p>
          </Section>
        )}

        <Section title={`Ulasan Pembeli (${product.review_count})`}>
          {product.reviews && product.reviews.length > 0 ? (
            <div className="space-y-4">
              {product.reviews
                .filter((r) => r.is_visible)
                .map((r) => (
                  <div key={r.id} className="border-b border-border pb-4 last:border-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{r.reviewer_name}</p>
                      <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
                    </div>
                    <div className="my-1 flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < r.rating ? "fill-current" : "text-muted-foreground"}`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">{r.comment}</p>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada ulasan untuk produk ini.</p>
          )}
        </Section>
      </div>

      {related.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-base font-semibold">Produk Serupa</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-base font-semibold">{title}</h2>
      {children}
    </div>
  );
}
