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
  manifest: "/manifest.json",
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
