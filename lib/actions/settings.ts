"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/require-role";
import {
  activateInput,
  emailInput,
  emailOnly,
  regionAliasInput,
  resolveReviewInput,
  updateDraftInput,
  utilizationAliasInput,
  version as versionSchema,
  type UpdateDraftInput,
} from "@/lib/schemas/settings";
import { CHANGES_LIMIT, type AppRole, type Impact, type UtilStatus } from "@/lib/settings/types";
import { createClient } from "@/lib/supabase/server";
import { MSG, toActionError, toFieldErrors, type ActionResult } from "./result";

const NOT_ALLOWED = "Perubahan ditolak: tidak ada baris yang terpengaruh. Muat ulang halaman lalu coba lagi.";

/**
 * Pesan trigger/RPC Fase 8 sudah ramah (Indonesia) untuk 23514/55000/42501/22023/P0002 → teruskan.
 * Selain itu pakai toActionError (petakan umum). AuthError tetap lewat toActionError.
 */
function fail(e: unknown): { ok: false; error: string } {
  const o = typeof e === "object" && e ? (e as { code?: unknown; message?: unknown }) : {};
  const code = String(o.code ?? "");
  const msg = typeof o.message === "string" ? o.message : "";
  if (["23514", "55000", "42501", "22023", "P0002"].includes(code) && msg && /[A-Za-z]/.test(msg) && !/^(new row|permission|new_row)/i.test(msg)) {
    // constraint CHECK mentah ("new row for relation …") bukan pesan ramah → jangan diteruskan.
    return { ok: false, error: msg };
  }
  if (code === "23505") return { ok: false, error: "Data itu sudah ada." };
  if (code === "23503") return { ok: false, error: "Data masih dipakai di tempat lain atau rujukannya tidak ditemukan." };
  return toActionError(e);
}

const rev = (...p: string[]) => p.forEach((x) => revalidatePath(x));
const done = <T>(data: T): ActionResult<T> => ({ ok: true, data });

async function admin() {
  await requireRole("admin");
  return createClient();
}

// ---------- Pengguna ----------
export async function addAllowedEmail(raw: { email: string; role: AppRole }): Promise<ActionResult> {
  try {
    const supabase = await admin();
    const p = emailInput.safeParse(raw);
    if (!p.success) return toFieldErrors(p.error);
    // ponytail: hanya baris allowlist; JANGAN auth.admin.createUser (melewati hook). User dibuat saat login Google.
    const { data, error } = await supabase.from("allowed_emails").insert(p.data).select("email");
    if (error) return error.code === "23505" ? { ok: false, error: "Email itu sudah terdaftar." } : fail(error);
    if (!data?.length) return { ok: false, error: NOT_ALLOWED };
    rev("/pengaturan");
    return done(undefined);
  } catch (e) {
    return fail(e);
  }
}

export async function updateAllowedRole(raw: { email: string; role: AppRole }): Promise<ActionResult> {
  try {
    const supabase = await admin();
    const p = emailInput.safeParse(raw);
    if (!p.success) return toFieldErrors(p.error);
    const { data, error } = await supabase.from("allowed_emails").update({ role: p.data.role }).eq("email", p.data.email).select("email");
    if (error) return fail(error);
    if (!data?.length) return { ok: false, error: NOT_ALLOWED };
    rev("/pengaturan");
    return done(undefined);
  } catch (e) {
    return fail(e);
  }
}

export async function revokeAllowedEmail(raw: { email: string }): Promise<ActionResult> {
  try {
    const supabase = await admin();
    const p = emailOnly.safeParse(raw);
    if (!p.success) return toFieldErrors(p.error);
    const { data, error } = await supabase.from("allowed_emails").delete().eq("email", p.data.email).select("email");
    if (error) return fail(error);
    if (!data?.length) return { ok: false, error: NOT_ALLOWED };
    rev("/pengaturan");
    return done(undefined);
  } catch (e) {
    return fail(e);
  }
}

