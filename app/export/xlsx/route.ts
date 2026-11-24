import { loadExportRows } from "@/lib/export/load";
import { guarded, XLSX_TYPE } from "@/lib/export/http";
import { buildWorkbook } from "@/lib/export/workbook";

export const GET = () =>
  guarded("xlsx", XLSX_TYPE, async () => buildWorkbook(await loadExportRows()));
