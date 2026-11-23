import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export class AuthError extends Error {
  constructor(public readonly code: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(code);
    this.name = "AuthError";
  }
}

const RANK: Record<AppRole, number> = { viewer: 1, editor: 2, admin: 3 };

export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) throw new AuthError("UNAUTHENTICATED");
  return data.claims;
}

/** Hirarki admin ⊇ editor ⊇ viewer. Error RPC diperlakukan sebagai FORBIDDEN (fail closed). */
export async function requireRole(role: AppRole) {
  const claims = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("current_app_role");
  // `!(>=)` bukan `<`: role tak dikenal (RANK undefined) harus ditolak, bukan lolos.
  if (error || !data || !(RANK[data] >= RANK[role])) throw new AuthError("FORBIDDEN");
  return { claims, role: data };
}
