"use client";

import { useRef, useState } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

interface PointerInfo {
  x: number;
  y: number;
}

/**
 * Bungkus thumbnail bukti bayar dengan komponen ini supaya bisa diklik/tap
 * untuk membuka tampilan penuh layar yang bisa di-zoom:
 * - Tombol +/- dan reset
 * - Cubit dua jari (pinch) di layar sentuh
 * - Tap dua kali (double tap) untuk toggle zoom 2x
 * - Geser (drag) gambar saat sedang di-zoom
 *
 * Pemakaian:
 * <PaymentProofLightbox src={signedUrl} wrapperClassName="relative mt-2 h-48 w-full ...">
 *   <Image src={signedUrl} alt="Bukti bayar" fill className="object-contain" />
 * </PaymentProofLightbox>
 */
export function PaymentProofLightbox({
  src,
  alt = "Bukti bayar",
  wrapperClassName = "",
  children,
}: {
  src: string;
  alt?: string;
  wrapperClassName?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const pointers = useRef<Map<number, PointerInfo>>(new Map());
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number; origX: number; origY: number } | null>(null);
  const lastTap = useRef(0);

  function clampScale(s: number) {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
  }

  function openLightbox() {
    setOpen(true);
    setScale(1);
    setPos({ x: 0, y: 0 });
  }

  function closeLightbox() {
    setOpen(false);
    pointers.current.clear();
    pinchStart.current = null;
    dragStart.current = null;
    setDragging(false);
  }

  function zoomIn() {
    setScale((s) => clampScale(+(s + 0.5).toFixed(2)));
  }

  function zoomOut() {
    setScale((s) => {
      const next = clampScale(+(s - 0.5).toFixed(2));
      if (next === MIN_SCALE) setPos({ x: 0, y: 0 });
      return next;
    });
  }

  function resetZoom() {
    setScale(1);
    setPos({ x: 0, y: 0 });
  }

  function toggleZoomOnTap() {
    setScale((s) => {
      if (s > 1) {
        setPos({ x: 0, y: 0 });
        return 1;
      }
      return 2;
    });
  }

  function distanceBetween(a: PointerInfo, b: PointerInfo) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function handlePointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinchStart.current = { dist: distanceBetween(a, b), scale };
      dragStart.current = null;
    } else if (pointers.current.size === 1) {
      // Double-tap manual, karena onDoubleClick tidak selalu terpicu di layar sentuh
      const now = Date.now();
      if (now - lastTap.current < 300) toggleZoomOnTap();
      lastTap.current = now;

      if (scale > 1) {
        dragStart.current = { x: e.clientX, y: e.clientY, origX: pos.x, origY: pos.y };
        setDragging(true);
      }
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = Array.from(pointers.current.values());
      const ratio = distanceBetween(a, b) / pinchStart.current.dist;
      setScale(clampScale(+(pinchStart.current.scale * ratio).toFixed(2)));
    } else if (pointers.current.size === 1 && dragStart.current) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPos({ x: dragStart.current.origX + dx, y: dragStart.current.origY + dy });
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) {
      dragStart.current = null;
      setDragging(false);
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={openLightbox}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") openLightbox();
        }}
        className={`cursor-zoom-in ${wrapperClassName}`}
        aria-label="Perbesar bukti bayar"
      >
        {children}
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/95">
          <div className="flex items-center justify-between p-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={zoomOut}
                className="rounded-full bg-white/10 p-2 text-white"
                aria-label="Perkecil"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={zoomIn}
                className="rounded-full bg-white/10 p-2 text-white"
                aria-label="Perbesar"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={resetZoom}
                className="rounded-full bg-white/10 p-2 text-white"
                aria-label="Reset zoom"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={closeLightbox}
              className="rounded-full bg-white/10 p-2 text-white"
              aria-label="Tutup"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            className="relative flex-1 touch-none select-none overflow-hidden"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                transition: dragging || pinchStart.current ? "none" : "transform 0.15s ease-out",
                cursor: scale > 1 ? (dragging ? "grabbing" : "grab") : "default",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={alt} className="max-h-full max-w-full object-contain" draggable={false} />
            </div>
          </div>

          <p className="p-3 text-center text-xs text-white/40">
            Cubit atau tap dua kali untuk zoom, geser untuk menggeser gambar.
          </p>
        </div>
      )}
    </>
  );
}
