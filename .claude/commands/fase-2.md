---
description: Fase 2 — skema database Supabase (migrations), RLS, auth hook allowlist, fungsi skor berversi, view, RPC, audit trail, dan seed dari data Excel. Diverifikasi dengan test SQL. Tanpa UI fungsional (itu Fase 3+).
---

# Fase 2 — Skema Database, Keamanan, dan Seed

Anda adalah senior database & security engineer untuk proyek ini. Bahasa komunikasi: **Bahasa Indonesia**. Package manager & runtime dev: **bun** (`bunx supabase ...`).

## Konteks wajib dibaca dulu

1. `docs/PLAN.md`:
   - §2.2 (logika bisnis), §2.4 (temuan D1–D10)
   - §3.1 (performa: agregasi di Postgres, index), §3.2 (keamanan: allowlist 3 lapis, role, audit)
   - §4 (model data), §5 (pemetaan Excel ↔ DB)
   - §9 (keputusan: RBAC siap tapi semua admin, riwayat append-only, alias pemanfaatan, placeholder, parameter berversi, rubrik Pemanfaatan skor 3 revisi)
   - §10 (status + "Hasil Fase 1")
2. `docs/ANALISA_EXCEL.md`: detail kolom, formula, dan validasi.
3. Kode Fase 1 yang menjadi kontrak:
   - `lib/scoring/*`: mirror TS. Fungsi DB harus menghasilkan angka identik.
   - `lib/types.ts`: bentuk `AssetRow` yang dipakai chart.
   - `lib/supabase/*`, `proxy.ts`, `supabase/config.toml`.
4. Data seed: `design/data/assets.json` (136 aset, params v1, rubrik 6×5 yang sudah merevisi Pemanfaatan skor 3, 1 penilaian 251116). `source/*.xlsx` read-only, hanya untuk cek silang.

Jangan mengulang analisa. Jangan mengerjakan Fase 3+ (login UI, guard role di Server Action, halaman fungsional, import UI).

## Aturan kerja: sub-agent driven, model dinamis

- **opus**: desain skema, RLS, auth hook, fungsi keamanan (`security definer` + `search_path`), review akhir.
- **sonnet**: generator seed dari JSON, test SQL (pgTAP), tipe TS hasil generate.
- **haiku**: mekanis (menjalankan CLI, `supabase gen types`, format).
- Jalankan agent independen secara paralel, dengan brief lengkap. Wajib memakai skill `supabase-postgres-best-practices` dan `find-docs` (Supabase Auth Hooks, RLS, `auth.jwt()`) sebelum menulis SQL. Versi CLI terpasang: `supabase` 3.0.0 (devDep).
- Butuh Docker untuk `bunx supabase start`. Jika Docker tidak tersedia, **berhenti dan tanyakan ke user**.

## Langkah

1. **(opus) Migrations** di `supabase/migrations/` (beberapa file kecil, urut timestamp):
   - Enum: `asset_type`, `utilization_status` (daftar validasi Excel, PLAN §9.3), `risk_category` (`critical, high, medium, low`), `app_role` (`admin, editor, viewer`), `monitoring_method`.
   - Tabel sesuai PLAN §4: `allowed_emails` (role default `admin`), `profiles`, `regions` (+ alias), `utilization_aliases`, `assets`, `scoring_params` (berversi, satu aktif via partial unique index), `score_criteria`, `assessments` (append-only), `monitoring_events`, `import_batches`, `audit_log`.
   - `assets`: kolom generated `value_is_placeholder` (≤1) dan `area_is_placeholder`.
   - `assessments`: skor `smallint check 1..5` nullable (**kosong ≠ 1**), override wajib disertai alasan (check), `params_version` FK.
   - Index sesuai PLAN §3.1.
   - Rancang tabel agar mudah ditambah `attachments` polimorfik nanti (PLAN §9.7), tapi tabelnya belum dibuat.
2. **(opus) Fungsi skor** (satu sumber kebenaran):
   - `compute_score(scores, version)` → `numeric(4,1)` atau null.
   - `category_for(score, override, version)` → kategori atau null (= belum dinilai).
   - `interval_months(category, version)`.
   - Kolom `assessments.total_score`/`category`/`is_complete` diisi lewat trigger `before insert/update` (bukan `generated`, karena bergantung pada tabel params).
   - Fungsi admin `recalculate_with_active_params(dry_run bool)` mengembalikan dampaknya (berapa aset pindah kategori).
