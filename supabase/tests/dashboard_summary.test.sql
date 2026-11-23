-- dashboard_summary (Fase 5). Bergantung pada supabase/seed.sql. Hak berakhir dihitung relatif current_date.
begin;
select plan(20);

insert into public.allowed_emails (email, role) values ('viewer@uji.test', 'viewer');

set local role authenticated;
set local request.jwt.claims = '{"email":"viewer@uji.test","sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
create temp table d as select public.dashboard_summary('{}'::jsonb) as j;

-- D8: jumlah aset aktif riil, bukan 200 baris template.
select is((select (j->'totals'->>'assets')::int from d), (select count(*)::int from public.assets where is_active), 'totals.assets = aset aktif');
select is((select (j->'totals'->>'assets')::int from d), 136, 'totals.assets = 136');
select is((select round((j->'totals'->>'book_value')::numeric / 1e9, 2) from d), 143.86, 'book_value Rp143,86 M (tanpa placeholder)');
select is((select (j->'totals'->>'value_placeholder_count')::int from d), 44, '44 nilai placeholder');
select is((select (j->'totals'->>'area_placeholder_count')::int from d), 39, '39 luas placeholder');
select is((select (u->>'count')::int from d, jsonb_array_elements(j->'utilization') u where u->>'status' = 'idle_kosong'), 13, '13 idle/kosong');
select is((select round((u->>'value')::numeric / 1e9, 1) from d, jsonb_array_elements(j->'utilization') u where u->>'status' = 'idle_kosong'), 42.4, 'nilai idle Rp42,4 M');
select is((select (j->'risk_findings'->>'right_expired')::int from d), 3, '3 hak kedaluwarsa');
select is((select (j->'risk_findings'->>'right_expiring_12m')::int from d), 1, '1 hak berakhir < 12 bulan');
select is((select (j->'totals'->>'assessed')::int from d), 1, 'D8: assessed = penilaian terbaru riil (1)');
select results_eq(
  $$select r->>'asset_code', (r->>'total_score')::numeric, r->>'category' from d, jsonb_array_elements(j->'matrix'->'rows') r$$,
  $$values ('251116', 47.0::numeric, 'medium')$$,
  'matrix: 251116 skor 47,0 medium');

-- Key baru v2
select is((select (j->>'periods')::int from d), 1, 'periods = 1');
select is((select jsonb_array_length(j->'trend') from d), 1, 'trend 1 titik');
select is((select j->'trend'->0 from d), '{"period":"2026-11","avg_score":47.0,"critical":0,"high":0,"assessed":1}'::jsonb, 'trend 2026-11');
select is((select sum((t->>'idle_count')::int)::int from d, jsonb_array_elements(j->'by_type') t), 13, 'by_type idle_count total 13');
select is((select round(sum((t->>'idle_value')::numeric) / 1e9, 1) from d, jsonb_array_elements(j->'by_type') t), 42.4, 'by_type idle_value total Rp42,4 M');
select is((select round(sum((r->>'tanah_value')::numeric + (r->>'bangunan_value')::numeric + (r->>'gabungan_value')::numeric) / 1e9, 2) from d, jsonb_array_elements(j->'by_region') r), 143.86, 'by_region nilai per jenis = total');
select ok((select (j->'active_weights'->>'legal')::numeric = 0.2 from d), 'active_weights dari versi aktif');

-- Filter wilayah mengubah totals.
select is(
  (select (public.dashboard_summary('{"region":"DKI JAKARTA"}')->'totals'->>'assets')::int),
  (select count(*)::int from public.assets a join public.regions r on r.id = a.region_id where a.is_active and r.name = 'DKI JAKARTA'),
  'filter region: totals.assets hanya DKI JAKARTA');

reset role;
select ok(not has_function_privilege('anon', 'public.dashboard_summary(jsonb)', 'execute'), 'anon tidak bisa execute');

select * from finish();
rollback;
