-- Penjaga tulis Fase 6: versi parameter dipaksa untuk non-admin, aset nonaktif ditolak, batas teks.
begin;
select plan(8);

insert into public.allowed_emails (email, role) values ('guard-e@uji.test', 'editor'), ('guard-a@uji.test', 'admin');
insert into public.regions (name) values ('WILAYAH GUARD');
insert into public.assets (asset_code, name, type, region_id, is_active)
select c, 'Aset guard', 'tanah', id, c = 'GUARD-1' from public.regions, (values ('GUARD-1'), ('GUARD-OFF')) v(c)
where name = 'WILAYAH GUARD';
-- Versi lama/tidak aktif (bobot berbeda) untuk uji pemaksaan versi.
insert into public.scoring_params (version, weights, thresholds, intervals, is_active)
values (99, '{"legal":1,"control":0,"physical":0,"utilization":0,"location":0,"strategic":0}',
        '{"critical":80,"high":60,"medium":40}', '{"critical":1,"high":3,"medium":6,"low":12}', false);

set local role authenticated;
set local request.jwt.claims = '{"email":"guard-e@uji.test","sub":"eeeeeeee-0000-0000-0000-000000000001","role":"authenticated"}';
insert into public.assessments (asset_id, assessed_at, params_version, s_legal, s_control, s_physical, s_utilization, s_location, s_strategic)
select id, public.today_wib(), 99, 1, 5, 5, 5, 5, 5 from public.assets where asset_code = 'GUARD-1';
select is((select params_version from public.assessments where asset_id = (select id from public.assets where asset_code = 'GUARD-1')),
  public.active_params_version(), 'editor: params_version dipaksa ke versi aktif');
select isnt((select total_score from public.assessments where asset_id = (select id from public.assets where asset_code = 'GUARD-1')),
  20.0::numeric, 'editor: skor tidak dihitung dengan bobot versi pilihan sendiri');
select throws_ok($$insert into public.assessments (asset_id, assessed_at, s_legal)
  select id, public.today_wib(), 3 from public.assets where asset_code = 'GUARD-OFF'$$,
  '23514', null, 'penilaian aset nonaktif ditolak');
select throws_ok($$insert into public.monitoring_events (asset_id, monitored_at, method)
  select id, public.today_wib(), 'remote' from public.assets where asset_code = 'GUARD-OFF'$$,
  '23514', null, 'monitoring aset nonaktif ditolak');
select lives_ok($$insert into public.monitoring_events (asset_id, monitored_at, method)
  select id, public.today_wib(), 'remote' from public.assets where asset_code = 'GUARD-1'$$,
  'monitoring aset aktif diterima');
select throws_ok($$insert into public.monitoring_events (asset_id, monitored_at, method, findings)
  select id, public.today_wib(), 'remote', repeat('x', 4001) from public.assets where asset_code = 'GUARD-1'$$,
  '23514', null, 'temuan > 4000 karakter ditolak');
select throws_ok($$update public.assets set notes = repeat('x', 4001) where asset_code = 'GUARD-1'$$,
  '23514', null, 'catatan aset > 4000 karakter ditolak');

set local request.jwt.claims = '{"email":"guard-a@uji.test","sub":"aaaaaaaa-0000-0000-0000-000000000009","role":"authenticated"}';
insert into public.assessments (asset_id, assessed_at, params_version, s_legal, s_control, s_physical, s_utilization, s_location, s_strategic)
select id, public.today_wib(), 99, 1, 5, 5, 5, 5, 5 from public.assets where asset_code = 'GUARD-1';
select is((select count(*)::int from public.assessments where params_version = 99), 1, 'admin boleh memilih versi');

select * from finish();
rollback;
