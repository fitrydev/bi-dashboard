import { RiskMarker } from "./RiskMarker";
import { riskVar } from "@/lib/risk";
import { RISK_LABEL, type RiskLevel } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export function RiskBadge({
  level,
  override,
  size = "md",
}: {
  level: RiskLevel;
  override?: boolean;
  size?: "sm" | "md";
}) {
  const unrated = level === "unrated";
  return (
    <span
      data-level={level}
      className={cn(
        "inline-flex items-center gap-1.5 text-label font-medium whitespace-nowrap",
        size === "md" && "h-6 rounded-sm px-2",
        unrated && "text-ink-muted",
        unrated && size === "md" && "hatch-unrated",
      )}
      style={
        unrated
          ? undefined
          : {
              color: riskVar(level, "ink"),
              background: size === "md" ? riskVar(level, "tint") : undefined,
            }
      }
    >
      <RiskMarker level={level} />
      {/* latar padat di bawah teks agar arsir tidak menurunkan kontras label */}
      <span
        className={cn(
          override && "underline decoration-double underline-offset-2",
          unrated && size === "md" && "bg-surface px-0.5",
        )}
      >
        {RISK_LABEL[level]}
      </span>
      {override && <span className="text-label font-normal">Override</span>}
    </span>
  );
}
