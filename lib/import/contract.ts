// Kontrak payload `import_commit(batch_id, rows jsonb)` — dipakai bersama validator TS (lib/import)
// dan RPC Postgres. Hanya baris yang lolos validasi (bukan "Ditolak") yang dikirim.
// Kunci yang TIDAK ada di `data` = kolom kosong di Excel → tidak diubah (upsert hanya kolom terisi).

import type { Database } from "@/lib/supabase/database.types";

type E = Database["public"]["Enums"];

export type ImportAssetData = {
  asset_code: string; // wajib, dinormalisasi (angka → string tanpa ".0")
  name?: string;
  type?: E["asset_type"];
  region?: string; // nama atau alias wilayah (mentah, DB me-resolve via regions/region_aliases)
  address?: string;
  land_area_m2?: number;
  building_area_m2?: number;
  book_value?: number;
  legal_status?: string;
  right_expiry_date?: string; // YYYY-MM-DD
  utilization?: string; // teks mentah (DB me-resolve via utilization_aliases → status + needs_review)
  pic_unit?: string;
  notes?: string;
  last_monitored_at?: string; // YYYY-MM-DD (masa depan = peringatan, tetap diimpor)
};

export type ImportAssessmentData = {
  asset_code: string;
  assessed_at: string; // YYYY-MM-DD, wajib
  s_legal?: number | null; // 1..5; null eksplisit tidak dikirim — kosong = kunci tidak ada
  s_control?: number | null;
  s_physical?: number | null;
  s_utilization?: number | null;
  s_location?: number | null;
  s_strategic?: number | null;
  critical_override?: boolean;
  override_reason?: string;
  findings?: string;
  follow_up?: string;
  follow_up_pic?: string;
  target_date?: string;
};

export type ImportRow =
  | { kind: "asset"; row: number; data: ImportAssetData }
  | { kind: "assessment"; row: number; data: ImportAssessmentData };

/** Status per baris di laporan (DESIGN §12.2). */
export type RowStatus = "rejected" | "warning" | "finding" | "ok";

/** Hasil RPC per baris (disimpan ke import_batches.report.rows). */
export type CommitRowResult = {
  kind: ImportRow["kind"];
  row: number;
  asset_code: string;
  action: "inserted" | "updated" | "unchanged" | "error";
  message?: string;
};

export type CommitResult = {
  batch_id: string;
  inserted: number;
  updated: number;
  unchanged: number;
  errors: number;
  rows: CommitRowResult[];
};

export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;
