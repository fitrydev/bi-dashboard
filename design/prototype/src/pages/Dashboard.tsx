import { useState } from "react";
import { AlertTriangle, ArrowRight, Hourglass } from "lucide-react";
import { Section, Tag, PageHeader, LinkButton } from "@/components/ui/primitives";
import { CoverageBar } from "@/components/charts/CoverageBar";
import { StackedShare } from "@/components/charts/StackedShare";
import { TopValue } from "@/components/charts/TopValue";
import { CategoryValue } from "@/components/charts/CategoryValue";
import { Heatmap } from "@/components/charts/Heatmap";
import { RegionTable } from "@/components/charts/RegionTable";
import { RightTimeline } from "@/components/charts/RightTimeline";
import { Schedule } from "@/components/charts/Schedule";
import { RiskMarker } from "@/components/risk/RiskMarker";
import { assessedRows, byValueDesc, countWarn, expiredRows, expiringRows, idleRows, idleValue, regionShare, rows, stats, totalValue, RISK_LABEL, type WarnKey } from "@/lib/data";
import { formatAngka, formatPersen, formatRupiahRingkas, formatRupiahEksak, formatSkor, formatTanggal, kapital, kataBilangan } from "@/lib/format";
import { dueOf } from "@/lib/scoring";
import { href } from "@/lib/router";

const Sementara = () => <Tag><Hourglass size={12} aria-hidden="true" />Sementara · berdasar {formatAngka(stats.assessed)} aset</Tag>;
const title = (s: string) => (s === "DKI JAKARTA" ? "DKI Jakarta" : s.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase()));

function Kpi({ label, value, note, to, alert }: { label: string; value: string; note: string; to?: string; alert?: boolean }) {
  const inner = (
    <>
      <dt className={`flex items-center gap-1.5 text-label ${alert ? "font-medium" : "text-ink-muted"}`} style={alert ? { color: "var(--risk-critical-ink)" } : undefined}>
        {alert && <RiskMarker level="critical" size={12} />}{label}
      </dt>
      <dd className={`mt-0.5 font-serif text-title font-semibold tabular-nums leading-tight sm:text-[1.75rem] ${alert ? "" : "text-ink"}`} style={alert ? { color: "var(--risk-critical-ink)" } : undefined}>{value}</dd>
      <dd className="mt-1 text-label text-ink-subtle">{note}</dd>
    </>
  );
  const cls = `block py-3 pr-4 ${alert ? "border-l-2 pl-3" : ""}`;
  const st = alert ? { borderLeftColor: "var(--risk-critical)" } : undefined;
  return to ? <a href={to} style={st} className={`tab-t ${cls} hover:bg-surface-sunken`}>{inner}</a> : <div style={st} className={cls}>{inner}</div>;
}

