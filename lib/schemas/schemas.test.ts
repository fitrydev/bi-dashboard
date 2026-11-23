import { afterEach, describe, expect, it, vi } from "vitest";

import { assessmentDraftInput, assessmentInput } from "./assessment";
import { assetInput } from "./asset";
import { todayJakarta } from "./date";
import { monitoringInput } from "./monitoring";

const issues = (r: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) => Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path.join("."), i.message]));

const noScores = {
  legal: null,
  control: null,
  physical: null,
  utilization: null,
  location: null,
  strategic: null,
};
const base = {
  asset_code: "A-1",
  assessed_at: "2026-11-01",
  scores: noScores,
  critical_override: false,
};

afterEach(() => vi.useRealTimers());

describe("todayJakarta", () => {
  it("memakai WIB (UTC+7), bukan UTC", () => {
    expect(todayJakarta(new Date("2026-11-22T17:30:00Z"))).toBe("2026-11-23");
    expect(todayJakarta(new Date("2026-11-22T16:59:00Z"))).toBe("2026-11-22");
  });
});

describe("assetInput", () => {
  const ok = {
    asset_code: " A-1 ",
    name: "Gedung",
    type: "bangunan",
    region: "JAWA BARAT",
  } as const;
  it("string kosong → null, trim", () => {
    const r = assetInput.parse({
      ...ok,
      address: "  ",
      book_value: "",
      utilization: "",
      right_expiry_date: "",
    });
    expect(r).toMatchObject({
      asset_code: "A-1",
      address: null,
      book_value: null,
      utilization: null,
      right_expiry_date: null,
    });
    expect(r.notes).toBeNull();
  });
  it("angka dari string, tolak negatif & bukan angka", () => {
    expect(assetInput.parse({ ...ok, land_area_m2: "12.5" }).land_area_m2).toBe(12.5);
    expect(issues(assetInput.safeParse({ ...ok, book_value: -1 }))).toHaveProperty("book_value");
    expect(issues(assetInput.safeParse({ ...ok, book_value: "abc" }))).toHaveProperty("book_value");
  });
  it("wajib & enum & tanggal", () => {
    const e = issues(
      assetInput.safeParse({ ...ok, asset_code: "", type: "x", right_expiry_date: "2026-02-30" }),
    );
    expect(Object.keys(e).sort()).toEqual(["asset_code", "right_expiry_date", "type"]);
  });
});

describe("assessmentInput", () => {
  it("lolos tanpa skor (belum dinilai = null, bukan 1)", () => {
    const r = assessmentInput.parse({ ...base, findings: "" });
    expect(r.scores.legal).toBeNull();
    expect(r.findings).toBeNull();
  });
  it("skor ≥4 tanpa catatan → error di findings", () => {
    const r = assessmentInput.safeParse({
      ...base,
      scores: { ...noScores, control: 4 },
      findings: "  ",
    });
    expect(issues(r)).toEqual({ findings: "Isi catatan untuk skor 4 atau 5." });
    expect(
      assessmentInput.safeParse({ ...base, scores: { ...noScores, control: 5 }, findings: "retak" })
        .success,
    ).toBe(true);
    expect(
      assessmentInput.safeParse({ ...base, scores: { ...noScores, control: 3 } }).success,
    ).toBe(true);
  });
  it("override wajib alasan", () => {
    expect(issues(assessmentInput.safeParse({ ...base, critical_override: true }))).toHaveProperty(
      "override_reason",
    );
    expect(
      assessmentInput.safeParse({ ...base, critical_override: true, override_reason: "sengketa" })
        .success,
    ).toBe(true);
  });
  it("skor di luar 1..5 / pecahan ditolak", () => {
    for (const s of [0, 6, 2.5]) {
      expect(
        issues(assessmentInput.safeParse({ ...base, scores: { ...noScores, legal: s } })),
      ).toHaveProperty("scores.legal");
    }
  });
  it("tanggal masa depan (WIB) ditolak, hari ini lolos", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-22T17:30:00Z")); // 23 Nov WIB
    expect(assessmentInput.safeParse({ ...base, assessed_at: "2026-11-23" }).success).toBe(true);
    expect(issues(assessmentInput.safeParse({ ...base, assessed_at: "2026-11-24" }))).toEqual({
      assessed_at: "Tanggal penilaian tidak boleh di masa depan.",
    });
  });
});

describe("assessmentDraftInput", () => {
  it("hanya asset_code wajib; tanpa aturan catatan/override", () => {
    expect(assessmentDraftInput.safeParse({ asset_code: "A-1" }).success).toBe(true);
    expect(
      assessmentDraftInput.safeParse({
        asset_code: "A-1",
        scores: { legal: 5 },
        critical_override: true,
      }).success,
    ).toBe(true);
    expect(assessmentDraftInput.safeParse({ asset_code: "" }).success).toBe(false);
  });
});

describe("monitoringInput", () => {
  it("D4: tanggal masa depan ditolak dengan pesan baku", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-23T03:00:00Z"));
    const r = monitoringInput.safeParse({
      asset_code: "A-1",
      monitored_at: "2026-11-24",
      method: "remote",
    });
    expect(issues(r)).toEqual({ monitored_at: "Tanggal monitoring tidak boleh di masa depan." });
  });
  it("metode enum, findings maks 4000, kosong → null", () => {
    expect(
      issues(
        monitoringInput.safeParse({ asset_code: "A-1", monitored_at: "2026-11-01", method: "x" }),
      ),
    ).toHaveProperty("method");
    const long = monitoringInput.safeParse({
      asset_code: "A-1",
      monitored_at: "2026-11-01",
      method: "remote",
      findings: "x".repeat(4001),
    });
    expect(issues(long)).toHaveProperty("findings");
    expect(
      monitoringInput.parse({
        asset_code: "A-1",
        monitored_at: "2026-11-01",
        method: "site_visit",
        findings: "",
      }).findings,
    ).toBeNull();
  });
});
