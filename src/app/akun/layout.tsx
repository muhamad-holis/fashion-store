import { createClient } from "@/lib/supabase/server";
import { AccountSidebar } from "@/components/account/account-sidebar";

// Layout ini membungkus SEMUA halaman di /akun/* (profil, alamat, pesanan,
// retur, dst). Tujuannya: kasih sidebar navigasi yang tetap terlihat
// khusus di layar tablet/desktop (md ke atas), supaya halaman-halaman
// "app-style" itu tidak nampak nempel ke kiri dengan ruang kosong besar
// di kanan saat dibuka di layar lebar.
//
// PENTING: semua className di sini pakai prefix "md:" saja - di HP (di
// bawah breakpoint md) elemen div ini nyaris tidak berpengaruh apa-apa,
// jadi tampilan mobile yang sudah bagus TIDAK berubah sama sekali.
export default async function AkunLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Guest (belum login): tampilkan halaman apa adanya tanpa sidebar. Hampir
  // semua menu di sidebar butuh akun, dan tampilan guest di /akun sendiri
  // sudah dirancang sesuai (lihat src/app/akun/page.tsx).
  if (!user) return <>{children}</>;

  const [{ data: settings }, { count: wishlistCount }, { count: unreadNotifCount }] =
    await Promise.all([
      supabase.from("settings").select("whatsapp").eq("id", 1).maybeSingle(),
      supabase
        .from("wishlist_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false),
    ]);

  return (
    <div className="md:mx-auto md:max-w-5xl md:grid md:grid-cols-[260px_1fr] md:items-start md:gap-6 md:px-4 md:py-6">
      <AccountSidebar
        wishlistCount={wishlistCount ?? 0}
        unreadNotifCount={unreadNotifCount ?? 0}
        whatsapp={settings?.whatsapp}
      />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
