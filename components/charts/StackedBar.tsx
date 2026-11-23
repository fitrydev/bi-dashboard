"use client";

import { formatAngka, formatPersen } from "@/lib/format";
import { riskVar } from "@/lib/risk";
import { RISK_LABEL, type RiskLevel } from "@/lib/scoring";
import { ChartLegend } from "./ChartLegend";
import { normalizeStacked, stackedSummary } from "./chart-logic";

/**
 * Stacked bar 100% tunggal (pengganti donut: DESIGN §0 melarang pie/donut/gauge).
 * Segmen 0/null dibuang; min 4px; celah 2px; urutan input dipertahankan ("unrated" taruh terakhir).
 * Tidak interaktif: label + legend + ringkasan teks sebagai jalur baca (role="img").
 */
export function StackedBar({
  items,
  format = formatAngka,
  ariaLabel,
  height = 32,
}: {
  items: { level: RiskLevel; value: number | null | undefined }[];
  format?: (n: number) => string;
  ariaLabel: string;
  height?: number;
}) {
  const { segments, total } = normalizeStacked(
    items.map((i) => ({ key: i.level, label: i.level, value: i.value })),
  );
  const labeled = segments.map((s) => ({ ...s, label: RISK_LABEL[s.key as RiskLevel] }));
  const summary = stackedSummary(labeled, total, format);
  if (!segments.length) return null;
  return (
    <div>
      <div
        role="img"
        aria-label={`${ariaLabel}. ${summary}`}
        className="flex w-full gap-0.5"
        style={{ height }}
      >
        {segments.map((s) => (
          <div
            key={s.key}
            title={`${RISK_LABEL[s.key as RiskLevel]}: ${format(s.value)} (${formatPersen(s.share)})`}
            className={s.key === "unrated" ? "hatch-unrated min-w-1" : "min-w-1"}
            style={{
              flexGrow: s.share,
              flexBasis: 0,
              background: s.key === "unrated" ? undefined : riskVar(s.key as RiskLevel),
            }}
          />
        ))}
      </div>
      <ChartLegend
        className="mt-2"
        items={segments.map((s) => ({
          key: s.key,
          level: s.key as RiskLevel,
          value: `${format(s.value)} · ${formatPersen(s.share)}`,
        }))}
      />
    </div>
  );
}
