-- Fase 2 · 5/5 — View & RPC. Semua security invoker → RLS pemanggil berlaku.

-- Aset + penilaian terakhir. Jadwal mengikuti PLAN §2.2 (Excel):
--   due_date = last_monitored_at + interval kategori (versi parameter penilaian itu sendiri).
--   schedule_status: tak_terjadwal (belum dinilai) · belum_ada_tanggal (tgl monitoring kosong)
--                    · lewat (due_date < hari ini) · terjadwal. days_until_due tersedia untuk "segera" (≤30) di UI.
create view public.v_asset_latest
with (security_invoker = true)
as
select
  a.id, a.asset_code, a.name, a.type, a.region_id, r.name as region, a.address,
  a.land_area_m2, a.building_area_m2, a.book_value, a.legal_status, a.right_expiry_date,
  a.utilization, public.utilization_label(a.utilization) as utilization_label,
  a.utilization_raw, a.utilization_needs_review, a.pic_unit, a.notes, a.last_monitored_at,
  a.is_active, a.value_is_placeholder, a.area_is_placeholder, a.created_at, a.updated_at,
  la.id as assessment_id, la.assessed_at, la.params_version,
  la.s_legal, la.s_control, la.s_physical, la.s_utilization, la.s_location, la.s_strategic,
  la.critical_override, la.override_reason, la.findings, la.follow_up, la.follow_up_pic, la.target_date,
  la.total_score, la.category, coalesce(la.is_complete, false) as is_complete,
  iv.months as interval_months,
  d.due_date,
  (d.due_date - current_date) as days_until_due,
  case
    when la.category is null then 'tak_terjadwal'
    when a.last_monitored_at is null then 'belum_ada_tanggal'
    when d.due_date < current_date then 'lewat'
    else 'terjadwal'
  end as schedule_status
from public.assets a
join public.regions r on r.id = a.region_id
left join lateral (
  select s.*
  from public.assessments s
  where s.asset_id = a.id
  order by s.assessed_at desc, s.created_at desc
  limit 1
) la on true
left join lateral (select public.interval_months(la.category, la.params_version) as months) iv on true
left join lateral (
  select (a.last_monitored_at + make_interval(months => iv.months))::date as due_date
) d on true;
-- Catatan: LATERAL + LIMIT 1 memakai index assessments_latest_idx per aset (setara DISTINCT ON,
-- tetapi tetap efisien saat view difilter per aset).

-- Satu baris per aset aktif per isu. kind: 'risiko' (temuan risiko) vs 'data' (kualitas data),
-- dipisah di dashboard (DESIGN.md §12.2). issue_code = WarnKey di lib/scoring/labels.ts.
create view public.v_data_quality_issues
with (security_invoker = true)
as
select a.id as asset_id, a.asset_code, a.name, i.issue_code, i.kind, i.detail
from public.assets a
cross join lateral (values
  ('nilai-placeholder', 'data', 'D1', a.value_is_placeholder),
  ('luas-placeholder', 'data', 'D1', a.area_is_placeholder),
  ('hak-kedaluwarsa', 'risiko', 'D2', a.right_expiry_date < current_date),
  ('hak-berakhir', 'risiko', 'D2',
     a.right_expiry_date >= current_date and a.right_expiry_date < current_date + interval '12 months'),
  ('tgl-masa-depan', 'data', 'D4', a.last_monitored_at > current_date),
  ('perlu-review', 'data', 'D5', a.utilization_needs_review),
  ('alamat-kosong', 'data', null, coalesce(btrim(a.address), '') = '')
) as i(issue_code, kind, detail, hit)
where a.is_active and i.hit;

