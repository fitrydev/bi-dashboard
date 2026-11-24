import "server-only";

import type { ExistingAssessment, ExistingAsset } from "./diff";
import type { ValidateCtx } from "./validate";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/paginate";
import { todayJakarta } from "@/lib/schemas/date";

/** Konteks validasi + data existing untuk diff. Map dikirim ke klien sebagai array entri (lihat ImportData). */
export type ImportData = {
  ctx: ValidateCtx;
  assets: [string, ExistingAsset][];
  assessments: [string, ExistingAssessment][];
  inactive: string[]; // kode aset nonaktif (klien membangun ctx.inactiveAssetCodes)
};

const all = <T,>(f: Parameters<typeof fetchAll<T>>[0]) => fetchAll(f, "data impor");

export async function loadImportData(): Promise<ImportData> {
  const sb = await createClient();
  const [regions, aliases, utils, assets, assessments] = await Promise.all([
    sb.from("regions").select("name").order("name"),
    sb.from("region_aliases").select("alias, regions(name)"),
    sb.from("utilization_aliases").select("raw, status, needs_review"),
    all((f, t) =>
      sb
        .from("assets")
        .select(
          "asset_code, name, type, address, land_area_m2, building_area_m2, book_value, legal_status, right_expiry_date, utilization_raw, pic_unit, notes, last_monitored_at, is_active, regions(name)",
        )
        .order("asset_code")
        .range(f, t),
    ),
    all((f, t) =>
      sb
        .from("assessments")
        .select(
          "assessed_at, s_legal, s_control, s_physical, s_utilization, s_location, s_strategic, critical_override, override_reason, findings, follow_up, follow_up_pic, target_date, assets(asset_code)",
        )
        .order("assessed_at")
        .order("created_at")
        .order("id")
        .range(f, t),
    ),
  ]);
  for (const r of [regions, aliases, utils]) if (r.error) throw new Error(`Gagal memuat data impor: ${r.error.message}`);

  const assetMap: [string, ExistingAsset][] = assets.map(({ regions: rg, utilization_raw, ...a }) => [
    a.asset_code,
    { ...a, region: rg?.name, utilization: utilization_raw },
  ]);
  const asMap = new Map<string, ExistingAssessment>(); // ponytail: bila ada >1 penilaian/hari, yang terbaru menang
  for (const { assets: ar, ...s } of assessments) {
    if (ar?.asset_code) asMap.set(`${ar.asset_code}|${s.assessed_at}`, s);
  }
  return {
    ctx: {
      regions: (regions.data ?? []).map((r) => r.name),
      regionAliases: Object.fromEntries((aliases.data ?? []).flatMap((a) => (a.regions ? [[a.alias, a.regions.name]] : []))),
      utilizationAliases: Object.fromEntries((utils.data ?? []).map((u) => [u.raw, { status: u.status, needs_review: u.needs_review }])),
      today: todayJakarta(),
      existingAssetCodes: undefined, // Set tidak bisa diserialisasi; klien membangunnya dari `assets`
    },
    assets: assetMap,
    assessments: [...asMap],
    inactive: assets.filter((a) => !a.is_active).map((a) => a.asset_code),
  };
}
