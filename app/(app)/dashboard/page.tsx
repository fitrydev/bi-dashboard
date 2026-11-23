import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, cache, type ReactNode } from "react";
import { ArrowRight, Hourglass, TriangleAlert } from "lucide-react";
import {
  CategoryValue,
  ChartEmpty,
  ChartSkeleton,
  CoverageBar,
  Heatmap,
  RegionTable,
  RightTimeline,
  Schedule,
  Sparkline,
  TopValue,
} from "@/components/charts";
import { ChartFrame } from "@/components/ledger/ChartFrame";
import { EmptyState } from "@/components/ledger/EmptyState";
import { LedgerTable } from "@/components/ledger/LedgerTable";
import { PageHeader } from "@/components/ledger/PageHeader";
import { Section } from "@/components/ledger/Section";
import { Tag } from "@/components/ledger/Tag";
import { RiskMarker, UnassessedPattern } from "@/components/risk";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { COVERAGE_TARGET, MIN_SHARE_N } from "@/lib/aggregate";
import { deriveLayout, nextToAssess, niceTicks } from "@/lib/dashboard/derive";
import { parseFilters, serializeFilters } from "@/lib/dashboard/filters";
import { loadDashboard, loadFilterOptions, type DashboardData } from "@/lib/dashboard/load";
import {
  formatAngka,
  formatBulan,
  formatPersen,
  formatRupiahEksak,
  formatRupiahRingkas,
  formatSkor,
  formatTanggal,
  formatWilayah,
  kapital,
  kataBilangan,
} from "@/lib/format";
import { asetDetail, asetList } from "@/lib/routes";
import { DEFAULT_PARAMS, RISK_LABEL, type WarnKey } from "@/lib/scoring";
import { FilterBar, SectionBoundary, ShareChart } from "./client";

export const metadata: Metadata = { title: "Dashboard" };

type SP = PageProps<"/dashboard">["searchParams"];

// ponytail: satu loader per request (React.cache, kunci = query string terserialisasi) dipakai header
// dan isi; isi di-stream sebagai satu Suspense, error data jatuh ke satu boundary. Pecah per-section
// bila tiap section kelak punya query sendiri.
const load = cache((key: string) => loadDashboard(parseFilters(new URLSearchParams(key))));
const keyOf = async (sp: SP) => serializeFilters(parseFilters(await sp)).toString();

const TYPE_LABEL = { tanah: "tanah", bangunan: "bangunan", gabungan: "gabungan" } as const;
const nilaiHref = (code: string) => `${asetDetail(code)}/nilai`;
const dayOf = (iso: string) => new Date(`${iso}T00:00:00Z`);

export default function DashboardPage(props: PageProps<"/dashboard">) {
  return (
    <>
      <UnassessedPattern />
      <SectionBoundary what="Ringkasan dashboard">
        <Suspense fallback={<HeaderSkeleton />}>
          <Header sp={props.searchParams} />
        </Suspense>
      </SectionBoundary>
      <SectionBoundary what="Daftar filter">
        <Suspense fallback={<Skeleton className="mt-4 h-11 w-full bg-rule/60" />}>
          <Filters />
        </Suspense>
      </SectionBoundary>
      <SectionBoundary what="Data dashboard">
        <Suspense fallback={<BodySkeleton />}>
          <Body sp={props.searchParams} />
        </Suspense>
      </SectionBoundary>
    </>
  );
}

async function Filters() {
  const { regions } = await loadFilterOptions();
  return <FilterBar regions={regions} />;
}

