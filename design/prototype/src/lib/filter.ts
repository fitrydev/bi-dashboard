import { rows, type Row, type WarnKey } from "./data";

export interface Filters { wilayah: string; jenis: string; kategori: string; pakai: string; warn: string; q: string; sort: string; dir: string; hal: number }
export const readFilters = (p: URLSearchParams): Filters => ({
  wilayah: p.get("wilayah") ?? "", jenis: p.get("jenis") ?? "", kategori: p.get("kategori") ?? "", pakai: p.get("pakai") ?? "",
  warn: p.get("warn") ?? "", q: p.get("q") ?? "", sort: p.get("sort") ?? "nilai", dir: p.get("dir") ?? "desc", hal: Number(p.get("hal") ?? 1) || 1,
});
export function applyFilters(f: Filters): Row[] {
  const q = f.q.trim().toLowerCase();
  const out = rows.filter((r) =>
    (!f.wilayah || r.region === f.wilayah) && (!f.jenis || r.type === f.jenis) && (!f.kategori || r.level === f.kategori) &&
    (!f.pakai || (f.pakai === "idle" ? r.utilization === "Idle/Kosong" : r.utilization !== "Idle/Kosong")) &&
    (!f.warn || r.warnings.includes(f.warn as WarnKey)) &&
    (!q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)));
  const d = f.dir === "asc" ? 1 : -1;
  const key = (r: Row): number | string => {
    switch (f.sort) {
      case "id": return r.code; case "nama": return r.name; case "wilayah": return r.region;
      case "luas": return r.land_area_m2 ?? -1; case "skor": return r.score ?? -1;
      default: return r.value ?? -1;
    }
  };
  return out.sort((a, b) => {
    const x = key(a), y = key(b);
    const c = typeof x === "string" ? x.localeCompare(y as string, "id", { numeric: true }) : (x as number) - (y as number);
    return c * d || a.code.localeCompare(b.code, "id", { numeric: true });
  });
}
