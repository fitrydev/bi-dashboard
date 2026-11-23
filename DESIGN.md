# DESIGN.md — Buku Besar Risiko

Design system untuk **Risk-Based Asset Monitoring 2027** (pengganti Excel register risiko aset properti).
Status: v0.1 (Fase 0), 19 Nov 2026. Sumber keputusan: `docs/PLAN.md` §6, `docs/ANALISA_EXCEL.md` §5.
Bahasa dokumen: Indonesia; token dan istilah teknis tetap Inggris.

Mode permukaan: **Operate** (dashboard, tabel, form). Ambisi tampil sebagai presisi dan ketenangan, bukan ornamen.

---

## 0. Arah visual

Metafora: **buku besar / register audit**. Lembar kertas hangat, tulisan tinta, garis tipis (hairline) sebagai pemisah, angka sejajar desimal, kolom rapat tapi bernapas. Dashboard dibaca seperti halaman register: judul bagian berupa kalimat temuan, isi berupa baris bergaris, bukan kotak-kotak kartu.

Tiga aturan penentu:

1. **Warna saturasi hanya milik kategori risiko** (dan error/peringatan yang setara). Segala hal lain: kertas, tinta, hairline.
2. **Struktur dibuat oleh garis dan jarak**, bukan oleh kartu, bayangan, atau latar berwarna.
3. **Kategori selalu tampil sebagai warna + bentuk + label.** Tidak pernah salah satunya.

Dilarang (gate anti-slop, wajib dicek sebelum merge UI):

- gradien (apalagi ungu/biru), glassmorphism, blur latar, glow, shadow tebal
- grid kartu seragam sebagai pembungkus semua konten; kartu di dalam kartu
- ikon emoji; ikon dekoratif tanpa fungsi; ikon di dalam lingkaran berwarna di atas setiap judul
- hero metric kosong (angka besar tanpa konteks/pembanding/aksi); deretan 3–4 KPI tile identik
- pie, donut, gauge, radar, chart 3D, dual-axis
- rounded pill di semua elemen; radius > 4px pada kontrol dan panel
- aksen biru SaaS, tombol primer berwarna cerah
- copy generik ("Unlock insights", "Powerful analytics", "Welcome back!")
- side-stripe (border-left tebal berwarna) sebagai penanda alert/kartu

---

## 1. Prinsip

1. **Coverage sebelum skor.** Saat baru 1 dari 136 aset dinilai (0,7%), angka rata-rata atau sebaran kategori menyesatkan. Urutan informasi: seberapa bisa dipercaya → apa yang jelas salah → baru risiko. Chart risiko diberi label "sementara" bila coverage < 20%.
2. **Belum dinilai ≠ rendah.** "Belum dinilai" punya kategori sendiri: abu-abu arsir, garis putus, "?". Ia tidak pernah memakai warna, bentuk, atau urutan Low, dan tidak masuk rata-rata.
3. **Angka bisa diaudit.** Setiap angka agregat bisa ditelusuri: klik membuka daftar aset terfilter (filter di URL); nilai eksak ada di tooltip; skor menampilkan versi parameter. Placeholder (Rp1, 1 m²) tampil "—" + peringatan, dikecualikan dari agregat, dan dicatat kaki.
4. **Judul chart adalah temuan.** "20 aset memegang 50% nilai buku", bukan "Distribusi nilai". Tiap chart menjawab satu pertanyaan.
5. **Kepadatan tenang.** Informasi padat (tabel register, heatmap 136 baris) tetapi hierarki jelas: satu titik fokus per bagian, hairline bukan kotak, jarak 4px-grid yang konsisten.
6. **Warna adalah kosakata terbatas.** Empat hue risiko + abu arsir. Tidak ada warna dekoratif; tidak ada warna kategori dipakai untuk hal lain.
7. **Tidak ada jalan buntu.** Setiap bagian punya state empty (dengan langkah berikut), loading (skeleton sesuai layout), dan error inline dengan "Coba lagi". Hapus selalu bisa diurungkan.

---

## 2. Token

### 2.1 Warna netral

Seluruh nilai hex eksplisit. Rasio = WCAG 2.x terhadap `surface` pada mode yang sama (dihitung dengan skrip lokal).

| Token | Light | Rasio | Dark | Rasio | Peran |
|---|---|---|---|---|---|
| `surface` (paper) | `#FBFAF7` | — | `#15181B` | — | latar halaman |
| `surface-raised` | `#FFFFFF` | 1,04 | `#1C2024` | 1,09 | overlay, popover, sheet, input |
| `surface-sunken` | `#F3F1EA` | — | `#101316` | — | band baris zebra tipis, header tabel |
| `ink` | `#1A1D21` | 16,20 | `#ECE9E1` | 14,69 | teks utama |
| `ink-muted` | `#4A4F55` | 7,92 | `#B4B0A6` | 8,23 | teks sekunder, label sumbu |
| `ink-subtle` | `#676B6F` | 5,15 | `#8D8A82` | 5,17 | metadata, placeholder, caption (lolos 4,5:1 di ketiga surface: 5,15 / 4,75 di `surface-sunken`) |
| `rule` | `#D9D4C7` | 1,42 | `#2E343A` | 1,42 | hairline dekoratif (pemisah baris/bagian) |
| `rule-strong` | `#8F8A7C` | 3,30 | `#6A727A` | 3,65 | batas kontrol (input, checkbox), garis sumbu, garis arsir |
| `focus` | `#1A1D21` | 16,20 | `#ECE9E1` | 14,69 | cincin fokus (2px + offset 2px) |
| `accent` (tinta) | `#1A1D21` | 16,20 | `#ECE9E1` | 14,69 | tombol primer = tinta pekat, link = tinta + garis bawah |
| `accent-fg` | `#FBFAF7` | 16,20 | `#15181B` | 14,69 | teks di atas `accent` |

Catatan:

- `rule` (1,42:1) hanya untuk garis pemisah dekoratif. Batas kontrol interaktif memakai `rule-strong` (≥3:1, WCAG 1.4.11).
- Tidak ada warna aksen berwarna. Tombol primer = blok tinta; sekunder = outline `rule-strong`; tersier = teks bergaris bawah.
- Link: warna `ink`, `text-decoration: underline` 1px, offset 2px; hover menebalkan 2px. Bukan biru.

### 2.2 Status (non-risiko)

Dipakai hemat. Error/peringatan data berbagi keluarga warna dengan Critical/High agar tidak menambah hue baru; bedanya selalu ikon + teks.

| Token | Light | Rasio | Dark | Rasio | Pakai untuk |
|---|---|---|---|---|---|
| `status-error` | `#B42318` | 6,30 | `#FF8F8F` | 8,13 | gagal simpan, validasi form |
| `status-warning-ink` | `#7A4B00` | 7,10 | `#F2D24B` | 11,96 | peringatan data (hak kedaluwarsa, placeholder) |
| `status-warning-bg` | `#FBF0D6` | — | `#2E2710` | — | latar baris Peringatan Data (opsional, tipis) |
| `status-success-ink` | `#1B6E3C` | 6,02 | `#6FCB8E` | 9,00 | hanya konfirmasi simpan; jangan untuk "Low" |

Success hijau tidak boleh dipakai menandai kategori Low (Low = teal). Toast sukses cukup teks tinta + ikon centang; hijau hanya pada ikon.

### 2.3 Palet risiko

Pemisahan token (jawaban atas masalah Medium kuning):

- **fill**: warna area/segmen/marker. Wajib ≥ 3:1 terhadap `surface` **dan** `surface-raised` (komponen grafis, 1.4.11); semua fill lolos tanpa relief (terendah: Medium light 3,04 / 3,17).
- **ink**: varian gelap (light) / terang (dark) untuk **teks** label kategori. ≥ 4,5:1 terhadap `surface` dan terhadap `tint`-nya.
- **tint**: latar sangat tipis untuk baris/badge/sel. Teks `ink` di atas `tint` ≥ 4,5:1.
- **shape**: penanda bentuk, selalu menyertai warna.

**Light** (surface `#FBFAF7`):

| Kategori | Ambang | fill | rasio fill | ink | rasio ink | tint | ink/tint | shape |
|---|---|---|---|---|---|---|---|---|
| Critical | ≥80 atau override | `#9E1B1B` | 7,66 | `#8A1717` | 9,08 | `#F7E3E1` | 7,69 | belah ketupat |
| High | ≥60 | `#C26159` | 3,91 | `#9A3A08` | 6,75 | `#FBE8DA` | 5,92 | segitiga |
| Medium | ≥40 | `#AC8E04` | 3,04 | `#6B5000` | 7,26 | `#F8EDC8` | 6,47 | lingkaran |
| Low | <40 | `#047E9C` | 4,50 | `#046078` | 6,82 | `#DAEDF2` | 5,89 | cincin |
| Belum dinilai | skor kosong | `#6E6A5F` (garis) | 5,17 | `#4A4F55` | 7,92 | arsir (lihat 2.4) | — | "?" kotak putus |

**Dark** (surface `#15181B`):

| Kategori | fill | rasio fill | ink | rasio ink | tint | ink/tint | shape |
|---|---|---|---|---|---|---|---|
| Critical | `#F55565` | 5,41 | `#FF8F8F` | 8,13 | `#3A1A1C` | 7,12 | belah ketupat |
| High | `#B15604` | 3,57 | `#FFAE63` | 9,75 | `#3A2614` | 7,83 | segitiga |
| Medium | `#A59323` | 5,77 | `#F2D24B` | 11,96 | `#38310F` | 8,73 | lingkaran |
| Low | `#00A0C7` | 5,82 | `#6FCBDA` | 9,53 | `#12343A` | 7,12 | cincin |
| Belum dinilai | `#9A978D` | 6,10 | `#B4B0A6` | 8,23 | arsir | — | "?" kotak putus |

