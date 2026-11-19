import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Bagian bergaris (bukan kartu). */
export function Section({
  id,
  title,
  sub,
  tag,
  action,
  children,
  first,
  level = "info",
}: {
  id?: string;
  title: ReactNode;
  sub?: ReactNode;
  tag?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  first?: boolean;
  level?: "action" | "info";
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-h` : undefined}
      className={cn("pt-8 pb-4", !first && "mt-8 border-t border-rule")}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="max-w-[68ch] min-w-0">
          {tag && <div className="mb-1">{tag}</div>}
          <h2
            id={id ? `${id}-h` : undefined}
            className={
              level === "action"
                ? "text-subtitle text-ink sm:text-title"
                : "font-sans text-subtitle font-semibold text-ink"
            }
          >
            {title}
          </h2>
          {sub && <p className="mt-1.5 text-label text-ink-subtle">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
