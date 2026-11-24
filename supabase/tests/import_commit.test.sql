-- import_commit (Fase 7): upsert aset per kode, penilaian per (aset, tanggal), alias, error per baris,
-- idempotensi, kepemilikan batch, status batch, hak akses.
begin;
select plan(32);

insert into public.allowed_emails (email, role) values
  ('imp-e1@uji.test', 'editor'), ('imp-e2@uji.test', 'editor'),
  ('imp-v@uji.test', 'viewer'), ('imp-a@uji.test', 'admin');
insert into public.assets (asset_code, name, type, region_id, is_active)
select 'IMP-OFF', 'Aset nonaktif', 'tanah', id, false from public.regions where name = 'BANTEN';

select ok(not has_function_privilege('anon', 'public.import_commit(uuid, jsonb)', 'execute'), 'anon tidak punya execute');
select ok(has_function_privilege('authenticated', 'public.import_commit(uuid, jsonb)', 'execute'), 'authenticated punya execute');

-- ===== Editor 1 =====
set local role authenticated;
set local request.jwt.claims = '{"email":"imp-e1@uji.test","sub":"e1e1e1e1-0000-0000-0000-000000000001","role":"authenticated"}';
insert into public.import_batches (file_name, status, report) values
  ('b1', 'validated', '{"validasi":true}'), ('b2', 'validated', '{}'), ('b3', 'validated', '{}'),
  ('b4', 'validated', '{}'), ('b-up', 'uploaded', '{}'), ('b-lain', 'validated', '{}'), ('b-bentuk', 'validated', '{}');

-- Batch 1: penilaian diletakkan sebelum asetnya (harus tetap bisa merujuk aset baru).
select lives_ok($$select public.import_commit((select id from public.import_batches where file_name = 'b1'), jsonb_build_array(
  jsonb_build_object('kind', 'assessment', 'row', 10, 'data', jsonb_build_object('asset_code', 'IMP-1',
    'assessed_at', public.today_wib()::text, 's_legal', 3, 's_control', 4, 'findings', 'awal')),
  jsonb_build_object('kind', 'assessment', 'row', 11, 'data', jsonb_build_object('asset_code', 'IMP-1',
    'assessed_at', (public.today_wib() + 1)::text, 's_legal', 3)),
  jsonb_build_object('kind', 'asset', 'row', 2, 'data', jsonb_build_object('asset_code', 'IMP-1', 'name', 'Aset Impor',
    'type', 'Tanah', 'region', ' jabar ', 'utilization', 'Produktif', 'notes', 'catatan', 'book_value', 1000)),
  jsonb_build_object('kind', 'asset', 'row', 3, 'data', jsonb_build_object('asset_code', 'IMP-2', 'name', 'X',
    'type', 'tanah', 'region', 'ANTAH BERANTAH')),
  jsonb_build_object('kind', 'asset', 'row', 4, 'data', jsonb_build_object('asset_code', 'IMP-3', 'name', repeat('x', 301),
    'type', 'tanah', 'region', 'DKI JAKARTA')),
  jsonb_build_object('kind', 'asset', 'row', 5, 'data', jsonb_build_object('asset_code', 'IMP-4', 'name', 'Tanpa wilayah')),
  jsonb_build_object('kind', 'asset', 'row', 6, 'data', jsonb_build_object('asset_code', 'IMP-OFF', 'notes', 'x'))
))$$, 'batch 1 di-commit walau ada baris error');

create temp view r1 as
  select e from public.import_batches b, jsonb_array_elements(b.report->'commit'->'rows') e where b.file_name = 'b1';
select is((select report->'commit'->>'inserted' from public.import_batches where file_name = 'b1'), '2', 'b1: 2 baris masuk (aset + penilaian)');
select is((select report->'commit'->>'errors' from public.import_batches where file_name = 'b1'), '5', 'b1: 5 baris error');
select is((select r.name || '|' || a.type from public.assets a join public.regions r on r.id = a.region_id where a.asset_code = 'IMP-1'),
  'JAWA BARAT|tanah', 'alias wilayah JABAR (trim, case-insensitive) & jenis case-insensitive');
