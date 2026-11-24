// @vitest-environment node
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { diffRows, type Existing } from "@/lib/import/diff";
import { parseWorkbook, type ParsedWorkbook } from "@/lib/import/parse";
import { validateRows, toPayload, type ValidateCtx } from "@/lib/import/validate";
import { toCsv } from "./csv";
import { buildWorkbook, type ExportRow } from "./workbook";

const ctx: ValidateCtx = {
  regions: ["BANTEN", "DKI JAKARTA", "JAWA BARAT"],
  regionAliases: { JABAR: "JAWA BARAT", DKI: "DKI JAKARTA", JAKARTA: "DKI JAKARTA" },
  utilizationAliases: {
    "digunakan sendiri": { status: "digunakan_sendiri", needs_review: false },
    "disewakan/kerja sama": { status: "disewakan_kerja_sama", needs_review: false },
    "idle/kosong": { status: "idle_kosong", needs_review: false },
    "digunakan pihak lain": { status: "digunakan_pihak_lain", needs_review: false },
    lainnya: { status: "lainnya", needs_review: false },
    idle: { status: "idle_kosong", needs_review: false },
    produktif: { status: "digunakan_sendiri", needs_review: true },
  },
  today: "2026-11-23",
};
const toAB = (b: Uint8Array | ArrayBuffer) =>
  b instanceof Uint8Array ? (b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer) : b;
const ok = (p: ParsedWorkbook) => {
  if (!p.ok) throw new Error(p.error.message);
  return p;
};

/** Simulasi isi DB dari payload impor (apa yang disimpan import_commit). */
function toDb(payload: ReturnType<typeof toPayload>, results: ReturnType<typeof validateRows>) {
  const regionOf = new Map(results.filter((r) => r.kind === "asset").map((r) => [r.asset_code, r.resolved?.region]));
  const db: Existing = { assets: new Map(), assessments: new Map() };
  for (const p of payload) {
    if (p.kind === "asset") db.assets.set(p.data.asset_code, { ...p.data, region: regionOf.get(p.data.asset_code) });
    else db.assessments.set(`${p.data.asset_code}|${p.data.assessed_at}`, { ...p.data });
  }
  return db;
}
/** Existing → baris ekspor (pemanfaatan = raw asli, seperti kolom utilization_raw). */
function toRows(db: Existing): ExportRow[] {
  const latest = new Map<string, Record<string, unknown>>();
  for (const [k, a] of db.assessments) {
    const c = k.split("|")[0];
    if (!latest.has(c) || String(a.assessed_at) > String(latest.get(c)!.assessed_at)) latest.set(c, a);
  }
  return [...db.assets.values()].map((a) => {
    const s = (latest.get(String(a.asset_code)) ?? {}) as Record<string, unknown>;
    return {
      asset_code: a.asset_code, name: a.name, type: a.type, region: a.region, address: a.address ?? null,
      land_area_m2: a.land_area_m2 ?? null, building_area_m2: a.building_area_m2 ?? null,
      book_value: a.book_value ?? null, legal_status: a.legal_status ?? null,
      right_expiry_date: a.right_expiry_date ?? null, utilization: null, utilization_raw: a.utilization ?? null,
      last_monitored_at: a.last_monitored_at ?? null, pic_unit: a.pic_unit ?? null, notes: a.notes ?? null,
      assessed_at: s.assessed_at ?? null, s_legal: s.s_legal ?? null, s_control: s.s_control ?? null,
      s_physical: s.s_physical ?? null, s_utilization: s.s_utilization ?? null, s_location: s.s_location ?? null,
      s_strategic: s.s_strategic ?? null, total_score: s.assessed_at ? 50 : null, category: s.assessed_at ? "medium" : null,
      critical_override: (s.critical_override as boolean) ?? null, override_reason: (s.override_reason as string) ?? null,
      findings: s.findings ?? null, follow_up: s.follow_up ?? null, follow_up_pic: s.follow_up_pic ?? null,
      target_date: s.target_date ?? null,
    } as ExportRow;
  });
}

