-- Fase 8 · Pengaturan (admin). Hanya menambah. Ringkas:
-- a) allowed_emails: normalisasi email; tidak bisa mencabut/menurunkan diri sendiri; minimal satu admin.
--    Ditegakkan trigger (bukan RPC) sehingga DML langsung (RLS admin) juga terlindungi.
-- b) scoring_params: kolom activated_at; versi yang pernah aktif / dipakai penilaian TERKUNCI (params +
--    rubrik). Draf diubah/dihapus lewat DML langsung (RLS admin + trigger). Aktivasi hanya untuk penilaian
--    baru; recalc tetap aksi terpisah (recalculate_with_active_params).
-- c) preview_params_impact(version): pratinjau dampak versi mana pun terhadap penilaian terakhir.
-- d) Alias dinormalisasi trigger (' jabar ' → 'JABAR'); import_commit sudah membaca tabel alias langsung.
-- e) resolve_utilization_review(asset_ids, new_status): koreksi massal "perlu review".
-- Semua fungsi: search_path = '', security invoker (RLS pemanggil tetap berlaku).

-- ===== Audit: tabel pengaturan ikut tercatat =====
-- row_id: tabel tanpa kolom id/version memakai kunci alaminya.
create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
begin
  if tg_op = 'UPDATE' and v_old = v_new then
    return null;
  end if;
  insert into public.audit_log (table_name, row_id, action, before, after, actor)
  values (tg_table_name,
          coalesce(v_row->>'id', v_row->>'version', v_row->>'email', v_row->>'alias', v_row->>'raw',
                   (v_row->>'params_version') || ':' || (v_row->>'indicator') || ':' || (v_row->>'score')),
          tg_op, v_old, v_new, auth.uid());
  return null;
end;
$$;
create trigger audit_allowed_emails after insert or update or delete on public.allowed_emails
  for each row execute function public.audit_row();
create trigger audit_score_criteria after insert or update or delete on public.score_criteria
  for each row execute function public.audit_row();
create trigger audit_region_aliases after insert or update or delete on public.region_aliases
  for each row execute function public.audit_row();
create trigger audit_utilization_aliases after insert or update or delete on public.utilization_aliases
  for each row execute function public.audit_row();

-- ===== a) Allowlist =====
-- Security invoker: hanya admin yang lolos RLS untuk menulis, dan admin melihat semua baris,
-- jadi hitungan admin di bawah akurat. postgres/service_role tidak kena aturan "diri sendiri",
-- tetapi tetap kena aturan "minimal satu admin".
-- Race dua admin saling cabut: advisory lock transaksi menyerialkan pemeriksaan; tiap query plpgsql
-- (READ COMMITTED) mengambil snapshot baru setelah lock didapat, jadi pencabutan yang sudah commit
-- terlihat. (LOCK TABLE share row exclusive akan deadlock dengan RowExclusiveLock milik DML itu sendiri.)
create function public.allowed_emails_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_me text := lower(auth.jwt()->>'email');
begin
  if tg_op in ('INSERT', 'UPDATE') then
    new.email := lower(btrim(new.email));
  end if;
  if tg_op = 'INSERT' then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if new.email is distinct from old.email then
      raise exception 'Email tidak dapat diubah; cabut lalu tambahkan email baru.' using errcode = '22023';
    end if;
    if new.role >= old.role then
      return new; -- bukan penurunan
    end if;
  end if;
  -- Pencabutan (DELETE) atau penurunan role. Aturan "diri sendiri" hanya untuk sesi klien
  -- (role authenticated); postgres/service_role tidak mewakili user tertentu.
  if current_user = 'authenticated' and old.email = v_me then
    raise exception 'Anda tidak dapat mencabut atau menurunkan akses Anda sendiri.' using errcode = '42501';
  end if;
  if old.role = 'admin' then
    perform pg_advisory_xact_lock(hashtext('public.allowed_emails:admin'));
    if not exists (
      select 1 from public.allowed_emails ae where ae.role = 'admin' and ae.email <> old.email
    ) then
      raise exception 'Harus tersisa minimal satu admin.' using errcode = '23514';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
