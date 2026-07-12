"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Banner } from "@/types/database";

interface Props {
  banners: Banner[];
  intervalMs?: number;
}

export function HeroBannerCarousel({ banners, intervalMs = 2000 }: Props) {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);

  const count = banners.length;

  const goTo = useCallback(
    (index: number) => {
      if (count === 0) return;
      setActive(((index % count) + count) % count);
    },
    [count]
  );

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1), [active, goTo]);

  // Autoplay: geser otomatis tiap `intervalMs` (default 2 detik), berhenti kalau cuma 1 banner
  useEffect(() => {
    if (count <= 1) return;

    timerRef.current = setInterval(() => {
      setActive((current) => (current + 1) % count);
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [count, intervalMs]);

  const pauseAutoplay = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const resumeAutoplay = () => {
    pauseAutoplay();
    if (count <= 1) return;
    timerRef.current = setInterval(() => {
      setActive((current) => (current + 1) % count);
    }, intervalMs);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    pauseAutoplay();
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) {
      resumeAutoplay();
      return;
    }
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const SWIPE_THRESHOLD = 40;

    if (deltaX > SWIPE_THRESHOLD) {
      prev();
    } else if (deltaX < -SWIPE_THRESHOLD) {
      next();
    }
    touchStartX.current = null;
    resumeAutoplay();
  };

  if (count === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <p className="text-2xl font-semibold tracking-tight">New Season Drop</p>
        <p className="text-sm text-muted-foreground">
          Tambahkan banner promo lewat Admin &gt; Banner
        </p>
      </div>
    );
  }

  return (
    <div
      className="group relative h-full w-full"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Track geser */}
      <div
        className="flex h-full w-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${active * 100}%)` }}
      >
        {banners.map((banner, idx) => {
          const slide = (
            <div key={banner.id} className="relative h-full w-full shrink-0 grow-0 basis-full">
              <Image
                src={banner.image_url}
                alt={banner.title ?? "Promo"}
                fill
                priority={idx === 0}
                sizes="100vw"
                className="object-cover"
              />
            </div>
          );

          return banner.link_url ? (
            <Link
              key={banner.id}
              href={banner.link_url}
              className="relative h-full w-full shrink-0 grow-0 basis-full"
              tabIndex={active === idx ? 0 : -1}
            >
              <Image
                src={banner.image_url}
                alt={banner.title ?? "Promo"}
                fill
                priority={idx === 0}
                sizes="100vw"
                className="object-cover"
              />
            </Link>
          ) : (
            slide
          );
        })}
      </div>

      {/* Dots indikator ala Shopee */}
      {count > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
          {banners.map((banner, idx) => (
            <button
              key={banner.id}
              type="button"
              aria-label={`Ke banner ${idx + 1}`}
              onClick={() => {
                pauseAutoplay();
                goTo(idx);
                resumeAutoplay();
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === active ? "w-5 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
