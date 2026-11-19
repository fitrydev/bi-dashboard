import { describe, expect, it } from "vitest";
import { formatLuas, formatPersen, formatRupiahRingkas, formatSkor, formatTanggal } from "./index";

describe("format id-ID", () => {
  it("Rp ringkas", () => {
    expect(formatRupiahRingkas(22_047_000_000)).toBe("Rp22,0 M");
    expect(formatRupiahRingkas(850_000_000)).toBe("Rp850 jt");
  });
  it("placeholder dan null menjadi tanda hubung", () => {
    expect(formatRupiahRingkas(1)).toBe("—");
    expect(formatRupiahRingkas(null)).toBe("—");
    expect(formatLuas(1)).toBe("—");
    expect(formatLuas(null)).toBe("—");
  });
  it("luas dengan m2", () => {
    expect(formatLuas(1500)).toBe("1.500 m²");
  });
  it("tanggal", () => {
    expect(formatTanggal("2027-05-12")).toBe("12 Mei 2027");
    expect(formatTanggal(null)).toBe("—");
  });
  it("persen dan skor", () => {
    expect(formatPersen(0.5)).toBe("50%");
    expect(formatPersen(0.05)).toBe("5%");
    expect(formatSkor(47)).toBe("47,0");
  });
});