-- ===== dashboard_summary =====
-- filters: {"region": nama atau uuid, "type": asset_type, "utilization": utilization_status,
--           "category": risk_category | "unrated"}. Hanya aset aktif.
-- Agregat nilai (Rp) MENGECUALIKAN placeholder (value_is_placeholder); jumlah yang dikecualikan dilaporkan.
create function public.dashboard_summary(filters jsonb default '{}'::jsonb)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with f as (
  select
    nullif(filters->>'region', '') as region,
    nullif(filters->>'type', '') as type,
    nullif(filters->>'utilization', '') as utilization,
    nullif(filters->>'category', '') as category
),
base as (
  select v.*,
         coalesce(v.category::text, 'unrated') as cat,
         case when v.value_is_placeholder then null else v.book_value end as value
  from public.v_asset_latest v, f
  where v.is_active
    and (f.region is null or v.region = upper(f.region) or v.region_id::text = f.region)
    and (f.type is null or v.type::text = f.type)
    and (f.utilization is null or v.utilization::text = f.utilization)
    and (f.category is null or coalesce(v.category::text, 'unrated') = f.category)
),
cats as (select unnest(array['critical', 'high', 'medium', 'low', 'unrated']) as cat, generate_series(1, 5) as ord)
select jsonb_build_object(
  'generated_at', now(),
  'today', current_date,
  'active_params_version', public.active_params_version(),
  'filters', coalesce(filters, '{}'::jsonb),
  'totals', (
    select jsonb_build_object(
      'assets', count(*),
      'assessed', count(*) filter (where category is not null),
      'unrated', count(*) filter (where category is null),
      'incomplete_assessments', count(*) filter (where assessment_id is not null and not is_complete),
      'book_value', coalesce(sum(value), 0),
      'value_placeholder_count', count(*) filter (where value_is_placeholder),
      'value_missing_count', count(*) filter (where book_value is null),
      'area_placeholder_count', count(*) filter (where area_is_placeholder),
      'land_area_m2', coalesce(sum(land_area_m2) filter (where not area_is_placeholder), 0)
    ) from base
  ),
  'categories', (
    select jsonb_agg(jsonb_build_object(
      'key', c.cat,
      'count', (select count(*) from base b where b.cat = c.cat),
      'value', (select coalesce(sum(b.value), 0) from base b where b.cat = c.cat),
      'value_excluded_count', (select count(*) from base b where b.cat = c.cat and b.value_is_placeholder)
    ) order by c.ord) from cats c
  ),
  'risk_findings', (
    select jsonb_build_object(
      'right_expired', count(*) filter (where q.issue_code = 'hak-kedaluwarsa'),
      'right_expiring_12m', count(*) filter (where q.issue_code = 'hak-berakhir')
    ) from public.v_data_quality_issues q join base b on b.id = q.asset_id
  ),
  'data_quality', (
    select coalesce(jsonb_object_agg(x.issue_code, x.n), '{}'::jsonb) from (
      select q.issue_code, count(*) as n
      from public.v_data_quality_issues q join base b on b.id = q.asset_id
      where q.kind = 'data'
      group by q.issue_code
    ) x
  ),
  'by_region', (
    select coalesce(jsonb_agg(x order by x.value desc, x.region), '[]'::jsonb) from (
      select b.region, count(*) as count, coalesce(sum(b.value), 0) as value,
             count(*) filter (where b.type = 'tanah') as tanah,
             count(*) filter (where b.type = 'bangunan') as bangunan,
             count(*) filter (where b.type = 'gabungan') as gabungan,
             count(*) filter (where b.utilization = 'idle_kosong') as idle_count,
             coalesce(sum(b.value) filter (where b.utilization = 'idle_kosong'), 0) as idle_value,
             count(*) filter (where b.category is not null) as assessed,
             count(*) filter (where b.value_is_placeholder) as value_excluded_count
      from base b group by b.region
    ) x
  ),
  'by_type', (
    select coalesce(jsonb_agg(x order by x.type), '[]'::jsonb) from (
      select b.type, count(*) as count, coalesce(sum(b.value), 0) as value,
             count(*) filter (where b.value_is_placeholder) as value_excluded_count
      from base b group by b.type
    ) x
  ),
  'utilization', (
    select coalesce(jsonb_agg(x order by x.value desc), '[]'::jsonb) from (
      select b.utilization as status, public.utilization_label(b.utilization) as label,
             count(*) as count, coalesce(sum(b.value), 0) as value,
             count(*) filter (where b.utilization_needs_review) as needs_review
      from base b group by b.utilization
    ) x
  ),
  'right_expiry', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', b.id, 'asset_code', b.asset_code, 'name', b.name,
      'right_expiry_date', b.right_expiry_date, 'category', b.category,
      'status', case when b.right_expiry_date < current_date then 'lewat'
                     when b.right_expiry_date < current_date + interval '12 months' then 'kurang_12_bulan'
                     else 'berlaku' end
    ) order by b.right_expiry_date), '[]'::jsonb)
    from base b where b.right_expiry_date is not null
  ),
  'schedule', (
    select jsonb_build_object(
      'counts', jsonb_build_object(
        'tak_terjadwal', count(*) filter (where schedule_status = 'tak_terjadwal'),
        'belum_ada_tanggal', count(*) filter (where schedule_status = 'belum_ada_tanggal'),
        'lewat', count(*) filter (where schedule_status = 'lewat'),
        'segera', count(*) filter (where schedule_status = 'terjadwal' and days_until_due <= 30),
        'terjadwal', count(*) filter (where schedule_status = 'terjadwal')
      ),
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', s.id, 'asset_code', s.asset_code, 'name', s.name, 'category', s.category,
          'interval_months', s.interval_months, 'last_monitored_at', s.last_monitored_at,
          'due_date', s.due_date, 'days_until_due', s.days_until_due, 'status', s.schedule_status
        ) order by s.due_date nulls last, s.asset_code)
        from base s where s.schedule_status in ('lewat', 'terjadwal', 'belum_ada_tanggal')
      ), '[]'::jsonb)
    ) from base
  ),
  'top_value', (
    select coalesce(jsonb_agg(x order by x.value desc), '[]'::jsonb) from (
      select b.id, b.asset_code, b.name, b.type, b.region, b.value, b.category, b.total_score
      from base b where b.value is not null
      order by b.value desc limit 10
    ) x
  ),
  -- Matriks indikator: hanya aset yang sudah dinilai (kategori tidak null).
  'matrix', (
    select jsonb_build_object(
      'rows', coalesce(jsonb_agg(jsonb_build_object(
        'id', b.id, 'asset_code', b.asset_code, 'name', b.name, 'assessed_at', b.assessed_at,
        'params_version', b.params_version, 'total_score', b.total_score, 'category', b.category,
        'critical_override', b.critical_override,
        'scores', jsonb_build_object('legal', b.s_legal, 'control', b.s_control, 'physical', b.s_physical,
          'utilization', b.s_utilization, 'location', b.s_location, 'strategic', b.s_strategic)
      ) order by b.total_score desc nulls last, b.asset_code), '[]'::jsonb),
      'averages', jsonb_build_object(
        'legal', round(avg(b.s_legal), 2), 'control', round(avg(b.s_control), 2),
        'physical', round(avg(b.s_physical), 2), 'utilization', round(avg(b.s_utilization), 2),
        'location', round(avg(b.s_location), 2), 'strategic', round(avg(b.s_strategic), 2),
        'total_score', round(avg(b.total_score), 1)
      )
    ) from base b where b.category is not null
  )
)
$$;

