-- Kolom aktor tidak boleh dipalsukan klien: insert → auth.uid() (null bila dijalankan
-- postgres/seed), update → nilai lama dipertahankan. Kolom diberikan lewat argumen trigger.
create function public.stamp_actor()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  col text := tg_argv[0];
begin
  if tg_op = 'INSERT' then
    new := jsonb_populate_record(new, jsonb_build_object(col, auth.uid()));
  else
    new := jsonb_populate_record(new, jsonb_build_object(col, to_jsonb(old) -> col));
  end if;
  return new;
end;
$$;
revoke execute on function public.stamp_actor() from public, anon, authenticated;

create trigger allowed_emails_actor before insert or update on public.allowed_emails
  for each row execute function public.stamp_actor('added_by');
create trigger assets_actor before insert or update on public.assets
  for each row execute function public.stamp_actor('created_by');
create trigger scoring_params_actor before insert or update on public.scoring_params
  for each row execute function public.stamp_actor('created_by');
create trigger assessments_actor before insert or update on public.assessments
  for each row execute function public.stamp_actor('created_by');
create trigger monitoring_events_actor before insert or update on public.monitoring_events
  for each row execute function public.stamp_actor('created_by');
create trigger import_batches_actor before insert or update on public.import_batches
  for each row execute function public.stamp_actor('uploaded_by');

-- Bobot tidak boleh negatif (Σ = 1 sudah dicek di constraint lain).
alter table public.scoring_params add constraint scoring_params_weights_nonneg check (
  least((weights->>'legal')::numeric, (weights->>'control')::numeric, (weights->>'physical')::numeric,
        (weights->>'utilization')::numeric, (weights->>'location')::numeric, (weights->>'strategic')::numeric) >= 0
);
