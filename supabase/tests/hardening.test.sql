-- Fase 9: email auth.users tidak bisa diganti; anon tanpa hak di schema public.
begin;
select plan(4);

insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-0000000000f9', 'tetap@uji.test', 'authenticated', 'authenticated');

select throws_ok(
  $$update auth.users set email = 'admin@uji.test' where id = '00000000-0000-0000-0000-0000000000f9'$$,
  '42501', 'Email akun tidak dapat diubah.', 'ganti email ditolak');
select lives_ok(
  $$update auth.users set raw_user_meta_data = '{"full_name":"Uji"}' where id = '00000000-0000-0000-0000-0000000000f9'$$,
  'kolom lain tetap bisa diubah');

select is_empty(
  $$select table_name from information_schema.role_table_grants
    where grantee = 'anon' and table_schema = 'public'$$,
  'anon tanpa grant tabel/view di public');
select is_empty(
  $$select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')$$,
  'anon tidak bisa execute fungsi public');

select * from finish();
rollback;
