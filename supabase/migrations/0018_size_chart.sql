-- =========================================================
-- 0018: Size Chart Interaktif
-- =========================================================
-- Fitur baru: tabel ukuran terstruktur yang bisa dipakai ulang lintas
-- produk (1 chart bisa dipasang ke banyak produk sekaligus), berbeda
-- dari products.size_guide (teks bebas) yang sudah ada sebelumnya.
-- Keduanya tetap hidup berdampingan: size_guide untuk catatan bebas,
-- size_charts untuk tabel ukuran yang bisa ditampilkan interaktif.
-- =========================================================

create table if not exists size_charts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category_id uuid references categories(id) on delete set null,
  measurement_unit text not null default 'cm',
  columns jsonb not null default '[]'::jsonb,        -- ["Lebar Dada", "Panjang Badan"]
  rows jsonb not null default '[]'::jsonb,            -- [{"size":"S","values":[50,65]}, ...]
  how_to_measure text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table products add column if not exists size_chart_id uuid references size_charts(id) on delete set null;

alter table size_charts enable row level security;

create policy "public read size_charts" on size_charts for select using (true);
create policy "admin insert size_charts" on size_charts for insert with check (is_admin());
create policy "admin update size_charts" on size_charts for update using (is_admin());
create policy "admin delete size_charts" on size_charts for delete using (is_admin());
