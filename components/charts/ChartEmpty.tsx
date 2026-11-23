import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/ledger/EmptyState";

/** Empty state chart: kalimat + satu langkah berikut (tautan). Tinggi minimum menjaga tata letak. */
export function ChartEmpty({
  title,
  why,
  action,
  minHeight = 160,
}: {
  title: ReactNode;
  why: ReactNode;
  action?: { href: string; label: string };
  minHeight?: number;
}) {
  return (
    <div style={{ minHeight }}>
      <EmptyState
        purpose={title}
        why={why}
        next={
          action && (
            <Link href={action.href} className="link inline-flex min-h-11 items-center lg:min-h-0">
              {action.label}
            </Link>
          )
        }
      />
    </div>
  );
}
