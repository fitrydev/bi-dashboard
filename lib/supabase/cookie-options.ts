import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Cookie sesi: `Secure` di produksi (HTTPS Vercel; Chromium juga menerima Secure di
 * http://localhost untuk e2e `next start`). HttpOnly tidak bisa: client browser
 * Supabase membaca cookie sesi lewat document.cookie (dimitigasi CSP).
 */
export const cookieOptions: CookieOptionsWithName = {
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};
