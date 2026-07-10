-- ============================================================================
-- THS OS — 0008: HR & Notifications
-- ============================================================================

create table public.employee_records (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references public.profiles(id) on delete cascade,
  type        text not null,                     -- leave / attendance / training / review / disciplinary / contract / ppe / uniform
  title       text,
  detail      text,
  status      text,
  effective_on date,
  expires_on   date,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index idx_employee_records_profile on public.employee_records(profile_id, type);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  channel    text not null default 'in_app',      -- in_app / email / sms / whatsapp / push
  title      text,
  body       text,
  link       text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_profile on public.notifications(profile_id, is_read, created_at desc);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.employee_records enable row level security;
alter table public.notifications    enable row level security;

-- "Manage employees / payroll": Owner + HR. Everyone can read their own
-- records (leave balance, training history, PPE register are all things an
-- employee should be able to see about themselves), plus their manager
-- chain, per the org-hierarchy visibility rule.
create policy employee_records_select on public.employee_records for select using (
  public.has_role(array['owner','hr']::user_role[])
  or profile_id = auth.uid()
  or public.is_self_or_manager_of(profile_id)
);
create policy employee_records_write on public.employee_records for all using (
  public.has_role(array['owner','hr']::user_role[])
) with check (
  public.has_role(array['owner','hr']::user_role[])
);

create policy notifications_select on public.notifications for select using (profile_id = auth.uid());
create policy notifications_update on public.notifications for update using (profile_id = auth.uid());
-- Notifications are otherwise written by SECURITY DEFINER triggers/RPCs
-- (bypassing RLS) — no general insert policy for authenticated users.