async function Header({ sp }: { sp: SP }) {
  const key = await keyOf(sp);
  const { summary, rows } = await load(key);
  const { assets, assessed } = summary.totals;
  const { mode } = deriveLayout(summary.totals);
  const next = nextToAssess(rows, 1)[0];
  const f = summary.filters;
  const filterText = [f.region && formatWilayah(f.region), f.type && kapital(f.type), f.category && RISK_LABEL[f.category]]
    .filter(Boolean)
    .join(" · ");
  const title =
    mode === "low"
      ? `${assessed === 0 ? "Belum ada aset yang dinilai" : `Baru ${kataBilangan(assessed)} dari ${formatAngka(assets)} aset yang dinilai`}. Mulai dari yang paling bernilai.`
      : `${formatAngka(assessed)} dari ${formatAngka(assets)} aset sudah dinilai`;
  return (
    <PageHeader
      title={assets === 0 ? "Tidak ada aset yang cocok dengan filter" : title}
      sub={
        <>
          Register risiko {formatAngka(assets)} aset properti per {formatTanggal(dayOf(summary.today))}
          {filterText && <> (filter: {filterText})</>}. Skor dihitung dari parameter versi{" "}
          {summary.active_params_version ?? DEFAULT_PARAMS.version}.
        </>
      }
      action={
        mode === "low" &&
        next && (
          <Button asChild className="max-sm:w-full max-sm:whitespace-normal">
            <Link href={nilaiHref(next.code)}>
              Mulai penilaian — urut dari nilai buku tertinggi
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        )
      }
    />
  );
}

async function Body({ sp }: { sp: SP }) {
  const d = await load(await keyOf(sp));
  const { summary } = d;
  if (summary.totals.assets === 0)
    return (
      <Section first title="Filter ini tidak menghasilkan aset">
        <EmptyState
          purpose="Dashboard menghitung ulang semua angka dari aset yang cocok dengan filter."
          why="Tidak ada aset aktif dengan kombinasi wilayah, jenis, dan kategori ini."
          next={
            <Link href="/dashboard" className="link inline-flex min-h-11 items-center lg:min-h-0">
              Hapus semua filter
            </Link>
          }
        />
      </Section>
    );

  const layout = deriveLayout(summary.totals);
  const s = (what: string, node: ReactNode) => (
    <SectionBoundary key={what} what={what}>
      {node}
    </SectionBoundary>
  );
  const trend = layout.showTrend && s("Tren", <Trend d={d} />);
  return (
    <>
      <Kpis d={d} />
      {layout.mode === "low" ? (
        <>
          {s("Cakupan penilaian", <Coverage d={d} first />)}
          {s("Temuan hak tanah", <Findings d={d} />)}
          {s("Antrean penilaian", <Queue d={d} />)}
          {s("Kualitas data", <Quality d={d} />)}
          {s("Wilayah dan jenis", <Regions d={d} />)}
          {s("Masa berlaku hak", <Rights d={d} />)}
          {s("Jadwal monitoring", <Plan d={d} />)}
          {s("Analisis risiko", <Provisional d={d} />)}
          {trend}
        </>
      ) : (
        <>
          <ThinCoverage d={d} />
          {s("Sebaran kategori", <Share d={d} />)}
          {s("Jadwal monitoring", <Plan d={d} />)}
          {trend}
          {s("Temuan hak tanah", <Findings d={d} />)}
          {s("Eksposur nilai", <Exposure d={d} />)}
          {s("Matriks indikator", <Matrix d={d} />)}
          {s("Wilayah dan jenis", <Regions d={d} />)}
          {s("Masa berlaku hak", <Rights d={d} />)}
          {s("Kualitas data", <Quality d={d} />)}
        </>
      )}
    </>
  );
}

/* ---------- KPI ---------- */

function idleOf(d: DashboardData) {
  const t = d.summary.by_type;
  const count = t.reduce((a, x) => a + x.idle_count, 0);
  const value = t.reduce((a, x) => a + x.idle_value, 0);
  const total = d.summary.totals.book_value;
  return { count, value, share: total > 0 ? value / total : 0 };
}

function Kpi({ label, value, note, to, alert }: { label: string; value: string; note: string; to?: string; alert?: boolean }) {
  const inner = (
    <>
      <dt className={`flex items-center gap-1.5 text-label ${alert ? "font-medium text-risk-critical-ink" : "text-ink-muted"}`}>
        {alert && <RiskMarker level="critical" size={12} />}
        {label}
      </dt>
      <dd className={`mt-0.5 font-serif text-title leading-tight font-semibold tabular-nums sm:text-[1.75rem] ${alert ? "text-risk-critical-ink" : "text-ink"}`}>
        {value}
      </dd>
      <dd className="mt-1 text-label text-ink-subtle">{note}</dd>
    </>
  );
  return to ? (
    <Link href={to} className="block py-3 pr-4 hover:bg-surface-sunken focus-visible:bg-surface-sunken">
      <dl>{inner}</dl>
    </Link>
  ) : (
    <dl className="py-3 pr-4">{inner}</dl>
  );
}

