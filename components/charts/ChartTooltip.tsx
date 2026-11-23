import type { ReactNode } from "react";
import { RiskMarker } from "@/components/risk/RiskMarker";
import type { RiskLevel } from "@/lib/scoring";

/** Kartu tooltip ledger (DESIGN §4.0): marker + nama, baris nilai eksak. Dipakai langsung atau lewat <ChartTooltip>. */
export function ChartTooltipCard({
  title,
  level,
  lines,
  hint,
}: {
  title: ReactNode;
  level?: RiskLevel;
  /** Nilai sudah diformat id-ID (mis. formatRupiahEksak). */
  lines: ReactNode[];
  hint?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-rule-strong bg-surface-raised px-3 py-2 text-label text-ink shadow-overlay">
      <div className="flex items-center gap-1.5 font-medium">
        {level && <RiskMarker level={level} />}
        {title}
      </div>
      {lines.map((l, i) => (
        <div key={i} className="mt-1 tabular-nums first:mt-1">
          {l}
        </div>
      ))}
      {hint && <div className="mt-1 text-ink-muted underline">{hint}</div>}
    </div>
  );
}

interface Entry {
  payload?: Record<string, unknown>;
  value?: unknown;
  name?: unknown;
  dataKey?: unknown;
}

/**
 * Konten `<Tooltip content={<ChartTooltip ... />}>` Recharts 3.
 * `build` mengubah baris data aktif menjadi props kartu; null = tidak tampil.
 */
export function ChartTooltip<T = Record<string, unknown>>({
  active,
  payload,
  build,
}: {
  active?: boolean;
  payload?: Entry[];
  build: (row: T, entry: Entry) => Parameters<typeof ChartTooltipCard>[0] | null;
}) {
  if (!active || !payload?.length) return null;
  const card = build(payload[0].payload as T, payload[0]);
  return card ? <ChartTooltipCard {...card} /> : null;
}
