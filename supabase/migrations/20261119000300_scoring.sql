-- Fase 2 · 3/5 — Logika skor: SATU sumber kebenaran (lib/scoring hanya cermin untuk pratinjau).
-- Skor = Σ(skor_i × bobot_i) / 5 × 100, dibulatkan 1 desimal (half-up, sama dengan Math.round untuk
-- nilai positif). NULL bila ada indikator kosong → "belum dinilai", tidak pernah dianggap Low.
-- Fungsi bersifat STABLE karena membaca scoring_params; berjalan sebagai invoker (RLS berlaku).

-- p_scores: array 6 elemen berurutan sesuai enum score_indicator
--   [legal, control, physical, utilization, location, strategic].
create function public.compute_score(p_scores smallint[], p_version integer)
returns numeric(4, 1)
language plpgsql
stable
set search_path = ''
as $$
declare
  w jsonb;
begin
  if p_scores is null or cardinality(p_scores) <> 6 or array_position(p_scores, null) is not null then
    return null;
  end if;
  select sp.weights into w from public.scoring_params sp where sp.version = p_version;
  if w is null then
    raise exception 'Versi parameter skor % tidak ditemukan.', p_version using errcode = 'P0002';
  end if;
  return round(
    ( p_scores[1] * (w->>'legal')::numeric
    + p_scores[2] * (w->>'control')::numeric
    + p_scores[3] * (w->>'physical')::numeric
    + p_scores[4] * (w->>'utilization')::numeric
    + p_scores[5] * (w->>'location')::numeric
    + p_scores[6] * (w->>'strategic')::numeric
    ) / 5 * 100, 1);
end;
$$;

-- Cermin categoryFor(): override → critical (walau skor NULL); skor NULL → NULL (belum dinilai).
create function public.category_for(p_score numeric, p_override boolean, p_version integer)
returns public.risk_category
language plpgsql
stable
set search_path = ''
as $$
declare
  t jsonb;
begin
  if coalesce(p_override, false) then
    return 'critical'::public.risk_category;
  end if;
  if p_score is null then
    return null;
  end if;
  select sp.thresholds into t from public.scoring_params sp where sp.version = p_version;
  if t is null then
    raise exception 'Versi parameter skor % tidak ditemukan.', p_version using errcode = 'P0002';
  end if;
  return case
    when p_score >= (t->>'critical')::numeric then 'critical'
    when p_score >= (t->>'high')::numeric then 'high'
    when p_score >= (t->>'medium')::numeric then 'medium'
    else 'low'
  end::public.risk_category;
end;
$$;

-- Interval monitoring (bulan); NULL untuk kategori NULL (belum dinilai → tak terjadwal).
create function public.interval_months(p_category public.risk_category, p_version integer)
returns integer
language sql
stable
set search_path = ''
as $$
  select (sp.intervals->>p_category::text)::integer
  from public.scoring_params sp
  where sp.version = p_version and p_category is not null
$$;

create function public.active_params_version()
returns integer
language sql
stable
set search_path = ''
as $$
  select sp.version from public.scoring_params sp where sp.is_active
$$;

-- Trigger: total_score/category/is_complete SELALU dihitung ulang dari skor mentah,
-- sehingga klien tidak bisa memalsukan kategori. params_version kosong → versi aktif.
create function public.assessments_compute()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.params_version is null then
    new.params_version := public.active_params_version();
    if new.params_version is null then
      raise exception 'Belum ada parameter skor yang aktif.' using errcode = 'P0002';
    end if;
  end if;
  new.total_score := public.compute_score(
    array[new.s_legal, new.s_control, new.s_physical, new.s_utilization, new.s_location, new.s_strategic],
    new.params_version);
  new.is_complete := new.total_score is not null;
  new.category := public.category_for(new.total_score, new.critical_override, new.params_version);
  return new;
end;
$$;
create trigger assessments_compute before insert or update on public.assessments
  for each row execute function public.assessments_compute();
