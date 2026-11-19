# bi-dashboard — Risk-Based Asset Monitoring 2027

Web app pengganti Excel `source/Template_Matriks_Risiko_Monitoring_Aset_2027.xlsx` (read-only, jangan diubah).

- Rencana & keputusan: `docs/PLAN.md` (§9 keputusan, §10 status fase). Analisa kolom/formula/chart: `docs/ANALISA_EXCEL.md`.
- Stack: Next.js 16 (App Router, `proxy.ts`), React 19, Tailwind 4, shadcn/ui, Recharts 3, Supabase (Postgres + Auth Google + allowlist), Vercel Hobby `sin1`, Supabase Free Singapore.
- Komunikasi & copy UI: Bahasa Indonesia. Format angka id-ID.
- Kerja sub-agent driven dengan model dinamis: haiku = ringan/mekanis, sonnet = sedang, opus = berat/keamanan/verifikasi.
- Skala skor: 1 = risiko sangat rendah, 5 = sangat tinggi. Skor = Σ(skor×bobot)/5×100. "Belum dinilai" tidak boleh tampil seperti Low.
- Logika skor: satu sumber kebenaran di Postgres; parameter berversi.
- UI: anti AI-slop, arah "Buku Besar Risiko" (lihat `DESIGN.md` setelah Fase 0).
- Excel lib: SheetJS dari cdn.sheetjs.com, bukan npm `xlsx`.
