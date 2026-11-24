-- Fase 9 hardening.
-- Peran dicocokkan lewat auth.jwt()->>'email' (is_allowed/has_role). Login hanya Google, jadi email
-- auth.users tidak pernah perlu berubah: tolak perubahan agar ganti email (mis. "secure email change"
-- mati di hosted) tidak bisa mengambil alih entri allowlist orang lain.
-- ponytail: user yang email Google-nya berganti perlu ditambahkan ulang ke allowlist (akun baru).
create function public.auth_users_email_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.email is not null and new.email is distinct from old.email then
    raise exception 'Email akun tidak dapat diubah.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.auth_users_email_immutable() from public, anon, authenticated;

create trigger auth_users_email_immutable
  before update of email on auth.users
  for each row execute function public.auth_users_email_immutable();
