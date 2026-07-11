import { createClient } from "@/lib/supabase/server";
import { ProfileCard } from "@/components/account/profile-card";
import { GuestCard } from "@/components/account/guest-card";
import { OrderStatusGrid, type OrderStatusCounts } from "@/components/account/order-status-grid";
import { TrackOrderCard } from "@/components/account/track-order-card";
import { MenuList } from "@/components/account/menu-list";
import { RecommendSection } from "@/components/account/recommend-section";
import { Reveal } from "@/components/account/reveal";
import type { OrderStatus, Product } from "@/types/database";

export const metadata = { title: "Akun Saya" };

function countByStatus(statuses: OrderStatus[]): OrderStatusCounts {
  const bucket: OrderStatusCounts = {
    unpaid: 0,
    packed: 0,
    shipped: 0,
    arrived: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const s of statuses) {
    if (s === "unpaid" || s === "waiting_verification") bucket.unpaid++;
    else if (s === "processing" || s === "packed") bucket.packed++;
    else if (s === "shipped") bucket.shipped++;
    else if (s === "arrived") bucket.arrived++;
    else if (s === "completed") bucket.completed++;
    else if (s === "cancelled") bucket.cancelled++;
  }
  return bucket;
}

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: settings }, recommendedRes] = await Promise.all([
    supabase.from("settings").select("whatsapp, store_name").eq("id", 1).maybeSingle(),
    supabase
      .from("products")
      .select("*, product_images(*)")
      .eq("is_active", true)
      .order("sold_count", { ascending: false })
      .limit(6),
  ]);
  const recommended = (recommendedRes.data ?? []) as Product[];

  if (!user) {
    return (
      <div className="container max-w-md space-y-4 py-6">
        <h1 className="px-1 text-xl font-bold tracking-tight">Akun Saya</h1>
        <GuestCard />
        <Reveal delay={0.1}>
          <TrackOrderCard />
        </Reveal>
        <Reveal delay={0.15}>
          <MenuList whatsapp={settings?.whatsapp} excludeSignout />
        </Reveal>
        <RecommendSection products={recommended} />
      </div>
    );
  }

  const [{ data: profile }, { data: orders }, { count: wishlistCount }, { count: unreadNotifCount }] =
    await Promise.all([
      supabase.from("profiles").select("full_name, phone, avatar_url").eq("id", user.id).maybeSingle(),
      supabase.from("orders").select("status").eq("user_id", user.id),
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

  const counts = countByStatus((orders ?? []).map((o) => o.status as OrderStatus));
  const displayName = profile?.full_name || user.email?.split("@")[0] || "Pengguna";

  return (
    <div className="container max-w-md space-y-4 py-6">
      <h1 className="px-1 text-xl font-bold tracking-tight">Akun Saya</h1>

      <ProfileCard
        name={displayName}
        subtitle={profile?.phone || user.email || undefined}
        avatarUrl={profile?.avatar_url}
      />

      <OrderStatusGrid counts={counts} />

      <Reveal delay={0.1}>
        <TrackOrderCard />
      </Reveal>

      <Reveal delay={0.15}>
        <MenuList
          wishlistCount={wishlistCount ?? 0}
          unreadNotifCount={unreadNotifCount ?? 0}
          whatsapp={settings?.whatsapp}
        />
      </Reveal>

      <RecommendSection products={recommended} />
    </div>
  );
}
