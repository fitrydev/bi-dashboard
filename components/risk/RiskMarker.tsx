import { riskVar } from "@/lib/risk";
import { RISK_LABEL, type RiskLevel } from "@/lib/scoring";

/** Penanda bentuk risiko (DESIGN.md §3): belah ketupat, segitiga, lingkaran penuh, cincin, kotak putus-putus. */
export function RiskMarker({
  level,
  size = 12,
  label = false,
}: {
  level: RiskLevel;
  size?: number;
  label?: boolean;
}) {
  const a11y = label
    ? { role: "img" as const, "aria-label": RISK_LABEL[level] }
    : { "aria-hidden": true as const };
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    className: "inline-block shrink-0",
    focusable: false,
    ...a11y,
  };
  const style = { color: riskVar(level, "fill") };
  const stroke = { stroke: "var(--surface)", strokeWidth: 1.5, paintOrder: "stroke" as const };
  switch (level) {
    case "critical":
      return (
        <svg {...common} style={style}>
          <path d="M8 1 15 8 8 15 1 8Z" fill="currentColor" {...stroke} />
        </svg>
      );
    case "high":
      return (
        <svg {...common} style={style}>
          <path d="M8 2 15 14H1Z" fill="currentColor" {...stroke} />
        </svg>
      );
    case "medium":
      return (
        <svg {...common} style={style}>
          <circle cx="8" cy="8" r="6" fill="currentColor" {...stroke} />
        </svg>
      );
    case "low":
      return (
        <svg {...common} style={style}>
          <circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect
            x="1.5"
            y="1.5"
            width="13"
            height="13"
            fill="none"
            stroke="var(--hatch-line)"
            strokeWidth="1.25"
            strokeDasharray="2.5 2"
          />
          <path
            d="M6 6.2a2 2 0 1 1 3 1.7c-.7.4-1 .8-1 1.6M8 11.7v.3"
            stroke="var(--risk-unrated-ink)"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}
