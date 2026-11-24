// Pratinjau "baru / berubah / sama" terhadap data DB saat ini. Murni; hanya kunci yang ada di payload dibandingkan
// (kolom kosong di Excel = tidak diubah). Hasil akhir tetap ditentukan import_commit (bisa beda bila DB berubah).
import type { ImportAssessmentData, ImportAssetData } from "./contract";
import type { RowResult } from "./validate";

type Val = string | number | boolean | null | undefined;
/** Aset dari DB: region = nama wilayah, utilization = teks mentah (utilization_raw). */
export type ExistingAsset = { [K in keyof ImportAssetData]?: Val };
export type ExistingAssessment = { [K in keyof ImportAssessmentData]?: Val };
export type Existing = {
  assets: Map<string, ExistingAsset>; // asset_code → baris
  assessments: Map<string, ExistingAssessment>; // `${asset_code}|${assessed_at}` → baris
};

export type FieldChange = { field: string; before: Val; after: Val };
export type DiffResult = {
  kind: RowResult["kind"];
  row: number;
  asset_code: string;
  diff: "new" | "changed" | "same" | null; // null = baris ditolak (tidak diimpor)
  changes: FieldChange[];
};

const NUMERIC = new Set([
  "land_area_m2",
  "building_area_m2",
  "book_value",
  "s_legal",
  "s_control",
  "s_physical",
  "s_utilization",
  "s_location",
  "s_strategic",
]);

const COLLAPSE = new Set(["name", "type", "region", "utilization"]);

function norm(field: string, v: Val): Val {
  if (v == null || v === "") return null;
  // numeric(…, 2) di DB: bandingkan setelah pembulatan 2 desimal; "1234.50" (string dari PostgREST) = 1234.5.
  if (NUMERIC.has(field)) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : String(v);
  }
  if (typeof v === "string") {
    // Sama dengan yang disimpan import_commit: teks bebas hanya di-trim (baris baru dipertahankan).
    if (!COLLAPSE.has(field)) return v.replace(/\r\n?/g, "\n").trim();
    const s = v.replace(/\s+/g, " ").trim();
    return field === "type" || field === "region" ? s.toLowerCase() : s;
  }
  return v;
}

export function diffRows(results: RowResult[], existing: Existing): DiffResult[] {
  return results.map((r) => {
    const base = { kind: r.kind, row: r.row, asset_code: r.asset_code };
    if (!r.payload) return { ...base, diff: null, changes: [] };
    const data: Record<string, Val> = { ...r.payload.data };
    // Wilayah dibandingkan dengan nama hasil resolve alias (JABAR = JAWA BARAT → tidak berubah).
    if (r.resolved?.region && "region" in data) data.region = r.resolved.region;

    const before: Record<string, Val> | undefined =
      r.payload.kind === "asset"
        ? existing.assets.get(r.asset_code)
        : existing.assessments.get(`${r.asset_code}|${r.payload.data.assessed_at}`);
    if (!before) return { ...base, diff: "new", changes: [] };

    const changes: FieldChange[] = [];
    for (const [field, after] of Object.entries(data)) {
      if (field === "asset_code" || field === "assessed_at") continue;
      // critical_override=false sama dengan default DB (null/false).
      const b = field === "critical_override" ? (before[field] ?? false) : before[field];
      if (norm(field, b) !== norm(field, after)) changes.push({ field, before: b ?? null, after });
    }
    return { ...base, diff: changes.length ? "changed" : "same", changes };
  });
}
