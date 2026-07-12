import Link from "next/link";
import Image from "next/image";
import { Flame } from "lucide-react";
import type { Banner } from "@/types/database";

interface Props {
  banners: Banner[];
}

export function PromoBannerRow({ banners }: Props) {
  if (banners.length === 0) return null;

  return (
    <section className="container">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Flame className="h-4 w-4 fill-current text-foreground" />
          <h2 className="text-sm font-semibold">Promo Spesial Untukmu</h2>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 snap-x snap-mandatory">
        {banners.map((banner) => {
          const card = (
            <div className="relative aspect-[4/5] h-40 w-32 shrink-0 overflow-hidden rounded-xl bg-secondary shadow-sm ring-1 ring-black/5 transition-transform duration-150 ease-out active:scale-95 sm:h-44 sm:w-36">
              <Image
                src={banner.image_url}
                alt={banner.title ?? "Promo"}
                fill
                sizes="160px"
                className="object-cover"
              />
            </div>
          );

          return banner.link_url ? (
            <Link
              key={banner.id}
              href={banner.link_url}
              className="snap-start touch-manipulation active:opacity-80"
            >
              {card}
            </Link>
          ) : (
            <div key={banner.id} className="snap-start">
              {card}
            </div>
          );
        })}
      </div>
    </section>
  );
}
