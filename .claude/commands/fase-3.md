---
description: Fase 3 — Auth Google (Supabase), proxy redirect, penegakan allowlist di app, guard role di Server Action. Tanpa halaman fungsional (Fase 4+).
---

# Fase 3 — Auth Google, Proxy, Allowlist, Guard Role

Anda adalah senior full-stack engineer (Next.js 16 + Supabase). Bahasa: **Bahasa Indonesia**. Package manager: **bun**.

## Konteks wajib dibaca dulu

1. `CLAUDE.md`, `docs/PLAN.md` §3.2 (allowlist 3 lapis, role), §8, §9.1, §10 ("Hasil Fase 1" & "Hasil Fase 2").
2. Kode yang menjadi kontrak:
   - `proxy.ts`, `lib/supabase/{client,server,proxy,env}.ts`, `lib/supabase/database.types.ts`, `app/login`, `app/auth/callback` (sudah aman dari open redirect)
   - `supabase/config.toml` (hook `before_user_created` aktif)
   - Migrasi `20261119000400_security.sql`: `is_allowed()`, `has_role()`, `current_app_role()`

Jangan mengulang analisa dan jangan mengubah skema kecuali benar-benar perlu (jika perlu, tambah migrasi baru beserta test pgTAP). Jangan kerjakan Fase 4+.

## Aturan kerja: sub-agent driven, model dinamis

- **opus**: alur auth, penegakan di proxy/server, review keamanan akhir.
- **sonnet**: UI login dan halaman "akses ditolak", helper `requireRole()`, test.
- **haiku**: mekanis (CLI, format, typegen).
- Jalankan agent independen secara paralel dengan brief lengkap. Wajib memakai skill `find-docs` (Supabase SSR + Google OAuth, `getClaims`, Next.js 16 `proxy.ts`) sebelum menulis kode.
- Supabase lokal butuh Docker (Colima). Jika `docker pull` macet, jalankan `colima restart`.

## Langkah

1. **(opus) Google OAuth lokal:**
   - `[auth.external.google]` di `config.toml` membaca env `SUPABASE_AUTH_EXTERNAL_GOOGLE_*`.
   - Matikan email/password, magic link, phone, dan anonymous (`enable_signup` hanya via OAuth).
   - Sesuaikan `site_url` dan redirect untuk port dev (3000/3100).
   - Jika kredensial Google belum ada, **tanyakan ke user**. Tes alur memakai user lokal via admin API/SQL bila perlu.
2. **(opus) Proxy:**
   - User tanpa sesi → redirect ke `/login?next=…` (path internal saja).
   - Rute publik: `/login`, `/auth/callback`, aset statis.
   - User bersesi tapi tidak lagi ada di allowlist (`is_allowed()` = false) → `/akses-ditolak` + signOut. Pertimbangkan biaya per request: cache singkat atau cek di layout server, dan dokumentasikan pilihannya.
3. **(sonnet) Halaman:**
   - `/login`: tombol "Masuk dengan Google", sesuai DESIGN.md.
   - Callback menangani error dari hook (403 non-allowlist) dengan pesan Indonesia yang jelas.
   - `/akses-ditolak`.
   - Menu pengguna dengan nama, email, role, dan tombol keluar.
4. **(sonnet) Guard role:**
   - `lib/auth/require-role.ts`: `requireUser()` dan `requireRole('admin'|'editor'|'viewer')` untuk Server Action dan Route Handler. Ambil role lewat RPC `current_app_role()` dan lempar error ber-tipe.
   - Hirarkinya admin ⊇ editor ⊇ viewer.
   - Unit test dengan mock.
5. **(sonnet) Test:**
   - Playwright: tanpa sesi → redirect ke `/login`; rute publik tetap bisa diakses.
   - Dengan sesi seed (user lokal di allowlist) → dashboard tampil. User dicabut dari allowlist → akses ditolak.
   - Hook menolak email non-allowlist (pgTAP sudah ada; tambahkan cek end-to-end via `auth.admin.createUser` bila memungkinkan).
6. **(opus) Verifikasi independen:**
   - Jalankan `bunx supabase db reset`, `test db`, `bun run typecheck`, `lint`, `test`, `build`, dan `test:e2e`.
   - Review keamanan: open redirect, cookie flags, tidak ada secret di `NEXT_PUBLIC_*`, `getClaims` (bukan `getSession`) di server, CSP tetap valid untuk domain Google/Supabase.
7. Update `docs/PLAN.md` §10 (status Fase 3), lalu buat `.claude/commands/fase-4.md`. **Jangan jalankan Fase 4.** Jangan commit/push tanpa diminta user.

## Definisi selesai

- Login Google berjalan secara lokal (atau tersimulasi bila kredensial belum ada, dengan alasan tercatat). Akun non-allowlist ditolak di hook, user yang dicabut kehilangan akses, dan tanpa sesi diarahkan ke `/login`.
- `requireRole` teruji, dan semua gate hijau.
- Ringkasan untuk user, termasuk keputusan yang perlu persetujuan (kredensial Google, email admin pertama).
