"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type VerificationStep = "belum_upload" | "menunggu" | "diverifikasi" | "ditolak";

const STEPS: { key: Exclude<VerificationStep, "ditolak">; title: string; desc: string }[] = [
  { key: "belum_upload", title: "Belum Upload", desc: "Upload bukti pembayaran" },
  { key: "menunggu", title: "Menunggu Verifikasi", desc: "Bukti pembayaran sedang diperiksa admin" },
  { key: "diverifikasi", title: "Pembayaran Diverifikasi", desc: "Pembayaran sudah diverifikasi oleh admin" },
];

const ORDER: VerificationStep[] = ["belum_upload", "menunggu", "diverifikasi"];

export function VerificationStatus({
  current,
  rejectionReason,
}: {
  current: VerificationStep;
  rejectionReason?: string | null;
}) {
  const isRejected = current === "ditolak";
  const currentIndex = isRejected ? -1 : ORDER.indexOf(current);

  return (
    <div className="rounded-[20px] border border-[#262626] bg-[#151515] p-5">
      <h2 className="mb-4 text-xs font-semibold tracking-wide text-white/50">STATUS VERIFIKASI</h2>

      <div className="space-y-0">
        {STEPS.map((step, i) => {
          const isDone = !isRejected && i < currentIndex;
          const isActive = !isRejected && i === currentIndex;
          const isLast = i === STEPS.length - 1;

          return (
            <div key={step.key} className="relative flex gap-3 pb-6 last:pb-0">
              {!isLast && (
                <span
                  className={cn(
                    "absolute left-[9px] top-5 h-full w-px",
                    isDone ? "bg-white" : "bg-[#262626]"
                  )}
                />
              )}
              <span className="relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                {isDone ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white">
                    <Check className="h-3 w-3 text-black" strokeWidth={3} />
                  </span>
                ) : isActive ? (
                  <motion.span
                    className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-white/10"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  </motion.span>
                ) : (
                  <span className="h-5 w-5 rounded-full border-2 border-[#262626]" />
                )}
              </span>
              <div>
                <p className={cn("text-sm font-medium", isDone || isActive ? "text-white" : "text-white/35")}>
                  {step.title}
                </p>
                <p className={cn("text-xs", isDone || isActive ? "text-white/50" : "text-white/25")}>
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}

        <div className="relative flex gap-3">
          <span className="relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
            <span
              className={cn(
                "h-5 w-5 rounded-full border-2",
                isRejected ? "border-red-500 bg-red-500/10" : "border-[#262626]"
              )}
            />
          </span>
          <div>
            <p className={cn("text-sm font-medium", isRejected ? "text-red-400" : "text-white/35")}>
              Pembayaran Ditolak
            </p>
            <p className={cn("text-xs", isRejected ? "text-red-300/70" : "text-white/25")}>
              {isRejected && rejectionReason ? rejectionReason : "Pembayaran ditolak oleh admin"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
