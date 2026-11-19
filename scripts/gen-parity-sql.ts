// Membuat supabase/tests/scoring_parity.test.sql dari lib/scoring/fixtures.json.
// Jalankan: bun scripts/gen-parity-sql.ts
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type ParityCase = {
  name: string;
  scores: (number | null)[];
  override: boolean;
  expected_total: number | null;
  expected_category: string;
};

const root = join(import.meta.dirname, "..");
export const FIXTURES = join(root, "lib/scoring/fixtures.json");
export const SQL_OUT = join(root, "supabase/tests/scoring_parity.test.sql");

export function buildSql(cases: ParityCase[]): string {
  const lines = cases.map((c) => {
    const arr = `array[${c.scores.map((s) => (s == null ? "null" : s)).join(",")}]::smallint[]`;
    const exp = `${c.expected_total == null ? "null" : c.expected_total.toFixed(1)}/${c.expected_category}`;
    return `select is(
  coalesce(public.compute_score(${arr}, 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(${arr}, 1), ${c.override}, 1)::text, 'unrated'),
  '${exp}',
  'paritas: ${c.name.replace(/'/g, "''")}');`;
  });
  return `-- DIGENERATE oleh scripts/gen-parity-sql.ts dari lib/scoring/fixtures.json. Jangan diedit manual.
begin;
select plan(${cases.length});
${lines.join("\n")}
select * from finish();
rollback;
`;
}

if (process.argv[1] === import.meta.filename) {
  writeFileSync(SQL_OUT, buildSql(JSON.parse(readFileSync(FIXTURES, "utf8"))));
}
