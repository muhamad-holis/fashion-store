"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid2x2, Heart, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/produk", label: "Kategori", icon: Grid2x2 },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/akun", label: "Akun", icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin") || pathname.startsWith("/pembayaran")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 glass md:hidden">
      <div className="grid grid-cols-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 py-2.5 text-xs"
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
                strokeWidth={active ? 2.4 : 1.8}
              />
              <span className={cn(active ? "font-medium text-foreground" : "text-muted-foreground")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
