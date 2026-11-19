# Analisa Detail Excel — Template_Matriks_Risiko_Monitoring_Aset_2027.xlsx

Pelengkap `docs/PLAN.md`. Dokumen ini dibuat dari analisa programatik (openpyxl) atas setiap sel, format, validasi, formula, dan conditional formatting.

---

## 1. Peta workbook dan alur data (lineage)

```
                   ┌──────────────┐
                   │  Parameter   │  C5:C10 bobot desimal, B14:F17 ambang/frekuensi/metode (teks)
                   └──────┬───────┘
                          │ (hanya C5:C10 yang dirujuk formula!)
┌──────────────┐   A=link baris  ┌────────────────────┐   link baris   ┌────────────────────┐
│ Master Aset  │───────────────▶│  Penilaian Risiko   │──────────────▶│  Jadwal Monitoring  │
│ (input)      │◀── INDEX/MATCH ─│ B,C,D (identitas)   │                │ E,F dari Penilaian  │
│              │◀────────────────────────── INDEX/MATCH (G=Tgl monitoring, K=PIC) ───────────│
└──────────────┘                 └─────────┬──────────┘                └────────────────────┘
                                           │ COUNTIF
                                    ┌──────▼──────┐
                                    │  Dashboard  │
                                    └─────────────┘
 Kriteria Skor  → referensi teks saja (tidak dirujuk formula; bobot B5:B10 duplikat Parameter B5:B10)
 Petunjuk       → teks saja
```

- Tidak ada named range, tabel Excel, proteksi sheet, makro, maupun pivot. Semua sheet data memiliki autofilter di baris 4.
- Kapasitas template **200 baris** (baris 5–204). Semua range lookup di-hardcode `$5:$204`.

---

## 2. Kamus data per kolom

Keterangan: **I** = input, **F** = formula, **V** = validasi Excel, Fill biru `#EAF3F8` = penanda kolom input.

### 2.1 Master Aset (A4:N204, freeze K5, 136 baris terisi)

| Kol | Header | Peran | Tipe di Excel (aktual) | Format | Validasi | Terisi | Tipe di Postgres | Catatan |
|---|---|---|---|---|---|---|---|---|
| A | ID Aset | I, kunci | int (788–251116) | General | — | 100% | `text` (kode) unik | Kode, bukan angka. Disimpan sebagai teks supaya leading zero aman |
| B | Nama Aset | I | str (maks 40 karakter) | General | — | 100% | `text` | 52 nama generik berulang ("BANGUNAN KELAS 1/2/3") |
| C | Jenis Aset | I | str | General | **V list**: Tanah, Bangunan, Gabungan | 100% | `enum asset_type` | Aktual: Bangunan 121, Tanah 15 |
| D | Distrik/Daerah | I | str | General | — (bebas) | 100% | FK `regions` | Rawan typo, jadi dibuat lookup |
| E | Alamat/Lokasi | I | str (maks 105 karakter) | General | — | 97% | `text` | 76 baris memakai alamat sama "JAKARTA - KAPERWAJA - DUREN TIGA" |
| F | Luas Tanah (m²) | I | int | General | — | 100% | `numeric(14,2)` | 39 baris bernilai 1 (placeholder) |
| G | Luas Bangunan (m²) | I | — | General | — | **0%** | `numeric(14,2)` null | Kolom mati saat ini |
| H | Nilai Buku/Estimasi (Rp) | I | int 58 / float 78 | Accounting 2 desimal | — | 100% | `numeric(18,2)` | 44 baris bernilai Rp1 (placeholder) |
| I | Status Hak/Legalitas | I | str | General | — (bebas) | 100% | `text` (+ enum kandidat) | 100% "Clean dan Clear" |
| J | Tanggal Akhir Hak | I | **str "dd/mm/yyyy"** | General | — | 11% (hanya tanah) | `date` | **Teks, bukan tanggal**, jadi tidak bisa dihitung di Excel |
| K | Status Pemanfaatan | I | str | General | **V list**: Digunakan sendiri, Disewakan/Kerja sama, Idle/Kosong, Digunakan pihak lain, Lainnya | 100% | `enum utilization` | Aktual "Produktif" 123, "Idle" 11, "Idle/Kosong" 2. **Mayoritas melanggar validasi** (data hasil paste) |
| L | Tgl Monitoring Terakhir | I | datetime | dd-mmm-yyyy | — | 100% | `date` (turunan dari `monitoring_events`) | 100% bernilai 31-12-2026 (masa depan) |
| M | PIC/Unit Pengelola | I | str | General | — | 100% | `text` / FK unit | 1 nilai seragam |
| N | Catatan | I | — | General | — | 0% | `text` | — |

