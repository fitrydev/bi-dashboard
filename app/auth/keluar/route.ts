import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/** Tombol "Keluar" (form POST). Cookie sesi SameSite=Lax tidak ikut di POST lintas situs. */
export async function POST(request: NextRequest) {
  if (getSupabaseEnv()) await (await createClient()).auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL("/login", request.url), 303);
}

/**
 * Hanya untuk akses dicabut (redirect dari layout). Anti CSRF-logout: sign out HANYA bila
 * is_allowed() memang false, jadi tautan GET dari situs lain tidak bisa mengeluarkan user sah.
 */
export async function GET(request: NextRequest) {
  const url = (p: string) => new URL(p, request.url);
  if (!getSupabaseEnv() || request.nextUrl.searchParams.get("alasan") !== "dicabut") {
    return NextResponse.redirect(url("/dashboard"));
  }
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return NextResponse.redirect(url("/akses-ditolak"));
  const { data: allowed, error } = await supabase.rpc("is_allowed");
  if (error || allowed) return NextResponse.redirect(url("/dashboard"));
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(url("/akses-ditolak"));
}