select is((select utilization::text || '|' || utilization_needs_review || '|' || utilization_raw from public.assets where asset_code = 'IMP-1'),
  'digunakan_sendiri|true|Produktif', 'produktif → digunakan_sendiri + needs_review');
select ok(not exists (select 1 from public.assets where asset_code in ('IMP-2', 'IMP-3', 'IMP-4')), 'baris aset error tidak masuk');
select alike((select e->>'message' from r1 where e->>'row' = '3'), 'Wilayah "ANTAH BERANTAH" tidak dikenal%', 'wilayah tak dikenal = error baris');
select is((select e->>'message' from r1 where e->>'row' = '4'), 'Teks melebihi batas panjang yang diizinkan.', 'teks terlalu panjang = error baris');
select alike((select e->>'message' from r1 where e->>'row' = '5'), 'Aset baru wajib%', 'aset baru tanpa wilayah = error baris');
select is((select e->>'message' from r1 where e->>'row' = '6'), 'Aset nonaktif; pulihkan dulu.', 'aset nonaktif tidak diaktifkan ulang');
select alike((select e->>'message' from r1 where e->>'row' = '11'), 'Tanggal penilaian tidak boleh di masa depan%', 'tanggal masa depan = error baris');
select is((select count(*)::int from public.assessments s join public.assets a on a.id = s.asset_id where a.asset_code = 'IMP-1'),
  1, 'penilaian aset baru di batch yang sama masuk');
select is((select status || '|' || (committed_at is not null) || '|' || rows_ok || '|' || rows_error || '|' || (report ? 'validasi')
  from public.import_batches where file_name = 'b1'), 'committed|true|2|5|true', 'batch: status, committed_at, hitungan, report lama dipertahankan');
select throws_ok($$select public.import_commit((select id from public.import_batches where file_name = 'b1'), '[]')$$,
  '22023', null, 'commit ulang batch yang sama ditolak');

-- Batch 2: baris valid yang sama → idempoten.
reset role;
create temp table snap as select (select count(*) from public.audit_log) au, (select count(*) from public.assets) ast,
  (select count(*) from public.assessments) ass;
set local role authenticated;
select is(public.import_commit((select id from public.import_batches where file_name = 'b2'), jsonb_build_array(
  jsonb_build_object('kind', 'asset', 'row', 2, 'data', jsonb_build_object('asset_code', 'IMP-1', 'name', 'Aset Impor',
    'type', 'Tanah', 'region', 'JABAR', 'utilization', 'Produktif', 'notes', 'catatan', 'book_value', 1000)),
  jsonb_build_object('kind', 'assessment', 'row', 10, 'data', jsonb_build_object('asset_code', 'IMP-1',
    'assessed_at', public.today_wib()::text, 's_legal', 3, 's_control', 4, 'findings', 'awal'))
)) - 'batch_id' - 'rows', '{"inserted":0,"updated":0,"unchanged":2,"errors":0}'::jsonb, 'impor ulang: semua unchanged');
reset role;
select is((select (select count(*) from public.audit_log) - au from snap), 0::bigint, 'impor ulang: audit_log tidak bertambah');
select is((select (select count(*) from public.assets) - ast + (select count(*) from public.assessments) - ass from snap),
  0::bigint, 'impor ulang: aset & penilaian tidak bertambah');
set local role authenticated;

-- Batch 3: upsert hanya kolom terisi; pemanfaatan 'idle' & nilai enum langsung.
select is(public.import_commit((select id from public.import_batches where file_name = 'b3'), jsonb_build_array(
  jsonb_build_object('kind', 'asset', 'row', 2, 'data', jsonb_build_object('asset_code', 'IMP-1', 'utilization', 'idle'))
))->'rows'->0->>'action', 'updated', 'upsert sebagian: updated');
select is((select notes || '|' || book_value || '|' || name from public.assets where asset_code = 'IMP-1'),
  'catatan|1000.00|Aset Impor', 'kunci absen tidak menghapus nilai');