3. **(opus) Keamanan:**
   - Helper `is_allowed()` dan `has_role(app_role)`: `stable`, `security definer`, `set search_path = ''`, membaca `auth.jwt()->>'email'` terhadap `allowed_emails`.
   - **RLS aktif di semua tabel public.** Policy select/insert/update/delete terpisah per peran, `to authenticated`, dan memakai `(select auth.uid())`/`(select is_allowed())` demi performa. Anon tidak punya akses apa pun.
   - Auth Hook **Before User Created** (`public.hook_before_user_created(event jsonb)`) menolak email di luar allowlist dengan pesan Bahasa Indonesia. Grant hanya ke `supabase_auth_admin`, revoke dari `authenticated, anon, public`. Daftarkan di `supabase/config.toml` (`[auth.hook.before_user_created]`).
   - Trigger sinkron `profiles` dari `auth.users`.
   - Trigger `audit_log` (before/after jsonb, actor, at) di `assets`, `assessments`, `scoring_params`.
   - `assessments` append-only: update/delete hanya untuk admin dan selalu diaudit.
4. **(opus) View & RPC:**
   - `v_asset_latest` (`DISTINCT ON`, aset + penilaian terakhir + kategori + interval + due_date + schedule_status) dengan `security_invoker = true`.
   - `v_data_quality_issues` (D1, D2, D4, D5, alamat kosong).
   - `dashboard_summary(filters jsonb)` → satu JSON untuk semua section dashboard (PLAN §6.1 dan DESIGN.md §12.1, termasuk coverage, temuan risiko vs kualitas data, wilayah/jenis, hak, jadwal, dan matriks hanya untuk aset yang sudah dinilai). Placeholder dikecualikan dari agregat nilai.
   - `import_commit(batch_id, rows jsonb)`: hanya kerangka (signature + transaksi + validasi dasar). Logika lengkapnya di Fase 7.
5. **(sonnet) Seed** `supabase/seed.sql` yang digenerate oleh skrip `scripts/gen-seed.ts` (bun) dari `design/data/assets.json`:
   - regions + alias (mis. JABAR), utilization aliases (Idle → Idle/Kosong; Produktif → Digunakan sendiri + flag `needs_review`)
   - `scoring_params` v1 (bobot, ambang 40/60/80, interval 1/3/6/12, metode tunggal per kategori, D9)
   - `score_criteria` v1 (Pemanfaatan skor 3 dengan teks revisi + penanda "direvisi dari Excel")
   - 136 aset dan penilaian 251116
   - satu email allowlist **contoh** dari env/argumen (jangan hardcode email asli; tanyakan user jika perlu)
   - Skrip harus idempoten (`on conflict`).
6. **(sonnet) Test SQL** (pgTAP, `supabase/tests/*.sql`, dijalankan dengan `bunx supabase test db`):
   - Skor (1,2,4,3,3,2) = 47,0 → medium; override → critical; skor tidak lengkap → null/belum dinilai; batas 39,9/40/59,9/60/79,9/80. Hasilnya harus identik dengan `lib/scoring` (tambahkan test Vitest parity yang membaca fixture bersama, mis. `lib/scoring/fixtures.json`).
   - **RLS:** user yang tidak ada di allowlist dan anon tidak bisa membaca/menulis tabel apa pun; user allowlist bisa membaca; mencabut email dari allowlist langsung menghilangkan akses.
   - Hook menolak email non-allowlist dan menerima email allowlist.
   - Seed: 136 aset, total nilai buku non-placeholder sesuai PLAN §2.3, 44 placeholder nilai, 3 hak lewat + 1 < 12 bln, 13 idle.
   - Audit log terisi saat update aset.
7. **(haiku)** `bunx supabase gen types typescript --local > lib/supabase/database.types.ts`, lalu sambungkan generic `Database` ke `lib/supabase/{client,server,proxy}.ts`. `bun run typecheck` harus hijau.
8. **(opus) Verifikasi independen:**
   - Jalankan `bunx supabase db reset`, `bunx supabase test db`, `bunx supabase db lint`, `bun run typecheck`, `test`, `build`.
   - Review keamanan: setiap fungsi `security definer` punya `search_path` kosong, tidak ada tabel tanpa RLS, tidak ada grant ke anon, dan hook di-grant dengan benar.
   - Jalankan advisor jika tersedia secara lokal.
9. Update `docs/PLAN.md` §10 (status Fase 2), lalu buat `.claude/commands/fase-3.md` (Auth Google + proxy redirect + allowlist + guard role, PLAN §8). **Jangan jalankan Fase 3.** Jangan commit/push tanpa diminta user.

## Definisi selesai

- `db reset` bersih, seluruh test pgTAP dan Vitest parity hijau, `typecheck`/`build` hijau.
- RLS terbukti menolak user non-allowlist, dan hook menolak signup non-allowlist.
- Angka seed cocok dengan PLAN §2.3 dan "Hasil Fase 0".
- Ringkasan untuk user: skema, fungsi, policy, cara reset/seed/test, dan keputusan yang perlu persetujuan (mis. email admin pertama).

Berhenti dan tanyakan ke user hanya jika keputusannya memang milik user (email admin pertama, Docker tidak tersedia, perubahan perilaku skor).
