import { INDICATORS, type AssessmentDraftData, type Indicator } from "@/lib/schemas/assessment";

/** Skor di form: undefined = belum dipilih, null = "Belum diketahui" (eksplisit). Keduanya dikirim sebagai null. */
export type FormScores = Record<Indicator, number | null | undefined>;

export interface FormValues {
  assessed_at: string;
  scores: FormScores;
  critical_override: boolean;
  override_reason: string;
  findings: string;
  follow_up: string;
  follow_up_pic: string;
  target_date: string;
}

export type DefaultSource = "draft" | "last" | "empty";

const str = (v: string | null | undefined) => v ?? "";

/**
 * Nilai awal form: draf user > skor penilaian terakhir (3.3.7, hanya skor; catatan lama tidak ikut) > kosong.
 * Tanggal penilaian default hari ini kecuali draf menyimpannya.
 */
export function initialValues(opts: {
  draft: Partial<AssessmentDraftData> | null;
  last: Partial<Record<Indicator, number | null>> | null;
  today: string;
}): { values: FormValues; source: DefaultSource } {
  const { draft, last, today } = opts;
  const scores = {} as FormScores;
  const src = draft ? draft.scores : (last ?? undefined);
  for (const k of INDICATORS) scores[k] = src && k in src ? (src[k] ?? null) : undefined;
  const d = draft ?? {};
  return {
    source: draft ? "draft" : last ? "last" : "empty",
    values: {
      assessed_at: d.assessed_at || today,
      scores,
      critical_override: d.critical_override ?? false,
      override_reason: str(d.override_reason),
      findings: str(d.findings),
      follow_up: str(d.follow_up),
      follow_up_pic: str(d.follow_up_pic),
      target_date: str(d.target_date),
    },
  };
}

export function toPayload(v: FormValues, asset_code: string) {
  const scores = {} as Record<Indicator, number | null>;
  for (const k of INDICATORS) scores[k] = v.scores[k] ?? null;
  return { ...v, asset_code, scores };
}

/** Catatan wajib bila ada indikator ≥ 4 atau override (cermin superRefine di schema). */
export const findingsRequired = (v: Pick<FormValues, "scores" | "critical_override">) =>
  v.critical_override || INDICATORS.some((k) => (v.scores[k] ?? 0) >= 4);

/** Urutan tampil field, untuk mengurutkan ringkasan error. */
const ORDER = [
  "assessed_at",
  ...INDICATORS.map((k) => `scores.${k}`),
  "critical_override",
  "override_reason",
  "findings",
  "follow_up",
  "follow_up_pic",
  "target_date",
];

/** fieldErrors server (path bertitik → daftar pesan) → satu pesan pertama per field, urut sesuai form. */
export function mapFieldErrors(fe: Record<string, string[]> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  const rank = (k: string) => (ORDER.includes(k) ? ORDER.indexOf(k) : ORDER.length);
  for (const k of Object.keys(fe ?? {}).sort((a, b) => rank(a) - rank(b))) {
    const m = fe![k]?.[0];
    if (m) out[k] = m;
  }
  return out;
}

/** Isu zod → fieldErrors bentuk server, supaya satu jalur pemetaan. */
export function issuesToFieldErrors(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
): Record<string, string[]> {
  const fe: Record<string, string[]> = {};
  for (const i of issues) (fe[i.path.map(String).join(".") || "_form"] ??= []).push(i.message);
  return fe;
}

/** Id elemen field (tanpa titik agar aman sebagai fragment/selector). */
export const fieldId = (path: string) => `f-${path.replace(/\./g, "-")}`;
