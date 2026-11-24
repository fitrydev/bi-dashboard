import { RiskMarker } from "@/components/risk/RiskMarker";
import { countBy } from "@/lib/aggregate";
import { formatAngka, formatPersen } from "@/lib/format";
import { riskVar } from "@/lib/risk";
import { LEVELS, RISK_LABEL } from "@/lib/scoring";
import type { AssetRow } from "@/lib/types";

export function CoverageBar({
  rows,
  thin = false,
  target,
}: {
  rows: AssetRow[];
  thin?: boolean;
  /** Fraksi ambang (mis. 0,2): garis penanda di bar berbasis seluruh aset. */
  target?: number;
}) {
  const total = rows.length;
  if (total === 0) return null;
  const n = (l: (typeof LEVELS)[number]) => countBy(rows, l);
  const dinilai = total - n("unrated");
  const segs = LEVELS.filter((l) => l !== "unrated" && n(l) > 0);
  const label = `Cakupan penilaian: ${dinilai} dari ${total} aset dinilai; ${segs.map((l) => `${RISK_LABEL[l]} ${n(l)}`).join(", ")}; belum dinilai ${total - dinilai}.`;
  return (
    <div>
      <div
        role="img"
        aria-label={target ? `${label} Ambang ${formatPersen(target)}.` : label}
        className={`relative flex w-full gap-0.5 ${thin ? "h-2" : "h-4"}`}
      >
        {segs.map((l) => (
          <div
            key={l}
            style={{
              flexBasis: `max(4px, ${(n(l) / total) * 100}%)`,
              flexGrow: 0,
              flexShrink: 0,
              background: riskVar(l),
            }}
          />
        ))}
        <div className="hatch-unrated min-w-0 flex-1" />
        {target && (
          <div
            aria-hidden="true"
            className="absolute -inset-y-1 w-0.5 bg-ink"
            style={{ left: `${target * 100}%` }}
            title={`Ambang ${formatPersen(target)}`}
          />
        )}
      </div>
      {!thin && (
        <>
          <div className="mt-1 flex h-5 items-start" aria-hidden="true">
            {segs.map((l) => (
              <div key={l} className="flex items-start gap-1.5">
                <span className="-mt-0.5 h-2 w-px bg-ink" />
                <span className="text-label text-ink">
                  {n(l)} aset {RISK_LABEL[l]}
                </span>
              </div>
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-body">
            {LEVELS.filter((l) => l === "unrated" || n(l) > 0).map((l) => (
              <li key={l} className="flex items-center gap-2">
                <RiskMarker level={l} size={14} />
                <span className="text-ink-muted">{RISK_LABEL[l]}</span>
                <span className="font-medium tabular-nums">{formatAngka(n(l))}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-label text-ink-subtle">
            {formatPersen(dinilai / total)} dari {total} aset. Sisanya{" "}
            {formatAngka(total - dinilai)} aset belum punya skor.
          </p>
        </>
      )}
    </div>
  );
}
