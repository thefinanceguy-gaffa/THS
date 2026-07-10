-- ============================================================================
-- THS OS — 0015: Expenses (README.md Finance group's 4th surface module;
-- not in the original DATABASE_SCHEMA.sql handoff — added here since the
-- nav and BUILD_ROADMAP.md's "Surface modules" section both call for it as
-- a standard list+detail CRUD screen).
-- ============================================================================

create table public.expenses (
  id           uuid primary key default gen_random_uuid(),
  category     text not null,             -- Fuel / Chemicals / Payroll / Rent / Utilities / Other
  description  text,
  amount_usd   numeric(12,2) not null,
  branch_id    uuid references public.branches(id) on delete set null,
  incurred_on  date not null default current_date,
  recorded_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index idx_expenses_incurred on public.expenses(incurred_on) where deleted_at is null;
create trigger audit_expenses after insert or update or delete on public.expenses for each row execute function public.fn_audit();

alter table public.expenses enable row level security;

create policy expenses_select on public.expenses for select using (
  public.has_role(array['owner','finance']::user_role[])
);
create policy expenses_insert on public.expenses for insert with check (
  public.has_role(array['owner','finance']::user_role[])
);
create policy expenses_update on public.expenses for update using (
  public.has_role(array['owner','finance']::user_role[])
);
