-- Fase 2 · 2/5 — Tabel inti (PLAN §4).
-- Semua PK entitas = uuid agar tabel `attachments` polimorfik (entity_type, entity_id uuid)
-- bisa ditambahkan kelak tanpa migrasi besar (PLAN §9.7). Pengecualian: scoring_params (version int).
-- Kolom aktor (created_by, uploaded_by, actor) sengaja TANPA FK ke auth.users: menghapus user
-- tidak boleh merusak riwayat/audit.

-- Allowlist login. Email disimpan lowercase (dibandingkan dengan lower(auth.jwt()->>'email')).
create table public.allowed_emails (
  email text primary key
    constraint allowed_emails_email_normal check (email = lower(btrim(email)) and email like '_%@_%'),
  role public.app_role not null default 'admin', -- PLAN §9.1: RBAC siap, default admin
  added_by uuid,
  created_at timestamptz not null default now()
);

-- Profil, sinkron dari auth.users via trigger (lihat migrasi keamanan). Role TIDAK disalin ke sini:
-- satu sumber kebenaran role = allowed_emails.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.regions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
    constraint regions_name_normal check (name = upper(btrim(name)) and name <> '')
);

-- Alias wilayah untuk import, mis. 'JABAR' → JAWA BARAT. Alias disimpan UPPERCASE.
create table public.region_aliases (
  alias text primary key
    constraint region_aliases_alias_normal check (alias = upper(btrim(alias)) and alias <> ''),
  region_id uuid not null references public.regions (id) on delete cascade
);
create index region_aliases_region_id_idx on public.region_aliases (region_id);

-- Alias status pemanfaatan (PLAN §9.3). raw disimpan lowercase-trim.
-- Mis. 'idle' → idle_kosong; 'produktif' → digunakan_sendiri + needs_review.
create table public.utilization_aliases (
  raw text primary key
    constraint utilization_aliases_raw_normal check (raw = lower(btrim(raw)) and raw <> ''),
  status public.utilization_status not null,
  needs_review boolean not null default false
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  asset_code text not null unique
    constraint assets_code_nonempty check (btrim(asset_code) <> ''),
  name text not null,
  type public.asset_type not null,
  region_id uuid not null references public.regions (id) on delete restrict,
  address text,
  land_area_m2 numeric(14, 2) constraint assets_land_area_nonneg check (land_area_m2 >= 0),
  building_area_m2 numeric(14, 2) constraint assets_building_area_nonneg check (building_area_m2 >= 0),
  book_value numeric(18, 2) constraint assets_book_value_nonneg check (book_value >= 0),
  legal_status text,
  right_expiry_date date,
  utilization public.utilization_status,
  utilization_raw text,                                   -- teks asli dari Excel
  utilization_needs_review boolean not null default false, -- D5
  pic_unit text,
  notes text,
  last_monitored_at date,
  is_active boolean not null default true,
  -- D1: Rp1 / 1 m² = placeholder; dikecualikan dari agregat nilai.
  value_is_placeholder boolean generated always as (coalesce(book_value <= 1, false)) stored,
  area_is_placeholder boolean generated always as (coalesce(land_area_m2 <= 1, false)) stored,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
create index assets_region_type_util_idx on public.assets (region_id, type, utilization);
create index assets_active_value_idx on public.assets (book_value desc) where is_active;

create function public.assets_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
create trigger assets_touch before update on public.assets
  for each row execute function public.assets_touch();

-- Parameter skor berversi (PLAN §9.5). Bentuk jsonb:
--   weights          {"legal":0.2,"control":0.25,"physical":0.15,"utilization":0.15,"location":0.1,"strategic":0.15}  (Σ = 1)
--   thresholds       {"critical":80,"high":60,"medium":40}   (skor ≥ ambang)
--   intervals        {"critical":1,"high":3,"medium":6,"low":12}   (bulan)
--   methods          {"critical":{"label":"Critical","frequency":"…","method":"…","action":"…"}, …}
--   indicator_labels {"legal":"Legalitas dan administrasi", …}
create table public.scoring_params (
  version integer primary key constraint scoring_params_version_pos check (version > 0),
  weights jsonb not null,
  thresholds jsonb not null,
  intervals jsonb not null,
  methods jsonb not null default '{}'::jsonb,
  indicator_labels jsonb not null default '{}'::jsonb,
  effective_from date not null default current_date,
  approved_by uuid,
  is_active boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  constraint scoring_params_weights_valid check (
    jsonb_typeof(weights) = 'object'
    and weights ?& array['legal', 'control', 'physical', 'utilization', 'location', 'strategic']
    and (weights->>'legal')::numeric + (weights->>'control')::numeric + (weights->>'physical')::numeric
      + (weights->>'utilization')::numeric + (weights->>'location')::numeric + (weights->>'strategic')::numeric = 1
  ),
  constraint scoring_params_thresholds_valid check (
    thresholds ?& array['critical', 'high', 'medium']
    and (thresholds->>'critical')::numeric > (thresholds->>'high')::numeric
    and (thresholds->>'high')::numeric > (thresholds->>'medium')::numeric
    and (thresholds->>'medium')::numeric > 0
  ),
  constraint scoring_params_intervals_valid check (
    intervals ?& array['critical', 'high', 'medium', 'low']
    and (intervals->>'critical')::int > 0 and (intervals->>'high')::int > 0
    and (intervals->>'medium')::int > 0 and (intervals->>'low')::int > 0
  )
);
-- Tepat satu versi aktif.
create unique index scoring_params_one_active_idx on public.scoring_params (is_active) where is_active;

-- Rubrik per versi parameter (sheet "Kriteria Skor").
create table public.score_criteria (
  params_version integer not null references public.scoring_params (version) on delete cascade,
  indicator public.score_indicator not null,
  score smallint not null constraint score_criteria_score_range check (score between 1 and 5),
  description text not null,
  revised_from_excel boolean not null default false, -- PLAN §9.8 (Pemanfaatan skor 3)
  primary key (params_version, indicator, score)
);

-- Penilaian: riwayat append-only (PLAN §9.2). Skor kosong = NULL (≠ 1).
-- total_score/category/is_complete diisi trigger (bukan generated) karena bergantung pada scoring_params.
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets (id) on delete restrict,
  assessed_at date not null,
  params_version integer not null references public.scoring_params (version) on delete restrict,
  s_legal smallint constraint assessments_s_legal_range check (s_legal between 1 and 5),
  s_control smallint constraint assessments_s_control_range check (s_control between 1 and 5),
  s_physical smallint constraint assessments_s_physical_range check (s_physical between 1 and 5),
  s_utilization smallint constraint assessments_s_utilization_range check (s_utilization between 1 and 5),
  s_location smallint constraint assessments_s_location_range check (s_location between 1 and 5),
  s_strategic smallint constraint assessments_s_strategic_range check (s_strategic between 1 and 5),
  critical_override boolean not null default false,
  override_reason text,
  findings text,
  follow_up text,
  follow_up_pic text,
  target_date date,
  total_score numeric(4, 1),
  category public.risk_category, -- NULL = belum dinilai (tidak pernah dianggap low)
  is_complete boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint assessments_override_reason check (
    not critical_override or coalesce(btrim(override_reason), '') <> ''
  )
);
create index assessments_latest_idx on public.assessments (asset_id, assessed_at desc, created_at desc);
create index assessments_params_version_idx on public.assessments (params_version);