export function Dashboard() {
  const [basis, setBasis] = useState(false);
  const { total, lowCoverage } = stats;
  const topUn = byValueDesc.find((r) => !r.assessment)!;
  const one = assessedRows[0];
  const dataWarns: { k: WarnKey; text: string; n: number; note: string }[] = [
    { k: "nilai-placeholder", n: countWarn("nilai-placeholder"), text: "aset bernilai placeholder Rp1", note: "Tidak dihitung di agregat nilai buku." },
    { k: "luas-placeholder", n: countWarn("luas-placeholder"), text: "aset berluas placeholder 1 m²", note: "Luas belum diisi dari sumber." },
    { k: "tgl-masa-depan", n: countWarn("tgl-masa-depan"), text: "aset bertanggal monitoring di masa depan", note: `Seluruhnya ${stats.futureMonDates.map((d) => formatTanggal(d, "penuh")).join(", ")}; jadwal tidak bisa dihitung dari kolom ini.` },
    { k: "perlu-review", n: countWarn("perlu-review"), text: "aset berstatus \"Produktif\" perlu review", note: "Dipetakan ke \"Digunakan sendiri\"; konfirmasi maknanya." },
  ];
  const aksi = expiredRows.length + expiringRows.length;
  const tak = rows.filter((r) => dueOf(r).status === "tak-terjadwal").length;

  const Hak = ({ r, kind }: { r: (typeof rows)[number]; kind: "lewat" | "segera" }) => (
    <li className={`border-b border-rule ${kind === "lewat" ? "" : ""}`}>
      <a href={href(`/aset/${r.code}`)} className="tab-t grid min-h-14 grid-cols-[1.25rem_1fr_auto] items-center gap-x-3 px-2 py-2.5 hover:bg-surface-sunken">
        <RiskMarker level={kind === "lewat" ? "critical" : "high"} size={14} />
        <span className="min-w-0"><span className="text-body font-medium">{r.name}</span><span className="block text-label text-ink-subtle"><span className="font-mono">{r.code}</span> · {r.legal_status ?? "Status legal kosong"}</span></span>
        <span className="text-right text-body tabular-nums" style={{ color: kind === "lewat" ? "var(--risk-critical-ink)" : "var(--risk-high-ink)" }}>{kind === "lewat" ? "Berakhir " : "Berakhir "}{formatTanggal(r.right_expiry_date)}</span>
      </a>
    </li>
  );

  return (
    <>
      <PageHeader
        title={lowCoverage ? `Baru ${kataBilangan(stats.assessed)} dari ${formatAngka(total)} aset yang dinilai. Mulai dari yang paling bernilai.` : `${formatAngka(stats.assessed)} dari ${formatAngka(total)} aset sudah dinilai`}
        sub={<>Register risiko {formatAngka(total)} aset properti per {formatTanggal(new Date("2026-11-19"))}. Skor dihitung dari parameter versi 1.</>}
        action={<LinkButton variant="primary" href={href(`/nilai/${topUn.code}`)}>Mulai penilaian — urut dari nilai buku tertinggi <ArrowRight size={16} aria-hidden="true" /></LinkButton>}
      />

      <dl className="mt-4 grid grid-cols-2 gap-x-6 border-b border-rule md:grid-cols-5 [&>*]:border-b [&>*]:border-rule md:[&>*]:border-b-0 md:[&>*]:border-r md:[&>*:last-child]:border-r-0 [&>*:nth-last-child(-n+1)]:border-b-0">
        <Kpi label="Aset terdaftar" value={formatAngka(total)} note={`${formatAngka(stats.bangunan)} bangunan, ${formatAngka(stats.tanah)} tanah`} to={href("/aset")} />
        <Kpi label="Nilai buku" value={formatRupiahRingkas(totalValue)} note={`${stats.placeholderValue} aset placeholder tidak dihitung`} />
        <Kpi label="Aset idle" value={formatAngka(idleRows.length)} note={`${formatRupiahRingkas(idleValue)} · ${formatPersen(idleValue / totalValue)} nilai buku`} to={href("/aset", { pakai: "idle" })} />
        <Kpi alert label="Hak tanah lewat" value={formatAngka(stats.expired)} note={`Ditambah ${formatAngka(stats.expiring)} berakhir < 12 bulan`} to={href("/aset", { warn: "hak-kedaluwarsa" })} />
        <Kpi label="Sudah dinilai" value={formatAngka(stats.assessed)} note={one ? `Skor ${formatSkor(one.score!)} · ${RISK_LABEL[one.level]}` : "Belum ada"} to={one ? href("/aset", { kategori: one.level }) : undefined} />
      </dl>

      <Section level="action" first id="tindakan" title={`${kapital(kataBilangan(stats.expired))} hak tanah sudah lewat masa berlaku, ${kataBilangan(stats.expiring)} lagi berakhir kurang dari 12 bulan`}
        sub="Perlu tindakan: temuan risiko hukum, terpisah dari kualitas data. Tiap baris membuka detail aset.">
        <ul className="border-t border-rule">
          {expiredRows.map((r) => <Hak key={r.code} r={r} kind="lewat" />)}
          {expiringRows.map((r) => <Hak key={r.code} r={r} kind="segera" />)}
        </ul>
        {aksi === 0 && <p className="text-body text-ink-muted">Tidak ada hak yang lewat atau segera berakhir.</p>}
      </Section>

      <Section level="action" id="antrean" title="Antrean penilaian: 10 aset bernilai buku tertinggi"
        sub="Urutan penilaian yang disarankan. Marker ? = belum dinilai; kategori hanya lewat marker, bukan warna batang.">
        <TopValue />
      </Section>

      <Section id="kualitas" title="Kualitas data perlu dibereskan sebelum angka bisa dipercaya"
        sub="Peringatan data dari file Excel asli. Tiap baris membuka daftar aset terkait.">
        <ul className="border-t border-rule">
          {dataWarns.map((w) => (
            <li key={w.k} className="border-b border-rule">
              <a href={href("/aset", { warn: w.k })} className="tab-t grid min-h-14 grid-cols-[1.25rem_1fr_auto] items-center gap-x-3 px-2 py-2.5 hover:bg-surface-sunken">
                <AlertTriangle size={16} strokeWidth={1.75} className="text-status-warning" aria-hidden="true" />
                <span className="min-w-0"><span className="text-body">{w.text}</span><span className="block text-label text-ink-subtle">{w.note}</span></span>
                <span className="flex items-baseline gap-3"><span className="font-serif text-title font-semibold tabular-nums">{formatAngka(w.n)}</span><span className="hidden text-label underline underline-offset-2 sm:inline">Lihat {formatAngka(w.n)} aset</span></span>
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="wilayah" title={`Idle ${formatAngka(idleRows.length)} aset bernilai ${formatRupiahRingkas(idleValue)}, sekitar ${formatPersen(idleValue / totalValue)} dari nilai buku`}
        sub={`Wilayah dan jenis. ${formatPersen(regionShare.share)} aset ada di ${title(regionShare.top)}; ${regionShare.regions} provinsi, jadi tabel lebih jujur daripada peta.`}>
        <RegionTable />
      </Section>

      <Section id="hak" title={`Masa berlaku hak: ${kataBilangan(stats.expired)} sudah lewat, ${kataBilangan(stats.expiring)} berakhir tahun depan`}
        sub="Hanya aset tanah memiliki tanggal hak.">
        <RightTimeline />
      </Section>

      <Section id="jadwal" title={`Jadwal monitoring belum bisa dihitung untuk ${formatAngka(tak)} aset`}
        sub="Jadwal monitoring berikutnya = tanggal penilaian + interval kategori.">
        <Schedule />
      </Section>

      {lowCoverage ? (
        <Section id="analisis" tag={<Sementara />} title="Analisis risiko aktif setelah lebih banyak aset dinilai"
          sub={`Sebaran kategori, nilai per kategori, heatmap indikator, dan tren perlu cakupan minimal ${formatPersen(0.2)} aset (${formatAngka(stats.target)} aset). Sebelum itu persentase belum bermakna.`}>
          <div className="max-w-xl">
            <div className="mb-1 flex items-baseline justify-between text-label"><span className="text-ink-muted">Menuju {formatAngka(stats.target)} aset dinilai</span><span className="tabular-nums font-medium">{formatAngka(stats.assessed)} / {formatAngka(stats.target)}</span></div>
            <CoverageBar thin />
            <p className="mt-2 text-label text-ink-subtle">Segmen berarsir = belum punya skor. Belum dinilai bukan berarti rendah. Tren: baru {formatAngka(stats.periods)} periode penilaian ({formatTanggal(one?.assessment?.assessed_at)}); butuh minimal dua periode.</p>
          </div>
          <h3 className="mb-2 mt-6 text-label font-medium">Heatmap indikator, hanya aset yang sudah dinilai <span className="ml-1 font-normal text-ink-subtle">(sementara)</span></h3>
          <Heatmap ratedOnly />
        </Section>
      ) : (<>
        <Section id="c" tag={<Sementara />} title="Sebaran kategori risiko" sub="Dasar persen: seluruh aset, kecuali dicentang."><StackedShare onlyAssessed={basis} onToggle={setBasis} /></Section>
        <Section id="d" title="Nilai buku per kategori" sub={`Total ${formatRupiahRingkas(totalValue)} (${formatRupiahEksak(totalValue)}), placeholder tidak dihitung.`}><CategoryValue /></Section>
        <Section id="e" title="Heatmap indikator" sub="Skor 1–5 per indikator, bobot di header."><Heatmap /></Section>
      </>)}
    </>
  );
}
