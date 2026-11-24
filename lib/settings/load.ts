import "server-only";

import type { Json } from "@/lib/supabase/database.types";
import { fetchAll } from "@/lib/supabase/paginate";
import { createClient } from "@/lib/supabase/server";
import type { CriteriaRow, ParamsVersion, Region, RegionAlias, ReviewAsset, UserRow, UtilAlias } from "./types";

export const TABS = ["pengguna", "parameter", "rubrik", "alias", "review"] as const;
export type Tab = (typeof TABS)[number];
export const TAB_LABEL: Record<Tab, string> = {
  pengguna: "Pengguna",
  parameter: "Parameter skor",
  rubrik: "Rubrik",
  alias: "Alias",
  review: "Perlu review",
};

const obj = (j: Json) => (j && typeof j === "object" && !Array.isArray(j) ? (j as Record<string, number>) : {});

export async function loadUsers(): Promise<UserRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("allowed_emails").select("email, role, created_at").order("created_at").order("email");
  if (error) throw new Error(`Gagal memuat pengguna: ${error.message}`);
  return data;
}

export async function loadVersions(): Promise<ParamsVersion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("scoring_params").select("*").order("version", { ascending: false });
  if (error) throw new Error(`Gagal memuat versi parameter: ${error.message}`);
  const locked = await Promise.all(data.map((v) => supabase.rpc("scoring_params_is_locked", { p_version: v.version })));
  return data.map((v, i) => ({
    version: v.version,
    is_active: v.is_active,
    locked: v.is_active || locked[i].data === true,
    notes: v.notes,
    effective_from: v.effective_from,
    activated_at: v.activated_at,
    created_at: v.created_at,
    weights: obj(v.weights),
    thresholds: obj(v.thresholds) as ParamsVersion["thresholds"],
    intervals: obj(v.intervals) as ParamsVersion["intervals"],
  }));
}

export async function loadCriteria(version: number): Promise<CriteriaRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("score_criteria")
    .select("params_version, indicator, score, description, revised_from_excel")
    .eq("params_version", version);
  if (error) throw new Error(`Gagal memuat rubrik: ${error.message}`);
  return data;
}

export async function loadAliases(): Promise<{ regions: Region[]; regionAliases: RegionAlias[]; utilAliases: UtilAlias[] }> {
  const supabase = await createClient();
  const [r, ra, ua] = await Promise.all([
    supabase.from("regions").select("id, name").order("name"),
    supabase.from("region_aliases").select("alias, region_id").order("alias"),
    supabase.from("utilization_aliases").select("raw, status, needs_review").order("raw"),
  ]);
  const err = r.error ?? ra.error ?? ua.error;
  if (err) throw new Error(`Gagal memuat alias: ${err.message}`);
  return { regions: r.data!, regionAliases: ra.data!, utilAliases: ua.data! };
}

export async function loadReview(): Promise<{ assets: ReviewAsset[]; regions: string[] }> {
  const supabase = await createClient();
  const rows = await fetchAll(
    (f, t) =>
      supabase
        .from("v_asset_latest")
        .select("id, asset_code, name, region, utilization_raw, utilization")
        .eq("is_active", true)
        .eq("utilization_needs_review", true)
        .order("asset_code")
        .range(f, t),
    "aset perlu review",
  );
  const assets = rows as ReviewAsset[];
  return { assets, regions: [...new Set(assets.map((a) => a.region))].sort() };
}
