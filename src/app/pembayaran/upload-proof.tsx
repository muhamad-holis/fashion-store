"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, FileImage, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024;

export function UploadProof({
  paymentId,
  phone,
  disabled,
  onUploaded,
}: {
  paymentId?: string;
  // Dikirim sebagai bukti kepemilikan order untuk order guest (lihat
  // CATATAN FIX di api/orders/payment-proof/route.ts).
  phone?: string;
  disabled?: boolean;
  onUploaded?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  function validate(f: File) {
    if (!ALLOWED_TYPES.includes(f.type)) {
      toast.error("Format file harus JPG, PNG, atau WEBP");
      return false;
    }
    if (f.size > MAX_SIZE) {
      toast.error("Ukuran file maksimal 10MB");
      return false;
    }
    return true;
  }

  function pickFile(f: File) {
    if (!validate(f)) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setDone(false);
    if (paymentId) upload(f);
  }

  function upload(f: File) {
    if (!paymentId) return;
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", f);
    formData.append("payment_id", paymentId);
    if (phone) formData.append("phone", phone);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/orders/payment-proof");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setUploading(false);
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          setProgress(100);
          setDone(true);
          toast.success("Bukti pembayaran berhasil dikirim");
          onUploaded?.();
        } else {
          toast.error(json.error || "Upload gagal, silakan coba lagi");
        }
      } catch {
        toast.error("Upload gagal, silakan coba lagi");
      }
    };
    xhr.onerror = () => {
      setUploading(false);
      toast.error("Upload gagal, periksa koneksi kamu");
    };
    xhr.send(formData);
  }

  function removeFile() {
    setFile(null);
    setPreviewUrl(null);
    setProgress(0);
    setDone(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="rounded-[20px] border border-[#262626] bg-[#151515] p-5">
      <h2 className="mb-3 text-xs font-semibold tracking-wide text-white/50">UPLOAD BUKTI PEMBAYARAN</h2>

      {!file ? (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (disabled) return;
            const f = e.dataTransfer.files?.[0];
            if (f) pickFile(f);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-center transition-colors",
            dragging ? "border-white/60 bg-white/5" : "border-[#333]",
            disabled && "cursor-not-allowed opacity-40"
          )}
        >
          <UploadCloud className="h-6 w-6 text-white/50" />
          <p className="text-sm text-white/70">
            Drag & Drop gambar di sini
            <br />
            atau
          </p>
          <span className="mt-1 rounded-lg bg-white/10 px-4 py-1.5 text-xs font-medium text-white">
            Pilih File
          </span>
          <p className="mt-1 text-[11px] text-white/35">Format: JPG, PNG, WEBP • Maksimal 10MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={disabled}
            onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
          />
        </label>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-2xl border border-[#262626] bg-white/[0.03] p-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/10">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Preview bukti bayar" className="h-full w-full object-cover" />
              ) : (
                <FileImage className="h-full w-full p-3 text-white/40" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white">{file.name}</p>
              <p className="text-xs text-white/40">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              {uploading && (
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
            {!uploading && (
              <button onClick={removeFile} className="shrink-0 text-white/40 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {done && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Bukti pembayaran berhasil dikirim.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
