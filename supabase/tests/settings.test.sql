-- Fase 8 · Pengaturan: allowlist, versi parameter (draf/kunci/aktivasi), preview dampak, recalc,
-- alias, koreksi massal "perlu review". Peran lewat set local role + request.jwt.claims.
begin;
select plan(88);

insert into public.allowed_emails (email, role) values
  ('set-a@uji.test', 'admin'), ('set-a2@uji.test', 'admin'),
  ('set-e@uji.test', 'editor'), ('set-v@uji.test', 'viewer');
insert into public.regions (name) values ('WILAYAH SET');
insert into public.assets (asset_code, name, type, region_id, utilization, utilization_raw, utilization_needs_review)
select c, 'Aset ' || c, 'tanah', id, 'digunakan_sendiri', 'Produktif', c <> 'SET-3'
from public.regions, (values ('SET-1'), ('SET-2'), ('SET-3')) v(c) where name = 'WILAYAH SET';
-- SET-1: dua penilaian (lama & terakhir) di versi 1 → skor 36,0 low.
insert into public.assessments (asset_id, assessed_at, params_version, s_legal, s_control, s_physical, s_utilization, s_location, s_strategic)
select id, d, 1, 5, 1, 1, 1, 1, 1 from public.assets, (values (date '2026-01-10'), (date '2026-06-10')) v(d) where asset_code = 'SET-1';
create temp table ids as select asset_code, id from public.assets where asset_code like 'SET-%';
grant select on ids to authenticated;

select ok(not has_function_privilege('anon', 'public.preview_params_impact(integer)', 'execute'), 'anon tanpa execute preview');
select ok(has_function_privilege('authenticated', 'public.resolve_utilization_review(uuid[], public.utilization_status)', 'execute'),
  'authenticated punya execute koreksi massal');
select ok(not has_function_privilege('authenticated', 'public.scoring_params_guard()', 'execute'), 'fungsi trigger tidak bisa dipanggil klien');

-- ===== Non-admin =====
set local role authenticated;
set local request.jwt.claims = '{"email":"set-e@uji.test","sub":"eeeeeeee-0000-0000-0000-000000000008","role":"authenticated"}';
select throws_ok($$select public.create_params_draft()$$, '42501', null, 'editor: create_params_draft ditolak');
select throws_ok($$select public.activate_params_version(1)$$, '42501', null, 'editor: activate ditolak');
select throws_ok($$select public.preview_params_impact(1)$$, '42501', null, 'editor: preview ditolak');
select throws_ok($$select public.resolve_utilization_review(array[gen_random_uuid()])$$, '42501', null, 'editor: koreksi massal ditolak');
select throws_ok($$select public.recalculate_with_active_params(true)$$, '42501', null, 'editor: recalc ditolak');
select throws_ok($$select public.save_params_draft(1, '{"notes":"x"}', null)$$, '42501', null, 'editor: save_params_draft ditolak');
select throws_ok($$insert into public.allowed_emails (email, role) values ('x@uji.test', 'admin')$$, '42501', null, 'editor: tambah email ditolak');
select throws_ok($$insert into public.region_aliases (alias, region_id) select 'X', id from public.regions limit 1$$, '42501', null,
  'editor: tambah alias ditolak');
-- Versi 999 (tidak terkunci) agar yang menolak adalah RLS, bukan trigger kunci.
select throws_ok($$insert into public.score_criteria (params_version, indicator, score, description) values (999, 'legal', 1, 'x')$$,
  '42501', null, 'editor: tulis rubrik ditolak');
select throws_ok($$insert into public.scoring_params (version, weights, thresholds, intervals)
  select 50, weights, thresholds, intervals from public.scoring_params where version = 1$$, '42501', null, 'editor: insert versi ditolak');
do $$ declare n int; begin
  update public.allowed_emails set role = 'admin' where email = 'set-e@uji.test'; get diagnostics n = row_count;
  perform set_config('t.n', n::text, true); end $$;
select is(current_setting('t.n')::int, 0, 'editor: tidak bisa menaikkan role sendiri (0 baris)');
do $$ declare n int; begin
  update public.scoring_params set notes = 'x'; get diagnostics n = row_count;
  perform set_config('t.n', n::text, true); end $$;
