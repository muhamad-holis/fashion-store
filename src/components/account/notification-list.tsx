"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import type { NotificationRow } from "@/app/akun/notifikasi/page";

export function NotificationList({ initialNotifications }: { initialNotifications: NotificationRow[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [notifications, setNotifications] = useState(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function markAsRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    router.refresh();
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    router.refresh();
  }

  if (notifications.length === 0) {
    return (
      <div className="premium-card flex flex-col items-center gap-2 p-10 text-center">
        <Bell className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Belum ada notifikasi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {unreadCount > 0 && (
        <button
          onClick={markAllAsRead}
          className="ripple flex w-full items-center justify-center gap-1.5 rounded-2xl border border-border py-2.5 text-xs font-medium transition hover:bg-secondary"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Tandai semua sudah dibaca
        </button>
      )}

      <div className="premium-card divide-y divide-border overflow-hidden">
        {notifications.map((n) => {
          const content = (
            <div className={`flex items-start gap-3 px-4 py-3.5 ${!n.is_read ? "bg-secondary/30" : ""}`}>
              {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-foreground" />}
              <div className={`min-w-0 flex-1 ${n.is_read ? "pl-5" : ""}`}>
                <p className="text-sm font-medium">{n.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{formatDate(n.created_at)}</p>
              </div>
            </div>
          );

          if (n.orders?.order_number) {
            return (
              <Link
                key={n.id}
                href={`/invoice/${n.orders.order_number}`}
                onClick={() => !n.is_read && markAsRead(n.id)}
                className="ripple block transition hover:bg-secondary/40"
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={n.id}
              onClick={() => !n.is_read && markAsRead(n.id)}
              className="ripple block w-full text-left transition hover:bg-secondary/40"
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