describe("round-trip export → import", () => {
  const src = ok(parseWorkbook(toAB(readFileSync("source/Template_Matriks_Risiko_Monitoring_Aset_2027.xlsx"))));
  const res0 = validateRows(src, ctx);
  const db = toDb(toPayload(res0), res0);
  const out = buildWorkbook(toRows(db));
  const res1 = validateRows(ok(parseWorkbook(toAB(out))), ctx);
  const diff = diffRows(res1, db);

  it("semua baris 'same' (136 aset + penilaian)", () => {
    expect(res1.filter((r) => r.status === "rejected")).toEqual([]);
    expect(diff.filter((d) => d.kind === "asset")).toHaveLength(136);
    expect(diff.filter((d) => d.kind === "assessment")).toHaveLength(1);
    expect(diff.filter((d) => d.diff !== "same").map((d) => [d.asset_code, d.diff, d.changes])).toEqual([]);
  });

  it("'Produktif' (needs_review) tetap perlu-review setelah ekspor", () => {
    const prod = res1.filter((r) => r.kind === "asset" && r.resolved?.utilization_needs_review);
    expect(prod).toHaveLength(123);
    expect(prod.every((r) => r.issues.some((i) => i.code === "perlu-review"))).toBe(true);
  });

  it("alasan override ≠ catatan dan teks multi-baris kembali 'same'", () => {
    const base = toRows(db).find((r) => r.assessed_at)!;
    const row = { ...base, notes: "a\nb", critical_override: true, override_reason: "sengketa\nbatas", findings: "temuan lain" };
    const res = validateRows(ok(parseWorkbook(toAB(buildWorkbook([row])))), ctx);
    expect(res.filter((r) => r.status === "rejected")).toEqual([]);
    expect(res.find((r) => r.kind === "assessment")!.payload!.data).toMatchObject({
      critical_override: true, override_reason: "sengketa\nbatas", findings: "temuan lain",
    });
    const db2 = toDb(toPayload(res), res);
    const again = validateRows(ok(parseWorkbook(toAB(buildWorkbook(toRows(db2))))), ctx);
    expect(diffRows(again, db2).every((d) => d.diff === "same")).toBe(true);
  });

  it("formula injection: teks berawalan = tetap string, tanpa formula", () => {
    const row = toRows(db)[0];
    const buf = buildWorkbook([{ ...row, name: "=1+1", notes: "@SUM(A1)" }]);
    const wb = XLSX.read(buf, { type: "array", cellFormula: true });
    const ws = wb.Sheets["Master Aset"];
    expect(ws["B5"].t).toBe("s");
    expect(ws["B5"].v).toBe("=1+1");
    expect(ws["B5"].f).toBeUndefined();
    expect(ws["N5"].f).toBeUndefined();
  });
});

describe("template kosong", () => {
  it("terbaca parser dengan 0 baris", () => {
    const p = ok(parseWorkbook(toAB(buildWorkbook([{} as ExportRow], { empty: true }))));
    expect(p.assets).toHaveLength(0);
    expect(p.assessments).toHaveLength(0);
  });
});

describe("toCsv", () => {
  const cols = [{ header: "a", get: (r: unknown[]) => r[0] as string }, { header: "b", get: (r: unknown[]) => r[1] as number }];
  it("BOM, CRLF, header", () => {
    const s = toCsv([["x", 1]], cols);
    expect(s.startsWith("﻿a;b\r\n")).toBe(true);
    expect(s.endsWith("x;1\r\n")).toBe(true);
  });
  it("escape kutip, newline, pemisah", () => {
    expect(toCsv([['a"b', 1], ["c\nd", 2], ["e;f", 3]], cols)).toContain('"a""b";1\r\n"c\nd";2\r\n"e;f";3');
  });
  it("netralisasi formula untuk teks, angka negatif utuh", () => {
    const s = toCsv([["=1+1", -5], ["+1", 2], ["-5", 3], ["@x", 4], ["\tz", 5]], cols);
    expect(s).toContain("'=1+1;-5");
    expect(s).toContain("'+1;2");
    expect(s).toContain("'-5;3");
    expect(s).toContain("'@x;4");
    expect(s).toContain("'\tz;5");
    expect(toCsv([[" =1", 1], ['"=1', 2], ["\nx", 3]], cols)).toContain(`' =1;1\r\n"'""=1";2\r\n"'\nx";3`);
  });
});
