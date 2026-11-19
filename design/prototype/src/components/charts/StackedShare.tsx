import { useId } from "react";
import { RiskMarker } from "@/components/risk/RiskMarker";
import { HoverTip } from "@/components/ui/HoverTip";
import { LEVELS, MIN_SHARE_N, RISK_LABEL, stats } from "@/lib/data";
import { formatAngka, formatPersen } from "@/lib/format";
import { href } from "@/lib/router";
import { countBy } from "./CoverageBar";

export function StackedShare({ onlyAssessed, onToggle }: { onlyAssessed: boolean; onToggle: (v: boolean) => void }) {
  const descId = useId();
  const canFilter = stats.assessed >= MIN_SHARE_N;
  const only = onlyAssessed && canFilter;
  const levels = LEVELS.filter((l) => !(only && l === "unrated"));
  const total = levels.reduce((s, l) => s + countBy(l), 0);
  const shown = levels.filter((l) => countBy(l) > 0);
  const summary = `Sebaran kategori dari ${formatAngka(total)} aset: ${levels.filter((l) => countBy(l) > 0).map((l) => `${RISK_LABEL[l]} ${formatAngka(countBy(l))} (${formatPersen(countBy(l) / total)})`).join(", ")}.`;
  return (
    <div>
      <div className="mb-2">
        <label className={`flex min-h-11 items-center gap-2 text-body lg:min-h-8 ${canFilter ? "text-ink-muted" : "text-ink-subtle"}`}>
          <input type="checkbox" checked={only} disabled={!canFilter} onChange={(e) => onToggle(e.target.checked)} className="size-4 accent-[var(--ink)]" aria-describedby={canFilter ? undefined : `${descId}-why`} />
          Hanya yang sudah dinilai
        </label>
        {!canFilter && <p id={`${descId}-why`} className="text-label text-ink-subtle">Belum tersedia: baru {formatAngka(stats.assessed)} aset dinilai (n={formatAngka(stats.assessed)}), persentase belum bermakna. Aktif mulai {formatAngka(MIN_SHARE_N)} aset.</p>}
      </div>
      <div role="group" aria-label={`Sebaran kategori, dasar ${total} aset`} aria-describedby={descId} className="flex h-8 w-full gap-0.5">
        {shown.map((l) => (
          <HoverTip key={l} align={l === "unrated" ? "right" : "left"} className={l === "unrated" ? "flex-1" : ""}
            tip={<><div className="flex items-center gap-1.5 font-medium"><RiskMarker level={l} />{RISK_LABEL[l]}</div><div className="mt-1 tabular-nums">{formatAngka(countBy(l))} aset · {formatPersen(countBy(l) / total)}</div><div className="mt-1 underline">Klik untuk lihat aset</div></>}>
            <a href={href("/aset", { kategori: l })} aria-label={`${RISK_LABEL[l]}: ${countBy(l)} aset, ${formatPersen(countBy(l) / total)}. Lihat aset`}
              className={`block h-8 ${l === "unrated" ? "hatch-unrated w-full" : ""}`}
              style={l === "unrated" ? undefined : { width: `max(4px, ${(countBy(l) / total) * 100}%)`, minWidth: 4, background: `var(--risk-${l})`, display: "block" }} />
          </HoverTip>
        ))}
      </div>
      <p id={descId} className="mt-1 text-label text-ink-subtle">{summary}</p>
      <table className="mt-4 w-full max-w-xl border-collapse text-body">
        <caption className="sr-only">Sebaran kategori (tautan ke daftar aset)</caption>
        <thead><tr className="border-b border-rule-strong"><th scope="col" className="h-9 text-left text-label font-medium">Kategori</th><th scope="col" className="text-right text-label font-medium">Aset</th><th scope="col" className="text-right text-label font-medium">Persen</th></tr></thead>
        <tbody>
          {levels.map((l) => (
            <tr key={l} className="border-b border-rule">
              <td className="h-9"><a href={href("/aset", { kategori: l })} className="inline-flex items-center gap-2 link"><RiskMarker level={l} />{RISK_LABEL[l]}</a></td>
              <td className="text-right tabular-nums">{formatAngka(countBy(l))}</td>
              <td className="text-right tabular-nums">{formatPersen(countBy(l) / total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
