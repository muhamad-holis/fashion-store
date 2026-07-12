import Link from "next/link";
import { ArrowLeft, PackageX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ReturnForm } from "@/components/account/return-form";
import { ReturnStatusCard } from "@/components/account/return-status-card";
import type { Return } from "@/types/database";

export const metadata = { title: "Ajukan Retur" };

type ReturnOrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  color_name: string | null;
  size_label: string | null;
  quantity: number;
};

type ReturnOrderRow = {
  id: string;
  order_number: string;
  status: string;
  user_id: string | null;
  order_items: ReturnOrderItem[];
};

export default async function ReturOrderPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let notice: string | null = null;
  let items: ReturnOrderItem[] = [];
  let existingReturn: Return | null = null;
  let orderId = "";

  if (!user) {
    notice = "Masuk untuk mengajukan retur pesanan kamu.";
  } else {
    const { data: orderData } = await supabase
      .from("orders")
      .select(
        "id, order_number, status, user_id, order_items(id, product_id, product_name, product_image, color_name, size_label, quantity)"
      )
      .eq("order_number", orderNumber.trim())
      .maybeSingle();
    const order = orderData as unknown as ReturnOrderRow | null;

    if (!order || order.user_id !== user.id) {
      notice = "Pesanan tidak ditemukan.";
    } else if (order.status !== "completed" && order.status !== "arrived") {
      notice = "Retur hanya bisa diajukan untuk pesanan yang sudah diterima.";
    } else {
      items = order.order_items ?? [];
      orderId = order.id;

      const { data: existing } = await supabase
        .from("returns")
        .select("*")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      existingReturn = (existing as Return) ?? null;
    }
  }

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-30 glass">
        <div className="container flex h-14 max-w-md items-center gap-3">
          <Link href="/akun/pesanan" className="rounded-full p-1.5 transition hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-base font-semibold">Ajukan Retur</h1>
            <p className="text-[11px] text-muted-foreground">{orderNumber}</p>
          </div>
        </div>
      </div>

      <div className="container max-w-md space-y-3 py-4">
        {notice ? (
          <div className="premium-card flex flex-col items-center gap-2 p-10 text-center">
            <PackageX className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{notice}</p>
          </div>
        ) : existingReturn ? (
          <ReturnStatusCard ret={existingReturn} />
        ) : (
          <ReturnForm orderId={orderId} items={items} />
        )}
      </div>
    </div>
  );
}