// ---------- Versi parameter ----------
export async function createParamsDraft(notes?: string): Promise<ActionResult<{ version: number }>> {
  try {
    const supabase = await admin();
    const { data, error } = await supabase.rpc("create_params_draft", { p_notes: notes?.trim().slice(0, 500) || undefined });
    if (error) return fail(error);
    rev("/pengaturan");
    return done({ version: data });
  } catch (e) {
    return fail(e);
  }
}

export async function updateParamsDraft(raw: UpdateDraftInput): Promise<ActionResult> {
  try {
    const supabase = await admin();
    const p = updateDraftInput.safeParse(raw);
    if (!p.success) return toFieldErrors(p.error);
    const { version, params, rubric } = p.data;
    // Satu transaksi di DB: params + rubrik tersimpan semua atau tidak sama sekali.
    const { error } = await supabase.rpc("save_params_draft", {
      p_version: version,
      p_params: params ? { weights: params.weights, thresholds: params.thresholds, intervals: params.intervals } : undefined,
      p_criteria: rubric?.length ? rubric : undefined,
    });
    if (error) return fail(error);
    rev("/pengaturan");
    return done(undefined);
  } catch (e) {
    return fail(e);
  }
}

export async function deleteParamsDraft(raw: { version: number }): Promise<ActionResult> {
  try {
    const supabase = await admin();
    const p = versionSchema.safeParse(raw.version);
    if (!p.success) return { ok: false, error: MSG.invalid };
    const { data, error } = await supabase.from("scoring_params").delete().eq("version", p.data).eq("is_active", false).select("version");
    if (error) return fail(error);
    if (!data?.length) return { ok: false, error: "Draf tidak ditemukan." };
    rev("/pengaturan");
    return done(undefined);
  } catch (e) {
    return fail(e);
  }
}

