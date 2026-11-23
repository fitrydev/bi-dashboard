-- Fase 5 · dashboard_summary v2 — hanya MENAMBAH key (bentuk JSON lama tetap). Audit vs PLAN §6.1 A–H:
--   A–C, G: sudah tercukupi (totals, categories, risk_findings, data_quality, schedule).
--   D: matrix.rows[].value (nilai buku non-placeholder) untuk scatter skor × nilai.
--   E: active_weights (bobot versi aktif) untuk header heatmap.
--   F: by_type[].idle_count/idle_value; by_region[].tanah_value/bangunan_value/gabungan_value (mini stacked bar Rp).
--   H: periods + trend (lihat komentar di key 'trend').
-- filters: {"region": nama atau uuid, "type": asset_type, "utilization": utilization_status,
--           "category": risk_category | "unrated"}. Hanya aset aktif.
-- Agregat nilai (Rp) MENGECUALIKAN placeholder (value_is_placeholder); jumlah yang dikecualikan dilaporkan.
create or replace function public.dashboard_summary(filters jsonb default '{}'::jsonb)
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
             coalesce(sum(b.value) filter (where b.type = 'tanah'), 0) as tanah_value,
             coalesce(sum(b.value) filter (where b.type = 'bangunan'), 0) as bangunan_value,
             coalesce(sum(b.value) filter (where b.type = 'gabungan'), 0) as gabungan_value,
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
             count(*) filter (where b.value_is_placeholder) as value_excluded_count,
             count(*) filter (where b.utilization = 'idle_kosong') as idle_count,
             coalesce(sum(b.value) filter (where b.utilization = 'idle_kosong'), 0) as idle_value
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
        'critical_override', b.critical_override, 'value', b.value,
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
  ),
  'active_weights', (
    select p.weights from public.scoring_params p where p.version = public.active_params_version()
  ),
  -- Tren per bulan (YYYY-MM) dari SEMUA penilaian aset yang lolos filter. Untuk tiap bulan yang
  -- punya penilaian, dipakai penilaian TERAKHIR tiap aset s.d. akhir bulan itu (snapshot kumulatif,
  -- bukan hanya penilaian di bulan itu), sehingga aset yang tidak dinilai ulang tetap terhitung.
  -- Bulan tanpa penilaian tidak dimunculkan (tidak ada titik palsu). Catatan: filter 'category'
  -- memilih aset menurut kategori TERBARU, lalu riwayatnya ditampilkan apa adanya.
  'periods', (
    select count(distinct to_char(s.assessed_at, 'YYYY-MM'))
    from public.assessments s join base b on b.id = s.asset_id
  ),
  'trend', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'period', m.period, 'avg_score', snap.avg_score, 'critical', snap.critical,
      'high', snap.high, 'assessed', snap.assessed
    ) order by m.period), '[]'::jsonb)
    from (
      select distinct to_char(s.assessed_at, 'YYYY-MM') as period,
             (date_trunc('month', s.assessed_at) + interval '1 month')::date as month_end
      from public.assessments s join base b on b.id = s.asset_id
    ) m
    cross join lateral (
      select round(avg(l.total_score), 1) as avg_score,
             count(*) filter (where l.category = 'critical') as critical,
             count(*) filter (where l.category = 'high') as high,
             count(*) filter (where l.category is not null) as assessed
      from (
        select distinct on (s.asset_id) s.total_score, s.category
        from public.assessments s join base b on b.id = s.asset_id
        where s.assessed_at < m.month_end
        order by s.asset_id, s.assessed_at desc, s.created_at desc
      ) l
    ) snap
  )
)
$$;

revoke all on function public.dashboard_summary(jsonb) from public, anon;
grant execute on function public.dashboard_summary(jsonb) to authenticated;
