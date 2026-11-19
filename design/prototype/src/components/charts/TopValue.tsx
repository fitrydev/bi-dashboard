import { useId, useState } from "react";
import { RiskMarker } from "@/components/risk/RiskMarker";
import { HoverTip } from "@/components/ui/HoverTip";
import { byValueDesc, RISK_LABEL, stats } from "@/lib/data";
import { formatRupiahEksak, formatRupiahRingkas, formatAngka } from "@/lib/format";
import { href } from "@/lib/router";
import { ChartFrame, LedgerTable } from "./ChartFrame";

export function TopValue() {
  const [n, setN] = useState(10);
  const list = byValueDesc.slice(0, n);
  const max = list[0].value ?? 1;
  const descId = useId();
  const unratedN = list.filter((r) => !r.assessment).length;
  const table = (
    <LedgerTable head={["#", "Aset", "Kategori", "Nilai buku"]} num={[0, 3]}
      rows={list.map((r, i) => [i + 1, <a className="link" href={href(`/aset/${r.code}`)}>{r.name}</a>, RISK_LABEL[r.level], formatRupiahEksak(r.value ?? 0)])} />
  );
  const chart = (
    <ol aria-label={`${n} aset dengan nilai buku tertinggi`} aria-describedby={descId} className="border-t border-rule">
      {list.map((r, i) => (
        <li key={r.code} className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-x-2 gap-y-0.5 border-b border-rule py-2 sm:grid-cols-[1.75rem_minmax(0,14rem)_minmax(0,1fr)] sm:gap-x-3 sm:py-1.5">
          <span className="text-label text-ink-subtle tabular-nums">{i + 1}</span>
          <span className="min-w-0"><a href={href(`/aset/${r.code}`)} title={r.name} className="text-body link sm:block sm:truncate">{r.name}</a><span className="ml-1.5 font-mono text-label text-ink-subtle sm:hidden">{r.code}</span></span>
          
          <HoverTip align="right" className="col-start-2 min-w-0 !flex sm:col-start-auto" tip={<><div className="font-medium">{r.name}</div><div className="font-mono mt-0.5">ID {r.code}</div><div className="mt-1 tabular-nums">{formatRupiahEksak(r.value ?? 0)}</div><div className="mt-1 flex items-center gap-1.5"><RiskMarker level={r.level} />{RISK_LABEL[r.level]}</div></>}>
            <a href={href(`/aset/${r.code}`)} aria-label={`${r.name}: ${formatRupiahEksak(r.value ?? 0)}, ${RISK_LABEL[r.level]}. Buka detail`} className="flex min-h-8 w-full items-center gap-2">
              <span className="h-5 rounded-r-md bg-ink-muted/40" style={{ width: `calc((100% - 7.5rem) * ${(r.value ?? 0) / max})`, minWidth: 2 }} />
              <RiskMarker level={r.level} size={16} />
              <span className="whitespace-nowrap text-body font-medium tabular-nums">{formatRupiahRingkas(r.value)}</span>
            </a>
          </HoverTip>
        </li>
      ))}
    </ol>
  );
  return (
    <div>
      <div role="group" aria-label="Jumlah aset ditampilkan" className="mb-2 flex gap-1">
        {[10, 20].map((v) => (
          <button key={v} aria-pressed={n === v} onClick={() => setN(v)} className={`tab-t min-h-11 rounded-md border px-3 text-label cursor-pointer lg:min-h-8 ${n === v ? "border-ink bg-accent text-accent-fg" : "border-rule-strong"}`}>Top-{v}</button>
        ))}
      </div>
      <ChartFrame id="c4" chart={chart} table={table} />
      <p id={descId} className="mt-2 text-label text-ink-subtle">{n} aset teratas menurut nilai buku, dari {formatRupiahRingkas(list[0].value)} ({list[0].name}) sampai {formatRupiahRingkas(list[list.length - 1].value)}; {unratedN} di antaranya belum dinilai. Nilai buku, tidak termasuk {formatAngka(stats.placeholderValue)} aset bernilai placeholder. Marker &quot;?&quot; = belum dinilai; bar netral, kategori hanya lewat marker.</p>
    </div>
  );
}
