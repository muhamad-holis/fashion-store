import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

// File convention Next.js - otomatis jadi route /manifest.webmanifest dan
// otomatis di-link di <head>, jadi TIDAK perlu lagi public/manifest.json
// statis (file itu sekarang tidak dipakai, aman dihapus/dibiarkan saja).
//
// Nama & short_name diambil LIVE dari Pengaturan Toko di Admin (tabel
// `settings.store_name`), jadi kalau admin ganti nama brand, nama yang
// muncul saat user "Add to Home Screen" ikut berubah otomatis tanpa perlu
// deploy ulang kode.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let storeName = process.env.NEXT_PUBLIC_SITE_NAME || "Fashion Store";

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("settings")
      .select("store_name")
      .eq("id", 1)
      .maybeSingle();
    if (data?.store_name) storeName = data.store_name;
  } catch {
    // Kalau gagal ambil settings (mis. saat build/prerender tanpa koneksi),
    // tetap fallback ke NEXT_PUBLIC_SITE_NAME di atas - jangan sampai
    // manifest gagal di-generate.
  }

  return {
    name: storeName,
    short_name: storeName,
    description:
      "Belanja fashion pria, wanita, dan aksesoris terbaru dengan kualitas premium.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0d0d0d",
    theme_color: "#0d0d0d",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
