import type { ReactNode } from "react";

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-rule-strong px-1.5 py-0.5 text-label text-ink-muted">
      {children}
    </span>
  );
}
