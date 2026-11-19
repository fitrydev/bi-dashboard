"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { HeatCell } from "@/components/risk/HeatmapCell";
import { RiskBadge } from "@/components/risk/RiskBadge";
import { Button } from "@/components/ui/button";
import { byValueDesc } from "@/lib/aggregate";
import { formatAngka, formatDesimal, formatSkor } from "@/lib/format";
import { asetDetail } from "@/lib/routes";
import { DEFAULT_PARAMS, SHORT_LABEL, type IndicatorKey, type Indicator } from "@/lib/scoring";
import type { AssetRow } from "@/lib/types";

const MINI: Record<IndicatorKey, string> = {
  legal: "Legal",
  control: "Kuasa",
  physical: "Fisik",
  utilization: "Guna",
  location: "Lokasi",
  strategic: "Strat.",
};

/** Heatmap = tabel semantik; tidak perlu toggle tabel. `ratedOnly`: hanya aset dinilai. */
export function Heatmap({
  rows,
  indicators = DEFAULT_PARAMS.indicators,
  ratedOnly = false,
}: {
  rows: AssetRow[];
  indicators?: Indicator[];
  ratedOnly?: boolean;
}) {
  const [all, setAll] = useState(false);
  const descId = useId();
  const rated = rows.filter((r) => r.assessment);
  const unrated = ratedOnly
    ? []
    : byValueDesc(rows)
        .filter((r) => !r.assessment)
        .slice(0, all ? 24 : 5);
  const list: AssetRow[] = [...rated, ...unrated];
  const avg = (k: IndicatorKey) => {
    const v = rated.map((r) => r.assessment!.scores[k]).filter((x): x is number => x != null);
    return v.length ? formatDesimal(v.reduce((a, b) => a + b, 0) / v.length) : "—";
  };
  const summary = `Heatmap skor 1 sampai 5 untuk ${formatAngka(rated.length)} aset yang sudah dinilai${ratedOnly ? "" : `, ditambah ${formatAngka(unrated.length)} aset belum dinilai sebagai arsir`}. ${rated.map((r) => `${r.name}: skor ${formatSkor(r.score!)}, ${indicators.map((i) => `${SHORT_LABEL[i.key]} ${r.assessment!.scores[i.key] ?? "?"}`).join(", ")}`).join("; ")}.`;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-label text-ink-subtle">
        <span>
          Skala sel: 1 = risiko sangat rendah, 5 = sangat tinggi. Arsir &quot;?&quot; = belum
          dinilai.
        </span>
        {!ratedOnly && (
          <Button type="button" variant="link" size="sm" onClick={() => setAll(!all)}>
            {all ? "Ringkas" : "Tampilkan lebih banyak baris belum dinilai"}
          </Button>
        )}
      </div>
      <p id={descId} className="sr-only">
        {summary}
      </p>
      {/* >= 640px: tabel semantik */}
      <div className="hidden border-y border-rule sm:block">
        <div className="overflow-x-auto">
          <table
            aria-describedby={descId}
            className="w-full min-w-[720px] border-collapse text-body"
          >
            <caption className="sr-only">Skor indikator per aset</caption>
            <thead>
              <tr className="border-b border-rule-strong bg-surface-sunken">
                <th scope="col" className="h-12 w-56 px-3 text-left text-label font-medium">
                  Aset
                </th>
                {indicators.map((i) => (
                  <th
                    key={i.key}
                    scope="col"
                    className="h-12 px-1 text-center text-label font-medium"
                  >
                    <div>{SHORT_LABEL[i.key]}</div>
                    <div className="font-normal text-ink-subtle">{Math.round(i.weight * 100)}%</div>
                  </th>
                ))}
                <th scope="col" className="h-12 px-3 text-right text-label font-medium">
                  Skor
                </th>
                <th scope="col" className="h-12 px-3 text-left text-label font-medium">
                  Kategori
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.code} className="border-b border-rule">
                  <th scope="row" className="w-56 max-w-56 px-3 py-1 text-left font-normal">
                    <Link href={asetDetail(r.code)} className="link block truncate" title={r.name}>
                      {r.name}
                    </Link>
                    <span className="font-mono text-label text-ink-subtle">{r.code}</span>
                  </th>
                  {indicators.map((i) => (
                    <td key={i.key} className="px-1 py-1">
                      <div className="mx-auto w-10">
                        <HeatCell
                          score={r.assessment ? r.assessment.scores[i.key] : null}
                          label={`${i.label}, aset ${r.code}`}
                        />
                      </div>
                    </td>
                  ))}
                  <td className="px-3 text-right font-medium tabular-nums">
                    {r.score == null ? "—" : formatSkor(r.score)}
                  </td>
                  <td className="px-3">
                    <RiskBadge level={r.level} size="sm" />
                  </td>
                </tr>
              ))}
              <tr className="bg-surface-sunken">
                <th scope="row" className="px-3 py-2 text-left text-label font-medium">
                  Rata-rata ({formatAngka(rated.length)} aset dinilai)
                </th>
                {indicators.map((i) => (
                  <td key={i.key} className="text-center tabular-nums">
                    {avg(i.key)}
                  </td>
                ))}
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
              <Link href={asetDetail(r.code)} className="link min-w-0 text-body font-medium">
                {r.name}
              </Link>
              <RiskBadge level={r.level} size="sm" />
            </div>
            <div className="font-mono text-label text-ink-subtle">
              {r.code}
              {r.score != null && <span className="font-sans"> · skor {formatSkor(r.score)}</span>}
            </div>
            <div className="mt-2 grid grid-cols-6 gap-1">
              {indicators.map((i) => (
                <div key={i.key} className="min-w-0 text-center">
                  <HeatCell
                    className="w-full"
                    score={r.assessment ? r.assessment.scores[i.key] : null}
                    label={`${i.label}, aset ${r.code}`}
                  />
                  <div
                    className="mt-0.5 truncate text-[11px] leading-tight text-ink-subtle"
                    aria-hidden="true"
                  >
                    {MINI[i.key]}
                  </div>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
