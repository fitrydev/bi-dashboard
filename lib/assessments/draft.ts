import "server-only";

import type { AssessmentDraftData } from "@/lib/schemas/assessment";
import { createClient } from "@/lib/supabase/server";

/** Draf milik user saat ini untuk aset ini (RLS: hanya pemilik editor+). `null` bila tidak ada/tidak berhak. */
export async function getAssessmentDraft(
  asset_code: string,
): Promise<{ data: Partial<AssessmentDraftData>; updated_at: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessment_drafts")
    .select("data, updated_at, assets!inner(asset_code)")
    .eq("assets.asset_code", asset_code)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { data: data.data as Partial<AssessmentDraftData>, updated_at: data.updated_at };
}
