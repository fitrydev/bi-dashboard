import type { RiskLevel } from "@/lib/scoring/types";

export type RiskTone = "fill" | "ink" | "tint";

/** CSS var untuk level risiko. "unrated" tidak punya tint: pakai kelas .hatch-unrated (arsir), bukan warna. */
export function riskVar(level: RiskLevel, tone: RiskTone = "fill"): string {
  if (level === "unrated")
    return tone === "ink"
      ? "var(--risk-unrated-ink)"
      : tone === "tint"
        ? "var(--surface)"
        : "var(--risk-unrated)";
  return tone === "fill" ? `var(--risk-${level})` : `var(--risk-${level}-${tone})`;
}
