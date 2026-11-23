"use server";

import { requireRole } from "@/lib/auth/require-role";
import { monitoringInput, type MonitoringInput } from "@/lib/schemas/monitoring";
import { createClient } from "@/lib/supabase/server";
import { MSG, toActionError, toFieldErrors, type ActionResult } from "./result";
import { assetIdByCode, revalidateAsset } from "./shared";

/** Catat monitoring. Trigger DB menolak tanggal masa depan (22007) dan memperbarui last_monitored_at. */
export async function recordMonitoring(
  input: MonitoringInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole("editor");
    const parsed = monitoringInput.safeParse(input);
    if (!parsed.success) return toFieldErrors(parsed.error);
    const { asset_code, ...v } = parsed.data;
    const supabase = await createClient();
    const asset_id = await assetIdByCode(supabase, asset_code, true);
    if (!asset_id) return { ok: false, error: MSG.assetNotFound };

    const { data, error } = await supabase
      .from("monitoring_events")
      .insert({ asset_id, ...v })
      .select("id")
      .single();
    if (error) return toActionError(error);
    revalidateAsset(asset_code);
    return { ok: true, data };
  } catch (e) {
    return toActionError(e);
  }
}
