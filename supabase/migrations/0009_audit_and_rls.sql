-- ============================================================================
-- THS OS — 0009: Immutable audit trail
--
-- Every insert/update/delete on a tracked table writes one row here via a
-- generic SECURITY DEFINER trigger. No UPDATE/DELETE grant is ever given on
-- audit_logs (see RLS below) — append-only by construction, not convention.
-- ============================================================================

create table public.audit_logs (
  id               uuid primary key default gen_random_uuid(),
  actor_id         uuid,               -- profiles.id (nullable for system/auth events)
  actor_name       text,
  actor_role       user_role,
  actor_department text,
  action           text not null,      -- create / update / delete / restore / approve / reject / login / export / email ...
  module           text,               -- affected module
  entity_type      text,
  entity_id        uuid,
  previous_value   jsonb,
  new_value        jsonb,
  reason           text,
  approval_ref     uuid references public.approvals(id) on delete set null,
  ip_address       inet,
  device_type      text,
  browser          text,
  location         text,
  created_at       timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- Generic row-change trigger (attach to each tracked table below). Runs
-- SECURITY DEFINER so it can insert into audit_logs even though the calling
-- role generally has no direct write access to that table.
create or replace function public.fn_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
begin
  select * into v_actor from public.profiles where id = auth.uid();

  insert into public.audit_logs (
    actor_id, actor_name, actor_role, actor_department,
    action, module, entity_type, entity_id, previous_value, new_value
  )
  values (
    auth.uid(), v_actor.full_name, v_actor.role, v_actor.department,
    lower(tg_op), tg_table_name, tg_table_name, coalesce(new.id, old.id),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

-- App-driven audit entries for events that aren't a row change (login,
-- export, approve/reject, email-sent) and want the richer client context
-- (ip/device/browser) a DB trigger can't see. Callable by any authenticated
-- user for their own actor_id only — never lets one user forge another's.
create or replace function public.log_audit_event(
  p_action text, p_module text default null::text, p_entity_type text default null::text,
  p_entity_id uuid default null::uuid, p_reason text default null::text,
  p_device_type text default null::text, p_browser text default null::text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
begin
  select * into v_actor from public.profiles where id = auth.uid();
  insert into public.audit_logs (
    actor_id, actor_name, actor_role, actor_department,
    action, module, entity_type, entity_id, reason, device_type, browser
  )
  values (
    auth.uid(), v_actor.full_name, v_actor.role, v_actor.department,
    p_action, p_module, p_entity_type, p_entity_id, p_reason, p_device_type, p_browser
  );
end;
$$;
revoke execute on function public.log_audit_event(text, text, text, uuid, text, text, text) from anon, public;
grant execute on function public.log_audit_event(text, text, text, uuid, text, text, text) to authenticated;

create trigger audit_customers          after insert or update or delete on public.customers          for each row execute function public.fn_audit();
create trigger audit_leads              after insert or update or delete on public.leads              for each row execute function public.fn_audit();
create trigger audit_communications     after insert or update or delete on public.communications     for each row execute function public.fn_audit();
create trigger audit_site_assessments   after insert or update or delete on public.site_assessments   for each row execute function public.fn_audit();
create trigger audit_quotations         after insert or update or delete on public.quotations         for each row execute function public.fn_audit();
create trigger audit_approvals          after insert or update or delete on public.approvals          for each row execute function public.fn_audit();
create trigger audit_jobs               after insert or update or delete on public.jobs               for each row execute function public.fn_audit();
create trigger audit_job_events         after insert on public.job_events                             for each row execute function public.fn_audit();
create trigger audit_purchase_orders    after insert or update or delete on public.purchase_orders    for each row execute function public.fn_audit();
create trigger audit_suppliers          after insert or update or delete on public.suppliers          for each row execute function public.fn_audit();
create trigger audit_stock_movements    after insert or update on public.stock_movements               for each row execute function public.fn_audit();
create trigger audit_contracts          after insert or update or delete on public.contracts          for each row execute function public.fn_audit();
create trigger audit_invoices           after insert or update or delete on public.invoices           for each row execute function public.fn_audit();
create trigger audit_payments           after insert or update or delete on public.payments           for each row execute function public.fn_audit();
create trigger audit_employee_records   after insert or update or delete on public.employee_records   for each row execute function public.fn_audit();
create trigger audit_profiles           after update on public.profiles                                for each row execute function public.fn_audit();

-- ----------------------------------------------------------------------------
-- RLS: audit log is read for Owner/Admin only (RBAC_MATRIX.md System table:
-- "View audit logs" ✓ Owner ✓ Admin, ✗ everyone else). No insert/update/
-- delete policy — writes happen only via the SECURITY DEFINER functions
-- above, which run as the function owner and bypass RLS by design, keeping
-- this table append-only and unmodifiable from any client role.
-- ----------------------------------------------------------------------------
alter table public.audit_logs enable row level security;
create policy audit_read on public.audit_logs for select using (public.is_owner_or_admin());

-- ----------------------------------------------------------------------------
-- Client portal: a client profile sees ONLY its own customer's rows.
-- profiles.customer_id (set in 0002/0003) plus the per-table policies
-- already added above (customers_select, quotations_select,
-- invoices_client_read, payments_client_read, jobs_select, contracts_select,
-- site_assessments_select) are the full implementation — nothing further
-- needed here; this comment exists so the client-portal RLS story is
-- findable in one place per DATABASE_SCHEMA.sql's own note.
-- ----------------------------------------------------------------------------