Keputusan dan catatan penyesuaian (revisi 19 Nov 2026, setelah validasi):

- **Critical light** tetap `#9E1B1B` (merah tua, paling berat). **Low light** tetap `#047E9C`.
- **Light:** High `#E05A12` → `#C26159` (terakota/bata, 3,91:1) dan Medium `#C9A400` → `#AC8E04` (mustard/oker, 3,04:1 terhadap `surface`, 3,17:1 terhadap `surface-raised`). Medium sebelumnya 2,29:1 dan "relief" tidak lagi diterima. Mustard ≥ 3:1 bertabrakan dengan oranye pada simulasi deutan/protan; pencarian numerik (ribuan kandidat) menunjukkan High oranye jenuh (`#E05A12`) dan Medium ≥ 3:1 tidak bisa lolos pemisahan sekaligus, sehingga High digeser ke terakota (kurang oranye, lebih merah-bata). Konsekuensi: High light kini lebih dekat ke keluarga merah; High vs Critical tetap terpisah (ΔE normal 15,6) dan dibedakan bentuk (segitiga vs belah ketupat) + label.
- **Dark** dibawa ke band lightness validator (OKLCH L 0,48–0,67): Critical `#F55565`, High `#B15604`, Medium `#A59323`, Low `#00A0C7`; semua ≥ 3:1 terhadap `surface` dan `surface-raised` dark. Deviasi "dark sengaja terang" sebelumnya dicabut. Ink/tint dark tidak berubah (teks tetap terang, ≥ 4,5:1).
- **Aturan stroke marker (semua kategori, kedua mode):** marker memakai stroke 1,5px `surface` (bukan `ink` kategori) agar bentuk terpisah dari latar/marker lain. Rasio stroke terhadap fill ≥ 3:1: light Critical 7,66, High 3,91, Medium 3,04, Low 4,50; dark Critical 5,41, High 3,57, Medium 5,77, Low 5,82. Stroke `ink` kategori **tidak** dipakai (dark Medium sebelumnya 1,11:1).
- Teks "Medium" tetap tidak pernah memakai fill; selalu `risk-medium-ink`.
- Tabel segmen bar, legend, dan label langsung tetap wajib (aturan 1.4.1), bukan lagi "relief" kontras.

#### Hasil validasi

Tanggal: 19 Nov 2026.

| Perintah | Hasil |
|---|---|
| `node validate_palette.js "#9E1B1B,#C26159,#AC8E04,#047E9C" --mode light --surface "#FBFAF7"` | exit 0; band, chroma, CVD (ΔE 8,3 deutan), normal-vision 15,2, kontras 4/4 ≥ 3:1: 5/5 lolos |
| `node validate_palette.js "#F55565,#B15604,#A59323,#00A0C7" --mode dark --surface "#15181B"` | exit 0; band L 0,48–0,67, CVD ΔE 10,0 (deutan), normal-vision 15,1, kontras 4/4: 5/5 lolos |
| `node /tmp/fase0-val/wcag.js DESIGN.md` | 0 kegagalan (teks ≥ 4,5:1; grafis ≥ 3:1; heatmap per langkah ≥ 4,5:1) |

Hairline `rule` (1,42:1) dekoratif, bukan batas kontrol; batas kontrol memakai `rule-strong`.

### 2.4 Hatch "Belum dinilai"

Abu-abu arsir 45°, garis tipis, dengan batas putus dan huruf "?". Tidak pernah terisi solid. Digunakan: segmen sisa di progress bar, sel kosong heatmap, bar "belum dinilai" di stacked bar, badge.

CSS (area/sel/segmen):

```css
.hatch-unrated {
  background-color: var(--surface);
  background-image: repeating-linear-gradient(
    45deg,
    var(--hatch-line) 0 1px,
    transparent 1px 6px
  );
  outline: 1px dashed var(--hatch-line);
  outline-offset: -1px;
}
```

Token: `--hatch-line` = `rule-strong` (light `#8F8A7C`, dark `#6A727A`, ≥3:1). Jarak garis 6px (rapat = "terisi sebagian"; jangan < 4px agar tidak berubah jadi abu rata).

SVG pattern (untuk chart/Recharts/SVG custom), id unik per instance:

```svg
<svg width="0" height="0" aria-hidden="true" focusable="false">
  <defs>
    <pattern id="hatch-unrated" width="6" height="6" patternUnits="userSpaceOnUse"
             patternTransform="rotate(45)">
      <rect width="6" height="6" fill="var(--surface)"/>
      <line x1="0" y1="0" x2="0" y2="6" stroke="var(--hatch-line)" stroke-width="1"/>
    </pattern>
  </defs>
</svg>
<!-- pakai: <rect fill="url(#hatch-unrated)" stroke="var(--hatch-line)" stroke-dasharray="3 2"/> -->
```

Aturan: sel heatmap kosong juga memuat "?" kecil (`ink-muted`) dan `aria-label="Belum dinilai"`. Warna garis tidak mengikuti kategori mana pun.

### 2.5 Tipografi

| Peran | Font | Fallback |
|---|---|---|
| Judul halaman/bagian | **Fraunces** (variable, opsz) | `Georgia, "Times New Roman", serif` |
| UI, tabel, form, label | **IBM Plex Sans** | `system-ui, -apple-system, "Segoe UI", sans-serif` |
| ID aset, kode, nilai eksak di tooltip | **IBM Plex Mono** (opsional) | `ui-monospace, "SF Mono", Menlo, monospace` |

Muat via `next/font/google` (subset latin, `display: swap`, hanya bobot yang dipakai: Fraunces 400/600, Plex Sans 400/500/600, Plex Mono 400).

Aturan serif (Fraunces): **hanya** untuk `h1`, `h2` judul halaman dan judul bagian dashboard (kalimat temuan), serta angka kunci pada ringkasan Cakupan Penilaian bila perlu. Tidak untuk tombol, tabel, label, form, nav, tooltip, chart axis. Bobot 600 maksimal, `font-optical-sizing: auto`, `font-variation-settings: "SOFT" 0, "WONK" 0`.

Angka: **semua** angka memakai `font-variant-numeric: tabular-nums lining-nums`. Kolom angka rata kanan. Fraunces memakai `tabular-nums` bila angka muncul di judul.

Skala tipe (rasio ≈ 1,2; basis 16px; text UI default 14px karena kepadatan):

| Token | px / rem | line-height | weight | Dipakai |
|---|---|---|---|---|
| `text-display` | 32 / 2,0 | 1,15 | Fraunces 600 | judul halaman (jarang, h1) |
| `text-title` | 24 / 1,5 | 1,2 | Fraunces 600 | judul bagian (kalimat temuan) |
| `text-subtitle` | 18 / 1,125 | 1,3 | Fraunces 400 | sub-judul bagian |
| `text-body-lg` | 16 / 1,0 | 1,5 | Plex Sans 400 | paragraf Panduan, form rubrik |
| `text-body` | 14 / 0,875 | 1,45 | Plex Sans 400 | default UI, sel tabel |
| `text-label` | 13 / 0,8125 | 1,35 | Plex Sans 500 | label form, header kolom |
| `text-caption` | 12 / 0,75 | 1,35 | Plex Sans 400 | catatan kaki, metadata, sumbu chart |
| `text-mono` | 13 / 0,8125 | 1,4 | Plex Mono 400 | ID aset |

Aturan: tidak ada teks < 12px. Header kolom tabel `text-label` uppercase dilarang (sulit dibaca bahasa Indonesia panjang); gunakan sentence case. Letter-spacing 0 kecuali `text-display` (−0,01em). Panjang baris paragraf maks 68ch.

### 2.6 Spacing

Skala 4px. Token Tailwind default (`1` = 4px) dipakai langsung.

| Token | px | Pakai |
|---|---|---|
| `space-1` | 4 | jarak ikon–teks, padding badge |
| `space-2` | 8 | padding sel padat, gap kontrol |
| `space-3` | 12 | padding sel normal, gap list |
| `space-4` | 16 | gutter mobile, padding form |
| `space-6` | 24 | jarak antar blok dalam bagian |
| `space-8` | 32 | jarak antar bagian di dalam kolom |
| `space-12` | 48 | jarak antar bagian dashboard (desktop) |
| `space-16` | 64 | atas/bawah halaman (desktop) |

Ritme dashboard: bagian dipisah `border-top: 1px rule` + `padding-top: space-8`, bukan kartu. Tinggi baris tabel: 40px (padat) / 48px (nyaman), mobile baris list min 56px.

### 2.7 Radius

| Token | Nilai | Pakai |
|---|---|---|
| `radius-none` | 0 | tabel, segmen bar bertumpuk, hairline, banner Peringatan Data |
| `radius-sm` | 2px | badge, chip, sel heatmap |
| `radius-md` | 4px | input, tombol, popover, bottom sheet (sudut atas) |
| (ujung data bar) | 4px di ujung bebas, 0 di pangkal | batang chart (lihat §4) |

Tidak ada pill (`rounded-full`) kecuali: titik marker bentuk lingkaran/cincin dan avatar (jika kelak ada).

### 2.8 Elevation

Hierarki dibuat oleh hairline, bukan bayangan. Bayangan hanya untuk elemen yang melayang di atas konten.

| Token | Nilai light | Pakai |
|---|---|---|
| `shadow-none` | none | semua elemen in-flow |
| `shadow-overlay` | `0 1px 0 rgb(26 29 33 / .04), 0 4px 12px rgb(26 29 33 / .10)` | popover, tooltip, menu, bottom sheet, toast |
| `shadow-overlay` (dark) | `0 4px 12px rgb(0 0 0 / .45)` + `border: 1px rule-strong` | idem |

