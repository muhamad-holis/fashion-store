"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { useCartBadgeStore } from "@/lib/store/cart-badge";
import type { CartItem } from "@/types/database";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const router = useRouter();
  const setCartCount = useCartBadgeStore((s) => s.setCartCount);

  async function loadCart() {
    setLoading(true);
    try {
      const { items } = await apiFetch("/api/cart");
      setItems(items ?? []);
      setCartCount(items?.length ?? 0);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCart();
  }, []);

  async function updateQty(id: string, quantity: number) {
    if (quantity < 1) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
    try {
      await apiFetch("/api/cart", { method: "PATCH", body: JSON.stringify({ id, quantity }) });
    } catch (e: any) {
      toast.error(e.message);
      loadCart();
    }
  }

  async function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await apiFetch(`/api/cart?id=${id}`, { method: "DELETE" });
      toast.success("Produk dihapus dari keranjang");
    } catch (e: any) {
      toast.error(e.message);
      loadCart();
    }
  }

  function applyCoupon() {
    if (!couponCode.trim()) return;
    // Validasi voucher sesungguhnya dilakukan di server saat checkout;
    // di sini hanya preview sederhana.
    toast.info("Voucher akan diverifikasi & diterapkan saat checkout");
    setCoupon({ code: couponCode.trim().toUpperCase(), discount: 0 });
  }

  const subtotal = items.reduce((sum, item) => {
    const price = item.product_variants?.price_override ?? item.products?.price ?? 0;
    return sum + price * item.quantity;
  }, 0);
  const totalWeight = items.reduce(
    (sum, item) => sum + (item.products?.weight_grams ?? 0) * item.quantity,
    0
  );

  if (loading) {
    return (
      <div className="container py-8 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container flex flex-col items-center justify-center gap-3 py-24 text-center">
        <ShoppingBag className="h-10 w-10 text-muted-foreground" />
        <p className="font-medium">Keranjangmu masih kosong</p>
        <Link
          href="/produk"
          className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background"
        >
          Mulai Belanja
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-4 pb-32">
      <h1 className="mb-4 text-lg font-semibold">Keranjang ({items.length})</h1>

      <div className="space-y-3">
        {items.map((item) => {
          const image = item.products?.product_images?.find((i) => i.is_primary) ?? item.products?.product_images?.[0];
          const price = item.product_variants?.price_override ?? item.products?.price ?? 0;
          return (
            <div key={item.id} className="flex gap-3 rounded-xl border border-border p-3">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-secondary">
                {image && <Image src={image.url} alt="" fill className="object-cover" />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between gap-2">
                  <p className="line-clamp-2 text-sm">{item.products?.name}</p>
                  <button onClick={() => removeItem(item.id)} aria-label="Hapus">
                    <Trash2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </div>
                {(item.product_variants?.colors?.name || item.product_variants?.sizes?.label) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.product_variants?.colors?.name} · {item.product_variants?.sizes?.label}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">{formatRupiah(price)}</span>
                  <div className="flex items-center gap-2 rounded-lg border border-border px-2 py-1">
                    <button onClick={() => updateQty(item.id, item.quantity - 1)}>
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-5 text-center text-xs">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, item.quantity + 1)}>
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-xl border border-border p-3">
        <p className="mb-2 text-sm font-medium">Punya Kode Voucher?</p>
        <div className="flex gap-2">
          <input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Masukkan kode voucher"
            className="flex-1 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none"
          />
          <button onClick={applyCoupon} className="rounded-lg border border-border px-4 text-sm">
            Pakai
          </button>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-background/95 p-4 backdrop-blur md:bottom-0">
        <div className="container flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Subtotal ({items.length} produk)</p>
            <p className="text-lg font-semibold">{formatRupiah(subtotal)}</p>
          </div>
          <button
            onClick={() => router.push("/checkout")}
            className="rounded-lg bg-foreground px-6 py-3 text-sm font-medium text-background"
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