-- ===== Hitung ulang dengan parameter aktif (PLAN §9.5) =====
-- Keputusan: hanya PENILAIAN TERAKHIR tiap aset yang versinya ≠ versi aktif yang disentuh.
-- dry_run = true  → hanya pratinjau dampak.
-- dry_run = false → UPDATE params_version penilaian terakhir ke versi aktif; trigger
--   assessments_compute menghitung ulang skor/kategori, trigger audit_row mencatat before/after.
-- Dipilih UPDATE (bukan sisip baris baru) agar tanggal penilaian lapangan tidak "berpindah" dan
-- riwayat tidak tercemar baris sintetis; nilai lama tetap terlacak di audit_log. Penilaian lama
-- (bukan terakhir) tetap pada versinya. Admin saja.
create function public.recalculate_with_active_params(dry_run boolean default true)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_active integer := public.active_params_version();
  v_changes jsonb;
  v_updated integer := 0;
begin
  if not public.has_role('admin') then
    raise exception 'Hanya admin yang dapat menghitung ulang skor.' using errcode = '42501';
  end if;
  if v_active is null then
    raise exception 'Belum ada parameter skor yang aktif.' using errcode = 'P0002';
  end if;

  with latest as (
    select distinct on (s.asset_id) s.*
    from public.assessments s
    order by s.asset_id, s.assessed_at desc, s.created_at desc
  ),
  calc as (
    select l.id, l.asset_id, l.params_version as old_version, l.total_score as old_score, l.category as old_category,
           public.compute_score(array[l.s_legal, l.s_control, l.s_physical, l.s_utilization, l.s_location, l.s_strategic], v_active) as new_score
    from latest l where l.params_version <> v_active
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'assessment_id', c.id, 'asset_id', c.asset_id, 'asset_code', a.asset_code, 'name', a.name,
           'old_version', c.old_version, 'old_score', c.old_score, 'old_category', c.old_category,
           'new_score', c.new_score, 'new_category', nc.cat
         ) order by a.asset_code), '[]'::jsonb)
    into v_changes
  from calc c
  join public.assets a on a.id = c.asset_id
  join public.assessments s on s.id = c.id
  cross join lateral (select public.category_for(c.new_score, s.critical_override, v_active) as cat) nc;

  if not dry_run then
    update public.assessments s set params_version = v_active
    where s.id in (select (e->>'assessment_id')::uuid from jsonb_array_elements(v_changes) e);
    get diagnostics v_updated = row_count;
  end if;

  return jsonb_build_object(
    'dry_run', dry_run,
    'active_version', v_active,
    'assessments_affected', jsonb_array_length(v_changes),
    'category_changed', (select count(*) from jsonb_array_elements(v_changes) e
                         where (e->>'old_category') is distinct from (e->>'new_category')),
    'updated', v_updated,
    'changes', v_changes
  );