Overlay selalu juga punya `border: 1px solid var(--rule-strong)`. Dilarang: shadow blur > 16px, opacity > .15 (light), shadow berwarna.

### 2.9 Motion

| Token | Nilai |
|---|---|
| `duration-fast` | 100ms (hover, focus, toggle) |
| `duration-base` | 160ms (buka popover, sheet, expand baris) |
| `duration-max` | 200ms (batas atas; tidak ada animasi lebih lama) |
| `ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` |
| `ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` |

Aturan: animasikan hanya `opacity` dan `transform` (dan `background-color` hover). Tidak ada animasi masuk chart "menggambar"; tidak ada count-up angka; skeleton boleh shimmer statis (tanpa gerak) atau pulse opacity 1,4s. `prefers-reduced-motion: reduce` → semua durasi 0,01ms, tanpa transform, tanpa pulse.

### 2.10 Z-index

| Token | Nilai | Lapisan |
|---|---|---|
| `z-base` | 0 | konten |
| `z-sticky` | 10 | header tabel, filter bar sticky |
| `z-nav` | 20 | sidebar, bottom nav |
| `z-overlay` | 40 | popover, tooltip, dropdown |
| `z-sheet` | 50 | bottom sheet, dialog (dengan scrim `rgb(0 0 0 / .4)`) |
| `z-toast` | 60 | toast |

### 2.11 Breakpoint

| Nama | Min lebar | Perilaku |
|---|---|---|
| (base) | 0 (target 375) | satu kolom, bottom-nav |
| `md` | 768 | dua kolom bagian tertentu, tabel penuh mulai tampil di ≥ 768 jika kolom muat |
| `lg` | 1024 | sidebar tampil, tabel penuh |
| `xl` | 1440 | lebar konten maksimal 1360px, margin otomatis |

Konten maks 1360px; teks paragraf maks 68ch. Tailwind: `md:`/`lg:`/`xl:` default (768/1024/1280) diganti `xl: 1440px` di `@theme`.

---

## 3. Penanda bentuk risiko

Warna + bentuk + label, selalu. Ukuran standar marker 12×12 (inline dengan teks 14px), 16×16 pada legend/chart, 10×10 di dalam sel padat. Semua marker solid diberi stroke 1,5px `var(--surface)` (`paint-order: stroke`). Seluruh SVG `viewBox="0 0 16 16"`, `aria-hidden="true"` (label teks mendampingi; bila marker berdiri sendiri, beri `role="img"` + `aria-label`).

| Kategori | Bentuk | SVG (fill = `currentColor` mengikuti `risk-*-fill`) |
|---|---|---|
| Critical | Belah ketupat (solid) | `<path d="M8 1 15 8 8 15 1 8Z"/>` |
| High | Segitiga (solid) | `<path d="M8 2 15 14H1Z"/>` |
| Medium | Lingkaran (solid) | `<circle cx="8" cy="8" r="6"/>` |
| Low | Cincin (berlubang) | `<circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" stroke-width="2.5"/>` |
| Belum dinilai | Kotak putus + "?" | `<rect x="1.5" y="1.5" width="13" height="13" fill="none" stroke="var(--hatch-line)" stroke-width="1.25" stroke-dasharray="2.5 2"/><path d="M6 6.2a2 2 0 1 1 3 1.7c-.7.4-1 .8-1 1.6M8 11.7v.3" stroke="var(--risk-unrated-ink)" stroke-width="1.4" fill="none" stroke-linecap="round"/>` |

Override Critical (override=YA): sama dengan Critical, ditambah label "Override" dan garis bawah ganda pada badge (bukan warna baru).

Komponen `RiskMarker`:

```tsx
type RiskLevel = "critical" | "high" | "medium" | "low" | "unrated";
export const RISK_LABEL: Record<RiskLevel, string> = {
  critical: "Critical", high: "High", medium: "Medium", low: "Low", unrated: "Belum dinilai",
};
// <RiskMarker level="critical" size={12} /> menggambar path di atas dengan
// style={{ color: `var(--risk-${level})` }}
```

Urutan tampil kategori (kiri→kanan / atas→bawah): Critical, High, Medium, Low, Belum dinilai. "Belum dinilai" selalu terakhir dan dipisah celah ekstra; tidak pernah di antara kategori.

---

## 4. Aturan chart per tipe

Nomor `#` mengacu ke matriks `docs/ANALISA_EXCEL.md` §5.1 (sudah disetujui; jangan ganti jenis chart).

### 4.0 Aturan bersama (semua chart)

- **Judul = kalimat temuan** (`text-title` Fraunces, ≤ 2 baris), dihasilkan dari data ("1 dari 136 aset sudah dinilai", bukan "Cakupan"). Sub-judul `text-caption ink-subtle` menyebut periode data, versi parameter, dan catatan kaki agregat.
- **Rumah chart = bagian di halaman, bukan kartu.** Pemisah `border-top: 1px rule`. Tanpa bingkai, tanpa shadow.
- **Warna:** hanya palet risiko (fill) untuk kategori; seri non-kategori (mis. kurva Pareto, tren rata-rata) memakai `ink` dan `ink-muted`. Teks tidak pernah memakai fill (pakai token `ink`/`risk-*-ink`).
- **Marks:** batang tipis (maks 28px tebal), ujung data radius 4px, pangkal di baseline 0. Celah 2px `surface` antar segmen bertumpuk. Garis 2px, marker ≥ 8px (cincin ring 2px surface di marker yang menumpuk). Dilarang gradient fill, bayangan, glow.
- **Grid & sumbu:** hanya garis horizontal hairline `rule`; sumbu `rule-strong`; tidak ada grid vertikal kecuali heatmap. Label sumbu `text-caption ink-muted`, `tabular-nums`. Satu sumbu y saja (tidak ada dual-axis).
- **Label langsung** untuk ≤ 5 seri/segmen (nama + nilai dalam `ink`). Legend selalu ada bila ≥ 2 seri dan berisi marker bentuk + label. Tidak menaruh angka di tiap titik; hanya titik yang bercerita (maksimum, terbaru, outlier).
- **Interaksi:** hover/fokus menampilkan tooltip (`shadow-overlay`) dengan nilai eksak (mis. Rp22.012.345.678), kategori (marker + nama), dan tautan "Lihat aset". Klik segmen/bar → daftar aset terfilter (query string). Area klik ≥ 24px (idealnya 44px pada sentuh) meski mark lebih tipis.
- **Toggle "Tampilkan tabel":** tombol teks di pojok kanan atas bagian (`aria-pressed`), beralih ke tabel yang memuat data identik (bukan ringkasan). Status toggle di URL (`?tabel=c2`).
- **ARIA:** wadah `role="img"` hanya bila chart murni SVG tanpa elemen interaktif, dengan `aria-label` = judul temuan + ringkasan angka kunci. Chart interaktif: `role="group"` + `aria-labelledby` judul; tiap mark fokusabel (`tabindex=0` dengan roving tabindex pada satu chart) dengan `aria-label` "Critical: 1 aset, Rp22,0 M". Tabel alternatif adalah jalur utama bagi pembaca layar.
- **"Sementara" (coverage < 20%):** chart #2, #3, #4 (marker), #6, #7 mendapat penanda "Sementara" di sebelah judul (teks `ink-muted` + ikon jam pasir tinta, bukan warna), kalimat judul menyebut basis ("dari 1 aset yang sudah dinilai"), dan bagian ditaruh di bawah Cakupan dan Peringatan Data. Bagian #6 (scatter) tidak ditampilkan sama sekali sampai ≥ 30% dinilai; tampil empty state dengan CTA.
- **Belum dinilai** selalu seri tersendiri, arsir (§2.4), selalu di ujung, tidak ikut persen kategori kecuali dinyatakan ("dari 136 aset").
- **Placeholder (Rp1, 1 m²)** dikecualikan dari agregat; catatan kaki: "2 aset bernilai placeholder tidak dihitung" dengan tautan.
- **State:** loading = skeleton dengan dimensi sama dengan chart final (tanpa layout shift); empty = kalimat + tombol langkah berikut; error = pesan di tempat + "Coba lagi".
- Implementasi: SVG/HTML custom untuk #1, #2, #7, #10 (mini bar), #14, #15; Recharts 3 (shadcn chart) untuk #3, #4, #5, #6, #8, #13, #16, #17. Wajib mengganti warna default Recharts dengan token (jangan memakai `chart-1..5` bawaan shadcn).

### 4.1 Per tipe

**#1 Progress bersegmen (Cakupan Penilaian)**
- Anatomi: satu bar horizontal 100% lebar, tinggi 16px, segmen urut Critical→High→Medium→Low (hanya yang > 0), sisa = arsir "Belum dinilai". Di atas: kalimat temuan "1 dari 136 aset sudah dinilai (0,7%)". Di bawah: legend marker + jumlah.
- Segmen kurang dari 4px lebar tetap digambar min 4px dan diberi anotasi garis penunjuk + label (mis. 1 aset Medium).
- Saat coverage tinggi, bar menyusut jadi tinggi 8px di header.
- Aria: `role="img"` dengan label "Cakupan penilaian: 1 dari 136 aset dinilai; Medium 1; belum dinilai 135."

**#2 Stacked bar 100% tunggal (sebaran kategori)**
- Satu bar horizontal, tinggi 32px, 5 segmen (4 kategori + belum dinilai), celah 2px, label langsung di atas segmen (marker + nama + n + %) atau, bila segmen sempit, di bawah dengan garis penunjuk. Tidak ada sumbu; skala 0–100% disebut di caption.
- Dasar persen = seluruh aset (136); sub-toggle "Hanya yang sudah dinilai" mengubah dasar dan diumumkan di judul.
- Tabel jumlah (kategori, aset, %) di bawah sebagai ledger bergaris. Mobile: label pindah ke daftar vertikal di bawah bar.

