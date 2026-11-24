import { describe, expect, it } from "vitest";

import { emailInput, fractionToPct, paramsInput, regionAliasInput, resolveReviewInput, weightsToFractions } from "./settings";

const ok = {
  weights: { legal: 20, control: 25, physical: 15, utilization: 15, location: 10, strategic: 15 },
  thresholds: { critical: 80, high: 60, medium: 40 },
  intervals: { critical: 1, high: 3, medium: 6, low: 12 },
};
const issues = (r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path.join("."), i.message]));

describe("paramsInput", () => {
  it("menerima parameter versi 1 dan mengonversi ke fraksi Σ = 1", () => {
    const r = paramsInput.safeParse(ok);
    expect(r.success).toBe(true);
    expect(r.data!.weights.control).toBe(0.25);
  });
  it("menolak Σ ≠ 100", () => {
    const r = paramsInput.safeParse({ ...ok, weights: { ...ok.weights, legal: 21 } });
    expect(issues(r).weights).toMatch(/Total bobot harus 100%/);
    expect(paramsInput.safeParse({ ...ok, weights: { ...ok.weights, legal: 19.99 } }).success).toBe(false);
  });
  it("33,33 + 33,33 + 33,34 = 100 diterima (string koma id-ID juga)", () => {
    const w = { legal: "33,33", control: "33,33", physical: "33,34", utilization: 0, location: 0, strategic: 0 };
    const r = paramsInput.safeParse({ ...ok, weights: w });
    expect(r.success).toBe(true);
    // Σ dalam desimal tepat = 1 (hindari penjumlahan float: pakai satuan 1e-4)
    const units = Object.values(r.data!.weights).reduce((a, f) => a + Math.round(f * 1e4), 0);
    expect(units).toBe(10000);
  });
  it("33,33 ×3 + 0 = 99,99 ditolak", () => {
    const w = { legal: 33.33, control: 33.33, physical: 33.33, utilization: 0, location: 0, strategic: 0 };
    expect(paramsInput.safeParse({ ...ok, weights: w }).success).toBe(false);
  });
  it("konversi persen→fraksi: Σ tepat 1 untuk campuran yang rawan float", () => {
    const f = weightsToFractions({ legal: 0.1, control: 0.2, physical: 0.3, utilization: 10, location: 29.4, strategic: 60 })!;
    expect(Object.values(f).reduce((a, x) => a + Math.round(x * 1e4), 0)).toBe(10000);
    expect(String(f.legal)).toBe("0.001"); // tercetak persis, tanpa ekor float
    expect(weightsToFractions({ legal: 50, control: 50, physical: 1, utilization: 0, location: 0, strategic: 0 })).toBeNull();
    expect(fractionToPct(0.3333)).toBe(33.33);
  });
  it("menolak bobot negatif atau non-angka", () => {
    expect(paramsInput.safeParse({ ...ok, weights: { ...ok.weights, legal: -5, control: 50 } }).success).toBe(false);
    expect(issues(paramsInput.safeParse({ ...ok, weights: { ...ok.weights, legal: "" } }))["weights.legal"]).toMatch(/angka/);
  });
  it("menolak ambang tidak monoton / di luar rentang", () => {
    for (const t of [
      { critical: 60, high: 60, medium: 40 },
      { critical: 80, high: 40, medium: 60 },
      { critical: 101, high: 60, medium: 40 },
      { critical: 80, high: 60, medium: 0 },
    ])
      expect(issues(paramsInput.safeParse({ ...ok, thresholds: t })).thresholds).toMatch(/Ambang harus menurun/);
    expect(paramsInput.safeParse({ ...ok, thresholds: { critical: 100, high: 60, medium: 1 } }).success).toBe(true);
  });
  it("menolak interval 0, desimal, atau kosong", () => {
    expect(paramsInput.safeParse({ ...ok, intervals: { ...ok.intervals, low: 0 } }).success).toBe(false);
    expect(paramsInput.safeParse({ ...ok, intervals: { ...ok.intervals, low: 1.5 } }).success).toBe(false);
    expect(paramsInput.safeParse({ ...ok, intervals: { ...ok.intervals, low: "" } }).success).toBe(false);
  });
});

describe("input lain", () => {
  it("email dinormalisasi dan divalidasi", () => {
    expect(emailInput.parse({ email: "  Budi@Contoh.CO.ID ", role: "editor" }).email).toBe("budi@contoh.co.id");
    expect(emailInput.safeParse({ email: "bukan-email", role: "viewer" }).success).toBe(false);
    expect(emailInput.safeParse({ email: "a@b.co", role: "owner" }).success).toBe(false);
  });
  it("alias wilayah di-uppercase", () => {
    const r = regionAliasInput.parse({ alias: " jabar ", region_id: "2f1e6b7e-3f55-4c1a-8f5e-0a9d3c1b2a44" });
    expect(r.alias).toBe("JABAR");
  });
  it("koreksi massal: 1..5000 id", () => {
    expect(resolveReviewInput.safeParse({ asset_ids: [] }).success).toBe(false);
    const id = "2f1e6b7e-3f55-4c1a-8f5e-0a9d3c1b2a44";
    expect(resolveReviewInput.safeParse({ asset_ids: Array(5001).fill(id) }).success).toBe(false);
    expect(resolveReviewInput.safeParse({ asset_ids: [id], status: "idle_kosong" }).success).toBe(true);
  });
});
