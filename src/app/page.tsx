import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/product/product-card";
import { FlashSaleCountdown } from "@/components/product/flash-sale-countdown";
import { TrustBadges } from "@/components/home/trust-badges";
import type { Product, Category } from "@/types/database";

export const revalidate = 60;

async function getHomeData() {
  const supabase = await createClient();

  const [{ data: banners }, { data: categories }, { data: flashSale }, { data: newest }, { data: bestSeller }] =
    await Promise.all([
      supabase
        .from("banners")
        .select("*")
        .eq("placement", "hero")
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
      supabase
        .from("products")
        .select("*, product_images(*)")
        .eq("is_active", true)
        .eq("is_flash_sale", true)
        .limit(8),
      supabase
        .from("products")
        .select("*, product_images(*)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("products")
        .select("*, product_images(*)")
        .eq("is_active", true)
        .order("sold_count", { ascending: false })
        .limit(8),
    ]);

  return {
    banners: banners ?? [],
    categories: (categories as Category[]) ?? [],
    flashSale: (flashSale as Product[]) ?? [],
    newest: (newest as Product[]) ?? [],
    bestSeller: (bestSeller as Product[]) ?? [],
  };
}

export default async function HomePage() {
  const { banners, categories, flashSale, newest, bestSeller } = await getHomeData();

  // Ambil waktu berakhir flash sale yang PALING DEKAT dari produk-produk
  // yang sedang tayang, buat ditampilkan sebagai countdown asli (bukan
  // angka statis) di header section Flash Sale.
  const flashSaleEndTimes = flashSale
    .map((p) => p.flash_sale_end)
    .filter((t): t is string => !!t)
    .sort();
  const nearestFlashSaleEnd = flashSaleEndTimes[0];

  return (
    <div className="space-y-8 pt-4">
      {/* HERO BANNER */}
      <section className="container">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-secondary md:aspect-[21/9]">
          {banners[0] ? (
            <Image
              src={banners[0].image_url}
              alt={banners[0].title ?? "Promo"}
              fill
              priority
              className="object-cover"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <p className="text-2xl font-semibold tracking-tight">New Season Drop</p>
              <p className="text-sm text-muted-foreground">
                Tambahkan banner promo lewat Admin &gt; Banner
              </p>
            </div>
          )}
        </div>
      </section>

      {/* KATEGORI */}
      {categories.length > 0 && (
        <section className="container">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/produk?kategori=${cat.slug}`}
                className="flex shrink-0 flex-col items-center gap-2"
              >
                <div className="h-16 w-16 overflow-hidden rounded-full border border-border bg-secondary">
                  {cat.image_url && (
                    <Image src={cat.image_url} alt={cat.name} width={64} height={64} className="h-full w-full object-cover" />
                  )}
                </div>
                <span className="text-xs">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* TRUST BADGES */}
      <TrustBadges />

      {/* FLASH SALE */}
      {flashSale.length > 0 && (
        <SectionRow
          title="Flash Sale"
          icon={<Zap className="h-4 w-4 fill-current text-foreground" />}
          href="/produk?filter=flash-sale"
          products={flashSale}
          countdownEndsAt={nearestFlashSaleEnd}
        />
      )}

      {/* PRODUK TERBARU */}
      <SectionRow title="New Arrival" href="/produk?sort=terbaru" products={newest} />

      {/* PRODUK TERLARIS */}
      <SectionRow title="Terlaris" href="/produk?sort=terlaris" products={bestSeller} />
    </div>
  );
}

function SectionRow({
  title,
  icon,
  href,
  products,
  countdownEndsAt,
}: {
  title: string;
  icon?: React.ReactNode;
  href: string;
  products: Product[];
  countdownEndsAt?: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className="container">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <h2 className="flex shrink-0 items-center gap-1.5 text-base font-semibold">
            {icon}
            {title}
          </h2>
          {countdownEndsAt && <FlashSaleCountdown endTime={countdownEndsAt} />}
        </div>
        <Link href={href} className="flex shrink-0 items-center text-xs text-muted-foreground">
          Lihat Semua <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