**#3 Bar Rp per kategori (count vs value)**
- Dua bar horizontal bersisian per kategori dalam satu baris ledger: kiri "Jumlah aset" (n), kanan "Nilai buku (Rp)", masing-masing skala sendiri **dalam panel terpisah** (small multiples, bukan dual-axis). Baris urut Critical→Low, lalu Belum dinilai arsir.
- Label nilai di ujung bar (`Rp22,0 M`), sumbu x `Rp0 · Rp5 M · Rp10 M`.
- Judul contoh: "Aset Critical dan High memegang Rp… M dari Rp143,9 M".

**#4 Ranked bar Top-10/20 dengan marker kategori**
- Baris per aset: peringkat, nama aset (rata kiri, truncate + tooltip), bar tunggal warna netral `ink-muted` pada 40% (bukan warna kategori; kategori hanya di marker), di ujung bar marker bentuk risiko (16px) + nilai `Rp22,0 M`. Aset belum dinilai: marker "?" kotak putus.
- Pemisah baris hairline. Toggle Top-10 / Top-20. Nama aset tautan ke detail.
- Alasan bar netral: warna saturasi hanya untuk kategori dan marker sudah membawanya; ini menjaga hierarki.
- Catatan kaki: "Nilai buku, tidak termasuk placeholder."

**#5 Pareto (Analitik)**
- Bar terurut (netral `ink-muted`) + garis kumulatif `ink` 2px pada **sumbu persentase yang sama dengan bar yang dinormalisasi** (bar = % kontribusi, bukan Rp, agar satu sumbu). Garis rujukan 50%, label langsung "20 aset = 50%".
- Sumbu x tidak berlabel per aset (136 titik); tooltip memberi nama.

**#6 Scatter kuadran (skor × nilai, log) — muncul ≥ 30% dinilai**
- x = skor 20–100, y = nilai buku skala log (label `Rp100 jt · Rp1 M · Rp10 M`). Garis ambang vertikal pada 40/60/80 (hairline putus `rule-strong`) dengan label "Medium / High / Critical" di atasnya. Kuadran prioritas (skor ≥ 60, nilai ≥ persentil 75) diberi tint `risk-high-tint` dan label "Prioritas pertama".
- Marker: bentuk kategori 10–12px (bukan lingkaran semua), ring 2px surface, ≥ 8px. Hanya ≤ 1.000 titik; lebih → binning server. Label langsung hanya untuk 5 titik teratas di kuadran prioritas.
- Tabel alternatif wajib (urut prioritas). Dilarang heat-grid 5×5 likelihood × impact.

**#7 Heatmap aset × indikator**
- Baris = aset (urut skor turun; "Belum dinilai" di akhir, atau disaring); kolom = 6 indikator dengan bobot di header ("Legalitas · 20%"). Header kolom sticky, nama aset kolom pertama sticky.
- Sel 40×32px (desktop), angka skor 1–5 di tengah (`tabular-nums`, `ink`), warna latar = skala sekuensial **netral** tinta 5 langkah (1 terang → 5 gelap) di atas hue tunggal tinta hangat: `h-1 #F3F1EA`, `h-2 #E4DFD1`, `h-3 #C9C2AE`, `h-4 #9C957F`, `h-5 #6B6656` (dark: balik, 1 gelap → 5 terang: `#1C2024`, `#2E343A`, `#4A525A`, `#7A838C`, `#B4B0A6`). Angka selalu menyertai warna, jadi tidak ada ketergantungan warna. Teks sel ≥ 4,5:1 Warna angka per langkah — light: `ink` pada h-1–h-4 (14,97 / 12,70 / 9,51 / 5,65), `surface` pada h-5 (5,50); dark: `ink` pada h-1–h-3 (13,51 / 10,37 / 6,54), `surface` pada h-4–h-5 (4,63 / 8,23). Semua ≥ 4,5:1.
- Alasan netral: skor indikator 1–5 bukan kategori risiko; memakai hue kategori di sini akan membuat "skor 4" tampak seperti kategori High. Hue kategori tetap pada kolom Skor/Kategori di ujung kanan (RiskBadge).
- Sel kosong (belum diketahui) = arsir (§2.4) + "?" + `aria-label`. Baris rata-rata per indikator di bawah (sel sama, angka 1 desimal "2,4").
- Aria: `role="table"` semantik (HTML `<table>`), tiap sel `aria-label="Penguasaan, aset 789: skor 4 dari 5"`. Navigasi keyboard: panah antar sel (grid pattern), Enter membuka rubrik.
- Dominasi baris: tampilkan Top 25 di dashboard dengan tombol "Lihat semua 136".

**#8 Kontribusi indikator (Analitik)**
- Ranked bar horizontal (skor rata-rata × bobot, dalam poin skor), netral `ink`; label langsung "Penguasaan +16,3 poin". Sumbu mulai 0.

**#9 Bullet bar per indikator (detail aset)**
- Per indikator satu baris ledger: nama + bobot, bar 8px dari 1–5 dengan 5 tick, penanda skor (kotak 12px `ink`) + angka, teks rubrik skor terpilih di bawahnya (`text-caption`). Skor 1–5 dipetakan ke latar tint netral; indikator "belum diketahui" = arsir + "?".
- Tanda "dari 5" ada di label sumbu: 1 = risiko sangat rendah, 5 = sangat tinggi.

**#10 Tabel dengan mini stacked bar (Wilayah & Jenis)**
- Baris wilayah × jenis (3×2) + total. Kolom: Aset (n + bar tipis), Nilai buku (Rp + bar proporsional netral), Idle (Rp + persen). Mini bar tinggi 6px, `ink-muted`; segmen idle `ink` penuh. Tabel tetap yang utama (angka rata kanan).
- Tidak ada peta (3 provinsi, 87% DKI).

**#11 Produktif vs Idle**
- Stacked bar 100% tunggal (aturan #2) berukuran Rp dan satu lagi jumlah, dua baris. Segmen: Produktif (`ink-muted`), Idle (`ink` dengan pola garis diagonal rapat — tekstur sekunder). Daftar 13 tanah idle di bawah sebagai ledger.

**#12 Timeline/agenda jadwal**
- Band bergaris: **Overdue** (teratas, marker status peringatan: segitiga tinta + teks "Lewat 12 hari"), **≤ 30 hari**, **Terjadwal** (dikelompokkan per bulan, header bulan Fraunces `text-subtitle`). Tiap baris: tanggal "12 Mei" (rata kiri tabular), nama aset, marker kategori + chip interval ("tiap 3 bulan", outline hairline), PIC.
- Warna hanya marker kategori; status overdue memakai teks `status-error` + ikon. Mobile: sama (list). Kalender bulan sebagai tampilan kedua (sel tanggal dengan titik marker bentuk).

**#13 Beban kerja 12 bulan (Analitik)**
- Column chart per bulan, tumpuk per kategori (urutan Critical di dasar), celah 2px, label total di atas kolom, bulan berjalan dengan garis vertikal tipis "Hari ini". Legend wajib.

**#14 Timeline strip masa berlaku hak**
- Satu sumbu waktu horizontal (tahun, 5 tahun ke belakang & ke depan), satu titik per aset tanah (15), bentuk lingkaran netral `ink` 10px, ring surface. Zona: lewat (latar `risk-critical-tint`), < 12 bulan (`risk-high-tint`), diberi label teks pada zona ("Lewat", "< 12 bulan"). Garis "Hari ini" 1px `ink`. Titik di zona lewat diberi marker belah ketupat kecil + label nama aset (maks 5 label, sisanya tooltip/daftar).
- Titik menumpuk digeser vertikal (jitter deterministik berdasarkan ID) agar tidak tertutup.
- Detail aset: versi tunggal, satu baris.

**#15 Ledger kualitas data (bukan chart)**
- Daftar bergaris, tiap baris: ikon peringatan (segitiga tinta), kalimat isu ("3 hak tanah sudah lewat masa berlaku"), jumlah rata kanan (`tabular-nums`, `text-title`), tautan "Lihat 3 aset" ke daftar terfilter. Tanpa bar. Dasar: `status-warning-bg` hanya bila isu berat; selain itu latar surface.

**#16 Tren (≥ 2 periode)**
- Line rata-rata skor (`ink` 2px, marker 8px di tiap periode); di bawahnya satu stacked column jumlah per kategori per kuartal (warna kategori). Dua panel terpisah, sumbu x sejajar. Label langsung akhir garis ("Rata-rata 52,4"). Slope chart untuk 2 periode: garis tipis `ink-muted`, titik ujung dengan bentuk kategori.
- Perubahan ditandai teks + panah tinta (naik = memburuk), bukan warna hijau/merah.

**#17 Step line progres penilaian**
- Step line `ink` 2px (kumulatif dinilai per minggu) menuju garis target 136 (hairline putus `rule-strong`, label "Target 136 aset"). Marker pada titik terakhir saja dengan label "1 dari 136, 19 Nov".
- Sumbu y 0–136, mulai nol.

---

## 5. Format angka dan tanggal (id-ID)

Aturan:

| Jenis | Format | Contoh |
|---|---|---|
| Rupiah ringkas ≥ 1 M | `Rp` + angka 1 desimal + ` M` (miliar) | Rp22,0 M · Rp143,9 M |
| ≥ 1 T | ` T` (triliun) | Rp1,2 T |
| Juta | `Rp` + bulat + ` jt` (1 desimal jika < 10 jt) | Rp850 jt · Rp8,5 jt |
| Ribu (hanya jika perlu) | ` rb` | Rp1,2 rb |
| < 1.000 | angka penuh | Rp750 |
| Rupiah eksak (tooltip, tabel detail) | `Rp` + pemisah titik | Rp22.012.345.678 |
| Persen | koma desimal, 1 desimal bila < 10% | 0,7% · 29% |
| Luas | pemisah titik + ` m²` | 101.420 m² |
| Skor | 1 desimal, koma | 47,0 |
| Rasio | `n dari N` | 1 dari 136 aset |
| Tanggal penuh | `d MMMM yyyy` | 12 Mei 2027 |
| Tanggal singkat | `d MMMM` (tahun berjalan) | 12 Mei |
| Bulan | `MMMM yyyy` | Mei 2027 |
| Relatif (hanya jadwal) | "Lewat 12 hari", "Dalam 5 hari" | — |

Placeholder: nilai buku = 1 (Rp1) dan luas = 1 m² ditampilkan **"—"** disertai ikon peringatan (segitiga tinta, `aria-label="Data placeholder, belum diisi"`) dan tooltip penjelasan. Tidak ikut agregat. Tanggal di masa depan yang tidak mungkin (mis. tanggal monitoring terakhir > hari ini) ditandai serupa.

Spasi: tidak ada spasi antara "Rp" dan angka (konvensi dokumen ini: Rp22,0 M). Gunakan non-breaking space (` `) sebelum satuan (` M`, ` jt`, ` m²`) agar tidak terpisah baris.

```ts
const nf1 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const NBSP = " ";

/** Rp ringkas: Rp22,0 M · Rp850 jt · Rp1,2 rb. Placeholder (<= 1) dan null → "—". */
export function formatRupiahRingkas(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 1) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `Rp${nf1.format(n / 1e12)}${NBSP}T`;
  if (abs >= 1e9) return `Rp${nf1.format(n / 1e9)}${NBSP}M`;
  if (abs >= 1e6) return `Rp${(abs < 1e7 ? nf1 : nf0).format(n / 1e6)}${NBSP}jt`;
  if (abs >= 1e3) return `Rp${nf1.format(n / 1e3)}${NBSP}rb`;
  return `Rp${nf0.format(n)}`;
}

/** Rp eksak untuk tooltip: Rp22.012.345.678 */
export const formatRupiahEksak = (n: number): string =>
  `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n)}`;

export const formatPersen = (frac: number): string =>
  `${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: Math.abs(frac) < 0.1 ? 1 : 0,
  }).format(frac * 100)}%`;

export const formatLuas = (m2: number | null | undefined): string =>
  m2 == null || m2 <= 1 ? "—" : `${nf0.format(m2)}${NBSP}m²`;

const fmtFull = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
const fmtShort = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", timeZone: "Asia/Jakarta" });

/** formatTanggal(d) → "12 Mei 2027"; formatTanggal(d, "singkat") → "12 Mei" */
export function formatTanggal(d: Date | string | null | undefined, gaya: "penuh" | "singkat" = "penuh"): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  const s = (gaya === "penuh" ? fmtFull : fmtShort).format(date);
  // kapitalkan huruf pertama nama bulan (runtime bisa mengeluarkan "mei")
  return s.replace(/(\d+ )(\p{Ll})/u, (_, d, c) => d + c.toUpperCase());
}
```

