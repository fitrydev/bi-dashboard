import "server-only";

import { fromLatestView } from "@/lib/asset-row";
import type { DashboardFilters } from "@/lib/dashboard/filters";
import type { WarnKey } from "@/lib/scoring/labels";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import type { AssetRow } from "@/lib/types";

type Cat = "critical" | "high" | "medium" | "low" | "unrated";

export interface DashboardSummary {
  generated_at: string;
  today: string;
  active_params_version: number | null;
  filters: DashboardFilters;
  totals: {
    assets: number;
    assessed: number;
    unrated: number;
    incomplete_assessments: number;
    book_value: number;
    value_placeholder_count: number;
    value_missing_count: number;
    area_placeholder_count: number;
    land_area_m2: number;
  };
  categories: { key: Cat; count: number; value: number; value_excluded_count: number }[];
  risk_findings: { right_expired: number; right_expiring_12m: number };
  data_quality: Partial<Record<WarnKey, number>>;
  by_region: {
    region: string; count: number; value: number; tanah: number; bangunan: number; gabungan: number;
    tanah_value: number; bangunan_value: number; gabungan_value: number;
    idle_count: number; idle_value: number; assessed: number; value_excluded_count: number;
  }[];
  by_type: {
    type: "tanah" | "bangunan" | "gabungan"; count: number; value: number;
    idle_count: number; idle_value: number; value_excluded_count: number;
  }[];
  utilization: { status: string | null; label: string | null; count: number; value: number; needs_review: number }[];
  right_expiry: {
    id: string; asset_code: string; name: string; right_expiry_date: string;
    category: Exclude<Cat, "unrated"> | null; status: "lewat" | "kurang_12_bulan" | "berlaku";
  }[];
  schedule: {
    counts: { tak_terjadwal: number; belum_ada_tanggal: number; lewat: number; segera: number; terjadwal: number };
    items: {
      id: string; asset_code: string; name: string; category: Exclude<Cat, "unrated"> | null;
      interval_months: number | null; last_monitored_at: string | null; due_date: string | null;
      days_until_due: number | null; status: string;
    }[];
  };
  top_value: {
    id: string; asset_code: string; name: string; type: string; region: string;
    value: number; category: Exclude<Cat, "unrated"> | null; total_score: number | null;
  }[];
  matrix: {
    rows: {
      id: string; asset_code: string; name: string; assessed_at: string; params_version: number; value: number | null;
      total_score: number | null; category: Exclude<Cat, "unrated">; critical_override: boolean;
      scores: Record<"legal" | "control" | "physical" | "utilization" | "location" | "strategic", number | null>;
    }[];
    averages: Record<"legal" | "control" | "physical" | "utilization" | "location" | "strategic" | "total_score", number | null>;
  };
  /** Bobot parameter aktif; null bila belum ada versi aktif. */
  active_weights: Record<"legal" | "control" | "physical" | "utilization" | "location" | "strategic", number> | null;
  /** Jumlah periode (bulan) yang punya penilaian. */
  periods: number;
  /** period = 'YYYY-MM'. */
  trend: { period: string; avg_score: number | null; critical: number; high: number; assessed: number }[];
}

export interface DashboardData {
  summary: DashboardSummary;
  rows: AssetRow[];
  today: string;
}

export async function loadDashboard(filters: DashboardFilters): Promise<DashboardData> {
  const supabase = await createClient();
  let q = supabase.from("v_asset_latest").select("*").eq("is_active", true);
  // Sama dengan RPC: region cocok nama (huruf besar) atau uuid.
  if (filters.region) {
    q = /^[0-9a-f-]{36}$/i.test(filters.region)
      ? q.eq("region_id", filters.region)
      : q.eq("region", filters.region.toUpperCase());
  }
  if (filters.type) q = q.eq("type", filters.type);
  if (filters.utilization) q = q.eq("utilization", filters.utilization);
  if (filters.category) q = filters.category === "unrated" ? q.is("category", null) : q.eq("category", filters.category);

  const [rpc, latest, issues] = await Promise.all([
    supabase.rpc("dashboard_summary", { filters: filters as unknown as Json }),
    q.order("asset_code").limit(5000),
    supabase.from("v_data_quality_issues").select("asset_id, issue_code").limit(20000),
  ]);
  if (rpc.error) throw new Error(`Gagal memuat ringkasan dashboard: ${rpc.error.message}`);
  if (latest.error) throw new Error(`Gagal memuat daftar aset: ${latest.error.message}`);
  if (issues.error) throw new Error(`Gagal memuat isu kualitas data: ${issues.error.message}`);

  const warn = new Map<string, WarnKey[]>();
  for (const i of issues.data ?? []) {
    if (!i.asset_id || !i.issue_code) continue;
    const l = warn.get(i.asset_id) ?? [];
    l.push(i.issue_code as WarnKey);
    warn.set(i.asset_id, l);
  }
  const summary = rpc.data as unknown as DashboardSummary;
  return {
    summary,
    rows: (latest.data ?? []).map((r) => fromLatestView(r, warn.get(r.id) ?? [])),
    today: summary.today,
  };
}

export async function loadFilterOptions(): Promise<{ regions: string[] }> {
  const { data, error } = await (await createClient()).from("regions").select("name").order("name");
  if (error) throw new Error(`Gagal memuat daftar wilayah: ${error.message}`);
  return { regions: (data ?? []).map((r) => r.name) };
}
