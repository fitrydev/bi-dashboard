import type { RiskLevel } from "@/lib/scoring/types";
import type { AssetRow } from "@/lib/types";

export const countBy = (rows: AssetRow[], l: RiskLevel): number =>
  rows.filter((r) => r.level === l).length;
export const sumValue = (rows: AssetRow[]): number => rows.reduce((s, r) => s + (r.value ?? 0), 0);
export const byValueDesc = (rows: AssetRow[]): AssetRow[] =>
  [...rows].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
export const isIdle = (r: AssetRow): boolean => r.utilization === "Idle/Kosong";

export const PLACEHOLDER_NOTE = "placeholder tidak dihitung";
export const MIN_SHARE_N = 10;
export const COVERAGE_TARGET = 0.2;

export function statsOf(rows: AssetRow[]) {
  const assessed = rows.filter((r) => r.assessment);
  return {
    total: rows.length,
    tanah: rows.filter((r) => r.type === "Tanah").length,
    bangunan: rows.filter((r) => r.type === "Bangunan").length,
    placeholderValue: rows.filter((r) => r.flags.value_placeholder).length,
    futureMon: rows.filter((r) => r.flags.monitored_in_future).length,
    futureMonDates: [
      ...new Set(
        rows
          .filter((r) => r.flags.monitored_in_future && r.last_monitored_at)
          .map((r) => r.last_monitored_at as string),
      ),
    ],
    expiring: rows.filter((r) => r.flags.right_expiring_12m).length,
    assessed: assessed.length,
    coverage: rows.length ? assessed.length / rows.length : 0,
  };
}