Catatan: `Intl` locale `id-ID` menghasilkan nama bulan huruf kecil di sebagian runtime ("12 Mei 2027" vs "12 mei 2027"). Fungsi produksi harus mengkapitalkan huruf pertama nama bulan secara eksplisit dan diuji (unit test: `formatTanggal(new Date("2027-05-12"))` → `"12 Mei 2027"`). Seluruh pemformat berada di `lib/format.ts` dan dipakai di server maupun client agar hidrasi konsisten; zona waktu tetap `Asia/Jakarta`.

---

## 6. Pola komponen

Gaya bersama: tinggi kontrol 36px (desktop) / 44px (sentuh), radius 4px, border `rule-strong`, fokus cincin 2px `focus` offset 2px. Tidak ada tombol pill.

### 6.1 RiskBadge

- Anatomi: `[marker 12px] Label` — teks `text-label` dalam `risk-*-ink`, latar `risk-*-tint`, padding 2px 8px, radius 2px, tanpa border. Tinggi 24px.
- Belum dinilai: latar arsir (§2.4), teks `ink-muted`, marker "?".
- Override: tambah teks kecil "Override" di sebelah. Variasi ukuran: `sm` (hanya marker + teks, tanpa latar) untuk tabel padat.
- Aria: teks sudah label; marker `aria-hidden`.

### 6.2 ScoreBar (skor 20–100)

- Bar horizontal 8px, rentang skala 20–100 (bukan 0–100: skor minimum nyata 20), latar `surface-sunken` + hairline. Isian dari kiri sampai skor, berwarna `risk-<kategori>` fill. Di atas bar: 3 tick vertikal pada **40, 60, 80** (hairline `rule-strong`, tinggi 12px) dengan label `text-caption` "40 / 60 / 80". Angka skor "47,0" di kiri/kanan `tabular-nums`, bold.
- Belum dinilai: bar arsir kosong + teks "Belum dinilai" (tidak menampilkan angka).
- Aria: `role="meter"` `aria-valuemin=20 aria-valuemax=100 aria-valuenow=47 aria-valuetext="47,0, kategori Medium"`.
- Pada tabel padat: versi 64px lebar tanpa label tick, tick saja.

### 6.3 Sel heatmap

Lihat §4.1 #7. Komponen `HeatCell({ score: 1..5 | null })`: 40×32px, angka tengah; null → arsir + "?"; fokus cincin 2px; `aria-label` lengkap.

### 6.4 Filter bar (state di URL)

- Satu baris di atas tabel, sticky di bawah header halaman (`z-sticky`). Isi: pencarian (ikon kaca pembesar + placeholder "Cari nama atau ID aset"), kontrol filter (Wilayah, Jenis, Kategori, Pemanfaatan, Status jadwal) sebagai tombol menu multi-pilih, tombol "Atur kolom" dan "Ekspor".
- Filter aktif tampil sebagai chip bergaris (`[Wilayah: DKI Jakarta ×]`) di baris di bawah dengan tombol "Hapus semua". Hitungan hasil ("38 dari 136 aset") di sebelah kanan, `aria-live="polite"`.
- State di URL searchParams (`?wilayah=dki&kategori=critical,high&q=duri`), bisa dibagikan. Perubahan memakai `router.replace` (tanpa menambah riwayat untuk ketikan), debounce 250ms untuk pencarian.
- Mobile: bar menjadi tombol "Filter (2)" + pencarian; membuka bottom sheet (lihat §7).

### 6.5 Tabel

- Header sticky (`z-sticky`) pada `surface-sunken`, `text-label`, tinggi 40px, border-bottom `rule-strong`. Baris: border-bottom 1px `rule`, tinggi 40px, tanpa zebra (hover: `surface-sunken`). Tanpa border vertikal.
- Kolom angka (nilai, luas, skor) rata kanan, `tabular-nums`; teks rata kiri; kategori (RiskBadge) rata kiri. Kolom nama truncate + tooltip; kolom pertama (ID, mono) tetap saat scroll horizontal di tablet.
- Sortir: header tombol dengan `aria-sort`; panah tinta 12px. Urutan default: nilai buku menurun.
- Paginasi/virtualisasi: 50 baris per halaman atau virtual; footer ledger "Menampilkan 1–50 dari 136 · Total nilai buku Rp143,9 M".
- Mini stacked bar di sel: lihat #10. Seleksi baris untuk aksi massal: checkbox 24px area klik 44px.
- Baris kosong data: "—" + ikon peringatan; tidak dikosongkan.

### 6.6 List mobile (pengganti tabel)

- Baris list tinggi min 64px, dipisah hairline, tanpa kartu/bayangan. Susun: baris 1 = nama aset (`text-body` 500, max 2 baris) + RiskBadge rata kanan; baris 2 = `text-caption ink-muted`: ID · wilayah · Rp22,0 M. Baris 3 (opsional) = status jadwal ("Lewat 12 hari" dengan ikon). Seluruh baris adalah satu target ketuk (min 44px tinggi), `chevron` kanan tinta.

### 6.7 Alert / Peringatan Data

- Berbentuk **baris ledger**, bukan kotak: ikon segitiga tinta (16px) + kalimat + jumlah + tautan. Pemisah hairline; tidak ada border kiri berwarna, tidak ada latar jenuh. Untuk peringatan berat, latar `status-warning-bg`.
- Alert sementara (di atas form): blok dengan border 1px `rule-strong`, ikon + judul `text-label` + isi, tombol tindakan teks. Error: ikon lingkaran-silang + teks `status-error` pada judul saja.
- `role="status"` untuk informasi, `role="alert"` hanya untuk error yang menghalangi.
- Contoh isi: "3 hak tanah sudah lewat masa berlaku. Lihat 3 aset".

### 6.8 Form rubrik (radio full-width)

- Satu bagian per indikator (6), judul `text-label` + bobot ("Legalitas · bobot 20%"). Di bawahnya 5 opsi + 1 opsi "Belum diketahui", masing-masing **baris radio full-width** (min tinggi 56px, area klik seluruh baris, 44px+): lingkaran radio native, angka besar "1" (`text-subtitle`, `tabular-nums`), judul skala ("Risiko sangat rendah" untuk 1 … "Risiko sangat tinggi" untuk 5), lalu **teks rubrik** dari `score_criteria` versi aktif (`text-body ink-muted`).
- Opsi terpilih: latar `surface-sunken`, border 1px `ink`, radio terisi. Tidak memakai warna kategori di opsi (skor indikator ≠ kategori).
- Opsi "Belum diketahui": baris dengan arsir tipis + "?"; bila dipilih, skor total tampil "Belum lengkap" (tidak dihitung).
- Skala selalu diberi petunjuk di atas bagian: "1 = risiko sangat rendah · 5 = risiko sangat tinggi".
- Preview live di sisi kanan (desktop, sticky) atau bar bawah (mobile): ScoreBar + RiskBadge + interval monitoring. Preview "Belum lengkap" bila ada indikator kosong.
- Catatan wajib bila skor ≥ 4 atau override: field muncul tepat di bawah indikator, `aria-required`, pesan error inline "Isi catatan untuk skor 4 atau 5."
- Tombol: "Simpan penilaian" (primer tinta), "Simpan draf" (sekunder). Fieldset + legend per indikator; navigasi panah antar opsi (radio group native).

