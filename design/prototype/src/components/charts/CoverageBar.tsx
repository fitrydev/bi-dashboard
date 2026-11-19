import { RiskMarker } from "@/components/risk/RiskMarker";
import { LEVELS, RISK_LABEL, rows, type RiskLevel } from "@/lib/data";
import { formatAngka, formatPersen } from "@/lib/format";

export const countBy = (l: RiskLevel) => rows.filter((r) => r.level === l).length;

export function CoverageBar({ thin = false }: { thin?: boolean }) {
  const total = rows.length;
  const dinilai = total - countBy("unrated");
  const segs = LEVELS.filter((l) => l !== "unrated" && countBy(l) > 0);
  const label = `Cakupan penilaian: ${dinilai} dari ${total} aset dinilai; ${segs.map((l) => `${RISK_LABEL[l]} ${countBy(l)}`).join(", ")}; belum dinilai ${total - dinilai}.`;
  return (
    <div>
      <div role="img" aria-label={label} className={`flex w-full gap-0.5 ${thin ? "h-2" : "h-4"}`}>
        {segs.map((l) => (
          <div key={l} style={{ flexBasis: `max(4px, ${(countBy(l) / total) * 100}%)`, flexGrow: 0, flexShrink: 0, background: `var(--risk-${l})` }} />
        ))}
        <div className="hatch-unrated min-w-0 flex-1" />
      </div>
      {!thin && <>
      <div className="mt-1 flex h-5 items-start" aria-hidden="true">
        {segs.map((l) => (
          <div key={l} className="flex items-start gap-1.5">
            <span className="mt-[-2px] h-2 w-px bg-ink" />
            <span className="text-label text-ink">{countBy(l)} aset {RISK_LABEL[l]}</span>
          </div>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-body">
        {LEVELS.filter((l) => l === "unrated" || countBy(l) > 0).map((l) => (
          <li key={l} className="flex items-center gap-2"><RiskMarker level={l} size={14} /><span className="text-ink-muted">{RISK_LABEL[l]}</span><span className="font-medium tabular-nums">{formatAngka(countBy(l))}</span></li>
        ))}
      </ul>
      <p className="mt-2 text-label text-ink-subtle">{formatPersen(dinilai / total)} dari {total} aset. Sisanya {formatAngka(total - dinilai)} aset belum punya skor.</p>
      </>}
    </div>
  );
}
