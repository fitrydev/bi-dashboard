import { cn } from "@/lib/utils";

/** Sel heatmap statis (bukan kontrol): tautan ada di nama aset. Border 1px --rule-strong agar batas sel lolos 1.4.11. */
export function HeatCell({
  score,
  label,
  className,
}: {
  score: number | null;
  label: string;
  className?: string;
}) {
  const base =
    "flex h-8 w-10 items-center justify-center rounded-sm border border-rule-strong text-body font-medium tabular-nums";
  if (score == null)
    return (
      <span
        role="img"
        aria-label={`${label}: belum dinilai`}
        className={cn(base, "hatch-unrated text-ink-muted", className)}
      >
        ?
      </span>
    );
  return (
    <span
      role="img"
      aria-label={`${label}: skor ${score} dari 5`}
      className={cn(base, className)}
      style={{ background: `var(--heat-${score})`, color: `var(--heat-fg-${score})` }}
    >
      {score}
    </span>
  );
}
