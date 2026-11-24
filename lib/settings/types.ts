import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];
export type AppRole = Enums["app_role"];
export type UtilStatus = Enums["utilization_status"];

export type ImpactChange = {
  assessment_id: string;
  asset_id: string;
  asset_code: string;
  name: string;
  old_version: number;
  old_score: number | null;
  old_category: string | null;
  new_score: number | null;
  new_category: string | null;
};

/** Hasil preview_params_impact / recalculate_with_active_params(dry_run) yang sudah dipangkas untuk klien. */
export type Impact = {
  version: number;
  assessments_total: number;
  score_changed: number;
  category_changed: number;
  matrix: { from: string; to: string; count: number }[];
  changes: ImpactChange[]; // maks CHANGES_LIMIT
  changes_total: number;
};
export const CHANGES_LIMIT = 200;

export type ParamsVersion = {
  version: number;
  is_active: boolean;
  locked: boolean;
  notes: string | null;
  effective_from: string;
  activated_at: string | null;
  created_at: string;
  weights: Record<string, number>; // fraksi
  thresholds: { critical: number; high: number; medium: number };
  intervals: { critical: number; high: number; medium: number; low: number };
};

export type CriteriaRow = { params_version: number; indicator: string; score: number; description: string; revised_from_excel: boolean };
export type UserRow = { email: string; role: AppRole; created_at: string };
export type Region = { id: string; name: string };
export type RegionAlias = { alias: string; region_id: string };
export type UtilAlias = { raw: string; status: UtilStatus; needs_review: boolean };
export type ReviewAsset = {
  id: string;
  asset_code: string;
  name: string;
  region: string;
  utilization_raw: string | null;
  utilization: UtilStatus | null;
};
