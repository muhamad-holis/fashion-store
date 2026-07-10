"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/akun/login");
        return;
      }
      setUserId(user.id);
      setEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      setFullName(profile?.full_name ?? "");
      setPhone(profile?.phone ?? "");
      setAvatarUrl(profile?.avatar_url ?? null);
      setLoading(false);
    })();
  }, []);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({ id: userId, avatar_url: publicUrl });
      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success("Foto profil diperbarui");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengupload foto");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: userId, full_name: fullName.trim(), phone: phone.trim() });
      if (error) throw error;
      toast.success("Profil berhasil disimpan");
      router.push("/akun");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan profil");
    } finally {
      setSaving(false);
    }
  }

  const initials = (fullName || email)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  if (loading) {
    return (
      <div className="container max-w-md space-y-4 py-6">
        <div className="skeleton h-8 w-40 rounded-lg" />
        <div className="skeleton mx-auto h-24 w-24 rounded-full" />
        <div className="skeleton h-12 w-full rounded-2xl" />
        <div className="skeleton h-12 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="container max-w-md space-y-6 py-6">
      <div className="flex items-center gap-3">
        <Link href="/akun" className="rounded-full p-1.5 transition hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Profil Saya</h1>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="relative h-24 w-24 overflow-hidden rounded-full border border-border bg-secondary">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Avatar" fill sizes="96px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold">
                {initials || "U"}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="ripple absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-foreground text-background transition active:scale-90"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
      </div>

      <form onSubmit={handleSave} className="premium-card space-y-4 p-5">
        <div>
          <label className="mb-1.5 block text-xs text-muted-foreground">Nama Lengkap</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nama lengkap kamu"
            className="w-full rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm outline-none transition focus:border-foreground/30 focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-muted-foreground">Email</label>
          <input
            value={email}
            disabled
            className="w-full rounded-2xl border border-border bg-secondary/20 px-4 py-3 text-sm text-muted-foreground outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-muted-foreground">Nomor HP</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="08xxxxxxxxxx"
            className="w-full rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm outline-none transition focus:border-foreground/30 focus:ring-2 focus:ring-ring"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="ripple flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-3 text-sm font-semibold text-background transition active:scale-[0.98] disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </form>
    </div>
  );
}
