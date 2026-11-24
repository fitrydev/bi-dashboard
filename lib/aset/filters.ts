import { parseFilters, type DashboardFilters } from "@/lib/dashboard/filters";
import type { RiskLevel } from "@/lib/scoring/types";
import type { WarnKey } from "@/lib/scoring/labels";
import type { AssetRow } from "@/lib/types";

export const WARN_KEYS: readonly WarnKey[] = [
  "nilai-placeholder", "luas-placeholder", "hak-kedaluwarsa", "hak-berakhir",
  "tgl-masa-depan", "perlu-review", "alamat-kosong",
];
export const JADWAL_KEYS = ["lewat", "segera", "terjadwal", "belum_ada_tanggal", "tak_terjadwal"] as const;
export type JadwalKey = (typeof JADWAL_KEYS)[number];
export const JADWAL_LABEL: Record<JadwalKey, string> = {
  lewat: "Terlambat",
  segera: "Segera (30 hari)",
  terjadwal: "Terjadwal",
  belum_ada_tanggal: "Belum ada tanggal",
  tak_terjadwal: "Tak terjadwal",
};

/** Kolom opsional (ID dan Nama selalu tampil). */
export const COLUMN_KEYS = ["wilayah", "jenis", "pemanfaatan", "nilai", "kategori", "skor", "jadwal", "peringatan"] as const;
export type ColumnKey = (typeof COLUMN_KEYS)[number];
export const DEFAULT_COLUMNS: readonly ColumnKey[] = ["wilayah", "jenis", "nilai", "kategori", "skor", "jadwal", "peringatan"];
export const SORT_KEYS = ["id", "nama", "wilayah", "jenis", "pemanfaatan", "nilai", "kategori", "skor", "jadwal"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export interface Sort { key: SortKey; dir: "asc" | "desc" }
export const DEFAULT_SORT: Sort = { key: "nilai", dir: "desc" };

/** Baris daftar = AssetRow + status jadwal dari v_asset_latest. */
export type AsetListRow = AssetRow & {
  utilization_key: string | null;
  schedule_status: string | null;
  days: number | null;
  due_date: string | null;
};

export interface AsetFilters extends DashboardFilters {
  warn?: WarnKey;
  rated?: boolean;
  schedule?: JadwalKey;
  q?: string;
  columns?: ColumnKey[];
  sort?: Sort;
}

/** Cocok dengan hitungan dashboard: "terjadwal" = semua terjadwal (termasuk segera); segera = terjadwal dan 0 ≤ hari ≤ 30. */
export function matchJadwal(r: Pick<AsetListRow, "schedule_status" | "days">, k: JadwalKey): boolean {
  if (k === "segera") return r.schedule_status === "terjadwal" && r.days != null && r.days >= 0 && r.days <= 30;
  if (k === "tak_terjadwal") return r.schedule_status !== "lewat" && r.schedule_status !== "terjadwal" && r.schedule_status !== "belum_ada_tanggal";
  return r.schedule_status === k;
}

type Params = Record<string, string | string[] | undefined> | URLSearchParams;
const get = (p: Params, k: string): string | undefined => {
  const v = p instanceof URLSearchParams ? p.get(k) : p[k];
  return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
};
const pick = <T extends string>(list: readonly T[], v?: string): T | undefined => list.find((x) => x === v);

/** Nilai tak dikenal diabaikan. */
export function parseAsetFilters(p: Params): AsetFilters {
  const f: AsetFilters = parseFilters(p);
  const warn = pick(WARN_KEYS, get(p, "warn"));
  if (warn) f.warn = warn;
  const d = get(p, "dinilai");
  if (d === "ya" || d === "tidak") f.rated = d === "ya";
  const schedule = pick(JADWAL_KEYS, get(p, "jadwal"));
  if (schedule) f.schedule = schedule;
  const q = get(p, "q");
  if (q) f.q = q.slice(0, 100);
  const kolom = get(p, "kolom");
  if (kolom != null) {
    const cols = COLUMN_KEYS.filter((k) => kolom.split(",").includes(k));
    if (cols.length) f.columns = cols;
  }
  const [sk, sd] = (get(p, "urut") ?? "").split(":");
  const key = pick(SORT_KEYS, sk);
  if (key && (sd === "asc" || sd === "desc")) f.sort = { key, dir: sd };
  return f;
}

export function serializeAsetFilters(f: AsetFilters): URLSearchParams {
  const q = new URLSearchParams();
  if (f.region) q.set("wilayah", f.region);
  if (f.type) q.set("jenis", f.type);
  if (f.category) q.set("kategori", f.category);
  if (f.utilization) q.set("pemanfaatan", f.utilization);
  if (f.warn) q.set("warn", f.warn);
  if (f.rated != null) q.set("dinilai", f.rated ? "ya" : "tidak");
  if (f.schedule) q.set("jadwal", f.schedule);
  if (f.q) q.set("q", f.q);
  if (f.columns) q.set("kolom", f.columns.join(","));
  if (f.sort) q.set("urut", `${f.sort.key}:${f.sort.dir}`);
  return q;
}

const TYPE = { tanah: "Tanah", bangunan: "Bangunan", gabungan: "Gabungan" } as const;
const UTIL = {
  digunakan_sendiri: "Digunakan sendiri", disewakan_kerja_sama: "Disewakan / kerja sama",
  idle_kosong: "Idle / kosong", digunakan_pihak_lain: "Digunakan pihak lain", lainnya: "Lainnya",
} as const;
export const TYPE_OPTIONS = Object.entries(TYPE) as [keyof typeof TYPE, string][];
export const UTIL_OPTIONS = Object.entries(UTIL) as [keyof typeof UTIL, string][];

// ponytail: wilayah dicocokkan nama (case-insensitive); uuid wilayah (didukung dashboard) tidak dikenali di sini.
export function applyAsetFilters(rows: AsetListRow[], f: AsetFilters): AsetListRow[] {
  const q = f.q?.toLowerCase();
  const region = f.region?.toLowerCase();
  return rows.filter(
    (r) =>
      (!region || r.region.toLowerCase() === region) &&
      (!f.type || r.type.toLowerCase() === f.type) &&
      (!f.category || r.level === f.category) &&
      (!f.utilization || r.utilization_key === f.utilization) &&
      (!f.warn || r.warnings.includes(f.warn)) &&
      (f.rated == null || (r.level !== "unrated") === f.rated) &&
      (!f.schedule || matchJadwal(r, f.schedule)) &&
      (!q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)),
  );
}

