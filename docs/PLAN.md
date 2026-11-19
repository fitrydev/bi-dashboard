# Plan — Dashboard Risk-Based Asset Monitoring 2027

Status: **DRAFT untuk review** · Fase: analisa & perencanaan (belum ada kode)
Sumber: `source/Template_Matriks_Risiko_Monitoring_Aset_2027.xlsx`
Tanggal: 19 Nov 2026

---

> Analisa detail per kolom (tipe data, format, validasi, formula, lookup, bug formula) dan matriks pemilihan chart ada di **`docs/ANALISA_EXCEL.md`**.

## 1. Ringkasan eksekutif

Excel ini bukan laporan, tetapi sebuah **alat kerja** dengan alur: Master Aset → Penilaian Risiko (6 indikator berbobot) → Kategori → Frekuensi dan Jadwal Monitoring. Web app harus menggantikan alur kerja itu, bukan hanya menampilkan grafik.

Ada tiga hal yang paling menentukan desain:

1. **Cakupan penilaian baru 1 dari 136 aset (0,7%).** Dashboard yang memasang skor rata-rata atau pie kategori sebagai angka utama akan menyesatkan. Cerita utama saat ini adalah *coverage* dan *kualitas data*, lalu bergeser ke *risiko* ketika penilaian sudah berjalan.
2. **Kualitas data bermasalah** (lihat §2.4). Aplikasi harus menandai masalah ini secara eksplisit, bukan menyembunyikannya.
3. **Logika skor harus punya satu sumber kebenaran** (Postgres). Logika itu harus bisa dikalibrasi (bobot dan ambang batas) dengan versi, supaya skor historis tetap bisa dijelaskan.

---

## 2. Analisa Excel

### 2.1 Struktur sheet

| Sheet | Peran | Jenis | Dimigrasi ke |
|---|---|---|---|
| Petunjuk | Panduan 5 langkah, metode, batasan | Statis | Halaman "Panduan" + tooltip kontekstual |
| Master Aset | 14 kolom, 136 baris terisi (kapasitas 200) | **Input** | Tabel `assets` |
| Penilaian Risiko | ID, tanggal, 6 skor, override, catatan, tindak lanjut, PIC, target; kolom identitas, skor, kategori, frekuensi dan metode berupa formula | **Input + turunan** | `assessments` (+ skor dihitung di DB) |
| Jadwal Monitoring | Semua kolom formula (interval, jatuh tempo, status) | **Turunan** | View `v_monitoring_schedule` + tabel `monitoring_events` |
| Dashboard | 3 KPI + tabel jumlah per kategori | Turunan | Halaman Dashboard |
| Kriteria Skor | Rubrik deskriptif skor 1–5 per indikator | Referensi | Tabel `score_criteria` (tampil di form) |
| Parameter | Bobot, ambang kategori, frekuensi, metode | Konfigurasi | `scoring_params` (berversi) |

### 2.2 Logika bisnis (direplikasi persis)

```
skor_total = Σ(skor_i × bobot_i) / 5 × 100     // hanya jika 6 indikator terisi; rentang efektif 20–100
bobot      = Legalitas 0,20 · Penguasaan 0,25 · Kondisi Fisik 0,15
             Pemanfaatan 0,15 · Lokasi 0,10 · Nilai Strategis 0,15
kategori   = override=YA → Critical
             skor kosong → BELUM LENGKAP
             ≥80 Critical · ≥60 High · ≥40 Medium · else Low
interval   = Critical 1 bln · High 3 · Medium 6 · Low 12
jatuh_tempo= tgl_monitoring_terakhir + interval (EDATE)
status     = Belum dapat dijadwalkan | Isi tgl monitoring terakhir | Jatuh tempo/overdue (< hari ini) | Terjadwal
```

Contoh verifikasi dari baris terisi: aset 251116 dengan skor (1,2,4,3,3,2) → 47,0 → Medium. Hitungan ini akan menjadi test case parity.

Arah skala: **1 = risiko sangat rendah, 5 = risiko sangat tinggi** (mis. legalitas 5 = sengketa aktif).

### 2.3 Profil data

- **136 aset:** 121 Bangunan, 15 Tanah, 0 Gabungan.
- **Wilayah:** DKI Jakarta 118, Jawa Barat 12, Banten 6.
- **Total nilai buku ±Rp143,9 M**, sangat terkonsentrasi:
  - TANAH DURI KOSAMBI CIKARANG (ID 789) Rp22,0 M (15%)
  - CLUBHOUSE DUREN TIGA Rp11,2 M
  - TANAH UPB SERANG Rp4,6 M (101.420 m², 76% dari total luas)
