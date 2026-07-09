import Link from "next/link";
import Image from "next/image";
import { Star, Heart } from "lucide-react";
import { formatRupiah, getDiscountPercent } from "@/lib/utils";
import type { Product } from "@/types/database";

export function ProductCard({ product }: { product: Product }) {
  const image = product.product_images?.find((i) => i.is_primary) ?? product.product_images?.[0];
  const discount =
    product.discount_percent || getDiscountPercent(product.price, product.compare_at_price);

  return (
    <Link
      href={`/produk/${product.slug}`}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition hover:border-foreground/20"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
        {image ? (
          <Image
            src={image.url}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="skeleton h-full w-full" />
        )}

        {discount > 0 && (
          <span className="absolute left-2 top-2 rounded-md bg-foreground px-1.5 py-0.5 text-[11px] font-semibold text-background">
            -{discount}%
          </span>
        )}

        <button
          aria-label="Tambah ke wishlist"
          className="absolute right-2 top-2 rounded-full bg-background/70 p-1.5 backdrop-blur transition hover:bg-background"
        >
          <Heart className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1 p-2.5">
        <p className="line-clamp-2 text-[13px] leading-snug">{product.name}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold">{formatRupiah(product.price)}</span>
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-[11px] text-muted-foreground line-through">
              {formatRupiah(product.compare_at_price)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Star className="h-3 w-3 fill-current" />
          <span>{product.rating_avg.toFixed(1)}</span>
          <span>·</span>
          <span>{product.sold_count} terjual</span>
        </div>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="skeleton aspect-[3/4] w-full" />
      <div className="space-y-2 p-2.5">
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-2/3 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
      </div>
    </div>
  );
}
