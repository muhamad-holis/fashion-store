"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, Trash2, UserPlus } from "lucide-react";
import type { Admin } from "@/types/database";

export default function KelolaAdminPage() {
  const [me, setMe] = useState<{ id: string; role: string } | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "admin" as "admin" | "super_admin",
  });

  async function load() {
    setLoading(true);
    try {
      const meRes = await fetch("/api/admin/me");
      const meJson = await meRes.json();
      const role = meJson.role as string | null;

      const listRes = await fetch("/api/admin/admins");
      if (listRes.ok) {
        const listJson = await listRes.json();
        setAdmins(listJson.admins ?? []);
        if (listJson.myId && role) setMe({ id: listJson.myId, role });
      } else if (role) {
        // Bukan super admin - tidak boleh list semua admin, cukup tahu role sendiri
        setMe(meJson.isAdmin ? { id: "", role } : null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const isSuperAdmin = me?.role === "super_admin";

  async function handleAdd() {
    if (!form.full_name || !form.email || !form.password) {
      toast.error("Nama, email, dan password wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menambah admin");

      toast.success("Admin baru berhasil ditambahkan");
      setForm({ full_name: "", email: "", password: "", role: "admin" });
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(id: string, role: "admin" | "super_admin") {
    try {
      const res = await fetch(`/api/admin/admins/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengubah role");
      toast.success("Role diperbarui");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Cabut akses admin untuk "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/admins/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menghapus admin");
      toast.success("Akses admin dicabut");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Memuat...</p>;
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border p-8 text-center">
        <ShieldAlert className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium">Akses terbatas</p>
        <p className="text-sm text-muted-foreground">
          Hanya super admin yang bisa mengelola akun admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Kelola Admin</h1>

      <div className="rounded-xl border border-border p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-medium">
          <UserPlus className="h-4 w-4" />
          Tambah Admin Baru
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Nama Lengkap</label>
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Password</label>
            <input
              type="password"
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "super_admin" })}
              className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none"
            >
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={saving}
          className="mt-3 w-full rounded-lg bg-foreground py-2.5 text-sm font-medium text-background disabled:opacity-50 sm:w-auto sm:px-6"
        >
          {saving ? "Menyimpan..." : "Tambah Admin"}
        </button>
      </div>

      <div className="rounded-xl border border-border">
        <p className="border-b border-border p-4 text-sm font-medium">Daftar Admin ({admins.length})</p>
        <div className="divide-y divide-border">
          {admins.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{a.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">{a.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <select
                  value={a.role}
                  onChange={(e) => handleRoleChange(a.id, e.target.value as "admin" | "super_admin")}
                  disabled={a.id === me?.id}
                  className="rounded-lg border border-border bg-secondary/50 px-2 py-1.5 text-xs outline-none disabled:opacity-50"
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                <button
                  onClick={() => handleDelete(a.id, a.full_name)}
                  disabled={a.id === me?.id}
                  className="text-destructive disabled:opacity-30"
                  title={a.id === me?.id ? "Tidak bisa menghapus diri sendiri" : "Cabut akses"}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
