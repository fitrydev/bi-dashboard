-- Fase 6 · penjaga tulis (temuan review keamanan P2). Hanya menambah.
-- 1) Non-admin tidak boleh memilih params_version sendiri saat INSERT penilaian
--    (bobot/ambang versi lama bisa menurunkan kategori). Admin/rescore tetap bebas.
-- 2) Penilaian & monitoring baru hanya untuk aset aktif (soft delete = is_active false).
-- 3) Batas panjang teks bebas = batas zod (lib/schemas), agar PostgREST langsung tidak bisa
--    menyimpan teks MB. NOT VALID: data lama tidak diperiksa ulang (seed sudah jauh di bawah batas).

create function public.assessments_guard_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    new.params_version := public.active_params_version();
  end if;
  if not exists (select 1 from public.assets a where a.id = new.asset_id and a.is_active) then
    raise exception 'Aset nonaktif tidak bisa dinilai.' using errcode = '23514';
  end if;
  return new;
end;
$$;
-- Nama "assessments_a…" < "assessments_compute": trigger BEFORE jalan urut abjad, jadi versi
-- dipaksa sebelum skor dihitung.
create trigger assessments_aa_guard before insert on public.assessments
  for each row execute function public.assessments_guard_insert();

create function public.monitoring_events_guard_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.assets a where a.id = new.asset_id and a.is_active) then
    raise exception 'Aset nonaktif tidak bisa dimonitor.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger monitoring_events_aa_guard before insert on public.monitoring_events
  for each row execute function public.monitoring_events_guard_insert();

revoke execute on function public.assessments_guard_insert() from public, anon, authenticated;
revoke execute on function public.monitoring_events_guard_insert() from public, anon, authenticated;

alter table public.assets
  add constraint assets_text_len check (
    length(asset_code) <= 64 and length(name) <= 300 and coalesce(length(address), 0) <= 1000
    and coalesce(length(legal_status), 0) <= 200 and coalesce(length(pic_unit), 0) <= 200
    and coalesce(length(notes), 0) <= 4000 and coalesce(length(utilization_raw), 0) <= 200
  ) not valid;
alter table public.assessments
  add constraint assessments_text_len check (
    coalesce(length(override_reason), 0) <= 2000 and coalesce(length(findings), 0) <= 4000
    and coalesce(length(follow_up), 0) <= 4000 and coalesce(length(follow_up_pic), 0) <= 200
  ) not valid;
alter table public.monitoring_events
  add constraint monitoring_events_text_len check (coalesce(length(findings), 0) <= 4000) not valid;
