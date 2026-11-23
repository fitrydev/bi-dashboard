import { describe, expect, it } from "vitest";
import {
  isChartEmpty,
  normalizeStacked,
  sparklinePaths,
  sparklineSummary,
  stackedSummary,
} from "./chart-logic";

describe("sparkline", () => {
  it("ringkas tren dengan format id-ID", () => {
    expect(sparklineSummary([1000, null, 2500], "Skor")).toBe(
      "Skor: naik dari 1.000 ke 2.500 dalam 2 titik; terendah 1.000, tertinggi 2.500.",
    );
  });
  it("menangani kosong dan satu titik", () => {
    expect(sparklineSummary([null, undefined], "Skor")).toMatch(/belum ada data/);
    expect(sparklineSummary([5], "Skor")).toMatch(/1 titik/);
    expect(sparklinePaths([5], 100, 20)).toEqual([]);
    expect(sparklinePaths([null, null], 100, 20)).toEqual([]);
  });
  it("null memutus garis", () => {
    expect(sparklinePaths([1, 2, null, 3, 4], 100, 20)).toHaveLength(2);
    expect(sparklinePaths([1, 2, 3], 100, 20)).toHaveLength(1);
  });
  it("nilai datar digambar di tengah", () => {
    expect(sparklinePaths([2, 2], 100, 20)[0]).toBe("3.0,10.0 97.0,10.0");
  });
});

describe("stacked", () => {
  const items = [
    { key: "a", label: "A", value: 3 },
    { key: "b", label: "B", value: 0 },
    { key: "c", label: "C", value: null },
    { key: "d", label: "D", value: 1 },
    { key: "e", label: "E", value: -2 },
  ];
  it("membuang nol/null/negatif dan menormalkan porsi", () => {
    const { segments, total } = normalizeStacked(items);
    expect(total).toBe(4);
    expect(segments.map((s) => [s.key, s.share])).toEqual([
      ["a", 0.75],
      ["d", 0.25],
    ]);
  });
  it("kosong aman", () => {
    expect(normalizeStacked([]).segments).toEqual([]);
    expect(stackedSummary([], 0)).toBe("Belum ada data.");
  });
  it("ringkasan", () => {
    const { segments, total } = normalizeStacked(items);
    expect(stackedSummary(segments, total)).toBe("Total 4: A 3 (75%), D 1 (25%).");
  });
});

describe("isChartEmpty", () => {
  it("ambang", () => {
    expect(isChartEmpty([0, null])).toBe(true);
    expect(isChartEmpty([0, 1])).toBe(false);
    expect(isChartEmpty([1], 2)).toBe(true);
  });
});
