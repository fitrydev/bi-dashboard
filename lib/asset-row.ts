import type { WarnKey } from "@/lib/scoring/labels";
import type { IndicatorKey, RatedLevel } from "@/lib/scoring/types";
import type { Database } from "@/lib/supabase/database.types";
import type { Asset, AssetRow, Assessment } from "@/lib/types";

export type LatestRow = Database["public"]["Views"]["v_asset_latest"]["Row"];

/** Peringatan dari flag aset (data JSON galeri). */
export const warningsOf = (a: Asset): WarnKey[] =>
  (
    [
      [a.flags.value_placeholder, "nilai-placeholder"],
      [a.flags.area_placeholder, "luas-placeholder"],
      [a.flags.right_expired, "hak-kedaluwarsa"],
      [a.flags.right_expiring_12m, "hak-berakhir"],
      [a.flags.monitored_in_future, "tgl-masa-depan"],
      [a.utilization_needs_review, "perlu-review"],
      [a.flags.address_missing, "alamat-kosong"],
    ] as [boolean, WarnKey][]
  )
    .filter(([on]) => on)
    .map(([, k]) => k);

export const toAssetRow = (a: Asset, as: Assessment | null): AssetRow => ({
  ...a,
  assessment: as,
  score: as?.total_score ?? null,
  level: as ? as.category : "unrated",
  warnings: warningsOf(a),
  value: a.book_value != null && a.book_value > 1 ? a.book_value : null,
});

const TYPE = { tanah: "Tanah", bangunan: "Bangunan", gabungan: "Gabungan" } as const;

export function fromLatestView(r: LatestRow, warnings: WarnKey[]): AssetRow {
  const has = (k: WarnKey) => warnings.includes(k);
  const valuePh = r.value_is_placeholder ?? false;
  const level = r.category ?? "unrated";
  const assessment: Assessment | null =
    r.category && r.assessed_at
      ? {
          asset_code: r.asset_code,
          assessed_at: r.assessed_at,
          scores: {
            legal: r.s_legal,
            control: r.s_control,
            physical: r.s_physical,
            utilization: r.s_utilization,
            location: r.s_location,
            strategic: r.s_strategic,
          } satisfies Record<IndicatorKey, number | null>,
          critical_override: r.critical_override ?? false,
          total_score: r.total_score ?? 0,
          category: r.category as RatedLevel,
          findings: r.findings,
          follow_up: r.follow_up,
          follow_up_pic: r.follow_up_pic,
          target_date: r.target_date,
        }
      : null;
  return {
    code: r.asset_code,
    name: r.name,
    type: TYPE[r.type],
    region: r.region,
    address: r.address,
    land_area_m2: r.land_area_m2,
    building_area_m2: r.building_area_m2,
    book_value: r.book_value,
    legal_status: r.legal_status,
    right_expiry_date: r.right_expiry_date,
    utilization_raw: r.utilization_raw,
    utilization: r.utilization_label,
    utilization_needs_review: r.utilization_needs_review,
    last_monitored_at: r.last_monitored_at,
    pic: r.pic_unit,
    notes: r.notes,
    flags: {
      value_placeholder: valuePh,
      area_placeholder: r.area_is_placeholder ?? false,
      monitored_in_future: has("tgl-masa-depan"),
      right_expired: has("hak-kedaluwarsa"),
      right_expiring_12m: has("hak-berakhir"),
      address_missing: has("alamat-kosong"),
    },
    assessment,
    score: assessment ? assessment.total_score : null,
    level,
    warnings,
    value: valuePh ? null : r.book_value,
  };
}
