import { ProductForm } from "@/components/admin/product-form";

export default function NewProductPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Tambah Produk</h1>
      <ProductForm />
    </div>
  );
}
