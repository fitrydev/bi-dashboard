"use client";

import { useState, type ReactNode } from "react";
import { TableToggle } from "./TableToggle";

/** Bingkai chart: tombol "Tampilkan tabel" + tabel alternatif identik. `defaultTable` untuk kontrol dari luar (mis. dari URL). */
export function ChartFrame({
  chart,
  table,
  defaultTable = false,
}: {
  id?: string;
  chart: ReactNode;
  table: ReactNode;
  defaultTable?: boolean;
}) {
  const [on, setOn] = useState(defaultTable);
  return (
    <div>
      <div className="-mt-1 mb-2 flex justify-end">
        <TableToggle on={on} onClick={() => setOn(!on)} />
      </div>
      {on ? <div className="overflow-x-auto">{table}</div> : chart}
    </div>
  );
}
