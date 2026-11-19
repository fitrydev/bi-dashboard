// Membangkitkan supabase/seed.sql dari design/data/assets.json (hasil ekstraksi Excel).
// Jalankan: bun scripts/gen-seed.ts  (env SEED_ADMIN_EMAIL = email admin awal)
import { readFileSync, writeFileSync } from "node:fs";

// ponytail: data seed bertipe longgar (skrip generator sekali jalan); ketatkan bila dipakai ulang di app.
/* eslint-disable @typescript-eslint/no-explicit-any */
const d: any = JSON.parse(readFileSync("design/data/assets.json", "utf8"));
const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").trim().toLowerCase();
if (!/^[^\s@']+@[^\s@']+\.[^\s@']+$/.test(email))
  throw new Error(`SEED_ADMIN_EMAIL tidak valid: ${email}`);

// Escape literal SQL: gandakan kutip tunggal; null/undefined -> NULL.
const q = (v: unknown) => (v == null ? "null" : `'${String(v).replaceAll("'", "''")}'`);
const n = (v: unknown) => (v == null ? "null" : String(Number(v)));
const j = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;

const p = d.params;
const methods = Object.fromEntries(
  p.categories.map((c: any) => [
    c.key,
    { label: c.label, frequency: c.frequency, method: c.method, action: c.action },
  ]),
);
const intervals = Object.fromEntries(p.categories.map((c: any) => [c.key, c.interval_months]));
const labels = Object.fromEntries(p.indicators.map((i: any) => [i.key, i.label]));

const out: string[] = [
  "-- DIBANGKITKAN oleh scripts/gen-seed.ts (bun run db:seed-gen). Jangan edit manual.",
  "-- Idempoten: aman dijalankan berulang.",
  "begin;",
  "",
  `insert into public.allowed_emails (email, role) values (${q(email)}, 'admin') on conflict (email) do nothing;`,
  "",
  `insert into public.scoring_params (version, weights, thresholds, intervals, methods, indicator_labels, is_active, notes)
values (${p.version}, ${j(p.weights)}, ${j(p.thresholds)}, ${j(intervals)}, ${j(methods)}, ${j(labels)}, true, 'Parameter awal dari Excel')
on conflict (version) do update set weights = excluded.weights, thresholds = excluded.thresholds,
  intervals = excluded.intervals, methods = excluded.methods, indicator_labels = excluded.indicator_labels;`,
  "",
];

for (const [ind, byScore] of Object.entries(d.criteria as Record<string, Record<string, string>>)) {
  for (const [score, desc] of Object.entries(byScore)) {
    const rev =
      ind === "utilization" && score === "3" && d.criteria_notes?.utilization_3_revised === true;
    out.push(
      `insert into public.score_criteria (params_version, indicator, score, description, revised_from_excel) values (${p.version}, ${q(ind)}, ${score}, ${q(desc)}, ${rev}) on conflict (params_version, indicator, score) do update set description = excluded.description, revised_from_excel = excluded.revised_from_excel;`,
    );
  }
}

const regions = [...new Set<string>(d.assets.map((a: any) => a.region))];
out.push(
  "",
  ...regions.map(
    (r) => `insert into public.regions (name) values (${q(r)}) on conflict (name) do nothing;`,
  ),
);
const aliases: [string, string][] = [
  ["JABAR", "JAWA BARAT"],
  ["DKI", "DKI JAKARTA"],
  ["JAKARTA", "DKI JAKARTA"],
];
for (const r of ["JAWA BARAT", "DKI JAKARTA", "BANTEN"])
  if (!regions.includes(r))
    out.push(`insert into public.regions (name) values (${q(r)}) on conflict (name) do nothing;`);
out.push(
  ...aliases.map(
    ([a, r]) =>
      `insert into public.region_aliases (alias, region_id) select ${q(a)}, id from public.regions where name = ${q(r)} on conflict (alias) do update set region_id = excluded.region_id;`,
  ),
);

// Alias pemanfaatan: label validasi Excel (tanpa review) + varian liar dari data (perlu review).
const ua: [string, string, boolean][] = [
  ["digunakan sendiri", "digunakan_sendiri", false],
  ["disewakan/kerja sama", "disewakan_kerja_sama", false],
  ["idle/kosong", "idle_kosong", false],
  ["digunakan pihak lain", "digunakan_pihak_lain", false],
  ["lainnya", "lainnya", false],
  ["idle", "idle_kosong", false],
  ["produktif", "digunakan_sendiri", true],
];
out.push(
  "",
  ...ua.map(
    ([r, s, f]) =>
      `insert into public.utilization_aliases (raw, status, needs_review) values (${q(r)}, ${q(s)}, ${f}) on conflict (raw) do update set status = excluded.status, needs_review = excluded.needs_review;`,
  ),
);

const types: Record<string, string> = {
  Tanah: "tanah",
  Bangunan: "bangunan",
  Gabungan: "gabungan",
};
out.push("");
for (const a of d.assets) {
  const t = types[a.type];
  if (!t) throw new Error(`Tipe tak dikenal: ${a.type} (${a.code})`);
  const raw = String(a.utilization_raw ?? "")
    .trim()
    .toLowerCase();
  const util = raw
    ? `(select status from public.utilization_aliases where raw = ${q(raw)})`
    : "null";
  const review = raw
    ? `coalesce((select needs_review from public.utilization_aliases where raw = ${q(raw)}), true)`
    : "false";
  out.push(`insert into public.assets (asset_code, name, type, region_id, address, land_area_m2, building_area_m2, book_value, legal_status, right_expiry_date, utilization, utilization_raw, utilization_needs_review, pic_unit, notes, last_monitored_at, is_active)
values (${q(a.code)}, ${q(a.name)}, ${q(t)}, (select id from public.regions where name = ${q(String(a.region).toUpperCase())}), ${q(a.address)}, ${n(a.land_area_m2)}, ${n(a.building_area_m2)}, ${n(a.book_value)}, ${q(a.legal_status)}, ${q(a.right_expiry_date)}, ${util}, ${q(a.utilization_raw)}, ${review}, ${q(a.pic)}, ${q(a.notes)}, ${q(a.last_monitored_at)}, true)
on conflict (asset_code) do update set name = excluded.name, type = excluded.type, region_id = excluded.region_id, address = excluded.address, land_area_m2 = excluded.land_area_m2, building_area_m2 = excluded.building_area_m2, book_value = excluded.book_value, legal_status = excluded.legal_status, right_expiry_date = excluded.right_expiry_date, utilization = excluded.utilization, utilization_raw = excluded.utilization_raw, utilization_needs_review = excluded.utilization_needs_review, pic_unit = excluded.pic_unit, notes = excluded.notes, last_monitored_at = excluded.last_monitored_at;`);
}

out.push("");
for (const s of d.assessments) {
  const sc = s.scores;
  out.push(`insert into public.assessments (asset_id, assessed_at, params_version, s_legal, s_control, s_physical, s_utilization, s_location, s_strategic, critical_override, findings, follow_up, follow_up_pic, target_date)
select a.id, ${q(s.assessed_at)}, ${p.version}, ${n(sc.legal)}, ${n(sc.control)}, ${n(sc.physical)}, ${n(sc.utilization)}, ${n(sc.location)}, ${n(sc.strategic)}, ${s.critical_override === true}, ${q(s.findings)}, ${q(s.follow_up)}, ${q(s.follow_up_pic)}, ${q(s.target_date)}
from public.assets a where a.asset_code = ${q(s.asset_code)}
and not exists (select 1 from public.assessments x where x.asset_id = a.id and x.assessed_at = ${q(s.assessed_at)});`);
}
out.push("", "commit;", "");
writeFileSync("supabase/seed.sql", out.join("\n"));
console.log(`seed.sql: ${d.assets.length} aset, ${d.assessments.length} penilaian`);
