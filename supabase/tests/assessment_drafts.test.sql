-- Draf penilaian: hanya pemilik (editor+) yang bisa membaca/menulis; user_id tidak bisa dipalsukan.
begin;
select plan(13);

insert into public.allowed_emails (email, role) values
  ('draf-a@uji.test', 'editor'), ('draf-b@uji.test', 'editor'), ('draf-v@uji.test', 'viewer');
insert into public.regions (name) values ('WILAYAH DRAF');
insert into public.assets (asset_code, name, type, region_id)
select 'DRAF-1', 'Aset draf', 'tanah', id from public.regions where name = 'WILAYAH DRAF';

select ok(not has_table_privilege('anon', 'public.assessment_drafts', 'select,insert,update,delete'),
  'anon tanpa hak di assessment_drafts');

set local role authenticated;
-- Pemilik A
set local request.jwt.claims = '{"email":"draf-a@uji.test","sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';
insert into public.assessment_drafts (asset_id, user_id, data)
select id, 'bbbbbbbb-0000-0000-0000-000000000002', '{"s_legal":4}' from public.assets where asset_code = 'DRAF-1';
select is((select user_id::text from public.assessment_drafts), 'aaaaaaaa-0000-0000-0000-000000000001',
  'user_id palsu ditimpa auth.uid()');
select is((select count(*)::int from public.assessment_drafts), 1, 'pemilik melihat drafnya');
insert into public.assessment_drafts (asset_id, data)
select id, '{"s_legal":5}' from public.assets where asset_code = 'DRAF-1'
on conflict (asset_id, user_id) do update set data = excluded.data;
select is((select data->>'s_legal' from public.assessment_drafts), '5', 'upsert pemilik memperbarui draf');
update public.assessment_drafts set user_id = 'bbbbbbbb-0000-0000-0000-000000000002';
select is((select user_id::text from public.assessment_drafts), 'aaaaaaaa-0000-0000-0000-000000000001',
  'user_id tidak bisa dipindah lewat update');
select throws_ok($$insert into public.assessment_drafts (asset_id, data) select id, '[1]' from public.assets where asset_code = 'DRAF-1'$$,
  '23514', null, 'data bukan objek ditolak');

-- Editor lain B
set local request.jwt.claims = '{"email":"draf-b@uji.test","sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}';
select is((select count(*)::int from public.assessment_drafts), 0, 'editor lain tidak melihat draf A');
do $$ declare n int; begin update public.assessment_drafts set data = '{}'; get diagnostics n = row_count; perform set_config('t.n', n::text, true); end $$;
select is(current_setting('t.n')::int, 0, 'editor lain: update 0 baris');
do $$ declare n int; begin delete from public.assessment_drafts; get diagnostics n = row_count; perform set_config('t.n', n::text, true); end $$;
select is(current_setting('t.n')::int, 0, 'editor lain: delete 0 baris');
select lives_ok($$insert into public.assessment_drafts (asset_id, data) select id, '{}' from public.assets where asset_code = 'DRAF-1'$$,
  'editor lain punya draf sendiri untuk aset yang sama');

-- Viewer
set local request.jwt.claims = '{"email":"draf-v@uji.test","sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated"}';
select is((select count(*)::int from public.assessment_drafts), 0, 'viewer tidak melihat draf');
select throws_ok($$insert into public.assessment_drafts (asset_id, data) select id, '{}' from public.assets where asset_code = 'DRAF-1'$$,
  '42501', null, 'viewer: insert draf ditolak');

-- Pemilik A menghapus drafnya
set local request.jwt.claims = '{"email":"draf-a@uji.test","sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';
do $$ declare n int; begin delete from public.assessment_drafts; get diagnostics n = row_count; perform set_config('t.n', n::text, true); end $$;
select is(current_setting('t.n')::int, 1, 'pemilik: delete hanya drafnya sendiri (1 baris)');

select * from finish();
rollback;
