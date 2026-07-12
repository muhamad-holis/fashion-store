import { formatDate, formatRupiah } from "@/lib/utils";
import type { Return, ReturnStatus, ReturnReason } from "@/types/database";

const STATUS_LABEL: Record<ReturnStatus, string> = {
  pending: "Menunggu Peninjauan",
  approved: "Disetujui",
  rejected: "Ditolak",
  refunded: "Dana Dikembalikan",
};

const STATUS_COLOR: Record<ReturnStatus, string> = {
  pending: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  approved: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  rejected: "bg-red-500/15 text-red-400 border-red-500/25",
  refunded: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
};

const REASON_LABEL: Record<ReturnReason, string> = {
  wrong_item: "Barang salah kirim",
  damaged: "Barang rusak/cacat",
  not_as_described: "Tidak sesuai deskripsi",
  wrong_size: "Ukuran tidak sesuai",
  changed_mind: "Berubah pikiran",
  other: "Lainnya",
};

export function ReturnStatusCard({ ret }: { ret: Return }) {
  return (
    <div className="premium-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">Status Pengajuan Retur</p>
        <span
          className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_COLOR[ret.status]}`}
        >
          {STATUS_LABEL[ret.status]}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <Row label="Alasan" value={REASON_LABEL[ret.reason]} />
        {ret.description && <Row label="Deskripsi" value={ret.description} />}
        <Row label="Diajukan" value={formatDate(ret.created_at)} />
        {ret.refund_amount != null && (
          <Row label="Nominal Refund" value={formatRupiah(ret.refund_amount)} />
        )}
      </div>

      {ret.images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {ret.images.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt=""
              className="h-16 w-16 rounded-xl border border-border object-cover"
            />
          ))}
        </div>
      )}

      {ret.admin_note && (
        <div className="mt-3 rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-xs font-medium text-muted-foreground">Catatan dari Admin</p>
          <p className="mt-1 text-sm">{ret.admin_note}</p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
