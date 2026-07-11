"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, X, ImagePlus, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ReviewItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  color_name: string | null;
  size_label: string | null;
  quantity: number;
};

export function ReviewFormList({
  orderNumber,
  reviewerName,
  items,
  reviewedIds,
}: {
  orderNumber: string;
  reviewerName: string;
  items: ReviewItem[];
  reviewedIds: string[];
}) {
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set(reviewedIds));

  if (items.length === 0) {
    return (
      <div className="premium-card p-8 text-center text-sm text-muted-foreground">
        Tidak ada produk untuk diulas pada pesanan ini.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <ReviewCard
          key={item.id}
          item={item}
          orderNumber={orderNumber}
          reviewerName={reviewerName}
          done={doneIds.has(item.id)}
          onDone={() => setDoneIds((prev) => new Set(prev).add(item.id))}
        />
      ))}
    </div>
  );
}

function ReviewCard({
  item,
  orderNumber,
  reviewerName,
  done,
  onDone,
}: {
  item: ReviewItem;
  orderNumber: string;
  reviewerName: string;
  done: boolean;
  onDone: () => void;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    setFiles((prev) => [...prev, ...picked].slice(0, 3));
    e.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (rating < 1) {
      toast.error("Pilih rating bintang dulu ya");
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi kamu berakhir, silakan masuk lagi.");

      const imageUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${item.id}/${Date.now()}-${i}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("reviews")
          .upload(path, file, { upsert: false });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("reviews").getPublicUrl(path);
        imageUrls.push(urlData.publicUrl);
      }

      const { error: insertError } = await supabase.from("reviews").insert({
        product_id: item.product_id ?? undefined,
        order_item_id: item.id,
        user_id: user.id,
        reviewer_name: reviewerName,
        rating,
        comment: comment.trim() || undefined,
        images: imageUrls,
      });
      if (insertError) throw insertError;

      toast.success("Ulasan berhasil dikirim. Terima kasih!");
      onDone();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim ulasan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="premium-card p-4">
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-secondary">
          {item.product_image ? (
            <Image src={item.product_image} alt={item.product_name} fill sizes="56px" className="object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.product_name}</p>
          <p className="text-[11px] text-muted-foreground">
            {[item.color_name, item.size_label].filter(Boolean).join(", ")}
            {item.color_name || item.size_label ? " · " : ""}x{item.quantity}
          </p>
        </div>
      </div>

      {done ? (
        <div className="mt-3 flex items-center gap-1.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-xs font-medium text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          Ulasan sudah dikirim untuk produk ini
        </div>
      ) : (
        <div className="mt-4 space-y-3 border-t border-border pt-3.5">
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">Beri Penilaian</p>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="ripple rounded-lg p-0.5 transition active:scale-90"
                >
                  <Star
                    className={`h-7 w-7 ${
                      n <= (hoverRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">Foto Produk (Opsional)</p>
            <div className="flex flex-wrap gap-2">
              {files.map((file, i) => (
                <div key={i} className="relative h-16 w-16 overflow-hidden rounded-xl border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(file)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {files.length < 3 && (
                <label className="ripple flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-border text-muted-foreground transition hover:bg-secondary">
                  <ImagePlus className="h-5 w-5" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={handleFilesSelected}
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">Komentar</p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              placeholder="Bagaimana kualitas produk ini?"
              rows={3}
              className="w-full resize-none rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm outline-none transition focus:border-foreground/30 focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-right text-[11px] text-muted-foreground">{comment.length}/500</p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="ripple flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-3 text-sm font-semibold text-background transition active:scale-[0.98] disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Mengirim..." : "Kirim Ulasan"}
          </button>
        </div>
      )}
    </div>
  );
}
