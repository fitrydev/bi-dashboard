import { z } from "zod";

import { Constants } from "@/lib/supabase/database.types";

const E = Constants.public.Enums;

export const INDICATORS = ["legal", "control", "physical", "utilization", "location", "strategic"] as const;
export type IndicatorKey = (typeof INDICATORS)[number];
export const CATEGORIES = ["critical", "high", "medium", "low"] as const;

/** Angka dari input: terima number atau string ("33,33" / "33.33"); kosong → NaN (ditolak). */
const num = (label: string) =>
  z
    .union([z.number(), z.string()], { error: `${label} wajib diisi angka.` })
    .transform((v) => (typeof v === "number" ? v : v.trim() === "" ? NaN : Number(v.trim().replace(",", "."))))
    .pipe(z.number({ error: `${label} wajib diisi angka.` }).finite(`${label} wajib diisi angka.`));

// ---- Allowlist ----
export const emailInput = z.object({
  email: z
    .string({ error: "Email wajib diisi." })
    .trim()
    .toLowerCase()
    .min(1, "Email wajib diisi.")
    .max(254, "Email terlalu panjang.")
    .pipe(z.email("Format email tidak valid.")),
  role: z.enum(E.app_role, { error: "Pilih peran." }),
});
export const emailOnly = emailInput.pick({ email: true });

// ---- Parameter skor ----
const SHARE_UNITS = 10000; // 100,00% dalam satuan 0,01%

/**
 * Persen (maks 2 desimal) → fraksi dengan Σ tepat 1.
 * Bekerja dalam bilangan bulat (0,01%) lalu dibagi 10000, sehingga tiap fraksi tercetak persis
 * ("0.3333") dan Postgres numeric menjumlahkannya menjadi tepat 1. Mengembalikan null bila Σ ≠ 100%.
 */
export function weightsToFractions(pct: Record<IndicatorKey, number>): Record<IndicatorKey, number> | null {
  const units = INDICATORS.map((k) => Math.round(pct[k] * 100));
  if (units.reduce((a, b) => a + b, 0) !== SHARE_UNITS) return null;
  return Object.fromEntries(INDICATORS.map((k, i) => [k, units[i] / SHARE_UNITS])) as Record<IndicatorKey, number>;
}

/** Fraksi dari DB → persen untuk tampilan/isian (maks 2 desimal). */
export const fractionToPct = (f: number): number => Math.round(f * SHARE_UNITS) / 100;

const wt = num("Bobot").pipe(z.number().min(0, "Bobot tidak boleh negatif.").max(100, "Bobot maksimal 100%."));
const weightsPct = z
  .object({ legal: wt, control: wt, physical: wt, utilization: wt, location: wt, strategic: wt })
  .superRefine((w, ctx) => {
    if (!weightsToFractions(w)) {
      const total = INDICATORS.reduce((a, k) => a + Math.round(w[k] * 100), 0) / 100;
      ctx.addIssue({ code: "custom", message: `Total bobot harus 100% (saat ini ${total.toLocaleString("id-ID")}%).` });
    }
  });

const thresholds = z
  .object({ critical: num("Ambang Critical"), high: num("Ambang High"), medium: num("Ambang Medium") })
  .superRefine((t, ctx) => {
    if (!(t.critical <= 100 && t.critical > t.high && t.high > t.medium && t.medium > 0))
      ctx.addIssue({ code: "custom", message: "Ambang harus menurun: 100 ≥ Critical > High > Medium > 0." });
  });

const interval = (label: string) =>
  num(label).pipe(z.number().int("Interval harus bilangan bulat.").min(1, "Interval minimal 1 bulan.").max(120, "Interval maksimal 120 bulan."));
const intervals = z.object({
  critical: interval("Interval Critical"),
  high: interval("Interval High"),
  medium: interval("Interval Medium"),
  low: interval("Interval Low"),
});

/** Isian UI (bobot dalam persen) → nilai siap simpan (bobot sebagai fraksi Σ = 1). */
export const paramsInput = z
  .object({ weights: weightsPct, thresholds, intervals })
  .transform((p) => ({ ...p, weights: weightsToFractions(p.weights as Record<IndicatorKey, number>)! }));
export type ParamsFormInput = z.input<typeof paramsInput>;
export type ParamsData = z.output<typeof paramsInput>;

// ---- Rubrik ----
export const rubricRow = z.object({
  indicator: z.enum(E.score_indicator),
  score: z.number().int().min(1).max(5),
  description: z.string({ error: "Deskripsi wajib diisi." }).trim().min(1, "Deskripsi wajib diisi.").max(2000, "Maksimal 2.000 karakter."),
});
export type RubricRow = z.infer<typeof rubricRow>;

export const version = z.number().int().min(1);
export const updateDraftInput = z
  .object({ version, params: paramsInput.optional(), rubric: z.array(rubricRow).max(30).optional() })
  .refine((v) => v.params || v.rubric?.length, "Tidak ada perubahan untuk disimpan.");
// Bentuk input (sebelum transform) untuk dikirim dari klien.
export type UpdateDraftInput = { version: number; params?: ParamsFormInput; rubric?: RubricRow[] };

export const activateInput = z.object({ version, effective_from: z.iso.date().optional() });

// ---- Alias ----
export const regionAliasInput = z.object({
  alias: z.string({ error: "Alias wajib diisi." }).trim().toUpperCase().min(1, "Alias wajib diisi.").max(100, "Maksimal 100 karakter."),
  region_id: z.uuid("Pilih wilayah."),
});
export const utilizationAliasInput = z.object({
  raw: z.string({ error: "Teks asal wajib diisi." }).trim().toLowerCase().min(1, "Teks asal wajib diisi.").max(200, "Maksimal 200 karakter."),
  status: z.enum(E.utilization_status, { error: "Pilih status pemanfaatan." }),
  needs_review: z.boolean(),
});

// ---- Koreksi massal ----
export const resolveReviewInput = z.object({
  asset_ids: z.array(z.uuid()).min(1, "Pilih minimal satu aset.").max(5000, "Maksimal 5.000 aset per koreksi."),
  status: z.enum(E.utilization_status).nullish(),
});
