"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo } from "react";
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
import { ChartTooltipCard } from "./ChartTooltip";
import { useReducedMotion } from "./useReducedMotion";
import { RiskMarker } from "@/components/risk/RiskMarker";
import { ChartFrame } from "@/components/ledger/ChartFrame";
import { LedgerTable } from "@/components/ledger/LedgerTable";
import { countBy, sumValue } from "@/lib/aggregate";
import {
  formatAngka,
  formatRupiahEksak,
  formatRupiahRingkas,
  formatSumbuRupiah,
} from "@/lib/format";
import { riskVar } from "@/lib/risk";
import { asetList } from "@/lib/routes";
import { LEVELS, RISK_LABEL, type RiskLevel } from "@/lib/scoring";
import type { AssetRow } from "@/lib/types";

interface D {
  level: RiskLevel;
  label: string;
  n: number;
  v: number;
}

function Panel({
  data,
  title,
  k,
  fmt,
  tick,
  ticks,
  go,
}: {
  data: D[];
  title: string;
  k: "n" | "v";
  fmt: (n: number) => string;
  tick: (n: number) => string;
  ticks: number[];
  go: (l: RiskLevel) => void;
}) {
  const reduced = useReducedMotion();
  const max = ticks[ticks.length - 1];
  return (
    <div className="min-w-0">
      <h3 className="mb-1 text-label font-medium text-ink">{title}</h3>
      <div style={{ height: 232 }} role="group" aria-label={title}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            accessibilityLayer
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 76, bottom: 4, left: 0 }}
            barCategoryGap={8}
          >
            <XAxis
              type="number"
              domain={[0, max]}
              ticks={ticks}
              tickFormatter={tick}
              tick={{ fill: "var(--ink-muted)", fontSize: 12 }}
              axisLine={{ stroke: "var(--rule-strong)" }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={96}
              tick={{ fill: "var(--ink)", fontSize: 12 }}
              axisLine={{ stroke: "var(--rule-strong)" }}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-sunken)" }}
              isAnimationActive={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as D;
                return (
                  <ChartTooltipCard
                    title={d.label}
                    level={d.level}
                    lines={[`${formatAngka(d.n)} aset`, formatRupiahEksak(d.v)]}
                  />
                );
              }}
            />
            <Bar
              dataKey={k}
              maxBarSize={22}
              radius={[0, 4, 4, 0]}
              isAnimationActive={!reduced}
              onClick={(d) => go((d as unknown as D).level)}
              cursor="pointer"
            >
              {data.map((d) => (
                <Cell
                  key={d.level}
                  fill={d.level === "unrated" ? "url(#hatch-unrated)" : riskVar(d.level)}
                  stroke={d.level === "unrated" ? "var(--hatch-line)" : "none"}
                  strokeDasharray="3 2"
                />
              ))}
              <LabelList
                dataKey={k}
                position="right"
                formatter={(v: unknown) => fmt(Number(v))}
                fill="var(--ink)"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Jumlah aset dan nilai buku per kategori. Perlu <UnassessedPattern /> di halaman untuk arsir batang "Belum dinilai". */
export function CategoryValue({
  rows,
  countTicks = [0, 50, 100, 150],
  valueTicks = [0, 50e9, 100e9, 150e9],
}: {
  rows: AssetRow[];
  countTicks?: number[];
  valueTicks?: number[];
}) {
  const router = useRouter();
  const descId = useId();
  const data = useMemo<D[]>(
    () =>
      LEVELS.map((l) => ({
        level: l,
        label: RISK_LABEL[l],
        n: countBy(rows, l),
        v: sumValue(rows.filter((r) => r.level === l)),
      })),
    [rows],
  );
  const placeholderN = rows.filter((r) => r.flags.value_placeholder).length;
  const go = (l: RiskLevel) => router.push(asetList({ kategori: l }));
  const summary = `Jumlah aset dan nilai buku per kategori: ${data
    .filter((d) => d.n > 0)
    .map(
      (d) =>
        `${d.label} ${formatAngka(d.n)} aset, ${d.v ? formatRupiahRingkas(d.v) : "Rp0 (nilai placeholder tidak dihitung)"}`,
    )
    .join("; ")}.`;
  const table = (
    <LedgerTable
      caption="Jumlah aset dan nilai buku per kategori"
      head={["Kategori", "Jumlah aset", "Nilai buku"]}
      num={[1, 2]}
      rows={data.map((d) => [
        <Link
          key={d.level}
          className="link inline-flex items-center gap-2"
          href={asetList({ kategori: d.level })}
        >
          <RiskMarker level={d.level} />
          {d.label}
        </Link>,
        formatAngka(d.n),
        d.v ? formatRupiahEksak(d.v) : "Rp0 (tidak dihitung)",
      ])}
    />
  );
  const chart = (
    <div className="grid gap-6 md:grid-cols-2" aria-describedby={descId}>
      <Panel
        data={data}
        title="Jumlah aset"
        k="n"
        fmt={(n) => formatAngka(n)}
        tick={(n) => String(n)}
        ticks={countTicks}
        go={go}
      />
      <Panel
        data={data}
        title="Nilai buku (Rp)"
        k="v"
        fmt={(n) => (n ? formatRupiahRingkas(n) : "Rp0 (0 aset/placeholder)")}
        tick={formatSumbuRupiah}
        ticks={valueTicks}
        go={go}
      />
    </div>
  );
  return (
    <div>
      <ChartFrame id="kategori-nilai" chart={chart} table={table} />
      <p id={descId} className="mt-2 text-label text-ink-subtle">
        {summary} Batang bisa diklik; untuk papan ketik, buka &quot;Tampilkan tabel&quot; yang
        berisi tautan kategori. {formatAngka(placeholderN)} aset bernilai placeholder tidak
        dihitung, sehingga nilai kategori bisa tampak Rp0.
      </p>
    </div>
  );
}
