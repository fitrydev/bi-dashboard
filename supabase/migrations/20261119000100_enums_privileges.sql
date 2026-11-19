-- Fase 2 · 1/5 — Hak akses default + enum.
-- Prinsip: anon tidak boleh menyentuh apa pun di schema public. Default privileges dicabut
-- SEBELUM objek dibuat agar tabel/fungsi baru tidak otomatis terbuka untuk anon/public.

alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on functions from anon;
-- EXECUTE untuk PUBLIC adalah default global (tidak bisa dicabut per-schema).
alter default privileges for role postgres revoke execute on functions from public;
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon, public;

create type public.asset_type as enum ('tanah', 'bangunan', 'gabungan');

-- Daftar validasi Excel (PLAN §9.3). Label Indonesia lewat public.utilization_label().
create type public.utilization_status as enum (
  'digunakan_sendiri',     -- Digunakan sendiri
  'disewakan_kerja_sama',  -- Disewakan/Kerja sama
  'idle_kosong',           -- Idle/Kosong
  'digunakan_pihak_lain',  -- Digunakan pihak lain
  'lainnya'                -- Lainnya
);

create type public.risk_category as enum ('critical', 'high', 'medium', 'low');

-- Urutan enum = hirarki (viewer < editor < admin); has_role() memakai perbandingan >=.
create type public.app_role as enum ('viewer', 'editor', 'admin');

create type public.monitoring_method as enum ('site_visit', 'remote', 'desk_review');

-- Urutan indikator ini juga urutan elemen array di compute_score().
create type public.score_indicator as enum ('legal', 'control', 'physical', 'utilization', 'location', 'strategic');

create function public.utilization_label(p public.utilization_status)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p
    when 'digunakan_sendiri' then 'Digunakan sendiri'
    when 'disewakan_kerja_sama' then 'Disewakan/Kerja sama'
    when 'idle_kosong' then 'Idle/Kosong'
    when 'digunakan_pihak_lain' then 'Digunakan pihak lain'
    when 'lainnya' then 'Lainnya'
  end
$$;
