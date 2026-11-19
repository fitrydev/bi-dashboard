-- Kolom aktor dipaksa dari auth.uid(); bobot negatif ditolak.
begin;
select plan(3);

insert into public.allowed_emails (email, role) values ('ed-aktor@example.com', 'editor');
set local role authenticated;
set local request.jwt.claims = '{"email":"ed-aktor@example.com","sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

insert into public.import_batches (file_path, uploaded_by)
values ('x.xlsx', '22222222-2222-2222-2222-222222222222');
select is((select uploaded_by::text from public.import_batches where file_path = 'x.xlsx'),
  '11111111-1111-1111-1111-111111111111', 'uploaded_by palsu ditimpa auth.uid()');

update public.import_batches set uploaded_by = '22222222-2222-2222-2222-222222222222' where file_path = 'x.xlsx';
select is((select uploaded_by::text from public.import_batches where file_path = 'x.xlsx'),
  '11111111-1111-1111-1111-111111111111', 'uploaded_by tidak bisa diubah lewat update');

reset role;
select throws_ok($$
  insert into public.scoring_params (version, weights, thresholds, intervals, methods, indicator_labels, is_active)
  select 99, '{"legal":-0.1,"control":0.35,"physical":0.15,"utilization":0.15,"location":0.3,"strategic":0.15}'::jsonb,
         thresholds, intervals, methods, indicator_labels, false from public.scoring_params where version = 1
$$, '23514', null, 'bobot negatif ditolak');

select * from finish();
rollback;
