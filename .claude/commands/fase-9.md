---
description: Fase 9 — Hardening: security review (app + Supabase), a11y audit, Lighthouse/performa (target §3.1), Playwright e2e, penutupan P2 terbuka Fase 3–8. Tanpa deploy (Fase 10).
---

# Fase 9 — Hardening

Anda adalah senior full-stack engineer (Next.js 16 + Supabase) dengan fokus keamanan, aksesibilitas, dan performa. Bahasa: **Bahasa Indonesia**. Package manager: **bun**.

## Konteks wajib dibaca dulu

1. `CLAUDE.md`, `DESIGN.md` (§6.9 state, §6.10 toast, §6.11 navigasi, §7, §8), `docs/PLAN.md` §3.1 (target performa), §3.2 (keamanan), §8 baris Fase 9, §9, §10 ("Hasil Fase 3" s.d. "Hasil Fase 8", terutama risiko residual & P2 terbuka).
2. Kode yang menjadi kontrak (jangan dirusak):
   - DB: semua migrasi Fase 2–8 (RLS, `has_role()`, `is_allowed()`, hook `hook_before_user_created`, fungsi skor berversi, `dashboard_summary`, `import_commit`, guard Fase 6 & 8, trigger `*_aa_guard`/`assessments_ab_params_guard`). Skema hanya **ditambah** lewat migrasi baru. Paritas DB ↔ TS skor tetap hijau.
   - Auth: `proxy.ts` / `lib/supabase/proxy.ts`, `AllowlistGate`, `requireRole()` di setiap Server Action, route `/export/*` (`requireRole("viewer")`), e2e `loginAs` (workers 1). `auth.admin.createUser` melewati hook — jangan dipakai.
   - `next.config.ts` (header keamanan, `serverActions.bodySizeLimit`), `lib/actions/*` (`ActionResult`, `toActionError`), `lib/import/*`, `lib/export/*`, `e2e/*.spec.ts`.
   - Design system: `components/risk`, `components/charts`, `components/ledger`.

Jangan analisa ulang Fase 0–8. Jangan kerjakan Fase 10 (deploy).

## Aturan kerja: sub-agent driven, model dinamis

- **opus**: security review (skill `security-review`, `code-review-security`, `supabase-postgres-best-practices`), RLS/RPC/guard, CSP, verifikasi akhir.
- **sonnet**: a11y audit (skill `accessibility`, `web-design-guidelines`), Lighthouse/performa (skill `vercel-react-best-practices`), test e2e.
- **haiku**: lint/fix mekanis, typegen, screenshot.
- Agent independen paralel dengan brief lengkap. Hanya satu agent yang boleh `bunx supabase db reset` pada satu waktu.
- Supabase lokal butuh Docker (Colima). Bila `docker pull` macet: `colima restart`.

## Langkah

1. **(opus) Security review** seluruh app + DB (OWASP/ASVS): RLS tiap tabel, RPC `security invoker`/`search_path`, Server Action & route export, upload/impor, formula injection, header. Supabase Security/Performance Advisor (`bunx supabase db lint` + advisor lokal bila tersedia). Laporkan P0/P1/P2.
2. **(opus) Header & sesi** (risiko residual PLAN §10): CSP script dari `'unsafe-inline'` → nonce (dievaluasi; pertahankan bila tidak sepadan, catat alasannya), cookie sesi `Secure` di prod (`cookieOptions.secure`), matcher proxy (pertimbangkan hanya kecualikan `_next/static`/`_next/image`), warning prerender `Date.now()` dari auth-js `_loadSession`.
3. **(sonnet) A11y audit** (WCAG 2.2 AA, axe di e2e untuk semua halaman, keyboard): sonner timer jeda saat fokus keyboard (§6.10), galat ganda tanpa h1 di dashboard, `RightTimeline` `role=region`/`tabindex`, `TopValue` dua link per baris, bar Recharts tanpa roving focus (catat bila diterima).
4. **(sonnet) Performa:** Lighthouse/bundle untuk `/dashboard`, `/aset`, `/pengaturan` di mobile — target §3.1 (LCP < 1,5 s, INP < 200 ms, JS dashboard < 150 KB gz). Evaluasi `use cache` + `cacheTag` (§3.1) bila sepadan.
5. **(sonnet) e2e:** lengkapi skenario yang belum diuji (Fase 8: terapkan hitung ulang, tetapkan status, alias pemanfaatan, edit rubrik, hapus draf) dan axe di semua halaman; 1440/375 × terang/gelap.
6. **P2 terbuka** — tutup yang murah/berisiko, sisanya catat (lihat di bawah).
7. **(opus) Verifikasi:** `bunx supabase db reset`, `bunx supabase test db`, `bunx supabase db lint`, `bun run typecheck`, `lint`, `test`, `bun scripts/check-contrast.ts`, `build`, `test:e2e`. State DB akhir: versi aktif 1, 136 aset, 123 perlu review.
8. Update `docs/PLAN.md` §10 (status Fase 9 + "Hasil Fase 9"), lalu buat `.claude/commands/fase-10.md`. **Jangan jalankan Fase 10.** Jangan commit/push tanpa diminta user.

## Keputusan terbuka (tanyakan user bila menyentuh)

- Fase 7: editor mengoreksi penilaian lama lewat impor (RLS `assessments_update` admin-only); skor 4–5 tanpa catatan di impor = peringatan; viewer boleh ekspor; CSV pemisah `;`.
- Fase 3: kredensial Google OAuth dan email admin pertama produksi (dibutuhkan Fase 10, bukan Fase 9).

## P2 terbuka (PLAN §10 "Hasil Fase 5–8")

- Fase 8: `methods` per kategori belum bisa diedit di UI; daftar dampak 200 / review 500 baris; normalisasi alias JS/PG non-ASCII; `bodySizeLimit 4mb` untuk semua action.
- Fase 7: batch impor tertinggal `validated` bila RPC gagal; `rows_*` dari klien; editor bisa membedakan "batch tidak ada" vs "bukan milik Anda"; `fetchAll` dibatasi 20.000.
- Fase 6: jadwal "Tak terjadwal" ±134 baris identik; navigasi bulan kalender mobile; view/RPC `current_date` (UTC); tabel `/aset` RiskBadge `md` + scroller bersarang; UI buat/ubah aset belum ada.
- Fase 5: "Ditambah 0 …", bar "Menuju 28 aset" basis 136.

## Definisi selesai

- Tidak ada temuan keamanan high (P0/P1) terbuka; header & sesi sesuai §3.2 (atau pengecualian tercatat dengan alasan).
- A11y: axe tanpa pelanggaran di semua halaman, keyboard dapat menjangkau semua aksi, toast memenuhi §6.10.
- Target performa §3.1 tercapai (atau selisih tercatat dengan rencana).
- Semua gate hijau, kontrak Fase 3–8 tidak rusak.
- Ringkasan untuk user, termasuk keputusan yang perlu persetujuan.
