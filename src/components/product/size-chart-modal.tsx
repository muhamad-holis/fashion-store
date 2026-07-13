"use client";

import { useEffect } from "react";
import { X, Ruler } from "lucide-react";
import type { SizeChart } from "@/types/database";

export function SizeChartModal({
  chart,
  onClose,
}: {
  chart: SizeChart;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-background p-5 md:rounded-2xl">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Panduan Ukuran</p>
            <h2 className="text-base font-semibold">{chart.name}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs text-muted-foreground">
              <tr>
                <th className="p-2.5 text-left">Ukuran</th>
                {chart.columns.map((col, idx) => (
                  <th key={idx} className="p-2.5 text-left whitespace-nowrap">
                    {col} ({chart.measurement_unit})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.rows.map((row, idx) => (
                <tr key={idx} className="border-t border-border">
                  <td className="p-2.5 font-medium">{row.size}</td>
                  {row.values.map((val, i) => (
                    <td key={i} className="p-2.5 text-muted-foreground">
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {chart.how_to_measure && (
          <div className="mt-4 rounded-lg bg-secondary/40 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium">
              <Ruler className="h-3.5 w-3.5" />
              Cara Mengukur
            </p>
            <p className="whitespace-pre-line text-xs text-muted-foreground">{chart.how_to_measure}</p>
          </div>
        )}
      </div>
    </div>
  );
}