-- Nama "allowed_emails_aa…" < "allowed_emails_actor": jalan lebih dulu (urut abjad).
create trigger allowed_emails_aa_guard before insert or update or delete on public.allowed_emails
  for each row execute function public.allowed_emails_guard();

-- ===== b) Versi parameter =====
alter table public.scoring_params add column activated_at timestamptz;
-- Backfill sebelum trigger penjaga dibuat. (db reset: tabel masih kosong; seed diisi trigger insert.)
update public.scoring_params set activated_at = created_at where is_active and activated_at is null;

alter table public.score_criteria
  add constraint score_criteria_description_valid
  check (btrim(description) <> '' and length(description) <= 2000);

-- Terkunci = pernah aktif ATAU dipakai penilaian. Dipakai trigger & UI (tombol ubah/hapus).
-- Catatan: assessment_drafts tidak menyimpan versi parameter (versi diisi saat simpan), jadi tidak dicek.
create function public.scoring_params_is_locked(p_version integer)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from public.scoring_params sp where sp.version = p_version and sp.activated_at is not null)
      or exists (select 1 from public.assessments s where s.params_version = p_version)
$$;

-- Validasi ramah (BEFORE trigger jalan sebelum CHECK constraint, yang tetap ada sebagai jaring kedua).
create function public.scoring_params_validate(p_weights jsonb, p_thresholds jsonb, p_intervals jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_sum numeric;
begin
  if jsonb_typeof(p_weights) is distinct from 'object' or exists (
    select 1 from unnest(array['legal', 'control', 'physical', 'utilization', 'location', 'strategic']) k
    where jsonb_typeof(p_weights->k) is distinct from 'number'
  ) then
    raise exception 'Bobot keenam indikator wajib diisi angka.' using errcode = '23514';
  end if;
  if exists (
    select 1 from unnest(array['legal', 'control', 'physical', 'utilization', 'location', 'strategic']) k
    where (p_weights->>k)::numeric < 0
  ) then
    raise exception 'Bobot tidak boleh negatif.' using errcode = '23514';
  end if;
  select sum((p_weights->>k)::numeric) into v_sum
  from unnest(array['legal', 'control', 'physical', 'utilization', 'location', 'strategic']) k;
  if v_sum <> 1 then
    raise exception 'Total bobot harus 100%% (saat ini %).', round(v_sum * 100, 2)::text || '%' using errcode = '23514';
  end if;

  if jsonb_typeof(p_thresholds) is distinct from 'object' or exists (
    select 1 from unnest(array['critical', 'high', 'medium']) k where jsonb_typeof(p_thresholds->k) is distinct from 'number'
  ) then
    raise exception 'Ambang Critical, High, dan Medium wajib diisi angka.' using errcode = '23514';
  end if;
  if not ((p_thresholds->>'critical')::numeric <= 100
          and (p_thresholds->>'critical')::numeric > (p_thresholds->>'high')::numeric
          and (p_thresholds->>'high')::numeric > (p_thresholds->>'medium')::numeric
          and (p_thresholds->>'medium')::numeric > 0) then
    raise exception 'Ambang kategori harus menurun: 100 ≥ Critical > High > Medium > 0.' using errcode = '23514';
  end if;

  if jsonb_typeof(p_intervals) is distinct from 'object' or exists (
    select 1 from unnest(array['critical', 'high', 'medium', 'low']) k
    where jsonb_typeof(p_intervals->k) is distinct from 'number'
       or (p_intervals->>k)::numeric <= 0
       or (p_intervals->>k)::numeric <> trunc((p_intervals->>k)::numeric)
  ) then
    raise exception 'Interval monitoring harus bilangan bulat lebih dari 0 (bulan).' using errcode = '23514';
  end if;
end;
$$;

create function public.scoring_params_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_locked boolean;
  v_rubric integer;
begin
  if tg_op = 'INSERT' then
    -- Klien wajib membuat draf lalu activate_params_version (cek rubrik). Seed (postgres) boleh langsung aktif.
    if new.is_active and current_user = 'authenticated' then
      raise exception 'Versi baru dibuat sebagai draf; aktifkan lewat aktivasi versi.' using errcode = '22023';
    end if;
    perform public.scoring_params_validate(new.weights, new.thresholds, new.intervals);
    new.activated_at := case when new.is_active then now() end;
    new.approved_by := case when new.is_active then auth.uid() end;
    return new;
  end if;

  v_locked := public.scoring_params_is_locked(old.version);
  if tg_op = 'DELETE' then
    if v_locked then
      raise exception 'Versi % sudah pernah aktif atau dipakai penilaian; tidak dapat dihapus.', old.version
        using errcode = '55000';
    end if;
    return old;
  end if;

  if new.version <> old.version then
    raise exception 'Nomor versi tidak dapat diubah.' using errcode = '22023';
  end if;
  new.created_at := old.created_at;

  if new.is_active and not old.is_active then
    -- Aktivasi: rubrik wajib lengkap 6 indikator × skor 1–5 (deskripsi non-kosong dijamin constraint).
    select count(*) into v_rubric from public.score_criteria sc where sc.params_version = new.version;
    if v_rubric < 30 then
      raise exception 'Rubrik versi % belum lengkap (%/30 terisi).', new.version, v_rubric using errcode = '23514';
    end if;
    new.activated_at := now();
    new.approved_by := auth.uid();
  else
    new.activated_at := old.activated_at;
    new.approved_by := old.approved_by;
    if v_locked and new.effective_from is distinct from old.effective_from then
      raise exception 'Versi % terkunci; tanggal berlaku tidak dapat diubah.', old.version using errcode = '55000';
    end if;
  end if;

  if v_locked and (new.weights, new.thresholds, new.intervals, new.methods, new.indicator_labels)
                  is distinct from (old.weights, old.thresholds, old.intervals, old.methods, old.indicator_labels) then
    raise exception 'Versi % terkunci (pernah aktif atau dipakai penilaian); buat draf versi baru.', old.version
      using errcode = '55000';
  end if;
  perform public.scoring_params_validate(new.weights, new.thresholds, new.intervals);
  return new;
end;
$$;
create trigger scoring_params_aa_guard before insert or update or delete on public.scoring_params
  for each row execute function public.scoring_params_guard();

-- Tepat satu versi aktif: unique index menjamin ≤ 1; constraint trigger (deferred, dicek saat commit)
-- menjamin ≥ 1 setelah versi aktif dinonaktifkan/dihapus. Jadi menonaktifkan hanya bisa bersama
-- mengaktifkan versi lain dalam satu transaksi (activate_params_version).
create function public.scoring_params_one_active()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.scoring_params sp where sp.is_active)
     and exists (select 1 from public.scoring_params) then
    raise exception 'Harus ada tepat satu versi parameter yang aktif.' using errcode = '23514';
  end if;
  return null;