- **Pemanfaatan:** Produktif 123, Idle 13 (semuanya tanah, ±Rp42,4 M nilai idle ≈ 29% portofolio).
- **Nilai seragam:** Status Hak semuanya "Clean dan Clear", PIC semuanya "Asset Monitoring Department", Tgl monitoring terakhir semuanya 31-12-2026.
- **Kolom kosong:** Luas Bangunan dan Catatan kosong 100%. Alamat kosong di 4 baris.
- **Nama generik berulang:** "BANGUNAN KELAS 3" ×22, "KELAS 2" ×18, "KELAS 1" ×12. Ini unit di Duren Tiga, jadi ID adalah satu-satunya pembeda.

### 2.4 Temuan kualitas data dan bug template

| # | Temuan | Dampak | Penanganan di app |
|---|---|---|---|
| D1 | 44 aset bernilai **Rp1**, 39 aset luas **1 m²** (placeholder) | Total/rata-rata bias, chart menyesatkan | Flag `is_placeholder`, dikecualikan dari agregat + catatan kaki "44 aset tanpa nilai" |
| D2 | 3 tanah **hak sudah berakhir** (11/09/2010, 26/02/2024, 24/09/2024) dan 1 hampir berakhir (10/09/2027), padahal berstatus "Clean dan Clear" | Kontradiksi legal, kandidat Critical | Alert "Hak kedaluwarsa / < 12 bln" + saran skor Legalitas ≥4 |
| D3 | Tgl Akhir Hak disimpan sebagai **teks** `dd/mm/yyyy` | Tidak bisa dihitung | Parser tanggal multi-format saat import |
| D4 | Tgl monitoring terakhir = **31-12-2026 (masa depan)** untuk semua aset | Jadwal jatuh tempo tidak valid | Validasi "tanggal tidak boleh di masa depan", jadi warning saat import |
| D5 | Status Pemanfaatan "**Produktif**" dan "**Idle**" **tidak ada** di daftar validasi Excel (yang ada: Digunakan sendiri, Disewakan/Kerja sama, Idle/Kosong, …) | Kategori tidak konsisten | Enum + tabel mapping alias (Idle → Idle/Kosong, Produktif → ?) **perlu keputusan** |
| D6 | Rubrik **Pemanfaatan skor 2 dan 3 teksnya identik** | Penilai tidak bisa membedakan | Minta revisi teks skor 3 ke pemilik proses |
| D7 | Penilaian Risiko kolom A = `='Master Aset'!A5` (link **posisi baris**, bukan ID) | Sort/insert di Master merusak relasi | Di DB: foreign key `asset_id` |
| D8 | Baris 141–204 di Penilaian berisi formula yang menghasilkan 0, sehingga **"Total aset dinilai" di Dashboard terhitung 200, bukan 136** | KPI Excel salah | Hitung dari data riil |
| D9 | Metode Medium beda teks antar sheet ("Remote triwulanan + site visit semesteran" vs "Remote + site visit semesteran") | Inkonsistensi | Satu sumber: `scoring_params` |
| D10 | Kapasitas template hanya 200 baris | Tidak scalable | Tidak ada batas di DB |

---

## 3. Arsitektur dan stack

Versi di bawah sudah dicek ke npm registry per 19 Nov 2026.

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Framework | **Next.js 16** (App Router, RSC, Server Actions), React 19 | Native di Vercel, data fetching di server, bundle client kecil |
| UI | **Tailwind 4 + shadcn/ui** (dikustom penuh ke design token, bukan default) | Aksesibel (Radix), tidak terkunci ke look default |
| Chart | **Recharts 3** via shadcn chart + **SVG custom** untuk heatmap, stacked bar, dan progress | Ringan; heatmap custom lebih cepat dan aksesibel |
| Tabel | **TanStack Table** (pin v8, atau v9 setelah dicek API-nya) + virtualisasi `@tanstack/react-virtual` | Sort/filter/pagination server-side |
| Form | react-hook-form + **zod 4** (schema dipakai bersama client/server/import) | Satu definisi validasi |
| Data client | TanStack Query hanya untuk bagian interaktif (tabel, import). Halaman lain memakai RSC | Hindari double fetching |
| Excel | **SheetJS dari cdn.sheetjs.com** (bukan npm `xlsx@0.18.5` yang ber-CVE) | Parser terlengkap dan aman |
| DB/Auth | **Supabase** Postgres + Auth (Google only) + Storage (arsip file import) | Sesuai permintaan |
| Auth lib | `@supabase/ssr`, `proxy.ts` (pengganti `middleware.ts` di Next 16), `getClaims()` di server | Pola resmi terkini |
| Hosting | Vercel (Fluid Compute), region fungsi = region Supabase (Singapore `sin1` / `ap-southeast-1`) | Latensi DB minimal |
| Kualitas | TypeScript strict, ESLint, Vitest (logika skor + parser), Playwright (alur kritis), Supabase CLI migrations | Sustainable |

