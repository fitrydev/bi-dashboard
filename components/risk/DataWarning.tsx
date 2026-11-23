import { TriangleAlert } from "lucide-react";
import { WARN_LABEL, type WarnKey } from "@/lib/scoring";
import { cn } from "@/lib/utils";

/** Peringatan kualitas data. inline = chip berderet; list = daftar. Kosong = tidak render. */
export function DataWarning({
  warnings,
  variant = "list",
  className,
}: {
  warnings: readonly WarnKey[];
  variant?: "inline" | "list";
  className?: string;
}) {
  if (warnings.length === 0) return null;
  const item = (k: WarnKey) => (
    <li
      key={k}
      className={cn(
        "flex items-start gap-1.5 text-label text-status-warning-ink",
        variant === "inline" && "rounded-sm bg-status-warning-bg px-2 py-0.5",
      )}
    >
      <TriangleAlert size={14} aria-hidden="true" className="mt-px shrink-0" />
      <span>{WARN_LABEL[k]}</span>
    </li>
  );
  return (
    <ul
      aria-label={`Peringatan data (${warnings.length})`}
      className={cn(variant === "inline" ? "flex flex-wrap gap-1.5" : "space-y-1", className)}
    >
      {warnings.map(item)}
    </ul>
  );
}
