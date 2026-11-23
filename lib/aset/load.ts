import "server-only";

import { fromLatestView } from "@/lib/asset-row";
import type { AsetListRow } from "@/lib/aset/filters";
import type { WarnKey } from "@/lib/scoring/labels";
import { createClient } from "@/lib/supabase/server";

export async function loadAsetList(): Promise<{ rows: AsetListRow[]; regions: string[] }> {
  const supabase = await createClient();
  const [latest, issues, regions] = await Promise.all([
    supabase.from("v_asset_latest").select("*").eq("is_active", true).order("asset_code").limit(5000),
    supabase.from("v_data_quality_issues").select("asset_id, issue_code").limit(20000),
    supabase.from("regions").select("name").order("name"),
  ]);
  if (latest.error) throw new Error(`Gagal memuat daftar aset: ${latest.error.message}`);
  if (issues.error) throw new Error(`Gagal memuat isu kualitas data: ${issues.error.message}`);
  if (regions.error) throw new Error(`Gagal memuat daftar wilayah: ${regions.error.message}`);
  const warn = new Map<string, WarnKey[]>();
  for (const i of issues.data ?? []) {
    if (!i.asset_id || !i.issue_code) continue;
    warn.set(i.asset_id, [...(warn.get(i.asset_id) ?? []), i.issue_code as WarnKey]);
  }
  return {
    rows: (latest.data ?? []).map((r) => ({
      ...fromLatestView(r, warn.get(r.id) ?? []),
      utilization_key: r.utilization,
      schedule_status: r.schedule_status,
      days: r.days_until_due,
      due_date: r.due_date,
    })),
    regions: (regions.data ?? []).map((r) => r.name),
  };
}
