"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Search, Heart, ShoppingBag, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader({ storeName = "Fashion Store" }: { storeName?: string }) {
  const [query, setQuery] = useState("");
  const pathname = usePathname();

  if (pathname.startsWith("/admin") || pathname.startsWith("/pembayaran")) return null;

  return (
    <header className="sticky top-0 z-40 glass">
      <div className="container flex h-16 items-center gap-3">
        <Link href="/" className="shrink-0 text-lg font-semibold tracking-tight">
          {storeName}
        </Link>

        <form
          action="/produk"
          className="relative hidden flex-1 md:block"
          onSubmit={(e) => {
            if (!query.trim()) e.preventDefault();
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari produk, kategori, atau brand..."
            className="w-full rounded-full border border-border bg-secondary/60 py-2.5 pl-10 pr-4 text-sm outline-none ring-ring transition focus:ring-2"
          />
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link
            href="/produk"
            className="hidden rounded-full p-2.5 transition hover:bg-secondary md:hidden"
          >
            <Search className="h-5 w-5" />
          </Link>
          <ThemeToggle />
          <Link href="/wishlist" className="rounded-full p-2.5 transition hover:bg-secondary">
            <Heart className="h-5 w-5" />
          </Link>
          <Link href="/cart" className="rounded-full p-2.5 transition hover:bg-secondary">
            <ShoppingBag className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Search bar khusus mobile di bawah baris atas */}
      <div className="container pb-3 md:hidden">
        <form action="/produk" className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            placeholder="Cari produk..."
            className="w-full rounded-full border border-border bg-secondary/60 py-2.5 pl-10 pr-4 text-sm outline-none ring-ring transition focus:ring-2"
          />
        </form>
      </div>
    </header>
  );
}
