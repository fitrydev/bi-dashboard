const NBSP = " ";
const nf1 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** Rp ringkas: Rp22,0 M · Rp850 jt. Placeholder (<= 1) dan null menjadi "—". */
export function formatRupiahRingkas(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 1) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `Rp${nf1.format(n / 1e12)}${NBSP}T`;
  if (abs >= 1e9) return `Rp${nf1.format(n / 1e9)}${NBSP}M`;
  if (abs >= 1e6) return `Rp${(abs < 1e7 ? nf1 : nf0).format(n / 1e6)}${NBSP}jt`;
  if (abs >= 1e3) return `Rp${nf1.format(n / 1e3)}${NBSP}rb`;
  return `Rp${nf0.format(n)}`;
}

/** Rp eksak untuk tooltip: Rp22.047.000.000 */
export const formatRupiahEksak = (n: number): string => `Rp${nf0.format(Math.round(n))}`;

/** Label sumbu: Rp0 · Rp5 M · Rp500 jt */
export function formatSumbuRupiah(n: number): string {
  if (n === 0) return "Rp0";
  if (n >= 1e9)
    return `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n / 1e9)}${NBSP}M`;
  if (n >= 1e6) return `Rp${nf0.format(n / 1e6)}${NBSP}jt`;
  return `Rp${nf0.format(n)}`;
}

export const formatPersen = (frac: number): string =>
  `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: Math.abs(frac) < 0.1 && frac !== 0 ? 1 : 0 }).format(frac * 100)}%`;

export const formatLuas = (m2: number | null | undefined): string =>
  m2 == null || m2 <= 1 ? "—" : `${nf0.format(m2)}${NBSP}m²`;

export const formatAngka = (n: number): string => nf0.format(n);
export const formatSkor = (n: number): string => nf1.format(n);
export const formatDesimal = (n: number): string => nf1.format(n);

const fmtFull = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});
const fmtShort = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  timeZone: "Asia/Jakarta",
});
const fmtBulan = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});
const cap = (s: string) =>
  s.replace(/(^|\d )(\p{Ll})/u, (_, d: string, c: string) => d + c.toUpperCase());

export function formatTanggal(
  d: Date | string | null | undefined,
  gaya: "penuh" | "singkat" = "penuh",
): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return cap((gaya === "penuh" ? fmtFull : fmtShort).format(date));
}
export function formatBulan(d: Date): string {
  return cap(fmtBulan.format(d));
}

const KATA = [
  "nol",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
  "sembilan",
  "sepuluh",
];
/** Kata bilangan 0–10; di atas itu angka id-ID. */
export const kataBilangan = (n: number): string =>
  Number.isInteger(n) && n >= 0 && n <= 10 ? KATA[n] : nf0.format(n);
export const kapital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