end;
$$;
create constraint trigger scoring_params_one_active
  after update or delete on public.scoring_params
  deferrable initially deferred
  for each row when (old.is_active) execute function public.scoring_params_one_active();

create function public.score_criteria_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    new.description := btrim(new.description);
  end if;
  -- INSERT ke versi terkunci hanya untuk seed/postgres (rubrik disisipkan setelah versi aktif dibuat);
  -- sesi klien ditolak agar slot kosong versi terkunci tidak bisa diisi diam-diam. Ubah/hapus rubrik
  -- versi terkunci ditolak, kecuali UPDATE tanpa perubahan (seed idempoten: on conflict do update sama).
  if tg_op = 'INSERT' and current_user = 'authenticated' and public.scoring_params_is_locked(new.params_version) then
    raise exception 'Rubrik versi % terkunci (pernah aktif atau dipakai penilaian); buat draf versi baru.',
      new.params_version using errcode = '55000';
  end if;
  if tg_op <> 'INSERT' and public.scoring_params_is_locked(old.params_version)
     and (tg_op = 'DELETE' or new is distinct from old) then
    raise exception 'Rubrik versi % terkunci (pernah aktif atau dipakai penilaian); buat draf versi baru.',
      old.params_version using errcode = '55000';
  end if;
  if tg_op = 'UPDATE' and new.params_version <> old.params_version
     and public.scoring_params_is_locked(new.params_version) then
    raise exception 'Rubrik versi % terkunci.', new.params_version using errcode = '55000';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger score_criteria_aa_guard before insert or update or delete on public.score_criteria
  for each row execute function public.score_criteria_guard();

