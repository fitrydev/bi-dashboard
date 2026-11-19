---
description: Fase 0 — finalisasi design system (DESIGN.md, token, palet risiko tervalidasi) + prototipe visual statis dashboard dengan data asli Excel, untuk disetujui sebelum scaffold.
---

# Fase 0 — Design System & Prototipe Visual

Anda adalah senior data analyst + UI/UX designer + software engineer untuk proyek ini. Bahasa komunikasi dan copy UI: **Bahasa Indonesia**.

## Konteks wajib dibaca dulu (jangan dilewati)

1. `docs/PLAN.md` — terutama §1, §3, §6 (UX & desain), §9 (keputusan), §10 (status).
2. `docs/ANALISA_EXCEL.md` — terutama §5 (matriks chart yang SUDAH DISETUJUI user; jangan diganti tanpa alasan kuat).
3. Sumber data: `source/Template_Matriks_Risiko_Monitoring_Aset_2027.xlsx` (read-only; jangan diubah).

Jangan mengulang analisa Excel — sudah selesai. Fokus fase ini hanya desain.

## Aturan kerja: sub-agent driven, model dinamis

- **haiku** → tugas mekanis/ringan: ekstraksi data ke JSON, cek kontras, rapikan file, cek link.
- **sonnet** → tugas sedang: menulis DESIGN.md, membangun prototipe HTML, komponen chart.
- **opus** → tugas berat/keputusan & verifikasi akhir: kritik desain independen (anti AI-slop), keputusan token final.
- Jalankan agent independen secara paralel. Beri brief yang lengkap (agent tidak punya konteks sesi ini). Jangan kerjakan ulang apa yang sudah didelegasikan.
- Skill yang wajib dipakai oleh agent desain: `impeccable`, `ui-ux-pro-max`, `dataviz` (termasuk validator palet), `design-taste-frontend` (gate anti-slop), `frontend-design`, `accessibility`. Opsional: `awesome-design-md` untuk format DESIGN.md.

## Larangan desain (anti AI-slop)

Tidak ada: gradien ungu/biru, glassmorphism, grid kartu di mana-mana, ikon emoji, hero metric kosong, pie/donut/gauge/radar untuk perbandingan, shadow tebal, rounded pill di semua elemen, copy generik ("Unlock insights…"). Arah visual: **"Buku Besar Risiko"** (ledger/register aset: kertas hangat, tinta, hairline rule, warna saturasi HANYA untuk risiko). "Belum dinilai" = abu arsir + garis putus + "?", tidak pernah mirip Low.

## Langkah

1. **(haiku)** Ekstrak data Excel ke `design/data/assets.json` (136 aset + 1 penilaian + parameter + kriteria skor, rubrik Pemanfaatan skor 3 memakai teks revisi di PLAN §9). Gunakan Python di venv sementara (`python -I`), skrip di luar folder proyek.
2. **(sonnet)** Tulis `DESIGN.md` di root: prinsip, token (warna light/dark, tipografi + tabular-nums, skala, spacing, radius, elevation, motion), palet risiko + penanda bentuk, aturan chart per tipe (mengacu ANALISA_EXCEL §5), format angka id-ID (Rp22,0 M / Rp850 jt / 12 Mei 2027), pola komponen (RiskBadge, ScoreBar, Heatmap cell, filter bar, tabel, empty/loading/error state), responsif (breakpoint, sidebar ↔ bottom-nav, tabel → list), aksesibilitas WCAG 2.2 AA. Token ditulis juga sebagai blok CSS variables siap pakai untuk Tailwind 4 `@theme`.
3. **(haiku)** Jalankan validator palet skill `dataviz` + cek kontras AA untuk light & dark; laporkan pasangan yang gagal → **(sonnet)** perbaiki token sampai lolos.
4. **(sonnet)** Bangun prototipe statis `design/prototype/index.html` (HTML + CSS + JS vanilla/inline SVG, tanpa build step) memakai `design/data/assets.json` asli: halaman Dashboard (storytelling §6.1 PLAN, kondisi nyata coverage 1/136), Detail Aset, Form Penilaian (rubrik full-width, skala 1 = risiko rendah … 5 = tinggi), Import preview. Light/dark toggle, responsif 375px–1440px.
5. **(opus)** Kritik independen: berikan prototipe + DESIGN.md (bukan kesimpulan Anda) ke agent opus dengan skill `impeccable` (mode critique) dan `design-taste-frontend`. Minta temuan konkret (hierarki, keterbacaan, slop, aksesibilitas, mobile). → **(sonnet)** perbaiki.
6. Verifikasi di browser nyata (skill `playwright-cli` atau `run`): screenshot desktop 1440 & mobile 375, light & dark; pastikan tidak ada horizontal scroll dan angka cocok dengan data (136 aset, Rp143,9 M, 13 idle, 3 hak kedaluwarsa, 1 dinilai skor 47 Medium).
7. Publikasikan prototipe sebagai Artifact (privat) agar user bisa review di browser/HP, beri link.
8. Update `docs/PLAN.md` §10 (status Fase 0) dan buat `.claude/commands/fase-1.md` (scaffold Next.js 16 + Tailwind 4 + shadcn + Supabase lokal, sesuai PLAN §3, §7, §8) — **jangan jalankan Fase 1**.

## Definisi selesai

- `DESIGN.md` final, token lolos validator & kontras AA (light + dark).
- Prototipe berjalan, lolos kritik opus, screenshot terlampir, artifact link diberikan.
- Ringkasan untuk user: keputusan desain utama, hal yang perlu persetujuan, dan cara memulai Fase 1.

Berhenti dan tanyakan ke user hanya jika ada keputusan yang benar-benar milik user (mis. nama aplikasi/branding/logo perusahaan).

$ARGUMENTS
