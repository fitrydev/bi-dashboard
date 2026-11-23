"use server";

import { requireRole } from "@/lib/auth/require-role";
import {
  assessmentDraftInput,
  assessmentInput,
  type AssessmentDraftInput,
  type AssessmentInput,
} from "@/lib/schemas/assessment";
import type { Database, Json, TablesInsert } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { MSG, toActionError, toFieldErrors, type ActionResult } from "./result";
import { assetIdByCode, revalidateAsset } from "./shared";

type Category = Database["public"]["Enums"]["risk_category"];

/** Penilaian baru (append-only). total_score/category dihitung trigger DB, bukan di sini. */
export async function saveAssessment(
  input: AssessmentInput,
): Promise<ActionResult<{ id: string; total_score: number | null; category: Category | null }>> {
  try {
    const { claims } = await requireRole("editor");
    const parsed = assessmentInput.safeParse(input);
    if (!parsed.success) return toFieldErrors(parsed.error);
    const v = parsed.data;
    const supabase = await createClient();
    const asset_id = await assetIdByCode(supabase, v.asset_code, true);
    if (!asset_id) return { ok: false, error: MSG.assetNotFound };

    const { data, error } = await supabase
      .from("assessments")
      .insert({
        asset_id,
        assessed_at: v.assessed_at,
        s_legal: v.scores.legal,
        s_control: v.scores.control,
        s_physical: v.scores.physical,
        s_utilization: v.scores.utilization,
        s_location: v.scores.location,
        s_strategic: v.scores.strategic,
        critical_override: v.critical_override,
        override_reason: v.critical_override ? v.override_reason : null,
        findings: v.findings,
        follow_up: v.follow_up,
        follow_up_pic: v.follow_up_pic,
        target_date: v.target_date,
        // params_version sengaja kosong: trigger assessments_compute mengisi versi aktif.
      } as TablesInsert<"assessments">)
      .select("id, total_score, category")
      .single();
    if (error) return toActionError(error);

    // Draf usang dibuang. Gagal di sini tidak menghilangkan data (penilaian sudah tersimpan).
    const del = await supabase
      .from("assessment_drafts")
      .delete()
      .eq("asset_id", asset_id)
      .eq("user_id", claims.sub);
    if (del.error) console.error("[saveAssessment] hapus draf", del.error);

    revalidateAsset(v.asset_code);
    return { ok: true, data };
  } catch (e) {
    return toActionError(e);
  }
}

/** Autosave draf (upsert per user+aset). Sengaja TANPA revalidate: tidak boleh me-refresh form yang sedang diisi. */
export async function saveAssessmentDraft(
  input: AssessmentDraftInput,
): Promise<ActionResult<{ updated_at: string }>> {
  try {
    const { claims } = await requireRole("editor");
    const parsed = assessmentDraftInput.safeParse(input);
    if (!parsed.success) return toFieldErrors(parsed.error);
    const { asset_code, ...draft } = parsed.data;
    const supabase = await createClient();
    const asset_id = await assetIdByCode(supabase, asset_code, true);
    if (!asset_id) return { ok: false, error: MSG.assetNotFound };

    const { data, error } = await supabase
      .from("assessment_drafts")
      .upsert(
        // user_id juga dipaksa auth.uid() oleh trigger stamp_actor.
        { asset_id, user_id: claims.sub, data: draft as { [k: string]: Json } },
        { onConflict: "asset_id,user_id" },
      )
      .select("updated_at")
      .single();
    if (error) return toActionError(error);
    return { ok: true, data };
  } catch (e) {
    return toActionError(e);
  }
}

export async function discardAssessmentDraft(asset_code: string): Promise<ActionResult> {
  try {
    const { claims } = await requireRole("editor");
    if (typeof asset_code !== "string" || !asset_code.trim())
      return { ok: false, error: MSG.assetNotFound };
    const supabase = await createClient();
    const asset_id = await assetIdByCode(supabase, asset_code);
    if (!asset_id) return { ok: false, error: MSG.assetNotFound };
    const { error } = await supabase
      .from("assessment_drafts")
      .delete()
      .eq("asset_id", asset_id)
      .eq("user_id", claims.sub);
    if (error) return toActionError(error);
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e);
  }
}
