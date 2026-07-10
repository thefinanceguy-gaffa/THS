-- ============================================================================
-- THS OS — 0003: CRM (customers, contacts, leads, communications)
-- ============================================================================

create table public.customers (
  id                uuid primary key default gen_random_uuid(),
  company_name      text not null,
  industry          text,
  suburb            text,
  address           text,
  segment           text,                          -- Enterprise / Mid-market / SME / Multi-site
  account_owner_id  uuid references public.profiles(id) on delete set null,
  branch_id         uuid references public.branches(id) on delete set null,
  monthly_value_usd numeric(12,2) not null default 0,
  satisfaction      numeric(2,1),
  status            text not null default 'active',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create index idx_customers_owner on public.customers(account_owner_id) where deleted_at is null;
create index cust_name_trgm on public.customers using gin (company_name gin_trgm_ops);
create trigger trg_customers_updated_at before update on public.customers for each row execute function public.set_updated_at();

-- profiles.customer_id (client-portal scoping) can only be added now that
-- customers exists — see 0002_core_platform.sql for why the column itself
-- was created early.
alter table public.profiles add constraint profiles_customer_id_fkey foreign key (customer_id) references public.customers(id) on delete set null;

create table public.contacts (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  full_name   text not null,
  role_title  text,
  phone       text,
  email       text,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index idx_contacts_customer on public.contacts(customer_id) where deleted_at is null;
create trigger trg_contacts_updated_at before update on public.contacts for each row execute function public.set_updated_at();

create table public.leads (
  id                 uuid primary key default gen_random_uuid(),
  company_name       text not null,
  contact_name       text,
  contact_role       text,
  phone              text,
  email              text,
  industry           text,
  suburb             text,
  company_size       text,
  service_required   text,
  source             lead_source not null,
  stage              lead_stage not null default 'new',
  score              text not null default 'warm',    -- hot / warm / cold
  est_value_usd      numeric(12,2) not null default 0,
  win_probability    int not null default 0,
  owner_id           uuid references public.profiles(id) on delete set null,
  customer_id        uuid references public.customers(id) on delete set null,   -- set on conversion
  last_contacted_at  timestamptz,
  next_followup_at   timestamptz,
  ai_recommendation  text,
  bant_budget        text not null default 'unknown',    -- yes / no / unknown
  bant_authority     text not null default 'unknown',
  bant_need          text not null default 'unknown',
  bant_timeline      text not null default 'unknown',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz,
  created_by         uuid references public.profiles(id),
  updated_by         uuid references public.profiles(id)
);
-- Dedupe: no two live leads share an email or phone.
create unique index leads_email_uniq on public.leads (lower(email)) where deleted_at is null and email is not null;
create unique index leads_phone_uniq on public.leads (phone) where deleted_at is null and phone is not null;
create index leads_stage_idx on public.leads (stage) where deleted_at is null;
create index idx_leads_owner on public.leads(owner_id) where deleted_at is null;
create index lead_name_trgm on public.leads using gin (company_name gin_trgm_ops);
create trigger trg_leads_updated_at before update on public.leads for each row execute function public.set_updated_at();

-- AI Lead Generation: staging table for scraped/collected public-data
-- prospects (BUILD_ROADMAP.md Sprint 2a). Populated by a scheduled
-- collector job using the service_role key — never by client writes.
create table public.prospect_candidates (
  id                  uuid primary key default gen_random_uuid(),
  company_name        text not null,
  suburb              text,
  industry             text,
  source              text not null,                   -- 'business_directory' | 'google_maps' | 'tender_notice' | 'news'
  source_ref          text,
  estimated_value_usd numeric(12,2),
  fit_score           int,
  fit_reason          text,
  suppressed          boolean not null default false,
  converted_lead_id   uuid references public.leads(id) on delete set null,
  collected_at        timestamptz not null default now(),
  created_at          timestamptz not null default now()
);
create index prospect_fit_idx on public.prospect_candidates (fit_score desc) where suppressed = false and converted_lead_id is null;

create table public.suppression_list (
  id           uuid primary key default gen_random_uuid(),
  company_name text,
  email        text,
  phone        text,
  reason       text,
  added_by     uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Documented communications (calls, WhatsApp, email, meetings, social) —
-- the CRM's "nothing should rely on memory" communication log.
create table public.communications (
  id             uuid primary key default gen_random_uuid(),
  lead_id        uuid references public.leads(id) on delete cascade,
  customer_id    uuid references public.customers(id) on delete cascade,
  channel        text not null,                 -- call / whatsapp / email / meeting / social / sms
  direction      text not null,                 -- inbound / outbound
  title          text,
  note           text,
  client_response text,                          -- documented response/feedback
  logged_by      uuid references public.profiles(id) on delete set null,
  occurred_at    timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  constraint communications_target_chk check (lead_id is not null or customer_id is not null)
);
create index idx_communications_lead on public.communications(lead_id, occurred_at desc) where deleted_at is null;
create index idx_communications_customer on public.communications(customer_id, occurred_at desc) where deleted_at is null;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.customers            enable row level security;
alter table public.contacts             enable row level security;
alter table public.leads                enable row level security;
alter table public.prospect_candidates  enable row level security;
alter table public.suppression_list     enable row level security;
alter table public.communications       enable row level security;

-- Customers: sales + ops + finance need to see them; client sees only its own.
create policy customers_select on public.customers for select using (
  public.has_role(array['owner','admin','bus_dev','ops_manager','finance','supervisor']::user_role[])
  or account_owner_id = auth.uid()
  or (public.current_user_role() = 'client' and id = (select customer_id from public.profiles where id = auth.uid()))
);
create policy customers_write on public.customers for insert with check (
  public.has_role(array['owner','admin','bus_dev','ops_manager']::user_role[])
);
create policy customers_update on public.customers for update using (
  public.has_role(array['owner','admin','bus_dev','ops_manager']::user_role[]) or account_owner_id = auth.uid()
);
-- "Delete customers": Owner only (RBAC_MATRIX.md CRM & Sales) — soft-delete
-- via UPDATE, so this policy is really "who may set deleted_at", covered by
-- customers_update for everyone else; Owner additionally gets unrestricted
-- update, which the has_role() branch above already grants.

create policy contacts_select on public.contacts for select using (
  public.has_role(array['owner','admin','bus_dev','ops_manager','finance','supervisor']::user_role[])
  or exists (select 1 from public.customers c where c.id = contacts.customer_id and c.account_owner_id = auth.uid())
  or (public.current_user_role() = 'client' and customer_id = (select customer_id from public.profiles where id = auth.uid()))
);
create policy contacts_write on public.contacts for all using (
  public.has_role(array['owner','admin','bus_dev','ops_manager']::user_role[])
) with check (
  public.has_role(array['owner','admin','bus_dev','ops_manager']::user_role[])
);

-- Leads: sales roles see leads; bus_dev sees own (+ anyone reporting to
-- them, per the org hierarchy); owner/admin/ops see all.
create policy leads_select on public.leads for select using (
  public.has_role(array['owner','admin','ops_manager']::user_role[])
  or (owner_id is not null and public.is_self_or_manager_of(owner_id))
);
create policy leads_insert on public.leads for insert with check (
  public.has_role(array['owner','admin','bus_dev','ops_manager']::user_role[])
);
create policy leads_update on public.leads for update using (
  public.has_role(array['owner','admin','ops_manager']::user_role[])
  or (owner_id is not null and public.is_self_or_manager_of(owner_id))
);

-- Prospect candidates: sales roles read; only server-side jobs (service_role
-- key, which bypasses RLS entirely) write — no insert/update policy for
-- authenticated users is intentional.
create policy prospects_read on public.prospect_candidates for select using (
  public.has_role(array['owner','admin','bus_dev','ops_manager']::user_role[])
);
create policy prospects_update_convert on public.prospect_candidates for update using (
  public.has_role(array['owner','admin','bus_dev','ops_manager']::user_role[])
);

create policy suppression_read on public.suppression_list for select using (
  public.has_role(array['owner','admin','bus_dev','ops_manager']::user_role[])
);
create policy suppression_write on public.suppression_list for insert with check (
  public.has_role(array['owner','admin','bus_dev','ops_manager']::user_role[])
);

create policy communications_select on public.communications for select using (
  public.has_role(array['owner','admin','ops_manager']::user_role[])
  or exists (select 1 from public.leads l where l.id = communications.lead_id and (l.owner_id = auth.uid() or public.is_self_or_manager_of(l.owner_id)))
  or exists (select 1 from public.customers c where c.id = communications.customer_id and (c.account_owner_id = auth.uid() or public.has_role(array['bus_dev']::user_role[])))
  or (public.current_user_role() = 'client' and customer_id = (select customer_id from public.profiles where id = auth.uid()))
);
create policy communications_insert on public.communications for insert with check (
  public.has_role(array['owner','admin','bus_dev','ops_manager']::user_role[])
);
