import { AlertTriangle, ArrowRight } from "lucide-react";
import { LinkButton } from "@/components/ui/primitives";
import { RiskBadge } from "@/components/risk/RiskBadge";
import { RiskMarker } from "@/components/risk/RiskMarker";
import { ScoreBar } from "@/components/risk/ScoreBar";
import { criteria, INDICATORS, RISK_LABEL, rowByCode, WARN_LABEL } from "@/lib/data";
import { formatLuas, formatRupiahEksak, formatSkor, formatTanggal } from "@/lib/format";
import { categoryInfo, dueOf, dueText, intervalText } from "@/lib/scoring";
import { href } from "@/lib/router";

const title = (s: string) => (s === "DKI JAKARTA" ? "DKI Jakarta" : s.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase()));

function Bullet({ score }: { score: number | null }) {
  return (
    <div className="relative h-3" role="img" aria-label={score == null ? "Belum diketahui" : `Skor ${score} dari 5`}>
      <div className={`absolute inset-x-0 top-1 h-2 border border-rule ${score == null ? "hatch-unrated" : "bg-surface-sunken"}`} />
      {[1, 2, 3, 4, 5].map((t) => <span key={t} className="absolute top-0 h-3 w-px bg-rule-strong" style={{ left: `${((t - 1) / 4) * 100}%` }} />)}
      {score != null && <span className="absolute top-0 size-3 -translate-x-1/2 bg-ink" style={{ left: `${((score - 1) / 4) * 100}%` }} />}
    </div>
  );
}

export function Detail({ code }: { code: string }) {
  const r = rowByCode.get(code);
  if (!r) return <div><h1 className="text-title">Aset tidak ditemukan</h1><p className="mt-2">ID {code} tidak ada di register. <a className="link" href="#/aset">Kembali ke daftar aset</a></p></div>;
  const a = r.assessment;
  const info = categoryInfo(r.level);
  const due = dueOf(r);
  const meta: [string, React.ReactNode][] = [
    ["ID", <span className="font-mono">{r.code}</span>], ["Jenis", r.type], ["Wilayah", title(r.region)],
    ["Nilai buku", r.value ? <span title={formatRupiahEksak(r.value)}>{formatRupiahEksak(r.value)}</span> : <span className="text-status-warning">— (placeholder)</span>],
    ["Luas tanah", formatLuas(r.land_area_m2)], ["Luas bangunan", formatLuas(r.building_area_m2)],
    ["Pemanfaatan", r.utilization ?? "—"], ["Status legal", r.legal_status ?? "—"],
    ["Hak berakhir", formatTanggal(r.right_expiry_date)], ["PIC", r.pic ?? "—"],
  ];
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-3 text-label text-ink-muted"><a className="link" href="#/aset">Aset</a> / <span className="text-ink">{r.name}</span></nav>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-rule-strong pb-5">
        <div className="min-w-0 max-w-[68ch]">
          <h1 className="text-title sm:text-display">{r.name}</h1>
          <p className="mt-2 text-body text-ink-muted">{r.address ?? "Alamat belum diisi"}</p>
        </div>
        <LinkButton variant="primary" href={href(`/nilai/${r.code}`)}>{a ? "Nilai ulang" : "Nilai aset ini"} <ArrowRight size={16} aria-hidden="true" /></LinkButton>
      </header>

      <div className="mt-6 grid gap-x-12 gap-y-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0">
          <section aria-labelledby="skor-h">
            <h2 id="skor-h" className="mb-3 text-subtitle">Skor risiko</h2>
            {a ? (
              <div className="max-w-xl">
                <div className="mb-2 flex items-baseline gap-3"><span className="font-serif text-display font-semibold tabular-nums">{formatSkor(r.score!)}</span><RiskBadge level={r.level} override={a.critical_override} /></div>
                <ScoreBar score={r.score} level={r.level} />
                <p className="mt-2 text-label text-ink-subtle">Skala 20–100; ambang 40 Medium, 60 High, 80 Critical. Dinilai {formatTanggal(a.assessed_at)}, parameter versi 1.</p>
              </div>
            ) : (
              <div className="hatch-unrated max-w-xl p-5">
                <div className="flex items-center gap-3 bg-surface px-2 py-1"><RiskMarker level="unrated" size={28} /><div><p className="text-body-lg font-medium">Belum dinilai</p><p className="text-body text-ink-muted">Aset ini belum punya skor. Ini bukan berarti risikonya rendah.</p></div></div>
                <div className="mt-4"><LinkButton variant="primary" href={href(`/nilai/${r.code}`)}>Mulai penilaian</LinkButton></div>
              </div>
            )}
          </section>

          <section aria-labelledby="ind-h" className="mt-10">
            <h2 id="ind-h" className="mb-1 text-subtitle">Enam indikator</h2>
            <p className="mb-3 text-label text-ink-subtle">1 = risiko sangat rendah, 5 = risiko sangat tinggi.</p>
            <ul className="border-t border-rule">
              {INDICATORS.map((i) => {
                const s = a ? a.scores[i.key] : null;
                return (
                  <li key={i.key} className="border-b border-rule py-3">
                    <div className="mb-2 flex items-baseline justify-between gap-3"><span className="text-body font-medium">{i.label} <span className="font-normal text-ink-subtle">· bobot {Math.round(i.weight * 100)}%</span></span><span className="text-body font-semibold tabular-nums">{s == null ? "?" : `${s} dari 5`}</span></div>
                    <Bullet score={s} />
                    <p className="mt-2 text-label text-ink-muted max-w-[72ch]">{s != null ? criteria[i.key][String(s)] : a ? "Belum diketahui." : "Belum dinilai."}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="min-w-0 space-y-8">
          <section aria-labelledby="id-h"><h2 id="id-h" className="mb-2 text-subtitle">Identitas</h2>
            <dl className="border-t border-rule">{meta.map(([k, v]) => <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 border-b border-rule py-2 text-body"><dt className="text-ink-muted">{k}</dt><dd className="tabular-nums">{v}</dd></div>)}</dl></section>

          <section aria-labelledby="w-h"><h2 id="w-h" className="mb-2 text-subtitle">Peringatan data</h2>
            {r.warnings.length ? <ul className="border-t border-rule">{r.warnings.map((w) => <li key={w} className="flex items-start gap-2 border-b border-rule py-2 text-body"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-status-warning" aria-hidden="true" />{WARN_LABEL[w]}</li>)}</ul> : <p className="border-t border-rule pt-2 text-body text-ink-muted">Tidak ada peringatan untuk aset ini.</p>}</section>

          <section aria-labelledby="rek-h"><h2 id="rek-h" className="mb-2 text-subtitle">Rekomendasi monitoring</h2>
            {info ? (
              <dl className="border-t border-rule text-body">
                {([["Kategori", RISK_LABEL[r.level]], ["Frekuensi", info.frequency], ["Metode", info.method], ["Tindakan", info.action], ["Interval", intervalText(r.level)], ["Jatuh tempo", dueText(due)]] as const).map(([k, v]) => <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 border-b border-rule py-2"><dt className="text-ink-muted">{k}</dt><dd>{v}</dd></div>)}
              </dl>
            ) : <p className="border-t border-rule pt-2 text-body text-ink-muted">Frekuensi dan metode ditentukan setelah aset dinilai. Jatuh tempo: belum dapat dijadwalkan.</p>}
          </section>
        </div>
      </div>
    </>
  );
}
