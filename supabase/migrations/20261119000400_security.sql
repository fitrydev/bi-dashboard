-- Fase 2 · 4/5 — Keamanan: allowlist, role, RLS, auth hook, sinkron profil, audit trail.

-- ===== Helper akses =====
-- Email dibaca dari JWT: lower(auth.jwt()->>'email'). auth.jwt() membaca setting
-- request.jwt.claims, jadi test bisa memalsukan: set local request.jwt.claims = '{"email":"..","sub":".."}'.
-- SECURITY DEFINER agar tidak memicu RLS allowed_emails secara rekursif.
create function public.is_allowed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.allowed_emails ae
    where ae.email = lower(auth.jwt()->>'email')
  )
$$;

-- Hirarki admin ⊇ editor ⊇ viewer (urutan enum app_role).
create function public.has_role(p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.allowed_emails ae
    where ae.email = lower(auth.jwt()->>'email')
      and ae.role >= p_role
  )
$$;

-- Role user saat ini (NULL bila tidak di allowlist) — untuk UI/guard Server Action.
create function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select ae.role from public.allowed_emails ae where ae.email = lower(auth.jwt()->>'email')
$$;

-- ===== Auth Hook "Before User Created" (PLAN §3.2 lapis 1) =====
-- Dipanggil GoTrue sebagai supabase_auth_admin. Mengembalikan '{}' untuk lolos, atau
-- {"error":{"http_code":403,"message":...}} untuk menolak (format resmi Supabase).
create function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_email text := lower(btrim(event->'user'->>'email'));
begin
  if v_email is null or v_email = ''
     or not exists (select 1 from public.allowed_emails ae where ae.email = v_email) then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'Email ini tidak terdaftar sebagai pengguna aplikasi. Hubungi admin untuk meminta akses.'
    ));
  end if;
  return '{}'::jsonb;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant select on table public.allowed_emails to supabase_auth_admin;

-- ===== Sinkron profiles dari auth.users =====
create function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = now();
  return new;
end;
$$;
create trigger on_auth_user_synced
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function public.sync_profile_from_auth();

-- ===== Audit trail (assets, assessments, scoring_params) =====
-- SECURITY DEFINER: authenticated tidak punya hak insert ke audit_log.
create function public.audit_row()
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
  values (tg_table_name, coalesce(v_row->>'id', v_row->>'version'), tg_op, v_old, v_new, auth.uid());
  return null;
end;
$$;
create trigger audit_assets after insert or update or delete on public.assets
  for each row execute function public.audit_row();
create trigger audit_assessments after insert or update or delete on public.assessments
  for each row execute function public.audit_row();
create trigger audit_scoring_params after insert or update or delete on public.scoring_params
  for each row execute function public.audit_row();

-- ===== Hak tabel =====
-- RLS adalah gerbang utama; tambahan: TRUNCATE melewati RLS → dicabut. audit_log hanya-baca.
revoke all on all tables in schema public from anon;
revoke truncate on all tables in schema public from authenticated;
revoke insert, update, delete on table public.audit_log from authenticated;

-- ===== RLS =====
alter table public.allowed_emails enable row level security;
alter table public.profiles enable row level security;
alter table public.regions enable row level security;
alter table public.region_aliases enable row level security;
alter table public.utilization_aliases enable row level security;
alter table public.assets enable row level security;
alter table public.scoring_params enable row level security;
alter table public.score_criteria enable row level security;
alter table public.assessments enable row level security;
alter table public.monitoring_events enable row level security;
alter table public.import_batches enable row level security;
alter table public.audit_log enable row level security;

-- allowed_emails: user melihat barisnya sendiri; admin kelola semua; hook membaca semua.
create policy allowed_emails_select on public.allowed_emails for select to authenticated
  using (email = lower((select auth.jwt())->>'email') or (select public.has_role('admin')));
create policy allowed_emails_insert on public.allowed_emails for insert to authenticated
  with check ((select public.has_role('admin')));
create policy allowed_emails_update on public.allowed_emails for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
create policy allowed_emails_delete on public.allowed_emails for delete to authenticated
  using ((select public.has_role('admin')));
create policy allowed_emails_auth_hook on public.allowed_emails for select to supabase_auth_admin
  using (true);

-- profiles: dibaca semua user allowlist (nama aktor/PIC); hanya nama sendiri yang bisa diubah.
create policy profiles_select on public.profiles for select to authenticated
  using ((select public.is_allowed()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) and (select public.is_allowed()))
  with check (id = (select auth.uid()));

