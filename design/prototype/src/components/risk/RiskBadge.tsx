import { RiskMarker } from "./RiskMarker";
import { RISK_LABEL, type RiskLevel } from "@/lib/data";
import { cn } from "@/lib/utils";

export function RiskBadge({ level, override, size = "md" }: { level: RiskLevel; override?: boolean; size?: "sm" | "md" }) {
  const unrated = level === "unrated";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap text-label font-medium",
        size === "md" && "h-6 rounded-sm px-2",
        unrated ? cn("text-ink-muted", size === "md" && "hatch-unrated") : "",
        !unrated && size === "md" && `bg-risk-${level}-tint`,
      )}
      style={unrated ? undefined : { color: `var(--risk-${level}-ink)`, background: size === "md" ? `var(--risk-${level}-tint)` : undefined }}
    >
      <RiskMarker level={level} size={size === "md" ? 12 : 12} />
      <span className={override ? "underline decoration-double underline-offset-2" : ""}>{RISK_LABEL[level]}</span>
      {override && <span className="text-label font-normal">Override</span>}
    </span>
  );
}
