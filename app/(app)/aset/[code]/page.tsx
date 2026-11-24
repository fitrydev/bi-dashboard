import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, cache, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { Sparkline } from "@/components/charts/Sparkline";
import { EmptyState } from "@/components/ledger/EmptyState";
import { LedgerTable } from "@/components/ledger/LedgerTable";
import { PageHeader } from "@/components/ledger/PageHeader";
import { Section } from "@/components/ledger/Section";
import { DataWarning, IndicatorMeter, RiskBadge, ScheduleStatus } from "@/components/risk";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AKSI, auditSubject, changedColumns } from "@/lib/aset/audit";
import { loadAssetDetail } from "@/lib/aset/detail";
import { DeleteAssetButton } from "../delete";
import { formatLuas, formatRupiahEksak, formatSkor, formatTanggal, formatWilayah } from "@/lib/format";
import { asetDetail, safeDecode } from "@/lib/routes";
import { dueOf, intervalText } from "@/lib/scoring";

export const metadata: Metadata = { title: "Detail Aset" };

// Satu loader per kode per request: dipakai header dan isi.
const load = cache((code: string) => loadAssetDetail(code));
const codeOf = async (p: PageProps<"/aset/[code]">["params"]) => safeDecode((await p).code);

const METODE = { site_visit: "Kunjungan lapangan", remote: "Jarak jauh", desk_review: "Tinjauan dokumen" } as const;

function Scroll({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="region" aria-label={label} className="overflow-x-auto">
      {children}
    </div>
  );
}

function Dl({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-label text-ink-muted">{k}</dt>
          <dd className="mt-0.5 text-body text-ink break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const Missing = ({ why }: { why: string }) => (
  <span className="inline-flex items-center gap-1.5 text-ink-muted">
    —<TriangleAlert size={14} aria-hidden="true" className="text-status-warning-ink" />
    <span className="sr-only">{why}</span>
  </span>
);

export default function Page(props: PageProps<"/aset/[code]">) {
  return (
    <>
      <Suspense fallback={<PageHeader title="Detail Aset" />}>
        <Header params={props.params} />
      </Suspense>
      <Suspense fallback={<Skeleton className="mt-8 h-64 w-full bg-rule/60" />}>
        <Body params={props.params} />
      </Suspense>
    </>
  );
}

async function Header({ params }: { params: PageProps<"/aset/[code]">["params"] }) {
  const code = await codeOf(params);
  const d = await load(code);
  const { row } = d;
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-3 text-label text-ink-muted">
        <ol className="flex flex-wrap gap-x-2">
          <li>
            <Link href="/aset" className="underline underline-offset-2">Aset</Link>
            <span aria-hidden="true"> /</span>
          </li>
          <li aria-current="page" className="text-ink">{row.name}</li>
        </ol>
      </nav>
      {!d.active && (
        <p role="status" className="mb-4 flex items-center gap-2 border border-rule-strong bg-surface-sunken px-3 py-2 text-body text-ink">
          <TriangleAlert size={16} aria-hidden="true" className="shrink-0" />
          Aset ini dihapus. Riwayatnya tetap tersimpan.
        </p>
      )}
      <PageHeader
        title={row.name}
        sub={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="font-mono text-ink">{row.code}</span>
            <RiskBadge level={row.level} override={row.assessment?.critical_override} />
          </span>
        }
        action={
          d.active && (
            <div className="flex flex-wrap gap-2 max-sm:w-full">
              <Button asChild className="max-sm:flex-1">
                <Link href={`${asetDetail(row.code)}/nilai`}>Nilai aset</Link>
              </Button>
              <Button asChild variant="outline" className="max-sm:flex-1">
                <Link href={`${asetDetail(row.code)}/monitoring`}>Catat monitoring</Link>
              </Button>
              {d.canEdit && <DeleteAssetButton code={row.code} name={row.name} />}
            </div>
          )
        }
      />
    </>
  );
}

