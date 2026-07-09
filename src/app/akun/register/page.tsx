"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AkunRegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone },
        },
      });
      if (error) throw error;

      // Jika email confirmation dimatikan di Supabase, session sudah aktif
      // dan kita bisa langsung buat baris profil.
      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: fullName,
          phone,
        });
        if (profileError) {
          // Tidak fatal - profil bisa dilengkapi belakangan, cukup log saja.
          console.error(profileError);
        }
      }

      if (data.session) {
        toast.success("Akun berhasil dibuat");
        router.push("/akun");
        router.refresh();
      } else {
        toast.success("Akun dibuat! Silakan cek email untuk konfirmasi sebelum login.");
        router.push("/akun/login");
      }
    } catch (err: any) {
      toast.error(err.message || "Pendaftaran gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-border">
            <UserPlus className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold">Buat Akun</h1>
          <p className="text-sm text-muted-foreground">
            Opsional — kamu tetap bisa checkout sebagai tamu tanpa akun
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Nama Lengkap</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">No. HP</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none"
            />
          </div>
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
              minLength={6}
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
            {loading ? "Memproses..." : "Daftar"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Sudah punya akun?{" "}
          <Link href="/akun/login" className="font-medium text-foreground underline">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
