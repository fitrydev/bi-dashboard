"use client";

import Link from "next/link";
import { useId } from "react";
import { RiskMarker } from "@/components/risk/RiskMarker";
import { Tip } from "@/components/ledger/Tip";
import { countBy, MIN_SHARE_N } from "@/lib/aggregate";
import { formatAngka, formatPersen } from "@/lib/format";
import { riskVar } from "@/lib/risk";
import { asetList } from "@/lib/routes";
import { LEVELS, RISK_LABEL } from "@/lib/scoring";
import type { AssetRow } from "@/lib/types";

/** `onlyAssessed` dikendalikan induk (mis. dari URL). Tanpa `onToggle` kotak centang menjadi tautan tak aktif. */
export function StackedShare({
  rows,
  onlyAssessed,
  onToggle,
}: {
  rows: AssetRow[];
  onlyAssessed: boolean;
  onToggle?: (v: boolean) => void;
}) {
  const descId = useId();
  const assessed = rows.filter((r) => r.assessment).length;
  const canFilter = assessed >= MIN_SHARE_N && !!onToggle;
  const only = onlyAssessed && canFilter;
  const levels = LEVELS.filter((l) => !(only && l === "unrated"));
  const n = (l: (typeof LEVELS)[number]) => countBy(rows, l);
  const total = levels.reduce((s, l) => s + n(l), 0);
  const shown = levels.filter((l) => n(l) > 0);
  if (total === 0) return null;
  const summary = `Sebaran kategori dari ${formatAngka(total)} aset: ${shown.map((l) => `${RISK_LABEL[l]} ${formatAngka(n(l))} (${formatPersen(n(l) / total)})`).join(", ")}.`;
  return (
    <div>
      <div className="mb-2">
        <label
          className={`flex min-h-11 items-center gap-2 text-body lg:min-h-8 ${canFilter ? "text-ink-muted" : "text-ink-subtle"}`}
        >
          <input
            type="checkbox"
            checked={only}
            disabled={!canFilter}
            onChange={(e) => onToggle?.(e.target.checked)}
            className="size-4 accent-(--ink)"
            aria-describedby={canFilter ? undefined : `${descId}-why`}
          />
          Hanya yang sudah dinilai
        </label>
        {!canFilter && (
          <p id={`${descId}-why`} className="text-label text-ink-subtle">
            Belum tersedia: baru {formatAngka(assessed)} aset dinilai (n={formatAngka(assessed)}),
            persentase belum bermakna. Aktif mulai {formatAngka(MIN_SHARE_N)} aset.
          </p>
        )}
      </div>
      <div
        role="group"
        aria-label={`Sebaran kategori, dasar ${total} aset`}
        aria-describedby={descId}
        className="flex h-8 w-full gap-0.5"
      >
        {shown.map((l) => (
          <Tip
            key={l}
            align={l === "unrated" ? "end" : "start"}
            tip={
              <>
                <div className="flex items-center gap-1.5 font-medium">
                  <RiskMarker level={l} />
                  {RISK_LABEL[l]}
                </div>
                <div className="mt-1 tabular-nums">
                  {formatAngka(n(l))} aset · {formatPersen(n(l) / total)}
                </div>
                <div className="mt-1 underline">Klik untuk lihat aset</div>
              </>
            }
          >
            <Link
              href={asetList({ kategori: l })}
              aria-label={`${RISK_LABEL[l]}: ${n(l)} aset, ${formatPersen(n(l) / total)}. Lihat aset`}
              className={`block h-8 ${l === "unrated" ? "hatch-unrated min-w-1 flex-1" : ""}`}
              style={
                l === "unrated"
                  ? undefined
                  : {
                      width: `max(4px, ${(n(l) / total) * 100}%)`,
                      minWidth: 4,
                      background: riskVar(l),
                    }
              }
            />
          </Tip>
        ))}
      </div>
      <p id={descId} className="mt-1 text-label text-ink-subtle">
        {summary}
      </p>
      <table className="mt-4 w-full max-w-xl border-collapse text-body">
        <caption className="sr-only">Sebaran kategori (tautan ke daftar aset)</caption>
        <thead>
          <tr className="border-b border-rule-strong">
            <th scope="col" className="h-9 text-left text-label font-medium">
              Kategori
            </th>
            <th scope="col" className="text-right text-label font-medium">
              Aset
            </th>
            <th scope="col" className="text-right text-label font-medium">
              Persen
            </th>
          </tr>
        </thead>
        <tbody>
          {levels.map((l) => (
            <tr key={l} className="border-b border-rule">
              <td className="h-9">
                <Link
                  href={asetList({ kategori: l })}
                  className="link inline-flex items-center gap-2"
                >
                  <RiskMarker level={l} />
                  {RISK_LABEL[l]}
                </Link>
              </td>
              <td className="text-right tabular-nums">{formatAngka(n(l))}</td>
              <td className="text-right tabular-nums">{formatPersen(n(l) / total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
