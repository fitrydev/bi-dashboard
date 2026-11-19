/**
 * Membaca konfigurasi Supabase publik. Hanya variabel NEXT_PUBLIC_* yang boleh
 * dipakai di sini, karena nilainya ikut masuk ke bundle browser.
 *
 * Mengembalikan null jika belum diset, supaya aplikasi tetap bisa jalan
 * saat development tanpa Supabase.
 */
export function getSupabaseEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return null;

  return { url, key };
}