async function Body({ params }: { params: PageProps<"/aset/[code]">["params"] }) {
  const code = await codeOf(params);
  const d = await load(code).catch((e) => {
    if (e?.digest === "NEXT_HTTP_ERROR_FALLBACK;404") notFound();
    throw e;
  });
  const { row, assessments, monitoring, params: sp } = d;
  const a = row.assessment;
  const due = dueOf(row.last_monitored_at, row.level, sp);
  const nilaiHref = `${asetDetail(row.code)}/nilai`;
  const monHref = `${asetDetail(row.code)}/monitoring`;
  const area = [
    row.land_area_m2 != null && formatLuas(row.land_area_m2) !== "—" && `Tanah ${formatLuas(row.land_area_m2)}`,
    row.building_area_m2 != null && formatLuas(row.building_area_m2) !== "—" && `Bangunan ${formatLuas(row.building_area_m2)}`,
  ].filter(Boolean);
  const trend = [...assessments].reverse().map((x) => x.total_score);

  return (
    <>
      <Section id="identitas" title="Identitas" first>
        <Dl
          items={[
            ["Jenis", row.type],
            ["Wilayah", formatWilayah(row.region)],
            ["Alamat", row.address || <Missing key="a" why="Alamat kosong" />],
            ["Luas", area.length ? area.join(" · ") : <Missing key="l" why="Luas belum diketahui (placeholder)" />],
            [
              "Nilai buku",
              row.value != null && row.value > 1 ? formatRupiahEksak(row.value) : <Missing key="v" why="Nilai buku belum diketahui (placeholder)" />,
            ],
            [
              "Status hak",
              row.legal_status ? (
                <>
                  {row.legal_status}
                  {row.right_expiry_date && <span className="text-ink-muted"> · berlaku s.d. {formatTanggal(row.right_expiry_date)}</span>}
                </>
              ) : (
                "—"
              ),
            ],
            ["Pemanfaatan", row.utilization ?? row.utilization_raw ?? "—"],
            ["PIC", row.pic ?? "—"],
            ["Monitoring terakhir", formatTanggal(row.last_monitored_at)],
            [
              "Jadwal berikutnya",
              a ? <ScheduleStatus key="s" due={due} /> : <span className="text-ink-muted">Menunggu penilaian pertama</span>,
            ],
          ]}
        />
      </Section>

      <Section id="skor" title="Skor risiko" sub={a ? `Penilaian ${formatTanggal(a.assessed_at)} · parameter versi ${d.params.version}` : undefined}>
        {a ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,16rem)_1fr]">
            <div className="space-y-2">
              <p className="text-display tabular-nums">{formatSkor(a.total_score)}</p>
              <RiskBadge level={row.level} override={a.critical_override} />
              <p className="text-label text-ink-muted">
                Monitoring {intervalText(row.level, sp)}
              </p>
            </div>
            <IndicatorMeter scores={a.scores} params={d.params} rubric={d.rubric} />
          </div>
        ) : (
          <EmptyState
            purpose="Aset ini belum dinilai, sehingga belum punya skor atau kategori risiko."
            why="Skor hanya muncul setelah keenam indikator terisi."
            next={
              d.active && (
                <Button asChild>
                  <Link href={nilaiHref}>Nilai aset</Link>
                </Button>
              )
            }
          />
        )}
      </Section>

      {row.warnings.length > 0 && (
        <Section id="peringatan" title="Peringatan data">
          <DataWarning warnings={row.warnings} />
        </Section>
      )}

      <Section id="riwayat-penilaian" title="Riwayat penilaian">
        {assessments.length === 0 ? (
          <EmptyState
            purpose="Belum ada penilaian tercatat untuk aset ini."
            why="Setiap penilaian disimpan sebagai riwayat, tidak menimpa yang lama."
            next={d.active && <Link href={nilaiHref} className="underline underline-offset-2">Mulai dengan menilai aset</Link>}
          />
        ) : (
          <div className="space-y-4">
            {assessments.length >= 2 && (
              <div className="flex items-center gap-3">
                <Sparkline values={trend} label="Skor penilaian" fmt={formatSkor} width={160} height={32} />
                <span className="text-label text-ink-muted">{assessments.length} penilaian, terlama ke terbaru</span>
              </div>
            )}
            <Scroll label="Tabel riwayat penilaian">
              <LedgerTable
                caption="Riwayat penilaian"
                head={["Tanggal", "Skor", "Kategori", "Versi"]}
                num={[1, 3]}
                rows={assessments.map((x) => [
                  formatTanggal(x.assessed_at),
                  x.total_score != null ? formatSkor(x.total_score) : "—",
                  <RiskBadge key={x.id} level={x.category ?? "unrated"} override={x.critical_override} size="sm" />,
                  x.params_version,
                ])}
              />
            </Scroll>
          </div>
        )}
      </Section>

      <Section id="riwayat-monitoring" title="Riwayat monitoring">
        {monitoring.length === 0 ? (
          <EmptyState
            purpose="Belum ada kunjungan atau tinjauan monitoring tercatat."
            why="Tanggal monitoring terakhir pada identitas berasal dari impor, bukan dari catatan di sini."
            next={d.active && <Link href={monHref} className="underline underline-offset-2">Catat monitoring pertama</Link>}
          />
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {monitoring.map((m) => (
              <li key={m.id} className="py-3">
                <p className="text-body">
                  <span className="font-medium">{formatTanggal(m.monitored_at)}</span>
                  <span className="text-ink-muted"> · {METODE[m.method]}</span>
                </p>
                {m.findings && <p className="mt-1 text-body text-ink-muted break-words">{m.findings}</p>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="audit" title="Riwayat perubahan">
        {!d.isAdmin ? (
          <p className="text-body text-ink-muted">Riwayat perubahan hanya terlihat oleh admin.</p>
        ) : d.audit.length === 0 ? (
          <p className="text-body text-ink-muted">Belum ada perubahan tercatat.</p>
        ) : (
          <Scroll label="Tabel riwayat perubahan">
            <LedgerTable
              caption="Riwayat perubahan"
              head={["Waktu", "Objek", "Aksi", "Kolom berubah"]}
              rows={d.audit.map((x) => {
                const cols = changedColumns(x.action, x.before, x.after);
                return [formatTanggal(x.at), auditSubject(x.table_name), AKSI[x.action], cols.length ? cols.join(", ") : "—"];
              })}
            />
          </Scroll>
        )}
      </Section>
    </>
  );
}
