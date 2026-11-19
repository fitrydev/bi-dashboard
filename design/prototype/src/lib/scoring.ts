import { INDICATORS, params, TODAY, type IndicatorKey, type RiskLevel, type Row } from "./data";
import { formatTanggal } from "./format";

export type ScoreInput = Partial<Record<IndicatorKey, number | null | undefined>>;

/** Skor = Σ(skor×bobot)/5×100. null bila ada indikator belum terisi/diketahui. */
export function computeScore(s: ScoreInput): number | null {
  let sum = 0;
  for (const i of INDICATORS) {
    const v = s[i.key];
    if (v == null) return null;
    sum += v * i.weight;
  }
  return Math.round((sum / 5) * 100 * 10) / 10;
}

export function categoryFor(score: number | null, override = false): RiskLevel {
  if (override) return "critical";
  if (score == null) return "unrated";
  if (score >= params.thresholds.critical) return "critical";
  if (score >= params.thresholds.high) return "high";
  if (score >= params.thresholds.medium) return "medium";
  return "low";
}

export const categoryInfo = (l: RiskLevel) => params.categories.find((c) => c.key === l) ?? null;
export const intervalMonths = (l: RiskLevel) => categoryInfo(l)?.interval_months ?? null;
export const intervalText = (l: RiskLevel) => {
  const m = intervalMonths(l);
  return m == null ? "—" : m === 1 ? "tiap bulan" : `tiap ${m} bulan`;
};

export function addMonths(d: Date, n: number): Date {
  const r = new Date(d.getTime());
  r.setUTCMonth(r.getUTCMonth() + n);
  return r;
}
export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);

export type Due =
  | { status: "tak-terjadwal" }
  | { status: "lewat" | "segera" | "terjadwal"; date: Date; days: number };

export function dueOf(r: Row): Due {
  if (!r.assessment) return { status: "tak-terjadwal" };
  const m = intervalMonths(r.level);
  if (m == null) return { status: "tak-terjadwal" };
  const date = addMonths(new Date(`${r.assessment.assessed_at}T00:00:00Z`), m);
  const days = daysBetween(TODAY, date);
  return { status: days < 0 ? "lewat" : days <= 30 ? "segera" : "terjadwal", date, days };
}
export function dueText(d: Due): string {
  if (d.status === "tak-terjadwal") return "Belum dapat dijadwalkan";
  if (d.days < 0) return `Lewat ${-d.days} hari`;
  if (d.days === 0) return "Hari ini";
  if (d.days <= 30) return `Dalam ${d.days} hari`;
  return formatTanggal(d.date);
}
