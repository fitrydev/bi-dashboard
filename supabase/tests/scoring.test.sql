-- Logika skor (compute_score, category_for, interval_months, trigger assessments_compute). Versi 1 dari seed.
begin;
select plan(23);

select is(public.compute_score(array[1,2,4,3,3,2]::smallint[], 1), 47.0::numeric(4,1), 'paritas Excel: (1,2,4,3,3,2) = 47,0');
select is(public.category_for(47.0, false, 1), 'medium'::risk_category, '47,0 = medium');
select is(public.category_for(47.0, true, 1), 'critical'::risk_category, 'override memaksa critical');
select is(public.compute_score(array[1,2,null,3,3,2]::smallint[], 1), null, 'skor tak lengkap -> total null');
select is(public.category_for(null, false, 1), null, 'total null -> kategori null (bukan low)');
select is(public.category_for(null, true, 1), 'critical'::risk_category, 'override tetap critical walau total null');

select is(public.category_for(39.9, false, 1), 'low'::risk_category, '39,9 = low');
select is(public.category_for(40, false, 1), 'medium'::risk_category, '40 = medium');
select is(public.category_for(59.9, false, 1), 'medium'::risk_category, '59,9 = medium');
select is(public.category_for(60, false, 1), 'high'::risk_category, '60 = high');
select is(public.category_for(79.9, false, 1), 'high'::risk_category, '79,9 = high');
select is(public.category_for(80, false, 1), 'critical'::risk_category, '80 = critical');

select is(public.interval_months('critical', 1), 1, 'interval critical = 1 bulan');
select is(public.interval_months('high', 1), 3, 'interval high = 3 bulan');
select is(public.interval_months('medium', 1), 6, 'interval medium = 6 bulan');
select is(public.interval_months('low', 1), 12, 'interval low = 12 bulan');

-- Trigger: butuh aset uji sendiri.
insert into public.regions (name) values ('WILAYAH UJI');
insert into public.assets (asset_code, name, type, region_id)
select 'UJI-1', 'Aset uji', 'tanah', id from public.regions where name = 'WILAYAH UJI';

insert into public.assessments (asset_id, assessed_at, params_version, s_legal, s_control, s_physical, s_utilization, s_location, s_strategic)
select id, date '2026-11-19', 1, 1, 2, 4, 3, 3, 2 from public.assets where asset_code = 'UJI-1';
select results_eq(
  $$select total_score, category, is_complete from public.assessments a join public.assets s on s.id = a.asset_id
    where s.asset_code = 'UJI-1' and a.assessed_at = date '2026-11-19'$$,
  $$values (47.0::numeric(4,1), 'medium'::risk_category, true)$$,
  'trigger mengisi total_score/category/is_complete');

insert into public.assessments (asset_id, assessed_at, params_version, s_legal, critical_override, override_reason)
select id, date '2026-11-18', 1, 3, true, 'alasan uji' from public.assets where asset_code = 'UJI-1';
select results_eq(
  $$select total_score, category, is_complete from public.assessments a join public.assets s on s.id = a.asset_id
    where s.asset_code = 'UJI-1' and a.assessed_at = date '2026-11-18'$$,
  $$values (null::numeric(4,1), 'critical'::risk_category, false)$$,
  'penilaian tak lengkap + override: total null, critical, is_complete false');

-- params_version kosong -> memakai versi aktif.
insert into public.assessments (asset_id, assessed_at, params_version, s_legal, s_control, s_physical, s_utilization, s_location, s_strategic)
select id, date '2026-11-17', null, 1, 1, 1, 1, 1, 1 from public.assets where asset_code = 'UJI-1';
select is((select params_version from public.assessments where assessed_at = date '2026-11-17' and asset_id = (select id from public.assets where asset_code = 'UJI-1')),
  public.active_params_version(), 'params_version kosong -> versi aktif');

select throws_ok(
  $$insert into public.assessments (asset_id, assessed_at, params_version, critical_override)
    select id, date '2026-11-16', 1, true from public.assets where asset_code = 'UJI-1'$$,
  '23514', null, 'override tanpa alasan ditolak');
select throws_ok(
  $$insert into public.assessments (asset_id, assessed_at, params_version, s_legal)
    select id, date '2026-11-16', 1, 0 from public.assets where asset_code = 'UJI-1'$$,
  '23514', null, 'skor 0 ditolak');
select throws_ok(
  $$insert into public.assessments (asset_id, assessed_at, params_version, s_legal)
    select id, date '2026-11-16', 1, 6 from public.assets where asset_code = 'UJI-1'$$,
  '23514', null, 'skor 6 ditolak');
select throws_ok(
  $$select public.compute_score(array[1,1,1,1,1,1]::smallint[], 999)$$,
  'P0002', null, 'versi parameter tak dikenal ditolak');

select * from finish();
rollback;
