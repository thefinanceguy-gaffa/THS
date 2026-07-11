-- ============================================================================
-- THS OS — 0017: Supply chain (Inventory/Procurement) write path
--
-- "Inventory adjustment": Owner/Admin unconditional, Ops Mgr/Supervisor
-- need approval (RBAC_MATRIX.md People & Supply table) — modelled the same
-- way as everywhere else in this schema: they can write, but the row is
-- flagged pending (approved_by null) until an Owner/Admin signs off.
-- "Purchase Order above raiser's limit": routed against the raiser's own
-- profiles.approval_limit_usd rather than a fixed threshold, since that's
-- exactly what the column exists for.
-- ============================================================================

create or replace function public.adjust_stock(
  p_item_id uuid, p_location_id uuid, p_quantity numeric, p_reference text
)
returns stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_movement public.stock_movements;
  v_needs_approval boolean;
begin
  if not public.has_role(array['owner','admin','ops_manager','supervisor','procurement']::user_role[]) then
    raise exception 'Access denied: missing permission to adjust inventory';
  end if;

  v_needs_approval := public.has_role(array['ops_manager','supervisor']::user_role[]);

  insert into public.stock_movements (item_id, location_id, type, quantity, reference, created_by, approved_by)
  values (p_item_id, p_location_id, 'adjustment', p_quantity, p_reference, auth.uid(), case when v_needs_approval then null else auth.uid() end)
  returning * into v_movement;

  if v_needs_approval then
    insert into public.approvals (entity_type, entity_id, requested_by, status, threshold_note)
    values ('inventory_adjustment', v_movement.id, auth.uid(), 'pending', 'Inventory adjustment — logged, pending Owner/Admin review');
  end if;

  return v_movement;
end;
$$;
revoke execute on function public.adjust_stock(uuid, uuid, numeric, text) from anon, public;
grant execute on function public.adjust_stock(uuid, uuid, numeric, text) to authenticated;

create or replace function public.create_purchase_order(p_supplier_id uuid, p_amount_usd numeric)
returns purchase_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_po public.purchase_orders;
  v_limit numeric(12,2);
begin
  if not public.has_role(array['owner','admin','procurement']::user_role[]) then
    raise exception 'Access denied: missing permission to raise purchase orders';
  end if;

  select approval_limit_usd into v_limit from public.profiles where id = auth.uid();

  insert into public.purchase_orders (supplier_id, amount_usd, status, raised_by)
  values (p_supplier_id, p_amount_usd, case when p_amount_usd <= coalesce(v_limit, 0) then 'approved' else 'pending_approval' end, auth.uid())
  returning * into v_po;

  if v_po.status = 'pending_approval' then
    insert into public.approvals (entity_type, entity_id, requested_by, status, threshold_note)
    values ('purchase_order', v_po.id, auth.uid(), 'pending', 'Above raiser''s approval limit (US$' || coalesce(v_limit, 0) || ') — requires Owner');
  end if;

  return v_po;
end;
$$;
revoke execute on function public.create_purchase_order(uuid, numeric) from anon, public;
grant execute on function public.create_purchase_order(uuid, numeric) to authenticated;

create or replace function public.decide_purchase_order(p_po_id uuid, p_approve boolean)
returns purchase_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_po public.purchase_orders;
  v_approval public.approvals;
begin
  if not public.is_owner() then
    raise exception 'Access denied: only the Owner approves purchase orders above the raiser''s limit';
  end if;

  select * into v_approval from public.approvals where entity_type = 'purchase_order' and entity_id = p_po_id and status = 'pending' order by created_at desc limit 1;
  if not found then
    raise exception 'No pending approval for purchase order %', p_po_id;
  end if;

  update public.approvals set status = (case when p_approve then 'approved' else 'rejected' end)::approval_status, approver_id = auth.uid(), decided_at = now() where id = v_approval.id;
  update public.purchase_orders set status = case when p_approve then 'approved' else 'draft' end where id = p_po_id returning * into v_po;

  return v_po;
end;
$$;
revoke execute on function public.decide_purchase_order(uuid, boolean) from anon, public;
grant execute on function public.decide_purchase_order(uuid, boolean) to authenticated;

create or replace function public.mark_po_delivered(p_po_id uuid)
returns purchase_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_po public.purchase_orders;
begin
  if not public.has_role(array['owner','admin','procurement']::user_role[]) then
    raise exception 'Access denied';
  end if;

  update public.purchase_orders set status = 'delivered' where id = p_po_id and status = 'approved' returning * into v_po;
  if not found then
    raise exception 'Purchase order % not found or not yet approved', p_po_id;
  end if;

  return v_po;
end;
$$;
revoke execute on function public.mark_po_delivered(uuid) from anon, public;
grant execute on function public.mark_po_delivered(uuid) to authenticated;
