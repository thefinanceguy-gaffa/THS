-- ============================================================================
-- THS OS — 0005: Operations & Scheduling (teams, jobs, field capture)
-- ============================================================================

create or replace function public.set_job_number()
returns trigger
language plpgsql
as $$
begin
  new.number := public.next_document_number('job', 'THS');
  return new;
end;
$$;

create table public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,                     -- Team A
  leader_id  uuid references public.profiles(id) on delete set null,
  branch_id  uuid references public.branches(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.jobs (
  id               uuid primary key default gen_random_uuid(),
  number           text unique not null,            -- THS-2418
  customer_id      uuid references public.customers(id) on delete set null,
  contract_id      uuid,                             -- fk added in 0007_finance.sql (contracts is defined there)
  site_address     text,
  suburb           text,
  service_type     text,
  team_id          uuid references public.teams(id) on delete set null,
  supervisor_id    uuid references public.profiles(id) on delete set null,
  status           job_status not null default 'scheduled',
  priority         text not null default 'normal',
  scheduled_start  timestamptz,
  scheduled_end    timestamptz,
  progress         int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index idx_jobs_team on public.jobs(team_id) where deleted_at is null;
create index idx_jobs_supervisor on public.jobs(supervisor_id) where deleted_at is null;
create index idx_jobs_status on public.jobs(status) where deleted_at is null;
create index idx_jobs_scheduled_start on public.jobs(scheduled_start) where deleted_at is null;
create trigger trg_jobs_updated_at before update on public.jobs for each row execute function public.set_updated_at();
create trigger trg_jobs_number before insert on public.jobs
  for each row when (new.number is null)
  execute function public.set_job_number();

-- Field capture (Supervisor/Cleaner mobile) — offline-syncable. One row per
-- discrete event rather than one wide "job detail" row, so the offline
-- outbox (lib/offline/) can replay a queue of these idempotently by
-- client_generated_id exactly like semillaPOS's sales/stock_movements do.
create table public.job_events (
  id                 uuid primary key default gen_random_uuid(),
  job_id             uuid references public.jobs(id) on delete cascade,
  type               text not null,                 -- check_in / check_out / photo_before / photo_after / checklist / chemical / equipment / incident / signature
  payload            jsonb,                          -- flexible: gps, url, qty, notes
  gps_lat            numeric(9,6),
  gps_lng            numeric(9,6),
  captured_by        uuid references public.profiles(id) on delete set null,
  captured_at        timestamptz not null default now(),
  synced_at          timestamptz,
  client_generated_id text unique                    -- offline dedupe on sync
);
create index idx_job_events_job on public.job_events(job_id, captured_at);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.teams      enable row level security;
alter table public.jobs       enable row level security;
alter table public.job_events enable row level security;

create policy teams_select on public.teams for select using (auth.uid() is not null);
create policy teams_write on public.teams for all using (
  public.has_role(array['owner','admin','ops_manager']::user_role[])
) with check (
  public.has_role(array['owner','admin','ops_manager']::user_role[])
);

-- Jobs: Owner/Admin/Ops see all; Supervisor/Cleaner see jobs on their team;
-- client sees only its own jobs.
create policy jobs_select on public.jobs for select using (
  public.has_role(array['owner','admin','ops_manager']::user_role[])
  or supervisor_id = auth.uid()
  or exists (select 1 from public.teams t where t.id = jobs.team_id and t.leader_id = auth.uid())
  or (public.current_user_role() = 'client' and customer_id = (select customer_id from public.profiles where id = auth.uid()))
);
create policy jobs_insert on public.jobs for insert with check (
  public.has_role(array['owner','admin','ops_manager']::user_role[])
);
-- "Edit / delete jobs": Owner/Admin/Ops Mgr only. "Close jobs": also
-- Supervisor. Both are UPDATE in this schema (status/soft-delete are both
-- column writes) — Supervisor is included here and the app layer only
-- exposes the "close job" affordance to Supervisors, not full-record edit.
create policy jobs_update on public.jobs for update using (
  public.has_role(array['owner','admin','ops_manager']::user_role[]) or supervisor_id = auth.uid()
);

create policy job_events_select on public.job_events for select using (
  exists (
    select 1 from public.jobs j where j.id = job_events.job_id
    and (
      public.has_role(array['owner','admin','ops_manager']::user_role[])
      or j.supervisor_id = auth.uid()
      or exists (select 1 from public.teams t where t.id = j.team_id and t.leader_id = auth.uid())
    )
  )
);
-- "Check-in / photos / checklist": Owner/Ops Mgr/Supervisor/Cleaner.
create policy job_events_insert on public.job_events for insert with check (
  public.has_role(array['owner','ops_manager','supervisor','cleaner']::user_role[])
);
