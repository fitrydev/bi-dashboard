import type { ReactNode } from "react";
import { RiskMarker } from "@/components/risk/RiskMarker";
import { RISK_LABEL, type RiskLevel } from "@/lib/scoring";

export interface LegendItem {
  key: string;
  label?: string;
  level?: RiskLevel;
  /** Seri non-kategori: garis `ink`/`ink-muted` (bukan swatch warna risiko). */
  tone?: "ink" | "ink-muted";
  value?: ReactNode;
}

/** Legend: bentuk risiko + label teks (WCAG 1.4.1). Seri non-risiko = garis pendek bertekstur. */
export function ChartLegend({
  items,
  className = "",
}: {
  items: LegendItem[];
  className?: string;
}) {
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1 text-label text-ink ${className}`}>
      {items.map((it) => (
        <li key={it.key} className="flex items-center gap-1.5">
          {it.level ? (
            <RiskMarker level={it.level} size={16} />
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path
                d="M1 8h14"
                stroke={`var(--${it.tone ?? "ink"})`}
                strokeWidth="2"
                strokeDasharray={it.tone === "ink-muted" ? "3 2" : undefined}
              />
            </svg>
          )}
          <span>{it.label ?? (it.level ? RISK_LABEL[it.level] : it.key)}</span>
          {it.value != null && <span className="text-ink-muted tabular-nums">{it.value}</span>}
        </li>
      ))}
    </ul>
  );
}
