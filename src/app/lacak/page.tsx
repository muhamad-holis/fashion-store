"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export default function TrackOrderPage() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNumber.trim() || !phone.trim()) return;
    router.push(`/invoice/${orderNumber.trim()}?phone=${encodeURIComponent(phone.trim())}`);
  }

  return (
    <div className="container max-w-md py-10">
      <h1 className="mb-1 text-lg font-semibold">Lacak Pesanan</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Masukkan nomor order dan nomor HP yang digunakan saat checkout.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Nomor Order</label>
          <input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="INV-20260709-0001"
            className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Nomor HP</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="08123456789"
            className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none"
          />
        </div>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-foreground py-3 text-sm font-medium text-background"
        >
          <Search className="h-4 w-4" />
          Lacak Pesanan
        </button>
      </form>
    </div>
  );
}
