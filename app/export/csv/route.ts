import type { NextRequest } from "next/server";

import {
  COLUMN_KEYS, DEFAULT_COLUMNS, DEFAULT_SORT, applyAsetFilters, parseAsetFilters, sortRows,
  type AsetListRow, type ColumnKey,
} from "@/lib/aset/filters";
import { loadAsetList } from "@/lib/aset/load";
import { toCsv, type CsvColumn } from "@/lib/export/csv";
import { guarded } from "@/lib/export/http";
import { RISK_LABEL, WARN_LABEL } from "@/lib/scoring/labels";

// Angka mentah (tanpa format Rp) agar bisa diolah.
const OPTIONAL: Record<ColumnKey, CsvColumn<AsetListRow>[]> = {
  wilayah: [{ header: "Wilayah", get: (r) => r.region }],
  jenis: [{ header: "Jenis", get: (r) => r.type }],
  pemanfaatan: [{ header: "Pemanfaatan", get: (r) => r.utilization }],
  nilai: [{ header: "Nilai buku (Rp)", get: (r) => r.book_value }],
  kategori: [{ header: "Kategori", get: (r) => RISK_LABEL[r.level] }],
  skor: [{ header: "Skor", get: (r) => r.score }],
  jadwal: [
    { header: "Status jadwal", get: (r) => r.schedule_status },
    { header: "Jatuh tempo", get: (r) => r.due_date },
  ],
  peringatan: [{ header: "Peringatan", get: (r) => r.warnings.map((w) => WARN_LABEL[w]).join(" | ") }],
};

export const GET = (req: NextRequest) =>
  guarded("csv", "text/csv; charset=utf-8", async () => {
    const f = parseAsetFilters(req.nextUrl.searchParams);
    const cols = f.columns ?? DEFAULT_COLUMNS;
    const columns: CsvColumn<AsetListRow>[] = [
      { header: "ID Aset", get: (r) => r.code },
      { header: "Nama Aset", get: (r) => r.name },
      ...COLUMN_KEYS.filter((k) => cols.includes(k)).flatMap((k) => OPTIONAL[k]),
    ];
    const { rows } = await loadAsetList();
    return toCsv(sortRows(applyAsetFilters(rows, f), f.sort ?? DEFAULT_SORT), columns);
  });
