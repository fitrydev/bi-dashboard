"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { RiskMarker } from "@/components/risk/RiskMarker";
import { ChartFrame } from "@/components/ledger/ChartFrame";
import { LedgerTable } from "@/components/ledger/LedgerTable";
import { Tip } from "@/components/ledger/Tip";
import { Button } from "@/components/ui/button";
import { byValueDesc } from "@/lib/aggregate";
import { formatAngka, formatRupiahEksak, formatRupiahRingkas } from "@/lib/format";
import { asetDetail } from "@/lib/routes";
import { RISK_LABEL } from "@/lib/scoring";
import type { AssetRow } from "@/lib/types";

export function TopValue({ rows }: { rows: AssetRow[] }) {
  const [n, setN] = useState(10);
  const descId = useId();
  const sorted = byValueDesc(rows);
  const list = sorted.slice(0, n);
  if (list.length === 0) return null;
  const max = list[0].value ?? 1;
  const unratedN = list.filter((r) => !r.assessment).length;
  const placeholderN = rows.filter((r) => r.flags.value_placeholder).length;
  const table = (
    <LedgerTable
      caption={`${n} aset dengan nilai buku tertinggi`}
      head={["#", "Aset", "Kategori", "Nilai buku"]}
      num={[0, 3]}
      rows={list.map((r, i) => [
        i + 1,
        <Link key={r.code} className="link" href={asetDetail(r.code)}>
          {r.name}
        </Link>,
        RISK_LABEL[r.level],
        formatRupiahEksak(r.value ?? 0),
      ])}
    />
  );
  const chart = (
    <ol
      aria-label={`${n} aset dengan nilai buku tertinggi`}
      aria-describedby={descId}
      className="border-t border-rule"
    >
      {list.map((r, i) => (
        <li
          key={r.code}
          className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-x-2 gap-y-0.5 border-b border-rule py-2 sm:grid-cols-[1.75rem_minmax(0,14rem)_minmax(0,1fr)] sm:gap-x-3 sm:py-1.5"
        >
          <span className="text-label text-ink-subtle tabular-nums">{i + 1}</span>
          <span className="min-w-0">
            <Link
              href={asetDetail(r.code)}
              title={r.name}
              className="link text-body sm:block sm:truncate"
            >
              {r.name}
            </Link>
            <span className="ml-1.5 font-mono text-label text-ink-subtle sm:hidden">{r.code}</span>
          </span>
          <div className="col-start-2 flex min-w-0 sm:col-start-auto">
            <Tip
              side="top"
              align="end"
              tip={
                <>
                  <div className="font-medium">{r.name}</div>
                  <div className="mt-0.5 font-mono">ID {r.code}</div>
                  <div className="mt-1 tabular-nums">{formatRupiahEksak(r.value ?? 0)}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <RiskMarker level={r.level} />
                    {RISK_LABEL[r.level]}
                  </div>
                </>
              }
            >
              <Link
                href={asetDetail(r.code)}
                aria-label={`${r.name}: ${formatRupiahEksak(r.value ?? 0)}, ${RISK_LABEL[r.level]}. Buka detail`}
                className="flex min-h-8 w-full items-center gap-2"
              >
                <span
                  className="h-5 rounded-r-md bg-ink-muted/40"
                  style={{ width: `calc((100% - 7.5rem) * ${(r.value ?? 0) / max})`, minWidth: 2 }}
                />
                <RiskMarker level={r.level} size={16} />
                <span className="text-body font-medium whitespace-nowrap tabular-nums">
                  {formatRupiahRingkas(r.value)}
                </span>
              </Link>
            </Tip>
          </div>
        </li>
      ))}
    </ol>
  );
  return (
    <div>
      <div role="group" aria-label="Jumlah aset ditampilkan" className="mb-2 flex gap-1">
        {[10, 20].map((v) => (
          <Button
            key={v}
            type="button"
            size="sm"
            variant={n === v ? "default" : "outline"}
            aria-pressed={n === v}
            onClick={() => setN(v)}
          >
            Top-{v}
          </Button>
        ))}
      </div>
      <ChartFrame id="top-nilai" chart={chart} table={table} />
      <p id={descId} className="mt-2 text-label text-ink-subtle">
        {list.length} aset teratas menurut nilai buku, dari {formatRupiahRingkas(list[0].value)} (
        {list[0].name}) sampai {formatRupiahRingkas(list[list.length - 1].value)}; {unratedN} di
        antaranya belum dinilai. Nilai buku, tidak termasuk {formatAngka(placeholderN)} aset
        bernilai placeholder. Marker &quot;?&quot; = belum dinilai; bar netral, kategori hanya lewat
        marker.
      </p>
    </div>
  );
}
