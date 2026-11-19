import { useId, useState } from "react";
import { HeatCell } from "@/components/risk/HeatmapCell";
import { RiskBadge } from "@/components/risk/RiskBadge";
import { byValueDesc, INDICATORS, SHORT_LABEL, rows, type Row } from "@/lib/data";
import { formatSkor, formatDesimal, formatAngka } from "@/lib/format";
import { href } from "@/lib/router";

const MINI: Record<string, string> = { legal: "Legal", control: "Kuasa", physical: "Fisik", utilization: "Guna", location: "Lokasi", strategic: "Strat." };

/** Heatmap = tabel semantik; tidak perlu toggle tabel. `ratedOnly`: hanya aset dinilai. */
export function Heatmap({ ratedOnly = false }: { ratedOnly?: boolean }) {
  const [all, setAll] = useState(false);
  const descId = useId();
  const rated = rows.filter((r) => r.assessment);
  const unrated = ratedOnly ? [] : byValueDesc.filter((r) => !r.assessment).slice(0, all ? 24 : 5);
  const list: Row[] = [...rated, ...unrated];
  const avg = (k: (typeof INDICATORS)[number]["key"]) => {
    const v = rated.map((r) => r.assessment!.scores[k]).filter((x): x is number => x != null);
    return v.length ? formatDesimal(v.reduce((a, b) => a + b, 0) / v.length) : "—";
  };
  const summary = `Heatmap skor 1 sampai 5 untuk ${formatAngka(rated.length)} aset yang sudah dinilai${ratedOnly ? "" : `, ditambah ${formatAngka(unrated.length)} aset belum dinilai sebagai arsir`}. ${rated.map((r) => `${r.name}: skor ${formatSkor(r.score!)}, ${INDICATORS.map((i) => `${SHORT_LABEL[i.key]} ${r.assessment!.scores[i.key] ?? "?"}`).join(", ")}`).join("; ")}.`;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-label text-ink-subtle">
        <span>Skala sel: 1 = risiko sangat rendah, 5 = sangat tinggi. Arsir &quot;?&quot; = belum dinilai.</span>
        {!ratedOnly && <button type="button" onClick={() => setAll(!all)} className="min-h-11 text-label text-ink underline underline-offset-2 cursor-pointer lg:min-h-8">{all ? "Ringkas" : "Tampilkan lebih banyak baris belum dinilai"}</button>}
      </div>
      <p id={descId} className="sr-only">{summary}</p>
      {/* >= 640px: tabel */}
      <div className="hidden border-y border-rule sm:block">
        <div className="overflow-x-auto">
          <table aria-describedby={descId} className="w-full min-w-[720px] border-collapse text-body">
            <caption className="sr-only">Skor indikator per aset</caption>
            <thead>
              <tr className="border-b border-rule-strong bg-surface-sunken">
                <th scope="col" className="h-12 w-56 px-3 text-left text-label font-medium">Aset</th>
                {INDICATORS.map((i) => (
                  <th key={i.key} scope="col" className="h-12 px-1 text-center text-label font-medium"><div>{SHORT_LABEL[i.key]}</div><div className="font-normal text-ink-subtle">{Math.round(i.weight * 100)}%</div></th>
                ))}
                <th scope="col" className="h-12 px-3 text-right text-label font-medium">Skor</th>
                <th scope="col" className="h-12 px-3 text-left text-label font-medium">Kategori</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.code} className="border-b border-rule">
                  <th scope="row" className="w-56 max-w-56 px-3 py-1 text-left font-normal">
                    <a href={href(`/aset/${r.code}`)} className="block truncate link" title={r.name}>{r.name}</a>
                    <span className="font-mono text-label text-ink-subtle">{r.code}</span>
                  </th>
                  {INDICATORS.map((i) => (
                    <td key={i.key} className="px-1 py-1"><div className="mx-auto w-10"><HeatCell score={r.assessment ? r.assessment.scores[i.key] : null} label={`${i.label}, aset ${r.code}`} /></div></td>
                  ))}
                  <td className="px-3 text-right font-medium tabular-nums">{r.score == null ? "—" : formatSkor(r.score)}</td>
                  <td className="px-3"><RiskBadge level={r.level} size="sm" /></td>
                </tr>
              ))}
              <tr className="bg-surface-sunken">
                <th scope="row" className="px-3 py-2 text-left text-label font-medium">Rata-rata ({formatAngka(rated.length)} aset dinilai)</th>
                {INDICATORS.map((i) => <td key={i.key} className="text-center tabular-nums">{avg(i.key)}</td>)}
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      {/* < 640px: daftar, 6 sel mini per aset */}
      <ul className="border-t border-rule sm:hidden">
        {list.map((r) => (
          <li key={r.code} className="border-b border-rule py-3">
            <div className="flex items-start justify-between gap-2">
              <a href={href(`/aset/${r.code}`)} className="min-w-0 text-body font-medium link">{r.name}</a>
              <RiskBadge level={r.level} size="sm" />
            </div>
            <div className="font-mono text-label text-ink-subtle">{r.code}{r.score != null && <span className="font-sans"> · skor {formatSkor(r.score)}</span>}</div>
            <div className="mt-2 grid grid-cols-6 gap-1">
              {INDICATORS.map((i) => (
                <div key={i.key} className="min-w-0 text-center">
                  <HeatCell className="!w-full" score={r.assessment ? r.assessment.scores[i.key] : null} label={`${i.label}, aset ${r.code}`} />
                  <div className="mt-0.5 truncate text-[11px] leading-tight text-ink-subtle" aria-hidden="true">{MINI[i.key]}</div>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
