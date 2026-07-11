import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Syarat & Ketentuan" };

export default async function TermsPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("terms_conditions")
    .eq("id", 1)
    .maybeSingle();

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-30 glass">
        <div className="container flex h-14 max-w-md items-center gap-3">
          <Link href="/akun" className="rounded-full p-1.5 transition hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-semibold">Syarat & Ketentuan</h1>
        </div>
      </div>

      <div className="container max-w-md py-4">
        <div className="premium-card p-5">
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {settings?.terms_conditions || "Syarat & ketentuan belum tersedia."}
          </p>
        </div>
      </div>
    </div>
  );
}
