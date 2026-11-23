-- Fase 6 · Draf penilaian per user per aset (autosave form). Bukan riwayat: dihapus saat penilaian disimpan.
create table public.assessment_drafts (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets (id) on delete cascade,
  -- Tanpa FK ke auth.users (pola kolom aktor). Dipaksa auth.uid() oleh stamp_actor.
  user_id uuid not null default auth.uid(),
  data jsonb not null default '{}'::jsonb
    constraint assessment_drafts_data_object check (jsonb_typeof(data) = 'object')
    constraint assessment_drafts_data_size check (octet_length(data::text) <= 65536),
  updated_at timestamptz not null default now(),
  constraint assessment_drafts_asset_user_key unique (asset_id, user_id)
);
create index assessment_drafts_user_idx on public.assessment_drafts (user_id);

create trigger assessment_drafts_actor before insert or update on public.assessment_drafts
  for each row execute function public.stamp_actor('user_id');

create function public.assessment_drafts_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function public.assessment_drafts_touch() from public, anon, authenticated;
create trigger assessment_drafts_touch before update on public.assessment_drafts
  for each row execute function public.assessment_drafts_touch();

revoke all on table public.assessment_drafts from anon;
revoke truncate on table public.assessment_drafts from authenticated;

alter table public.assessment_drafts enable row level security;

-- Hanya pemilik yang masih editor+. Draf orang lain tidak terlihat, termasuk oleh admin.
create policy assessment_drafts_select on public.assessment_drafts for select to authenticated
  using (user_id = (select auth.uid()) and (select public.has_role('editor')));
create policy assessment_drafts_insert on public.assessment_drafts for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.has_role('editor')));
create policy assessment_drafts_update on public.assessment_drafts for update to authenticated
  using (user_id = (select auth.uid()) and (select public.has_role('editor')))
  with check (user_id = (select auth.uid()) and (select public.has_role('editor')));
create policy assessment_drafts_delete on public.assessment_drafts for delete to authenticated
  using (user_id = (select auth.uid()) and (select public.has_role('editor')));
