/**
 * Cermin fungsi skor di Postgres. Sumber kebenaran logika skor akan berada di database (Fase 2);
 * file ini dipertahankan paritasnya lewat tes (scoring.test.ts) dan dipakai untuk pratinjau di klien.
 * Skor = Σ(skor × bobot) / 5 × 100, dibulatkan 1 desimal. Skala: 1 = risiko sangat rendah, 5 = sangat tinggi.
 */
import { formatTanggal } from "@/lib/format";
import { DEFAULT_PARAMS } from "./default-params";
import type { Due, Indicator, RiskLevel, ScoreInput, ScoringParams, Thresholds } from "./types";

export * from "./types";
export * from "./labels";
export { DEFAULT_PARAMS };

/** null bila ada indikator yang belum terisi (belum dinilai, bukan Low). */
export function computeScore(
  scores: ScoreInput,
  indicators: Indicator[] = DEFAULT_PARAMS.indicators,
): number | null {
  let sum = 0;
  for (const i of indicators) {
    const v = scores[i.key];
    if (v == null) return null;
    sum += v * i.weight;
  }
  // toPrecision(12) membuang galat float (mis. 268.99999999) agar half-up identik dengan round() numeric Postgres.
  return Math.round(Number(((sum / 5) * 100 * 10).toPrecision(12))) / 10;
}

export function categoryFor(
  score: number | null,
  override = false,
  thresholds: Thresholds = DEFAULT_PARAMS.thresholds,
): RiskLevel {
  if (override) return "critical";
  if (score == null) return "unrated";
  if (score >= thresholds.critical) return "critical";
  if (score >= thresholds.high) return "high";
  if (score >= thresholds.medium) return "medium";
  return "low";
}

export const categoryInfo = (l: RiskLevel, params: ScoringParams = DEFAULT_PARAMS) =>
  params.categories.find((c) => c.key === l) ?? null;

export const intervalMonths = (
  l: RiskLevel,
  params: ScoringParams = DEFAULT_PARAMS,
): number | null => categoryInfo(l, params)?.interval_months ?? null;

export function intervalText(l: RiskLevel, params: ScoringParams = DEFAULT_PARAMS): string {
  const m = intervalMonths(l, params);
  return m == null ? "—" : m === 1 ? "tiap bulan" : `tiap ${m} bulan`;
}

export function addMonths(d: Date, n: number): Date {
  const r = new Date(d.getTime());
  r.setUTCMonth(r.getUTCMonth() + n);
  return r;
}

export const daysBetween = (a: Date, b: Date): number =>
  Math.round((b.getTime() - a.getTime()) / 86400000);

/** Jatuh tempo penilaian berikutnya. `assessedAt` = "YYYY-MM-DD" atau null bila belum pernah dinilai. */
export function dueOf(
  assessedAt: string | null,
  level: RiskLevel,
  params: ScoringParams = DEFAULT_PARAMS,
  today: Date = new Date(),
): Due {
  if (!assessedAt) return { status: "tak-terjadwal" };
  const m = intervalMonths(level, params);
  if (m == null) return { status: "tak-terjadwal" };
  const date = addMonths(new Date(`${assessedAt}T00:00:00Z`), m);
  const days = daysBetween(today, date);
  return { status: days < 0 ? "lewat" : days <= 30 ? "segera" : "terjadwal", date, days };
}

export function dueText(d: Due): string {
  if (d.status === "tak-terjadwal") return "Belum dapat dijadwalkan";
  if (d.days < 0) return `Lewat ${-d.days} hari`;
  if (d.days === 0) return "Hari ini";
  if (d.days <= 30) return `Dalam ${d.days} hari`;
  return formatTanggal(d.date);
}
