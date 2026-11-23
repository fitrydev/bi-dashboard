import type { IndicatorKey, RatedLevel, RiskLevel } from "@/lib/scoring/types";
import type { WarnKey } from "@/lib/scoring/labels";

export interface AssetFlags {
  value_placeholder: boolean;
  area_placeholder: boolean;
  monitored_in_future: boolean;
  right_expired: boolean;
  right_expiring_12m: boolean;
  address_missing: boolean;
}

export interface Asset {
  code: string;
  name: string;
  type: "Tanah" | "Bangunan" | "Gabungan";
  region: string;
  address: string | null;
  land_area_m2: number | null;
  building_area_m2: number | null;
  book_value: number | null;
  legal_status: string | null;
  right_expiry_date: string | null;
  utilization_raw: string | null;
  utilization: string | null;
  utilization_needs_review: boolean;
  last_monitored_at: string | null;
  pic: string | null;
  notes: string | null;
  flags: AssetFlags;
}

export interface Assessment {
  asset_code: string;
  assessed_at: string;
  scores: Record<IndicatorKey, number | null>;
  critical_override: boolean;
  total_score: number;
  category: RatedLevel;
  findings: string | null;
  follow_up: string | null;
  follow_up_pic: string | null;
  target_date: string | null;
}

/** Aset + penilaian terbaru + turunan tampilan (bentuk `Row` prototipe). */
export interface AssetRow extends Asset {
  assessment: Assessment | null;
  score: number | null;
  level: RiskLevel;
  warnings: WarnKey[];
  /** nilai buku untuk agregat; null jika placeholder */
  value: number | null;
}
