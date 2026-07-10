-- ============================================================================
-- THS OS — 0007: Finance (Contracts, Invoicing, Payments)
-- ============================================================================

create or replace function public.set_contract_number()
returns trigger
language plpgsql
as $$
begin
  new.number := public.next_document_number('contract', 'CT');
  return new;
end;
$$;

create table public.contracts (
  id           uuid primary key default gen_random_uuid(),
  number       text unique not null,             -- CT-2201
  customer_id  uuid references public.customers(id) on delete set null,
  service_type text,
  monthly_usd  numeric(12,2),
  term_months  int,
  starts_on    date,
  renews_on    date,
  auto_renew   boolean not null default true,
  status       text not null default 'active',
  version      int not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index idx_contracts_customer on public.contracts(customer_id) where deleted_at is null;
create index idx_contracts_renews on public.contracts(renews_on) where deleted_at is null and status = 'active';
create trigger trg_contracts_updated_at before update on public.contracts for each row execute function public.set_updated_at();
create trigger trg_contracts_number before insert on public.contracts
  for each row when (new.number is null)
  execute function public.set_contract_number();

-- jobs.contract_id was declared in 0005_operations.sql before contracts
-- existed; add the FK now.
alter table public.jobs add constraint jobs_contract_fk foreign key (contract_id) references public.contracts(id) on delete set null;

create or replace function public.set_invoice_number()
returns trigger
language plpgsql
as $$
begin
  new.number := public.next_document_number('invoice', 'INV');
  return new;
end;
$$;

create table public.invoices (
  id           uuid primary key default gen_random_uuid(),
  number       text unique not null,             -- INV-1042
  customer_id  uuid references public.customers(id) on delete set null,
  contract_id  uuid references public.contracts(id) on delete set null,
  currency     currency_code not null default 'USD',
  subtotal_usd numeric(12,2) not null default 0,
  vat_usd      numeric(12,2) not null default 0,
  total_usd    numeric(12,2) not null default 0,
  status       invoice_status not null default 'draft',
  issued_on    date,
  due_on       date,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index idx_invoices_customer on public.invoices(customer_id) where deleted_at is null;
create index idx_invoices_status on public.invoices(status) where deleted_at is null;
create trigger trg_invoices_updated_at before update on public.invoices for each row execute function public.set_updated_at();
create trigger trg_invoices_number before insert on public.invoices
  for each row when (new.number is null)
  execute function public.set_invoice_number();

create table public.invoice_lines (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid references public.invoices(id) on delete cascade,
  description text,
  quantity    numeric(10,2),
  unit        text,
  rate_usd    numeric(12,2),
  line_no     int not null default 0
);
create index idx_invoice_lines_invoice on public.invoice_lines(invoice_id);

create or replace function public.set_receipt_number()
returns trigger
language plpgsql
as $$
begin
  new.receipt_number := public.next_document_number('payment', 'RCP');
  return new;
end;
$$;

create table public.payments (
  id             uuid primary key default gen_random_uuid(),
  receipt_number text unique,                    -- RCP-3391
  invoice_id     uuid references public.invoices(id) on delete set null,
  customer_id    uuid references public.customers(id) on delete set null,
  amount_usd     numeric(12,2),
  currency       currency_code not null default 'USD',
  method         text,                            -- EFT / EcoCash / Bank / Cash
  allocated      boolean not null default false,
  recorded_by    uuid references public.profiles(id) on delete set null,
  paid_at        timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index idx_payments_invoice on public.payments(invoice_id);
create index idx_payments_customer on public.payments(customer_id);
create trigger trg_payments_number before insert on public.payments
  for each row when (new.receipt_number is null)
  execute function public.set_receipt_number();

-- ----------------------------------------------------------------------------
-- RLS — Finance: only Owner + Finance read/write money tables (per
-- RBAC_MATRIX.md's Finance table), with a client-portal carve-out on
-- invoices (own records only) and Bus.Dev/Ops read access on contracts
-- (they need to see what a customer is contracted for, just not payments).
-- ----------------------------------------------------------------------------
alter table public.contracts     enable row level security;
alter table public.invoices      enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.payments      enable row level security;

create policy contracts_select on public.contracts for select using (
  public.has_role(array['owner','admin','finance','bus_dev','ops_manager']::user_role[])
  or (public.current_user_role() = 'client' and customer_id = (select customer_id from public.profiles where id = auth.uid()))
);
create policy contracts_write on public.contracts for all using (
  public.has_role(array['owner','finance']::user_role[])
) with check (
  public.has_role(array['owner','finance']::user_role[])
);

create policy invoices_finance on public.invoices for all using (
  public.has_role(array['owner','finance']::user_role[])
) with check (public.has_role(array['owner','finance']::user_role[]));
create policy invoices_client_read on public.invoices for select using (
  public.current_user_role() = 'client' and customer_id = (select customer_id from public.profiles where id = auth.uid())
);

create policy invoice_lines_finance on public.invoice_lines for all using (
  exists (select 1 from public.invoices i where i.id = invoice_lines.invoice_id and public.has_role(array['owner','finance']::user_role[]))
) with check (
  exists (select 1 from public.invoices i where i.id = invoice_lines.invoice_id and public.has_role(array['owner','finance']::user_role[]))
);
create policy invoice_lines_client_read on public.invoice_lines for select using (
  exists (
    select 1 from public.invoices i where i.id = invoice_lines.invoice_id
    and public.current_user_role() = 'client' and i.customer_id = (select customer_id from public.profiles where id = auth.uid())
  )
);

create policy payments_finance on public.payments for all using (
  public.has_role(array['owner','finance']::user_role[])
) with check (public.has_role(array['owner','finance']::user_role[]));
create policy payments_client_read on public.payments for select using (
  public.current_user_role() = 'client' and customer_id = (select customer_id from public.profiles where id = auth.uid())
);
