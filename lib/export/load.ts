import "server-only";

import type { ExportRow } from "@/lib/export/workbook";
import { fetchAll } from "@/lib/supabase/paginate";
import { createClient } from "@/lib/supabase/server";

/** Semua aset aktif + penilaian terakhir (v_asset_latest, RLS user). */
export async function loadExportRows(): Promise<ExportRow[]> {
  const supabase = await createClient();
  const data = await fetchAll(
    (f, t) => supabase.from("v_asset_latest").select("*").eq("is_active", true).order("asset_code").range(f, t),
    "data ekspor",
  );
  return data as unknown as ExportRow[];
}
