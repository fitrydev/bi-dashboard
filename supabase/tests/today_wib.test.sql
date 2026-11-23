-- "Hari ini" WIB: monitoring & penilaian masa depan ditolak; hari ini WIB diterima.
begin;
select plan(8);

select is(public.today_wib('2026-11-23 17:00:00+00'), date '2026-11-24', '00:00 WIB = tanggal berikutnya dari UTC');
select is(public.today_wib('2026-11-23 16:59:59+00'), date '2026-11-23', '23:59 WIB masih tanggal yang sama');

insert into public.regions (name) values ('WILAYAH WIB');
insert into public.assets (asset_code, name, type, region_id)
select 'WIB-1', 'Aset WIB', 'tanah', id from public.regions where name = 'WILAYAH WIB';

select lives_ok($$insert into public.monitoring_events (asset_id, monitored_at, method)
  select id, public.today_wib(), 'site_visit' from public.assets where asset_code = 'WIB-1'$$,
  'monitoring hari ini (WIB) diterima');
select is((select last_monitored_at from public.assets where asset_code = 'WIB-1'), public.today_wib(),
  'last_monitored_at = hari ini WIB');
select throws_ok($$insert into public.monitoring_events (asset_id, monitored_at, method)
  select id, public.today_wib() + 1, 'site_visit' from public.assets where asset_code = 'WIB-1'$$,
  '22007', null, 'monitoring besok (WIB) ditolak');

select lives_ok($$insert into public.assessments (asset_id, assessed_at, s_legal)
  select id, public.today_wib(), 3 from public.assets where asset_code = 'WIB-1'$$,
  'penilaian hari ini (WIB) diterima');
select throws_ok($$insert into public.assessments (asset_id, assessed_at, s_legal)
  select id, public.today_wib() + 1, 3 from public.assets where asset_code = 'WIB-1'$$,
  '22007', null, 'penilaian besok (WIB) ditolak');
select throws_ok($$update public.assessments set assessed_at = public.today_wib() + 1
  where asset_id = (select id from public.assets where asset_code = 'WIB-1')$$,
  '22007', null, 'ubah tanggal penilaian ke masa depan ditolak');

select * from finish();
rollback;
