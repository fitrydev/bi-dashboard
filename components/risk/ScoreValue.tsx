import { formatSkor } from "@/lib/format";
import { RISK_LABEL, type RiskLevel } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { riskVar } from "@/lib/risk";

/** Angka skor + kategori. Skor null = "Belum dinilai" berarsir; tidak pernah "0" atau tampilan Low. */
export function ScoreValue({
  score,
  level,
  className,
}: {
  score: number | null;
  level: RiskLevel;
  className?: string;
}) {
  if (score == null)
    return (
      <span className={cn("inline-flex items-center text-label text-ink-muted", className)}>
        <span className="hatch-unrated px-1.5">
          <span className="bg-surface px-0.5">{RISK_LABEL.unrated}</span>
        </span>
      </span>
    );
  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span className="text-body font-semibold tabular-nums">{formatSkor(score)}</span>
      <span className="text-label font-medium" style={{ color: riskVar(level, "ink") }}>
        {RISK_LABEL[level]}
      </span>
    </span>
  );
}
