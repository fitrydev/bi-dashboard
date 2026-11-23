import "server-only";

import { notFound } from "next/navigation";
import { fromLatestView } from "@/lib/asset-row";
import type { AuditAction } from "@/lib/aset/audit";
import type { Rubric } from "@/components/risk";
import { DEFAULT_PARAMS, type IndicatorKey, type ScoringParams, type WarnKey } from "@/lib/scoring";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type AssessmentRec = Database["public"]["Tables"]["assessments"]["Row"];
export type MonitoringRec = Database["public"]["Tables"]["monitoring_events"]["Row"];
export interface AuditRec {
  id: string;
  table_name: string;
  action: AuditAction;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  at: string;
}

const obj = (j: unknown) => (j && typeof j === "object" && !Array.isArray(j) ? (j as Record<string, unknown>) : null);

export async function loadAssetDetail(code: string) {
  const supabase = await createClient();
  const latest = await supabase.from("v_asset_latest").select("*").eq("asset_code", code).maybeSingle();
  if (latest.error) throw new Error(`Gagal memuat aset: ${latest.error.message}`);
  if (!latest.data) notFound();
  const r = latest.data;

  const [hist, mon, params, crit, issues, role] = await Promise.all([
    supabase.from("assessments").select("*").eq("asset_id", r.id).order("assessed_at", { ascending: false }).order("created_at", { ascending: false }).limit(200),
    supabase.from("monitoring_events").select("*").eq("asset_id", r.id).order("monitored_at", { ascending: false }).limit(200),
    supabase.from("scoring_params").select("version, weights, is_active").order("version"),
    supabase.from("score_criteria").select("params_version, indicator, score, description"),
    supabase.from("v_data_quality_issues").select("issue_code").eq("asset_id", r.id),
    supabase.rpc("current_app_role"),
  ]);
  for (const x of [hist, mon, params, crit, issues])
    if (x.error) throw new Error(`Gagal memuat detail aset: ${x.error.message}`);

  const assessments = hist.data ?? [];
  const ids = assessments.map((a) => a.id);
  const audit = await supabase
    .from("audit_log")
    .select("id, table_name, action, before, after, at")
    .or(`and(table_name.eq.assets,row_id.eq.${r.id})${ids.length ? `,and(table_name.eq.assessments,row_id.in.(${ids.join(",")}))` : ""}`)
    .order("at", { ascending: false })
    .limit(100);
  if (audit.error) throw new Error(`Gagal memuat audit: ${audit.error.message}`);

  // Bobot & rubrik: versi yang dipakai penilaian terakhir, jika tidak ada versi aktif.
  const active = params.data?.find((p) => p.is_active)?.version ?? null;
  const version = r.params_version ?? active;
  const row = params.data?.find((p) => p.version === version);
  const w = obj(row?.weights);
  const scoringParams: ScoringParams = {
    ...DEFAULT_PARAMS,
    ...(row ? { version: row.version } : {}),
    indicators: DEFAULT_PARAMS.indicators.map((i) => ({ ...i, weight: typeof w?.[i.key] === "number" ? (w[i.key] as number) : i.weight })),
  };
  const rubric: Rubric = {};
  for (const c of crit.data ?? []) {
    if (c.params_version !== version) continue;
    const k = c.indicator as IndicatorKey;
    (rubric[k] ??= Array(5).fill("") as string[]);
    (rubric[k] as string[])[c.score - 1] = c.description;
  }

  const warnings = (issues.data ?? []).map((i) => i.issue_code as WarnKey);
  return {
    id: r.id,
    row: fromLatestView(r, warnings),
    active: r.is_active,
    assessments,
    monitoring: mon.data ?? [],
    params: scoringParams,
    rubric,
    isAdmin: role.data === "admin",
    canEdit: role.data === "editor" || role.data === "admin",
    audit: (audit.data ?? []).map((a) => ({
      ...a,
      action: a.action as AuditAction,
      before: obj(a.before),
      after: obj(a.after),
    })) satisfies AuditRec[],
  };
}