### 2.2 Penilaian Risiko (A4:U204, autofilter, 1 baris dinilai)

| Kol | Header | Peran | Formula / tipe | Postgres |
|---|---|---|---|---|
| A | ID Aset | **F** (berfill input!) | `='Master Aset'!A{r}` (link posisi baris) | `asset_id uuid FK` |
| B/C/D | Nama/Jenis/Distrik | F lookup | `IFERROR(INDEX('Master Aset'!B$5:B$204, MATCH($A{r}, 'Master Aset'!A$5:A$204, 0)), "")` | join, tidak disimpan |
| E | Tanggal Penilaian | I | datetime, dd-mmm-yyyy | `assessed_at date` |
| F–K | 6 skor indikator | I | **V whole 1–5**, allowBlank, pesan error "Masukkan skor bilangan bulat 1 sampai 5." | `smallint check (between 1 and 5)` nullable |
| L | Skor Total (0–100) | F | `IF(COUNT(F:K)<6, "", Σ(skor×Parameter!C5..C10)/5*100)`, format `0.0` | `numeric(5,2)` dihitung fungsi DB |
| M | Critical Override | I | **V list** TIDAK, YA | `boolean` + `override_reason` |
| N | Kategori Akhir | F | nested IF (lihat §3) | `enum risk_category` |
| O | Frekuensi Usulan | F | nested IF, teks hardcode | dari `scoring_params` |
| P | Metode Usulan | F | nested IF, teks hardcode | dari `scoring_params` |
| Q | Kelengkapan Data | F | `IF(A="", "", IF(COUNT(F:K)=6, "Lengkap", "Belum lengkap"))` | `is_complete` generated |
| R/S/T | Catatan, Tindak Lanjut, PIC | I | str | `text` |
| U | Target Selesai | I | date | `date` |

Conditional formatting:
- **N** Critical: fill `#FCE4D6`, font `#C00000`.
- **N** High: fill `#FCE4D6`, font `#C65911`. Critical dan High berbagi warna latar yang sama, sehingga sulit dibedakan.
- **N** Medium: `#FFF2CC`. Low: `#E2F0D9`.
- **Q** "Belum lengkap": `#FFF2CC`, sama dengan Medium sehingga ambigu.

### 2.3 Jadwal Monitoring (seluruhnya formula, freeze A5)

| Kol | Header | Formula | Postgres (view) |
|---|---|---|---|
| A–F | ID, Nama, Jenis, Distrik, Kategori, Skor | `IF('Penilaian Risiko'!A{r}="", "", 'Penilaian Risiko'!X{r})` (link baris) | join `v_asset_latest` |
| G | Tgl Monitoring Terakhir | INDEX/MATCH ke Master L | `max(monitoring_events.monitored_at)` |
| H | Interval (bulan) | IF Critical 1 / High 3 / Medium 6 / Low 12 (hardcode) | `scoring_params.intervals` |
| I | Tgl Jatuh Tempo | `EDATE(G, H)` | `last_monitored + make_interval(months => h)` |
| J | Metode | nested IF (teks **berbeda** dari Penilaian P) | `scoring_params.methods` |
| K | PIC | INDEX/MATCH ke Master M | join |
| L | Status Jadwal | `IF(E="BELUM LENGKAP", "Belum dapat dijadwalkan", IF(G="", "Isi tgl…", IF(I<TODAY(), "Jatuh tempo / overdue", "Terjadwal")))` | `case` di view, berbasis `current_date` |

