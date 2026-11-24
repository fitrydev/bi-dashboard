import "server-only";

import { AuthError, requireRole } from "@/lib/auth/require-role";
import { todayJakarta } from "@/lib/schemas/date";

/** Jalankan handler bila login & ada di allowlist (≥ viewer); 401/403 tanpa data bila tidak. */
export async function guarded(
  ext: "xlsx" | "csv",
  type: string,
  body: () => Promise<BodyInit>,
  name = "aset-risiko",
): Promise<Response> {
  try {
    await requireRole("viewer");
    const data = await body();
    return new Response(data, {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename="${name}-${todayJakarta()}.${ext}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof AuthError)
      return new Response(null, { status: e.code === "UNAUTHENTICATED" ? 401 : 403, headers: { "Cache-Control": "no-store" } });
    throw e;
  }
}
export const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
