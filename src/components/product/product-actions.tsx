"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Heart, Share2, Link as LinkIcon, Minus, Plus, Ruler } from "lucide-react";
import { formatRupiah, cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { useCartBadgeStore } from "@/lib/store/cart-badge";
import { SizeChartModal } from "@/components/product/size-chart-modal";
import type { Product, ProductVariant } from "@/types/database";

export function ProductActions({ product }: { product: Product }) {
  const router = useRouter();
  const variants = product.product_variants ?? [];
  const uniqueColors = useMemo(
    () => dedupe(variants.map((v) => v.colors).filter((c): c is NonNullable<typeof c> => Boolean(c))),
    [variants]
  );
  const uniqueSizes = useMemo(
    () => dedupe(variants.map((v) => v.sizes).filter((s): s is NonNullable<typeof s> => Boolean(s))),
    [variants]
  );

  const [colorId, setColorId] = useState<string | undefined>(uniqueColors[0]?.id);
  const [sizeId, setSizeId] = useState<string | undefined>(uniqueSizes[0]?.id);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const setCartCount = useCartBadgeStore((s) => s.setCartCount);

  const selectedVariant = variants.find(
    (v) => (v.color_id ?? null) === (colorId ?? null) && (v.size_id ?? null) === (sizeId ?? null)
  );
  const stock = selectedVariant ? selectedVariant.stock : product.stock;
  const price = selectedVariant?.price_override ?? product.price;

  async function addToCart(goToCheckout = false) {
    if (variants.length > 0 && !selectedVariant) {
      toast.error("Pilih warna dan ukuran terlebih dahulu");
      return;
    }
    if (stock < qty) {
      toast.error("Stok tidak mencukupi");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/cart", {
        method: "POST",
        body: JSON.stringify({
          product_id: product.id,
          variant_id: selectedVariant?.id ?? null,
          quantity: qty,
        }),
      });
      toast.success("Ditambahkan ke keranjang");
      const { items } = await apiFetch("/api/cart");
      setCartCount(items?.length ?? 0);
      if (goToCheckout) router.push("/cart");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleWishlist() {
    try {
      const { wishlisted } = await apiFetch("/api/wishlist", {
        method: "POST",
        body: JSON.stringify({ product_id: product.id }),
      });
      toast.success(wishlisted ? "Ditambahkan ke wishlist" : "Dihapus dari wishlist");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link disalin");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold">{formatRupiah(price)}</span>
        {product.compare_at_price && product.compare_at_price > price && (
          <span className="text-sm text-muted-foreground line-through">
            {formatRupiah(product.compare_at_price)}
          </span>
        )}
      </div>

      {uniqueColors.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Warna</p>
          <div className="flex flex-wrap gap-2">
            {uniqueColors.map((c) => (
              <button
                key={c!.id}
                onClick={() => setColorId(c!.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition",
                  colorId === c!.id ? "border-foreground" : "border-border"
                )}
              >
                <span
                  className="h-4 w-4 rounded-full border border-border"
                  style={{ backgroundColor: c!.hex_code }}
                />
                {c!.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {uniqueSizes.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Ukuran</p>
            {product.size_charts && (
              <button
                type="button"
                onClick={() => setShowSizeChart(true)}
                className="flex items-center gap-1 text-xs font-medium text-blue-600"
              >
                <Ruler className="h-3.5 w-3.5" />
                Lihat Size Chart
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {uniqueSizes.map((s) => (
              <button
                key={s!.id}
                onClick={() => setSizeId(s!.id)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm transition",
                  sizeId === s!.id ? "border-foreground bg-foreground text-background" : "border-border"
                )}
              >
                {s!.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showSizeChart && product.size_charts && (
        <SizeChartModal chart={product.size_charts} onClose={() => setShowSizeChart(false)} />
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Jumlah</p>
        <div className="flex items-center gap-3 rounded-lg border border-border px-2 py-1">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Kurangi">
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-6 text-center text-sm">{qty}</span>
          <button onClick={() => setQty((q) => Math.min(stock, q + 1))} aria-label="Tambah">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Stok tersedia: {stock} · Estimasi kirim {product.estimated_ship_days}
      </p>

      <div className="flex gap-2">
        <button
          onClick={toggleWishlist}
          className="rounded-lg border border-border p-3"
          aria-label="Wishlist"
        >
          <Heart className="h-5 w-5" />
        </button>
        <button onClick={copyLink} className="rounded-lg border border-border p-3" aria-label="Salin link">
          <LinkIcon className="h-5 w-5" />
        </button>
        <button
          disabled={loading || stock === 0}
          onClick={() => addToCart(false)}
          className="flex-1 rounded-lg border border-foreground py-3 text-sm font-medium transition hover:bg-secondary disabled:opacity-40"
        >
          Tambah Keranjang
        </button>
        <button
          disabled={loading || stock === 0}
          onClick={() => addToCart(true)}
          className="flex-1 rounded-lg bg-foreground py-3 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-40"
        >
          Beli Sekarang
        </button>
      </div>
    </div>
  );
}

function dedupe<T extends { id: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
