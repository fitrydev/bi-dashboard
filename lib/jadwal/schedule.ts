export type SchedStatus = "tak_terjadwal" | "belum_ada_tanggal" | "lewat" | "terjadwal";
export interface JadwalItem {
  code: string;
  name: string;
  pic: string | null;
  category: "critical" | "high" | "medium" | "low" | null;
  status: SchedStatus;
  /** "YYYY-MM-DD" */
  dueDate: string | null;
  days: number | null;
}
export type GroupKey = "lewat" | "segera" | "terjadwal" | "belum_ada_tanggal" | "tak_terjadwal";
export const GROUP_ORDER: GroupKey[] = ["lewat", "segera", "terjadwal", "belum_ada_tanggal", "tak_terjadwal"];

export const groupKeyOf = (i: JadwalItem): GroupKey =>
  i.status === "terjadwal" && i.days != null && i.days <= 30 ? "segera" : i.status;

/** Kelompok berurut; tiap kelompok urut tanggal jatuh tempo lalu kode. Kelompok kosong tetap ada. */
export function groupItems(items: JadwalItem[]): Record<GroupKey, JadwalItem[]> {
  const g: Record<GroupKey, JadwalItem[]> = { lewat: [], segera: [], terjadwal: [], belum_ada_tanggal: [], tak_terjadwal: [] };
  for (const i of items) g[groupKeyOf(i)].push(i);
  for (const k of GROUP_ORDER)
    g[k].sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "") || a.code.localeCompare(b.code));
  return g;
}

export type Tampil = "daftar" | "kalender";
export interface Params { tampil: Tampil; pic: string | null; bulan: string }

const BULAN_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
export const jakartaToday = (now = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now);

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Parse aman: nilai tak dikenal jatuh ke default. */
export function parseParams(
  sp: Record<string, string | string[] | undefined>,
  pics: string[],
  today: string,
): Params {
  const t = one(sp.tampil);
  const p = one(sp.pic);
  const b = one(sp.bulan);
  return {
    tampil: t === "kalender" ? "kalender" : "daftar",
    pic: p && pics.includes(p) ? p : null,
    bulan: b && BULAN_RE.test(b) ? b : today.slice(0, 7),
  };
}

export function shiftBulan(bulan: string, n: number): string {
  const [y, m] = bulan.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

/** Minggu Senin-Minggu; sel di luar bulan = null. */
export function monthGrid(bulan: string): (string | null)[][] {
  const [y, m] = bulan.split("-").map(Number);
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${bulan}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Aset jatuh tempo per tanggal dalam bulan itu. */
export function byDate(items: JadwalItem[], bulan: string): Map<string, JadwalItem[]> {
  const m = new Map<string, JadwalItem[]>();
  for (const i of items)
    if (i.dueDate?.startsWith(bulan)) m.set(i.dueDate, [...(m.get(i.dueDate) ?? []), i]);
  for (const l of m.values()) l.sort((a, b) => a.code.localeCompare(b.code));
  return m;
}
