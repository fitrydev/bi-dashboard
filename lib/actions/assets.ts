"use server";

import { requireRole } from "@/lib/auth/require-role";
import { assetInput, type AssetData, type AssetInput } from "@/lib/schemas/asset";
import { createClient } from "@/lib/supabase/server";
import { MSG, toActionError, toFieldErrors, type ActionResult } from "./result";
import { revalidateAsset } from "./shared";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Nama wilayah atau alias (case-insensitive) → region_id. */
async function regionId(supabase: Client, name: string): Promise<string | null> {
  const key = name.trim().toUpperCase();
  const r = await supabase.from("regions").select("id").eq("name", key).maybeSingle();
  if (r.error) throw r.error;
  if (r.data) return r.data.id;
  const a = await supabase
    .from("region_aliases")
    .select("region_id")
    .eq("alias", key)
    .maybeSingle();
  if (a.error) throw a.error;
  return a.data?.region_id ?? null;
}

type RowOrError =
  | { row: Omit<AssetData, "region"> & { region_id: string }; result?: never }
  | { row?: never; result: ActionResult<never> };

async function toRow(supabase: Client, input: AssetInput): Promise<RowOrError> {
  const parsed = assetInput.safeParse(input);
  if (!parsed.success) return { result: toFieldErrors(parsed.error) };
  const { region, ...rest } = parsed.data;
  const region_id = await regionId(supabase, region);
  if (!region_id) {
    return {
      result: {
        ok: false,
        error: MSG.invalid,
        fieldErrors: { region: ["Wilayah tidak dikenal."] },
      },
    };
  }
  return { row: { ...rest, region_id } };
}

export async function createAsset(input: AssetInput): Promise<ActionResult<{ code: string }>> {
  try {
    await requireRole("editor");
    const supabase = await createClient();
    const r = await toRow(supabase, input);
    if (!r.row) return r.result;
    const { data, error } = await supabase
      .from("assets")
      .insert(r.row)
      .select("asset_code")
      .single();
    if (error) return toActionError(error);
    revalidateAsset(data.asset_code);
    return { ok: true, data: { code: data.asset_code } };
  } catch (e) {
    return toActionError(e);
  }
}

/** `code` = kode lama; `input.asset_code` boleh berbeda (ganti kode). */
export async function updateAsset(
  code: string,
  input: AssetInput,
): Promise<ActionResult<{ code: string }>> {
  try {
    await requireRole("editor");
    const supabase = await createClient();
    const r = await toRow(supabase, input);
    if (!r.row) return r.result;
    const { data, error } = await supabase
      .from("assets")
      .update(r.row)
      .eq("asset_code", code)
      .select("asset_code")
      .maybeSingle();
    if (error) return toActionError(error);
    if (!data) return { ok: false, error: MSG.assetNotFound };
    revalidateAsset(code, data.asset_code);
    return { ok: true, data: { code: data.asset_code } };
  } catch (e) {
    return toActionError(e);
  }
}

async function setActive(
  code: string,
  is_active: boolean,
): Promise<ActionResult<{ code: string }>> {
  try {
    await requireRole("editor");
    if (typeof code !== "string" || !code.trim()) return { ok: false, error: MSG.assetNotFound };
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("assets")
      .update({ is_active })
      .eq("asset_code", code)
      .select("asset_code")
      .maybeSingle();
    if (error) return toActionError(error);
    if (!data) return { ok: false, error: MSG.assetNotFound };
    revalidateAsset(code);
    return { ok: true, data: { code } };
  } catch (e) {
    return toActionError(e);
  }
}

export async function softDeleteAsset(code: string): Promise<ActionResult<{ code: string }>> {
  return setActive(code, false);
}

export async function restoreAsset(code: string): Promise<ActionResult<{ code: string }>> {
  return setActive(code, true);
}