select is(current_setting('t.n')::int, 0, 'editor: update scoring_params 0 baris');
do $$ declare n int; begin
  delete from public.utilization_aliases; get diagnostics n = row_count;
  perform set_config('t.n', n::text, true); end $$;
select is(current_setting('t.n')::int, 0, 'editor: hapus alias 0 baris');

set local request.jwt.claims = '{"email":"set-v@uji.test","sub":"eeeeeeee-0000-0000-0000-000000000009","role":"authenticated"}';
select throws_ok($$select public.create_params_draft()$$, '42501', null, 'viewer: create_params_draft ditolak');
select throws_ok($$select public.activate_params_version(1)$$, '42501', null, 'viewer: activate ditolak');
select throws_ok($$select public.preview_params_impact(1)$$, '42501', null, 'viewer: preview ditolak');
select throws_ok($$select public.resolve_utilization_review(array[gen_random_uuid()], 'idle_kosong')$$, '42501', null,
  'viewer: koreksi massal ditolak');
select throws_ok($$insert into public.utilization_aliases (raw, status) values ('x', 'lainnya')$$, '42501', null, 'viewer: tambah alias ditolak');

-- ===== Admin: allowlist =====
set local request.jwt.claims = '{"email":"Set-A@uji.test","sub":"aaaaaaaa-0000-0000-0000-000000000008","role":"authenticated"}';
select lives_ok($$insert into public.allowed_emails (email, role) values ('  Baru@Uji.TEST ', 'viewer')$$, 'admin: tambah email');
select is((select role::text from public.allowed_emails where email = 'baru@uji.test'), 'viewer', 'email dinormalisasi lowercase/trim');
select throws_ok($$update public.allowed_emails set role = 'editor' where email = 'set-a@uji.test'$$, '42501',
  'Anda tidak dapat mencabut atau menurunkan akses Anda sendiri.', 'admin: tidak bisa menurunkan diri sendiri');
select throws_ok($$delete from public.allowed_emails where email = 'set-a@uji.test'$$, '42501', null, 'admin: tidak bisa mencabut diri sendiri');
select throws_ok($$update public.allowed_emails set email = 'lain@uji.test' where email = 'baru@uji.test'$$, '22023', null,
  'email tidak dapat diubah');
select lives_ok($$update public.allowed_emails set role = 'editor' where email = 'baru@uji.test'$$, 'admin: ubah role user lain');
select lives_ok($$delete from public.allowed_emails where email = 'baru@uji.test'$$, 'admin: cabut user lain');
select ok(exists (select 1 from public.audit_log where table_name = 'allowed_emails' and row_id = 'baru@uji.test' and action = 'DELETE'),
  'pencabutan tercatat di audit_log');
select lives_ok($$update public.allowed_emails set role = 'editor' where email = 'set-a2@uji.test'$$, 'admin: turunkan admin lain (masih ada admin)');

-- Admin terakhir: jalur postgres/service_role (tanpa aturan "diri sendiri").
reset role;
delete from public.allowed_emails where role = 'admin' and email <> 'set-a@uji.test';
select throws_ok($$delete from public.allowed_emails where email = 'set-a@uji.test'$$, '23514',
  'Harus tersisa minimal satu admin.', 'admin terakhir tidak bisa dicabut');
select throws_ok($$update public.allowed_emails set role = 'viewer' where email = 'set-a@uji.test'$$, '23514', null,
  'admin terakhir tidak bisa diturunkan');

-- ===== Admin: versi parameter =====
set local role authenticated;
select throws_ok($$insert into public.scoring_params (version, weights, thresholds, intervals, is_active)
  select 50, weights, thresholds, intervals, true from public.scoring_params where version = 1$$, '22023', null,
  'admin: insert versi langsung aktif ditolak');
select is(public.create_params_draft('Uji'), 2, 'draf baru = versi max+1');
select is((select count(*)::int from public.score_criteria where params_version = 2), 30, 'rubrik tersalin 30');
select ok(not public.scoring_params_is_locked(2) and public.scoring_params_is_locked(1), 'draf tidak terkunci; versi aktif terkunci');
select throws_ok($$update public.scoring_params set weights = weights || '{"legal":0.3}' where version = 2$$, '23514',
  'Total bobot harus 100% (saat ini 110.00%).', 'bobot Σ≠1 ditolak dengan pesan ramah');
