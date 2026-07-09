import { ProductForm } from "@/components/admin/product-form";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Edit Produk</h1>
      <ProductForm productId={id} />
    </div>
  );
}
