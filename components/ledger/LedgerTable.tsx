import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Tabel alternatif chart: kolom angka rata kanan. */
export function LedgerTable({
  head,
  rows,
  num = [],
  caption,
}: {
  head: string[];
  rows: ReactNode[][];
  num?: number[];
  caption?: string;
}) {
  return (
    <Table className="min-w-[420px] text-body">
      {caption && <caption className="sr-only">{caption}</caption>}
      <TableHeader>
        <TableRow className="border-b border-rule-strong bg-surface-sunken hover:bg-surface-sunken">
          {head.map((h, i) => (
            <TableHead
              key={h}
              scope="col"
              className={cn(
                "h-10 px-3 text-label font-medium text-ink",
                num.includes(i) ? "text-right" : "text-left",
              )}
            >
              {h}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={i} className="border-b border-rule hover:bg-transparent">
            {r.map((c, j) => (
              <TableCell
                key={j}
                className={cn(
                  "h-10 px-3 tabular-nums",
                  num.includes(j) ? "text-right" : "text-left",
                )}
              >
                {c}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
