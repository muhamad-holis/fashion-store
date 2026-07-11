import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NotificationList } from "@/components/account/notification-list";

export const metadata = { title: "Notifikasi" };

export type NotificationRow = {
  id: string;
  order_id: string | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  orders: { order_number: string } | null;
};

export default async function NotificationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let notifications: NotificationRow[] = [];
  if (user) {
    const { data } = await supabase
      .from("notifications")
      .select("id, order_id, title, message, is_read, created_at, orders(order_number)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    notifications = (data as unknown as NotificationRow[]) ?? [];
  }

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-30 glass">
        <div className="container flex h-14 max-w-md items-center gap-3">
          <Link href="/akun" className="rounded-full p-1.5 transition hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-semibold">Notifikasi</h1>
        </div>
      </div>

      <div className="container max-w-md py-4">
        {!user ? (
          <div className="premium-card flex flex-col items-center gap-2 p-10 text-center">
            <p className="text-sm text-muted-foreground">Masuk untuk melihat notifikasi kamu.</p>
            <Link
              href="/akun/login"
              className="mt-2 rounded-full bg-foreground px-5 py-2 text-xs font-semibold text-background"
            >
              Masuk Sekarang
            </Link>
          </div>
        ) : (
          <NotificationList initialNotifications={notifications} />
        )}
      </div>
    </div>
  );
}
