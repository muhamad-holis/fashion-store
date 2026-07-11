"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DeleteButton } from "@/components/admin/delete-button";
import type { Faq } from "@/types/database";

export default function AdminFaqPage() {
  const supabase = createClient();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ question: "", answer: "", sort_order: "0" });

  async function load() {
    const { data } = await supabase.from("faqs").select("*").order("sort_order");
    setFaqs((data as Faq[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setForm({ question: "", answer: "", sort_order: "0" });
    setEditingId(null);
  }

  function startEdit(faq: Faq) {
    setForm({ question: faq.question, answer: faq.answer, sort_order: String(faq.sort_order) });
    setEditingId(faq.id);
  }

  async function handleSubmit() {
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error("Pertanyaan dan jawaban wajib diisi");
      return;
    }
    setSaving(true);
    const payload = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = editingId
      ? await supabase.from("faqs").update(payload).eq("id", editingId)
      : await supabase.from("faqs").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editingId ? "FAQ berhasil diperbarui" : "FAQ berhasil ditambahkan");
    resetForm();
    load();
  }

  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase.from("faqs").update({ is_active: !current }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    load();
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-lg font-semibold">FAQ / Pusat Bantuan</h1>

      <div className="rounded-xl border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold">{editingId ? "Edit FAQ" : "Tambah FAQ Baru"}</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Pertanyaan</label>
            <input
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Jawaban</label>
            <textarea
              value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value })}
              rows={3}
              className="input resize-none"
            />
          </div>
          <div className="max-w-[160px]">
            <label className="mb-1 block text-xs text-muted-foreground">Urutan Tampil</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              className="input"
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {!editingId && <Plus className="h-4 w-4" />}
            {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah FAQ"}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground"
            >
              Batal
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Urutan</th>
              <th className="p-3">Pertanyaan</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {faqs.map((f) => (
              <tr key={f.id} className="border-b border-border last:border-0">
                <td className="p-3 text-muted-foreground">{f.sort_order}</td>
                <td className="p-3 font-medium">{f.question}</td>
                <td className="p-3">
                  <button
                    onClick={() => toggleActive(f.id, f.is_active)}
                    className={`rounded-full px-2 py-1 text-xs ${f.is_active ? "bg-secondary" : "bg-destructive/20 text-destructive"}`}
                  >
                    {f.is_active ? "Aktif" : "Nonaktif"}
                  </button>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => startEdit(f)} className="text-xs underline">
                      Edit
                    </button>
                    <DeleteButton table="faqs" id={f.id} label="FAQ" onDeleted={load} />
                  </div>
                </td>
              </tr>
            ))}
            {!loading && faqs.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">
                  Belum ada FAQ.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
