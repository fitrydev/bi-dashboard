-- RLS + hak akses. Peran disimulasikan lewat set local role + request.jwt.claims.
begin;
select plan(20);

insert into public.allowed_emails (email, role) values
  ('viewer@uji.test', 'viewer'), ('editor@uji.test', 'editor'), ('admin@uji.test', 'admin');
insert into public.regions (name) values ('WILAYAH UJI');
insert into public.assets (asset_code, name, type, region_id)
select 'UJI-1', 'Aset uji', 'tanah', id from public.regions where name = 'WILAYAH UJI';
create temp table n_assets as select count(*)::int as n from public.assets;
grant select on n_assets to anon, authenticated;

-- Struktur
select is_empty(
  $$select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity$$,
  'semua tabel public relrowsecurity = true');
select is_empty(
  $$select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','v')
      and has_table_privilege('anon', c.oid, 'select,insert,update,delete')$$,
  'anon tanpa hak apa pun di tabel/view public');
select is_empty(
  $$select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')$$,
  'anon tanpa hak execute di fungsi public');

-- Anon
set local role anon;
select throws_ok($$select 1 from public.assets$$, '42501', null, 'anon: select assets ditolak');
select throws_ok($$insert into public.regions (name) values ('X')$$, '42501', null, 'anon: insert ditolak');

-- Authenticated, bukan allowlist
set local role authenticated;
set local request.jwt.claims = '{"email":"orang@luar.test","sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}';
select is((select count(*)::int from public.assets), 0, 'non-allowlist: 0 baris assets');
select is((select count(*)::int from public.assessments), 0, 'non-allowlist: 0 baris assessments');
select throws_ok($$insert into public.regions (name) values ('X')$$, '42501', null, 'non-allowlist: insert ditolak');
select is(public.current_app_role(), null, 'non-allowlist: current_app_role null');

-- Viewer
set local request.jwt.claims = '{"email":"Viewer@Uji.test","sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is((select count(*)::int from public.assets), (select n from n_assets), 'viewer: melihat semua aset (email case-insensitive)');
select is(public.current_app_role(), 'viewer'::app_role, 'viewer: current_app_role');
select throws_ok(
  $$insert into public.assets (asset_code, name, type, region_id) select 'UJI-2', 'x', 'tanah', id from public.regions limit 1$$,
  '42501', null, 'viewer: insert aset ditolak');

-- Editor
set local request.jwt.claims = '{"email":"editor@uji.test","sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select lives_ok(
  $$insert into public.assessments (asset_id, assessed_at, s_legal, s_control, s_physical, s_utilization, s_location, s_strategic)
    select id, date '2026-11-19', 3,3,3,3,3,3 from public.assets where asset_code = 'UJI-1'$$,
  'editor: insert assessment diizinkan');
do $$ declare n int; begin update public.assessments set findings = 'x' where asset_id = (select id from public.assets where asset_code = 'UJI-1'); get diagnostics n = row_count; perform set_config('t.n', n::text, true); end $$;
select is(current_setting('t.n')::int, 0, 'editor: update assessment 0 baris');
do $$ declare n int; begin delete from public.assessments; get diagnostics n = row_count; perform set_config('t.n', n::text, true); end $$;
select is(current_setting('t.n')::int, 0, 'editor: delete assessment 0 baris');
select is((select count(*)::int from public.audit_log), 0, 'editor: tidak bisa membaca audit_log');

-- Admin
set local request.jwt.claims = '{"email":"admin@uji.test","sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}';
do $$ declare n int; begin update public.assessments set findings = 'x' where asset_id = (select id from public.assets where asset_code = 'UJI-1'); get diagnostics n = row_count; perform set_config('t.n', n::text, true); end $$;
select is(current_setting('t.n')::int, 1, 'admin: update assessment berhasil');
select ok((select count(*) from public.audit_log) > 0, 'admin: bisa membaca audit_log');

-- Cabut akses: hapus dari allowlist sebagai postgres, klaim sama -> akses hilang
reset role;
delete from public.allowed_emails where email = 'admin@uji.test';
set local role authenticated;
set local request.jwt.claims = '{"email":"admin@uji.test","sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}';
select is((select count(*)::int from public.assets), 0, 'admin dicabut dari allowlist: akses langsung hilang');
select throws_ok($$insert into public.regions (name) values ('Y')$$, '42501', null, 'admin dicabut: insert ditolak');

select * from finish();
rollback;
