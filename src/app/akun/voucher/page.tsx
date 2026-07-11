import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { VoucherList } from "@/components/account/voucher-list";
import type { Coupon } from "@/types/database";

export const metadata = { title: "Voucher Saya" };

export default async function VoucherPage() {
  const supabase = await createClient();

  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("coupons")
    .select("*")
    .eq("is_active", true)
    .or(`valid_until.is.null,valid_until.gte.${nowIso}`)
    .order("discount_value", { ascending: false });

  const coupons = (data as Coupon[]) ?? [];

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-30 glass">
        <div className="container flex h-14 max-w-md items-center gap-3">
          <Link href="/akun" className="rounded-full p-1.5 transition hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-semibold">Voucher Saya</h1>
        </div>
      </div>

      <div className="container max-w-md py-4">
        <VoucherList coupons={coupons} />
      </div>
    </div>
  );
}