function toImpact(j: unknown, version: number): Impact {
  const r = j as Record<string, unknown>;
  const all = (r.changes as Impact["changes"]) ?? [];
  // recalculate_with_active_params tidak mengirim matriks/score_changed → turunkan dari daftar perubahan penuh.
  let matrix = r.matrix as Impact["matrix"] | undefined;
  if (!matrix) {
    const m = new Map<string, number>();
    for (const c of all) {
      const k = `${c.old_category ?? "unrated"}|${c.new_category ?? "unrated"}`;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    matrix = [...m].map(([k, count]) => ({ from: k.split("|")[0], to: k.split("|")[1], count }));
  }
  return {
    version,
    assessments_total: Number(r.assessments_total ?? r.assessments_affected ?? 0),
    score_changed: Number(r.score_changed ?? all.filter((c) => c.old_score !== c.new_score).length),
    category_changed: Number(r.category_changed ?? 0),
    matrix,
    changes: all.slice(0, CHANGES_LIMIT),
    changes_total: all.length,
  };
}

export async function previewParamsImpact(raw: { version: number }): Promise<ActionResult<Impact>> {
  try {
    const supabase = await admin();
    const p = versionSchema.safeParse(raw.version);
    if (!p.success) return { ok: false, error: MSG.invalid };
    const { data, error } = await supabase.rpc("preview_params_impact", { p_version: p.data });
    if (error) return fail(error);
    return done(toImpact(data, p.data));
  } catch (e) {
    return fail(e);
  }
}

export async function activateParamsVersion(raw: { version: number; effective_from?: string }): Promise<ActionResult<{ version: number; previous_version: number | null }>> {
  try {
    const supabase = await admin();
    const p = activateInput.safeParse(raw);
    if (!p.success) return toFieldErrors(p.error);
    const { data, error } = await supabase.rpc("activate_params_version", {
      p_version: p.data.version,
      p_effective_from: p.data.effective_from,
    });
    if (error) return fail(error);
    const r = data as { version: number; previous_version: number | null };
    // Aktivasi tidak mengubah skor lama, tapi penilaian baru memakai versi ini → form penilaian ikut berubah.
    rev("/pengaturan", "/dashboard", "/aset");
    return done({ version: r.version, previous_version: r.previous_version });
  } catch (e) {
    return fail(e);
  }
}

// ---------- Hitung ulang ----------
export async function previewRecalc(): Promise<ActionResult<Impact>> {
  try {
    const supabase = await admin();
    const { data, error } = await supabase.rpc("recalculate_with_active_params", { dry_run: true });
    if (error) return fail(error);
    return done(toImpact(data, Number((data as { active_version?: number }).active_version ?? 0)));
  } catch (e) {
    return fail(e);
  }
}

export async function applyRecalc(): Promise<ActionResult<{ updated: number }>> {
  try {
    const supabase = await admin();
    const { data, error } = await supabase.rpc("recalculate_with_active_params", { dry_run: false });
    if (error) return fail(error);
    rev("/pengaturan", "/dashboard", "/aset", "/jadwal");
    revalidatePath("/aset/[code]", "page");
    return done({ updated: Number((data as { updated?: number }).updated ?? 0) });
  } catch (e) {
    return fail(e);
  }
}

// ---------- Alias ----------
export async function upsertRegionAlias(raw: { alias: string; region_id: string }): Promise<ActionResult> {
  try {
    const supabase = await admin();
    const p = regionAliasInput.safeParse(raw);
    if (!p.success) return toFieldErrors(p.error);
    const { data, error } = await supabase.from("region_aliases").upsert(p.data, { onConflict: "alias" }).select("alias");
    if (error) return fail(error);
    if (!data?.length) return { ok: false, error: NOT_ALLOWED };
    rev("/pengaturan");
    return done(undefined);
  } catch (e) {
    return fail(e);
  }
}

export async function deleteRegionAlias(raw: { alias: string }): Promise<ActionResult> {
  try {
    const supabase = await admin();
    const alias = String(raw.alias ?? "").trim().toUpperCase();
    if (!alias) return { ok: false, error: MSG.invalid };
    const { data, error } = await supabase.from("region_aliases").delete().eq("alias", alias).select("alias");
    if (error) return fail(error);
    if (!data?.length) return { ok: false, error: NOT_ALLOWED };
    rev("/pengaturan");
    return done(undefined);
  } catch (e) {
    return fail(e);
  }
}

export async function upsertUtilizationAlias(raw: { raw: string; status: UtilStatus; needs_review: boolean }): Promise<ActionResult> {
  try {
    const supabase = await admin();
    const p = utilizationAliasInput.safeParse(raw);
    if (!p.success) return toFieldErrors(p.error);
    const { data, error } = await supabase.from("utilization_aliases").upsert(p.data, { onConflict: "raw" }).select("raw");
    if (error) return fail(error);
    if (!data?.length) return { ok: false, error: NOT_ALLOWED };
    rev("/pengaturan");
    return done(undefined);
  } catch (e) {
    return fail(e);
  }
}

export async function deleteUtilizationAlias(raw: { raw: string }): Promise<ActionResult> {
  try {
    const supabase = await admin();
    const key = String(raw.raw ?? "").trim().toLowerCase();
    if (!key) return { ok: false, error: MSG.invalid };
    const { data, error } = await supabase.from("utilization_aliases").delete().eq("raw", key).select("raw");
    if (error) return fail(error);
    if (!data?.length) return { ok: false, error: NOT_ALLOWED };
    rev("/pengaturan");
    return done(undefined);
  } catch (e) {
    return fail(e);
  }
}

// ---------- Koreksi massal ----------
export async function resolveUtilizationReview(raw: { asset_ids: string[]; status?: UtilStatus | null }): Promise<ActionResult<{ updated: number }>> {
  try {
    const supabase = await admin();
    const p = resolveReviewInput.safeParse(raw);
    if (!p.success) return toFieldErrors(p.error);
    const { data, error } = await supabase.rpc("resolve_utilization_review", {
      asset_ids: p.data.asset_ids,
      new_status: p.data.status ?? undefined,
    });
    if (error) return fail(error);
    rev("/pengaturan", "/dashboard", "/aset");
    revalidatePath("/aset/[code]", "page");
    return done({ updated: data });
  } catch (e) {
    return fail(e);
  }
}

