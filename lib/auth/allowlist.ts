import "server-only";

import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Lapis allowlist di app (PLAN §3.2): dipanggil dari app/(app)/layout.tsx.
 * Server Component tidak bisa menulis cookie, jadi signOut didelegasikan ke /auth/keluar.
 * Error RPC dilempar (ke error.tsx), bukan dianggap "dicabut": fail closed tanpa logout massal.
 * ponytail: layout tidak dirender ulang pada soft navigation di dalam grup (app); user yang
 * dicabut tetap tertahan RLS untuk data, dan dikeluarkan pada hard navigation berikutnya.
 */
export async function ensureAllowed() {
  if (!getSupabaseEnv()) return;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_allowed");
  if (error) throw new Error(`Gagal memeriksa allowlist: ${error.message}`);
  if (!data) redirect("/auth/keluar?alasan=dicabut");
}

/** Pembungkus konten (app): render children hanya setelah allowlist lolos. Taruh di dalam <Suspense> (cacheComponents). */
export async function AllowlistGate({ children }: { children: ReactNode }) {
  await ensureAllowed();
  return children;
}
