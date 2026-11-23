---
description: Fase 4 — Design system: token, komponen risk, chart primitives, dengan review visual light/dark. Tanpa halaman data fungsional (Fase 5+).
---

# Fase 4 — Design System: Token, Komponen Risk, Chart Primitives

Anda adalah senior frontend engineer (Next.js 16 + Tailwind 4 + shadcn/ui + Recharts 3). Bahasa: **Bahasa Indonesia**. Package manager: **bun**.

## Konteks wajib dibaca dulu

1. `CLAUDE.md`, `DESIGN.md`, `docs/PLAN.md` §6 (UX), §8, §9, §10 ("Hasil Fase 0", "Hasil Fase 1", "Hasil Fase 3").
2. Kode yang menjadi kontrak:
   - `app/globals.css` (token DESIGN.md §10), `components/ui`, `components/risk`, `components/charts`, `components/ledger`, `components/shell`
   - `lib/format.ts`, `lib/scoring` (mirror TS, `DEFAULT_PARAMS` v1), `design/prototype/` dan `design/data/assets.json` sebagai referensi visual dan data
   - Kontrak Fase 3 (jangan dirusak):
     - `lib/auth/require-role.ts`: `requireUser`/`requireRole` (admin ⊇ editor ⊇ viewer, `AuthError` `UNAUTHENTICATED`/`FORBIDDEN`) untuk Server Action dan Route Handler.
     - `AllowlistGate` di `app/(app)/layout.tsx` dan `lib/auth/allowlist.ts`: semua rute di `(app)` sudah dijaga, jangan menduplikasi cek allowlist di komponen.
     - e2e dengan sesi memakai `loginAs` dari `e2e/session.ts` (workers 1; satu token magiclink per user).
     - `auth.admin.createUser` melewati hook `before_user_created`. Kode server yang membuat user wajib cek allowlist sendiri.

Jangan mengulang analisa dan jangan mengubah skema DB atau alur auth. Jangan kerjakan Fase 5+.

## Aturan kerja: sub-agent driven, model dinamis

- **opus**: review visual independen (kritik desain, kontras, a11y) dan verifikasi akhir.
- **sonnet**: token, komponen risk, chart primitives, halaman galeri, test.
- **haiku**: mekanis (format, rename, screenshot, typegen).
- Jalankan agent independen secara paralel dengan brief lengkap. Wajib memakai skill `impeccable` dan `dataviz` (juga `find-docs` untuk shadcn/Recharts 3/Tailwind 4) sebelum menulis kode.
- Skala skor: 1 = sangat rendah, 5 = sangat tinggi. "Belum dinilai" tidak boleh tampil seperti Low. Format angka id-ID. Copy UI Bahasa Indonesia.
- Supabase lokal butuh Docker (Colima). Jika `docker pull` macet, jalankan `colima restart`.

## Langkah

1. **(sonnet) Audit token:**
   - Cocokkan `app/globals.css` dengan DESIGN.md (light/dark, palet risiko, `--heat-fg-*`). Tutup celah (state hover/focus/disabled, skala spacing, tipografi angka tabular).
   - Palet kategori tetap lolos validator `dataviz` (exit 0 kedua mode) dan kontras AA.
2. **(sonnet) Komponen risk:**
   - Lengkapi `components/risk/*`: badge kategori (Low/Medium/High/Belum dinilai), skor, meter 6 indikator dengan rubrik, status jadwal, peringatan kualitas data.
   - Semua berbasis props, tanpa fetch. Status tidak hanya bergantung warna (ikon/teks).
3. **(sonnet) Chart primitives:**
   - `components/charts/*` berbasis Recharts 3: bar, donut/stacked, heatmap, sparkline, tooltip, legenda, skeleton, empty state.
   - Fokus keyboard + alternatif tabel/daftar, `prefers-reduced-motion`, warna dari token.
4. **(sonnet) Galeri komponen:**
   - Halaman galeri internal (mis. `/design`, di luar navigasi) dengan data `design/data/assets.json`, tampil light/dark, 1440 dan 375.
   - Tetap di bawah `AllowlistGate`. Atau tandai dev-only dan dikecualikan dari build produksi, dan dokumentasikan pilihannya.
5. **(sonnet) Test:**
   - Vitest untuk logika komponen (kategori, format, edge "belum dinilai").
   - Playwright: galeri tanpa horizontal scroll, tanpa error konsol, light/dark, desktop + mobile (pakai `loginAs`).
6. **(opus) Review visual independen:**
   - Tangkap screenshot ke `docs/screenshots/fase-4/`. Kritik dengan skill `impeccable` (anti AI-slop, arah "Buku Besar Risiko"), a11y, kontras.
   - Perbaiki temuan P0/P1.
7. **(opus) Verifikasi:**
   - Jalankan `bunx supabase db reset`, `test db`, `bun run typecheck`, `lint`, `test`, `build`, dan `test:e2e`.
8. Update `docs/PLAN.md` §10 (status Fase 4), lalu buat `.claude/commands/fase-5.md`. **Jangan jalankan Fase 5.** Jangan commit/push tanpa diminta user.

## Definisi selesai

- Token, komponen risk, dan chart primitives lengkap, konsisten light/dark, lolos validator palet dan kontras AA.
- Review visual disetujui (tanpa temuan P0/P1 terbuka), dan semua gate hijau.
- Kontrak Fase 3 (guard role, AllowlistGate, e2e `loginAs`) tidak berubah.
- Ringkasan untuk user, termasuk keputusan visual yang perlu persetujuan.
