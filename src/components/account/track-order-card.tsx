"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, PackageSearch } from "lucide-react";

export function TrackOrderCard() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [showPhone, setShowPhone] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNumber.trim()) return;
    if (!phone.trim()) {
      setShowPhone(true);
      return;
    }
    router.push(
      `/invoice/${orderNumber.trim()}?phone=${encodeURIComponent(phone.trim())}`
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="premium-card p-5"
    >
      <div className="mb-3 flex items-center gap-2">
        <PackageSearch className="h-4.5 w-4.5" />
        <h2 className="text-[15px] font-semibold">Lacak Pesanan</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <input
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="Masukkan Nomor Pesanan / Resi"
          className="w-full rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm outline-none transition focus:border-foreground/30 focus:ring-2 focus:ring-ring"
        />
        {showPhone && (
          <motion.input
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Nomor HP saat checkout"
            className="w-full rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm outline-none transition focus:border-foreground/30 focus:ring-2 focus:ring-ring"
          />
        )}
        <button
          type="submit"
          className="ripple flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-3 text-sm font-semibold text-background transition active:scale-[0.98]"
        >
          <Search className="h-4 w-4" />
          Lacak Sekarang
        </button>
      </form>
    </motion.div>
  );
}
