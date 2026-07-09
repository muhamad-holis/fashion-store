"use client";

import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  if (isLogin) return <>{children}</>;

  return (
    <div className="min-h-dvh">
      <AdminSidebar />
      <div className="md:ml-64">
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
