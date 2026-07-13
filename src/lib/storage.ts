import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * BUG FIX: bucket "payment-proof" sengaja dibuat PRIVATE (lihat
 * migrations/0003_storage_buckets.sql) supaya bukti transfer tidak bisa
 * diakses sembarang orang yang kebetulan tahu URL-nya - hanya admin yang
 * boleh membaca (RLS policy "admin read payment proof").
 *
 * Namun saat upload (api/orders/payment-proof/route.ts), URL yang disimpan
 * ke kolom payment_proofs.image_url dibuat lewat getPublicUrl(), yang
 * menghasilkan URL berformat "/object/public/...". URL jenis ini HANYA bisa
 * diakses kalau bucket-nya public - karena bucket ini private, URL tersebut
 * selalu gagal dimuat (403), berapa kali pun di-reload, di device manapun.
 *
 * Fungsi ini mengubah URL "public" yang tersimpan itu menjadi signed URL
 * sementara (berlaku beberapa jam) yang benar-benar bisa diakses, dibuat
 * khusus untuk sesi admin yang sedang login.
 */
export async function getSignedPaymentProofUrl(
  supabase: SupabaseClient,
  storedImageUrl: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const marker = "/object/public/payment-proof/";
  const idx = storedImageUrl.indexOf(marker);
  if (idx === -1) return null;

  const path = storedImageUrl.slice(idx + marker.length);

  const { data, error } = await supabase.storage
    .from("payment-proof")
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
