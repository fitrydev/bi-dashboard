import { formatAngka, formatPersen } from "@/lib/format";

/** Ambang minimum titik agar tren bermakna. */
export const MIN_TREND_POINTS = 2;

export type TrendPoint = number | null | undefined;

const valid = (v: TrendPoint): v is number => typeof v === "number" && Number.isFinite(v);

/** Ringkasan aria sparkline: arah, awal, akhir, min, maks. Null diabaikan. */
export function sparklineSummary(
  values: TrendPoint[],
  label: string,
  fmt: (n: number) => string = formatAngka,
): string {
  const v = values.filter(valid);
  if (v.length === 0) return `${label}: belum ada data.`;
  if (v.length < MIN_TREND_POINTS)
    return `${label}: baru 1 titik data (${fmt(v[0])}), tren belum bisa dihitung.`;
  const first = v[0];
  const last = v[v.length - 1];
  const dir = last > first ? "naik" : last < first ? "turun" : "tetap";
  return `${label}: ${dir} dari ${fmt(first)} ke ${fmt(last)} dalam ${v.length} titik; terendah ${fmt(Math.min(...v))}, tertinggi ${fmt(Math.max(...v))}.`;
}

/** Koordinat polyline; null memutus garis (kembalikan segmen). Skala y dibalik, padding p. */
export function sparklinePaths(values: TrendPoint[], w: number, h: number, p = 3): string[] {
  const v = values.filter(valid);
  if (v.length < MIN_TREND_POINTS) return [];
  const min = Math.min(...v);
  const span = Math.max(...v) - min || 1;
  const step = values.length > 1 ? (w - 2 * p) / (values.length - 1) : 0;
  const segs: string[][] = [[]];
  values.forEach((x, i) => {
    if (!valid(x)) return void (segs[segs.length - 1].length && segs.push([]));
    const y = v.every((n) => n === v[0]) ? h / 2 : h - p - ((x - min) / span) * (h - 2 * p);
    segs[segs.length - 1].push(`${(p + i * step).toFixed(1)},${y.toFixed(1)}`);
  });
  return segs.filter((s) => s.length >= 2).map((s) => s.join(" "));
}

export interface StackedInput<K extends string = string> {
  key: K;
  label: string;
  value: number | null | undefined;
}
export interface StackedSegment<K extends string = string> {
  key: K;
  label: string;
  value: number;
  share: number;
}

/** Buang nilai null/negatif/NaN/0, hitung porsi 0..1 terhadap total yang tersisa. Urutan input dipertahankan. */
export function normalizeStacked<K extends string>(
  items: StackedInput<K>[],
): {
  segments: StackedSegment<K>[];
  total: number;
} {
  const ok = items.filter((i) => valid(i.value) && i.value > 0) as (StackedInput<K> & {
    value: number;
  })[];
  const total = ok.reduce((s, i) => s + i.value, 0);
  return {
    total,
    segments: ok.map((i) => ({
      key: i.key,
      label: i.label,
      value: i.value,
      share: i.value / total,
    })),
  };
}

/** Ringkasan teks untuk aria-describedby stacked. */
export function stackedSummary(
  segments: StackedSegment[],
  total: number,
  fmt: (n: number) => string = formatAngka,
): string {
  if (!segments.length) return "Belum ada data.";
  return `Total ${fmt(total)}: ${segments.map((s) => `${s.label} ${fmt(s.value)} (${formatPersen(s.share)})`).join(", ")}.`;
}

/** Kosong bila tak ada baris atau semua nilai bukan angka positif. */
export function isChartEmpty(values: TrendPoint[], min = 1): boolean {
  return values.filter((x) => valid(x) && x > 0).length < min;
}