-- Draf baru = salinan versi aktif (params + rubrik). Mengembalikan nomor versi baru.
create function public.create_params_draft(p_notes text default null)
returns integer
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_active integer;
  v_new integer;
begin
  if not public.has_role('admin') then
    raise exception 'Hanya admin yang dapat membuat versi parameter.' using errcode = '42501';
  end if;
  v_active := public.active_params_version();
  if v_active is null then
    raise exception 'Belum ada parameter skor yang aktif.' using errcode = 'P0002';
  end if;
  perform pg_advisory_xact_lock(hashtext('public.scoring_params:version'));
  select coalesce(max(sp.version), 0) + 1 into v_new from public.scoring_params sp;

  insert into public.scoring_params (version, weights, thresholds, intervals, methods, indicator_labels,
                                     effective_from, is_active, notes)
  select v_new, sp.weights, sp.thresholds, sp.intervals, sp.methods, sp.indicator_labels,
         public.today_wib(), false, coalesce(nullif(btrim(p_notes), ''), format('Draf dari versi %s', v_active))
  from public.scoring_params sp where sp.version = v_active;

  insert into public.score_criteria (params_version, indicator, score, description, revised_from_excel)
  select v_new, sc.indicator, sc.score, sc.description, sc.revised_from_excel
  from public.score_criteria sc where sc.params_version = v_active;

  return v_new;
end;
$$;

-- Aktivasi atomik: nonaktifkan yang lama + aktifkan yang baru dalam satu transaksi.
-- Hanya berlaku untuk penilaian BARU; penilaian lama tetap pada versinya (recalc = aksi terpisah).
-- Validasi rubrik & set activated_at/approved_by dilakukan trigger scoring_params_guard.
create function public.activate_params_version(p_version integer, p_effective_from date default null)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_prev integer;
  v_row public.scoring_params;
begin
  if not public.has_role('admin') then
    raise exception 'Hanya admin yang dapat mengaktifkan versi parameter.' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('public.scoring_params:activate'));
  select * into v_row from public.scoring_params sp where sp.version = p_version for update;
  if not found then
    raise exception 'Versi parameter % tidak ditemukan.', p_version using errcode = 'P0002';
  end if;
  if v_row.is_active then
    raise exception 'Versi % sudah aktif.', p_version using errcode = '22023';
  end if;
  v_prev := public.active_params_version();

  update public.scoring_params sp set is_active = false where sp.is_active;
  update public.scoring_params sp
     set is_active = true, effective_from = coalesce(p_effective_from, public.today_wib())
   where sp.version = p_version
  returning * into v_row;

  return jsonb_build_object(
    'version', v_row.version,
    'previous_version', v_prev,
    'activated_at', v_row.activated_at,
    'effective_from', v_row.effective_from
  );
end;
$$;

-- Penilaian hanya boleh memakai versi yang PERNAH AKTIF (draf belum disetujui → tidak terkunci diam-diam).
-- Mengubah params_version penilaian yang ada: hanya ke versi aktif DAN hanya penilaian terakhir asetnya
-- (sama dengan cakupan recalculate_with_active_params; riwayat lama tidak dihitung ulang diam-diam).
-- Nama "assessments_ab…": setelah assessments_aa_guard (pemaksaan versi non-admin), sebelum
-- assessments_compute. params_version NULL diisi versi aktif oleh assessments_compute.
create function public.assessments_params_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.params_version is null then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if new.params_version is not distinct from old.params_version then
      return new;
    end if;
    if new.params_version is distinct from public.active_params_version() then
      raise exception 'Versi parameter penilaian hanya dapat diubah ke versi aktif (lewat hitung ulang).'
        using errcode = '22023';
    end if;
    if exists (
      select 1 from public.assessments s
      where s.asset_id = old.asset_id and s.id <> old.id
        and (s.assessed_at, s.created_at) > (old.assessed_at, old.created_at)
    ) then
      raise exception 'Hanya penilaian terakhir aset yang dapat dihitung ulang dengan versi aktif.'
        using errcode = '22023';
    end if;
  end if;
  if not exists (
    select 1 from public.scoring_params sp where sp.version = new.params_version and sp.activated_at is not null
  ) then
    raise exception 'Versi parameter % belum pernah diaktifkan; penilaian hanya boleh memakai versi yang sudah aktif.',
      new.params_version using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger assessments_ab_params_guard before insert or update of params_version on public.assessments
  for each row execute function public.assessments_params_guard();

