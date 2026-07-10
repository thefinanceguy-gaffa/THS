-- ============================================================================
-- THS OS — 0019: Marketing campaigns (README.md's GROWTH group / "Surface
-- modules" section calls for Marketing as a standard list+detail CRUD
-- screen with KPI cards + a records table; not in the original
-- DATABASE_SCHEMA.sql handoff, added here the same way expenses was in
-- 0015). Leads already carry a `source` column (0003_crm.sql) — a campaign
-- is linked to leads it generated via `leads.campaign_id` so "leads
-- generated" and cost-per-lead can be computed from real data rather than
-- a manually-entered counter.
-- ============================================================================

create table public.campaigns (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  channel      text not null,             -- WhatsApp / Facebook / Google Ads / Referral / Flyers / Email / Other
  status       text not null default 'planned', -- planned / active / paused / completed
  budget_usd   numeric(12,2) not null default 0,
  starts_on    date,
  ends_on      date,
  notes        text,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create trigger trg_campaigns_updated_at before update on public.campaigns for each row execute function public.set_updated_at();
create trigger audit_campaigns after insert or update or delete on public.campaigns for each row execute function public.fn_audit();

alter table public.leads add column campaign_id uuid references public.campaigns(id) on delete set null;

alter table public.campaigns enable row level security;

create policy campaigns_select on public.campaigns for select using (auth.uid() is not null);
create policy campaigns_insert on public.campaigns for insert with check (
  public.has_role(array['owner','admin','bus_dev']::user_role[])
);
create policy campaigns_update on public.campaigns for update using (
  public.has_role(array['owner','admin','bus_dev']::user_role[])
);
create policy campaigns_delete on public.campaigns for delete using (
  public.is_owner()
);
