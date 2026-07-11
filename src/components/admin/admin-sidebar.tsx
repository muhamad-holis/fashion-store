"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Image as ImageIcon,
  Zap,
  Ticket,
  ShoppingCart,
  Users,
  Star,
  CreditCard,
  QrCode,
  Truck,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const menuGroups = [
  {
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Katalog",
    items: [
      { href: "/admin/produk", label: "Produk", icon: Package },
      { href: "/admin/kategori", label: "Kategori", icon: FolderTree },
      { href: "/admin/banner", label: "Banner", icon: ImageIcon },
      { href: "/admin/voucher", label: "Voucher", icon: Ticket },
    ],
  },
  {
    title: "Transaksi",
    items: [
      { href: "/admin/order", label: "Order", icon: ShoppingCart },
      { href: "/admin/pembayaran", label: "Pembayaran", icon: CreditCard },
      { href: "/admin/pengaturan-pembayaran", label: "Metode Pembayaran", icon: QrCode },
    ],
  },
  {
    title: "Lainnya",
    items: [
      { href: "/admin/customer", label: "Customer", icon: Users },
      { href: "/admin/review", label: "Review", icon: Star },
      { href: "/admin/faq", label: "FAQ", icon: HelpCircle },
      { href: "/admin/pengaturan", label: "Pengaturan", icon: Settings },
    ],
  },
];

const superAdminGroup = {
  title: "Super Admin",
  items: [{ href: "/admin/kelola-admin", label: "Kelola Admin", icon: ShieldCheck }],
};

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/me");
        const { role } = await res.json();
        setIsSuperAdmin(role === "super_admin");
      } catch {
        setIsSuperAdmin(false);
      }
    })();
  }, []);

  const groups = isSuperAdmin ? [...menuGroups, superAdminGroup] : menuGroups;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  const content = (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <p className="text-sm font-semibold">Admin Panel</p>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        {groups.map((group, idx) => (
          <div key={idx}>
            {group.title && (
              <p className="mb-1.5 px-3 text-[11px] uppercase tracking-wide text-muted-foreground">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                      active ? "bg-secondary font-medium" : "text-muted-foreground hover:bg-secondary/50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary/50"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-background md:block">
        {content}
      </aside>

      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background p-3 md:hidden">
        <p className="text-sm font-semibold">Admin Panel</p>
        <button onClick={() => setMobileOpen(true)}>
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-64 bg-background">
            <div className="flex justify-end p-3">
              <button onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {content}
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