-- Simpan draf atomik: params (kolom yang ada di p_params) + deskripsi rubrik, satu transaksi.
-- p_criteria: [{indicator, score, description}] — upsert (slot kosong draf ikut terisi).
-- Validasi bobot/ambang/interval & rubrik ditegakkan trigger/constraint.
create function public.save_params_draft(p_version integer, p_params jsonb default null, p_criteria jsonb default null)
returns integer
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Hanya admin yang dapat mengubah draf parameter.' using errcode = '42501';
  end if;
  perform 1 from public.scoring_params sp where sp.version = p_version for update;
  if not found then
    raise exception 'Draf versi % tidak ditemukan.', p_version using errcode = 'P0002';
  end if;
  if public.scoring_params_is_locked(p_version) then
    raise exception 'Versi % terkunci (pernah aktif atau dipakai penilaian); buat draf versi baru.', p_version
      using errcode = '55000';
  end if;
  if p_params is not null and jsonb_typeof(p_params) <> 'object' then
    raise exception 'Format parameter tidak valid.' using errcode = '22023';
  end if;
  if p_criteria is not null and jsonb_typeof(p_criteria) <> 'array' then
    raise exception 'Format rubrik tidak valid.' using errcode = '22023';
  end if;

  if p_params is not null then
    update public.scoring_params sp
       set weights = coalesce(p_params->'weights', sp.weights),
           thresholds = coalesce(p_params->'thresholds', sp.thresholds),
           intervals = coalesce(p_params->'intervals', sp.intervals),
           notes = case when p_params ? 'notes' then nullif(btrim(p_params->>'notes'), '') else sp.notes end
     where sp.version = p_version;
  end if;

  if p_criteria is not null then
    insert into public.score_criteria (params_version, indicator, score, description)
    select p_version, c.indicator, c.score, c.description
    from jsonb_to_recordset(p_criteria) as c(indicator public.score_indicator, score smallint, description text)
    on conflict (params_version, indicator, score) do update set description = excluded.description;
  end if;

  return p_version;
end;
$$;

-- ===== c) Pratinjau dampak versi (tanpa menulis) =====
-- Untuk penilaian TERAKHIR tiap aset (cakupan sama dengan recalculate_with_active_params):
-- skor/kategori tersimpan vs bila dihitung dengan p_version. Kategori NULL = 'unrated' di matriks.
create function public.preview_params_impact(p_version integer)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.has_role('admin') then
    raise exception 'Hanya admin yang dapat melihat pratinjau dampak.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.scoring_params sp where sp.version = p_version) then
    raise exception 'Versi parameter % tidak ditemukan.', p_version using errcode = 'P0002';
  end if;

  with latest as (
    select distinct on (s.asset_id) s.*
    from public.assessments s
    order by s.asset_id, s.assessed_at desc, s.created_at desc
  ),
  calc as (
    select l.id, l.asset_id, l.params_version as old_version, l.total_score as old_score,
           l.category as old_category, n.new_score,
           public.category_for(n.new_score, l.critical_override, p_version) as new_category
    from latest l
    cross join lateral (
      select public.compute_score(
        array[l.s_legal, l.s_control, l.s_physical, l.s_utilization, l.s_location, l.s_strategic], p_version) as new_score
    ) n
  )
  select jsonb_build_object(
    'version', p_version,
    'active_version', public.active_params_version(),
    'assessments_total', (select count(*) from calc),
    'score_changed', (select count(*) from calc c where c.old_score is distinct from c.new_score),
    'category_changed', (select count(*) from calc c where c.old_category is distinct from c.new_category),
    'matrix', (
      select coalesce(jsonb_agg(jsonb_build_object('from', m.f, 'to', m.t, 'count', m.n) order by m.f, m.t), '[]'::jsonb)
      from (
        select coalesce(c.old_category::text, 'unrated') as f, coalesce(c.new_category::text, 'unrated') as t, count(*) as n
        from calc c group by 1, 2
      ) m
    ),
    'changes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'assessment_id', c.id, 'asset_id', c.asset_id, 'asset_code', a.asset_code, 'name', a.name,
        'old_version', c.old_version, 'old_score', c.old_score, 'old_category', c.old_category,
        'new_score', c.new_score, 'new_category', c.new_category
      ) order by a.asset_code), '[]'::jsonb)
      from calc c join public.assets a on a.id = c.asset_id
      where c.old_score is distinct from c.new_score or c.old_category is distinct from c.new_category
    )
  ) into v_result;
  return v_result;
