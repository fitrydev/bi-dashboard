import raw from "../../../data/assets.json";

export type RiskLevel = "critical" | "high" | "medium" | "low" | "unrated";
export type IndicatorKey = "legal" | "control" | "physical" | "utilization" | "location" | "strategic";
export type WarnKey =
  | "nilai-placeholder" | "luas-placeholder" | "hak-kedaluwarsa" | "hak-berakhir"
  | "tgl-masa-depan" | "perlu-review" | "alamat-kosong";

export interface Flags {
  value_placeholder: boolean; area_placeholder: boolean; monitored_in_future: boolean;
  right_expired: boolean; right_expiring_12m: boolean; address_missing: boolean;
}
export interface Asset {
  code: string; name: string; type: "Tanah" | "Bangunan"; region: string; address: string | null;
  land_area_m2: number | null; building_area_m2: number | null; book_value: number | null;
  legal_status: string | null; right_expiry_date: string | null; utilization_raw: string | null;
  utilization: string | null; utilization_needs_review: boolean; last_monitored_at: string | null;
  pic: string | null; notes: string | null; flags: Flags;
}
export interface Assessment {
  asset_code: string; assessed_at: string; scores: Record<IndicatorKey, number | null>;
  critical_override: boolean; total_score: number; category: Exclude<RiskLevel, "unrated">;
  findings: string | null; follow_up: string | null; follow_up_pic: string | null; target_date: string | null;
}
export interface Indicator { key: IndicatorKey; label: string; weight: number }
export interface Category {
  key: Exclude<RiskLevel, "unrated">; label: string; interval_months: number;
  frequency: string; method: string; action: string;
}
interface Raw {
  meta: { today: string };
  params: { version: number; indicators: Indicator[]; thresholds: { critical: number; high: number; medium: number }; categories: Category[] };
  criteria: Record<IndicatorKey, Record<string, string>>;
  assets: Asset[]; assessments: Assessment[];
  summary: Record<string, number | Record<string, number>>;
}
const R = raw as unknown as Raw;

export const params = R.params;
export const criteria = R.criteria;
export const summary = R.summary as Record<string, number>;
export const TODAY = new Date(`${R.meta.today}T00:00:00Z`);
export const INDICATORS = params.indicators;
export const SHORT_LABEL: Record<IndicatorKey, string> = {
  legal: "Legalitas", control: "Penguasaan", physical: "Fisik", utilization: "Pemanfaatan", location: "Lokasi", strategic: "Strategis",
};
export const RISK_LABEL: Record<RiskLevel, string> = {
  critical: "Critical", high: "High", medium: "Medium", low: "Low", unrated: "Belum dinilai",
};
export const LEVELS: RiskLevel[] = ["critical", "high", "medium", "low", "unrated"];
export const WARN_LABEL: Record<WarnKey, string> = {
  "nilai-placeholder": "Nilai buku placeholder (Rp1)",
  "luas-placeholder": "Luas placeholder (1 m²)",
  "hak-kedaluwarsa": "Hak tanah sudah lewat masa berlaku",
  "hak-berakhir": "Hak tanah berakhir kurang dari 12 bulan",
  "tgl-masa-depan": "Tanggal monitoring di masa depan",
  "perlu-review": "Status \"Produktif\" perlu review",
  "alamat-kosong": "Alamat kosong",
};

export const assessmentByCode = new Map(R.assessments.map((a) => [a.asset_code, a]));
export const assessments = R.assessments;

export function warningsOf(a: Asset): WarnKey[] {
  const w: WarnKey[] = [];
  if (a.flags.value_placeholder) w.push("nilai-placeholder");
  if (a.flags.area_placeholder) w.push("luas-placeholder");
  if (a.flags.right_expired) w.push("hak-kedaluwarsa");
  if (a.flags.right_expiring_12m) w.push("hak-berakhir");
  if (a.flags.monitored_in_future) w.push("tgl-masa-depan");
  if (a.utilization_needs_review) w.push("perlu-review");
  if (a.flags.address_missing) w.push("alamat-kosong");
  return w;
}

export interface Row extends Asset {
  assessment: Assessment | null;
  score: number | null;
  level: RiskLevel;
  warnings: WarnKey[];
  /** nilai buku untuk agregat; null jika placeholder */
  value: number | null;
}

export const rows: Row[] = R.assets.map((a) => {
  const as = assessmentByCode.get(a.code) ?? null;
  return {
    ...a, assessment: as, score: as ? as.total_score : null,
    level: as ? as.category : "unrated", warnings: warningsOf(a),
    value: a.book_value != null && a.book_value > 1 ? a.book_value : null,
  };
});
export const rowByCode = new Map(rows.map((r) => [r.code, r]));
export const totalValue = rows.reduce((s, r) => s + (r.value ?? 0), 0);
export const assessedCount = rows.filter((r) => r.assessment).length;
export const idleRows = rows.filter((r) => r.utilization === "Idle/Kosong");
export const idleValue = idleRows.reduce((s, r) => s + (r.value ?? 0), 0);
export const countWarn = (k: WarnKey) => rows.filter((r) => r.warnings.includes(k)).length;
export const byValueDesc = [...rows].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

export const assessedRows = rows.filter((r) => r.assessment);
export const COVERAGE_TARGET = 0.2;
export const MIN_SHARE_N = 10;
const distinct = <T,>(xs: T[]) => [...new Set(xs)];
export const stats = {
  total: rows.length,
  tanah: rows.filter((r) => r.type === "Tanah").length,
  bangunan: rows.filter((r) => r.type === "Bangunan").length,
  placeholderValue: rows.filter((r) => r.flags.value_placeholder).length,
  placeholderArea: rows.filter((r) => r.flags.area_placeholder).length,
  futureMon: rows.filter((r) => r.flags.monitored_in_future).length,
  futureMonDates: distinct(rows.filter((r) => r.flags.monitored_in_future && r.last_monitored_at).map((r) => r.last_monitored_at as string)),
  expired: rows.filter((r) => r.flags.right_expired).length,
  expiring: rows.filter((r) => r.flags.right_expiring_12m).length,
  assessed: assessedRows.length,
  periods: distinct(assessedRows.map((r) => r.assessment!.assessed_at)).length,
  coverage: assessedRows.length / rows.length,
  target: Math.ceil(rows.length * COVERAGE_TARGET),
  lowCoverage: assessedRows.length / rows.length < COVERAGE_TARGET,
};
export const expiredRows = rows.filter((r) => r.flags.right_expired).sort((a, b) => (a.right_expiry_date ?? "").localeCompare(b.right_expiry_date ?? ""));
export const expiringRows = rows.filter((r) => r.flags.right_expiring_12m).sort((a, b) => (a.right_expiry_date ?? "").localeCompare(b.right_expiry_date ?? ""));
export const regionShare = (() => {
  const c = new Map<string, number>();
  rows.forEach((r) => c.set(r.region, (c.get(r.region) ?? 0) + 1));
  const [top, n] = [...c.entries()].sort((a, b) => b[1] - a[1])[0];
  return { top, share: n / rows.length, regions: c.size };
})();