-- Tabel referensi: baca = allowlist, ubah = admin.
create policy regions_select on public.regions for select to authenticated
  using ((select public.is_allowed()));
create policy regions_insert on public.regions for insert to authenticated
  with check ((select public.has_role('admin')));
create policy regions_update on public.regions for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
create policy regions_delete on public.regions for delete to authenticated
  using ((select public.has_role('admin')));

create policy region_aliases_select on public.region_aliases for select to authenticated
  using ((select public.is_allowed()));
create policy region_aliases_insert on public.region_aliases for insert to authenticated
  with check ((select public.has_role('admin')));
create policy region_aliases_update on public.region_aliases for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
create policy region_aliases_delete on public.region_aliases for delete to authenticated
  using ((select public.has_role('admin')));

create policy utilization_aliases_select on public.utilization_aliases for select to authenticated
  using ((select public.is_allowed()));
create policy utilization_aliases_insert on public.utilization_aliases for insert to authenticated
  with check ((select public.has_role('admin')));
create policy utilization_aliases_update on public.utilization_aliases for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
create policy utilization_aliases_delete on public.utilization_aliases for delete to authenticated
  using ((select public.has_role('admin')));

-- assets: editor tambah/ubah; hapus hanya admin (UI memakai is_active = soft delete).
create policy assets_select on public.assets for select to authenticated
  using ((select public.is_allowed()));
create policy assets_insert on public.assets for insert to authenticated
  with check ((select public.has_role('editor')));
create policy assets_update on public.assets for update to authenticated
  using ((select public.has_role('editor'))) with check ((select public.has_role('editor')));
create policy assets_delete on public.assets for delete to authenticated
  using ((select public.has_role('admin')));

-- Parameter & rubrik: hanya admin yang mengubah.
create policy scoring_params_select on public.scoring_params for select to authenticated
  using ((select public.is_allowed()));
create policy scoring_params_insert on public.scoring_params for insert to authenticated
  with check ((select public.has_role('admin')));
create policy scoring_params_update on public.scoring_params for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
create policy scoring_params_delete on public.scoring_params for delete to authenticated
  using ((select public.has_role('admin')));

create policy score_criteria_select on public.score_criteria for select to authenticated
  using ((select public.is_allowed()));
create policy score_criteria_insert on public.score_criteria for insert to authenticated
  with check ((select public.has_role('admin')));
create policy score_criteria_update on public.score_criteria for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
create policy score_criteria_delete on public.score_criteria for delete to authenticated
  using ((select public.has_role('admin')));

-- assessments: append-only untuk editor; koreksi/hapus hanya admin (diaudit).
create policy assessments_select on public.assessments for select to authenticated
  using ((select public.is_allowed()));
create policy assessments_insert on public.assessments for insert to authenticated
  with check ((select public.has_role('editor')));
create policy assessments_update on public.assessments for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
create policy assessments_delete on public.assessments for delete to authenticated
  using ((select public.has_role('admin')));

create policy monitoring_events_select on public.monitoring_events for select to authenticated
  using ((select public.is_allowed()));
create policy monitoring_events_insert on public.monitoring_events for insert to authenticated
  with check ((select public.has_role('editor')));
create policy monitoring_events_update on public.monitoring_events for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
create policy monitoring_events_delete on public.monitoring_events for delete to authenticated
  using ((select public.has_role('admin')));

-- import_batches: editor membuat & memperbarui status batch miliknya sendiri; admin semua.
create policy import_batches_select on public.import_batches for select to authenticated
  using ((select public.is_allowed()));
create policy import_batches_insert on public.import_batches for insert to authenticated
  with check ((select public.has_role('editor')));
create policy import_batches_update on public.import_batches for update to authenticated
  using ((select public.has_role('admin'))
         or (uploaded_by = (select auth.uid()) and (select public.has_role('editor'))))
  with check ((select public.has_role('admin'))
              or (uploaded_by = (select auth.uid()) and (select public.has_role('editor'))));
create policy import_batches_delete on public.import_batches for delete to authenticated
  using ((select public.has_role('admin')));

-- audit_log: hanya admin membaca; tidak ada policy tulis (insert hanya via audit_row()).
create policy audit_log_select on public.audit_log for select to authenticated
  using ((select public.has_role('admin')));

-- profiles: kolom yang boleh diubah user hanya full_name (email/id dikelola trigger).
revoke update on table public.profiles from authenticated;
grant update (full_name) on table public.profiles to authenticated;
