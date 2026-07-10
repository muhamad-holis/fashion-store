// Metadata visual (warna + inisial) untuk bank & e-wallet yang belum
// punya logo_url di database. Dipakai sebagai badge placeholder yang
// tetap terlihat premium tanpa perlu aset gambar pihak ketiga.
export type BrandMeta = { initials: string; bg: string; fg: string };

const BANK_BRANDS: Record<string, BrandMeta> = {
  bca: { initials: "BCA", bg: "#0A5CB8", fg: "#FFFFFF" },
  bri: { initials: "BRI", bg: "#00529C", fg: "#FFD200" },
  mandiri: { initials: "MDR", bg: "#003D79", fg: "#F9A825" },
  bni: { initials: "BNI", bg: "#F37021", fg: "#FFFFFF" },
  cimb: { initials: "CIMB", bg: "#E4032E", fg: "#FFFFFF" },
  permata: { initials: "PRM", bg: "#00A19A", fg: "#FFFFFF" },
};

const EWALLET_BRANDS: Record<string, BrandMeta> = {
  dana: { initials: "DANA", bg: "#118EEA", fg: "#FFFFFF" },
  gopay: { initials: "GP", bg: "#00AA13", fg: "#FFFFFF" },
  ovo: { initials: "OVO", bg: "#4C3494", fg: "#FFFFFF" },
  shopeepay: { initials: "SP", bg: "#EE4D2D", fg: "#FFFFFF" },
};

function lookup(table: Record<string, BrandMeta>, name: string): BrandMeta {
  const key = name.toLowerCase().replace(/[^a-z]/g, "");
  const match = Object.keys(table).find((k) => key.includes(k));
  if (match) return table[match];
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase() || "??";
  return { initials, bg: "#2A2A2A", fg: "#FFFFFF" };
}

export function getBankMeta(name: string, logoUrl?: string): BrandMeta & { logoUrl?: string } {
  return { ...lookup(BANK_BRANDS, name), logoUrl };
}

export function getEwalletMeta(name: string, logoUrl?: string): BrandMeta & { logoUrl?: string } {
  return { ...lookup(EWALLET_BRANDS, name), logoUrl };
}
