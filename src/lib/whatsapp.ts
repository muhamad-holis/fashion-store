// Kirim notifikasi WhatsApp ke admin via Fonnte (https://fonnte.com).
//
// Setup:
// 1. Daftar akun di https://fonnte.com, scan QR untuk hubungkan nomor WA
// 2. Ambil token di Dashboard > Device > (device kamu) > Token
// 3. Isi di .env:
//      FONNTE_API_TOKEN=xxxxxxxxxxxxxxxx
//      ADMIN_WHATSAPP_NUMBER=62812xxxxxxxx   (format 62, tanpa "+" atau "0" di depan)
//
// Fungsi ini sengaja dibuat "fail-safe": kalau token belum diisi atau request
// ke Fonnte gagal/timeout, fungsi ini TIDAK melempar error ke pemanggilnya.
// Checkout / proses order tidak boleh gagal hanya karena notifikasi WA gagal.

interface OrderNotificationData {
  orderNumber: string;
  buyerName: string;
  buyerPhone: string;
  grandTotal: number;
  paymentMethod: string;
  itemsSummary: string; // contoh: "2x Kaos Hitam, 1x Hoodie Cream"
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(
    amount
  );
}

const PAYMENT_LABELS: Record<string, string> = {
  bank_transfer: "Transfer Bank",
  ewallet: "E-Wallet",
  qris: "QRIS",
  cod: "COD (Bayar di Tempat)",
};

export async function sendAdminOrderNotification(data: OrderNotificationData): Promise<void> {
  const token = process.env.FONNTE_API_TOKEN;
  const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;

  if (!token || !adminNumber) {
    // Belum dikonfigurasi — jangan ganggu proses order, cukup catat di log.
    console.warn("[whatsapp] FONNTE_API_TOKEN / ADMIN_WHATSAPP_NUMBER belum diisi, notifikasi WA dilewati");
    return;
  }

  const paymentLabel = PAYMENT_LABELS[data.paymentMethod] ?? data.paymentMethod;

  const message = [
    "🛒 *Pesanan Baru Masuk!*",
    "",
    `No. Pesanan: *${data.orderNumber}*`,
    `Pembeli: ${data.buyerName}`,
    `No. HP: ${data.buyerPhone}`,
    `Item: ${data.itemsSummary}`,
    `Total: *${formatRupiah(data.grandTotal)}*`,
    `Pembayaran: ${paymentLabel}`,
    "",
    "Cek detail & proses di dashboard admin.",
  ].join("\n");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        target: adminNumber,
        message,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error("[whatsapp] Fonnte merespons error:", res.status, await res.text());
    }
  } catch (err) {
    // Timeout, network error, dsb — jangan lempar, cukup log.
    console.error("[whatsapp] Gagal mengirim notifikasi WA:", err);
  }
}
