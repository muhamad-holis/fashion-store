/**
 * MODUL ONGKIR
 * ---------------------------------------------------------
 * Jika RAJAONGKIR_API_KEY diisi di .env, fungsi getShippingOptions()
 * akan memanggil API RajaOngkir/Komerce (API V2) yang sesungguhnya.
 * Jika kosong / gagal / origin belum di-set, sistem otomatis fallback
 * ke kalkulasi manual berbasis berat (gram) & zona kota supaya
 * checkout tetap bisa berjalan.
 *
 * PENTING - yang wajib ada di .env untuk pakai API asli:
 *   RAJAONGKIR_API_KEY   -> API key dari dashboard rajaongkir.komerce.id
 *   RAJAONGKIR_ORIGIN_ID -> ID kecamatan/kelurahan (subdistrict/district ID)
 *                           lokasi toko kamu (kota asal pengiriman).
 *                           Cara dapatkan ID ini: panggil endpoint
 *                           /destination/domestic-destination?search=<nama kota toko>
 *                           lalu catat "id" hasil pencarian yang sesuai.
 * ---------------------------------------------------------
 */

export interface ShippingOption {
  courier_code: string;
  courier_name: string;
  service: string; // REG, YES, OKE, dst
  eta: string; // "2-3 hari"
  cost: number;
}

const COURIERS = [
  { code: "jne", name: "JNE" },
  { code: "jnt", name: "J&T Express" },
  { code: "sicepat", name: "SiCepat" },
  { code: "ninja", name: "Ninja Express" },
  { code: "anteraja", name: "AnterAja" },
  { code: "pos", name: "Pos Indonesia" },
  { code: "tiki", name: "TIKI" },
  { code: "lion", name: "Lion Parcel" },
  { code: "idexpress", name: "ID Express" },
  { code: "sap", name: "SAP Express" },
];

// Dipakai untuk mapping code -> name di hasil response (response API cuma
// balikin "code", bukan nama lengkap yang konsisten dengan daftar di atas).
const COURIER_NAME_MAP: Record<string, string> = Object.fromEntries(
  COURIERS.map((c) => [c.code, c.name])
);

interface GetShippingParams {
  destinationCity: string;
  originCity?: string; // tidak dipakai lagi untuk API asli (pakai RAJAONGKIR_ORIGIN_ID), disisakan untuk fallback manual
  totalWeightGrams: number;
}

export async function getShippingOptions({
  destinationCity,
  totalWeightGrams,
}: GetShippingParams): Promise<ShippingOption[]> {
  const apiKey = process.env.RAJAONGKIR_API_KEY;
  const originId = process.env.RAJAONGKIR_ORIGIN_ID;

  if (apiKey && originId) {
    return getShippingOptionsFromRajaOngkir({
      destinationCity,
      totalWeightGrams,
      apiKey,
      originId,
    });
  }

  if (apiKey && !originId) {
    console.warn(
      "RAJAONGKIR_API_KEY di-set tapi RAJAONGKIR_ORIGIN_ID kosong. " +
        "Fallback ke estimasi manual. Lihat komentar di lib/shipping.ts untuk cara dapatkan ID origin."
    );
  }

  return getManualShippingEstimate({ destinationCity, totalWeightGrams });
}

/**
 * Integrasi RajaOngkir / Komerce API V2.
 * Dokumentasi: https://rajaongkir.com/docs/shipping-cost/getting_started/about
 *
 * Catatan penting:
 * - "destination" WAJIB berupa ID (district/subdistrict id), bukan nama kota.
 *   Karena itu kita cari ID-nya dulu lewat endpoint search destination.
 * - "origin" WAJIB dikirim (ID kota/kecamatan asal toko).
 * - Semua kurir digabung jadi SATU request (dipisah titik dua) supaya hemat
 *   kuota harian, bukan 1 request per kurir.
 */
