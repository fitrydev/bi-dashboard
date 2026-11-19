import { describe, expect, it } from "vitest";
import {
  addMonths,
  categoryFor,
  computeScore,
  DEFAULT_PARAMS,
  dueOf,
  dueText,
  intervalMonths,
} from "./index";

const S = (a: number, b: number, c: number, d: number, e: number, f: number) => ({
  legal: a,
  control: b,
  physical: c,
  utilization: d,
  location: e,
  strategic: f,
});
const T = new Date("2026-11-19T00:00:00Z");

describe("computeScore", () => {
  it("paritas Excel: (1,2,4,3,3,2) = 47,0 dan medium", () => {
    const s = computeScore(S(1, 2, 4, 3, 3, 2));
    expect(s).toBe(47);
    expect(categoryFor(s)).toBe("medium");
  });
  it("skor maksimum dan minimum", () => {
    expect(computeScore(S(5, 5, 5, 5, 5, 5))).toBe(100);
    expect(computeScore(S(1, 1, 1, 1, 1, 1))).toBe(20);
  });
  it("indikator kosong membuat skor null dan kategori belum dinilai", () => {
    const s = computeScore({ ...S(1, 2, 4, 3, 3, 2), location: null });
    expect(s).toBeNull();
    expect(categoryFor(s)).toBe("unrated");
    expect(computeScore({ legal: 3 })).toBeNull();
  });
});

describe("categoryFor", () => {
  it("override selalu critical", () => {
    expect(categoryFor(20, true)).toBe("critical");
    expect(categoryFor(null, true)).toBe("critical");
  });
  it("batas ambang", () => {
    expect(categoryFor(39.9)).toBe("low");
    expect(categoryFor(40)).toBe("medium");
    expect(categoryFor(59.9)).toBe("medium");
    expect(categoryFor(60)).toBe("high");
    expect(categoryFor(79.9)).toBe("high");
    expect(categoryFor(80)).toBe("critical");
  });
});

describe("interval dan jadwal", () => {
  it("interval per kategori", () => {
    expect(intervalMonths("critical")).toBe(1);
    expect(intervalMonths("high")).toBe(3);
    expect(intervalMonths("medium")).toBe(6);
    expect(intervalMonths("low")).toBe(12);
    expect(intervalMonths("unrated")).toBeNull();
  });
  it("addMonths", () => {
    expect(addMonths(new Date("2026-01-15T00:00:00Z"), 6).toISOString().slice(0, 10)).toBe(
      "2026-07-15",
    );
  });
  it("status jatuh tempo", () => {
    expect(dueOf(null, "high", DEFAULT_PARAMS, T).status).toBe("tak-terjadwal");
    expect(dueOf("2026-11-01", "unrated", DEFAULT_PARAMS, T).status).toBe("tak-terjadwal");
    expect(dueOf("2026-01-01", "high", DEFAULT_PARAMS, T).status).toBe("lewat");
    expect(dueOf("2026-08-30", "high", DEFAULT_PARAMS, T).status).toBe("segera");
    expect(dueOf("2026-11-01", "low", DEFAULT_PARAMS, T).status).toBe("terjadwal");
  });
  it("teks jatuh tempo", () => {
    expect(dueText({ status: "tak-terjadwal" })).toBe("Belum dapat dijadwalkan");
    expect(dueText(dueOf("2026-01-01", "high", DEFAULT_PARAMS, T))).toMatch(/^Lewat \d+ hari$/);
    expect(dueText(dueOf("2026-11-01", "low", DEFAULT_PARAMS, T))).toBe("1 November 2027");
  });
});