export const LEVEL_RANK: Record<RiskLevel, number> = { critical: 4, high: 3, medium: 2, low: 1, unrated: 0 };

/** Kode baris yang menerima fokus setelah `code` dihapus: baris berikut, lalu sebelumnya; `null` bila kosong. */
export function focusAfterRemove(codes: readonly string[], code: string): string | null {
  const i = codes.indexOf(code);
  if (i < 0) return null;
  return codes[i + 1] ?? codes[i - 1] ?? null;
}

export type RowsAction = { type: "remove"; code: string } | { type: "add"; row: AsetListRow };

/** Reducer useOptimistic daftar aset (soft delete / urungkan). */
export function rowsReducer(rows: AsetListRow[], a: RowsAction): AsetListRow[] {
  if (a.type === "remove") return rows.filter((r) => r.code !== a.code);
  return rows.some((r) => r.code === a.row.code) ? rows : [...rows, a.row];
}

export const sortRows = (rows: AsetListRow[], s: Sort) => {
  const get = SORT_GET[s.key];
  const m = s.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = get(a), y = get(b);
    if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1; // kosong selalu di bawah
    return (x < y ? -1 : x > y ? 1 : 0) * m;
  });
};
const SORT_GET: Record<SortKey, (r: AsetListRow) => string | number | null> = {
  id: (r) => r.code,
  nama: (r) => r.name.toLowerCase(),
  wilayah: (r) => r.region,
  jenis: (r) => r.type,
  pemanfaatan: (r) => r.utilization,
  nilai: (r) => r.value,
  kategori: (r) => LEVEL_RANK[r.level],
  skor: (r) => r.score,
  jadwal: (r) => r.days,
};
