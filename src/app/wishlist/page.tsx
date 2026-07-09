"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { ProductCard, ProductCardSkeleton } from "@/components/product/product-card";
import { useCartBadgeStore } from "@/lib/store/cart-badge";

export default function WishlistPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const setWishlistCount = useCartBadgeStore((s) => s.setWishlistCount);

  useEffect(() => {
    (async () => {
      try {
        const { items } = await apiFetch("/api/wishlist");
        setItems(items ?? []);
        setWishlistCount(items?.length ?? 0);
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="container py-4">
      <h1 className="mb-4 text-lg font-semibold">Wishlist</h1>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <Heart className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Belum ada produk di wishlist kamu.</p>
          <Link href="/produk" className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background">
            Jelajahi Produk
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {items.map((item) => (
            <ProductCard key={item.id} product={item.products} />
          ))}
        </div>
      )}
    </div>
  );
}
