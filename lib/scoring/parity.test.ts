import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildSql, FIXTURES, SQL_OUT, type ParityCase } from "../../scripts/gen-parity-sql";
import { categoryFor, computeScore } from "./index";

const KEYS = ["legal", "control", "physical", "utilization", "location", "strategic"] as const;
const cases: ParityCase[] = JSON.parse(readFileSync(FIXTURES, "utf8"));

describe("paritas TS vs fixture (sama dengan yang diuji pgTAP)", () => {
  it.each(cases)("$name", (c) => {
    const total = computeScore(Object.fromEntries(KEYS.map((k, i) => [k, c.scores[i]])));
    expect(total).toBe(c.expected_total);
    expect(categoryFor(total, c.override)).toBe(c.expected_category);
  });

  it("supabase/tests/scoring_parity.test.sql mutakhir (jalankan: bun scripts/gen-parity-sql.ts)", () => {
    expect(readFileSync(SQL_OUT, "utf8")).toBe(buildSql(cases));
  });
});