select throws_ok($$update public.scoring_params set thresholds = '{"critical":60,"high":60,"medium":40}' where version = 2$$,
  '23514', null, 'ambang tidak monoton ditolak');
select throws_ok($$update public.scoring_params set intervals = '{"critical":0,"high":3,"medium":6,"low":12}' where version = 2$$,
  '23514', null, 'interval 0 ditolak');
-- Bobot legal 1 → SET-1 (legal 5) = 100 critical; seed 251116 (legal 1) = 20 low.
select lives_ok($$update public.scoring_params
  set weights = '{"legal":1,"control":0,"physical":0,"utilization":0,"location":0,"strategic":0}' where version = 2$$,
  'draf: ubah bobot');
select lives_ok($$update public.score_criteria set description = ' Rubrik baru ' where params_version = 2 and indicator = 'legal' and score = 1$$,
  'draf: ubah rubrik');
select throws_ok($$update public.score_criteria set description = '  ' where params_version = 2 and indicator = 'legal' and score = 1$$,
  '23514', null, 'rubrik kosong ditolak');

-- Versi terkunci.
select throws_ok($$update public.scoring_params set weights = '{"legal":1,"control":0,"physical":0,"utilization":0,"location":0,"strategic":0}'
  where version = 1$$, '55000', null, 'versi aktif: bobot tidak bisa diubah');
select throws_ok($$delete from public.scoring_params where version = 1$$, '55000', null, 'versi aktif: tidak bisa dihapus');
select throws_ok($$update public.score_criteria set description = 'x' where params_version = 1 and indicator = 'legal' and score = 1$$,
  '55000', null, 'versi aktif: rubrik tidak bisa diubah');
select throws_ok($$delete from public.score_criteria where params_version = 1 and indicator = 'legal' and score = 1$$,
  '55000', null, 'versi aktif: rubrik tidak bisa dihapus');
select lives_ok($$update public.scoring_params set notes = 'catatan' where version = 1$$, 'versi terkunci: catatan tetap bisa diubah');

-- Preview (sebelum aktivasi) tidak menulis.
create temp table snap as select (select count(*) from public.audit_log) au,
  (select jsonb_agg(to_jsonb(s) order by s.id) from public.assessments s) asm;
create temp table pv as select public.preview_params_impact(2) j;
select is((select j->>'category_changed' from pv), '2', 'preview: 2 penilaian terakhir pindah kategori');
select ok((select j->'matrix' @> '[{"from":"low","to":"critical","count":1},{"from":"medium","to":"low","count":1}]' from pv),
  'preview: matriks dari→ke');
select is((select (e->>'new_score')::numeric from pv, jsonb_array_elements(j->'changes') e where e->>'asset_code' = 'SET-1'),
  100.0, 'preview: skor baru SET-1');
select ok((select (select count(*) from public.audit_log) = au
             and (select jsonb_agg(to_jsonb(s) order by s.id) from public.assessments s) = asm from snap),
  'preview tidak menulis');

-- Aktivasi gagal bila rubrik tidak lengkap.
delete from public.score_criteria where params_version = 2 and indicator = 'strategic' and score = 5;
select throws_ok($$select public.activate_params_version(2)$$, '23514', 'Rubrik versi 2 belum lengkap (29/30 terisi).',
  'aktivasi ditolak: rubrik tidak lengkap');
insert into public.score_criteria (params_version, indicator, score, description) values (2, 'strategic', 5, 'Sangat strategis');
select is((select jsonb_build_array(j->'version', j->'previous_version') from (select public.activate_params_version(2) j) x),
  '[2, 1]'::jsonb, 'aktivasi versi 2');
select is((select array_agg(version) from public.scoring_params where is_active), array[2], 'tepat satu versi aktif');
select ok((select activated_at is not null and approved_by = 'aaaaaaaa-0000-0000-0000-000000000008' from public.scoring_params where version = 2),
  'activated_at & approved_by terisi');
