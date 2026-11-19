import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Tooltip CSS-only: muncul saat hover atau fokus di dalam. */
export function HoverTip({ tip, children, align = "center", className }: { tip: ReactNode; children: ReactNode; align?: "center" | "left" | "right"; className?: string }) {
  return (
    <span className={cn("group/tip relative inline-flex", className)}>
      {children}
      <span role="tooltip" className={cn(
        "pointer-events-none absolute bottom-full z-40 mb-2 hidden w-max max-w-[260px] rounded-md border border-rule-strong bg-surface-raised px-3 py-2 text-label text-ink shadow-overlay group-hover/tip:block group-focus-within/tip:block",
        align === "center" && "left-1/2 -translate-x-1/2", align === "left" && "left-0", align === "right" && "right-0")}>
        {tip}
      </span>
    </span>
  );
}
