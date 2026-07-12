"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { BUILT_ROUTES, buildAccountMenu } from "@/components/account/menu-items";

// Sidebar akun khusus desktop/tablet (md ke atas). Di HP, navigasi antar
// menu akun tetap lewat daftar menu yang sudah ada di halaman /akun
// (MenuList) - komponen ini TIDAK dipakai di layar kecil (lihat
// `hidden md:block` di pemanggilnya, src/app/akun/layout.tsx), jadi tidak
// ada perubahan apa pun di tampilan mobile.
export function AccountSidebar({
  wishlistCount,
  unreadNotifCount,
  whatsapp,
}: {
  wishlistCount?: number;
  unreadNotifCount?: number;
  whatsapp?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const items = buildAccountMenu({ wishlistCount, unreadNotifCount, whatsapp });

  async function handleSignOut(e: React.MouseEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message || "Gagal keluar");
      return;
    }
    toast.success("Berhasil keluar");
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="hidden md:block">
      <nav className="premium-card sticky top-20 divide-y divide-border overflow-hidden">
        {items.map((item) => {
          const Icon = item.icon;
          const isDanger = item.action === "signout";
          const active = !isDanger && !!item.href && pathname.startsWith(item.href);

          if (isDanger) {
            return (
              <button
                key={item.label}
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-red-400 transition hover:bg-red-500/10"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          }

          const isPlaceholder = item.href && !item.external && !BUILT_ROUTES.has(item.href);

          return (
            <Link
              key={item.label}
              href={item.href ?? "#"}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              onClick={(e) => {
                if (isPlaceholder) {
                  e.preventDefault();
                  toast("Fitur ini akan segera hadir", {
                    description: `${item.label} sedang kami siapkan.`,
                  });
                }
              }}
              className={cn(
                "flex items-center gap-2.5 px-4 py-3 text-sm transition hover:bg-secondary/50",
                active ? "bg-secondary/60 font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && (
                <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px]">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
