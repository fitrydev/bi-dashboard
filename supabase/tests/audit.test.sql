begin;
select plan(5);

insert into public.allowed_emails (email, role) values ('admin@uji.test', 'admin');
insert into public.regions (name) values ('WILAYAH UJI');
insert into public.assets (asset_code, name, type, region_id)
select 'UJI-1', 'Nama lama', 'tanah', id from public.regions where name = 'WILAYAH UJI';

set local role authenticated;
set local request.jwt.claims = '{"email":"admin@uji.test","sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}';
update public.assets set name = 'Nama baru' where asset_code = 'UJI-1';
select is((select count(*)::int from public.audit_log where table_name = 'assets' and action = 'UPDATE'), 1, 'update aset -> 1 baris audit_log (admin membaca)');
select is((select before->>'name' from public.audit_log where table_name = 'assets' and action = 'UPDATE'), 'Nama lama', 'before berisi nilai lama');
select is((select after->>'name' from public.audit_log where table_name = 'assets' and action = 'UPDATE'), 'Nama baru', 'after berisi nilai baru');
select is((select actor from public.audit_log where table_name = 'assets' and action = 'UPDATE'), '00000000-0000-0000-0000-0000000000a3'::uuid, 'actor = sub JWT');
select throws_ok($$insert into public.audit_log (table_name, row_id, action) values ('x','1','INSERT')$$, '42501', null, 'authenticated tidak bisa menulis audit_log');

select * from finish();
rollback;
