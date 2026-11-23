---
description: Fase 6 — Aset (tabel + detail), form penilaian, catat monitoring, jadwal. CRUD + optimistic update + test. Tanpa import/export Excel (Fase 7) dan pengaturan (Fase 8).
---

# Fase 6 — Aset, Penilaian, Monitoring, Jadwal

Anda adalah senior full-stack engineer (Next.js 16 + Supabase + TanStack Table/Query). Bahasa: **Bahasa Indonesia**. Package manager: **bun**.

## Konteks wajib dibaca dulu

1. `CLAUDE.md`, `DESIGN.md` (§6.4 filter URL, §6.5–§6.6 tabel/list mobile, §6.8 form rubrik, §6.9 state, §6.10 toast Urungkan, §7, §8), `docs/PLAN.md` §4, §6.2 (halaman 2–6), §6.3, §9, §10 ("Hasil Fase 2" s.d. "Hasil Fase 5").
2. Kode yang menjadi kontrak (jangan dirusak):
   - DB: tabel `assets`/`assessments`/monitoring, trigger `assessments_compute` (skor dihitung DB, bukan client), `stamp_actor`, `audit_row`, RLS per role, `v_asset_latest`, `v_data_quality_issues`, `dashboard_summary`. Skema hanya **ditambah** lewat migrasi baru. Paritas DB ↔ TS tetap hijau.
   - Auth: `AllowlistGate`, `requireUser`/`requireRole` (editor untuk tulis, viewer baca) di setiap Server Action, e2e `loginAs` (workers 1).
   - Fase 5: `lib/asset-row.ts` (`fromLatestView`), `lib/dashboard/{filters,derive,load}.ts`, `/dashboard`, `e2e/dashboard.spec.ts`.
   - Design system: `components/risk`, `components/charts`, `components/ledger`, galeri `/design`.

Jangan analisa ulang Excel atau Fase 0–5. Jangan kerjakan Fase 7+.

## Aturan kerja: sub-agent driven, model dinamis

- **opus**: Server Action + validasi zod + guard role/RLS, desain optimistic/undo, review keamanan, dan verifikasi akhir.
- **sonnet**: halaman, tabel, form, dan test.
- **haiku**: mekanis (typegen, format, screenshot).
- Jalankan agent independen secara paralel dengan brief lengkap. Skill: `impeccable`, `dataviz`, `supabase-postgres-best-practices`, `find-docs` (Next 16 Server Actions/cacheComponents, TanStack Table 8, react-hook-form + zod 4).
- Skala skor 1 = sangat rendah, 5 = sangat tinggi. "Belum dinilai" tidak pernah tampil seperti Low. Placeholder ditampilkan "—" + ikon peringatan. Format id-ID.
- Supabase lokal butuh Docker (Colima). Bila `docker pull` macet, jalankan `colima restart`.

## Langkah

1. **(opus) Server Actions** di `lib/actions/` atau `app/(app)/**/actions.ts`: buat/ubah/soft-delete aset, simpan penilaian (draf + final; catatan wajib bila skor ≥4 atau ada override), catat monitoring (tanggal tidak boleh di masa depan, D4). Setiap action memakai zod, `requireRole`, error berpesan Indonesia, dan `revalidatePath`/`updateTag`. Tambah migrasi/pgTAP hanya bila perlu (mis. kolom draf, Storage bucket foto + policy).
2. **(sonnet) `/aset`:** tabel TanStack (virtual bila > 200), filter wilayah/jenis/kategori/pemanfaatan/status jadwal/`warn`/`dinilai` disimpan di URL, dengan nama kunci sama seperti dashboard (pakai ulang `lib/dashboard/filters.ts`). Tambah pencarian, kolom bisa dipilih, list kartu di mobile, dan filter mobile di bottom sheet. Semua link KPI dashboard (`warn=`, `pemanfaatan=`, `dinilai=`, `kategori=`) harus berfungsi.
3. **(sonnet) `/aset/[code]`:** identitas, skor, `IndicatorMeter` dengan rubrik (prop `rubric`), peringatan, riwayat penilaian (sparkline), riwayat monitoring, dan audit.
4. **(sonnet + opus review) `/aset/[code]/nilai`:** radio 1–5 full-width dengan teks rubrik, opsi "belum diketahui", preview skor/kategori live (mirror TS `lib/scoring`, kebenaran tetap di DB), simpan draf. Ini target CTA dashboard.
5. **(sonnet) Catat monitoring** (mobile-first, foto ke Storage) dan **`/jadwal`** (list + kalender bulan, filter PIC).
6. **(opus) Optimistic update + toast "Urungkan"** untuk soft delete (React 19 `useOptimistic`).
7. **(sonnet) Test:** Vitest (schema zod, derivasi), pgTAP bila ada migrasi, Playwright `loginAs` (viewer tidak bisa menulis; editor menilai aset sehingga dashboard berubah; filter URL; 1440/375 × terang/gelap; tanpa horizontal scroll dan tanpa error konsol). Screenshot ke `docs/screenshots/fase-6/`.
8. **(opus) Review visual + keamanan independen.** Perbaiki P0/P1.
9. **(opus) Verifikasi:** `bunx supabase db reset`, `bunx supabase test db`, `bun run typecheck`, `lint`, `test`, `bun scripts/check-contrast.ts`, `build`, `test:e2e`.
10. Update `docs/PLAN.md` §10 (status Fase 6), lalu buat `.claude/commands/fase-7.md`. **Jangan jalankan Fase 7.** Jangan commit/push tanpa diminta user.

## P2 terbuka dari Fase 5 (tutup bila menyentuh area yang sama)

- Saat galat data, header dan body masing-masing punya "Coba lagi" dan tidak ada h1.
- Wilayah tak dikenal di URL membuat select kosong.
- Wadah scroll `RightTimeline` di mobile belum punya `role=region`/`tabindex`.
- `TopValue` punya dua link per baris.
- Catatan KPI bisa berbunyi "Ditambah 0 …".
- Bar "Menuju 28 aset" memakai basis 136.
- Warning prerender `Date.now()` (sesi Supabase / UserMenu).

## Definisi selesai

- CRUD aset, penilaian, dan monitoring berjalan dengan guard role + RLS, plus optimistic update dan Urungkan.
- Menilai aset mengubah angka dashboard. Semua link dashboard menuju daftar terfilter yang benar.
- Review tanpa P0/P1 terbuka, dan semua gate hijau. Kontrak Fase 3–5 tidak rusak.
- Ringkasan untuk user, termasuk keputusan yang perlu persetujuan.
