---
description: Fase 5 — Dashboard storytelling (§6.1) + RPC dashboard_summary, angka cocok Excel (D8 diperbaiki). Tanpa CRUD aset/penilaian (Fase 6).
---

# Fase 5 — Dashboard + RPC Summary

Anda adalah senior full-stack engineer (Next.js 16 + Supabase + Recharts 3). Bahasa: **Bahasa Indonesia**. Package manager: **bun**.

## Konteks wajib dibaca dulu

1. `CLAUDE.md`, `DESIGN.md`, `docs/PLAN.md` §2.3–§2.4 (profil data & bug D1–D8), §6.1 (storytelling A–H, adaptif coverage), §6.3, §8, §9, §10 ("Hasil Fase 2", "Hasil Fase 3", "Hasil Fase 4").
2. Kode yang menjadi kontrak (jangan dirusak):
   - DB: `dashboard_summary(filters)`, `v_asset_latest`, `v_data_quality_issues` (kode = `WarnKey`), `compute_score`/`category_for`. Skema hanya boleh **ditambah** lewat migrasi baru jika RPC kurang. Paritas DB ↔ TS wajib tetap hijau.
   - Auth: `AllowlistGate` di `app/(app)/layout.tsx`, `requireUser`/`requireRole` di `lib/auth/require-role.ts`, e2e `loginAs` dari `e2e/session.ts` (workers 1).
   - Design system Fase 4: `components/risk/index.ts`, `components/charts/index.ts` (primitive + chart dashboard prototipe), `components/ledger/*`, galeri `/design`, `scripts/check-contrast.ts`.
   - Referensi visual: `design/prototype/` (halaman dashboard) dan `design/data/assets.json` (angka acuan).

Jangan analisa ulang Excel atau Fase 0–4. Jangan kerjakan Fase 6+.

## Aturan kerja: sub-agent driven, model dinamis

- **opus**: RPC/SQL dan layout storytelling, review visual, dan verifikasi akhir.
- **sonnet**: chart per section, data loader, dan test.
- **haiku**: mekanis (typegen, format, screenshot).
- Jalankan agent independen secara paralel dengan brief lengkap. Pakai skill `dataviz`, `impeccable`, dan `supabase-postgres-best-practices` (untuk SQL), plus `find-docs` (Next 16 cacheComponents, Recharts 3).
- Skala skor 1 = sangat rendah, 5 = sangat tinggi. "Belum dinilai" tidak pernah tampil seperti Low. Placeholder dikecualikan dari agregat nilai. Format angka id-ID.
- Supabase lokal butuh Docker (Colima). Bila `docker pull` macet, jalankan `colima restart`.

## Langkah

1. **(opus) RPC:** audit `dashboard_summary` terhadap kebutuhan section A–H. Lengkapi lewat migrasi baru bila perlu, tetap `security invoker`/RLS. Tambah pgTAP: angka cocok dengan §2.3 (136 aset, Rp143,86 M non-placeholder, 13 idle Rp42,4 M, 3 hak lewat + 1 < 12 bln, skor 251116 = 47,0 Medium, D8 diperbaiki).
2. **(sonnet) Data loader:** server-only, memakai klien Supabase server dan tipe dari `database.types.ts`. Pindahkan builder `AssetRow` dari galeri ke `lib/`. Filter (wilayah/jenis/kategori) disimpan di URL.
3. **(opus layout + sonnet chart) Halaman `/dashboard`:** section A–G sesuai §6.1, adaptif terhadap coverage (< 20% → A/B jadi lead, C–E diberi label "sementara", CTA tunggal). H hanya tampil bila riwayat ≥ 2 periode. Setiap section punya state empty, skeleton, dan error inline dengan tombol coba lagi. Setiap chart punya toggle "Tampilkan tabel".
4. **(sonnet) Test:** Vitest untuk loader/derivasi. Playwright `loginAs`: angka kunci tampil, tanpa horizontal scroll, tanpa error konsol, 1440/375 × terang/gelap. Screenshot ke `docs/screenshots/fase-5/`.
5. **(opus) Review visual independen** (skill `impeccable`, a11y, kontras). Perbaiki P0/P1.
6. **(opus) Verifikasi:** `bunx supabase db reset`, `bunx supabase test db`, `bun run typecheck`, `lint`, `test`, `bun scripts/check-contrast.ts`, `build`, `test:e2e`.
7. Update `docs/PLAN.md` §10 (status Fase 5), lalu buat `.claude/commands/fase-6.md`. **Jangan jalankan Fase 6.** Jangan commit/push tanpa diminta user.

## Keputusan terbuka dari Fase 4 (tanyakan user bila belum dijawab)

- Hue High di mode gelap (`#B15604`) berbeda dari High terang (`#C26159`).
- Teks rubrik: diteruskan sebagai prop `rubric` dari halaman, atau masuk ke `ScoringParams`.
- `IndicatorMeter` memakai bar penuh, bukan kotak 12px seperti DESIGN §6.3.
- Skor disembunyikan di list mobile bila aset belum dinilai.

## Definisi selesai

- Dashboard A–G tampil dengan data DB, angka cocok dengan Excel (D8 diperbaiki), dan adaptif terhadap coverage.
- Review visual tanpa P0/P1 terbuka, dan semua gate hijau.
- Kontrak Fase 3 dan design system Fase 4 tidak rusak.
- Ringkasan untuk user, termasuk keputusan yang perlu persetujuan.
