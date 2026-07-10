"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Moon, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/components/theme-provider";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message || "Gagal keluar");
      return;
    }
    toast.success("Berhasil keluar");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="container max-w-md space-y-6 py-6">
      <div className="flex items-center gap-3">
        <Link href="/akun" className="rounded-full p-1.5 transition hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Pengaturan</h1>
      </div>

      <div className="premium-card divide-y divide-border overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-secondary/50">
            <Moon className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </span>
          <span className="flex-1 text-sm">Mode Gelap</span>
          <button
            type="button"
            onClick={toggleTheme}
            aria-pressed={theme === "dark"}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              theme === "dark" ? "bg-foreground" : "bg-secondary"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition ${
                theme === "dark" ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>

        <button
          onClick={handleSignOut}
          className="ripple flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-secondary/40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-secondary/50 text-red-400">
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </span>
          <span className="flex-1 text-sm font-medium text-red-400">Keluar dari Akun</span>
        </button>
      </div>
    </div>
  );
}
