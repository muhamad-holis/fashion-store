-- =========================================================
-- SEED DATA AWAL (aman dijalankan sekali, dipakai agar toko tidak kosong)
-- =========================================================

insert into sizes (label, sort_order) values
  ('XS', 1), ('S', 2), ('M', 3), ('L', 4), ('XL', 5), ('XXL', 6)
on conflict (label) do nothing;

insert into colors (name, hex_code) values
  ('Hitam', '#111111'),
  ('Putih', '#FAFAFA'),
  ('Abu-abu', '#8A8A8A'),
  ('Krem', '#E8DFCB'),
  ('Navy', '#1B2A4A')
on conflict do nothing;

insert into categories (name, slug, sort_order) values
  ('Fashion Pria', 'fashion-pria', 1),
  ('Fashion Wanita', 'fashion-wanita', 2),
  ('Aksesoris', 'aksesoris', 3)
on conflict (slug) do nothing;
