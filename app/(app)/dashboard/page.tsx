import type { Metadata } from "next";
import { PageHeader } from "@/components/ledger/PageHeader";
import { Section } from "@/components/ledger/Section";
import { EmptyState } from "@/components/ledger/EmptyState";
import { RiskBadge } from "@/components/risk/RiskBadge";
import { DEFAULT_PARAMS, LEVELS, categoryInfo, intervalText, type RiskLevel } from "@/lib/scoring";

export const metadata: Metadata = { title: "Dashboard" };

const { critical, high, medium } = DEFAULT_PARAMS.thresholds;
const RANGE: Record<RiskLevel, string> = {
  critical: `skor ${critical} ke atas`,
  high: `skor ${high} sampai kurang dari ${critical}`,
  medium: `skor ${medium} sampai kurang dari ${high}`,
  low: `skor di bawah ${medium}`,
  unrated: "belum ada penilaian",
};

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        sub="Ringkasan risiko seluruh aset: sebaran kategori, aset prioritas, dan jadwal monitoring."
      />
      <Section first title="Ringkasan portofolio">
        <EmptyState
          purpose="Halaman ini akan menampilkan jumlah aset per kategori risiko, nilai buku terdampak, dan aset yang perlu ditindaklanjuti."
          why="Data belum tersedia: skema database dibangun di Fase 2."
          next="Langkah berikut: setelah skema siap, data aset diimpor dari berkas Excel lewat halaman Import."
        />
      </Section>
      <Section
        title="Legenda kategori"
        sub={`Parameter versi ${DEFAULT_PARAMS.version}. Skor 20–100; aset yang belum dinilai tidak dihitung sebagai Low.`}
      >
        <ul className="divide-y divide-rule border-y border-rule">
          {LEVELS.map((l) => (
            <li key={l} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
              <span className="shrink-0 max-sm:w-full sm:w-36">
                <RiskBadge level={l} />
              </span>
              <span className="text-body text-ink">{RANGE[l]}</span>
              <span className="text-body text-ink-muted">
                {l === "unrated"
                  ? "jadwal menunggu penilaian pertama"
                  : `monitoring ${intervalText(l)}${categoryInfo(l) ? `: ${categoryInfo(l)!.method}` : ""}`}
              </span>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
