-- =========================================================
-- 0010: Sinkronisasi Otomatis rating_avg & review_count
-- =========================================================
-- Sebelumnya kolom products.rating_avg dan products.review_count adalah
-- kolom "cache" yang tidak pernah diupdate otomatis - jadi review baru
-- (dari pembeli) atau perubahan visibilitas review (dari admin) tidak
-- pernah tercermin di kartu/detail produk. Trigger ini memperbaikinya:
-- setiap INSERT/UPDATE/DELETE di tabel reviews akan menghitung ulang
-- rata-rata rating & jumlah review (yang is_visible = true saja) untuk
-- produk terkait.

create or replace function sync_product_rating_stats() returns trigger
language plpgsql security definer as $$
declare
  target_product_id uuid;
begin
  target_product_id := coalesce(new.product_id, old.product_id);

  update products p
  set
    rating_avg = coalesce(
      (select round(avg(rating)::numeric, 1) from reviews
       where product_id = target_product_id and is_visible = true),
      0
    ),
    review_count = (
      select count(*) from reviews
      where product_id = target_product_id and is_visible = true
    )
  where p.id = target_product_id;

  return null;
end;
$$;

drop trigger if exists trg_reviews_sync_product_stats on reviews;
create trigger trg_reviews_sync_product_stats
after insert or update or delete on reviews
for each row execute function sync_product_rating_stats();

-- Backfill: sinkronkan data review yang sudah terlanjur masuk sebelum
-- trigger ini ada, supaya begitu migration dijalankan angkanya langsung benar.
update products p
set
  rating_avg = coalesce(
    (select round(avg(rating)::numeric, 1) from reviews
     where product_id = p.id and is_visible = true),
    0
  ),
  review_count = (
    select count(*) from reviews
    where product_id = p.id and is_visible = true
  );
