import "server-only";

import { revalidatePath } from "next/cache";

import { asetDetail } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/** asset_code → id. `null` bila tidak ada / tidak terlihat (RLS). Error DB dilempar. */
export async function assetIdByCode(supabase: Client, code: string, activeOnly = false): Promise<string | null> {
  let q = supabase.from("assets").select("id").eq("asset_code", code);
  if (activeOnly) q = q.eq("is_active", true); // aset nonaktif tidak boleh dinilai/dimonitor
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

/**
 * Halaman bergantung pada data aset/penilaian/monitoring: dashboard (agregat), daftar aset,
 * detail aset, jadwal (due date). Belum ada `use cache`/tag di proyek, jadi revalidatePath
 * (di Server Action: segarkan router cache klien + rute) adalah pilihan tepat; updateTag hanya
 * berguna untuk data bertag `use cache`.
 */
export function revalidateAsset(...codes: string[]) {
  revalidatePath("/dashboard");
  revalidatePath("/aset");
  revalidatePath("/jadwal");
  for (const c of new Set(codes)) revalidatePath(asetDetail(c));
}
