"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Star, EyeOff, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";

export default function AdminReviewPage() {
  const supabase = createClient();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from("reviews")
      .select("*, products(name)")
      .order("created_at", { ascending: false })
      .limit(100);
    setReviews(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleVisibility(id: string, isVisible: boolean) {
    const { error } = await supabase.from("reviews").update({ is_visible: !isVisible }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Review Produk</h1>

      {loading ? (
        <div className="skeleton h-40 w-full rounded-xl" />
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada review dari pembeli.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{r.reviewer_name}</p>
                  <p className="text-xs text-muted-foreground">{r.products?.name}</p>
                </div>
                <button onClick={() => toggleVisibility(r.id, r.is_visible)} title={r.is_visible ? "Sembunyikan" : "Tampilkan"}>
                  {r.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>
              <div className="my-1.5 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-current" : "text-muted-foreground"}`} />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">{r.comment}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