select throws_ok($$select public.activate_params_version(2)$$, '22023', null, 'aktivasi ulang versi aktif ditolak');
select ok((select jsonb_agg(to_jsonb(s) order by s.id) from public.assessments s) = (select asm from snap),
  'aktivasi tidak mengubah penilaian lama (skor & versi tetap)');
select ok(public.scoring_params_is_locked(2), 'versi yang pernah aktif terkunci');

-- Tidak boleh tanpa versi aktif (constraint trigger deferred).
savepoint s1;
update public.scoring_params set is_active = false where version = 2;
select throws_ok($$set constraints public.scoring_params_one_active immediate$$, '23514', null, 'menonaktifkan tanpa pengganti ditolak');
rollback to savepoint s1;
set constraints public.scoring_params_one_active deferred;

-- P2-1: penilaian hanya boleh memakai versi yang pernah aktif; draf tidak bisa terkunci lewat penilaian.
select is(public.create_params_draft(), 3, 'draf versi 3');
select throws_ok($$insert into public.assessments (asset_id, assessed_at, params_version, s_legal)
  select id, date '2026-02-01', 3, 3 from ids where asset_code = 'SET-3'$$, '23514', null,
  'P2-1: admin insert penilaian dengan versi draf ditolak');
select ok(not public.scoring_params_is_locked(3), 'P2-1: draf tetap tidak terkunci');
select lives_ok($$insert into public.assessments (asset_id, assessed_at, params_version, s_legal)
  select id, date '2026-02-01', 1, 3 from ids where asset_code = 'SET-3'$$, 'admin: versi lama yang pernah aktif diterima');
select throws_ok($$update public.assessments set params_version = 3 where asset_id = (select id from ids where asset_code = 'SET-3')$$,
  '22023', null, 'P2-1: ubah params_version ke draf ditolak');
select throws_ok($$update public.assessments set params_version = 2
  where asset_id = (select id from ids where asset_code = 'SET-1') and assessed_at = date '2026-01-10'$$,
  '22023', 'Hanya penilaian terakhir aset yang dapat dihitung ulang dengan versi aktif.',
  'P2-1: penilaian lama tidak bisa dihitung ulang diam-diam');
select lives_ok($$update public.assessments set findings = 'koreksi'
  where asset_id = (select id from ids where asset_code = 'SET-1') and assessed_at = date '2026-01-10'$$,
  'P2-1: koreksi kolom lain penilaian lama tetap boleh');

-- P2-2: INSERT rubrik ke versi terkunci ditolak untuk klien (trigger BEFORE jalan sebelum cek PK).
select throws_ok($$insert into public.score_criteria (params_version, indicator, score, description) values (1, 'legal', 1, 'x')
  on conflict do nothing$$, '55000', null, 'P2-2: insert rubrik ke versi terkunci ditolak');

-- P2-3: save_params_draft atomik.
select is(public.save_params_draft(3,
  '{"weights":{"legal":0.5,"control":0.5,"physical":0,"utilization":0,"location":0,"strategic":0},"notes":" Simpan "}',
  '[{"indicator":"legal","score":1,"description":" Rubrik v3 "},{"indicator":"control","score":2,"description":"Kontrol v3"}]'), 3,
  'P2-3: save_params_draft mengembalikan versi');
select is((select (weights->>'legal') || '|' || notes from public.scoring_params where version = 3), '0.5|Simpan',
  'P2-3: bobot & catatan tersimpan; ambang tetap');
select is((select string_agg(description, ',' order by indicator) from public.score_criteria
  where params_version = 3 and (indicator, score) in (('legal', 1), ('control', 2))), 'Rubrik v3,Kontrol v3', 'P2-3: rubrik tersimpan');
select throws_ok($$select public.save_params_draft(3, '{"weights":{"legal":2,"control":0,"physical":0,"utilization":0,"location":0,"strategic":0}}',
  '[{"indicator":"legal","score":1,"description":"Tidak boleh tersimpan"}]')$$, '23514', null, 'P2-3: bobot tidak valid ditolak');