### 3.1 Prinsip performa

- **Agregasi di Postgres, bukan di browser.** Dashboard memanggil satu RPC `dashboard_summary(filters)` yang mengembalikan JSON siap pakai (coverage, distribusi, eksposur, matriks, wilayah, jadwal), jadi hanya satu round-trip.
- **Skor dihitung di DB** (function + view). TS mirror hanya untuk *preview live* di form, dan dijaga oleh test parity.
- **RSC + streaming** (`<Suspense>` per section) dengan skeleton yang sesuai layout final, sehingga tidak ada layout shift.
- **Cache:** `use cache` + `cacheTag('assets')`, lalu `revalidateTag` setelah mutasi atau import. Data dibaca bersama oleh semua user yang di-allow, jadi aman di-cache per tag. Ditambah RLS sebagai lapisan kedua.
- **Index:** `assessments(asset_id, assessed_at desc)`, `assets(region, type, utilization)`, partial index untuk aset aktif. View `v_asset_latest` memakai `DISTINCT ON`.
- **Import:** parsing dan validasi di **Web Worker** di browser (instan, tidak membebani function, tidak terkena limit body 1 MB Server Action). Server memvalidasi ulang dengan zod yang sama, lalu upsert batch dalam **1 transaksi RPC**. File asli diarsip ke Storage.
- **Bundle:** chart di-*lazy load* per section, font via `next/font` (self-hosted), ikon Lucide tree-shaken.
- **Target:** LCP < 1,5 s, INP < 200 ms, JS halaman dashboard < 150 KB gz.

### 3.2 Keamanan

- **Login hanya Google.** Email/password, magic link, phone, dan anonymous dinonaktifkan.
- **Allowlist 3 lapis:**
  1. Auth Hook **"Before User Created"** (Postgres function) menolak email di luar tabel `allowed_emails`. Akan dites dengan akun non-allowlist.
  2. **RLS** di semua tabel mensyaratkan `is_allowed()` (cek `auth.jwt()->>'email'` ke allowlist). Jadi user yang dicabut langsung kehilangan akses meski sesinya masih ada.
  3. `proxy.ts` me-redirect user tanpa sesi ke `/login`.
- **Role:** `admin` (kelola allowlist, parameter, hapus), `editor` (input/import), `viewer` (baca). Dicek di RLS dan di Server Action.
- **Key:** publishable key di client, secret key hanya server dan hanya untuk operasi admin. Tidak ada secret di `NEXT_PUBLIC_*`.
- **Audit trail:** trigger `audit_log` (siapa, kapan, before/after) di `assets`, `assessments`, dan `scoring_params`.
- **Upload:** hanya `.xlsx`, maks 5 MB, validasi MIME + magic bytes. Sel dibaca sebagai nilai (formula tidak dieksekusi). Teks disanitasi dari *CSV/formula injection* saat export (`=`, `+`, `-`, `@`).
- **Header keamanan:** CSP, HSTS, X-Frame-Options, Referrer-Policy di `next.config`.
- **Review:** sebelum go-live dijalankan skill `security-review` dan `supabase-postgres-best-practices`, plus Supabase Security Advisor.

---

## 4. Model data (Supabase)