async function getShippingOptionsFromRajaOngkir({
  destinationCity,
  totalWeightGrams,
  apiKey,
  originId,
}: GetShippingParams & { apiKey: string; originId: string }): Promise<ShippingOption[]> {
  try {
    const baseUrl = process.env.RAJAONGKIR_BASE_URL || "https://rajaongkir.komerce.id/api/v1";

    // 1. Cari destination ID dari nama kota/kecamatan yang diketik user.
    const destinationId = await searchDestinationId(destinationCity, apiKey, baseUrl);

    if (!destinationId) {
      console.error(
        `RajaOngkir: destination "${destinationCity}" tidak ditemukan, fallback ke estimasi manual.`
      );
      return getManualShippingEstimate({ destinationCity, totalWeightGrams });
    }

    // 2. Hitung ongkir untuk SEMUA kurir sekaligus dalam satu request.
    const courierParam = COURIERS.map((c) => c.code).join(":");

    const res = await fetch(`${baseUrl}/calculate/domestic-cost`, {
      method: "POST",
      headers: {
        key: apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        origin: originId,
        destination: destinationId,
        weight: String(totalWeightGrams),
        courier: courierParam,
        price: "lowest",
      }),
    });

    if (!res.ok) {
      console.error(`RajaOngkir API error: HTTP ${res.status}`);
      return getManualShippingEstimate({ destinationCity, totalWeightGrams });
    }

    const json = await res.json();

    if (json?.meta?.status !== "success" || !Array.isArray(json?.data)) {
      console.error("RajaOngkir API error:", json?.meta?.message ?? "response tidak valid");
      return getManualShippingEstimate({ destinationCity, totalWeightGrams });
    }

    const results: ShippingOption[] = json.data.map(
      (item: { code: string; name: string; service: string; cost: number; etd: string }) => ({
        courier_code: item.code,
        courier_name: COURIER_NAME_MAP[item.code] ?? item.name,
        service: item.service,
        eta: item.etd ? `${item.etd} hari` : "-",
        cost: item.cost,
      })
    );

    if (results.length > 0) return results;

    // Jika API sukses tapi hasil kosong (misal semua kurir tidak melayani rute
    // ini), fallback ke manual supaya checkout tidak buntu.
    return getManualShippingEstimate({ destinationCity, totalWeightGrams });
  } catch (error) {
    console.error("RajaOngkir API error, fallback ke estimasi manual:", error);
    return getManualShippingEstimate({ destinationCity, totalWeightGrams });
  }
}

/**
 * Cari ID tujuan (district/subdistrict id) dari nama kota/kecamatan bebas.
 * Dipakai karena endpoint calculate/domestic-cost butuh ID, bukan teks.
 */
async function searchDestinationId(
  query: string,
  apiKey: string,
  baseUrl: string
): Promise<string | null> {
  try {
    const url = `${baseUrl}/destination/domestic-destination?search=${encodeURIComponent(
      query
    )}&limit=1&offset=0`;

    const res = await fetch(url, {
      headers: { key: apiKey },
    });

    if (!res.ok) return null;

    const json = await res.json();
    const first = json?.data?.[0];

    return first?.id ? String(first.id) : null;
  } catch (error) {
    console.error("RajaOngkir search destination error:", error);
    return null;
  }
}

/**
 * Estimasi manual sementara: tarif dasar per kg + faktor zona kota.
 * Ganti/kalibrasi angka ini sesuai kesepakatan tarif toko kamu.
 */
function getManualShippingEstimate({
  destinationCity,
  totalWeightGrams,
}: Omit<GetShippingParams, "originCity">): ShippingOption[] {
  const weightKg = Math.max(1, Math.ceil(totalWeightGrams / 1000));
  const zoneMultiplier = getZoneMultiplier(destinationCity);

  const baseRates: Record<string, { base: number; perKg: number; eta: string }> = {
    jne: { base: 9000, perKg: 8000, eta: "2-3 hari" },
    jnt: { base: 8000, perKg: 7500, eta: "2-4 hari" },
    sicepat: { base: 8500, perKg: 7800, eta: "1-3 hari" },
    ninja: { base: 8000, perKg: 7500, eta: "2-4 hari" },
    anteraja: { base: 8500, perKg: 7500, eta: "2-3 hari" },
    pos: { base: 7000, perKg: 6500, eta: "3-6 hari" },
    tiki: { base: 9000, perKg: 8200, eta: "2-4 hari" },
    lion: { base: 7500, perKg: 7000, eta: "3-5 hari" },
    idexpress: { base: 7500, perKg: 7000, eta: "2-4 hari" },
    sap: { base: 7500, perKg: 7200, eta: "3-5 hari" },
  };

  return COURIERS.map(({ code, name }) => {
    const rate = baseRates[code];
    const cost = Math.round(
      (rate.base + rate.perKg * (weightKg - 1)) * zoneMultiplier / 500
    ) * 500;
    return {
      courier_code: code,
      courier_name: name,
      service: "REG",
      eta: rate.eta,
      cost,
    };
  });
}

function getZoneMultiplier(city: string): number {
  const jabodetabek = ["jakarta", "bogor", "depok", "tangerang", "bekasi"];
  const javaMajor = ["bandung", "semarang", "yogyakarta", "surabaya", "solo", "malang"];
  const cityLower = city.toLowerCase();

  if (jabodetabek.some((c) => cityLower.includes(c))) return 1;
  if (javaMajor.some((c) => cityLower.includes(c))) return 1.3;
  return 1.8; // luar Jawa
}
