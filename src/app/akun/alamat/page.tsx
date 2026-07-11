import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AddressManager } from "@/components/account/address-manager";
import type { Address } from "@/types/database";

export const metadata = { title: "Alamat Saya" };

export default async function AddressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let addresses: Address[] = [];
  if (user) {
    const { data } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    addresses = (data as Address[]) ?? [];
  }

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-30 glass">
        <div className="container flex h-14 max-w-md items-center gap-3">
          <Link href="/akun" className="rounded-full p-1.5 transition hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-semibold">Alamat Saya</h1>
        </div>
      </div>

      <div className="container max-w-md py-4">
        {!user ? (
          <div className="premium-card flex flex-col items-center gap-2 p-10 text-center">
            <p className="text-sm text-muted-foreground">Masuk untuk mengelola alamat kamu.</p>
            <Link
              href="/akun/login"
              className="mt-2 rounded-full bg-foreground px-5 py-2 text-xs font-semibold text-background"
            >
              Masuk Sekarang
            </Link>
          </div>
        ) : (
          <AddressManager initialAddresses={addresses} />
        )}
      </div>
    </div>
  );
}
