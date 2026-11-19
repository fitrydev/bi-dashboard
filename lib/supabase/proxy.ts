import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Me-refresh sesi Supabase di setiap request yang lolos matcher proxy.ts.
 * Cookie baru ditulis ke request (untuk Server Component di render yang sama)
 * dan ke response (untuk browser).
 */
export async function updateSession(request: NextRequest) {
  const env = getSupabaseEnv();
  if (!env) {
    // Supabase belum dikonfigurasi (mis. development lokal): lewatkan tanpa sentuhan.
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        // Header no-cache dari @supabase/ssr: response yang menulis cookie sesi
        // tidak boleh di-cache CDN (token bisa bocor ke user lain).
        Object.entries(headers ?? {}).forEach(([key, value]) =>
          supabaseResponse.headers.set(key, value),
        );
      },
    },
  });

  // Jangan taruh kode di antara pembuatan client dan getClaims(): sesi bisa ter-refresh di sini.
  await supabase.auth.getClaims();

  // Fase 3: redirect ke /login untuk user tanpa sesi di route yang dilindungi,
  // dan enforcement allowlist (tabel allowed_emails). Belum di-redirect di Fase 1
  // supaya shell bisa dilihat tanpa Supabase.

  return supabaseResponse;
}
