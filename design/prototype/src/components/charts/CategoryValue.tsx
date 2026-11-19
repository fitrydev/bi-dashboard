import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { LEVELS, RISK_LABEL, rows, stats, type RiskLevel } from "@/lib/data";
import { formatAngka, formatRupiahEksak, formatRupiahRingkas, formatSumbuRupiah } from "@/lib/format";
import { useId } from "react";
import { href } from "@/lib/router";
import { ChartFrame, LedgerTable } from "./ChartFrame";
import { RiskMarker } from "@/components/risk/RiskMarker";
import { useRouter } from "./nav";

interface D { level: RiskLevel; label: string; n: number; v: number }
const data: D[] = LEVELS.map((l) => {
  const rs = rows.filter((r) => r.level === l);
  return { level: l, label: RISK_LABEL[l], n: rs.length, v: rs.reduce((s, r) => s + (r.value ?? 0), 0) };
});

function Panel({ title, k, fmt, tick, ticks, go }: { title: string; k: "n" | "v"; fmt: (n: number) => string; tick: (n: number) => string; ticks: number[]; go: (l: RiskLevel) => void }) {
  const max = ticks[ticks.length - 1];
  return (
    <div className="min-w-0">
      <h3 className="mb-1 text-label font-medium text-ink">{title}</h3>
      <div style={{ height: 232 }} role="group" aria-label={title}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 76, bottom: 4, left: 0 }} barCategoryGap={8}>
            <XAxis type="number" domain={[0, max]} ticks={ticks} tickFormatter={tick} tick={{ fill: "var(--ink-muted)", fontSize: 12 }} axisLine={{ stroke: "var(--rule-strong)" }} tickLine={false} />
            <YAxis type="category" dataKey="label" width={96} tick={{ fill: "var(--ink)", fontSize: 12 }} axisLine={{ stroke: "var(--rule-strong)" }} tickLine={false} />
            <Tooltip cursor={{ fill: "var(--surface-sunken)" }} isAnimationActive={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as D;
                return (
                  <div className="rounded-md border border-rule-strong bg-surface-raised px-3 py-2 text-label shadow-overlay">
                    <div className="flex items-center gap-1.5 font-medium"><RiskMarker level={d.level} />{d.label}</div>
                    <div className="mt-1 tabular-nums">{formatAngka(d.n)} aset</div>
                    <div className="tabular-nums">{formatRupiahEksak(d.v)}</div>
                  </div>
                );
              }} />
            <Bar dataKey={k} maxBarSize={22} radius={[0, 4, 4, 0]} isAnimationActive={false} onClick={(d) => go((d as unknown as D).level)} cursor="pointer">
              {data.map((d) => <Cell key={d.level} fill={d.level === "unrated" ? "url(#hatch-unrated)" : `var(--risk-${d.level})`} stroke={d.level === "unrated" ? "var(--hatch-line)" : "none"} strokeDasharray="3 2" />)}
              <LabelList dataKey={k} position="right" formatter={(v: unknown) => fmt(Number(v))} fill="var(--ink)" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CategoryValue() {
  const go = useRouter();
  const descId = useId();
  const summary = `Jumlah aset dan nilai buku per kategori: ${data.filter((d) => d.n > 0).map((d) => `${d.label} ${formatAngka(d.n)} aset, ${d.v ? formatRupiahRingkas(d.v) : "Rp0 (nilai placeholder tidak dihitung)"}`).join("; ")}.`;
  const table = (
    <LedgerTable head={["Kategori", "Jumlah aset", "Nilai buku"]} num={[1, 2]}
      rows={data.map((d) => [<a className="inline-flex items-center gap-2 link" href={href("/aset", { kategori: d.level })}><RiskMarker level={d.level} />{d.label}</a>, formatAngka(d.n), d.v ? formatRupiahEksak(d.v) : "Rp0 (tidak dihitung)"])} />
  );
  const chart = (
    <div className="grid gap-6 md:grid-cols-2" aria-describedby={descId}>
      <Panel title="Jumlah aset" k="n" fmt={(n) => formatAngka(n)} tick={(n) => String(n)} ticks={[0, 50, 100, 150]} go={go} />
      <Panel title="Nilai buku (Rp)" k="v" fmt={(n) => (n ? formatRupiahRingkas(n) : "Rp0 (0 aset/placeholder)")} tick={formatSumbuRupiah} ticks={[0, 50e9, 100e9, 150e9]} go={go} />
    </div>
  );
  return (
    <div>
      <ChartFrame id="c3" chart={chart} table={table} />
      <p id={descId} className="mt-2 text-label text-ink-subtle">{summary} Batang bisa diklik; untuk papan ketik, buka &quot;Tampilkan tabel&quot; yang berisi tautan kategori. {stats.placeholderValue} aset bernilai placeholder tidak dihitung, sehingga nilai kategori bisa tampak Rp0.</p>
    </div>
  );
}