### 6.9 State: empty, loading, error

- **Empty:** satu kalimat + langkah berikut (tombol): "Belum ada aset yang dinilai. Mulai dari aset dengan nilai buku tertinggi." → [Mulai penilaian]. Tidak ada ilustrasi.
- **Loading:** skeleton dengan layout identik (baris tinggi sama, lebar acak 40–90%, warna `rule` 60%); `aria-busy="true"` pada wadah; tanpa spinner penuh layar. Aksi tombol: label tetap + indikator kecil, tombol dinonaktifkan.
- **Error inline:** di tempat bagian itu berada: ikon + "Data kategori tidak dapat dimuat." + [Coba lagi] (tombol sekunder). Bagian lain tetap bekerja. Error form: pesan di bawah field + ringkasan di atas, fokus dipindah ke ringkasan.

### 6.10 Toast "Urungkan"

- Posisi: kanan-bawah desktop, di atas bottom-nav mobile. Lebar maks 360px, `surface-raised`, border `rule-strong`, `shadow-overlay`, radius 4px. Isi: teks ("Aset TANAH DURI KOSAMBI dihapus") + tombol teks "Urungkan" (bergaris bawah, ≥ 44px tinggi area).
- Durasi 8 detik (hapus), 4 detik (konfirmasi); jeda saat hover/fokus. `role="status"` `aria-live="polite"`. Tidak menumpuk lebih dari 3. Optimistic update: baris hilang dulu, kembali bila gagal atau diurungkan (soft delete).

### 6.11 Navigasi

- **Item:** Dashboard, Aset, Jadwal, Input (penilaian/monitoring), Analitik, Import/Export, Pengaturan (admin), Panduan. Mobile bottom-nav memuat 4 utama: Dashboard / Aset / Jadwal / Input; sisanya di menu "Lainnya".
- **Sidebar desktop** (lebar 224px, latar `surface`, border-right 1px `rule`): item teks `text-body` + ikon 18px garis tipis (Lucide, stroke 1.5, tanpa isian), item aktif = teks 600 + garis bawah 2px `ink` pada label (atau penanda kotak 2px di kiri) dan `aria-current="page"`. Tanpa latar berwarna.
- Judul aplikasi: "Buku Besar Risiko" (Fraunces 600, 18px) + subjudul "Monitoring Aset 2027" `text-caption`.
- **Breadcrumb** di detail aset: Aset / [Nama aset]. Skip link "Lewati ke konten utama" di awal DOM.
- Pengalih tema (Terang / Gelap / Ikuti sistem) di footer sidebar, `aria-pressed`.
- Pengguna: email di footer sidebar + tombol "Keluar".

---

## 7. Responsif

| Lebar | Layout |
|---|---|
| 375 | satu kolom; gutter 16px; bottom-nav 56px (+ safe-area); tabel → list (§6.6); heatmap → 6 sel mini per baris; filter → bottom sheet; chart penuh lebar, legend di bawah |
| 768 | gutter 24px; bottom-nav tetap; tabel penuh dengan kolom prioritas (ID, Nama, Nilai, Kategori, Skor); dua kolom untuk bagian #2/#3 |
| 1024 | sidebar 224px; tabel penuh; heatmap penuh; filter bar penuh |
| 1440 | konten maks 1360px dipusatkan; bagian side-by-side (#3 + #4) |

Aturan:

- **Tanpa horizontal scroll halaman** pada 375px. Tabel lebar di tablet boleh scroll horizontal di dalam wadahnya (kolom pertama sticky, `tabindex=0` + `role="region"` + `aria-label`).
- **Bottom-nav:** 4 item (ikon 22px + label `text-caption`), tinggi 56px, target ≥ 44px, item aktif: label 600 + garis atas 2px `ink`. Latar `surface`, border-top `rule`. Tanpa bayangan.
- **Heatmap mobile:** kartu dihilangkan; tiap aset satu baris dengan nama di atas dan 6 sel mini (28×28px, angka 1–5, kepala kolom disingkat L P K M L N dengan legenda di atas, sticky) berderet; ketuk baris → detail dan rubrik.
- **Filter bottom sheet:** tombol "Filter (n)"; sheet naik dari bawah (radius atas 4px, `shadow-overlay`, scrim .4), handle opsional, judul "Filter aset", grup filter sebagai fieldset radio/checkbox ≥ 44px, tombol "Terapkan (38 aset)" dan "Reset" di footer sticky. Esc/geser menutup; fokus dikunci di sheet.
- **Touch target:** minimum 44×44px pada sentuh (jarak ≥ 8px antar target); minimum mutlak 24×24px (WCAG 2.5.8) untuk elemen padat desktop.
- **Chart mobile:** label langsung pindah ke daftar di bawah; sumbu dengan tick lebih sedikit (3); tooltip ke "tap untuk detail" memunculkan panel bawah, bukan hover.
- **Input:** `font-size ≥ 16px` pada input mobile (hindari zoom iOS), `inputmode` sesuai (numeric untuk skor/Rp), `enterkeyhint`.

---

## 8. Aksesibilitas (WCAG 2.2 AA)

Target AA penuh; AAA bila murah.

**Kontras**

- Teks normal ≥ 4,5:1, teks besar (≥ 18px atau ≥ 14px bold) ≥ 3:1, komponen UI dan objek grafis ≥ 3:1 (1.4.11). Seluruh pasangan token terdokumentasi di §2; pasangan baru wajib dihitung sebelum dipakai.
- Teks tidak pernah memakai `risk-*-fill`; selalu `risk-*-ink`. Teks di atas `tint` memakai `ink` pasangannya.
- `ink-subtle` (≥ 4,85/5,17) hanya untuk teks ≥ 12px; placeholder tidak boleh menjadi satu-satunya label.
- Tidak ada pengecualian kontras: semua `risk-*` fill ≥ 3:1 terhadap `surface` dan `surface-raised` di kedua mode (§2.3).

**Jangan bergantung pada warna (1.4.1)**

- Kategori = warna + bentuk + label teks. Heatmap = angka di tiap sel. Status jadwal = teks + ikon. Perubahan tren = teks + panah. Seri chart non-kategori dibedakan oleh label langsung dan tekstur.
- Bentuk marker ≥ 3:1 terhadap latar (fill) dan stroke `surface` 1,5px konsisten untuk semua kategori.

**Fokus**

- `:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }` pada semua elemen interaktif, tidak pernah `outline: none` tanpa pengganti. Cincin 2px ≥ 3:1 terhadap latar (focus appearance 2.4.13 tercapai: tebal ≥ 2px, kontras ≥ 3:1).
- **2.4.11 Focus Not Obscured:** header sticky/filter bar/bottom-nav tidak boleh menutupi elemen yang fokus penuh: `scroll-padding-top: 112px; scroll-padding-bottom: 72px;` pada `html`, dan sheet/dialog memakai focus trap + fokus awal terkelola.
- Fokus tidak hilang saat elemen dihapus (pindah ke elemen berikut/judul bagian).

**Target (2.5.8)**

- ≥ 24×24px (AA); ≥ 44×44px pada sentuh (§7). Ikon-tombol punya area klik lebih besar dari ikonnya (padding). Tidak ada tindakan yang hanya bisa lewat drag (2.5.7): reorder kolom pakai tombol naik/turun.

**Keyboard**

- Seluruh fungsi lewat keyboard, urutan tab mengikuti visual. Heatmap: grid dengan panah, Home/End; chart: roving tabindex antar mark, Enter = klik, Esc menutup tooltip. Menu/dialog: Esc menutup, fokus kembali ke pemicu. Skip link. Tidak ada keyboard trap kecuali dialog modal yang sah.
- Tooltip muncul pada fokus, bukan hanya hover; dapat ditutup dengan Esc dan tetap terlihat saat pointer di atasnya (1.4.13).

**Semantik & ARIA**

- `<html lang="id">`. Landmark: `header`, `nav aria-label="Utama"`, `main id`, `aside` (preview skor), `footer`. Satu `h1` per halaman; hierarki h2/h3 tidak melompat.
- Tabel memakai `<table>` semantik, `<th scope>`; `aria-sort`; caption tersembunyi untuk tabel data.
- Chart: judul temuan sebagai `aria-labelledby`, `aria-describedby` ke ringkasan numerik; toggle "Tampilkan tabel" sebagai jalur setara (§4.0). SVG dekoratif `aria-hidden`.
- Form: `<label for>` setiap input; `fieldset/legend` untuk radio; `aria-invalid`, `aria-describedby` pesan error; error summary; `autocomplete` sesuai. Tidak ada placeholder-sebagai-label.
- Live region: hasil filter, toast, hasil simpan (`aria-live="polite"`); error blokir `role="alert"`.
- Autentikasi (3.3.8): Login via Google (tanpa cognitive test), tidak memblokir paste/autofill.
- Konsistensi bantuan (3.2.6): tautan "Panduan" selalu di posisi sama pada navigasi.
- Redundant entry (3.3.7): form penilaian mengisi otomatis nilai periode sebelumnya sebagai default yang bisa diubah (bukan memaksa ulang).

**Motion & preferensi**

- `prefers-reduced-motion`, `prefers-color-scheme`, `forced-colors: active` (outline memakai `CanvasText`; marker bentuk tetap; arsir memakai `CanvasText` 1px), zoom 200% dan reflow 320px tanpa kehilangan fungsi (1.4.10), teks bisa diperbesar 200% (1.4.4); `rem`-based type; `text-spacing` tidak merusak layout.
- Tidak ada konten berkedip, auto-play, atau batas waktu pendek (sesi habis → peringatan + perpanjang).

**Pengujian**: axe/Lighthouse di CI pada Dashboard, Aset, Detail, Form; pengecekan manual keyboard + VoiceOver; uji simulasi CVD (protan, deutan, tritan) pada chart kategori; cek forced-colors.

---

## 9. Copy dan suara

Prinsip: Bahasa Indonesia lugas, kalimat aktif, angka konkret, tanpa jargon pemasaran, tanpa seru berlebihan. Menyapa pengguna sebagai rekan kerja audit: tenang, tepat. Istilah baku: **aset, penilaian, skor, kategori, hak, nilai buku, jatuh tempo, belum dinilai, peringatan data**. Istilah Excel yang dipertahankan: Critical/High/Medium/Low (kategori), "Override".

| Konteks | Baik | Buruk |
|---|---|---|
| Judul dashboard | "1 dari 136 aset sudah dinilai. Angka risiko di bawah masih sementara." | "Selamat datang! Buka wawasan portofolio Anda" |
| Judul chart | "20 aset memegang 50% nilai buku" | "Distribusi Nilai Aset" |
| Empty aset | "Belum ada aset. Impor dari Excel atau tambah satu aset." | "Wah, kosong! Yuk mulai sekarang" |
| Empty penilaian | "Belum ada penilaian. Mulai dari aset bernilai tertinggi." | "Tidak ada data." |
| Error muat | "Data kategori tidak dapat dimuat. Coba lagi." | "Oops! Terjadi kesalahan tak terduga." |
| Error simpan | "Penilaian belum tersimpan. Periksa koneksi, lalu simpan lagi." | "Gagal." |
| Validasi | "Isi catatan untuk skor 4 atau 5." | "Field wajib diisi" |
| Hapus | "Aset dihapus. [Urungkan]" | "Apakah Anda yakin ingin menghapus aset ini selamanya?" (tanpa opsi urungkan) |
| Placeholder data | "Nilai buku Rp1 adalah placeholder, tidak dihitung dalam total." | "Data tidak valid" |
| Belum dinilai | "Belum dinilai" | "Risiko rendah" / "N/A" / "0" |
| Tombol | "Simpan penilaian", "Catat monitoring", "Lihat 3 aset" | "Submit", "Klik di sini", "Proses" |
| Jadwal | "Lewat 12 hari" · "Jatuh tempo 12 Mei" | "Overdue!!" |
| Perubahan | "Skor naik 6 poin sejak Maret" | "Kerja bagus, risiko naik!" |
| Tooltip skor | "47,0 dari 100 (Medium). Parameter v1." | "Skor Anda sangat baik!" |

Aturan tambahan:

- Jangan menyalahkan pengguna; jelaskan keadaan dan langkah berikut.
- Satu istilah per konsep; "skor" bukan "poin/nilai/rating" bergantian (kecuali "poin" sebagai satuan selisih skor).
- Judul = kalimat, diakhiri titik bila lebih dari satu klausa; label tombol tanpa titik.
- Hindari kata "Silakan" berulang, "Mohon", "Harap" di UI; langsung perintah ("Isi tanggal").
- Singkatan hanya yang sudah baku di Excel (PIC, ID, Rp, M, jt, rb, m²).
- Tidak ada emoji. Tidak ada tanda seru kecuali kutipan.
- Pengumuman perubahan data menyebut subjek dan jumlah: "3 aset diperbarui, 1 dilewati."

---

## 10. CSS variables untuk Tailwind 4

Salin ke `app/globals.css`. Mode gelap lewat `.dark` (kelas pada `<html>`, dipasang oleh pengalih tema dan diinisialisasi dari `prefers-color-scheme` agar tidak berkedip; atribut `data-theme="dark"` didukung juga).

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *, [data-theme="dark"], [data-theme="dark"] *));

