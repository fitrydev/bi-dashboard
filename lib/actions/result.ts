import type { z } from "zod";

import { AuthError } from "@/lib/auth/require-role";

export type ActionResult<T = void> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export const MSG = {
  unauthenticated: "Sesi berakhir. Masuk lagi.",
  forbidden: "Anda tidak punya akses untuk mengubah data.",
  invalid: "Periksa kembali isian yang ditandai.",
  generic: "Gagal menyimpan data. Coba lagi.",
  assetNotFound: "Aset tidak ditemukan.",
} as const;

const PG: Record<string, string> = {
  "23505": "Kode aset sudah dipakai aset lain.",
  "22007": "Tanggal tidak valid atau berada di masa depan.",
  "22008": "Tanggal tidak valid.",
  "23514": "Data tidak memenuhi aturan validasi.",
  "23503": "Data rujukan tidak ditemukan.",
  "42501": MSG.forbidden,
  P0002: "Belum ada parameter skor yang aktif. Hubungi admin.",
};

/** Petakan error apa pun ke pesan Indonesia yang aman ditampilkan. Pesan mentah DB hanya ke log server. */
export function toActionError(e: unknown): { ok: false; error: string } {
  if (e instanceof AuthError) {
    return { ok: false, error: e.code === "UNAUTHENTICATED" ? MSG.unauthenticated : MSG.forbidden };
  }
  const code =
    typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
  const known = PG[code];
  if (!known) console.error("[action]", e);
  return { ok: false, error: known ?? MSG.generic };
}

/** zod error → fieldErrors berkunci path bertitik, mis. "scores.legal", "findings". */
export function toFieldErrors(error: z.ZodError): {
  ok: false;
  error: string;
  fieldErrors: Record<string, string[]>;
} {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, error: MSG.invalid, fieldErrors };
}