end;
$$;

-- ===== d) Alias: normalisasi otomatis (sama dengan resolusi di import_commit) =====
create function public.region_aliases_normalize()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.alias := upper(btrim(new.alias));
  return new;
end;
$$;
create trigger region_aliases_normalize before insert or update on public.region_aliases
  for each row execute function public.region_aliases_normalize();

create function public.utilization_aliases_normalize()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.raw := lower(btrim(new.raw));
  return new;
end;
$$;
create trigger utilization_aliases_normalize before insert or update on public.utilization_aliases
  for each row execute function public.utilization_aliases_normalize();

-- ===== e) Koreksi massal "perlu review" =====
-- new_status NULL = konfirmasi status apa adanya. utilization_raw (teks asli) tidak disentuh.
-- Hanya aset yang masih needs_review. Audit lewat trigger audit_assets.
create function public.resolve_utilization_review(
  asset_ids uuid[],
  new_status public.utilization_status default null
)
returns integer
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_n integer;
begin
  if not public.has_role('admin') then
    raise exception 'Hanya admin yang dapat mengoreksi status pemanfaatan massal.' using errcode = '42501';
  end if;
  if asset_ids is null or cardinality(asset_ids) = 0 then
    raise exception 'Pilih minimal satu aset.' using errcode = '22023';
  end if;
  if cardinality(asset_ids) > 5000 then
    raise exception 'Maksimal 5.000 aset per koreksi.' using errcode = '22023';
  end if;
  update public.assets a
     set utilization = coalesce(new_status, a.utilization),
         utilization_needs_review = false
   where a.id = any (asset_ids) and a.utilization_needs_review;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ===== Hak EXECUTE =====
revoke all on function
  public.allowed_emails_guard(),
  public.scoring_params_guard(),
  public.scoring_params_one_active(),
  public.score_criteria_guard(),
  public.assessments_params_guard(),
  public.region_aliases_normalize(),
  public.utilization_aliases_normalize()
from public, anon, authenticated;
-- scoring_params_validate: dipanggil trigger (security invoker) → butuh execute; murni, tanpa efek.
revoke all on function
  public.scoring_params_validate(jsonb, jsonb, jsonb),
  public.scoring_params_is_locked(integer),
  public.create_params_draft(text),
  public.activate_params_version(integer, date),
  public.save_params_draft(integer, jsonb, jsonb),
  public.preview_params_impact(integer),
  public.resolve_utilization_review(uuid[], public.utilization_status)
from public, anon;
grant execute on function
  public.scoring_params_validate(jsonb, jsonb, jsonb),
  public.scoring_params_is_locked(integer),
  public.create_params_draft(text),
  public.activate_params_version(integer, date),
  public.save_params_draft(integer, jsonb, jsonb),
  public.preview_params_impact(integer),
  public.resolve_utilization_review(uuid[], public.utilization_status)
to authenticated;