CF L: "Jatuh tempo / overdue" fill `#FCE4D6`, font `#C00000`. Tidak ada status "segera jatuh tempo (≤30 hari)", padahal status ini paling berguna untuk perencanaan.

### 2.4 Dashboard (B4, E4, H4, B8:B12)

Isinya `COUNTIF` ke kolom A/Q/N Penilaian, angka biasa tanpa chart. C8:D12 berisi teks hardcode.

### 2.5 Parameter dan Kriteria Skor

- **Parameter** A5:F10 berisi indikator, bobot (int), bobot desimal (dipakai formula), batas 1–5, dan catatan.
- **Parameter** A14:F17 berisi kategori, skor min/max, frekuensi, metode, dan tindakan. **Tidak dirujuk formula mana pun.** Ambang 80/60/40 di-hardcode di N, dan interval di-hardcode di Jadwal H. Jadi mengubah Parameter tidak akan mengubah apa pun.
- **Kriteria Skor** berisi rubrik 6×5 dan kolom bobot duplikat.

---

## 3. Formula inti (diterjemahkan)

```
skor_total = (F·0.20 + G·0.25 + H·0.15 + I·0.15 + J·0.10 + K·0.15) / 5 × 100
           → minimum efektif 20 (semua skor 1), maksimum 100
           → band "Low 0–39,99" efektif 20–39,99
kategori   = YA → Critical  |  skor "" → BELUM LENGKAP  |  ≥80 Critical | ≥60 High | ≥40 Medium | Low
```

**Uji parity:** (1,2,4,3,3,2) menghasilkan 0,2+0,5+0,6+0,45+0,3+0,3 = 2,35, lalu /5×100 = **47,0**, yaitu **Medium**. Hasil ini sama dengan Excel.

---

## 4. Bug dan risiko formula (selain temuan data di PLAN §2.4)

| # | Bug | Bukti | Dampak |
|---|---|---|---|
| F1 | **Baris kosong terhitung.** Untuk baris 141–204, `='Master Aset'!A141` (kosong) menghasilkan **0**, bukan "". Akibatnya `COUNTIF(A, "<>")` menghitung 200, Q bernilai "Belum lengkap", dan N bernilai "BELUM LENGKAP" | Pola formula sama sampai baris 204 | Dashboard: **Total dinilai = 200** (seharusnya 136), **Belum Lengkap = 199** (seharusnya 135). Jadwal menampilkan 64 aset fiktif "ID 0" |
| F2 | ID di Penilaian ditautkan per **posisi baris**, bukan per ID, padahal Petunjuk menyuruh "isi ID aset" | A5 = `'Master Aset'!A5` | Sort/insert/hapus baris di Master membuat skor menempel ke aset yang salah, dan ini tidak terdeteksi |
| F3 | Skor tersimpan **di baris yang sama** dengan aset, sehingga tidak ada riwayat | Satu baris per aset | Penilaian ulang menimpa nilai lama, jadi tren tidak bisa dibuat |
| F4 | Parameter ambang/interval/metode **tidak terhubung** (hardcode di 3 tempat) | N, O, P, H, J | Kalibrasi parameter tidak berefek, dan teks bisa saling tidak konsisten (D9) |
| F5 | `COUNT(F:K)` menghitung angka di luar 1–5 jika validasi dilewati (paste) | DV hanya berlaku saat ketik | Skor 0 atau 7 hasil paste tetap terhitung |
| F6 | Override YA tanpa catatan tetap diterima | Tidak ada pengecekan | Melanggar aturan Parameter A20 ("wajib disertai catatan, bukti, PIC") |
| F7 | `TODAY()` volatile, sehingga status jadwal berubah tergantung kapan file dibuka | L Jadwal | Di web dihitung server-side berbasis tanggal Asia/Jakarta |
| F8 | Tgl Akhir Hak berupa teks, jadi tidak ada formula masa berlaku hak | J Master | Indikator Legalitas tidak dibantu data, dan hak kedaluwarsa lolos (D2) |
| F9 | Warna CF Critical = High (latar sama), Medium = "Belum lengkap" | §2.2 | Sinyal visual ambigu. Di web memakai palet + bentuk + label |
| F10 | Validasi K (Pemanfaatan) dilanggar oleh 134/136 baris | §2.1 | Import web wajib memakai tabel alias + keputusan mapping |

