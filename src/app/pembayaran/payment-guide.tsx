"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Landmark, Wallet, QrCode } from "lucide-react";

const GUIDES = [
  {
    key: "bank",
    icon: Landmark,
    title: "Transfer Bank",
    steps: [
      "Pilih bank yang tersedia",
      "Salin nomor rekening tujuan",
      "Lakukan transfer sesuai total tagihan",
      "Upload bukti pembayaran",
      "Tunggu verifikasi dari admin",
    ],
  },
  {
    key: "ewallet",
    icon: Wallet,
    title: "E-Wallet",
    steps: [
      "Pilih e-wallet yang tersedia",
      "Salin nomor atau gunakan nomor tersebut untuk pembayaran",
      "Lakukan pembayaran sesuai total tagihan",
      "Upload bukti pembayaran",
      "Tunggu verifikasi dari admin",
    ],
  },
  {
    key: "qris",
    icon: QrCode,
    title: "QRIS",
    steps: [
      "Scan kode QR menggunakan aplikasi e-wallet atau mobile banking",
      "Pastikan nominal sesuai total tagihan",
      "Simpan bukti pembayaran",
      "Upload bukti pembayaran",
      "Tunggu verifikasi dari admin",
    ],
  },
];

const NOTES = [
  "Pastikan nominal pembayaran sesuai dengan total tagihan",
  "Tidak menerima pembayaran selain metode yang tersedia",
  "Pembayaran akan diverifikasi 1x24 jam pada jam kerja",
  "Jika pembayaran ditolak, silakan hubungi admin",
];

export function PaymentGuide() {
  const [openKey, setOpenKey] = useState<string | null>("bank");

  return (
    <div className="space-y-3">
      <h2 className="px-1 text-xs font-semibold tracking-wide text-white/50">PANDUAN PEMBAYARAN</h2>

      {GUIDES.map((g) => {
        const Icon = g.icon;
        const open = openKey === g.key;
        return (
          <div
            key={g.key}
            className="overflow-hidden rounded-[20px] border border-[#262626] bg-[#151515]"
          >
            <button
              type="button"
              onClick={() => setOpenKey(open ? null : g.key)}
              className="flex w-full items-center gap-3 px-4 py-4 text-left"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5">
                <Icon className="h-4 w-4 text-white" />
              </span>
              <span className="flex-1 text-sm font-medium text-white">{g.title}</span>
              <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="h-4 w-4 text-white/50" />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="px-4"
                >
                  <ol className="space-y-2.5 pb-4 pl-1 text-sm text-white/70">
                    {g.steps.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-medium text-white">
                          {i + 1}
                        </span>
                        <span className="leading-snug">{step}</span>
                      </li>
                    ))}
                  </ol>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      <div className="rounded-[20px] border border-[#262626] bg-[#151515] p-4">
        <h3 className="mb-2.5 text-sm font-semibold text-white">Catatan Penting</h3>
        <ul className="space-y-2 text-sm text-white/60">
          {NOTES.map((n, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/40" />
              <span className="leading-snug">{n}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
