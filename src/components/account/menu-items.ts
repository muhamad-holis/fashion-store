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
export const BUILT_ROUTES = new Set([
  "/akun/profil",
  "/akun/pesanan",
  "/wishlist",
  "/akun/pengaturan",
  "/pembayaran",
  "/akun/alamat",
  "/akun/voucher",
  "/akun/notifikasi",
]);

export function buildAccountMenu({
  wishlistCount,
  unreadNotifCount,
  whatsapp,
}: {
  wishlistCount?: number;
  unreadNotifCount?: number;
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
    {
      label: "Notifikasi",
      icon: Bell,
      href: "/akun/notifikasi",
      badge: unreadNotifCount ? `${unreadNotifCount} Baru` : undefined,
    },
    { label: "Pusat Bantuan", icon: LifeBuoy, href: "/akun/bantuan" },
    whatsapp
      ? {
          label: "Hubungi Admin",
          icon: MessageCircle,
          href: `https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`,
          external: true,
        }
      : { label: "Hubungi Admin", icon: MessageCircle, href: "/akun/bantuan" },
    { label: "Kebijakan Privasi", icon: ShieldCheck, href: "/akun/privasi" },
    { label: "Syarat & Ketentuan", icon: FileText, href: "/akun/syarat" },
    { label: "Tentang Kami", icon: Info, href: "/akun/tentang" },
    { label: "Pengaturan", icon: Settings, href: "/akun/pengaturan" },
    { label: "Keluar", icon: LogOut, action: "signout" },
  ];
}