```
allowed_emails   (email pk, role enum[admin,editor,viewer], added_by, created_at)
profiles         (id = auth.users.id, email, full_name, role)       ← sinkron via trigger
regions          (id, name)                                        ← DKI JAKARTA, JAWA BARAT, BANTEN …
assets           (id uuid, asset_code text unique ← "ID Aset" Excel, name, type enum[tanah,bangunan,gabungan],
                  region_id, address, land_area_m2, building_area_m2, book_value numeric(18,2),
                  legal_status, right_expiry_date date, utilization enum, pic_unit, notes,
                  last_monitored_at date, is_active, created_at, updated_at, updated_by)
                  + generated: value_is_placeholder, area_is_placeholder
scoring_params   (version int pk, weights jsonb, thresholds jsonb, intervals jsonb, methods jsonb,
                  effective_from, approved_by, is_active)
score_criteria   (indicator enum, score 1..5, description, params_version)
assessments      (id, asset_id fk, assessed_at date, params_version fk,
                  s_legal, s_control, s_physical, s_utilization, s_location, s_strategic  (1..5 | null),
                  critical_override bool, override_reason, findings, follow_up, follow_up_pic, target_date,
                  total_score numeric (dihitung fungsi DB), category enum GENERATED, is_complete GENERATED,
                  created_by, created_at)
monitoring_events(id, asset_id, monitored_at, method enum[site_visit,remote,desk_review], findings,
                  attachments[] → Storage, created_by)       ← mengisi last_monitored_at via trigger
import_batches   (id, file_path, uploaded_by, status, rows_total, rows_ok, rows_warn, rows_error, report jsonb)
audit_log        (id, table_name, row_id, action, before jsonb, after jsonb, actor, at)

VIEW v_asset_latest        → aset + penilaian terakhir + kategori + interval + due_date + schedule_status
VIEW v_data_quality_issues → D1, D2, D4 … per aset
RPC  dashboard_summary(filters jsonb) → JSON semua section
RPC  import_commit(batch_id, rows jsonb) → upsert transaksional
```

Keputusan penting:
- **Penilaian = riwayat (append-only).** Setiap penilaian ulang membuat baris baru, sehingga tren skor per aset dan per periode tersedia. Ini mendukung "input periodik".
- Skor disimpan bersama `params_version`, supaya kalibrasi bobot di masa depan tidak mengubah skor lama secara diam-diam. Tersedia tombol "hitung ulang dengan parameter baru" (admin).

---

## 5. Pemetaan Excel ↔ Web (import dan export)

| Excel | Kolom | → DB | Transformasi / validasi |
|---|---|---|---|
| Master Aset | ID Aset | `asset_code` | wajib, unik, string (angka dinormalisasi) → upsert key |
| | Nama, Alamat, PIC, Catatan | text | trim, collapse spasi |
| | Jenis | `type` | enum, case-insensitive |
| | Distrik/Daerah | `region_id` | lookup + alias (mis. "JABAR"→JAWA BARAT); jika tidak dikenal → error |
| | Luas Tanah/Bangunan | numeric | ≥0; nilai 1 → warning placeholder |
| | Nilai Buku | numeric | nilai 1 → warning placeholder |
| | Status Hak | text | bandingkan dengan Tgl Akhir Hak → warning kontradiksi |
| | Tgl Akhir Hak | date | parse serial Excel / `dd/mm/yyyy` / ISO |
| | Status Pemanfaatan | enum | tabel alias (D5) |
| | Tgl Monitoring Terakhir | date | masa depan → warning |
| Penilaian Risiko | ID Aset | `asset_id` | harus ada di Master (file atau DB) |
| | Tgl Penilaian | `assessed_at` | wajib jika ada skor |
| | 6 skor | `s_*` | integer 1–5 atau kosong (**kosong ≠ 1**) |
| | Override, Catatan, Tindak lanjut, PIC, Target | … | Override=YA wajib disertai catatan |
| | Kolom formula (B–D, L, N–Q) | — | **diabaikan**; dihitung ulang di DB |
| Jadwal, Dashboard, Kriteria, Parameter | — | — | tidak diimport (turunan/konfigurasi) |

**Alur import (3 langkah):**
1. **Unggah** file. Tersedia tombol "Unduh template" dari app, dengan format sama dengan Excel asli.
2. **Validasi & pratinjau:** per baris ditampilkan status ok/warning/error, diff "baru / berubah / sama" terhadap DB, dan filter error.
3. **Konfirmasi:** baris valid diimport, baris error dilewati, laporan error bisa diunduh, dan batch tercatat.

Import bersifat idempoten: upload file yang sama dua kali tidak menduplikasi data. Penilaian dianggap sama jika `(asset, tanggal)` sama.

**Export:** Excel dengan format template yang sama (round-trip), ditambah CSV untuk tabel yang terfilter.

---

## 6. UX dan desain

**Arah visual: "Buku Besar Risiko"**, terasa seperti register aset atau ledger audit, bukan template SaaS.
- Permukaan kertas hangat, teks tinta, garis hairline sebagai pemisah, bukan grid kartu di semua tempat.
- **Warna saturasi hanya untuk risiko.**
- Tidak ada gradien ungu, glassmorphism, ikon emoji, atau hero-metric kosong.
- Detail token akan dirumuskan di `DESIGN.md` saat fase build, dengan skill `impeccable`, `ui-ux-pro-max`, `dataviz`, dan `design-taste-frontend` sebagai gate anti-slop.

