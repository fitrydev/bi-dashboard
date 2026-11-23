import { z } from "zod";

const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Tanggal hari ini (YYYY-MM-DD) di zona Asia/Jakarta. */
export function todayJakarta(now: Date = new Date()): string {
  return fmt.format(now);
}

function isRealDate(s: string): boolean {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Tanggal kalender YYYY-MM-DD yang benar-benar ada (tolak 2026-02-30). */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD.")
  .refine(isRealDate, "Tanggal tidak valid.");

/** Teks opsional: di-trim, kosong → null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter.`)
    .nullish()
    .transform((v) => v || null);

/** Tanggal opsional: kosong → null. */
export const optionalDate = z
  .string()
  .trim()
  .nullish()
  .transform((v) => v || null)
  .pipe(isoDate.nullable());

/** Tanggal wajib, tidak boleh melewati hari ini (WIB). Perbandingan string aman untuk YYYY-MM-DD. */
export const pastOrToday = (message: string) =>
  z
    .string({ error: "Tanggal wajib diisi." })
    .trim()
    .min(1, "Tanggal wajib diisi.")
    .pipe(isoDate)
    .refine((s) => s <= todayJakarta(), message);

/** Teks wajib (di-trim). */
export const requiredText = (label: string, max: number) =>
  z
    .string({ error: `${label} wajib diisi.` })
    .trim()
    .min(1, `${label} wajib diisi.`)
    .max(max, `Maksimal ${max} karakter.`);