end;
$$;

-- ===== import_commit — KERANGKA (logika penuh Fase 7) =====
create function public.import_commit(batch_id uuid, rows jsonb)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_status text;
begin
  if not public.has_role('editor') then
    raise exception 'Anda tidak memiliki hak untuk mengimpor data.' using errcode = '42501';
  end if;
  select b.status into v_status from public.import_batches b where b.id = import_commit.batch_id;
  if v_status is null then
    raise exception 'Batch impor tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_status <> 'validated' then
    raise exception 'Batch impor berstatus "%"; hanya batch tervalidasi yang dapat di-commit.', v_status
      using errcode = '22023';
  end if;
  if rows is null or jsonb_typeof(rows) <> 'array' then
    raise exception 'Format baris impor harus berupa array JSON.' using errcode = '22023';
  end if;
  -- Logika penuh Fase 7: upsert assets per asset_code (hanya kolom terisi), resolusi alias
  -- wilayah/pemanfaatan, insert assessments idempoten per (asset, assessed_at), update batch.
  raise exception 'import_commit belum diimplementasikan (Fase 7).' using errcode = '0A000';
end;
$$;

-- ===== Hak EXECUTE =====
-- Default: tidak ada untuk anon/public. authenticated hanya fungsi yang memang dipanggil klien/
-- kebijakan; fungsi trigger & hook tidak bisa dipanggil langsung.
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.utilization_label(public.utilization_status),
  public.compute_score(smallint[], integer),
  public.category_for(numeric, boolean, integer),
  public.interval_months(public.risk_category, integer),
  public.active_params_version(),
  public.is_allowed(),
  public.has_role(public.app_role),
  public.current_app_role(),
  public.dashboard_summary(jsonb),
  public.recalculate_with_active_params(boolean),
  public.import_commit(uuid, jsonb)
to authenticated;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;

-- View hanya-baca.
revoke insert, update, delete, truncate on public.v_asset_latest, public.v_data_quality_issues from authenticated;
