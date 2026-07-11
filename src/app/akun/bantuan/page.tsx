import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { FaqAccordion } from "@/components/account/faq-accordion";
import type { Faq } from "@/types/database";

export const metadata = { title: "Pusat Bantuan" };

export default async function HelpCenterPage() {
  const supabase = await createClient();
  const [{ data: faqData }, { data: settings }] = await Promise.all([
    supabase.from("faqs").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("settings").select("whatsapp").eq("id", 1).maybeSingle(),
  ]);
  const faqs = (faqData as Faq[]) ?? [];
  const waLink = settings?.whatsapp ? `https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, "")}` : null;

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-30 glass">
        <div className="container flex h-14 max-w-md items-center gap-3">
          <Link href="/akun" className="rounded-full p-1.5 transition hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-semibold">Pusat Bantuan</h1>
        </div>
      </div>

      <div className="container max-w-md space-y-4 py-4">
        <div>
          <h2 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">
            Pertanyaan yang Sering Diajukan
          </h2>
          <FaqAccordion faqs={faqs} />
        </div>

        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="ripple flex items-center justify-center gap-2 rounded-2xl bg-foreground py-3.5 text-sm font-semibold text-background transition active:scale-[0.98]"
          >
            <MessageCircle className="h-4 w-4" />
            Belum terjawab? Hubungi Admin
          </a>
        )}
      </div>
    </div>
  );
}
