import { sparklinePaths, sparklineSummary, type TrendPoint } from "./chart-logic";

/** Sparkline SVG kecil. `role="img"` + ringkasan tren. < 2 titik valid: tampil garis putus "—" (bukan garis datar palsu). */
export function Sparkline({
  values,
  label,
  fmt,
  width = 96,
  height = 24,
}: {
  values: TrendPoint[];
  /** Nama metrik untuk aria-label, mis. "Skor rata-rata". */
  label: string;
  fmt?: (n: number) => string;
  width?: number;
  height?: number;
}) {
  const paths = sparklinePaths(values, width, height);
  return (
    <svg
      role="img"
      aria-label={sparklineSummary(values, label, fmt)}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="inline-block max-w-full align-middle"
      focusable={false}
    >
      {paths.length ? (
        paths.map((p) => (
          <polyline
            key={p}
            points={p}
            fill="none"
            stroke="var(--ink)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))
      ) : (
        <line
          x1={3}
          x2={width - 3}
          y1={height / 2}
          y2={height / 2}
          stroke="var(--rule-strong)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />
      )}
    </svg>
  );
}