| Token | Usulan |
|---|---|
| Font | Fraunces (judul saja) · IBM Plex Sans (UI) · angka `tabular-nums` |
| Neutral light/dark | #FBFAF7 / #15181B surface · #1A1D21 / #ECE9E1 ink · rule #D9D4C7 / #2E343A |
| Critical | #9E1B1B / #FF6B6B + ikon belah ketupat |
| High | #D9591A / #FF9F4A + segitiga |
| Medium | #E0B100 / #F2D24B + lingkaran |
| Low | #1F7A8C / #52B8C8 + cincin |
| **Belum dinilai** | abu-abu **arsir** + garis putus + "?". Tidak pernah tampil seperti Low (sesuai catatan di Excel: "data belum lengkap tidak boleh dianggap berisiko rendah") |

Palet ini divalidasi colorblind-safe dan kontras AA dengan validator skill `dataviz`. Kategori **selalu** tampil dengan warna, bentuk, dan label.

### 6.1 Storytelling dashboard (atas → bawah, tiap section menjawab satu pertanyaan)

| # | Section | Pertanyaan | Visual |
|---|---|---|---|
| A | **Cakupan Penilaian** | "Seberapa bisa angka ini dipercaya?" | Progress bar bersegmen per kategori + kalimat "1 dari 136 aset sudah dinilai" |
| B | **Peringatan Data** | "Apa yang sudah jelas salah sekarang?" | Daftar bergaris: hak kedaluwarsa, placeholder nilai/luas, tgl masa depan, masing-masing dengan link ke daftar terfilter |
| C | **Sebaran Kategori** | "Di mana risikonya?" | Satu stacked bar horizontal 5 segmen dengan label langsung (bukan pie) |
| D | **Eksposur Nilai** | "Berapa nilai yang dipertaruhkan?" | Top-10 nilai buku dengan marker risiko. Saat coverage ≥30%, tersedia toggle scatter skor × nilai (log). Tersedia juga "Nilai per kategori" (Rp) |
| E | **Matriks Indikator** | "Kenapa berisiko?" | Heatmap aset × 6 indikator (bobot di header), angka di sel, sel kosong diarsir; plus rata-rata per indikator |
| F | **Wilayah & Jenis** | "Di mana dan apa?" | Tabel dengan mini stacked bar: wilayah × jenis × idle (Rp) |
| G | **Jadwal Monitoring** | "Apa yang harus dikerjakan minggu/bulan ini?" | Overdue di atas, lalu timeline per bulan, chip interval |
| H | **Tren** (saat riwayat ≥2 periode) | "Membaik atau memburuk?" | Line skor rata-rata dan jumlah Critical/High per bulan |

**Adaptif terhadap coverage:**
- Saat coverage < 20%, A dan B menjadi lead, C–E diberi label "sementara", dan ada CTA tunggal "Mulai penilaian — urut dari nilai buku tertinggi".
- Saat coverage tinggi, A menyusut menjadi bar tipis, C menjadi lead, dan G naik ke atas.

### 6.2 Halaman

1. **Dashboard** (di atas)
2. **Aset:** tabel dengan filter wilayah/jenis/kategori/pemanfaatan/status jadwal (persist di URL), pencarian, kolom bisa dipilih, export.
3. **Detail aset:** identitas, skor, profil 6 indikator (bar per indikator dengan rubrik), peringatan, riwayat penilaian (sparkline), riwayat monitoring, audit.
4. **Form penilaian:** tiap indikator berupa radio 1–5 **full-width dengan teks rubrik dari Kriteria Skor**, opsi "belum diketahui", preview skor dan kategori live, catatan wajib bila skor ≥4 atau ada override, simpan draf.
5. **Catat monitoring:** form cepat (tanggal, metode, temuan, foto ke Storage), mobile-first untuk site visit.
6. **Jadwal:** list + kalender bulan, filter PIC.
7. **Import / Export**
8. **Pengaturan** (admin): allowlist user dan role, parameter skor berversi, rubrik, alias mapping.
9. **Panduan:** isi sheet Petunjuk.

### 6.3 Aturan UX

