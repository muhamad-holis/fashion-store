import { ProductCard } from "@/components/product/product-card";
import { Reveal } from "@/components/account/reveal";
import type { Product } from "@/types/database";

export function RecommendSection({ products, title = "Rekomendasi Untuk Anda" }: { products: Product[]; title?: string }) {
  if (products.length === 0) return null;

  return (
    <Reveal>
      <div>
        <h2 className="mb-3 px-1 text-[15px] font-semibold">{title}</h2>
        <div className="grid grid-cols-2 gap-3">
          {products.map((product, i) => (
            <Reveal key={product.id} delay={Math.min(i * 0.04, 0.24)}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      </div>
    </Reveal>
  );
}
