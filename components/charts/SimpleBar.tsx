"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { riskVar } from "@/lib/risk";
import type { RiskLevel } from "@/lib/scoring";
import { ChartTooltip } from "./ChartTooltip";
import { useReducedMotion } from "./useReducedMotion";

export interface BarDatum {
  label: string;
  value: number;
  /** Warna dari token risiko; tanpa level = `--ink-muted`. */
  level?: RiskLevel;
}

const axis = { fill: "var(--ink-muted)", fontSize: 12 };

/**
 * Bar sederhana satu seri, horizontal (default) atau vertikal. Fluid (ResponsiveContainer), tanpa scroll horizontal.
 * `format` untuk label nilai dan tooltip eksak (id-ID). Sediakan tabel alternatif lewat <ChartFrame>.
 */
export function SimpleBar({
  data,
  format,
  tickFormat = format,
  exact,
  horizontal = true,
  height = 232,
  labelWidth = 96,
  ariaLabel,
  describedBy,
}: {
  data: BarDatum[];
  format: (n: number) => string;
  tickFormat?: (n: number) => string;
  /** Nilai eksak untuk tooltip; default `format`. */
  exact?: (n: number) => string;
  horizontal?: boolean;
  height?: number;
  labelWidth?: number;
  ariaLabel: string;
  describedBy?: string;
}) {
  const reduced = useReducedMotion();
  const line = { stroke: "var(--rule-strong)" };
  // ponytail: tick bulat saja (hitungan/Rp); nol selalu "0", bukan "—" placeholder dari formatter. Tambah prop bila butuh tick desimal.
  const tick = (n: number) => (n === 0 ? "0" : tickFormat(n));
  return (
    <div style={{ height }} role="group" aria-label={ariaLabel} aria-describedby={describedBy}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          accessibilityLayer
          margin={{ top: 16, right: horizontal ? 64 : 8, bottom: 4, left: 0 }}
          barCategoryGap={8}
        >
          {horizontal ? (
            <>
              <XAxis
                type="number"
                tickFormatter={tick}
                allowDecimals={false}
                tick={axis}
                axisLine={line}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={labelWidth}
                tick={{ ...axis, fill: "var(--ink)" }}
                axisLine={line}
                tickLine={false}
              />
            </>
          ) : (
            <>
              <XAxis
                type="category"
                dataKey="label"
                tick={{ ...axis, fill: "var(--ink)" }}
                axisLine={line}
                tickLine={false}
              />
              <YAxis
                type="number"
                tickFormatter={tick}
                allowDecimals={false}
                width={56}
                tick={axis}
                axisLine={false}
                tickLine={false}
              />
            </>
          )}
          <Tooltip
            cursor={{ fill: "var(--surface-sunken)" }}
            isAnimationActive={false}
            content={
              <ChartTooltip<BarDatum>
                build={(d) => ({
                  title: d.label,
                  level: d.level,
                  lines: [(exact ?? format)(d.value)],
                })}
              />
            }
          />
          <Bar
            dataKey="value"
            maxBarSize={28}
            radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            isAnimationActive={!reduced}
          >
            {data.map((d) => (
              <Cell
                key={d.label}
                fill={
                  d.level === "unrated"
                    ? "url(#hatch-unrated)"
                    : d.level
                      ? riskVar(d.level)
                      : "var(--ink-muted)"
                }
                stroke={d.level === "unrated" ? "var(--hatch-line)" : "none"}
                strokeDasharray="3 2"
              />
            ))}
            <LabelList
              dataKey="value"
              position={horizontal ? "right" : "top"}
              formatter={(v: unknown) => format(Number(v))}
              fill="var(--ink)"
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
