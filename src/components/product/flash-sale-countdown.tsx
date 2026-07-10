"use client";

import { useEffect, useState } from "react";

function getRemaining(endTime: string) {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return null;
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

// Countdown flash sale beneran, dihitung dari kolom flash_sale_end di
// database (bukan angka dekorasi statis) - jadi kalau waktunya habis,
// timer ini otomatis hilang dari halaman.
export function FlashSaleCountdown({ endTime }: { endTime: string }) {
  const [remaining, setRemaining] = useState(() => getRemaining(endTime));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(getRemaining(endTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  if (!remaining) return null;

  const units = [
    ...(remaining.days > 0 ? [{ label: "Hari", value: remaining.days }] : []),
    { label: "Jam", value: remaining.hours },
    { label: "Menit", value: remaining.minutes },
    { label: "Detik", value: remaining.seconds },
  ];

  return (
    <div className="flex items-center gap-1">
      {units.map((u, idx) => (
        <div key={u.label} className="flex items-center gap-1">
          <div className="flex flex-col items-center">
            <span className="flex h-6 min-w-[22px] items-center justify-center rounded-md bg-foreground px-1 text-[11px] font-bold tabular-nums text-background">
              {pad(u.value)}
            </span>
          </div>
          {idx < units.length - 1 && <span className="text-xs font-semibold text-muted-foreground">:</span>}
        </div>
      ))}
    </div>
  );
}
