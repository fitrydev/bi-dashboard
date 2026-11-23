import { describe, expect, it } from "vitest";
import { parseFilters, serializeFilters } from "./filters";
import { deriveLayout, idleStats, nextToAssess, niceTicks } from "./derive";
import { formatWilayah } from "@/lib/format";
import type { AssetRow } from "@/lib/types";

describe("filters", () => {
  it("parse: abaikan nilai tak dikenal", () => {
    expect(parseFilters({ wilayah: "Jakarta", jenis: "tanah", kategori: "xx" })).toEqual({ region: "Jakarta", type: "tanah" });
    expect(parseFilters(new URLSearchParams("kategori=unrated&jenis=rumah"))).toEqual({ category: "unrated" });
  });
  it("serialize round-trip", () => {
    const f = { region: "A", type: "gabungan", category: "high" } as const;
    expect(parseFilters(serializeFilters(f))).toEqual(f);
  });
});

const row = (o: Partial<AssetRow>) => ({ level: "unrated", value: null, utilization: null, ...o }) as AssetRow;

describe("derive", () => {
  it("batas coverage 20%", () => {
    expect(deriveLayout({ assets: 100, assessed: 19 }).mode).toBe("low");
    expect(deriveLayout({ assets: 100, assessed: 20 }).mode).toBe("high");
    expect(deriveLayout({ assets: 0, assessed: 0 }).coverage).toBe(0);
  });
  it("gerbang tren", () => {
    expect(deriveLayout({ assets: 1, assessed: 1 }).showTrend).toBe(false);
    expect(deriveLayout({ assets: 1, assessed: 1, periods: 1 }).showTrend).toBe(false);
    expect(deriveLayout({ assets: 1, assessed: 1, periods: 2 }).showTrend).toBe(true);
  });
  it("nextToAssess hanya unrated, nilai tertinggi dulu", () => {
    const r = [row({ code: "a", value: 5 }), row({ code: "b", value: 9 }), row({ code: "c", level: "low", value: 99 })];
    expect(nextToAssess(r).map((x) => x.code)).toEqual(["b", "a"]);
  });
  it("idle value/share", () => {
    const r = [row({ utilization: "Idle/Kosong", value: 25 }), row({ utilization: "Lainnya", value: 75 })];
    expect(idleStats(r)).toEqual({ count: 1, value: 25, share: 0.25 });
  });
});

describe("niceTicks & formatWilayah", () => {
  it("tick mencakup max", () => {
    expect(niceTicks(136)).toEqual([0, 50, 100, 150]);
    expect(niceTicks(143.9e9)).toEqual([0, 50e9, 100e9, 150e9]);
    expect(niceTicks(0)).toEqual([0, 1]);
    for (const m of [1, 7, 99, 1234, 5e8]) expect(niceTicks(m)[3]).toBeGreaterThanOrEqual(m);
  });
  it("nama wilayah", () => {
    expect(formatWilayah("DKI JAKARTA")).toBe("DKI Jakarta");
    expect(formatWilayah("JAWA BARAT")).toBe("Jawa Barat");
  });
});
