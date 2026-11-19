import type { ReactNode } from "react";
import { TableToggle } from "@/components/ui/primitives";
import { useRoute, useReplaceParams } from "@/lib/router";

/** Bingkai chart: toggle "Tampilkan tabel" (state di URL ?tabel=id) + tabel alternatif identik. */
export function ChartFrame({ id, chart, table }: { id: string; chart: ReactNode; table: ReactNode }) {
  const route = useRoute();
  const set = useReplaceParams(route);
  const ids = (route.params.get("tabel") ?? "").split(",").filter(Boolean);
  const on = ids.includes(id);
  const toggle = () => set({ tabel: (on ? ids.filter((x) => x !== id) : [...ids, id]).join(",") || null });
  return (
    <div>
      <div className="-mt-1 mb-2 flex justify-end"><TableToggle on={on} onClick={toggle} /></div>
      {on ? <div className="overflow-x-auto">{table}</div> : chart}
    </div>
  );
}

export function LedgerTable({ head, rows, num = [] }: { head: string[]; rows: ReactNode[][]; num?: number[] }) {
  return (
    <table className="w-full min-w-[420px] border-collapse text-body">
      <thead>
        <tr className="border-b border-rule-strong bg-surface-sunken">
          {head.map((h, i) => <th key={h} scope="col" className={`h-10 px-3 text-label font-medium text-ink ${num.includes(i) ? "text-right" : "text-left"}`}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-rule">
            {r.map((c, j) => <td key={j} className={`h-10 px-3 tabular-nums ${num.includes(j) ? "text-right" : "text-left"}`}>{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
