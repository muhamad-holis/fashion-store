import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SiteHeader } from "@/components/layout/site-header";

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

async function getStoreName() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("settings").select("store_name").eq("id", 1).maybeSingle();
    return data?.store_name || siteName;
  } catch {
    return siteName;
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeName = await getStoreName();

  return (
    <html lang="id" className={`${inter.variable} dark`} suppressHydrationWarning>
      <body className="min-h-dvh bg-background font-sans">
        <SiteHeader storeName={storeName} />
        <main className="pb-20 md:pb-0">{children}</main>
        <BottomNav />
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  );
}
