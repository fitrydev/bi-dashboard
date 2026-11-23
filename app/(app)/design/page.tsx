import type { Metadata } from "next";
import { PageHeader } from "@/components/ledger/PageHeader";
import { Section } from "@/components/ledger/Section";
import { ChartFrame } from "@/components/ledger/ChartFrame";
import { LedgerTable } from "@/components/ledger/LedgerTable";
import {
  DataWarning,
  HeatCell,
  IndicatorMeter,
  RiskBadge,
  RiskMarker,
  ScheduleStatus,
  ScoreBar,
  ScoreValue,
  type Rubric,
} from "@/components/risk";
import { ChartEmpty, ChartLegend, ChartSkeleton, ChartTooltipCard } from "@/components/charts";
import { LevelBar, LevelStack, RegionBar, Trend } from "./Bars";
import { countBy, byValueDesc } from "@/lib/aggregate";
import { formatAngka, formatRupiahEksak, formatSkor } from "@/lib/format";
import { DEFAULT_PARAMS, LEVELS, RISK_LABEL, SHORT_LABEL, dueOf, type IndicatorKey, type RiskLevel } from "@/lib/scoring";
import type { WarnKey } from "@/lib/scoring";
import type { Asset, AssetRow, Assessment } from "@/lib/types";
import { toAssetRow } from "@/lib/asset-row";
import data from "@/design/data/assets.json";

export const metadata: Metadata = {
  title: "Galeri komponen",
  robots: { index: false, follow: false },
};

const assessments = new Map((data.assessments as unknown as Assessment[]).map((a) => [a.asset_code, a]));
const rows: AssetRow[] = (data.assets as unknown as Asset[]).map((a) => toAssetRow(a, assessments.get(a.code) ?? null));

const rubric: Rubric = Object.fromEntries(
  Object.entries(data.criteria).map(([k, v]) => [k, [1, 2, 3, 4, 5].map((n) => (v as Record<string, string>)[n])]),
);
const TODAY = new Date(`${data.meta.today}T00:00:00Z`);
const assessed = rows.find((r) => r.assessment)!;
const levelCount = LEVELS.map((l) => ({ level: l, value: countBy(rows, l) }));
const regions = Object.entries(
  rows.reduce<Record<string, number>>((m, r) => ((m[r.region] = (m[r.region] ?? 0) + (r.value ?? 0)), m), {}),
)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 6);
const regionData = regions.map(([label, value]) => ({ label, value }));
const topRows = byValueDesc(rows).slice(0, 5);
const warnAll = Object.keys(
  rows.reduce<Record<string, 1>>((m, r) => (r.warnings.forEach((w) => (m[w] = 1)), m), {}),
) as WarnKey[];
const sampleRows = [assessed, ...rows.filter((r) => r !== assessed && r.warnings.length > 1).slice(0, 2)];
const sampleAssets = [...sampleRows, ...topRows.filter((r) => !sampleRows.includes(r)).slice(0, 2)];

const dues = [
  ["Terlambat", dueOf("2026-01-01", "high", DEFAULT_PARAMS, TODAY)],
  ["Segera", dueOf("2026-09-01", "high", DEFAULT_PARAMS, TODAY)],
  ["Terjadwal", dueOf("2026-11-18", "low", DEFAULT_PARAMS, TODAY)],
  ["Tak terjadwal (belum dinilai)", dueOf(null, "unrated", DEFAULT_PARAMS, TODAY)],
] as const;

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
    <span className="w-full text-label text-ink-subtle sm:w-48">{label}</span>
    <span className="flex min-w-0 flex-wrap items-center gap-3">{children}</span>
  </li>
);
const List = ({ children }: { children: React.ReactNode }) => (
  <ul className="divide-y divide-rule border-y border-rule">{children}</ul>
);

