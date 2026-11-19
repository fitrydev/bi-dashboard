---
description: Fase 1 — scaffold Next.js 16 + Tailwind 4 + shadcn/ui (dikustom ke DESIGN.md) + Supabase lokal + tooling (lint, Vitest, Playwright), memindahkan komponen prototipe Fase 0. Tanpa skema DB final (itu Fase 2).
---

# Fase 1 — Scaffold Aplikasi

Anda adalah senior software engineer untuk proyek ini. Bahasa komunikasi dan copy UI: **Bahasa Indonesia**. Package manager & runtime dev: **bun**.

## Konteks wajib dibaca dulu

1. `docs/PLAN.md` — §3 (stack, prinsip performa, keamanan), §7 (struktur proyek), §8 (rencana fase), §9 (keputusan), §10 (status + "Hasil Fase 0").
2. `DESIGN.md` — terutama §2 (token), §10 (blok CSS Tailwind 4 `@theme` + pemetaan shadcn), §12 (keputusan dari kritik prototipe).
3. Prototipe Fase 0: `design/prototype/src` — `lib/format.ts`, `lib/scoring.ts`, `components/risk/*`, `components/charts/*` adalah bahan yang dipindahkan. Halaman prototipe adalah referensi visual, bukan kode final.
4. `source/*.xlsx` read-only. `design/` tetap dipertahankan sebagai arsip desain (jangan dihapus).

Jangan mengulang analisa atau desain. Jangan mengerjakan Fase 2+ (skema DB final, RLS, auth hook, RPC, halaman fungsional).

## Aturan kerja: sub-agent driven, model dinamis

- **haiku** → mekanis: scaffold CLI, install dependensi, konfigurasi lint/format, cek versi.
- **sonnet** → sedang: memindahkan komponen prototipe ke Next.js, kustom shadcn ke token, shell layout, test unit.
- **opus** → verifikasi akhir (struktur, keamanan konfigurasi, header, tidak ada secret bocor).
- Jalankan agent independen paralel; brief lengkap (agent tidak punya konteks sesi). Jangan kerjakan ulang yang sudah didelegasikan.
- Sebelum memakai API library, cek versi terkini dan dokumentasinya (skill `find-docs`, `tailwind-4-docs`, `shadcn`, `nextjs-app-router-patterns`, `supabase-postgres-best-practices`). Pin versi persis yang ≥ 2 minggu umurnya.

## Langkah

1. **(haiku)** Inisialisasi di root repo: `git init` (branch `main`), `.gitignore` (node_modules, .next, .env*, supabase/.temp, design/prototype/node_modules, design/prototype/dist). Scaffold Next.js 16 (App Router, TypeScript strict, Tailwind 4, ESLint, `src/` TIDAK dipakai — ikuti struktur PLAN §7 di root) memakai `bunx create-next-app@<versi>` dengan bun. Tambahkan `"packageManager"` bun di package.json.
2. **(haiku)** Dependensi sesuai PLAN §3: `@supabase/supabase-js`, `@supabase/ssr`, `recharts@3`, `@tanstack/react-table`, `@tanstack/react-virtual`, `@tanstack/react-query`, `react-hook-form`, `zod@4`, `@hookform/resolvers`, `lucide-react`, `clsx`, `tailwind-merge`. Dev: `vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `jsdom`, `@playwright/test`, `prettier`, `prettier-plugin-tailwindcss`, `supabase` (CLI). **SheetJS** dari `https://cdn.sheetjs.com/` (tarball berversi), BUKAN npm `xlsx`.
3. **(sonnet)** Design system:
   - `app/globals.css` = blok CSS DESIGN.md §10 apa adanya (`:root`, `.dark`, `@theme inline`), hex tidak diubah.
   - Font via `next/font/google`: Fraunces (judul), IBM Plex Sans (UI), IBM Plex Mono (ID); atasi nama variabel sesuai catatan DESIGN.md §10.
   - `bunx shadcn@latest init` lalu kustom `components.json` + variabel ke token (aksen = tinta, `--accent` shadcn → `--surface-sunken`, radius 0–4px). Tambah komponen dasar: button, input, label, select, checkbox, radio-group, dialog, sheet, popover, tooltip, table, tabs, toast/sonner, skeleton, separator, dropdown-menu.
   - Pindahkan dari prototipe ke `lib/format/`, `lib/scoring/`, `components/risk/`, `components/charts/` — ganti primitif buatan tangan dengan shadcn/Radix. `lib/scoring` tetap mirror TS (sumber kebenaran tetap Postgres di Fase 2).
   - Theme toggle terang/gelap/sistem (`next-themes` atau implementasi kecil tanpa flash, class `.dark`).
