-- ============================================================================
-- THS OS — 0002: Core platform (enums, branches, profiles, RBAC)
--
-- Single-tenant by design (one company, THS) — unlike a multi-tenant SaaS
-- schema there is no business_id anywhere; every table is scoped by branch
-- and by role/ownership instead. Roles are a fixed enum (RBAC_MATRIX.md's 9
-- roles + client) rather than a customizable roles table, with
-- `permission_overrides` layered on top for the one-off per-user exceptions
-- the spec calls for ("Owner can flip a single permission for one user").
-- ============================================================================

create type user_role as enum
  ('owner','admin','bus_dev','ops_manager','supervisor','cleaner',
   'finance','procurement','hr','client');

create type lead_stage as enum
  ('new','contacted','qualified','site_visit','quotation','negotiation',
   'won','lost','onboarding','active','repeat');

create type lead_source as enum
  ('whatsapp','website','facebook','instagram','linkedin','google_business',
   'referral','walk_in','qr_code','phone','email','google_form','tender',
   'cold_call','networking_event','ai_prospecting');

create type quote_status as enum
  ('draft','pending_review','pending_owner','sent','negotiation',
   'awaiting_client','accepted','rejected','expired');

create type job_status as enum
  ('scheduled','en_route','in_progress','completed','cancelled');

create type invoice_status as enum ('draft','sent','part_paid','paid','overdue','cancelled');

create type approval_status as enum ('pending','approved','rejected');

create type currency_code as enum ('USD','ZIG');

-- ----------------------------------------------------------------------------
-- Generic helpers reused by every table below
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Atomic per-document-type sequence (single-tenant, so no business_id
-- partition like semillaPOS — just counter_type). Used by quotations,
-- invoices, purchase orders, site assessments, jobs, payments, ...
create table public.document_counters (
  counter_type  text primary key,     -- 'quotation', 'invoice', 'purchase_order', ...
  current_value bigint not null default 0
);

create or replace function public.next_document_number(p_counter_type text, p_prefix text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_value bigint;
begin
  insert into public.document_counters (counter_type, current_value)
  values (p_counter_type, 1)
  on conflict (counter_type)
  do update set current_value = public.document_counters.current_value + 1
  returning current_value into v_value;

  return p_prefix || '-' || lpad(v_value::text, 4, '0');
end;
$$;
revoke execute on function public.next_document_number(text, text) from anon, public;

-- ----------------------------------------------------------------------------
-- ORG / TENANCY
-- ----------------------------------------------------------------------------
create table public.branches (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  city       text default 'Harare',
  is_main    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_branches_updated_at before update on public.branches for each row execute function public.set_updated_at();

-- Mirrors auth.users; app-level profile + role.
create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  full_name             text not null,
  role                  user_role not null default 'cleaner',
  branch_id             uuid references public.branches(id) on delete set null,
  reporting_manager_id  uuid references public.profiles(id) on delete set null,
  job_title             text,
  department            text,
  approval_limit_usd    numeric(12,2) not null default 0,
  phone                 text,
  -- Set only for role = 'client': scopes the client portal to exactly one
  -- customer via RLS (see 0009_audit_and_rls.sql).
  customer_id           uuid,
  is_active             boolean not null default true,
  is_suspended          boolean not null default false,
  two_factor_enabled    boolean not null default false,
  default_landing_page  text not null default '/dashboard',
  last_login_at         timestamptz,
  failed_login_count    int not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);
create index idx_profiles_branch on public.profiles(branch_id) where deleted_at is null;
create index idx_profiles_manager on public.profiles(reporting_manager_id) where deleted_at is null;
create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

-- Per-user permission overrides on top of role defaults.
create table public.permission_overrides (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  permission_key text not null,          -- e.g. 'quotes.approve'
  allowed       boolean not null,
  created_at    timestamptz not null default now(),
  unique(profile_id, permission_key)
);

-- ----------------------------------------------------------------------------
-- RBAC helper functions — every RLS policy in this schema is built from
-- these so permission logic lives in one place instead of being re-derived
-- per table. Named current_user_role() (not current_role) to avoid
-- colliding with the SQL-standard CURRENT_ROLE session variable.
-- ----------------------------------------------------------------------------
create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid();
$$;

create or replace function public.is_owner() returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_role() = 'owner';
$$;

-- "Owner+" convenience used by the many policies where Admin also gets full
-- read/manage but Owner alone can delete/purge (RBAC_MATRIX.md System table).
create or replace function public.is_owner_or_admin() returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_role() in ('owner','admin');
$$;

create or replace function public.has_role(p_roles user_role[]) returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_role() = any(p_roles);
$$;

-- Effective permission = override if the Owner has set one for this user,
-- else the caller decides the role-default fallback. Returns null (not
-- false) when no override exists, so callers can `coalesce(get_override(...), <role default>)`.
create or replace function public.get_override(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select allowed from public.permission_overrides
  where profile_id = auth.uid() and permission_key = p_key;
$$;

-- Organisation hierarchy chain (RBAC_MATRIX.md: "a manager can see the
-- records of people who report to them"). True if the current user is
-- p_profile_id itself or anywhere above it in the reporting_manager_id chain.
create or replace function public.is_self_or_manager_of(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with recursive chain as (
    select id, reporting_manager_id from public.profiles where id = p_profile_id
    union all
    select p.id, p.reporting_manager_id
    from public.profiles p
    join chain c on p.id = c.reporting_manager_id
  )
  -- chain's first row is p_profile_id itself, then each row up is its
  -- manager, so membership in `chain` covers both the self-case and every
  -- ancestor manager in one check.
  select exists (select 1 from chain where id = auth.uid());
$$;

comment on function public.is_self_or_manager_of is
  'True if auth.uid() is p_profile_id, or is anywhere in p_profile_id''s manager chain (walks reporting_manager_id upward). Used to let a manager see records owned by anyone who reports to them, directly or transitively.';

-- ----------------------------------------------------------------------------
-- RLS: branches, profiles, permission_overrides
-- ----------------------------------------------------------------------------
alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.permission_overrides enable row level security;

create policy branches_select on public.branches for select using (auth.uid() is not null);
create policy branches_write on public.branches for all using (public.is_owner_or_admin()) with check (public.is_owner_or_admin());

-- Everyone authenticated can read their own profile + colleagues (needed for
-- owner/assignee pickers everywhere); Owner/Admin/HR can read every field,
-- everyone else still only sees the same row set (no separate narrow view —
-- sensitive HR fields live in employee_records, which is locked down harder).
create policy profiles_select on public.profiles for select using (auth.uid() is not null);
create policy profiles_update_self on public.profiles for update using (id = auth.uid());
create policy profiles_write_admin on public.profiles for all using (public.is_owner_or_admin()) with check (public.is_owner_or_admin());

create policy permission_overrides_select on public.permission_overrides for select using (
  profile_id = auth.uid() or public.is_owner()
);
create policy permission_overrides_write on public.permission_overrides for all using (public.is_owner()) with check (public.is_owner());

-- document_counters is only ever touched through next_document_number()
-- (SECURITY DEFINER, owned by a role that bypasses RLS) — RLS is enabled
-- with zero policies so PostgREST denies direct client access entirely.
alter table public.document_counters enable row level security;