- **Responsif:**
  - Desktop memakai sidebar.
  - Mobile memakai bottom nav (Dashboard / Aset / Jadwal / Input). Filter tampil di bottom sheet. Tabel berubah menjadi list kartu ringkas. Heatmap berubah menjadi 6 sel mini per baris.
  - Touch target 44 px.
- **Format angka:** `id-ID`, dengan `Rp22,0 M`, `Rp850 jt`, dan nilai eksak di tooltip. Tanggal ditulis `12 Mei 2027`. Placeholder ditampilkan "—" dengan ikon peringatan.
- **State:** setiap section punya state empty (dengan langkah berikutnya), skeleton, dan error inline dengan tombol coba lagi.
- **Optimistic update** pada CRUD, plus toast dengan tombol Urungkan untuk hapus (soft delete).
- **Aksesibilitas WCAG 2.2 AA:** keyboard penuh, tiap chart punya toggle "Tampilkan tabel", `aria-label` di sel heatmap, `prefers-reduced-motion`.
- **Bahasa:** Indonesia (`lang="id"`). Mode **terang/gelap** mengikuti sistem dan bisa diubah manual.

---

## 7. Struktur proyek

```
app/
  (auth)/login/            → tombol "Masuk dengan Google"
  auth/callback/route.ts   → exchange code
  (app)/layout.tsx         → shell (sidebar/bottom-nav), guard sesi
  (app)/dashboard/  aset/[id]/  aset/[id]/nilai/  jadwal/  import/  pengaturan/  panduan/
lib/
  supabase/{server,client,proxy}.ts
  scoring/ (mirror TS + test parity)   excel/ (worker parse, mapping, export)
  validation/ (zod schemas bersama)    format/ (Rp, tanggal id-ID)
components/ ui/ (shadcn kustom)  charts/  risk/ (RiskBadge, ScoreBar, Heatmap)
supabase/
  migrations/  seed.sql (parameter, kriteria, region, data dari Excel)  config.toml
proxy.ts   next.config.ts   DESIGN.md   docs/PLAN.md
```

---

## 8. Rencana eksekusi (sub-agent, model dinamis)

| Fase | Isi | Model | Gate selesai |
|---|---|---|---|
| 0 | Keputusan terbuka (§9) dijawab, `DESIGN.md` dan token final | Opus (keputusan), Sonnet (DESIGN.md) | Disetujui user |
| 1 | Scaffold Next 16 + Tailwind 4 + shadcn, lint/test tooling, struktur folder | **Haiku** | `pnpm build` hijau |
| 2 | Skema DB, RLS, auth hook allowlist, fungsi skor, view, RPC, migrations, seed dari Excel | **Opus** (skema, RLS, keamanan), **Sonnet** (seed script) | Test SQL: skor 47 = Medium, RLS menolak user non-allowlist |
| 3 | Auth Google + proxy + guard role | **Sonnet** | Login OK, akun non-allowlist ditolak |
| 4 | Design system: token, komponen risk, chart primitives | **Sonnet** + skill impeccable/dataviz | Review visual, light/dark |
| 5 | Dashboard + RPC summary (storytelling §6.1) | **Opus** (RPC + layout), **Sonnet** (chart) | Angka cocok dengan Excel (D8 diperbaiki) |
| 6 | Aset (tabel, detail), form penilaian, catat monitoring, jadwal | **Sonnet** | CRUD + optimistic + test |
| 7 | Import/export Excel (worker, validasi, preview, commit transaksional) | **Opus** (validasi + transaksi), **Sonnet** (UI) | File asli terimport: 136 aset, warning D1–D5 muncul |
| 8 | Pengaturan (allowlist, parameter berversi, alias) | **Sonnet** | Hanya admin yang bisa akses |
| 9 | Hardening: security review, a11y audit, Lighthouse, Playwright e2e | **Opus** (security), **Sonnet** (a11y/perf), **Haiku** (lint/fix mekanis) | Tidak ada temuan high, target §3.1 tercapai |
| 10 | Deploy: Vercel + integrasi Supabase, env, domain, README runbook | **Haiku** + checklist | Production live |

Setiap fase berakhir dengan verifikasi oleh agent terpisah. Untuk fase berisiko (2, 7, 9) verifikasi memakai Opus.

---

## 9. Keputusan

