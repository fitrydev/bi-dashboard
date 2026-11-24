"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/require-role";
import type { CommitResult, ImportRow } from "@/lib/import/contract";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { MSG, toActionError, type ActionResult } from "./result";

const cnt = z.number().int().min(0).max(100000);
// Hanya bentuk luar; isi `data` divalidasi ulang oleh import_commit (jangan percaya klien).
const row = z.object({
  kind: z.enum(["asset", "assessment"]),
  row: z.number().int().min(1).max(1000000),
  data: z.looseObject({ asset_code: z.string().min(1).max(100) }),
});
const input = z.object({
  file_name: z.string().max(255),
  rows_total: cnt,
  rows_warn: cnt,
  rows_error: cnt,
  report_summary: z.strictObject({
    rejected: z.number().int().min(0),
    warning: z.number().int().min(0),
    finding: z.number().int().min(0),
    ok: z.number().int().min(0),
  }),
  rows: z.array(row).max(5000),
});
export type CommitImportInput = Omit<z.input<typeof input>, "rows"> & { rows: ImportRow[] };

export async function commitImport(raw: CommitImportInput): Promise<ActionResult<CommitResult>> {
  try {
    await requireRole("editor");
    const p = input.safeParse(raw);
    if (!p.success) return { ok: false, error: MSG.invalid };
    const supabase = await createClient();
    const { rows, report_summary, ...meta } = p.data;
    const batch = await supabase
      .from("import_batches")
      .insert({ ...meta, rows_ok: rows.length, status: "validated", report: { summary: report_summary } })
      .select("id")
      .single();
    if (batch.error) return toActionError(batch.error);
    const { data, error } = await supabase.rpc("import_commit", { batch_id: batch.data.id, rows: rows as unknown as Json });
    if (error) {
      // Kode RPC import_commit; P0002 di sini ≠ "parameter skor" di toActionError.
      const known = { P0002: "Batch impor tidak ditemukan.", "22023": "Batch impor sudah diproses atau format baris tidak valid.", "42501": MSG.forbidden }[error.code];
      return known ? { ok: false, error: known } : toActionError(error);
    }
    for (const p of ["/dashboard", "/aset", "/jadwal"]) revalidatePath(p);
    revalidatePath("/aset/[code]", "page");
    return { ok: true, data: data as unknown as CommitResult };
  } catch (e) {
    return toActionError(e);
  }
}
