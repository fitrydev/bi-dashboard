export type Query = Record<string, string | number | null | undefined>;

/** Bangun href internal dengan query opsional (nilai kosong dibuang). */
export function href(path: string, q?: Query): string {
  if (!q) return path;
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v != null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `${path}?${s}` : path;
}

export const asetList = (q?: Query) => href("/aset", q);
export const asetDetail = (code: string) => `/aset/${encodeURIComponent(code)}`;

/** decodeURIComponent yang tidak melempar untuk URL rusak (mis. `%E0%A4%A`) → kembalikan mentah (berakhir "tidak ditemukan"). */
export function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