function Kpis({ d }: { d: DashboardData }) {
  const { totals, by_type, risk_findings, matrix } = d.summary;
  const n = (t: "tanah" | "bangunan" | "gabungan") => by_type.find((x) => x.type === t)?.count ?? 0;
  const types = (["bangunan", "tanah", "gabungan"] as const).filter((t) => n(t) > 0).map((t) => `${formatAngka(n(t))} ${t}`);
  const idle = idleOf(d);
  const one = totals.assessed === 1 ? matrix.rows[0] : undefined;
  const avg = matrix.averages.total_score;
  return (
    <div className="mt-4 grid grid-cols-2 gap-x-6 border-b border-rule md:grid-cols-5 [&>*]:border-b [&>*]:border-rule md:[&>*]:border-r md:[&>*]:border-b-0 [&>*:last-child]:border-b-0 md:[&>*:last-child]:border-r-0">
      <Kpi label="Aset terdaftar" value={formatAngka(totals.assets)} note={types.join(", ")} to={asetList()} />
      <Kpi
        label="Nilai buku"
        value={formatRupiahRingkas(totals.book_value)}
        note={totals.value_placeholder_count ? `${formatAngka(totals.value_placeholder_count)} aset placeholder tidak dihitung` : "Semua nilai terisi"}
      />
      <Kpi
        label="Aset idle"
        value={formatAngka(idle.count)}
        note={!idle.count ? "Tidak ada aset idle" : idle.value > 1 ? `${formatRupiahRingkas(idle.value)} · ${formatPersen(idle.share)} nilai buku` : "Nilai buku placeholder"}
        to={idle.count ? asetList({ pemanfaatan: "idle_kosong" }) : undefined}
      />
      <Kpi
        alert={risk_findings.right_expired > 0}
        label="Hak tanah lewat"
        value={formatAngka(risk_findings.right_expired)}
        note={`Ditambah ${formatAngka(risk_findings.right_expiring_12m)} berakhir < 12 bulan`}
        to={asetList({ warn: "hak-kedaluwarsa" })}
      />
      <Kpi
        label="Sudah dinilai"
        value={formatAngka(totals.assessed)}
        note={
          one && one.total_score != null
            ? `Skor ${formatSkor(one.total_score)} · ${RISK_LABEL[one.category]}`
            : totals.assessed && avg != null
              ? `Rata-rata skor ${formatSkor(avg)}`
              : "Belum ada penilaian"
        }
        to={totals.assessed ? asetList({ dinilai: "ya" }) : undefined}
      />
    </div>
  );
}

/* ---------- A: cakupan ---------- */

const trendNote = (d: DashboardData) =>
  d.summary.periods >= 2
    ? null
    : `Tren: ${d.summary.periods === 0 ? "belum ada periode penilaian" : `baru satu periode penilaian (${formatBulan(dayOf(`${d.summary.trend[0]?.period ?? d.summary.today.slice(0, 7)}-01`))})`}; butuh minimal dua periode.`;

function Coverage({ d, first }: { d: DashboardData; first?: boolean }) {
  const { assets, assessed, unrated } = d.summary.totals;
  const target = Math.ceil(assets * COVERAGE_TARGET);
  return (
    <Section
      first={first}
      level="action"
      id="cakupan"
      title={`${formatAngka(unrated)} aset belum punya skor, jadi angka risiko di bawah masih sementara`}
      sub={`Ambang analisis: ${formatPersen(COVERAGE_TARGET)} aset dinilai (${formatAngka(target)} aset). Belum dinilai bukan berarti rendah.`}
    >
      <div className="max-w-2xl">
        <div className="mb-1 flex items-baseline justify-between gap-4 text-label">
          <span className="text-ink-muted">Menuju {formatAngka(target)} aset dinilai</span>
          <span className="font-medium tabular-nums">
            {formatAngka(assessed)} / {formatAngka(target)}
          </span>
        </div>
        <CoverageBar rows={d.rows} />
        {trendNote(d) && <p className="mt-2 text-label text-ink-subtle">{trendNote(d)}</p>}
      </div>
    </Section>
  );
}

