"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { BUILT_ROUTES, buildAccountMenu, type MenuItem } from "@/components/account/menu-items";

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

// MenuList sengaja menerima data MENTAH (wishlistCount, whatsapp) - bukan
// array item yang sudah jadi - lalu memanggil buildAccountMenu() di DALAM
// komponen client ini sendiri. Ini wajib: komponen ikon Lucide di dalam
// setiap item tidak boleh "melintasi" batas Server -> Client Component
// lewat props (React akan melempar error saat serialisasi RSC kalau
// props berisi referensi fungsi/komponen, bukan data biasa).
export function MenuList({
  wishlistCount,
  whatsapp,
  excludeSignout,
}: {
  wishlistCount?: number;
  whatsapp?: string | null;
  excludeSignout?: boolean;
}) {
  const items = buildAccountMenu({ wishlistCount, whatsapp });
  const finalItems = excludeSignout ? items.filter((i) => i.action !== "signout") : items;

  return (
    <div className="premium-card divide-y divide-border overflow-hidden">
      {finalItems.map((item, i) => (
        <MenuRow key={item.label} item={item} index={i} />
      ))}
    </div>
  );
}
