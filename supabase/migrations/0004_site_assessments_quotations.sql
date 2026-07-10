-- ============================================================================
-- THS OS — 0004: Site Assessments, Quotations, generic Approvals
-- ============================================================================

-- Reference-number trigger helper — defined before site_assessments below
-- since its BEFORE INSERT trigger needs the function to already exist.
create or replace function public.set_site_assessment_reference()
returns trigger
language plpgsql
as $$
begin
  new.reference := public.next_document_number('site_assessment', 'SA');
  return new;
end;
$$;

create table public.site_assessments (
  id                 uuid primary key default gen_random_uuid(),
  reference          text unique,                  -- SA-0142
  lead_id            uuid references public.leads(id) on delete set null,
  customer_id        uuid references public.customers(id) on delete set null,
  site_name          text not null,
  suburb             text,
  assessor_id        uuid references public.profiles(id) on delete set null,
  scheduled_at       timestamptz,
  completed_at       timestamptz,
  total_area_m2      numeric(10,2),
  recommended_crew   text,
  service_window     text,
  est_monthly_usd    numeric(12,2),
  risks              text,
  status             text not null default 'scheduled',
  version            int not null default 1,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz,
  constraint site_assessments_target_chk check (lead_id is not null or customer_id is not null)
);
create trigger trg_site_assessments_updated_at before update on public.site_assessments for each row execute function public.set_updated_at();
create trigger trg_site_assessments_ref before insert on public.site_assessments
  for each row when (new.reference is null)
  execute function public.set_site_assessment_reference();

create table public.assessment_areas (
  id            uuid primary key default gen_random_uuid(),
  assessment_id uuid references public.site_assessments(id) on delete cascade,
  area_name     text,
  size_m2       numeric(10,2),
  surface       text,
  frequency     text,
  effort        text
);

create or replace function public.set_quotation_number()
returns trigger
language plpgsql
as $$
begin
  new.number := public.next_document_number('quotation', 'QT');
  return new;
end;
$$;