:root {
  /* netral */
  --surface: #FBFAF7;
  --surface-raised: #FFFFFF;
  --surface-sunken: #F3F1EA;
  --ink: #1A1D21;
  --ink-muted: #4A4F55;
  --ink-subtle: #676B6F;
  --rule: #D9D4C7;
  --rule-strong: #8F8A7C;
  --focus: #1A1D21;
  --accent: #1A1D21;
  --accent-fg: #FBFAF7;
  --hatch-line: #8F8A7C;

  /* status */
  --status-error: #B42318;
  --status-warning-ink: #7A4B00;
  --status-warning-bg: #FBF0D6;
  --status-success-ink: #1B6E3C;

  /* risiko: fill / ink / tint */
  --risk-critical: #9E1B1B;  --risk-critical-ink: #8A1717;  --risk-critical-tint: #F7E3E1;
  --risk-high: #C26159;      --risk-high-ink: #9A3A08;      --risk-high-tint: #FBE8DA;
  --risk-medium: #AC8E04;    --risk-medium-ink: #6B5000;    --risk-medium-tint: #F8EDC8;
  --risk-low: #047E9C;       --risk-low-ink: #046078;       --risk-low-tint: #DAEDF2;
  --risk-unrated: #6E6A5F;   --risk-unrated-ink: #4A4F55;

  /* skala heatmap indikator (netral, 1 = rendah) */
  --heat-1: #F3F1EA; --heat-2: #E4DFD1; --heat-3: #C9C2AE; --heat-4: #9C957F; --heat-5: #6B6656;
  --heat-fg-1: #1A1D21; --heat-fg-2: #1A1D21; --heat-fg-3: #1A1D21; --heat-fg-4: #1A1D21; --heat-fg-5: #FBFAF7; /* teks di atas heat-n, ≥4,5:1 */

  /* tipografi */
  --font-serif: var(--font-fraunces), Georgia, "Times New Roman", serif;
  --font-sans: var(--font-plex-sans), system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: var(--font-plex-mono), ui-monospace, "SF Mono", Menlo, monospace;

  /* radius, bayangan, motion, z */
  --radius-sm: 2px; --radius-md: 4px;
  --shadow-overlay: 0 1px 0 rgb(26 29 33 / .04), 0 4px 12px rgb(26 29 33 / .10);
  --duration-fast: 100ms; --duration-base: 160ms; --duration-max: 200ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);

  /* shadcn */
  --background: var(--surface);
  --foreground: var(--ink);
  --card: var(--surface);
  --card-foreground: var(--ink);
  --popover: var(--surface-raised);
  --popover-foreground: var(--ink);
  --primary: var(--accent);
  --primary-foreground: var(--accent-fg);
  --secondary: var(--surface-sunken);
  --secondary-foreground: var(--ink);
  --muted: var(--surface-sunken);
  --muted-foreground: var(--ink-muted);
  --accent-shadcn: var(--surface-sunken);
  --destructive: var(--status-error);
  --destructive-foreground: #FFFFFF;
  --border: var(--rule);
  --input: var(--rule-strong);
  --ring: var(--focus);
  --radius: 4px;
  --chart-1: var(--risk-critical);
  --chart-2: var(--risk-high);
  --chart-3: var(--risk-medium);
  --chart-4: var(--risk-low);
  --chart-5: var(--ink-muted);
  --sidebar: var(--surface);
  --sidebar-foreground: var(--ink);
  --sidebar-primary: var(--accent);
  --sidebar-primary-foreground: var(--accent-fg);
  --sidebar-accent: var(--surface-sunken);
  --sidebar-accent-foreground: var(--ink);
  --sidebar-border: var(--rule);
  --sidebar-ring: var(--focus);
}

.dark, [data-theme="dark"] {
  --surface: #15181B;
  --surface-raised: #1C2024;
  --surface-sunken: #101316;
  --ink: #ECE9E1;
  --ink-muted: #B4B0A6;
  --ink-subtle: #8D8A82;
  --rule: #2E343A;
  --rule-strong: #6A727A;
  --focus: #ECE9E1;
  --accent: #ECE9E1;
  --accent-fg: #15181B;
  --hatch-line: #6A727A;

  --status-error: #FF8F8F;
  --status-warning-ink: #F2D24B;
  --status-warning-bg: #2E2710;
  --status-success-ink: #6FCB8E;

  --risk-critical: #F55565;  --risk-critical-ink: #FF8F8F;  --risk-critical-tint: #3A1A1C;
  --risk-high: #B15604;      --risk-high-ink: #FFAE63;      --risk-high-tint: #3A2614;
  --risk-medium: #A59323;    --risk-medium-ink: #F2D24B;    --risk-medium-tint: #38310F;
  --risk-low: #00A0C7;       --risk-low-ink: #6FCBDA;       --risk-low-tint: #12343A;
  --risk-unrated: #9A978D;   --risk-unrated-ink: #B4B0A6;

  --heat-1: #1C2024; --heat-2: #2E343A; --heat-3: #4A525A; --heat-4: #7A838C; --heat-5: #B4B0A6;
  --heat-fg-1: #ECE9E1; --heat-fg-2: #ECE9E1; --heat-fg-3: #ECE9E1; --heat-fg-4: #15181B; --heat-fg-5: #15181B;

  --shadow-overlay: 0 4px 12px rgb(0 0 0 / .45);
  --destructive-foreground: #15181B;
}