### Sudah diputuskan (19 Nov 2026)
1. **Role:** saat ini semua user setara (1 pengelola). Struktur tetap siap RBAC: kolom `role` di `allowed_emails` dengan default `admin`, helper `has_role()` di RLS, dan guard `requireRole()` di Server Action. Dengan begitu admin/editor/viewer cukup diaktifkan nanti tanpa migrasi besar.
2. **Periodisasi:** penilaian disimpan sebagai **riwayat per periode** (append-only). Tren dan audit tersedia.
3. **Status Pemanfaatan:** memakai **daftar validasi Excel** (Digunakan sendiri, Disewakan/Kerja sama, Idle/Kosong, Digunakan pihak lain, Lainnya). Alias import: Idle → Idle/Kosong. "Produktif" ditandai *perlu review* dengan default sementara "Digunakan sendiri", lalu bisa dikoreksi massal.
4. **Placeholder:** data asli akan menyusul. Rp1, 1 m², dan tanggal di masa depan ditandai dan dikecualikan dari agregat. Disediakan alur **update massal via import** (upsert berdasarkan ID Aset, hanya kolom yang terisi yang diperbarui) serta daftar "Data perlu dilengkapi".

5. **Parameter:** bobot, ambang kategori, interval, metode, dan rubrik **bisa diubah di app dan berversi** (`scoring_params` + `score_criteria` per versi). Setiap perubahan membuat versi baru. Skor lama tetap memakai versi saat dinilai. Admin bisa memicu "hitung ulang dengan versi aktif" secara eksplisit, dengan preview dampak (berapa aset pindah kategori) sebelum diterapkan.
6. **Infrastruktur:** repo GitHub dan project Supabase **belum ada**. Rencana memakai Supabase **Free**, region **Singapore (ap-southeast-1)**, dan Vercel **Hobby**, region fungsi `sin1`. Konsekuensinya:
   - Project Supabase Free di-*pause* setelah ±7 hari tidak aktif. Mitigasinya: cron Vercel harian (ping ringan) atau upgrade ke Pro.
   - Free tidak punya backup otomatis harian yang bisa di-restore (PITR). Mitigasinya: tombol export Excel penuh dan `pg_dump` terjadwal via GitHub Actions ke artifact privat.
   - Vercel Hobby ditujukan untuk penggunaan non-komersial. Untuk penggunaan resmi perusahaan sebaiknya Pro.
7. **Foto/dokumen bukti:** **ditunda**. Skema disiapkan agar mudah ditambah (tabel `attachments` polimorfik + bucket Storage privat di fase lanjutan), tapi tidak dibangun sekarang. Prioritasnya adalah data lengkap sesuai seed Excel.
8. **Rubrik Pemanfaatan skor 3:** memakai rekomendasi di bawah, disimpan sebagai `score_criteria` **versi 1**, ditandai "direvisi dari Excel".

### Rubrik Pemanfaatan — revisi skor 3

Masalahnya, teks skor 3 identik dengan skor 2, padahal skor 4 sudah membahas "idle tanpa pengamanan dan rencana". Skor 3 perlu menjadi jembatan: **ada masalah nyata, tapi masih terkendali dan sedang ditangani**.

| Skor | Teks |
|---|---|
| 2 (tetap) | Aset dimanfaatkan sesuai peruntukan, tetapi terdapat kekurangan minor dalam administrasi atau optimalisasi penggunaan. |
| **3 (baru)** | Aset belum dimanfaatkan secara optimal atau idle sebagian/seluruhnya, namun masih dalam pengamanan perusahaan dan memiliki rencana pemanfaatan; atau terdapat kewajiban mitra/perjanjian yang belum terpenuhi sebagian (mis. tunggakan, izin/administrasi kedaluwarsa) yang sedang dalam proses penyelesaian. |
| 4 (tetap) | Aset tidak dimanfaatkan sesuai peruntukan, terdapat pelanggaran kewajiban mitra, perjanjian bermasalah, atau aset idle tanpa pengamanan dan rencana pemanfaatan yang jelas. |

Pembeda kunci antar skor:
- **Skor 2:** kekurangan minor.
- **Skor 3:** idle atau masalah mitra, tetapi **terkendali dan ada rencana**.
- **Skor 4:** **tanpa** pengamanan/rencana, atau ada pelanggaran.

Dampaknya langsung terasa: 13 tanah idle saat ini akan tepat dinilai 3 atau 4, tergantung ada tidaknya rencana pemanfaatan. Teks ini tetap bisa diubah di app (versi 2) setelah dikonfirmasi pemilik proses.

---

## 10. Status fase

