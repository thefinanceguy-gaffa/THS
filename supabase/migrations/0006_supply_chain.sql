-- ============================================================================
-- THS OS — 0006: Supply chain (Inventory, Procurement, Suppliers, Vehicles)
-- ============================================================================

create table public.inventory_items (
  id            uuid primary key default gen_random_uuid(),
  code          text unique,                     -- CHEM-022
  name          text not null,
  category      text,                            -- Chemicals / Consumables / Equipment / PPE
  unit          text,
  unit_cost_usd numeric(12,2),
  reorder_level numeric(10,2),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create trigger trg_inventory_items_updated_at before update on public.inventory_items for each row execute function public.set_updated_at();

create table public.stock_locations (
  id        uuid primary key default gen_random_uuid(),
  name      text,
  branch_id uuid references public.branches(id) on delete set null
);

create table public.stock_movements (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid references public.inventory_items(id) on delete cascade,
  location_id  uuid references public.stock_locations(id) on delete set null,
  type         text not null,                    -- issue / receipt / adjustment / transfer
  quantity     numeric(10,2) not null,           -- negative = out
  reference    text,
  job_id       uuid references public.jobs(id) on delete set null,
  created_by   uuid references public.profiles(id) on delete set null,
  approved_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index idx_stock_movements_item on public.stock_movements(item_id, created_at desc);

create table public.suppliers (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  category       text,
  suburb         text,
  rating         numeric(2,1),
  payment_terms  text,
  status         text not null default 'active',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index supp_name_trgm on public.suppliers using gin (name gin_trgm_ops);
create trigger trg_suppliers_updated_at before update on public.suppliers for each row execute function public.set_updated_at();

create or replace function public.set_po_number()
returns trigger
language plpgsql
as $$
begin
  new.number := public.next_document_number('purchase_order', 'PO');
  return new;
end;
$$;

create table public.purchase_orders (
  id          uuid primary key default gen_random_uuid(),
  number      text unique not null,               -- PO-0412
  supplier_id uuid references public.suppliers(id) on delete set null,
  amount_usd  numeric(12,2),
  status      text not null default 'draft',       -- draft / pending_approval / approved / delivered
  raised_by   uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create trigger trg_purchase_orders_updated_at before update on public.purchase_orders for each row execute function public.set_updated_at();
create trigger trg_purchase_orders_number before insert on public.purchase_orders
  for each row when (new.number is null)
  execute function public.set_po_number();

create table public.vehicles (
  id              uuid primary key default gen_random_uuid(),
  name            text,
  registration    text unique,
  kind            text,
  year            int,
  assigned_team_id uuid references public.teams(id) on delete set null,
  mileage_km      int,
  status          text not null default 'available',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create trigger trg_vehicles_updated_at before update on public.vehicles for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.inventory_items enable row level security;
alter table public.stock_locations enable row level security;
alter table public.stock_movements enable row level security;
alter table public.suppliers       enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.vehicles        enable row level security;

create policy inventory_items_select on public.inventory_items for select using (auth.uid() is not null);
create policy inventory_items_write on public.inventory_items for all using (
  public.has_role(array['owner','admin','procurement']::user_role[])
) with check (
  public.has_role(array['owner','admin','procurement']::user_role[])
);

create policy stock_locations_select on public.stock_locations for select using (auth.uid() is not null);
create policy stock_locations_write on public.stock_locations for all using (
  public.has_role(array['owner','admin','procurement']::user_role[])
) with check (
  public.has_role(array['owner','admin','procurement']::user_role[])
);

-- "Inventory adjustment": Owner/Admin unconditional, Ops Mgr/Supervisor
-- need approval (△ in RBAC_MATRIX.md) — modelled as: they may insert, but
-- app/actions/inventory.ts also writes an `approvals` row for their
-- inserts and the movement is flagged pending until `approved_by` is set.
create policy stock_movements_select on public.stock_movements for select using (auth.uid() is not null);
create policy stock_movements_insert on public.stock_movements for insert with check (
  public.has_role(array['owner','admin','ops_manager','supervisor','procurement']::user_role[])
);
create policy stock_movements_update on public.stock_movements for update using (
  public.has_role(array['owner','admin']::user_role[])
);

-- "Manage suppliers": Owner unconditional, Procurement unconditional,
-- Finance needs approval (△ — new supplier creation requires Finance
-- Officer sign-off per RBAC_MATRIX.md, modelled the same way as inventory
-- adjustments: Finance can insert, Owner/Procurement can update/approve).
create policy suppliers_select on public.suppliers for select using (auth.uid() is not null);
create policy suppliers_insert on public.suppliers for insert with check (
  public.has_role(array['owner','procurement','finance']::user_role[])
);
create policy suppliers_update on public.suppliers for update using (
  public.has_role(array['owner','procurement']::user_role[])
);

-- "Raise purchase orders": Owner/Admin/Procurement.
create policy purchase_orders_select on public.purchase_orders for select using (
  public.has_role(array['owner','admin','procurement','finance']::user_role[]) or raised_by = auth.uid()
);
create policy purchase_orders_insert on public.purchase_orders for insert with check (
  public.has_role(array['owner','admin','procurement']::user_role[])
);
create policy purchase_orders_update on public.purchase_orders for update using (
  public.has_role(array['owner','admin','procurement']::user_role[]) or raised_by = auth.uid()
);

create policy vehicles_select on public.vehicles for select using (auth.uid() is not null);
create policy vehicles_write on public.vehicles for all using (
  public.has_role(array['owner','admin','ops_manager']::user_role[])
) with check (
  public.has_role(array['owner','admin','ops_manager']::user_role[])
);