create table public.quotations (
  id               uuid primary key default gen_random_uuid(),
  number           text unique not null,
  customer_id      uuid references public.customers(id) on delete set null,
  lead_id          uuid references public.leads(id) on delete set null,
  assessment_id    uuid references public.site_assessments(id) on delete set null,
  service_summary  text,
  status           quote_status not null default 'draft',
  currency         currency_code not null default 'USD',
  subtotal_usd     numeric(12,2) not null default 0,
  discount_percent numeric(5,2) not null default 0,
  vat_usd          numeric(12,2) not null default 0,
  total_usd        numeric(12,2) not null default 0,
  valid_until      date,
  version          int not null default 1,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index idx_quotations_customer on public.quotations(customer_id) where deleted_at is null;
create index idx_quotations_status on public.quotations(status) where deleted_at is null;
create trigger trg_quotations_updated_at before update on public.quotations for each row execute function public.set_updated_at();
create trigger trg_quotations_number before insert on public.quotations
  for each row when (new.number is null)
  execute function public.set_quotation_number();

create table public.quotation_lines (
  id            uuid primary key default gen_random_uuid(),
  quotation_id  uuid references public.quotations(id) on delete cascade,
  description   text not null,
  quantity      numeric(10,2) not null default 1,
  unit          text,
  rate_usd      numeric(12,2) not null default 0,
  line_no       int not null default 0
);
create index idx_quotation_lines_quotation on public.quotation_lines(quotation_id);

-- ----------------------------------------------------------------------------
-- APPROVAL WORKFLOWS (generic — quotations, purchase orders, discounts,
-- inventory adjustments, new suppliers all write rows here; see
-- RBAC_MATRIX.md "Approval workflows" for the threshold table. Thresholds
-- are enforced in application code (app/actions/quotations.ts etc.), not a
-- DB trigger, since they need business context — see docs/DEVELOPER.md.)
-- ----------------------------------------------------------------------------
create table public.approvals (
  id             uuid primary key default gen_random_uuid(),
  entity_type    text not null,             -- 'quotation' | 'purchase_order' | 'discount' | 'inventory_adjustment' | 'supplier'
  entity_id      uuid not null,
  requested_by   uuid references public.profiles(id) on delete set null,
  approver_id    uuid references public.profiles(id) on delete set null,
  status         approval_status not null default 'pending',
  reason         text,
  threshold_note text,                      -- e.g. '>US$5000 requires Owner'
  decided_at     timestamptz,
  created_at     timestamptz not null default now()
);
create index idx_approvals_entity on public.approvals(entity_type, entity_id);
create index idx_approvals_approver on public.approvals(approver_id, status);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.site_assessments enable row level security;
alter table public.assessment_areas enable row level security;
alter table public.quotations       enable row level security;
alter table public.quotation_lines  enable row level security;
alter table public.approvals        enable row level security;

create policy site_assessments_select on public.site_assessments for select using (
  public.has_role(array['owner','admin','bus_dev','ops_manager','supervisor']::user_role[])
  or assessor_id = auth.uid()
  or (public.current_user_role() = 'client' and customer_id = (select customer_id from public.profiles where id = auth.uid()))
);
create policy site_assessments_write on public.site_assessments for all using (
  public.has_role(array['owner','admin','bus_dev','ops_manager']::user_role[]) or assessor_id = auth.uid()
) with check (
  public.has_role(array['owner','admin','bus_dev','ops_manager']::user_role[]) or assessor_id = auth.uid()
);

create policy assessment_areas_select on public.assessment_areas for select using (
  exists (
    select 1 from public.site_assessments sa where sa.id = assessment_areas.assessment_id
    and (public.has_role(array['owner','admin','bus_dev','ops_manager','supervisor']::user_role[]) or sa.assessor_id = auth.uid())
  )
);
create policy assessment_areas_write on public.assessment_areas for all using (
  exists (
    select 1 from public.site_assessments sa where sa.id = assessment_areas.assessment_id
    and (public.has_role(array['owner','admin','bus_dev','ops_manager']::user_role[]) or sa.assessor_id = auth.uid())
  )
) with check (
  exists (
    select 1 from public.site_assessments sa where sa.id = assessment_areas.assessment_id
    and (public.has_role(array['owner','admin','bus_dev','ops_manager']::user_role[]) or sa.assessor_id = auth.uid())
  )
);

-- Quotations: sales roles view sales pipeline; client sees only its own,
-- and only once sent (never drafts still being priced).
create policy quotations_select on public.quotations for select using (
  public.has_role(array['owner','admin','bus_dev','ops_manager','finance']::user_role[])
  or created_by = auth.uid()
  or (
    public.current_user_role() = 'client'
    and customer_id = (select customer_id from public.profiles where id = auth.uid())
    and status <> 'draft'
  )
);
create policy quotations_insert on public.quotations for insert with check (
  public.has_role(array['owner','admin','bus_dev','ops_manager']::user_role[])
);
create policy quotations_update on public.quotations for update using (
  public.has_role(array['owner','admin','ops_manager']::user_role[])
  or (created_by = auth.uid() and status in ('draft','pending_review'))
  -- A client may update their own quotation's status field via the portal
  -- action (accept/reject) — enforced further by app/actions/portal.ts only
  -- ever writing {status} for a quotation already addressed to them.
  or (public.current_user_role() = 'client' and customer_id = (select customer_id from public.profiles where id = auth.uid()))
);

create policy quotation_lines_select on public.quotation_lines for select using (
  exists (select 1 from public.quotations q where q.id = quotation_lines.quotation_id)
);
create policy quotation_lines_write on public.quotation_lines for all using (
  exists (
    select 1 from public.quotations q where q.id = quotation_lines.quotation_id
    and (public.has_role(array['owner','admin','ops_manager']::user_role[]) or q.created_by = auth.uid())
  )
) with check (
  exists (
    select 1 from public.quotations q where q.id = quotation_lines.quotation_id
    and (public.has_role(array['owner','admin','ops_manager']::user_role[]) or q.created_by = auth.uid())
  )
);

create policy approvals_select on public.approvals for select using (
  requested_by = auth.uid() or approver_id = auth.uid() or public.is_owner_or_admin()
);
create policy approvals_insert on public.approvals for insert with check (auth.uid() is not null);
create policy approvals_update on public.approvals for update using (approver_id = auth.uid() or public.is_owner_or_admin());