create table public.monitoring_events (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets (id) on delete restrict,
  monitored_at date not null,
  method public.monitoring_method not null,
  findings text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index monitoring_events_asset_idx on public.monitoring_events (asset_id, monitored_at desc);

-- Tanggal monitoring masa depan ditolak (D4). Memperbarui assets.last_monitored_at bila lebih baru,
-- atau bila nilai lama tidak valid (masa depan / kosong).
create function public.monitoring_events_apply()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.monitored_at > current_date then
    raise exception 'Tanggal monitoring tidak boleh di masa depan (%).', new.monitored_at
      using errcode = '22007';
  end if;
  if tg_op = 'INSERT' then
    update public.assets a
       set last_monitored_at = new.monitored_at
     where a.id = new.asset_id
       and (a.last_monitored_at is null
            or a.last_monitored_at > current_date
            or a.last_monitored_at < new.monitored_at);
  end if;
  return new;
end;
$$;
create trigger monitoring_events_check before insert or update on public.monitoring_events
  for each row execute function public.monitoring_events_apply();

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  file_path text,
  file_name text,
  status text not null default 'uploaded'
    constraint import_batches_status_valid check (status in ('uploaded', 'validated', 'committed', 'failed')),
  rows_total integer not null default 0,
  rows_ok integer not null default 0,
  rows_warn integer not null default 0,
  rows_error integer not null default 0,
  report jsonb not null default '{}'::jsonb,
  uploaded_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  committed_at timestamptz
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  row_id text not null, -- text: scoring_params memakai PK integer
  action text not null constraint audit_log_action_valid check (action in ('INSERT', 'UPDATE', 'DELETE')),
  before jsonb,
  after jsonb,
  actor uuid,
  at timestamptz not null default now()
);
create index audit_log_row_idx on public.audit_log (table_name, row_id, at desc);
