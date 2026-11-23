import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];
export type CategoryFilter = Enums["risk_category"] | "unrated";

/** Bentuk `filters` untuk RPC dashboard_summary. */
export interface DashboardFilters {
  region?: string;
  type?: Enums["asset_type"];
  utilization?: Enums["utilization_status"];
  category?: CategoryFilter;
}

const TYPES = ["tanah", "bangunan", "gabungan"] as const;
const CATEGORIES = ["critical", "high", "medium", "low", "unrated"] as const;
const UTILIZATIONS = ["digunakan_sendiri", "disewakan_kerja_sama", "idle_kosong", "digunakan_pihak_lain", "lainnya"] as const;

type Params = Record<string, string | string[] | undefined> | URLSearchParams;
const get = (p: Params, k: string): string | undefined => {
  const v = p instanceof URLSearchParams ? p.get(k) : p[k];
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || undefined;
};
const pick = <T extends string>(list: readonly T[], v?: string): T | undefined =>
  list.find((x) => x === v);

/** Nilai tak dikenal diabaikan. Wilayah bebas (dicocokkan server-side), dibatasi 64 karakter. */
export function parseFilters(p: Params): DashboardFilters {
  const f: DashboardFilters = {};
  const region = get(p, "wilayah");
  if (region && region.length <= 64) f.region = region;
  const type = pick(TYPES, get(p, "jenis"));
  if (type) f.type = type;
  const category = pick(CATEGORIES, get(p, "kategori"));
  if (category) f.category = category;
  const utilization = pick(UTILIZATIONS, get(p, "pemanfaatan"));
  if (utilization) f.utilization = utilization;
  return f;
}

export function serializeFilters(f: DashboardFilters): URLSearchParams {
  const q = new URLSearchParams();
  if (f.region) q.set("wilayah", f.region);
  if (f.type) q.set("jenis", f.type);
  if (f.category) q.set("kategori", f.category);
  if (f.utilization) q.set("pemanfaatan", f.utilization);
  return q;
}