| Fase | Status |
|---|---|
| Analisa & plan | ✅ selesai (19 Nov 2026) |
| 0 — Design system & DESIGN.md | ✅ selesai & disetujui user (19 Nov 2026): palet (High terang = terakota `#C26159`), alur dashboard sadar-cakupan, penggantian primitif UI prototipe dengan shadcn di Fase 1 |
| 1 — Scaffold | ✅ selesai (19 Nov 2026): verifikasi opus "lolos bersyarat", temuan minor sudah diperbaiki |
| 2 — Skema DB, RLS, allowlist, seed | ⏭ berikutnya: jalankan `/fase-2` di sesi baru (butuh Docker untuk Supabase lokal) |

### Hasil Fase 0
- `DESIGN.md` final: token light/dark lolos validator palet `dataviz` (exit 0 kedua mode) dan 116/116 pasangan kontras AA; §12 berisi keputusan dari kritik prototipe.
- Data: `design/data/assets.json` (136 aset, parameter, rubrik 6×5 dengan revisi Pemanfaatan skor 3, 1 penilaian). Angka terverifikasi: Rp143,9 M, 13 idle (Rp42,4 M), 3 hak lewat + 1 < 12 bln, skor 251116 = 47,0 Medium.
- Prototipe: `design/prototype/` (Vite + React 19 + TS + Tailwind 4 + Recharts, bun; `bun run dev`, `bun run build` → satu file `dist/index.html`). Komponen `components/risk/*`, `components/charts/*`, `lib/format.ts`, `lib/scoring.ts` dirancang untuk dipindah ke Next.js.
- Kritik independen opus: "lolos bersyarat" → 4 P0 + 9 P1 + 4 P2 diperbaiki (P1 #12 parsial: bar Recharts belum fokus keyboard, ada alternatif daftar link).
- Verifikasi Playwright: 9 rute × 1440/375 × terang/gelap tanpa horizontal scroll & tanpa error konsol. Screenshot di `design/screenshots/`.
- Penyimpangan prototipe: komponen UI ditulis tangan (belum shadcn/Radix) — di Fase 1/4 diganti shadcn yang dikustom ke token.
- Rekomendasi stack tidak berubah: Next.js 16 + bun sebagai package manager/runtime dev.

### Hasil Fase 1
- **Versi (pin persis, ≤ 5 Nov 2026):** Next.js 16.4.5, React 19.3.0, Tailwind 4.3.4, TypeScript 5.9.3, @supabase/ssr 0.12.7, supabase-js 2.119.0, Supabase CLI 3.0.0, Recharts 3.10.1, TanStack Table 8.21.3, zod 4.6.7, Vitest 5.1.0, Playwright 1.65.0, radix-ui 1.8.1, next-themes 0.4.6, SheetJS 0.20.3 (tarball cdn.sheetjs.com). `bun audit` bersih.
- **Design system:** `app/globals.css` = DESIGN.md §10 tanpa perubahan hex. Penyimpangan yang terdokumentasi:
  - variabel font berganti nama menjadi `--ff-*`;
  - `--accent` shadcn → `--accent-hover` (surface-sunken), aksen merek tersedia sebagai `bg-primary`/`bg-brand`;
  - tambahan `--heat-fg-*`.
- **shadcn:** 16 komponen dikustom ke token (radius ≤ 4px, bayangan hanya untuk overlay, target sentuh 44px).
- **Komponen & lib:** `lib/format`, `lib/scoring` (mirror TS + `DEFAULT_PARAMS` v1), `components/risk`, `components/charts` (berbasis props), `components/ledger`.
- **Shell:** sidebar ≥1024px ↔ bottom-nav, skip link, tema terang/gelap/sistem. Ada 8 rute placeholder dengan empty state jujur, plus login dan `auth/callback` (sudah aman dari open redirect).
- **Proxy & header:** `proxy.ts` memakai pola `@supabase/ssr` (getClaims + header no-cache). Redirect dan allowlist baru ditegakkan di Fase 3. Header keamanan sudah aktif: CSP, HSTS, XFO DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP.
- **Kualitas:** lint, typecheck (`next typegen && tsc`), Vitest 16 test (parity 47,0 Medium), build, dan Playwright smoke 8 test (1440 + 375) semuanya hijau. Screenshot ada di `docs/screenshots/fase-1/`.
- **Catatan lanjutan:**
  - CSP masih `'unsafe-inline'` untuk script (dievaluasi ke nonce di Fase 9).
  - `NEXT_PUBLIC_SUPABASE_URL` wajib di-set saat build/start agar masuk CSP.
  - Port 3000 di mesin dev dipakai app lain, sehingga e2e memakai 3100. `site_url` Supabase lokal perlu disesuaikan di Fase 2/3.
