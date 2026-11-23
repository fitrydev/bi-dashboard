"use client";

import { SimpleBar, StackedBar, Sparkline, type BarDatum } from "@/components/charts";
import { formatAngka, formatRupiahEksak, formatRupiahRingkas, formatSkor } from "@/lib/format";
import type { RiskLevel } from "@/lib/scoring";

// Pembungkus klien: fungsi format tidak bisa dilewatkan dari Server Component ke chart klien.
export function RegionBar({ data }: { data: BarDatum[] }) {
  return (
    <SimpleBar data={data} format={formatRupiahRingkas} exact={formatRupiahEksak} ariaLabel="Nilai buku per wilayah" />
  );
}

export function LevelBar({ data }: { data: BarDatum[] }) {
  return <SimpleBar horizontal={false} height={200} data={data} format={formatAngka} ariaLabel="Jumlah aset per kategori (contoh vertikal)" />;
}

export function LevelStack({ items }: { items: { level: RiskLevel; value: number }[] }) {
  return <StackedBar items={items} ariaLabel="Jumlah aset per kategori risiko" />;
}

export function Trend({ values }: { values: (number | null)[] }) {
  return <Sparkline values={values} label="Skor rata-rata" fmt={formatSkor} />;
}
