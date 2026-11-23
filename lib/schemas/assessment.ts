import { z } from "zod";

import { isoDate, optionalDate, optionalText, pastOrToday, requiredText } from "./date";

export const INDICATORS = [
  "legal",
  "control",
  "physical",
  "utilization",
  "location",
  "strategic",
] as const;
export type Indicator = (typeof INDICATORS)[number];

/** Skor 1..5 atau null (belum dinilai — BUKAN 1). */
const score = z
  .number({ error: "Skor 1–5." })
  .int("Skor 1–5.")
  .min(1, "Skor 1–5.")
  .max(5, "Skor 1–5.")
  .nullish()
  .transform((v) => v ?? null);

const scores = z.object({
  legal: score,
  control: score,
  physical: score,
  utilization: score,
  location: score,
  strategic: score,
});

const assetCode = requiredText("Kode aset", 64);

export const assessmentInput = z
  .object({
    asset_code: assetCode,
    assessed_at: pastOrToday("Tanggal penilaian tidak boleh di masa depan."),
    scores,
    critical_override: z.boolean().default(false),
    override_reason: optionalText(2000),
    findings: optionalText(4000),
    follow_up: optionalText(4000),
    follow_up_pic: optionalText(200),
    target_date: optionalDate,
  })
  .superRefine((v, ctx) => {
    if (!v.findings && INDICATORS.some((k) => (v.scores[k] ?? 0) >= 4)) {
      ctx.addIssue({
        code: "custom",
        path: ["findings"],
        message: "Isi catatan untuk skor 4 atau 5.",
      });
    }
    if (v.critical_override && !v.override_reason) {
      ctx.addIssue({
        code: "custom",
        path: ["override_reason"],
        message: "Isi alasan override Critical.",
      });
    }
  });

/**
 * Draf autosave: semua opsional kecuali asset_code, tanpa aturan wajib/masa depan.
 * Format tetap dicek (tanggal tak valid ditolak) agar draf tidak berisi sampah.
 */
export const assessmentDraftInput = z.object({
  asset_code: assetCode,
  assessed_at: z
    .string()
    .trim()
    .nullish()
    .transform((v) => v || null)
    .pipe(isoDate.nullable())
    .optional(),
  scores: scores.partial().optional(),
  critical_override: z.boolean().optional(),
  override_reason: optionalText(2000).optional(),
  findings: optionalText(4000).optional(),
  follow_up: optionalText(4000).optional(),
  follow_up_pic: optionalText(200).optional(),
  target_date: optionalDate.optional(),
});

export type AssessmentInput = z.input<typeof assessmentInput>;
export type AssessmentData = z.output<typeof assessmentInput>;
export type AssessmentDraftInput = z.input<typeof assessmentDraftInput>;
/** Isi kolom `data` draf (tanpa asset_code). */
export type AssessmentDraftData = Omit<z.output<typeof assessmentDraftInput>, "asset_code">;
