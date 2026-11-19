begin;
select plan(7);

insert into public.allowed_emails (email, role) values ('boleh@uji.test', 'viewer');

select is(public.hook_before_user_created('{"user":{"email":"boleh@uji.test"}}'), '{}'::jsonb, 'allowlist -> {}');
select is(public.hook_before_user_created('{"user":{"email":"  BOLEH@Uji.test "}}'), '{}'::jsonb, 'email dinormalisasi (trim + lower)');
select is(public.hook_before_user_created('{"user":{"email":"asing@uji.test"}}') #>> '{error,http_code}', '403', 'non-allowlist -> error 403');
select ok(public.hook_before_user_created('{"user":{}}') ? 'error', 'tanpa email -> error');

select ok(has_function_privilege('supabase_auth_admin', 'public.hook_before_user_created(jsonb)', 'execute'), 'supabase_auth_admin boleh execute');
select ok(not has_function_privilege('anon', 'public.hook_before_user_created(jsonb)', 'execute'), 'anon tidak boleh execute');
select ok(not has_function_privilege('authenticated', 'public.hook_before_user_created(jsonb)', 'execute'), 'authenticated tidak boleh execute');

select * from finish();
rollback;
