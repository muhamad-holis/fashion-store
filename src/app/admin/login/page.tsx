"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const res = await fetch("/api/admin/me");
      const { isAdmin } = await res.json();

      if (!isAdmin) {
        await supabase.auth.signOut();
        throw new Error("Akun ini tidak memiliki akses admin");
      }

      toast.success("Berhasil login");
      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-border">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Masuk untuk mengelola toko</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-foreground py-3 text-sm font-medium text-background disabled:opacity-50"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
