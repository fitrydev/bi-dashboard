import { COVERAGE_TARGET, isIdle, sumValue } from "@/lib/aggregate";
import type { AssetRow } from "@/lib/types";

export interface DeriveInput {
  assets: number;
  assessed: number;
  periods?: number;
}

/** coverage < target → mode "low" (cerita cakupan); selain itu "high". */
export function deriveLayout({ assets, assessed, periods }: DeriveInput) {
  const coverage = assets > 0 ? assessed / assets : 0;
  return {
    coverage,
    mode: (coverage < COVERAGE_TARGET ? "low" : "high") as "low" | "high",
    showTrend: (periods ?? 0) >= 2,
  };
}

/** Aset belum dinilai dengan nilai buku tertinggi (placeholder/null di bawah). */
export const nextToAssess = (rows: AssetRow[], n = 5): AssetRow[] =>
  rows
    .filter((r) => r.level === "unrated")
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
    .slice(0, n);

export function idleStats(rows: AssetRow[]) {
  const idle = rows.filter(isIdle);
  const value = sumValue(idle);
  const total = sumValue(rows);
  return { count: idle.length, value, share: total > 0 ? value / total : 0 };
}

/** 4 tick sumbu "bulat" (0..3×step) yang pasti mencakup `max`. */
export function niceTicks(max: number): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / 3;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw)!;
  return [0, step, 2 * step, 3 * step];
}
