/**
 * Dataset wilayah ringkas untuk dropdown alamat checkout.
 * Untuk data kecamatan/kelurahan lengkap se-Indonesia, disarankan
 * integrasi API wilayah seperti https://wilayah.id (gratis, tanpa key)
 * atau region API bawaan provider ongkir yang dipakai.
 */
export const PROVINCES = [
  "DKI Jakarta",
  "Jawa Barat",
  "Jawa Tengah",
  "DI Yogyakarta",
  "Jawa Timur",
  "Banten",
  "Bali",
  "Sumatera Utara",
  "Sumatera Barat",
  "Sumatera Selatan",
  "Kalimantan Timur",
  "Kalimantan Selatan",
  "Sulawesi Selatan",
  "Sulawesi Utara",
  "Nusa Tenggara Barat",
  "Nusa Tenggara Timur",
  "Papua",
  "Aceh",
  "Riau",
  "Lampung",
];

export const CITIES_BY_PROVINCE: Record<string, string[]> = {
  "DKI Jakarta": ["Jakarta Pusat", "Jakarta Utara", "Jakarta Barat", "Jakarta Selatan", "Jakarta Timur"],
  "Jawa Barat": ["Bandung", "Bekasi", "Bogor", "Depok", "Cimahi", "Sukabumi"],
  "Jawa Tengah": ["Semarang", "Solo", "Magelang", "Tegal", "Pekalongan"],
  "DI Yogyakarta": ["Yogyakarta", "Sleman", "Bantul"],
  "Jawa Timur": ["Surabaya", "Malang", "Kediri", "Sidoarjo", "Jember"],
  "Banten": ["Tangerang", "Tangerang Selatan", "Serang", "Cilegon"],
  "Bali": ["Denpasar", "Badung", "Gianyar"],
  "Sumatera Utara": ["Medan", "Binjai", "Pematangsiantar"],
  "Sumatera Barat": ["Padang", "Bukittinggi"],
  "Sumatera Selatan": ["Palembang", "Lubuklinggau"],
  "Kalimantan Timur": ["Samarinda", "Balikpapan"],
  "Kalimantan Selatan": ["Banjarmasin"],
  "Sulawesi Selatan": ["Makassar", "Parepare"],
  "Sulawesi Utara": ["Manado"],
  "Nusa Tenggara Barat": ["Mataram"],
  "Nusa Tenggara Timur": ["Kupang"],
  "Papua": ["Jayapura"],
  "Aceh": ["Banda Aceh"],
  "Riau": ["Pekanbaru"],
  "Lampung": ["Bandar Lampung"],
};