select is((select utilization::text || '|' || utilization_needs_review from public.assets where asset_code = 'IMP-1'),
  'idle_kosong|false', 'idle → idle_kosong, needs_review dibersihkan');

-- Batch 4 (editor): penilaian (aset, tanggal) sama tapi berbeda → editor tidak boleh koreksi (RLS admin).
select alike(public.import_commit((select id from public.import_batches where file_name = 'b4'), jsonb_build_array(
  jsonb_build_object('kind', 'assessment', 'row', 10, 'data', jsonb_build_object('asset_code', 'IMP-1',
    'assessed_at', public.today_wib()::text, 's_legal', 5))
))->'rows'->0->>'message', '%hanya dapat dilakukan admin%', 'editor: koreksi penilaian lama = error baris');

select throws_ok($$select public.import_commit((select id from public.import_batches where file_name = 'b-up'), '[]')$$,
  '22023', null, 'batch berstatus uploaded ditolak');
select throws_ok($$select public.import_commit((select id from public.import_batches where file_name = 'b-bentuk'), '{}')$$,
  '22023', null, 'rows bukan array ditolak');
select throws_ok($$select public.import_commit((select id from public.import_batches where file_name = 'b-bentuk'),
  '[{"kind":"lain","row":1,"data":{"asset_code":"A"}}]')$$, '22023', null, 'kind tidak dikenal ditolak');
select throws_ok($$select public.import_commit((select id from public.import_batches where file_name = 'b-bentuk'),
  '[{"kind":"asset","row":1,"data":{"asset_code":"  "}}]')$$, '22023', null, 'asset_code kosong ditolak');

-- ===== Editor 2: batch milik orang lain =====
set local request.jwt.claims = '{"email":"imp-e2@uji.test","sub":"e2e2e2e2-0000-0000-0000-000000000002","role":"authenticated"}';
select throws_ok($$select public.import_commit((select id from public.import_batches where file_name = 'b-lain'), '[]')$$,
  '42501', 'Batch impor ini bukan milik Anda.', 'editor lain tidak bisa commit batch milik user lain');

-- ===== Viewer =====
set local request.jwt.claims = '{"email":"imp-v@uji.test","sub":"dddddddd-0000-0000-0000-000000000003","role":"authenticated"}';
select throws_ok($$select public.import_commit((select id from public.import_batches where file_name = 'b-lain'), '[]')$$,
  '42501', null, 'viewer ditolak');

-- ===== Admin: koreksi penilaian (aset, tanggal) sama =====
set local request.jwt.claims = '{"email":"imp-a@uji.test","sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into public.import_batches (file_name, status) values ('b-admin', 'validated');
select is(public.import_commit((select id from public.import_batches where file_name = 'b-admin'), jsonb_build_array(
  jsonb_build_object('kind', 'assessment', 'row', 10, 'data', jsonb_build_object('asset_code', 'IMP-1',
    'assessed_at', public.today_wib()::text, 's_legal', 5))
))->>'updated', '1', 'admin: penilaian (aset, tanggal) sama diperbarui');
select is((select count(*)::int || '|' || max(s_legal) || '|' || max(s_control) || '|' || max(findings)
  from public.assessments s join public.assets a on a.id = s.asset_id where a.asset_code = 'IMP-1'),
  '1|5|4|awal', 'update penilaian: tidak menambah baris, kunci absen dipertahankan');
select ok(exists (select 1 from public.audit_log l join public.assessments s on l.row_id = s.id::text
  join public.assets a on a.id = s.asset_id where a.asset_code = 'IMP-1' and l.action = 'UPDATE'), 'update penilaian tercatat di audit_log');

select * from finish();
rollback;