Semua bug di atas hilang di arsitektur web karena relasi memakai FK `asset_id`, skor dihitung satu fungsi DB yang membaca `scoring_params` berversi, penilaian bersifat append-only (riwayat), dan constraint `CHECK` berlaku untuk semua jalur input termasuk import.

---

## 5. Analisa chart: pertanyaan → data → chart yang cocok

Prinsip:
1. Setiap chart menjawab satu pertanyaan bisnis.
2. Pilih bentuk paling sederhana yang benar untuk *tipe data*: kategorikal ordinal, nominal, kontinu skewed, waktu, atau matriks.
3. Status "Belum dinilai" tidak pernah digabung ke skala risiko.
4. Tidak memakai pie/donut/gauge/3D/radar untuk perbandingan.

### 5.1 Matriks keputusan

| # | Pertanyaan | Data & tipe | Chart **dipilih** | Kenapa | Ditolak & alasannya |
|---|---|---|---|---|---|
| 1 | Berapa aset yang sudah dinilai? | Proporsi (1/136) | **Progress bar bersegmen** (segmen = kategori, sisa diarsir) + kalimat | Satu angka bagian-dari-keseluruhan. Segmen sekaligus memberi preview kategori | Donut/gauge: sulit dibaca, boros ruang |
| 2 | Sebaran kategori risiko | Ordinal 5 kelas (+ belum) | **Satu stacked bar 100% horizontal** dengan label langsung + tabel jumlah | Urutan Critical→Low terjaga, mudah dibandingkan, muat di mobile | Pie: urutan ordinal hilang, slice kecil (1 aset) tak terlihat |
| 3 | Berapa nilai Rp di tiap kategori risiko? | Ordinal × Rp | **Bar horizontal per kategori (Rp)** berdampingan dengan jumlah aset (*count vs value*) | Kategori dengan sedikit aset bisa memegang nilai besar. Ini insight utama manajemen | Dual-axis: menyesatkan |
| 4 | Aset mana yang paling bernilai dan bagaimana risikonya? | Rp kontinu, **sangat skewed** (top 1 = 15%, top 10 = 39%, top 20 = 50%) | **Ranked bar Top-10/20** dengan marker kategori di ujung bar | Distribusi skew: ranked list lebih jujur dari treemap untuk 136 item | Treemap: label kecil, tidak aksesibel di mobile |
| 5 | Seberapa terkonsentrasi nilai portofolio? | Kumulatif Rp | **Kurva Pareto** (bar terurut + garis kumulatif %), ditampilkan di halaman Analitik | "20 aset = 50% nilai" menentukan prioritas penilaian | — |
| 6 | Hubungan risiko vs nilai (prioritas) | Skor 20–100 × Rp (log) | **Scatter / bubble quadrant** (x = skor, y = nilai log, garis ambang 40/60/80). Muncul setelah ≥30% dinilai | Kuadran "risiko tinggi + nilai tinggi" = prioritas #1 | Heat-grid 5×5 likelihood × impact: model Excel tidak punya sumbu likelihood/impact, jadi akan mengarang data |
| 7 | Kenapa aset berisiko (driver)? | 6 indikator ordinal 1–5 × aset | **Heatmap aset × indikator** (sel = skor + angka, sel kosong diarsir, header = bobot), urut skor | Membaca pola per indikator dan per aset sekaligus | Radar: sulit dibandingkan, area menipu |
| 8 | Indikator mana yang paling menyumbang risiko portofolio? | Rata-rata tertimbang per indikator | **Diverging/ranked bar kontribusi** (skor rata-rata × bobot) | Menunjukkan "Penguasaan menyumbang X poin" untuk fokus program | — |
| 9 | Profil satu aset | 6 skor | **Bullet bar per indikator** (skor 1–5 dengan teks rubrik) di halaman detail | Langsung terkait rubrik | Radar |
| 10 | Wilayah dan jenis | Nominal × nominal (3 wilayah × 2 jenis) | **Tabel dengan mini stacked bar** (jumlah, Rp, idle) | Hanya 3×2 sel, tabel lebih padat dan presisi | Peta choropleth: 3 provinsi, 87% DKI, sehingga peta tidak informatif. Peta titik baru berguna jika ada koordinat (usulan kolom lat/long) |
| 11 | Aset idle | Biner × Rp | **Stacked bar Produktif vs Idle (Rp dan jumlah)** + daftar 13 tanah idle | 29% nilai idle (Rp42,4 M) adalah cerita penting | — |
| 12 | Apa yang harus dimonitor minggu/bulan ini? | Tanggal jatuh tempo | **Timeline/agenda per bulan** + band Overdue / ≤30 hari / terjadwal; mobile berupa list | Actionable, terurut waktu | Gantt penuh: berlebihan |
| 13 | Beban kerja monitoring 12 bulan | Jumlah jatuh tempo per bulan | **Column chart per bulan** (stack per kategori) | Merencanakan kapasitas tim site visit | — |
| 14 | Masa berlaku hak tanah | Tanggal akhir hak (15 tanah) | **Timeline strip** (titik per aset; zona merah = lewat, kuning = <12 bln) | 3 sudah lewat, 1 lewat Sep 2027, sangat terlihat | — |
| 15 | Kualitas data | Hitungan isu per jenis | **Daftar bergaris (ledger) + angka**, bukan chart | Isunya sedikit dan harus bisa diklik ke daftar | Bar chart: tidak menambah makna |
| 16 | Tren (setelah ada riwayat) | Waktu × skor/kategori | **Line** (rata-rata skor) + **stacked area/column** jumlah per kategori per kuartal; **slope chart** perubahan antar 2 periode | Menjawab "membaik atau memburuk" | — |
| 17 | Progres penilaian dari waktu ke waktu | Kumulatif dinilai per minggu | **Step line** menuju target 136 | Memantau program penilaian 2027 | — |

