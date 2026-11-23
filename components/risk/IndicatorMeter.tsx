import { formatPersen } from "@/lib/format";
import { DEFAULT_PARAMS, SHORT_LABEL, type IndicatorKey, type ScoringParams } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export type IndicatorScores = Partial<Record<IndicatorKey, number | null | undefined>>;
/** Teks rubrik per indikator, indeks 0 = skor 1. (Belum ada di ScoringParams; kelak dari score_criteria.) */
export type Rubric = Partial<Record<IndicatorKey, readonly string[]>>;

/** Profil 6 indikator: bar 1–5, label, bobot, rubrik skor terpilih. null = "belum diketahui" berarsir. */
export function IndicatorMeter({
  scores,
  params = DEFAULT_PARAMS,
  rubric,
  className,
}: {
  scores: IndicatorScores;
  params?: ScoringParams;
  rubric?: Rubric;
  className?: string;
}) {
  return (
    <ul className={cn("divide-y divide-rule border-y border-rule", className)}>
      {params.indicators.map((ind) => {
        const v = scores[ind.key];
        const known = v != null && v >= 1 && v <= 5;
        const text = known ? rubric?.[ind.key]?.[v - 1] : undefined;
        return (
          <li key={ind.key} className="py-2">
            <div className="flex items-baseline justify-between gap-3 text-body">
              <span className="font-medium">
                {SHORT_LABEL[ind.key]}
                <span className="ml-2 text-label font-normal text-ink-muted">
                  bobot {formatPersen(ind.weight)}
                </span>
              </span>
              <span className="tabular-nums">
                {known ? `${v} dari 5` : <span className="text-ink-muted">Belum diketahui</span>}
              </span>
            </div>
            <div
              role={known ? "meter" : "img"}
              aria-label={known ? `${ind.label}: skor ${v} dari 5` : `${ind.label}: belum diketahui`}
              {...(known ? { "aria-valuemin": 1, "aria-valuemax": 5, "aria-valuenow": v } : {})}
              className={cn(
                "relative mt-1 h-2 border border-rule",
                known ? "bg-surface-sunken" : "hatch-unrated",
              )}
            >
              {known && (
                <div className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${(v / 5) * 100}%` }} />
              )}
              {[1, 2, 3, 4].map((t) => (
                <span
                  key={t}
                  aria-hidden="true"
                  className="absolute -top-0.5 -bottom-0.5 w-px bg-rule-strong"
                  style={{ left: `${(t / 5) * 100}%` }}
                />
              ))}
            </div>
            {text && <p className="mt-1 text-label text-ink-muted">{text}</p>}
          </li>
        );
      })}
    </ul>
  );
}
