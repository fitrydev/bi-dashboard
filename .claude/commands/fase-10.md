---
description: Fase 10 — Deploy: Supabase hosted (Free, Singapore) + Vercel Hobby sin1, env, OAuth Google, admin pertama, checklist keamanan hosted, README runbook. Tanpa fitur baru.
---

# Fase 10 — Deploy

Anda adalah senior engineer (Next.js 16 + Supabase + Vercel) yang memegang rilis. Bahasa: **Bahasa Indonesia**. Package manager: **bun**.

## Konteks wajib dibaca dulu

1. `CLAUDE.md`, `docs/PLAN.md` §3 (stack, §3.1 performa, §3.2 keamanan), §8 baris Fase 10, §9 (keputusan, terutama §9.6 infrastruktur), §10 "Hasil Fase 3" (OAuth, risiko residual) dan "Hasil Fase 9" (checklist hosted, keputusan terbuka).
2. Kontrak (jangan diubah): semua migrasi `supabase/migrations/*` (skema hanya ditambah lewat migrasi baru), `proxy.ts`, `lib/supabase/*` (termasuk `cookie-options.ts`: `Secure` di produksi), `next.config.ts` (CSP/header), `lib/actions/*`, `e2e/*`.

Jangan analisa ulang Fase 0–9. Jangan menambah fitur.

## Keputusan yang WAJIB ditanyakan ke user sebelum mulai (jangan menebak)

- Kredensial Google OAuth (Client ID/secret) dan redirect URI produksi (`https://<project>.supabase.co/auth/v1/callback`).
- Email admin pertama produksi (mengganti `admin@example.com` di seed).
- Nama repo GitHub, nama project Supabase/Vercel, domain (default `*.vercel.app`).
- Data awal produksi: seed dari Excel (136 aset) atau impor manual lewat `/import`.
- Anti-pause Supabase Free: cron Vercel harian vs upgrade Pro (§9.6).
- Keputusan terbuka Fase 7 yang masih belum dijawab (lihat "Hasil Fase 9").

Setiap langkah yang keluar ke layanan eksternal (buat repo/project, push, `supabase db push`, set env, deploy) **dikonfirmasi user lebih dulu**.

## Aturan kerja: sub-agent driven, model dinamis

- **haiku**: checklist mekanis, README runbook, env template.
- **sonnet**: konfigurasi Vercel/Supabase, smoke test produksi.
- **opus**: verifikasi keamanan hosted (Auth settings, RLS, advisor) dan verifikasi akhir.

## Langkah

1. **Supabase hosted** (Free, `ap-southeast-1`): `supabase link`, `supabase db push` (semua migrasi), seed sesuai keputusan. `config.toml` TIDAK ikut ter-push. Atur manual di dashboard:
   - Auth: hanya Google; Email/Phone/Anonymous **mati**; signup email mati; Confirm email + Secure email change **aktif** (lapis kedua selain trigger `auth_users_email_immutable`).
   - Auth Hook "Before User Created" → `public.hook_before_user_created`.
   - Site URL + Redirect URLs = domain Vercel (`/auth/callback`).
   - JWT expiry 3600, refresh token rotation aktif.
   - Jalankan Security Advisor + Performance Advisor hosted, harus 0 error.
2. **Vercel** (Hobby, region fungsi `sin1`): env `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (tidak ada secret di `NEXT_PUBLIC_*`; `SUPABASE_SECRET_KEY` tidak diperlukan app). Pastikan CSP `connect-src` memuat origin Supabase produksi (dibaca dari env saat build).
3. **Smoke test produksi:** login Google allowlist OK, non-allowlist ditolak (403 → `/login?galat=ditolak`), header (CSP, HSTS tanpa `preload`, XFO, nosniff) dan cookie `Secure` terlihat, dashboard 136 aset, ekspor xlsx, Lighthouse mobile `/dashboard` (catat vs §3.1).
4. **Anti-pause** sesuai keputusan (cron Vercel → endpoint ringan, mis. `select 1` via RPC tanpa data).
5. **README runbook:** setup lokal (Colima, `supabase start`, `.env.local` dari `supabase status -o env`), gate, migrasi baru → `db push`, rotasi kunci, tambah admin, rollback deploy (Vercel instant rollback; DB: migrasi maju saja).
6. **Verifikasi (opus):** gate lokal tetap hijau (`db reset`, `test db`, `db lint`, `typecheck`, `lint`, `test`, contrast, `build`, `test:e2e`) + checklist hosted di atas.
7. Update `docs/PLAN.md` §10 (status Fase 10 + "Hasil Fase 10"). Jangan commit/push tanpa diminta user.

## Definisi selesai

- Produksi live, login Google + allowlist bekerja, akun non-allowlist ditolak.
- Checklist Auth hosted + Advisor bersih; header & cookie sesuai §3.2.
- README runbook ada; ringkasan untuk user beserta hal yang perlu tindakan manual.
