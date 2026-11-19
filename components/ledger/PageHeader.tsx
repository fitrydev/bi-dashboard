import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  sub,
  action,
  slim,
}: {
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  slim?: boolean;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-rule-strong pb-5">
      <div className="max-w-[68ch] min-w-0">
        <h1
          className={cn(
            "text-title text-ink sm:text-display",
            slim && "truncate lg:whitespace-normal",
          )}
        >
          {title}
        </h1>
        {sub && (
          <p className={cn("mt-2 text-body text-ink-muted", slim && "hidden lg:block")}>{sub}</p>
        )}
      </div>
      {action}
    </header>
  );
}
