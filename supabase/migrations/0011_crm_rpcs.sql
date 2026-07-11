-- ============================================================================
-- THS OS — 0011: CRM write-path RPCs
--
-- Mirrors the same "atomic multi-table write via a guarded RPC" pattern
-- used everywhere else in this schema's write paths (set_* triggers,
-- next_document_number) — a stage change or a logged communication touches
-- two tables (leads + communications) and should never partially apply.
-- ============================================================================

create or replace function public.update_lead_stage(p_lead_id uuid, p_stage lead_stage)
returns leads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.leads;
begin
  if not public.has_role(array['owner','admin','ops_manager']::user_role[]) then
    if not exists (select 1 from public.leads where id = p_lead_id and owner_id is not null and public.is_self_or_manager_of(owner_id)) then
      raise exception 'Access denied: you do not own this lead';
    end if;
  end if;

  update public.leads set stage = p_stage where id = p_lead_id returning * into v_lead;
  if not found then
    raise exception 'Lead % not found', p_lead_id;
  end if;

  insert into public.communications (lead_id, channel, direction, title, logged_by)
  values (p_lead_id, 'system', 'outbound', 'Stage changed to ' || p_stage, auth.uid());

  return v_lead;
end;
$$;
revoke execute on function public.update_lead_stage(uuid, lead_stage) from anon, public;
grant execute on function public.update_lead_stage(uuid, lead_stage) to authenticated;

create or replace function public.log_communication(
  p_lead_id uuid default null::uuid, p_customer_id uuid default null::uuid,
  p_channel text default 'note'::text, p_direction text default 'outbound'::text,
  p_title text default null::text, p_note text default null::text,
  p_client_response text default null::text, p_next_followup_at timestamptz default null::timestamptz
)
returns communications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comm public.communications;
begin
  if p_lead_id is null and p_customer_id is null then
    raise exception 'log_communication requires a lead or a customer';
  end if;

  insert into public.communications (lead_id, customer_id, channel, direction, title, note, client_response, logged_by)
  values (p_lead_id, p_customer_id, p_channel, p_direction, p_title, p_note, p_client_response, auth.uid())
  returning * into v_comm;

  if p_lead_id is not null then
    update public.leads
       set last_contacted_at = now(),
           next_followup_at = coalesce(p_next_followup_at, next_followup_at)
     where id = p_lead_id;
  end if;

  return v_comm;
end;
$$;
revoke execute on function public.log_communication(uuid, uuid, text, text, text, text, text, timestamptz) from anon, public;
grant execute on function public.log_communication(uuid, uuid, text, text, text, text, text, timestamptz) to authenticated;

-- Won lead becomes an Active Client. Idempotent — calling it again on an
-- already-converted lead just returns the existing customer.
create or replace function public.convert_lead_to_customer(p_lead_id uuid)
returns customers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.leads;
  v_customer public.customers;
begin
  if not public.has_role(array['owner','admin','bus_dev','ops_manager']::user_role[]) then
    raise exception 'Access denied: missing permission to convert leads';
  end if;

  select * into v_lead from public.leads where id = p_lead_id;
  if not found then
    raise exception 'Lead % not found', p_lead_id;
  end if;

  if v_lead.customer_id is not null then
    select * into v_customer from public.customers where id = v_lead.customer_id;
    return v_customer;
  end if;

  insert into public.customers (company_name, industry, suburb, account_owner_id, monthly_value_usd, status)
  values (v_lead.company_name, v_lead.industry, v_lead.suburb, v_lead.owner_id, 0, 'active')
  returning * into v_customer;

  update public.leads set stage = 'active', customer_id = v_customer.id where id = p_lead_id;

  if v_lead.contact_name is not null then
    insert into public.contacts (customer_id, full_name, role_title, phone, email, is_primary)
    values (v_customer.id, v_lead.contact_name, v_lead.contact_role, v_lead.phone, v_lead.email, true);
  end if;

  insert into public.communications (customer_id, channel, direction, title, logged_by)
  values (v_customer.id, 'system', 'outbound', 'Converted from lead: ' || v_lead.company_name, auth.uid());

  return v_customer;
end;
$$;
revoke execute on function public.convert_lead_to_customer(uuid) from anon, public;
grant execute on function public.convert_lead_to_customer(uuid) to authenticated;
