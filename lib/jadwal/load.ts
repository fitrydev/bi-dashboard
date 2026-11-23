import "server-only";

import type { JadwalItem } from "@/lib/jadwal/schedule";
import { createClient } from "@/lib/supabase/server";

export async function loadJadwal(): Promise<JadwalItem[]> {
  const { data, error } = await (await createClient())
    .from("v_asset_latest")
    .select("asset_code,name,pic_unit,category,schedule_status,due_date,days_until_due")
    .eq("is_active", true)
    .order("asset_code")
    .limit(5000);
  if (error) throw new Error(`Gagal memuat jadwal: ${error.message}`);
  return (data ?? []).map((r) => ({
    code: r.asset_code,
    name: r.name,
    pic: r.pic_unit,
    category: r.category as JadwalItem["category"],
    status: r.schedule_status as JadwalItem["status"],
    dueDate: r.due_date,
    days: r.days_until_due,
  }));
}
