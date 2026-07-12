"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Heart, ShoppingBag, Home, Grid2x2, UserRound, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/client";

// Link navigasi utama yang muncul sebagai teks di header MULAI breakpoint
// md - ini pengganti bottom nav (yang disembunyikan lewat `md:hidden` di
// BottomNav) untuk layar tablet/desktop. Tanpa ini, di layar lebar tidak
// ada cara untuk pindah ke halaman Kategori sama sekali.
const DESKTOP_NAV_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/produk", label: "Kategori", icon: Grid2x2 },
];

export function SiteHeader({ storeName = "Fashion Store" }: { storeName?: string }) {
  const [query, setQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

  // Ambil jumlah notifikasi belum dibaca untuk badge di ikon lonceng.
  // Di-refetch tiap pindah halaman (dependency [pathname]) supaya badge
  // ikut update setelah user buka halaman notifikasi dan menandainya
  // terbaca, tanpa perlu realtime subscription yang lebih berat.
  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (active) setUnreadCount(0);
        return;
      }
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (active) setUnreadCount(count ?? 0);
    })();
    return () => {
      active = false;
    };
  }, [pathname]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/pembayaran")) return null;

  // Halaman Akun fokus ke profil/pesanan/pengaturan, bukan pencarian produk -
  // marketplace besar (Shopee, TikTok Shop, dll) juga tidak menampilkan search
  // bar di tab akun. Header (logo + ikon) tetap tampil, cuma search bar-nya saja
  // yang disembunyikan.
  const hideSearch = pathname.startsWith("/akun");

  return (
    <header className="sticky top-0 z-40 glass">
      <div className="container flex h-16 items-center gap-3">
        <Link href="/" className="shrink-0 text-lg font-semibold tracking-tight">
          {storeName}
        </Link>

        {/* Nav teks Home/Kategori - hanya tampil mulai md, di HP navigasi
            yang sama sudah tersedia lewat bottom nav. */}
        <nav className="hidden shrink-0 items-center gap-1 md:flex">
          {DESKTOP_NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-2 text-sm transition hover:bg-secondary",
                  active ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {!hideSearch && (
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
        )}

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link
            href="/produk"
            className="hidden rounded-full p-2.5 transition hover:bg-secondary md:hidden"
          >
            <Search className="h-5 w-5" />
          </Link>
          <ThemeToggle />
          {/* Notifikasi - tampil di semua ukuran layar, karena sebelum ini
              notifikasi tidak punya akses cepat sama sekali baik di HP
              maupun desktop (cuma nyempil di dalam menu Akun). */}
          <Link
            href="/akun/notifikasi"
            className="relative rounded-full p-2.5 transition hover:bg-secondary"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
            )}
          </Link>
          {/* Wishlist digeser jadi khusus md+ - di HP sudah ada tab
              tersendiri di bottom nav, jadi ikon ini di header cuma perlu
              tampil di desktop/tablet (tempat bottom nav disembunyikan),
              supaya header HP tidak terlalu penuh ikon. */}
          <Link
            href="/wishlist"
            className="hidden rounded-full p-2.5 transition hover:bg-secondary md:inline-flex"
          >
            <Heart className="h-5 w-5" />
          </Link>
          <Link href="/cart" className="rounded-full p-2.5 transition hover:bg-secondary">
            <ShoppingBag className="h-5 w-5" />
          </Link>
          {/* Akun hanya ditambahkan di sini untuk md+ - di HP sudah ada
              lewat bottom nav, jadi tidak perlu dobel. Tanpa ini, halaman
              Akun sama sekali tidak bisa dijangkau dari layar lebar. */}
          <Link
            href="/akun"
            className={cn(
              "hidden rounded-full p-2.5 transition hover:bg-secondary md:inline-flex",
              pathname.startsWith("/akun") ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <UserRound className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Search bar khusus mobile di bawah baris atas */}
      {!hideSearch && (
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
      )}
    </header>
  );
}
