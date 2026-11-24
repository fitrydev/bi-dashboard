---
description: Fase 8 — Pengaturan (admin): allowlist user & role, parameter skor berversi + rubrik + recalc dengan preview dampak, alias wilayah/pemanfaatan, koreksi massal "perlu review". Tanpa hardening/deploy (Fase 9–10).
---

# Fase 8 — Pengaturan (admin)

Anda adalah senior full-stack engineer (Next.js 16 + Supabase). Bahasa: **Bahasa Indonesia**. Package manager: **bun**.

## Konteks wajib dibaca dulu

1. `CLAUDE.md`, `DESIGN.md` (§6.9 state, §6.10 toast, §6.11 navigasi, §7, §8), `docs/PLAN.md` §4, §6.2 butir 8, §9 (terutama 1, 3, 5, 8), §10 ("Hasil Fase 2" s.d. "Hasil Fase 7").
2. Kode yang menjadi kontrak (jangan dirusak):
   - DB: `allowed_emails` (role admin/editor/viewer), `has_role()`, `is_allowed()`, hook `hook_before_user_created`, `scoring_params` (versi, `is_active`, satu aktif), `score_criteria` per versi, `recalculate_with_active_params(dry_run)`, `region_aliases`, `utilization_aliases`, `assets.utilization_needs_review`/`utilization_raw`, `audit_log`, `stamp_actor`, `import_commit`. Skema hanya **ditambah** lewat migrasi baru. Paritas DB ↔ TS skor tetap hijau.
   - Auth: `AllowlistGate`, `requireRole("admin")` di setiap Server Action pengaturan, e2e `loginAs` (workers 1). Temuan Fase 3: `auth.admin.createUser` melewati hook — jangan pakai untuk menambah user.
   - Fase 6–7: `lib/actions/*` (`ActionResult`, `toActionError`), `lib/schemas/*`, `lib/import/*` (alias dipakai validator impor), `lib/supabase/paginate.ts`, `e2e/{aset,import}.spec.ts`.
   - Design system: `components/risk`, `components/charts`, `components/ledger`.

Jangan analisa ulang Fase 0–7. Jangan kerjakan Fase 9+.

## Aturan kerja: sub-agent driven, model dinamis

- **opus**: RLS/keamanan admin (tidak boleh mencabut admin terakhir / diri sendiri), versi parameter (validasi bobot = 100%, ambang monoton, aktivasi atomik), recalc + preview dampak, review, verifikasi akhir.
- **sonnet**: UI pengaturan, test.
- **haiku**: mekanis (typegen, format, screenshot).
- Agent independen paralel dengan brief lengkap. Hanya satu agent yang boleh `bunx supabase db reset` pada satu waktu. Skill: `supabase-postgres-best-practices`, `find-docs`, `impeccable`.
- Supabase lokal butuh Docker (Colima). Bila `docker pull` macet: `colima restart`.

## Langkah

1. **(opus) DB:** RPC/policy yang diperlukan: kelola allowlist (tambah/ubah role/cabut, lindungi admin terakhir & diri sendiri), buat versi parameter baru (bobot, ambang, interval, metode, rubrik) dari versi aktif, aktivasi versi (atomik), `recalculate_with_active_params` dengan preview (berapa aset pindah kategori), CRUD alias, koreksi massal pemanfaatan "perlu review". pgTAP: non-admin ditolak, admin terakhir terlindungi, satu versi aktif, skor lama tetap versinya, recalc hanya penilaian terakhir.
2. **(sonnet) `/pengaturan`** (admin saja; non-admin → pesan/redirect): tab Pengguna, Parameter skor (versi + diff vs aktif + preview dampak sebelum aktivasi/recalc), Rubrik, Alias, Data perlu review (koreksi massal). Form zod, `ActionResult`, toast, mobile tanpa horizontal scroll.
3. **(sonnet) Test:** Vitest (validasi parameter), pgTAP, Playwright `loginAs` (editor/viewer tidak bisa akses; admin tambah user, buat versi + preview + aktivasi, alias baru dipakai impor; 1440/375 × terang/gelap tanpa horizontal scroll & error konsol). Screenshot ke `docs/screenshots/fase-8/`.
4. **(opus) Review keamanan + visual independen.** Perbaiki P0/P1.
5. **(opus) Verifikasi:** `bunx supabase db reset`, `bunx supabase test db`, `bunx supabase db lint`, `bun run typecheck`, `lint`, `test`, `bun scripts/check-contrast.ts`, `build`, `test:e2e`.
6. Update `docs/PLAN.md` §10 (status Fase 8), lalu buat `.claude/commands/fase-9.md`. **Jangan jalankan Fase 9.** Jangan commit/push tanpa diminta user.

## Keputusan terbuka dari Fase 7 (tanyakan user bila menyentuh)

- Editor mengoreksi penilaian lama lewat impor (RLS `assessments_update` admin-only).
- Skor 4–5 tanpa catatan di impor = peringatan saja; viewer boleh ekspor; CSV pemisah `;`.

## P2 terbuka (tutup bila menyentuh area yang sama)

- Lihat PLAN §10 "Hasil Fase 7" → P2 terbuka (sonner fokus keyboard, batch `validated` tertinggal, dsb.) dan P2 Fase 5/6.

## Definisi selesai

- Hanya admin yang bisa mengakses & mengubah pengaturan (UI, action, RLS).
- Versi parameter baru tidak mengubah skor lama; recalc eksplisit dengan preview dampak.
- Alias baru langsung dipakai impor; koreksi massal "perlu review" bekerja.
- Review tanpa P0/P1 terbuka, semua gate hijau. Kontrak Fase 3–7 tidak rusak.
- Ringkasan untuk user, termasuk keputusan yang perlu persetujuan.
