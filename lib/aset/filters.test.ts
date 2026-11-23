import { describe, expect, it } from "vitest";
import { applyAsetFilters, focusAfterRemove, matchJadwal, parseAsetFilters, rowsReducer, serializeAsetFilters, type AsetListRow } from "./filters";

const row = (o: Partial<AsetListRow>) =>
  ({
    code: "A1", name: "Gedung Duri", region: "DKI JAKARTA", type: "Tanah", level: "unrated", warnings: [],
    utilization_key: null, schedule_status: null, days: null, ...o,
  }) as AsetListRow;

describe("parseAsetFilters", () => {
  it("link dashboard", () => {
    expect(parseAsetFilters(new URLSearchParams("warn=hak-kedaluwarsa")).warn).toBe("hak-kedaluwarsa");
    expect(parseAsetFilters(new URLSearchParams("warn=nilai-placeholder")).warn).toBe("nilai-placeholder");
    expect(parseAsetFilters(new URLSearchParams("pemanfaatan=idle_kosong")).utilization).toBe("idle_kosong");
    expect(parseAsetFilters(new URLSearchParams("dinilai=ya")).rated).toBe(true);
    expect(parseAsetFilters(new URLSearchParams("dinilai=tidak")).rated).toBe(false);
    expect(parseAsetFilters(new URLSearchParams("kategori=critical")).category).toBe("critical");
  });
  it("abaikan nilai tak dikenal", () => {
    const f = parseAsetFilters({ warn: "x", dinilai: "mungkin", jadwal: "x", kategori: "x", urut: "nilai:naik", kolom: "x" });
    expect(f).toEqual({});
  });
  it("kolom, urut, q, jadwal", () => {
    const f = parseAsetFilters({ kolom: "skor,wilayah,zzz", urut: "skor:asc", q: " duri ", jadwal: "segera" });
    expect(f).toEqual({ columns: ["wilayah", "skor"], sort: { key: "skor", dir: "asc" }, q: "duri", schedule: "segera" });
  });
  it("round trip", () => {
    const s = "wilayah=DKI+JAKARTA&jenis=tanah&warn=perlu-review&dinilai=ya&jadwal=lewat&q=a&urut=nilai%3Adesc";
    expect(serializeAsetFilters(parseAsetFilters(new URLSearchParams(s))).toString()).toBe(s);
  });
});

describe("applyAsetFilters", () => {
  const rows = [
    row({ code: "A1" }),
    row({ code: "B2", name: "Ruko", region: "BANTEN", type: "Bangunan", level: "critical", warnings: ["hak-kedaluwarsa"], utilization_key: "idle_kosong", schedule_status: "terjadwal", days: 10 }),
  ];
  it("menyaring", () => {
    const codes = (f: object) => applyAsetFilters(rows, f).map((r) => r.code);
    expect(codes({ warn: "hak-kedaluwarsa" })).toEqual(["B2"]);
    expect(codes({ rated: true })).toEqual(["B2"]);
    expect(codes({ rated: false })).toEqual(["A1"]);
    expect(codes({ utilization: "idle_kosong" })).toEqual(["B2"]);
    expect(codes({ region: "banten" })).toEqual(["B2"]);
    expect(codes({ q: "duri" })).toEqual(["A1"]);
    expect(codes({ schedule: "segera" })).toEqual(["B2"]);
    expect(codes({ schedule: "tak_terjadwal" })).toEqual(["A1"]);
  });
  it("batas segera", () => {
    expect(matchJadwal({ schedule_status: "terjadwal", days: 31 }, "segera")).toBe(false);
    expect(matchJadwal({ schedule_status: "terjadwal", days: 0 }, "segera")).toBe(true);
  });
});

describe("hapus optimistik", () => {
  it("fokus ke baris berikut, lalu sebelumnya", () => {
    expect(focusAfterRemove(["A", "B", "C"], "B")).toBe("C");
    expect(focusAfterRemove(["A", "B", "C"], "C")).toBe("B");
    expect(focusAfterRemove(["A"], "A")).toBeNull();
    expect(focusAfterRemove(["A"], "X")).toBeNull();
  });
  it("reducer hapus/tambah idempoten", () => {
    const a = row({ code: "A" }), b = row({ code: "B" });
    expect(rowsReducer([a, b], { type: "remove", code: "A" })).toEqual([b]);
    expect(rowsReducer([b], { type: "add", row: a })).toEqual([b, a]);
    expect(rowsReducer([a, b], { type: "add", row: a })).toHaveLength(2);
  });
});
