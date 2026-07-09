"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function DeleteButton({
  table,
  id,
  label,
  onDeleted,
}: {
  table: string;
  id: string;
  label?: string;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Yakin ingin menghapus ${label ?? "item"} ini?`)) return;
    setLoading(true);
    const { error } = await supabase.from(table).delete().eq("id", id);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Berhasil dihapus");
    onDeleted?.();
    router.refresh();
  }

  return (
    <button onClick={handleDelete} disabled={loading} className="text-xs text-destructive underline disabled:opacity-50">
      <span className="inline-flex items-center gap-1">
        <Trash2 className="h-3 w-3" />
        Hapus
      </span>
    </button>
  );
}
