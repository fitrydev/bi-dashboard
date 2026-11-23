import { describe, expect, it } from "vitest";
import { byDate, groupItems, monthGrid, parseParams, shiftBulan, type JadwalItem } from "./schedule";

const it_ = (code: string, status: JadwalItem["status"], days: number | null, dueDate: string | null = null): JadwalItem => ({
  code, name: code, pic: null, category: null, status, dueDate, days,
});

describe("jadwal", () => {
  it("mengelompokkan dan mengurutkan", () => {
    const g = groupItems([
      it_("B", "terjadwal", 30, "2026-12-23"),
      it_("A", "terjadwal", 31, "2026-12-24"),
      it_("C", "lewat", -2, "2026-11-21"),
      it_("D", "belum_ada_tanggal", null),
      it_("E", "tak_terjadwal", null),
      it_("F", "terjadwal", 0, "2026-11-23"),
    ]);
    expect(g.segera.map((x) => x.code)).toEqual(["F", "B"]);
    expect(g.terjadwal.map((x) => x.code)).toEqual(["A"]);
    expect(g.lewat).toHaveLength(1);
    expect(g.tak_terjadwal).toHaveLength(1);
  });
  it("parse param: nilai tak dikenal diabaikan", () => {
    expect(parseParams({ tampil: "x", pic: "zzz", bulan: "2026-13" }, ["Unit A"], "2026-11-23")).toEqual({
      tampil: "daftar", pic: null, bulan: "2026-11",
    });
    expect(parseParams({ tampil: "kalender", pic: "Unit A", bulan: "2027-02" }, ["Unit A"], "2026-11-23")).toEqual({
      tampil: "kalender", pic: "Unit A", bulan: "2027-02",
    });
  });
  it("grid bulan mulai Senin", () => {
    const w = monthGrid("2026-11"); // 1 Nov 2026 = Minggu
    expect(w[0].slice(0, 6).every((c) => c === null)).toBe(true);
    expect(w[0][6]).toBe("2026-11-01");
    expect(w.flat().filter(Boolean)).toHaveLength(30);
    expect(w.every((r) => r.length === 7)).toBe(true);
  });
  it("geser bulan lintas tahun", () => {
    expect(shiftBulan("2026-12", 1)).toBe("2027-01");
    expect(shiftBulan("2027-01", -1)).toBe("2026-12");
  });
  it("byDate hanya bulan itu", () => {
    const m = byDate([it_("A", "terjadwal", 5, "2026-11-28"), it_("B", "terjadwal", 40, "2026-12-01")], "2026-11");
    expect([...m.keys()]).toEqual(["2026-11-28"]);
  });
});
