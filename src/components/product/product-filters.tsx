"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category, Color, Size } from "@/types/database";

interface Props {
  categories: Category[];
  colors: Color[];
  sizes: Size[];
  currentParams: Record<string, string | undefined>;
  mobile?: boolean;
}

const SORT_OPTIONS = [
  { value: "terbaru", label: "Terbaru" },
  { value: "terlaris", label: "Terlaris" },
  { value: "harga-rendah", label: "Harga Terendah" },
  { value: "harga-tinggi", label: "Harga Tertinggi" },
  { value: "rating", label: "Rating Tertinggi" },
];

export function ProductFilters({ categories, colors, sizes, currentParams, mobile }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [minPrice, setMinPrice] = useState(currentParams.min ?? "");
  const [maxPrice, setMaxPrice] = useState(currentParams.max ?? "");

  function updateParam(key: string, value?: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  }

  function applyPriceRange() {
    const next = new URLSearchParams(searchParams.toString());
    if (minPrice) next.set("min", minPrice);
    else next.delete("min");
    if (maxPrice) next.set("max", maxPrice);
    else next.delete("max");
    router.push(`${pathname}?${next.toString()}`);
    setOpen(false);
  }

  function clearAll() {
    router.push(pathname);
    setMinPrice("");
    setMaxPrice("");
    setOpen(false);
  }

  const content = (
    <div className="space-y-6">
      <FilterGroup title="Urutkan">
        <div className="flex flex-col gap-1.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateParam("sort", opt.value)}
              className={cn(
                "rounded-lg px-3 py-2 text-left text-sm transition",
                currentParams.sort === opt.value
                  ? "bg-foreground text-background"
                  : "hover:bg-secondary"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Kategori">
        <div className="flex flex-col gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() =>
                updateParam("kategori", currentParams.kategori === cat.slug ? undefined : cat.slug)
              }
              className={cn(
                "rounded-lg px-3 py-2 text-left text-sm transition",
                currentParams.kategori === cat.slug
                  ? "bg-foreground text-background"
                  : "hover:bg-secondary"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Rentang Harga">
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none"
          />
          <span className="text-muted-foreground">-</span>
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none"
          />
        </div>
        <button
          onClick={applyPriceRange}
          className="mt-2 w-full rounded-lg bg-secondary py-2 text-sm transition hover:bg-accent"
        >
          Terapkan
        </button>
      </FilterGroup>

      <FilterGroup title="Warna">
        <div className="flex flex-wrap gap-2">
          {colors.map((c) => (
            <button
              key={c.id}
              title={c.name}
              onClick={() => updateParam("warna", currentParams.warna === c.name ? undefined : c.name)}
              className={cn(
                "h-8 w-8 rounded-full border-2 transition",
                currentParams.warna === c.name ? "border-foreground" : "border-border"
              )}
              style={{ backgroundColor: c.hex_code }}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Ukuran">
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => (
            <button
              key={s.id}
              onClick={() =>
                updateParam("ukuran", currentParams.ukuran === s.label ? undefined : s.label)
              }
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm transition",
                currentParams.ukuran === s.label
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:bg-secondary"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Rating Minimum">
        <div className="flex gap-2">
          {[4, 3, 2].map((r) => (
            <button
              key={r}
              onClick={() => updateParam("rating", currentParams.rating === String(r) ? undefined : String(r))}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm transition",
                currentParams.rating === String(r)
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:bg-secondary"
              )}
            >
              {r}+ ★
            </button>
          ))}
        </div>
      </FilterGroup>

      <button
        onClick={clearAll}
        className="w-full rounded-lg border border-border py-2 text-sm text-muted-foreground transition hover:bg-secondary"
      >
        Hapus Semua Filter
      </button>
    </div>
  );

  if (mobile) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filter & Urutkan
        </button>

        {open && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/60">
            <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-background p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">Filter & Urutkan</h3>
                <button onClick={() => setOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              {content}
            </div>
          </div>
        )}
      </>
    );
  }

  return <div className="sticky top-20">{content}</div>;
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-medium">{title}</h4>
      {children}
    </div>
  );
}
