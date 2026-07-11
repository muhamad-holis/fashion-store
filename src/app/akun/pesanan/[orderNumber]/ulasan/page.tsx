import Link from "next/link";
import { ArrowLeft, PackageX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ReviewFormList } from "@/components/account/review-form-list";

export const metadata = { title: "Beri Ulasan" };

type ReviewOrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  color_name: string | null;
  size_label: string | null;
  quantity: number;
};

type ReviewOrderRow = {
  id: string;
  order_number: string;
  status: string;
  user_id: string | null;
  order_items: ReviewOrderItem[];
};

export default async function ReviewOrderPage({
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
  let items: ReviewOrderItem[] = [];
  let reviewedIds = new Set<string>();
  let reviewerName = "Pembeli";

  if (!user) {
    notice = "Masuk untuk memberi ulasan pesanan kamu.";
  } else {
    const [{ data: orderData }, { data: profile }] = await Promise.all([
      supabase
        .from("orders")
        .select(
          "id, order_number, status, user_id, order_items(id, product_id, product_name, product_image, color_name, size_label, quantity)"
        )
        .eq("order_number", orderNumber.trim())
        .maybeSingle(),
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    ]);
    const order = orderData as unknown as ReviewOrderRow | null;

    reviewerName = profile?.full_name || user.email?.split("@")[0] || "Pembeli";

    if (!order || order.user_id !== user.id) {
      notice = "Pesanan tidak ditemukan.";
    } else if (order.status !== "completed") {
      notice = "Ulasan hanya bisa diberikan untuk pesanan yang sudah selesai.";
    } else {
      items = order.order_items ?? [];
      const itemIds = items.map((i) => i.id);
      if (itemIds.length > 0) {
        const { data: reviews } = await supabase
          .from("reviews")
          .select("order_item_id")
          .in("order_item_id", itemIds);
        reviewedIds = new Set((reviews ?? []).map((r) => r.order_item_id).filter(Boolean) as string[]);
      }
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
            <h1 className="text-base font-semibold">Beri Ulasan</h1>
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
        ) : (
          <ReviewFormList
            orderNumber={orderNumber}
            reviewerName={reviewerName}
            items={items}
            reviewedIds={Array.from(reviewedIds)}
          />
        )}
      </div>
    </div>
  );
}
