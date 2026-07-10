"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  User,
  MapPin,
  CreditCard,
  Ticket,
  Heart,
  History,
  Eye,
  Bell,
  LifeBuoy,
  MessageCircle,
  ShieldCheck,
  FileText,
  Info,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type MenuItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
  badge?: string;
  external?: boolean;
  action?: "signout";
};

// href yang sudah punya halaman nyata di repo — sisanya akan menampilkan
// toast "segera hadir" yang tetap terasa premium, tidak 404.
const BUILT_ROUTES = new Set(["/akun/profil", "/akun/pesanan", "/wishlist", "/akun/pengaturan", "/pembayaran"]);

export function buildAccountMenu({
  wishlistCount,
  whatsapp,
}: {
  wishlistCount?: number;
  whatsapp?: string | null;
}): MenuItem[] {
  return [
    { label: "Profil Saya", icon: User, href: "/akun/profil" },
    { label: "Alamat Saya", icon: MapPin, href: "/akun/alamat" },
    { label: "Metode Pembayaran", icon: CreditCard, href: "/pembayaran" },
    { label: "Voucher Saya", icon: Ticket, href: "/akun/voucher" },
    {
      label: "Wishlist",
      icon: Heart,
      href: "/wishlist",
      badge: wishlistCount ? `${wishlistCount} Produk` : undefined,
    },
    { label: "Riwayat Pembelian", icon: History, href: "/akun/pesanan" },
    { label: "Produk Dilihat", icon: Eye, href: "/akun/dilihat" },
    { label: "Notifikasi", icon: Bell, href: "/akun/notifikasi" },
    { label: "Pusat Bantuan", icon: LifeBuoy, href: "/akun/bantuan" },
    whatsapp
      ? { label: "Hubungi Admin", icon: MessageCircle, href: `https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`, external: true }
      : { label: "Hubungi Admin", icon: MessageCircle, href: "/akun/bantuan" },
    { label: "Kebijakan Privasi", icon: ShieldCheck, href: "/akun/privasi" },
    { label: "Syarat & Ketentuan", icon: FileText, href: "/akun/syarat" },
    { label: "Tentang Kami", icon: Info, href: "/akun/tentang" },
    { label: "Pengaturan", icon: Settings, href: "/akun/pengaturan" },
    { label: "Keluar", icon: LogOut, action: "signout" },
  ];
}

function MenuRow({ item, index }: { item: MenuItem; index: number }) {
  const router = useRouter();
  const supabase = createClient();
  const Icon = item.icon;
  const isDanger = item.action === "signout";

  async function handleClick(e: React.MouseEvent) {
    if (item.action === "signout") {
      e.preventDefault();
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(error.message || "Gagal keluar");
        return;
      }
      toast.success("Berhasil keluar");
      router.push("/");
      router.refresh();
      return;
    }

    if (item.href && !item.external && !BUILT_ROUTES.has(item.href)) {
      e.preventDefault();
      toast("Fitur ini akan segera hadir", {
        description: `${item.label} sedang kami siapkan.`,
      });
    }
  }

  const content = (
    <>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-secondary/50 ${
          isDanger ? "text-red-400" : ""
        }`}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
      </span>
      <span className={`flex-1 text-sm ${isDanger ? "font-medium text-red-400" : ""}`}>
        {item.label}
      </span>
      {item.badge && (
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
          {item.badge}
        </span>
      )}
      {!isDanger && <span className="text-muted-foreground">›</span>}
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
    >
      <Link
        href={item.href ?? "#"}
        onClick={handleClick}
        target={item.external ? "_blank" : undefined}
        rel={item.external ? "noopener noreferrer" : undefined}
        className="ripple flex items-center gap-3 px-5 py-3.5 transition hover:bg-secondary/40"
      >
        {content}
      </Link>
    </motion.div>
  );
}

export function MenuList({ items }: { items: MenuItem[] }) {
  return (
    <div className="premium-card divide-y divide-border overflow-hidden">
      {items.map((item, i) => (
        <MenuRow key={item.label} item={item} index={i} />
      ))}
    </div>
  );
}
