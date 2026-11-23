-- Fase 6 · "Hari ini" konsisten WIB (Asia/Jakarta), sama dengan validasi zod.
-- current_date mengikuti zona sesi (UTC di Supabase) sehingga 00:00–07:00 WIB tanggal hari ini ditolak.
-- ponytail: view/RPC (v_asset_latest, v_data_quality_issues, dashboard_summary) masih memakai current_date;
-- selisih maks 1 hari pada 00:00–07:00 WIB. Ganti ke public.today_wib() bila paritas pgTAP ikut disesuaikan.

create function public.today_wib(p_at timestamptz default now())
returns date
language sql
stable
set search_path = ''
as $$
  select (p_at at time zone 'Asia/Jakarta')::date
$$;
grant execute on function public.today_wib(timestamptz) to authenticated;

create or replace function public.monitoring_events_apply()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_today date := public.today_wib();
begin
  if new.monitored_at > v_today then
    raise exception 'Tanggal monitoring tidak boleh di masa depan (%).', new.monitored_at
      using errcode = '22007';
  end if;
  if tg_op = 'INSERT' then
    update public.assets a
       set last_monitored_at = new.monitored_at
     where a.id = new.asset_id
       and (a.last_monitored_at is null
            or a.last_monitored_at > v_today
            or a.last_monitored_at < new.monitored_at);
  end if;
  return new;
end;
$$;

-- Tanggal penilaian masa depan ditolak (sebelumnya hanya zod). Hanya saat insert/ubah tanggal,
-- agar update kolom lain pada baris lama tidak ikut gagal.
create function public.assessments_reject_future()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.assessed_at > public.today_wib() then
    raise exception 'Tanggal penilaian tidak boleh di masa depan (%).', new.assessed_at
      using errcode = '22007';
  end if;
  return new;
end;
$$;
revoke execute on function public.assessments_reject_future() from public, anon, authenticated;
create trigger assessments_reject_future before insert or update of assessed_at on public.assessments
  for each row execute function public.assessments_reject_future();
