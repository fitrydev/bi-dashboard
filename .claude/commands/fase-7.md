---
description: Fase 7 — Import/export Excel (SheetJS di worker, validasi + pratinjau, commit transaksional via import_commit, export round-trip + CSV terfilter). Tanpa pengaturan (Fase 8).
---

# Fase 7 — Import / Export Excel

Anda adalah senior full-stack engineer (Next.js 16 + Supabase + SheetJS). Bahasa: **Bahasa Indonesia**. Package manager: **bun**.

## Konteks wajib dibaca dulu

1. `CLAUDE.md`, `DESIGN.md` (§6.7 peringatan, §6.9 state, §6.10 toast, §7, §8, §12.2 tiga status import), `docs/PLAN.md` §4, §5 (pemetaan Excel ↔ Web + alur 3 langkah), §6.2 butir 7, §9 (terutama 3, 4, 7), §10 ("Hasil Fase 2" s.d. "Hasil Fase 6").
2. Kode yang menjadi kontrak (jangan dirusak):
   - DB: `assets`, `assessments` (trigger `assessments_compute`, `assessments_aa_guard` memaksa versi aktif untuk non-admin, tanggal masa depan WIB ditolak), `monitoring_events`, `import_batches` (RLS: editor kelola batch miliknya), kerangka RPC `import_commit`, `region_aliases`, `utilization_aliases`, `stamp_actor`, `audit_row`, batas teks `*_text_len`. Skema hanya **ditambah** lewat migrasi baru. Paritas DB ↔ TS tetap hijau.
   - Auth: `AllowlistGate`, `requireRole("editor")` di setiap Server Action, e2e `loginAs` (workers 1).
   - Fase 6: `lib/actions/*` (`ActionResult`, `toActionError`, `revalidateAsset`), `lib/schemas/*` (zod; pakai ulang untuk validasi baris), `lib/aset/filters.ts` (filter URL `/aset` — export CSV terfilter memakai ini), `e2e/aset.spec.ts`.
   - Design system: `components/risk`, `components/charts`, `components/ledger`.
3. File sumber `source/Template_Matriks_Risiko_Monitoring_Aset_2027.xlsx` **read-only**. Gunakan hanya sebagai fixture import; jangan analisa ulang struktur (sudah di PLAN §2/§5 dan `docs/ANALISA_EXCEL.md`).

Jangan analisa ulang Fase 0–6. Jangan kerjakan Fase 8+.

## Aturan kerja: sub-agent driven, model dinamis

- **opus**: desain `import_commit` (transaksional, idempoten, upsert per `asset_code`, hanya kolom terisi), validasi baris + alias, keamanan unggahan, review, verifikasi akhir.
- **sonnet**: UI 3 langkah, export, test.
- **haiku**: mekanis (typegen, format, screenshot).
- Agent independen paralel dengan brief lengkap. Hanya satu agent yang boleh `bunx supabase db reset` pada satu waktu. Skill: `supabase-postgres-best-practices`, `find-docs` (SheetJS, Next 16), `impeccable`.
- SheetJS dari tarball cdn.sheetjs.com (sudah terpasang sebagai `xlsx`), **bukan** npm `xlsx`. Parsing di Web Worker (UI tidak beku).
- "Belum dinilai" tidak pernah tampil seperti Low; skor kosong ≠ 1. Placeholder Rp1 / 1 m² / tanggal masa depan = *Peringatan data*, tetap diimpor. Format id-ID.
- Supabase lokal butuh Docker (Colima). Bila `docker pull` macet, jalankan `colima restart`.

## Langkah

1. **(opus) DB:** lengkapi `import_commit(batch_id, rows jsonb)`: satu transaksi, `security invoker`, `search_path=''`, editor+; upsert aset per `asset_code` (hanya kolom terisi), penilaian sama bila `(asset, assessed_at)` sama (idempoten), alias wilayah/pemanfaatan, laporan per baris ke `import_batches.report`. pgTAP: idempoten (impor 2× tidak menduplikasi), alias, baris error dilewati, viewer ditolak, batas teks.
2. **(opus) Validasi baris** (TS, murni, pakai ulang `lib/schemas`): tiga status DESIGN §12.2 — *Ditolak* (format/ID/wajib/wilayah tak dikenal), *Peringatan data* (D1 placeholder, D4 tanggal masa depan, D5 "Produktif" perlu review, alias), *Temuan risiko* (hak kedaluwarsa). Parse tanggal serial Excel / `dd/mm/yyyy` / ISO; ID angka dinormalisasi. Vitest dengan file Excel asli: **136 aset, peringatan D1–D5 muncul, angka cocok §2.3**.
3. **(sonnet) `/import`:** 3 langkah — Unggah (+ "Unduh template"), Validasi & pratinjau (status per baris, diff baru/berubah/sama vs DB, filter error), Konfirmasi (commit, unduh laporan error, batch tercatat). Batas ukuran file, hanya `.xlsx`. Mobile tanpa horizontal scroll.
4. **(sonnet) Export:** Excel format template (round-trip: export → import = tanpa perubahan) dan CSV dari `/aset` sesuai filter URL aktif (tombol "Ekspor" di filter bar DESIGN §6.4).
5. **(sonnet) Test:** Vitest (parser, validasi, diff), pgTAP, Playwright `loginAs` (viewer tidak bisa impor; editor impor file asli → dashboard 136 aset; impor ulang tanpa duplikasi; export → import round-trip; 1440/375 × terang/gelap tanpa horizontal scroll dan tanpa error konsol). Screenshot ke `docs/screenshots/fase-7/`.
6. **(opus) Review keamanan + visual independen** (unggahan berbahaya, formula injection CSV `=`/`+`/`-`/`@`, ukuran, RLS batch). Perbaiki P0/P1.
7. **(opus) Verifikasi:** `bunx supabase db reset`, `bunx supabase test db`, `bunx supabase db lint`, `bun run typecheck`, `lint`, `test`, `bun scripts/check-contrast.ts`, `build`, `test:e2e`.
8. Update `docs/PLAN.md` §10 (status Fase 7), lalu buat `.claude/commands/fase-8.md`. **Jangan jalankan Fase 8.** Jangan commit/push tanpa diminta user.

## P2 terbuka dari Fase 6 (tutup bila menyentuh area yang sama)

- UI buat/ubah aset belum ada (action `createAsset`/`updateAsset` siap).
- Tombol "Ekspor" di filter bar `/aset` belum ada (langkah 4).
- `SectionBoundary` diimpor dari `app/(app)/dashboard/client` → pindah ke `components/ledger`.
- Sonner tanpa `role="status"`; timer tidak jeda saat fokus keyboard.
- View/`dashboard_summary` masih `current_date` (UTC).
- Lainnya di PLAN §10 "Hasil Fase 6".

## Definisi selesai

- File Excel asli terimport: 136 aset, peringatan D1–D5 muncul, angka dashboard cocok.
- Impor idempoten; export → import round-trip tanpa perubahan; CSV mengikuti filter.
- Review tanpa P0/P1 terbuka, semua gate hijau. Kontrak Fase 3–6 tidak rusak.
- Ringkasan untuk user, termasuk keputusan yang perlu persetujuan.
