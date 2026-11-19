export type RiskLevel = "critical" | "high" | "medium" | "low" | "unrated";
export type RatedLevel = Exclude<RiskLevel, "unrated">;
export type IndicatorKey =
  "legal" | "control" | "physical" | "utilization" | "location" | "strategic";

export interface Indicator {
  key: IndicatorKey;
  label: string;
  weight: number;
}

export interface Category {
  key: RatedLevel;
  label: string;
  interval_months: number;
  frequency: string;
  method: string;
  action: string;
}

export interface Thresholds {
  critical: number;
  high: number;
  medium: number;
}

/** Parameter skor berversi (satu versi aktif; sumber kebenaran kelak di Postgres). */
export interface ScoringParams {
  version: number;
  indicators: Indicator[];
  thresholds: Thresholds;
  categories: Category[];
}

export type ScoreInput = Partial<Record<IndicatorKey, number | null | undefined>>;

export type Due =
  | { status: "tak-terjadwal" }
  | { status: "lewat" | "segera" | "terjadwal"; date: Date; days: number };