select is((select description from public.score_criteria where params_version = 3 and indicator = 'legal' and score = 1), 'Rubrik v3',
  'P2-3: gagal = tidak ada yang tersimpan (atomik)');
select throws_ok($$select public.save_params_draft(3, null, '[{"indicator":"legal","score":2,"description":"ok"},{"indicator":"legal","score":3,"description":" "}]')$$,
  '23514', null, 'P2-3: rubrik kosong ditolak');
select isnt((select description from public.score_criteria where params_version = 3 and indicator = 'legal' and score = 2), 'ok',
  'P2-3: rubrik baris sebelumnya ikut dibatalkan');
select throws_ok($$select public.save_params_draft(1, '{"notes":"x"}', null)$$, '55000', null, 'P2-3: versi terkunci ditolak');
select throws_ok($$select public.save_params_draft(999, '{"notes":"x"}', null)$$, 'P0002', null, 'P2-3: versi tidak ada');
select is(public.create_params_draft(), 4, 'draf versi 4');
select lives_ok($$delete from public.scoring_params where version = 4$$, 'draf dihapus');
select is((select count(*)::int from public.score_criteria where params_version = 4), 0, 'rubrik draf ikut terhapus');

-- Recalc: hanya penilaian terakhir tiap aset.
select is((select (public.recalculate_with_active_params(false))->>'updated'), '3', 'recalc: 3 penilaian terakhir diperbarui');
select is((select params_version || '|' || total_score from public.assessments s join ids on ids.id = s.asset_id
  where ids.asset_code = 'SET-1' and assessed_at = date '2026-01-10'), '1|36.0', 'recalc: penilaian lama tetap versi & skornya');
select is((select params_version || '|' || category from public.assessments s join ids on ids.id = s.asset_id
  where ids.asset_code = 'SET-1' and assessed_at = date '2026-06-10'), '2|critical', 'recalc: penilaian terakhir ke versi aktif');

-- ===== Koreksi massal "perlu review" =====
select is(public.resolve_utilization_review((select array_agg(id) from ids where asset_code in ('SET-1')), 'idle_kosong'), 1,
  'koreksi: set status baru');
select is(public.resolve_utilization_review((select array_agg(id) from ids where asset_code in ('SET-2', 'SET-3')), null), 1,
  'konfirmasi apa adanya: hanya aset needs_review');
select is((select string_agg(asset_code || ':' || utilization || ':' || utilization_needs_review || ':' || utilization_raw, ',' order by asset_code)
  from public.assets where asset_code like 'SET-%'),
  'SET-1:idle_kosong:false:Produktif,SET-2:digunakan_sendiri:false:Produktif,SET-3:digunakan_sendiri:false:Produktif',
  'status, flag, dan utilization_raw asli');
select ok(exists (select 1 from public.audit_log l join ids on l.row_id = ids.id::text
  where ids.asset_code = 'SET-1' and l.action = 'UPDATE' and l.after->>'utilization_needs_review' = 'false'), 'koreksi tercatat di audit_log');

-- ===== Alias baru langsung dipakai import_commit =====
insert into public.region_aliases (alias, region_id) select ' jabar barat ', id from public.regions where name = 'JAWA BARAT';
insert into public.utilization_aliases (raw, status, needs_review) values ('  Nganggur ', 'idle_kosong', false);
select is((select string_agg(alias, ',') from public.region_aliases where alias like 'JABAR %'), 'JABAR BARAT', 'alias wilayah dinormalisasi');
insert into public.import_batches (file_name, status) values ('set-b', 'validated');
create temp table imp as select public.import_commit((select id from public.import_batches where file_name = 'set-b'), jsonb_build_array(
  jsonb_build_object('kind', 'asset', 'row', 2, 'data', jsonb_build_object('asset_code', 'SET-IMP', 'name', 'Impor alias',
    'type', 'tanah', 'region', 'Jabar Barat', 'utilization', 'NGANGGUR'))));
select is((select r.name || '|' || a.utilization from public.assets a join public.regions r on r.id = a.region_id where a.asset_code = 'SET-IMP'),
  'JAWA BARAT|idle_kosong', 'import_commit memakai alias baru');

select * from finish();
rollback;
