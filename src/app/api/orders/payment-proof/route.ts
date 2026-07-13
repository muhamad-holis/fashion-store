import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const paymentId = formData.get("payment_id") as string | null;
  // Dipakai untuk verifikasi kepemilikan order guest (lihat CATATAN FIX
  // di bawah) - sama seperti pola yang dipakai di /api/orders/track.
  const phone = (formData.get("phone") as string | null)?.trim() || null;

  if (!file || !paymentId) {
    return NextResponse.json({ error: "file dan payment_id wajib diisi" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Format file harus JPG, PNG, atau WEBP" },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Ukuran file maksimal 5MB" }, { status: 400 });
  }

  const db = createServiceRoleClient();

  // Pastikan payment_id valid, sekalian ambil data order untuk verifikasi
  // kepemilikan.
  const { data: payment } = await db
    .from("payments")
    .select("id, order_id, orders(user_id, guest_phone)")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) return NextResponse.json({ error: "Pembayaran tidak ditemukan" }, { status: 404 });

  // CATATAN FIX (audit keamanan - upload tanpa cek kepemilikan):
  // Sebelumnya endpoint ini hanya mensyaratkan payment_id yang valid, tanpa
  // memverifikasi bahwa yang upload adalah pemilik order tersebut. Kalau
  // payment_id (UUID) bocor/tertebak, siapa pun bisa upload gambar
  // sembarang dan mengubah status order jadi waiting_verification.
  //
  // Perbaikan: samakan dengan pola kepemilikan yang sudah dipakai di
  // /api/orders/mine (RLS auth.uid()) dan /api/orders/track (guest_phone) -
  // order milik user login harus dicocokkan dengan sesi login yang sedang
  // aktif, dan order guest harus menyertakan nomor HP yang sama persis
  // dengan saat checkout.
  const order = (payment as any).orders as { user_id: string | null; guest_phone: string | null } | null;

  if (order?.user_id) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== order.user_id) {
      return NextResponse.json(
        { error: "Kamu tidak memiliki akses ke pesanan ini." },
        { status: 403 }
      );
    }
  } else {
    if (!phone || !order?.guest_phone || phone !== order.guest_phone) {
      return NextResponse.json(
        { error: "Verifikasi kepemilikan pesanan gagal, periksa kembali nomor HP kamu." },
        { status: 403 }
      );
    }
  }

  const ext = file.name.split(".").pop();
  const fileName = `${payment.order_id}/${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await db.storage
    .from("payment-proof")
    .upload(fileName, arrayBuffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = db.storage.from("payment-proof").getPublicUrl(fileName);

  const { error: insertError } = await db.from("payment_proofs").insert({
    payment_id: paymentId,
    image_url: urlData.publicUrl,
  });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Update status order & payment jadi "menunggu verifikasi"
  await db.from("payments").update({ status: "pending" }).eq("id", paymentId);
  await db.from("orders").update({ status: "waiting_verification" }).eq("id", payment.order_id);

  return NextResponse.json({ success: true, url: urlData.publicUrl });
}
