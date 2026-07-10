-- ============================================================================
-- THS OS — 0010: Auth hardening (account lockout, profiles.email)
--
-- profiles never stored email (DATABASE_SCHEMA.sql keeps it purely on
-- auth.users) but almost every admin/audit screen needs to display it, and
-- login lockout needs to resolve email -> profile before a session exists —
-- denormalizing it here (kept in sync at profile-creation time by
-- create_profile_for_new_user(), below) is simpler than a view over
-- auth.users, which client code can't query directly anyway.
-- ============================================================================

alter table public.profiles add column email text;
create unique index profiles_email_uniq on public.profiles (lower(email)) where deleted_at is null;

-- Fired on every new Supabase Auth signup (Administration → Users creates
-- accounts via supabase.auth.admin.createUser(), which raises this same
-- auth.users insert). Bootstraps a profiles row so a freshly created user
-- always has one — no separate "finish onboarding" step, since THS OS is
-- single-tenant and there's nothing left to configure per-tenant.
create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'cleaner')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

-- Account lockout (TECH_SPEC.md security checklist: "account lockout after
-- N failed logins"). Both RPCs are SECURITY DEFINER so they can resolve
-- auth.users -> profiles before a session exists (record_failed_login) or
-- write failed_login_count back to 0 without a broader profiles UPDATE
-- grant (record_successful_login).
create or replace function public.profile_id_for_email(p_email text)
returns table (id uuid, is_suspended boolean, failed_login_count int)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.is_suspended, p.failed_login_count
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = lower(p_email) and p.deleted_at is null;
$$;
revoke execute on function public.profile_id_for_email(text) from anon, public;
grant execute on function public.profile_id_for_email(text) to authenticated, anon;
-- (login itself is necessarily pre-session, so this one legitimately needs
-- anon — it returns no PII beyond lockout state, never the email back.)

create or replace function public.record_failed_login(p_email text, p_max_attempts int default 5)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles p
     set failed_login_count = p.failed_login_count + 1,
         is_suspended = (p.failed_login_count + 1) >= p_max_attempts
    from auth.users u
   where u.id = p.id and lower(u.email) = lower(p_email) and p.deleted_at is null;
end;
$$;
revoke execute on function public.record_failed_login(text, int) from public;
grant execute on function public.record_failed_login(text, int) to authenticated, anon;

create or replace function public.record_successful_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set failed_login_count = 0, last_login_at = now() where id = auth.uid();
end;
$$;
revoke execute on function public.record_successful_login() from anon, public;