function ThinCoverage({ d }: { d: DashboardData }) {
  const { assets, assessed } = d.summary.totals;
  return (
    <div className="mt-6 max-w-2xl">
      <p className="mb-1 text-label text-ink-muted">
        Cakupan penilaian {formatPersen(assessed / assets)} ({formatAngka(assessed)} aset)
        {trendNote(d) && <> · {trendNote(d)}</>}
      </p>
      <CoverageBar rows={d.rows} thin />
    </div>
  );
}

/* ---------- B: temuan risiko + kualitas data ---------- */

function Findings({ d }: { d: DashboardData }) {
  const { right_expired: lewat, right_expiring_12m: segera } = d.summary.risk_findings;
  const items = d.summary.right_expiry.filter((r) => r.status !== "berlaku");
  const legal = new Map(d.rows.map((r) => [r.code, r.legal_status]));
  return (
    <Section
      level="action"
      id="tindakan"
      title={
        lewat + segera === 0
          ? "Tidak ada hak tanah yang lewat atau segera berakhir"
          : lewat === 0
            ? `${kapital(kataBilangan(segera))} hak tanah berakhir kurang dari 12 bulan; belum ada yang lewat`
            : `${kapital(kataBilangan(lewat))} hak tanah sudah lewat masa berlaku${segera ? `, ${kataBilangan(segera)} lagi berakhir kurang dari 12 bulan` : ""}`
      }
      sub="Perlu tindakan: temuan risiko hukum, terpisah dari kualitas data. Tiap baris membuka detail aset."
    >
      {items.length === 0 ? (
        <p className="text-body text-ink-muted">Semua hak yang tercatat masih berlaku lebih dari 12 bulan.</p>
      ) : (
        <ul className="border-t border-rule">
          {items.map((r) => {
            const late = r.status === "lewat";
            return (
              <li key={r.id} className="border-b border-rule">
                <Link
                  href={asetDetail(r.asset_code)}
                  className="grid min-h-14 grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-x-3 px-2 py-2.5 hover:bg-surface-sunken sm:grid-cols-[1.25rem_minmax(0,1fr)_auto]"
                >
                  <RiskMarker level={late ? "critical" : "high"} size={14} />
                  <span className="min-w-0">
                    <span className="text-body font-medium">{r.name}</span>
                    <span className="block text-label text-ink-subtle">
                      <span className="font-mono">{r.asset_code}</span> · {legal.get(r.asset_code) ?? "Status legal kosong"}
                    </span>
                  </span>
                  <span className={`text-body tabular-nums max-sm:col-start-2 sm:text-right ${late ? "text-risk-critical-ink" : "text-risk-high-ink"}`}>
                    {late ? "Lewat sejak" : "Berakhir"} {formatTanggal(r.right_expiry_date)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

function Quality({ d }: { d: DashboardData }) {
  const q = d.summary.data_quality;
  const futureDates = [...new Set(d.rows.filter((r) => r.flags.monitored_in_future && r.last_monitored_at).map((r) => r.last_monitored_at!))];
  const list: { k: WarnKey; text: string; note: string }[] = [
    { k: "nilai-placeholder", text: "aset bernilai placeholder Rp1", note: "Tidak dihitung di agregat nilai buku." },
    { k: "luas-placeholder", text: "aset berluas placeholder 1 m²", note: "Luas belum diisi dari sumber." },
    {
      k: "tgl-masa-depan",
      text: "aset bertanggal monitoring di masa depan",
      note: `${futureDates.length ? `Tercatat ${futureDates.slice(0, 3).map((x) => formatTanggal(x)).join(", ")}; ` : ""}jadwal tidak bisa dihitung dari kolom ini.`,
    },
    { k: "perlu-review", text: 'aset berstatus "Produktif" perlu review', note: 'Dipetakan ke "Digunakan sendiri"; konfirmasi maknanya.' },
    { k: "alamat-kosong", text: "aset tanpa alamat", note: "Lengkapi agar lokasi bisa diverifikasi." },
  ];
  const shown = list.filter((w) => (q[w.k] ?? 0) > 0);
  return (
    <Section
      id="kualitas"
      title={shown.length ? "Kualitas data perlu dibereskan sebelum angka bisa dipercaya" : "Tidak ada peringatan data"}
      sub="Peringatan dari data sumber (Excel). Tiap baris membuka daftar aset terkait."
    >
      {shown.length === 0 ? (
        <p className="text-body text-ink-muted">Semua aset dalam filter ini lolos pemeriksaan data.</p>
      ) : (
        <ul className="border-t border-rule">
          {shown.map((w) => (
            <li key={w.k} className="border-b border-rule">
              <Link
                href={asetList({ warn: w.k })}
                className="grid min-h-14 grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-x-3 px-2 py-2.5 hover:bg-surface-sunken"
              >
                <TriangleAlert size={16} strokeWidth={1.75} className="text-status-warning" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="text-body">{w.text}</span>
                  <span className="block text-label text-ink-subtle">{w.note}</span>
                </span>
                <span className="flex items-baseline gap-3">
                  <span className="font-serif text-title font-semibold tabular-nums">{formatAngka(q[w.k]!)}</span>
                  <span className="hidden text-label underline underline-offset-2 sm:inline">Lihat {formatAngka(q[w.k]!)} aset</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/* ---------- C–E: analisis risiko ---------- */

const Sementara = ({ n }: { n: number }) => (
  <Tag>
    <Hourglass size={12} aria-hidden="true" />
    Sementara · berdasar {formatAngka(n)} aset
  </Tag>
);

const indicators = (d: DashboardData) =>
  DEFAULT_PARAMS.indicators.map((i) => ({ ...i, weight: d.summary.active_weights?.[i.key] ?? i.weight }));

function noValue(d: DashboardData) {
  return d.rows.every((r) => !r.value);
}

function Queue({ d }: { d: DashboardData }) {
  return (
    <Section
      level="action"
      id="antrean"
      title="Antrean penilaian: 10 aset bernilai buku tertinggi"
      sub="Urutan penilaian yang disarankan. Marker ? = belum dinilai; kategori hanya lewat marker, bukan warna batang."
    >
      {noValue(d) ? (
        <ChartEmpty
          title="Belum ada nilai buku yang bisa diurutkan."
          why="Semua aset dalam filter ini bernilai placeholder atau kosong."
          action={{ href: asetList({ warn: "nilai-placeholder" }), label: "Lihat aset bernilai placeholder" }}
        />
      ) : (
        <TopValue rows={d.rows} />
      )}
    </Section>
  );
}

function Provisional({ d }: { d: DashboardData }) {
  const { assets, assessed } = d.summary.totals;
  const next = nextToAssess(d.rows, 1)[0];
  return (
    <Section
      id="analisis"
      tag={<Sementara n={assessed} />}
      title="Analisis risiko aktif setelah lebih banyak aset dinilai"
      sub={`Sebaran kategori dan nilai per kategori ditampilkan mulai ${formatPersen(COVERAGE_TARGET)} aset dinilai (${formatAngka(Math.ceil(assets * COVERAGE_TARGET))} aset). Sebelum itu persentase belum bermakna.`}
    >
      <h3 className="mb-2 text-label font-medium text-ink">
        Matriks indikator, hanya aset yang sudah dinilai <span className="font-normal text-ink-subtle">(sementara)</span>
      </h3>
      {assessed === 0 ? (
        <ChartEmpty
          title="Belum ada penilaian. Mulai dari aset bernilai tertinggi."
          why="Matriks indikator terisi setelah aset pertama dinilai."
          action={next && { href: nilaiHref(next.code), label: `Nilai ${next.name}` }}
        />
      ) : (
        <Heatmap rows={d.rows} ratedOnly indicators={indicators(d)} />
      )}
    </Section>
  );
}

function Share({ d }: { d: DashboardData }) {
  const { categories, totals } = d.summary;
  const top = categories.filter((c) => c.key !== "unrated").sort((a, b) => b.count - a.count)[0];
  return (
    <Section
      level="action"
      id="sebaran"
      tag={totals.assessed < MIN_SHARE_N ? <Sementara n={totals.assessed} /> : undefined}
      title={
        top && top.count > 0
          ? `${formatAngka(top.count)} dari ${formatAngka(totals.assessed)} aset yang dinilai masuk kategori ${RISK_LABEL[top.key]}`
          : "Sebaran kategori risiko"
      }
      sub="Dasar persen: seluruh aset, kecuali dicentang. Klik segmen untuk daftar aset."
    >
      <ShareChart rows={d.rows} />
    </Section>
  );
}

function Exposure({ d }: { d: DashboardData }) {
  const { book_value } = d.summary.totals;
  const max = Math.max(1, ...d.summary.categories.map((c) => c.count));
  const maxV = Math.max(1, ...d.summary.categories.map((c) => c.value));
  return (
    <Section
      id="eksposur"
      title={noValue(d) ? "Nilai buku menurut kategori risiko belum bisa dihitung" : `Nilai buku ${formatRupiahRingkas(book_value)} menurut kategori risiko`}
      sub={noValue(d) ? "Placeholder tidak dihitung. Marker menunjukkan kategori." : `Total ${formatRupiahEksak(book_value)}, placeholder tidak dihitung. Marker menunjukkan kategori.`}
    >
      {noValue(d) ? (
        <ChartEmpty title="Belum ada nilai buku yang bisa dijumlahkan." why="Semua aset dalam filter ini bernilai placeholder atau kosong." />
      ) : (
        <>
          <TopValue rows={d.rows} />
          <h3 className="mt-8 mb-2 text-label font-medium text-ink">Jumlah aset dan nilai buku per kategori</h3>
          <CategoryValue rows={d.rows} countTicks={niceTicks(max)} valueTicks={niceTicks(maxV)} />
        </>
      )}
    </Section>
  );
}

function Matrix({ d }: { d: DashboardData }) {
  return (
    <Section id="matriks" title="Matriks indikator: mengapa aset berisiko" sub="Skor 1–5 per indikator, bobot di header; sel berarsir = belum dinilai.">
      <Heatmap rows={d.rows} indicators={indicators(d)} />
    </Section>
  );
}

/* ---------- F, hak, G ---------- */

function Regions({ d }: { d: DashboardData }) {
  const { by_region, by_type, totals } = d.summary;
  const idle = idleOf(d);
  const top = [...by_region].sort((a, b) => b.count - a.count)[0];
  const idleTypes = by_type.filter((t) => t.idle_count > 0).map((t) => `${formatAngka(t.idle_count)} ${TYPE_LABEL[t.type]}`);
  return (
    <Section
      id="wilayah"
      title={
        idle.count && idle.value > 1
          ? `Idle ${formatAngka(idle.count)} aset bernilai ${formatRupiahRingkas(idle.value)}, sekitar ${formatPersen(idle.share)} dari nilai buku`
          : idle.count
            ? `Idle ${formatAngka(idle.count)} aset, nilai bukunya belum tercatat (placeholder)`
          : `${formatAngka(totals.assets)} aset di ${formatAngka(by_region.length)} wilayah, tidak ada yang idle`
      }
      sub={[
        idleTypes.length ? `Idle: ${idleTypes.join(", ")}.` : "",
        top && by_region.length > 1
          ? `${formatPersen(top.count / totals.assets)} aset ada di ${formatWilayah(top.region)}; ${formatAngka(by_region.length)} provinsi, jadi tabel lebih jujur daripada peta.`
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <RegionTable rows={d.rows} />
    </Section>
  );
}

function Rights({ d }: { d: DashboardData }) {
  const { right_expired: lewat, right_expiring_12m: segera } = d.summary.risk_findings;
  const any = d.rows.some((r) => r.type === "Tanah" && r.right_expiry_date);
  return (
    <Section
      id="hak"
      title={
        lewat + segera === 0
          ? "Masa berlaku hak: semua masih berlaku lebih dari 12 bulan"
          : `Masa berlaku hak: ${[lewat && `${kataBilangan(lewat)} sudah lewat`, segera && `${kataBilangan(segera)} berakhir kurang dari 12 bulan`].filter(Boolean).join(", ")}`
      }
      sub="Hanya aset tanah memiliki tanggal hak."
    >
      {any ? (
        <RightTimeline rows={d.rows} today={dayOf(d.summary.today)} />
      ) : (
        <ChartEmpty title="Tidak ada aset tanah bertanggal hak dalam filter ini." why="Masa berlaku hak hanya dicatat untuk aset tanah." />
      )}
    </Section>
  );
}

function Plan({ d }: { d: DashboardData }) {
  const c = d.summary.schedule.counts;
  const title =
    c.lewat > 0
      ? `${formatAngka(c.lewat)} aset lewat jadwal monitoring`
      : c.tak_terjadwal > 0
        ? `Jadwal monitoring belum bisa dihitung untuk ${formatAngka(c.tak_terjadwal)} aset`
        : "Tidak ada monitoring yang lewat jadwal";
  return (
    <Section id="jadwal" level={c.lewat > 0 ? "action" : "info"} title={title} sub="Jadwal monitoring berikutnya = tanggal penilaian + interval kategori.">
      <Schedule rows={d.rows} today={dayOf(d.summary.today)} />
    </Section>
  );
}

/* ---------- H: tren ---------- */

function Trend({ d }: { d: DashboardData }) {
  const t = d.summary.trend;
  const month = (p: string) => formatBulan(dayOf(`${p}-01`));
  const avg = t.map((x) => x.avg_score);
  const ch = t.map((x) => x.critical + x.high);
  const first = avg.find((v) => v != null);
  const last = avg.findLast((v) => v != null);
  const delta = first != null && last != null ? last - first : null;
  const table = (
    <LedgerTable
      caption="Tren penilaian per bulan"
      head={["Bulan", "Dinilai", "Skor rata-rata", "Critical", "High"]}
      num={[1, 2, 3, 4]}
      rows={t.map((x) => [month(x.period), formatAngka(x.assessed), x.avg_score == null ? "—" : formatSkor(x.avg_score), formatAngka(x.critical), formatAngka(x.high)])}
    />
  );
  const chart = (
    <div className="grid gap-6 sm:grid-cols-2">
      {[
        { label: "Skor rata-rata", values: avg, fmt: formatSkor },
        { label: "Aset Critical + High", values: ch, fmt: formatAngka },
      ].map((m) => (
        <figure key={m.label}>
          <figcaption className="mb-2 flex items-baseline justify-between gap-4 text-label">
            <span className="text-ink-muted">{m.label}</span>
            <span className="text-ink-subtle">
              {month(t[0].period)} – {month(t[t.length - 1].period)}
            </span>
          </figcaption>
          <Sparkline values={m.values} label={m.label} fmt={m.fmt} width={360} height={72} />
        </figure>
      ))}
    </div>
  );
  return (
    <Section
      id="tren"
      title={
        delta == null
          ? "Tren skor per bulan"
          : `Skor rata-rata ${delta > 0 ? "naik" : delta < 0 ? "turun" : "tetap"}${delta ? ` ${formatSkor(Math.abs(delta))} poin` : ""} sejak ${month(t[0].period)}`
      }
      sub={`${formatAngka(d.summary.periods)} periode penilaian. Skor 20–100; makin tinggi makin berisiko.`}
    >
      <ChartFrame chart={chart} table={table} />
    </Section>
  );
}

/* ---------- skeleton ---------- */

function HeaderSkeleton() {
  return (
    <div aria-busy="true" className="space-y-3 border-b border-rule-strong pb-5">
      <Skeleton className="h-9 w-3/4 bg-rule/60" />
      <Skeleton className="h-4 w-1/2 bg-rule/60" />
    </div>
  );
}

function BodySkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Memuat dashboard">
      <div className="mt-4 grid grid-cols-2 gap-6 md:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 bg-rule/60" />
        ))}
      </div>
      {[180, 232, 232].map((h, i) => (
        <div key={i} className="mt-8 border-t border-rule pt-8">
          <Skeleton className="mb-5 h-6 bg-rule/60" style={{ width: `${[70, 55, 85][i]}%` }} />
          <ChartSkeleton height={h} label="Memuat bagian dashboard…" />
        </div>
      ))}
    </div>
  );
}