@theme inline {
  /* warna semantik (dipakai sebagai bg-surface, text-ink, border-rule, ...) */
  --color-surface: var(--surface);
  --color-surface-raised: var(--surface-raised);
  --color-surface-sunken: var(--surface-sunken);
  --color-ink: var(--ink);
  --color-ink-muted: var(--ink-muted);
  --color-ink-subtle: var(--ink-subtle);
  --color-rule: var(--rule);
  --color-rule-strong: var(--rule-strong);
  --color-focus: var(--focus);
  --color-accent: var(--accent);
  --color-accent-fg: var(--accent-fg);
  --color-hatch: var(--hatch-line);

  --color-status-error: var(--status-error);
  --color-status-warning: var(--status-warning-ink);
  --color-status-warning-bg: var(--status-warning-bg);
  --color-status-success: var(--status-success-ink);

  --color-risk-critical: var(--risk-critical);
  --color-risk-critical-ink: var(--risk-critical-ink);
  --color-risk-critical-tint: var(--risk-critical-tint);
  --color-risk-high: var(--risk-high);
  --color-risk-high-ink: var(--risk-high-ink);
  --color-risk-high-tint: var(--risk-high-tint);
  --color-risk-medium: var(--risk-medium);
  --color-risk-medium-ink: var(--risk-medium-ink);
  --color-risk-medium-tint: var(--risk-medium-tint);
  --color-risk-low: var(--risk-low);
  --color-risk-low-ink: var(--risk-low-ink);
  --color-risk-low-tint: var(--risk-low-tint);
  --color-risk-unrated: var(--risk-unrated);
  --color-risk-unrated-ink: var(--risk-unrated-ink);

  --color-heat-1: var(--heat-1); --color-heat-2: var(--heat-2); --color-heat-3: var(--heat-3);
  --color-heat-4: var(--heat-4); --color-heat-5: var(--heat-5);
  --color-heat-fg-1: var(--heat-fg-1); --color-heat-fg-2: var(--heat-fg-2); --color-heat-fg-3: var(--heat-fg-3);
  --color-heat-fg-4: var(--heat-fg-4); --color-heat-fg-5: var(--heat-fg-5);

  /* shadcn */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  /* catatan: shadcn --accent dipetakan ke permukaan hover, bukan aksen merek */
  --color-accent-hover: var(--accent-shadcn);

  /* font */
  --font-serif: var(--font-serif);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);

  /* tipe */
  --text-display: 2rem;      --text-display--line-height: 1.15;
  --text-title: 1.5rem;      --text-title--line-height: 1.2;
  --text-subtitle: 1.125rem; --text-subtitle--line-height: 1.3;
  --text-body-lg: 1rem;      --text-body-lg--line-height: 1.5;
  --text-body: 0.875rem;     --text-body--line-height: 1.45;
  --text-label: 0.8125rem;   --text-label--line-height: 1.35;
  --text-caption: 0.75rem;   --text-caption--line-height: 1.35;

  /* radius */
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 4px;
  --radius-xl: 4px;

  /* bayangan */
  --shadow-overlay: var(--shadow-overlay);

  /* motion */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --animate-pulse-soft: pulse-soft 1.4s ease-in-out infinite;

  /* breakpoint */
  --breakpoint-md: 48rem;
  --breakpoint-lg: 64rem;
  --breakpoint-xl: 90rem;
}

@keyframes pulse-soft { 0%, 100% { opacity: 1 } 50% { opacity: .55 } }

@layer base {
  html { color-scheme: light; scroll-padding-top: 112px; scroll-padding-bottom: 72px; }
  html.dark, html[data-theme="dark"] { color-scheme: dark; }
  body {
    background: var(--surface); color: var(--ink);
    font-family: var(--font-sans); font-size: 0.875rem; line-height: 1.45;
    font-variant-numeric: tabular-nums lining-nums;
    -webkit-font-smoothing: antialiased;
  }
  h1, h2 { font-family: var(--font-serif); font-weight: 600; font-optical-sizing: auto; text-wrap: balance; }
  :where(a, button, input, select, textarea, summary, [tabindex]):focus-visible {
    outline: 2px solid var(--focus); outline-offset: 2px;
  }
  .tnum { font-variant-numeric: tabular-nums lining-nums; }
  .hatch-unrated {
    background-color: var(--surface);
    background-image: repeating-linear-gradient(45deg, var(--hatch-line) 0 1px, transparent 1px 6px);
    outline: 1px dashed var(--hatch-line); outline-offset: -1px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important; animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important; scroll-behavior: auto !important;
  }
}

@media (forced-colors: active) {
  .hatch-unrated { background-image: repeating-linear-gradient(45deg, CanvasText 0 1px, transparent 1px 6px); outline-color: CanvasText; }
}
```

Catatan implementasi:

- Nama `--font-serif`/`--font-sans`/`--font-mono` di `@theme inline` merujuk variabel `next/font` (`--font-fraunces`, `--font-plex-sans`, `--font-plex-mono`) yang didefinisikan oleh `next/font/google` pada `<html>`. Jika terjadi referensi melingkar karena nama sama, ganti nama variabel di `:root` menjadi `--ff-serif/--ff-sans/--ff-mono` dan arahkan `@theme inline` ke sana.
- shadcn `--accent` biasanya warna hover; di sini aksen merek = tinta, sehingga `--accent` shadcn dipetakan ke `--surface-sunken` saat `shadcn init` (variabel `--accent-shadcn` di atas hanya penanda; sesuaikan nama saat generator menulis `globals.css`).
- Tindakan setelah scaffold: ganti `chart-1..5` bawaan shadcn tidak perlu dipakai untuk kategori; selalu rujuk `--risk-*` secara eksplisit di komponen chart agar warna mengikuti entitas, bukan urutan.
- Satu helper `riskVar(level, "fill"|"ink"|"tint")` mengembalikan `var(--risk-…)` agar tidak ada hex di komponen.

---

## 11. Checklist gate sebelum merge UI

- [ ] Warna saturasi hanya pada kategori risiko/error; tidak ada warna dekoratif.
- [ ] Setiap kategori tampil dengan warna + bentuk + label; "Belum dinilai" arsir + putus + "?".
- [ ] Tidak ada pie/donut/gauge/radar/dual-axis/3D; chart sesuai matriks §5 ANALISA_EXCEL.
- [ ] Judul chart berupa kalimat temuan; ada toggle "Tampilkan tabel"; label sumbu `tabular-nums`.
- [ ] Coverage < 20%: chart risiko berlabel "Sementara"; bagian A dan B memimpin.
- [ ] Tidak ada kartu bersarang, gradien, glass, shadow di luar overlay, pill, emoji.
- [ ] Kontras: teks ≥ 4,5:1, grafis ≥ 3:1; fokus terlihat; target ≥ 24px (44px sentuh).
- [ ] Format id-ID lewat `lib/format.ts`; placeholder tampil "—" + peringatan.
- [ ] Empty, loading (skeleton sesuai layout), error inline + "Coba lagi" ada untuk tiap bagian.
- [ ] Tidak ada horizontal scroll halaman pada 375px; `prefers-reduced-motion` dan dark mode dicek.
- [ ] Copy Bahasa Indonesia lugas; tidak ada frasa generik.
- [ ] Angka dan judul kalimat-temuan diturunkan dari data (tidak ada literal 136/44/"Tiga…"); diuji dengan fixture n=1, n=40, n=136.

---

## 12. Keputusan dari kritik prototipe (19 Nov 2026)

Hasil kritik independen (opus) atas prototipe `design/prototype/`; berlaku untuk implementasi Fase 4–6.

1. **Dashboard sadar-cakupan.** Selama < 20% aset dinilai, urutan: H1 + satu CTA → strip KPI (ledger satu baris) → **Perlu tindakan** (temuan risiko: hak lewat / berakhir < 12 bln) → **Antrean penilaian** (Top-10 nilai buku) → **Kualitas data** → Wilayah & jenis → Masa berlaku hak → Jadwal → blok **Analisis risiko** (progres menuju ambang + heatmap hanya aset yang sudah dinilai, berlabel "Sementara"). Sebaran kategori (#2), nilai per kategori (#3) dan tren (#16) **tidak dirender** sampai ambang tercapai; diganti satu baris status. "x dari 136" maksimal 2× per halaman.
2. **Temuan risiko ≠ masalah kualitas data.** Dua daftar terpisah di dashboard; di Import tiga status: *Ditolak* (format/ID/wajib), *Peringatan data* (placeholder, tanggal masa depan, alias), *Temuan risiko* (hak kedaluwarsa) — dua terakhir tetap diimpor.
3. **Persentase dari n kecil disembunyikan.** Opsi/hitungan persen kategori dinonaktifkan bila dinilai < 10, dengan alasan tertulis.
4. **Sel heatmap selalu berbingkai 1px `--rule-strong`** (heat-1/2 hampir sama dengan surface; bingkai memenuhi 1.4.11). Heatmap sudah tabel semantik → tanpa toggle "Tampilkan tabel"; sel tidak fokusable (link nama aset cukup).
5. **Timeline hak**: domain sumbu mencakup semua data (zona "Sebelum 2020" dengan tanda patah sumbu), padding sisi ≥ 24px, label "Hari ini" di atas sumbu, titik tahun sama ditumpuk + "×N".
6. **Hierarki judul**: section aksi = serif 24px; section informatif = sans 18px semibold; teks bantu ≥ 13px.
7. **Mobile**: filter daftar aset = tombol "Filter (n aktif)" → bottom sheet (bukan sticky); Top-10 dua baris (nama penuh di atas, bar di bawah); heatmap & tabel wilayah → list, tanpa scroll horizontal.
8. **Warna High light = terakota `#C26159`** (bukan oranye): satu-satunya nilai yang lolos 3:1 sekaligus terpisah dari Medium; dibedakan dari Critical lewat bentuk + label. *Disetujui user 19 Nov 2026.*
9. **Chart**: setiap chart punya ringkasan teks `aria-describedby` dibangun dari data; bar klik-able wajib punya alternatif keyboard (daftar/tabel berisi link).
