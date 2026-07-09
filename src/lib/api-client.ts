import { getGuestSessionId } from "@/lib/utils";

export async function apiFetch(url: string, options: RequestInit = {}) {
  const sessionId = getGuestSessionId();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-session-id": sessionId,
      ...(options.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Terjadi kesalahan, silakan coba lagi.");
  }
  return json;
}
