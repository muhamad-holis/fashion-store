/**
 * HELPER COD (Bayar di Tempat) - PENCOCOKAN AREA
 * ---------------------------------------------------------
 * COD hanya diizinkan untuk alamat yang kecamatan (district) & kelurahan
 * (subdistrict)-nya cocok dengan salah satu area yang diizinkan admin
 * (settings.cod_areas). File ini dipakai di DUA tempat:
 *
 * 1. Client (checkout page) - untuk MENAMPILKAN atau MENYEMBUNYIKAN opsi
 *    COD saat buyer mengisi alamat. Ini HANYA untuk UX, bukan keamanan.
 * 2. Server (api/orders/route.ts) - untuk VALIDASI ULANG yang sesungguhnya
 *    sebelum order dibuat. Client TIDAK PERNAH dipercaya untuk keputusan
 *    akhir apakah COD boleh dipakai atau tidak.
 * ---------------------------------------------------------
 */

export interface CodArea {
  district: string;
  subdistrict: string;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/**
 * Cek apakah kombinasi kecamatan (district) + kelurahan (subdistrict)
 * cocok dengan salah satu area yang diizinkan. Perbandingan case-insensitive
 * dan mengabaikan spasi di awal/akhir supaya tidak terlalu kaku (mis. admin
 * mengetik "Kebayoran Baru" tapi buyer mengetik "kebayoran baru ").
 */
export function isAreaAllowedForCod(
  district: string | null | undefined,
  subdistrict: string | null | undefined,
  allowedAreas: CodArea[] | null | undefined
): boolean {
  if (!allowedAreas || allowedAreas.length === 0) return false;
  const d = normalize(district);
  const s = normalize(subdistrict);
  if (!d || !s) return false;

  return allowedAreas.some(
    (area) => normalize(area.district) === d && normalize(area.subdistrict) === s
  );
}
