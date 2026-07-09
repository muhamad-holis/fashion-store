/**
 * MODUL ONGKIR
 * ---------------------------------------------------------
 * Jika RAJAONGKIR_API_KEY diisi di .env, fungsi getShippingOptions()
 * akan memanggil API RajaOngkir/Komerce yang sesungguhnya.
 * Jika kosong, sistem otomatis fallback ke kalkulasi manual
 * berbasis berat (gram) & jarak kota (tabel perkiraan) supaya
 * checkout tetap bisa berjalan sebelum kamu punya API key.
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

interface GetShippingParams {
  destinationCity: string;
  originCity?: string; // kota asal toko, default dari settings
  totalWeightGrams: number;
}

export async function getShippingOptions({
  destinationCity,
  totalWeightGrams,
}: GetShippingParams): Promise<ShippingOption[]> {
  const apiKey = process.env.RAJAONGKIR_API_KEY;

  if (apiKey) {
    return getShippingOptionsFromRajaOngkir({ destinationCity, totalWeightGrams, apiKey });
  }

  return getManualShippingEstimate({ destinationCity, totalWeightGrams });
}

/**
 * Integrasi RajaOngkir / Komerce (format v1 Komerce sebagai contoh).
 * Sesuaikan endpoint & response mapping dengan dokumentasi resmi
 * penyedia yang kamu pakai (RajaOngkir Starter/Pro atau Komerce).
 * Dokumentasi: https://rajaongkir.komerce.id/
 */
async function getShippingOptionsFromRajaOngkir({
  destinationCity,
  totalWeightGrams,
  apiKey,
}: GetShippingParams & { apiKey: string }): Promise<ShippingOption[]> {
  try {
    const baseUrl = process.env.RAJAONGKIR_BASE_URL || "https://rajaongkir.komerce.id/api/v1";
    const results: ShippingOption[] = [];

    for (const courier of COURIERS) {
      const res = await fetch(`${baseUrl}/calculate/domestic-cost`, {
        method: "POST",
        headers: {
          key: apiKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          destination: destinationCity,
          weight: String(totalWeightGrams),
          courier: courier.code,
        }),
      });

      if (!res.ok) continue;
      const json = await res.json();

      for (const service of json?.data ?? []) {
        results.push({
          courier_code: courier.code,
          courier_name: courier.name,
          service: service.service,
          eta: service.etd ? `${service.etd} hari` : "-",
          cost: service.cost,
        });
      }
    }

    if (results.length > 0) return results;
    // Jika API gagal / kosong, fallback ke manual supaya checkout tidak buntu
    return getManualShippingEstimate({ destinationCity, totalWeightGrams });
  } catch (error) {
    console.error("RajaOngkir API error, fallback ke estimasi manual:", error);
    return getManualShippingEstimate({ destinationCity, totalWeightGrams });
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