export default function DesignGalleryPage() {
  const scores = assessed.assessment!.scores as Record<IndicatorKey, number | null>;
  return (
    <>
      <PageHeader
        title="Galeri komponen"
        sub={`Seluruh komponen risiko dan primitive chart dengan data asli Excel (${formatAngka(rows.length)} aset, ${assessments.size} dinilai). Halaman internal, tidak ada di navigasi.`}
      />

      <Section first id="risk" title="Kategori risiko" sub="Bentuk + teks + warna; tidak pernah warna saja. Belum dinilai berarsir, bukan Low.">
        <List>
          <Row label="RiskBadge md">
            {LEVELS.map((l) => (
              <RiskBadge key={l} level={l} size="md" />
            ))}
          </Row>
          <Row label="RiskBadge sm">
            {LEVELS.map((l) => (
              <RiskBadge key={l} level={l} size="sm" />
            ))}
          </Row>
          <Row label="RiskBadge override">
            <RiskBadge level="critical" override size="md" />
            <RiskBadge level="critical" override size="sm" />
          </Row>
          <Row label="RiskMarker">
            {LEVELS.map((l) => (
              <RiskMarker key={l} level={l} size={20} label />
            ))}
          </Row>
        </List>
      </Section>

      <Section id="skor" title="Skor" sub="Skor 20–100 dari enam indikator berbobot; null berarti belum dinilai.">
        <List>
          {(
            [
              [92, "critical"],
              [68.5, "high"],
              [47, "medium"],
              [28, "low"],
              [null, "unrated"],
            ] as [number | null, RiskLevel][]
          ).map(([s, l]) => (
            <Row key={l} label={`ScoreBar ${RISK_LABEL[l]}`}>
              <span className="w-48 max-w-full">
                <ScoreBar score={s} level={l} />
              </span>
              <ScoreValue score={s} level={l} />
              <span className="w-16">
                <ScoreBar score={s} level={l} compact />
              </span>
            </Row>
          ))}
          <Row label="HeatCell 1–5 dan belum dinilai">
            {[1, 2, 3, 4, 5].map((n) => (
              <HeatCell key={n} score={n} label={SHORT_LABEL.legal} />
            ))}
            <HeatCell score={null} label={SHORT_LABEL.legal} />
          </Row>
        </List>
      </Section>

      <Section
        id="indikator"
        title="Profil indikator"
        sub={`Aset ${assessed.code} (${assessed.name}), skor ${formatSkor(assessed.score!)}. Rubrik dari assets.json.`}
      >
        <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-label font-medium text-ink">Dengan rubrik</h3>
            <IndicatorMeter scores={scores} rubric={rubric} />
          </div>
          <div>
            <h3 className="mb-2 text-label font-medium text-ink">Sebagian belum diketahui</h3>
            <IndicatorMeter scores={{ ...scores, physical: null, location: undefined }} />
          </div>
        </div>
      </Section>

      <Section id="jadwal" title="Status jadwal" sub={`Tanggal acuan ${data.meta.today}.`}>
        <List>
          {dues.map(([label, due]) => (
            <Row key={label} label={label}>
              <ScheduleStatus due={due} />
            </Row>
          ))}
        </List>
      </Section>

      <Section id="peringatan" title="Peringatan data" sub="Kualitas data dari flag Excel; tampil sebagai ikon + teks.">
        <div className="grid gap-x-10 gap-y-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-label font-medium text-ink">Inline (semua jenis)</h3>
            <DataWarning warnings={warnAll} variant="inline" className="flex flex-wrap gap-2" />
          </div>
          <div>
            <h3 className="mb-2 text-label font-medium text-ink">List</h3>
            <DataWarning warnings={warnAll} variant="list" />
          </div>
        </div>
      </Section>

      <Section id="chart" title="Chart: sebaran kategori" sub="StackedBar menggantikan donut; ChartLegend memberi bentuk + label.">
        <ChartFrame
          chart={
            <div className="space-y-6">
              <LevelStack items={levelCount} />
              <div>
                <h3 className="mb-2 text-label font-medium text-ink">ChartLegend lepas (termasuk kategori bernilai 0)</h3>
                <ChartLegend
                  items={levelCount.map((c) => ({ key: c.level, level: c.level, value: formatAngka(c.value) }))}
                />
              </div>
            </div>
          }
          table={
            <LedgerTable
              caption="Jumlah aset per kategori"
              head={["Kategori", "Aset"]}
              num={[1]}
              rows={levelCount.map((c) => [RISK_LABEL[c.level], formatAngka(c.value)])}
            />
          }
        />
      </Section>

      <Section id="bar" title="Chart: nilai buku per wilayah" sub="SimpleBar horizontal, nilai placeholder (Rp1) tidak dihitung.">
        <ChartFrame
          chart={
            <RegionBar data={regionData} />
          }
          table={
            <LedgerTable
              caption="Nilai buku per wilayah"
              head={["Wilayah", "Nilai buku"]}
              num={[1]}
              rows={regionData.map((d) => [d.label, formatRupiahEksak(d.value)])}
            />
          }
        />
        <h3 className="mt-8 mb-2 text-label font-medium text-ink">Vertikal, berwarna per kategori</h3>
        <LevelBar data={levelCount.filter((c) => c.level !== "unrated").map((c) => ({ label: RISK_LABEL[c.level], value: c.value, level: c.level }))} />
      </Section>

      <Section id="mini" title="Sparkline dan tooltip" sub="Sparkline dengan titik kosong memutus garis; kurang dari 2 titik tampil garis putus.">
        <List>
          <Row label="Tren penuh">
            <Trend values={[52, 55, 51, 58, 62, 60]} />
          </Row>
          <Row label="Ada titik kosong">
            <Trend values={[40, 44, null, 49, 47]} />
          </Row>
          <Row label="Satu titik">
            <Trend values={[47]} />
          </Row>
          <Row label="Tooltip (statis)">
            <ChartTooltipCard
              title={topRows[0].name}
              level={topRows[0].level}
              lines={[formatRupiahEksak(topRows[0].value ?? 0), topRows[0].region]}
              hint="Klik untuk membuka daftar aset"
            />
          </Row>
        </List>
      </Section>

      <Section id="status" title="Keadaan chart" sub="Memuat dan kosong; kosong selalu menjelaskan sebab dan langkah.">
        <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
          <ChartSkeleton height={160} label="Memuat grafik nilai buku" />
          <ChartEmpty
            minHeight={160}
            title="Belum ada penilaian"
            why="Grafik tren muncul setelah aset dinilai minimal dua kali."
            action={{ href: "/aset", label: "Buka daftar aset" }}
          />
        </div>
      </Section>

      <Section id="aset" title="Contoh baris aset" sub="Komponen digabung seperti di daftar aset; lima aset dengan nilai buku terbesar di bawahnya.">
        {/* DESIGN §7/§6.6: 375px = list, bukan tabel bergeser horizontal */}
        <ul className="divide-y divide-rule border-y border-rule sm:hidden">
          {sampleAssets.map((r, i) => (
            <li key={i} className="min-h-16 space-y-1.5 py-3">
              <div className="flex items-start justify-between gap-3">
                <span className="text-body font-medium">{r.name}</span>
                <RiskBadge level={r.level} size="sm" />
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2 text-caption text-ink-muted">
                <span className="tabular-nums">{r.code}</span>·<ScoreValue score={r.score} level={r.level} />
              </div>
              <DataWarning warnings={r.warnings} variant="list" />
            </li>
          ))}
        </ul>
        <div className="hidden sm:block">
          <LedgerTable
            caption="Contoh baris aset"
            head={["Aset", "Kategori", "Skor", "Peringatan"]}
            num={[2]}
            rows={sampleAssets.map((r) => [
              <span key="n">
                <span className="tabular-nums">{r.code}</span> {r.name}
              </span>,
              <RiskBadge key="b" level={r.level} />,
              <ScoreValue key="s" score={r.score} level={r.level} />,
              <DataWarning key="w" warnings={r.warnings} variant="list" />,
            ])}
          />
        </div>
      </Section>
    </>
  );
}
