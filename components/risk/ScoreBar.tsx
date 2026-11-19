import { formatSkor } from "@/lib/format";
import { riskVar } from "@/lib/risk";
import { RISK_LABEL, type RiskLevel } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const MIN = 20,
  MAX = 100;
const pos = (v: number) => `${((v - MIN) / (MAX - MIN)) * 100}%`;

export function ScoreBar({
  score,
  level,
  compact = false,
  className,
}: {
  score: number | null;
  level: RiskLevel;
  compact?: boolean;
  className?: string;
}) {
  const unrated = score == null;
  return (
    <div className={cn("w-full", className)}>
      {!compact && (
        <div className="relative mb-0.5 h-4 text-label text-ink-subtle" aria-hidden="true">
          {[40, 60, 80].map((t) => (
            <span key={t} className="absolute -translate-x-1/2" style={{ left: pos(t) }}>
              {t}
            </span>
          ))}
        </div>
      )}
      <div
        role={unrated ? "img" : "meter"}
        aria-label={unrated ? "Belum dinilai" : "Skor risiko"}
        {...(unrated
          ? {}
          : {
              "aria-valuemin": MIN,
              "aria-valuemax": MAX,
              "aria-valuenow": score,
              "aria-valuetext": `${formatSkor(score)}, kategori ${RISK_LABEL[level]}`,
            })}
        className={cn(
          "relative h-2 border border-rule",
          unrated ? "hatch-unrated" : "bg-surface-sunken",
        )}
      >
        {!unrated && (
          <div
            className="absolute inset-y-0 left-0"
            style={{ width: pos(score), background: riskVar(level, "fill") }}
          />
        )}
        {[40, 60, 80].map((t) => (
          <span
            key={t}
            aria-hidden="true"
            className="absolute -top-1 -bottom-1 w-px bg-rule-strong"
            style={{ left: pos(t) }}
          />
        ))}
      </div>
    </div>
  );
}
