import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { BrowserContext } from "@playwright/test";

/**
 * Simulasi login tanpa Google (kredensial belum ada) dan tanpa menyalakan email provider:
 * admin generateLink(magiclink) → verifyOtp(token_hash) lewat client @supabase/ssr,
 * lalu cookie sesi hasilnya dipasang ke browser Playwright.
 * Butuh NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY.
 * Email harus ada di allowed_emails (hook before_user_created; generateLink membuat user bila belum ada).
 */
export async function loginAs(context: BrowserContext, email: string, baseURL: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const admin = createClient(url, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;

  const jar = new Map<string, string>();
  const supabase = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) =>
        list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  const v = await supabase.auth.verifyOtp({
    type: "email", // "email" menutup verification_type signup (user baru) maupun magiclink
    token_hash: data.properties.hashed_token,
  });
  if (v.error) throw v.error;

  await context.addCookies(
    [...jar].map(([name, value]) => ({ name, value, url: baseURL, sameSite: "Lax" as const })),
  );
}
