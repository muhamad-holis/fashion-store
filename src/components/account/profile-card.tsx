"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Pencil, Settings, ChevronRight, BadgeCheck } from "lucide-react";

export function ProfileCard({
  name,
  subtitle,
  avatarUrl,
  memberLevel = "Member Silver",
}: {
  name: string;
  subtitle?: string;
  avatarUrl?: string | null;
  memberLevel?: string;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="premium-card relative overflow-hidden p-5"
    >
      {/* subtle radial glow accent, monochrome */}
      <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-white/[0.04] blur-2xl" />

      <div className="relative flex items-center gap-3.5">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-border bg-secondary">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={name} fill sizes="64px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-semibold">
              {initials || "U"}
            </div>
          )}
        </div>

        <Link href="/akun/profil" className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-base font-semibold">{name}</p>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-border bg-secondary/70 px-2 py-0.5 text-[11px] font-medium text-foreground/80">
            <BadgeCheck className="h-3 w-3" />
            {memberLevel}
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href="/akun/profil"
            aria-label="Edit profil"
            className="ripple rounded-full border border-border p-2.5 transition hover:bg-secondary"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <Link
            href="/akun/pengaturan"
            aria-label="Pengaturan"
            className="ripple rounded-full border border-border p-2.5 transition hover:bg-secondary"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
