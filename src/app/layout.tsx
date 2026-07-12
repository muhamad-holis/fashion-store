import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SiteHeader } from "@/components/layout/site-header";
import { ThemedToaster } from "@/components/themed-toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Fashion Store";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} — Fashion Modern, Elegant, Premium`,
    template: `%s — ${siteName}`,
  },
  description:
    "Belanja fashion pria, wanita, dan aksesoris terbaru dengan kualitas premium dan pengalaman belanja secepat TikTok Shop.",
  // Tidak perlu set `manifest` manual di sini - src/app/manifest.ts (file
  // convention Next.js) otomatis generate route /manifest.webmanifest DAN
  // otomatis nge-link-nya sendiri di <head>.
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // appleWebApp: dibutuhkan supaya "Add to Home Screen" di Safari/iOS
  // membuka app dalam mode standalone (tanpa address bar Safari), bukan
  // cuma jadi bookmark biasa. manifest.json/web app manifest sendirian
  // TIDAK cukup untuk iOS - Safari butuh meta tag ini secara terpisah.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: siteName,
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName,
    title: `${siteName} — Fashion Modern, Elegant, Premium`,
    description:
      "Belanja fashion pria, wanita, dan aksesoris terbaru dengan kualitas premium.",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0d0d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

import { createClient } from "@/lib/supabase/server";
import { ThemeProvider } from "@/components/theme-provider";

async function getStoreName() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("settings").select("store_name").eq("id", 1).maybeSingle();
    return data?.store_name || siteName;
  } catch {
    return siteName;
  }
}

// Dijalankan SEBELUM React hydrate, supaya tema yang benar (dark/light
// sesuai pilihan terakhir user) langsung terpasang tanpa "kedip" warna
// salah sesaat pas halaman baru dimuat. Default tetap dark kalau user
// belum pernah memilih (tema bawaan tidak berubah).
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('emyu-theme');
    var theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch (e) {}
})();
`;

// Splash screen HANYA muncul sekali per sesi browser/tab (pertama kali app
// dibuka, termasuk pas dibuka dari icon PWA di home screen) - bukan setiap
// kali pindah halaman. Cara kerjanya:
// 1. Elemen #app-splash SELALU ada di HTML awal (dirender dari server),
//    jadi langsung terlihat sejak detik pertama, tanpa nunggu JS/React.
// 2. Script vanilla di bawah ini jalan SEKALI saat dokumen pertama kali
//    dimuat penuh (hard refresh / buka app baru) - script ini TIDAK
//    ikut jalan lagi saat pindah halaman lewat Link (Next.js App Router
//    berpindah halaman tanpa reload dokumen, jadi <script> ini otomatis
//    tidak pernah dieksekusi ulang selama tab masih sama).
// 3. sessionStorage dipakai sebagai penanda "sudah pernah tampil di sesi
//    ini" - kalau tab ditutup lalu app dibuka lagi (sesi baru), splash
//    akan muncul lagi sekali; tapi selama masih di sesi/tab yang sama,
//    tidak akan muncul dobel.
const splashInitScript = `
(function () {
  try {
    var el = document.getElementById('app-splash');
    if (!el) return;
    if (sessionStorage.getItem('emyu_splash_shown')) {
      el.style.display = 'none';
      return;
    }
    sessionStorage.setItem('emyu_splash_shown', '1');
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      setTimeout(function () { el.style.display = 'none'; }, 300);
    }, 650);
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeName = await getStoreName();

  return (
    <html lang="id" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh bg-background font-sans">
        {/* Splash screen - lihat penjelasan splashInitScript di atas soal
            kenapa ini cuma muncul sekali per sesi, bukan tiap pindah
            halaman. suppressHydrationWarning karena elemen ini sengaja
            dimanipulasi vanilla JS di luar React (persis seperti pola
            themeInitScript di <head>). */}
        <div
          id="app-splash"
          suppressHydrationWarning
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 bg-[#0d0d0d] transition-opacity duration-300"
        >
          <span className="text-xl font-semibold tracking-tight text-white">{storeName}</span>
          <div className="h-[3px] w-28 overflow-hidden rounded-full bg-white/15">
            <div className="splash-bar h-full w-2/5 rounded-full bg-white" />
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: splashInitScript }} />

        <ThemeProvider>
          <SiteHeader storeName={storeName} />
          <main className="pb-20 md:pb-0">{children}</main>
          <BottomNav />
          <ThemedToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
