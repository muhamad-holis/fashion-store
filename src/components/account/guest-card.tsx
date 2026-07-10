"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LogIn, UserPlus, UserRound } from "lucide-react";

export function GuestCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="premium-card relative overflow-hidden p-6 text-center"
    >
      <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-white/[0.04] blur-2xl" />

      <div className="relative mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-secondary/60">
        <UserRound className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h2 className="relative text-base font-semibold">Selamat Datang</h2>
      <p className="relative mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
        Masuk untuk menyimpan riwayat pesanan, wishlist, dan mendapatkan penawaran
        khusus member Emyu Fashion Store.
      </p>

      <div className="relative mt-5 grid grid-cols-2 gap-3">
        <Link
          href="/akun/login"
          className="ripple flex items-center justify-center gap-2 rounded-2xl bg-foreground py-3 text-sm font-semibold text-background transition active:scale-[0.98]"
        >
          <LogIn className="h-4 w-4" />
          Masuk
        </Link>
        <Link
          href="/akun/register"
          className="ripple flex items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-semibold transition hover:bg-secondary active:scale-[0.98]"
        >
          <UserPlus className="h-4 w-4" />
          Daftar
        </Link>
      </div>
    </motion.div>
  );
}
