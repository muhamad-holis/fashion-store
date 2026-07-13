"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, X, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DeleteButton } from "@/components/admin/delete-button";
import type { SizeChart, Category } from "@/types/database";

type RowDraft = { size: string; values: string[] };

const emptyForm = {
  name: "",
  category_id: "",
  measurement_unit: "cm",
  how_to_measure: "",
};

export default function AdminSizeChartPage() {
  const supabase = createClient();
  const [charts, setCharts] = useState<SizeChart[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [columns, setColumns] = useState<string[]>(["Lebar Dada", "Panjang Badan"]);
  const [columnDraft, setColumnDraft] = useState("");
  const [rows, setRows] = useState<RowDraft[]>([{ size: "S", values: ["", ""] }]);

  async function load() {
    const [{ data: chartData }, { data: catData }] = await Promise.all([
      supabase.from("size_charts").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("sort_order"),
    ]);
    setCharts((chartData as SizeChart[]) ?? []);
    setCategories(catData ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setColumns(["Lebar Dada", "Panjang Badan"]);
    setColumnDraft("");
    setRows([{ size: "S", values: ["", ""] }]);
    setEditingId(null);
  }

  function startEdit(chart: SizeChart) {
    setForm({
      name: chart.name,
      category_id: chart.category_id ?? "",
      measurement_unit: chart.measurement_unit,
      how_to_measure: chart.how_to_measure ?? "",
    });
    setColumns(chart.columns ?? []);
    setRows(
      (chart.rows ?? []).map((r) => ({
        size: r.size,
        values: r.values.map((v) => String(v)),
      }))
    );
    setEditingId(chart.id);
  }

  function addColumn() {
    const label = columnDraft.trim();
    if (!label) return;
    if (columns.includes(label)) {
      toast.error("Kolom pengukuran ini sudah ada");
      return;
    }
    setColumns([...columns, label]);
    setRows(rows.map((r) => ({ ...r, values: [...r.values, ""] })));
    setColumnDraft("");
  }

  function removeColumn(idx: number) {
    setColumns(columns.filter((_, i) => i !== idx));
    setRows(rows.map((r) => ({ ...r, values: r.values.filter((_, i) => i !== idx) })));
  }

  function addRow() {
    setRows([...rows, { size: "", values: columns.map(() => "") }]);
  }

  function removeRow(idx: number) {
    setRows(rows.filter((_, i) => i !== idx));
  }

  function updateRowSize(idx: number, size: string) {
    setRows(rows.map((r, i) => (i === idx ? { ...r, size } : r)));
  }

  function updateRowValue(rowIdx: number, colIdx: number, value: string) {
    setRows(
      rows.map((r, i) =>
        i === rowIdx ? { ...r, values: r.values.map((v, j) => (j === colIdx ? value : v)) } : r
      )
    );
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Nama size chart wajib diisi");
      return;
    }
    if (columns.length === 0) {
      toast.error("Tambahkan minimal 1 kolom pengukuran (mis. Lebar Dada)");
      return;
    }
    const cleanRows = rows.filter((r) => r.size.trim() !== "");
    if (cleanRows.length === 0) {
      toast.error("Tambahkan minimal 1 baris ukuran (mis. S, M, L)");
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category_id: form.category_id || null,
      measurement_unit: form.measurement_unit.trim() || "cm",
      columns,
      rows: cleanRows.map((r) => ({
        size: r.size.trim(),
        values: r.values.map((v) => Number(v) || 0),
      })),
      how_to_measure: form.how_to_measure.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = editingId
      ? await supabase.from("size_charts").update(payload).eq("id", editingId)
      : await supabase.from("size_charts").insert(payload);

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editingId ? "Size chart berhasil diperbarui" : "Size chart berhasil ditambahkan");
    resetForm();
    load();
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-lg font-semibold">Size Chart</h1>
      <p className="text-sm text-muted-foreground">
        Bikin tabel ukuran sekali, lalu pasang ke banyak produk lewat dropdown &quot;Size Chart&quot; di
        halaman edit produk.
      </p>

      <div className="rounded-xl border border-border p-4 space-y-4">
        <h2 className="text-sm font-semibold">{editingId ? "Edit Size Chart" : "Tambah Size Chart Baru"}</h2>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Nama Chart</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Contoh: Kaos Unisex Oversize"
              className="input"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Kategori (opsional)</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="input"
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="max-w-[160px]">
            <label className="mb-1 block text-xs text-muted-foreground">Satuan</label>
            <input
              value={form.measurement_unit}
              onChange={(e) => setForm({ ...form, measurement_unit: e.target.value })}
              placeholder="cm"
              className="input"
            />
          </div>
        </div>

        {/* Kolom Pengukuran */}
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Kolom Pengukuran</label>
          <div className="mb-2 flex flex-wrap gap-2">
            {columns.map((col, idx) => (
              <span
                key={idx}
                className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs"
              >
                {col}
                <button onClick={() => removeColumn(idx)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={columnDraft}
              onChange={(e) => setColumnDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addColumn();
                }
              }}
              placeholder="Contoh: Lebar Bahu"
              className="input"
            />
            <button
              type="button"
              onClick={addColumn}
              className="shrink-0 rounded-lg border border-border px-3 text-sm"
            >
              Tambah
            </button>
          </div>
        </div>

        {/* Tabel Baris Ukuran */}
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Tabel Ukuran</label>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-xs text-muted-foreground">
                <tr>
                  <th className="p-2 text-left">Ukuran</th>
                  {columns.map((col, idx) => (
                    <th key={idx} className="p-2 text-left whitespace-nowrap">
                      {col} ({form.measurement_unit || "cm"})
                    </th>
                  ))}
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-t border-border">
                    <td className="p-2">
                      <input
                        value={row.size}
                        onChange={(e) => updateRowSize(rowIdx, e.target.value)}
                        placeholder="S"
                        className="input w-20"
                      />
                    </td>
                    {row.values.map((val, colIdx) => (
                      <td key={colIdx} className="p-2">
                        <input
                          type="number"
                          value={val}
                          onChange={(e) => updateRowValue(rowIdx, colIdx, e.target.value)}
                          className="input w-24"
                        />
                      </td>
                    ))}
                    <td className="p-2">
                      <button onClick={() => removeRow(rowIdx)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={addRow}
            className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground underline"
          >
            <Plus className="h-3 w-3" />
            Tambah Baris Ukuran
          </button>
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Cara Mengukur (opsional)</label>
          <textarea
            value={form.how_to_measure}
            onChange={(e) => setForm({ ...form, how_to_measure: e.target.value })}
            rows={3}
            placeholder="Contoh: Ukur lebar dada dari ketiak kiri ke ketiak kanan dalam posisi baju dilipat rata..."
            className="input resize-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {!editingId && <Plus className="h-4 w-4" />}
            {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah Size Chart"}
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
              <th className="p-3">Nama</th>
              <th className="p-3">Kategori</th>
              <th className="p-3">Jumlah Ukuran</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {charts.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 text-muted-foreground">
                  {categories.find((cat) => cat.id === c.category_id)?.name ?? "Semua Kategori"}
                </td>
                <td className="p-3 text-muted-foreground">{c.rows?.length ?? 0} ukuran</td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => startEdit(c)} className="text-xs underline">
                      Edit
                    </button>
                    <DeleteButton table="size_charts" id={c.id} label="size chart" onDeleted={load} />
                  </div>
                </td>
              </tr>
            ))}
            {!loading && charts.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">
                  Belum ada size chart.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
