import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/database.types";
import { cookieOptions } from "@/lib/supabase/cookie-options";

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

  const supabase = createServerClient<Database>(env.url, env.key, {
    cookieOptions,
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
  const { data } = await supabase.auth.getClaims();
  const hasSession = !!data?.claims;
  const { pathname, search } = request.nextUrl;

  // Allowlist TIDAK dicek di sini (biaya RPC per request, termasuk prefetch):
  // ditegakkan oleh RLS + app/(app)/layout.tsx (lib/auth/allowlist.ts).
  if (hasSession && pathname === "/login")
    return redirectWithCookies(request, "/dashboard", supabaseResponse);
  if (!hasSession && !isPublic(pathname)) {
    return redirectWithCookies(
      request,
      `/login?next=${encodeURIComponent(pathname + search)}`,
      supabaseResponse,
    );
  }

  return supabaseResponse;
}

function isPublic(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/akses-ditolak" ||
    pathname === "/auth/callback" ||
    pathname === "/auth/keluar"
  );
}

/** Redirect yang tetap membawa cookie sesi + header no-cache dari supabaseResponse. */
function redirectWithCookies(request: NextRequest, to: string, from: NextResponse) {
  const res = NextResponse.redirect(new URL(to, request.url));
  from.cookies.getAll().forEach((c) => res.cookies.set(c));
  for (const h of ["cache-control", "expires", "pragma"]) {
    const v = from.headers.get(h);
    if (v) res.headers.set(h, v);
  }
  return res;
}