4. **(sonnet)** Shell & rute kosong sesuai PLAN §7: `app/(auth)/login`, `app/auth/callback/route.ts` (stub), `app/(app)/layout.tsx` (sidebar ≥1024px ↔ bottom-nav mobile, skip link, `lang="id"`), halaman placeholder `dashboard`, `aset`, `aset/[id]`, `aset/[id]/nilai`, `jadwal`, `import`, `pengaturan`, `panduan` dengan empty state yang jujur (bukan lorem). `proxy.ts` (Next 16, pengganti middleware) dengan pola `@supabase/ssr` resmi — boleh belum menegakkan allowlist (Fase 3).
5. **(haiku)** Supabase lokal: `bunx supabase init` → `supabase/config.toml` (auth: hanya Google, signup email/phone/anonymous dimatikan); `supabase/migrations/` kosong + README singkat; `.env.example` berisi `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (server-only), tanpa nilai asli. `lib/supabase/{server,client,proxy}.ts`. Jangan membuat project cloud.
6. **(haiku)** Tooling & kualitas:
   - `next.config.ts`: header keamanan (CSP dasar, HSTS, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy), `poweredByHeader: false`.
   - Skrip: `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (vitest), `test:e2e` (playwright), `format`.
   - Vitest: pindahkan/tulis test `lib/format` (Rp22,0 M, Rp850 jt, "12 Mei 2027", placeholder) dan `lib/scoring` (parity: skor (1,2,4,3,3,2) = 47,0 Medium; override → Critical; skor tidak lengkap → belum lengkap; ambang 40/60/80).
   - Playwright: 1 smoke test (halaman login render, tidak ada horizontal scroll di 375px).
7. **(opus)** Verifikasi independen: `bun run lint`, `typecheck`, `test`, `build` hijau; review struktur vs PLAN §7, tidak ada secret/`NEXT_PUBLIC_*` sensitif, header keamanan, pola `@supabase/ssr` + `proxy.ts` benar untuk Next 16, `xlsx` npm tidak terpasang, token DESIGN.md tidak diubah. Lalu screenshot shell desktop 1440 & mobile 375 (terang/gelap).
8. Update `docs/PLAN.md` §10 (status Fase 1) dan buat `.claude/commands/fase-2.md` (skema DB, RLS, auth hook allowlist, fungsi skor, view, RPC, seed dari `design/data/assets.json`/Excel — PLAN §4, §8). **Jangan jalankan Fase 2.** Jangan commit/push tanpa diminta user.

## Definisi selesai

- `bun run build`, `lint`, `typecheck`, `test` hijau; smoke e2e lolos.
- Shell responsif dengan token DESIGN.md, terang/gelap, tanpa horizontal scroll.
- Komponen risk/chart/format/scoring dari prototipe sudah di proyek dengan test.
- Ringkasan untuk user: versi terpasang, struktur, cara menjalankan, keputusan yang perlu persetujuan, cara memulai Fase 2.

Berhenti dan tanyakan ke user hanya jika keputusan benar-benar milik user (mis. nama domain, akun GitHub/Vercel/Supabase, nama aplikasi final).
