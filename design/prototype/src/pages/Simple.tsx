import { PageHeader } from "@/components/ui/primitives";
import { RiskBadge } from "@/components/risk/RiskBadge";
import { rows, params, INDICATORS, stats } from "@/lib/data";
import { dueOf, dueText, intervalText } from "@/lib/scoring";
import { href } from "@/lib/router";
import { formatAngka, formatTanggal } from "@/lib/format";
import { LEVELS } from "@/lib/data";

export function Jadwal() {
  const rated = rows.filter((r) => r.assessment);
  return (
    <>
      <PageHeader title="Jadwal monitoring" sub="Jadwal berikutnya = tanggal penilaian + interval kategori. Aset yang belum dinilai belum bisa dijadwalkan." />
      <section className="mt-8">
        <h2 className="mb-3 text-subtitle">Terjadwal</h2>
        <ul className="border-t border-rule">
          {rated.map((r) => { const d = dueOf(r); return (
            <li key={r.code} className="grid min-h-14 grid-cols-[1fr_auto] items-center gap-3 border-b border-rule py-2">
              <div><a className="link" href={href(`/aset/${r.code}`)}>{r.name}</a><div className="text-label text-ink-muted">{formatTanggal(r.assessment!.assessed_at)} dinilai · <RiskBadge level={r.level} size="sm" /> {intervalText(r.level)}</div></div>
              <div className="text-right text-body tabular-nums">{dueText(d)}</div>
            </li>); })}
        </ul>
        <h2 className="mb-2 mt-10 text-subtitle">Belum dapat dijadwalkan</h2>
        <p className="max-w-[68ch] text-body text-ink-muted">{formatAngka(rows.length - rated.length)} aset belum dinilai. Tanggal &quot;monitoring terakhir&quot; di Excel ({stats.futureMonDates.map((d) => formatTanggal(d)).join(", ")}) berada di masa depan sehingga tidak dipakai. <a className="link" href={href("/aset", { kategori: "unrated" })}>Lihat daftar</a></p>
      </section>
    </>
  );
}

export function Panduan() {
  return (
    <>
      <PageHeader title="Panduan membaca skor" sub="Cara skor dan kategori dihitung. Satu sumber kebenaran, parameter versi 1." />
      <div className="mt-8 max-w-[68ch] space-y-8 text-body-lg">
        <section><h2 className="mb-2 text-subtitle">Skala indikator</h2><p>Tiap indikator diberi skor 1 sampai 5. 1 = risiko sangat rendah, 5 = risiko sangat tinggi. Skor tinggi berarti risiko tinggi.</p></section>
        <section><h2 className="mb-2 text-subtitle">Rumus</h2><p className="font-mono text-body">Skor = Σ(skor × bobot) / 5 × 100</p>
          <ul className="mt-2 border-t border-rule text-body">{INDICATORS.map((i) => <li key={i.key} className="flex justify-between border-b border-rule py-2"><span>{i.label}</span><span className="tabular-nums">{Math.round(i.weight * 100)}%</span></li>)}</ul></section>
        <section><h2 className="mb-2 text-subtitle">Kategori</h2>
          <ul className="border-t border-rule text-body">{LEVELS.filter((l) => l !== "unrated").map((l) => { const c = params.categories.find((x) => x.key === l)!; const t = params.thresholds; const rng = l === "critical" ? `≥ ${t.critical}` : l === "high" ? `${t.high} – <${t.critical}` : l === "medium" ? `${t.medium} – <${t.high}` : `< ${t.medium}`; return (
            <li key={l} className="grid grid-cols-[8rem_5rem_1fr] items-center gap-2 border-b border-rule py-2"><RiskBadge level={l} /><span className="tabular-nums">{rng}</span><span className="text-ink-muted">{c.frequency}</span></li>); })}
            <li className="grid grid-cols-[8rem_5rem_1fr] items-center gap-2 border-b border-rule py-2"><RiskBadge level="unrated" /><span>—</span><span className="text-ink-muted">Belum punya skor. Bukan Low.</span></li></ul></section>
      </div>
    </>
  );
}