### 5.2 Penempatan

- **Dashboard (storytelling):** #1 → kualitas data (#15 + #14 ringkas) → #2 → #3 → #4 → #7 (top 25) → #10/#11 → #12. Saat ada riwayat, ditambah #16.
- **Halaman Analitik** (eksplorasi, untuk manajemen): #5, #6, #8, #13, #16, #17.
- **Detail aset:** #9, riwayat skor (sparkline), status hak (#14 versi tunggal).

### 5.3 Spesifikasi teknis chart

- **Implementasi:**
  - **Recharts 3** (via shadcn chart) dipakai untuk bar, column, line, area, scatter, dan Pareto.
  - **SVG/HTML custom** dipakai untuk progress bersegmen, stacked bar tunggal, heatmap, dan timeline hak. Komponen ini ringan, aksesibel, dan tidak menambah library.
- **Data:** semua agregat dari RPC Postgres (`dashboard_summary`, `analytics_*`). Client hanya me-render.
- **Ukuran data aman:** maksimal ±1.000 titik scatter. Lebih dari itu, server melakukan binning.
- **Aksesibilitas:**
  - Tiap chart punya judul berupa kalimat-temuan (mis. "20 aset memegang 50% nilai portofolio") dan toggle "Tampilkan tabel".
  - Tiap chart punya `aria-label`.
  - Warna kategori selalu disertai bentuk dan label.
- **Format sumbu Rp:** `Rp0`, `Rp5 M`, `Rp10 M` (id-ID). Placeholder Rp1 dikecualikan dari agregat dan diberi catatan kaki.
- **Interaksi:**
  - Klik segmen/bar membuka daftar aset terfilter (filter di URL).
  - Hover/tap menampilkan nilai eksak.
  - Tidak ada animasi berlebihan (≤200 ms, menghormati reduced-motion).
