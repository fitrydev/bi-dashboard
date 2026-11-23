import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Hanya path relatif internal. Tolak "//", backslash, dan karakter kontrol
 * (tab/newline dibuang parser URL sehingga "/\t/evil" bisa jadi "//evil"),
 * lalu pastikan hasil resolve tetap di origin yang sama.
 */
function safeNext(raw: string | null, origin: string): string {
  const fallback = "/dashboard";
  if (!raw || !raw.startsWith("/") || /[\\\u0000-\u001f\u007f]/.test(raw)) return fallback;
  if (raw.startsWith("//")) return fallback;
  const url = new URL(raw, origin);
  if (url.origin !== origin || url.pathname.startsWith("//")) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  if (!getSupabaseEnv()) return NextResponse.redirect(`${origin}/login`);

  // Hook before_user_created menolak (403) -> Supabase redirect ke sini dengan ?error=...&error_code=...
  // ponytail: format error_code/description tidak dijamin stabil; dicocokkan longgar (kode hook, 403, atau pesan hook kita).
  if (searchParams.has("error") || searchParams.has("error_code")) {
    const info = `${searchParams.get("error_code") ?? ""} ${searchParams.get("error_description") ?? ""}`;
    const denied = /hook|403|tidak terdaftar|not.?allowed/i.test(info);
    return NextResponse.redirect(`${origin}/login?galat=${denied ? "ditolak" : "auth"}`);
  }

  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"), origin);
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?galat=auth`);
}
