"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductImage, ProductVideo } from "@/types/database";

interface Props {
  images: ProductImage[];
  videos: ProductVideo[];
}

export function ProductGallery({ images, videos }: Props) {
  const media = [
    ...videos.map((v) => ({ type: "video" as const, url: v.url, thumb: v.thumbnail_url })),
    ...images.sort((a, b) => a.sort_order - b.sort_order).map((i) => ({ type: "image" as const, url: i.url, thumb: i.url })),
  ];
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const current = media[active];

  if (media.length === 0) {
    return <div className="skeleton aspect-square w-full rounded-xl" />;
  }

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-secondary">
        {current.type === "video" ? (
          <video src={current.url} controls className="h-full w-full object-cover" poster={current.thumb ?? undefined} />
        ) : (
          <>
            <Image
              src={current.url}
              alt="Foto produk"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
            <button
              onClick={() => setZoom(true)}
              className="absolute bottom-3 right-3 rounded-full bg-background/70 p-2 backdrop-blur"
              aria-label="Perbesar gambar"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
        {media.map((m, idx) => (
          <button
            key={idx}
            onClick={() => setActive(idx)}
            className={cn(
              "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-secondary",
              active === idx ? "border-foreground" : "border-transparent"
            )}
          >
            {m.thumb && (
              <Image src={m.thumb} alt="" fill sizes="64px" className="object-cover" />
            )}
            {m.type === "video" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Play className="h-4 w-4 fill-white text-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      {zoom && current.type === "image" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoom(false)}
        >
          <button className="absolute right-4 top-4 text-white">
            <X className="h-6 w-6" />
          </button>
          <div className="relative h-full w-full max-w-2xl">
            <Image src={current.url} alt="Foto produk diperbesar" fill className="object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
