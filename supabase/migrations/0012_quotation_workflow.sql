-- ============================================================================
-- THS OS — 0012: Quotation approval workflow
--
-- Thresholds (RBAC_MATRIX.md "Approval workflows"), interpreted as tiers —
-- the higher threshold supersedes rather than requiring both signatures:
--   discount > 15%  OR total > US$5,000  -> Owner approval
--   total > US$1,000                     -> Operations Manager approval
--   otherwise                            -> auto-approved (no human gate)
-- Zimbabwe VAT is a flat 15% (README.md's quotation document footer).
-- ============================================================================

create or replace function public.create_quotation(
  p_customer_id uuid, p_lead_id uuid, p_assessment_id uuid, p_service_summary text,
  p_discount_percent numeric, p_valid_until date, p_lines jsonb
)
returns quotations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.quotations;
  v_line jsonb;
  v_subtotal numeric(12,2) := 0;
  v_line_no int := 0;
begin
  if not public.has_role(array['owner','admin','bus_dev','ops_manager']::user_role[]) then
    raise exception 'Access denied: missing permission to create quotations';
  end if;

  insert into public.quotations (customer_id, lead_id, assessment_id, service_summary, discount_percent, valid_until, created_by)
  values (p_customer_id, p_lead_id, p_assessment_id, p_service_summary, coalesce(p_discount_percent, 0), p_valid_until, auth.uid())
  returning * into v_quote;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    insert into public.quotation_lines (quotation_id, description, quantity, unit, rate_usd, line_no)
    values (
      v_quote.id, v_line->>'description', coalesce((v_line->>'quantity')::numeric, 1),
      v_line->>'unit', coalesce((v_line->>'rate_usd')::numeric, 0), v_line_no
    );
    v_subtotal := v_subtotal + coalesce((v_line->>'quantity')::numeric, 1) * coalesce((v_line->>'rate_usd')::numeric, 0);
    v_line_no := v_line_no + 1;
  end loop;

  update public.quotations
     set subtotal_usd = v_subtotal,
         vat_usd = round((v_subtotal - v_subtotal * coalesce(p_discount_percent, 0) / 100) * 0.15, 2),
         total_usd = round((v_subtotal - v_subtotal * coalesce(p_discount_percent, 0) / 100) * 1.15, 2)
   where id = v_quote.id
   returning * into v_quote;

  -- A quote generated straight from a lead advances it to the Quotation stage.
  if p_lead_id is not null then
    update public.leads set stage = 'quotation' where id = p_lead_id and stage in ('new', 'contacted', 'qualified', 'site_visit');
  end if;

  return v_quote;
end;
$$;
revoke execute on function public.create_quotation(uuid, uuid, uuid, text, numeric, date, jsonb) from anon, public;

create or replace function public.submit_quotation(p_quotation_id uuid)
returns quotations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.quotations;
  v_tier text;
begin
  select * into v_quote from public.quotations where id = p_quotation_id;
  if not found then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;
  if not (public.has_role(array['owner','admin','ops_manager']::user_role[]) or v_quote.created_by = auth.uid()) then
    raise exception 'Access denied';
  end if;

  if v_quote.discount_percent > 15 or v_quote.total_usd > 5000 then
    v_tier := 'owner';
  elsif v_quote.total_usd > 1000 then
    v_tier := 'ops_manager';
  else
    v_tier := null;
  end if;

  if v_tier is null then
    update public.quotations set status = 'sent' where id = p_quotation_id returning * into v_quote;
  else
    update public.quotations
       set status = (case when v_tier = 'owner' then 'pending_owner' else 'pending_review' end)::quote_status
     where id = p_quotation_id
     returning * into v_quote;

    insert into public.approvals (entity_type, entity_id, requested_by, status, threshold_note)
    values (
      'quotation', p_quotation_id, auth.uid(), 'pending',
      case when v_tier = 'owner' then 'Discount >15% or total >US$5,000 — requires Owner' else 'Total >US$1,000 — requires Operations Manager' end
    );
  end if;

  return v_quote;
end;
$$;
revoke execute on function public.submit_quotation(uuid) from anon, public;

create or replace function public.decide_quotation_approval(p_quotation_id uuid, p_approve boolean, p_reason text default null::text)
returns quotations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.quotations;
  v_approval public.approvals;
  v_required_role user_role;
begin
  select * into v_quote from public.quotations where id = p_quotation_id;
  if not found then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  select * into v_approval from public.approvals
   where entity_type = 'quotation' and entity_id = p_quotation_id and status = 'pending'
   order by created_at desc limit 1;
  if not found then
    raise exception 'No pending approval for quotation %', p_quotation_id;
  end if;

  v_required_role := case when v_quote.status = 'pending_owner' then 'owner' else 'ops_manager' end;
  if not (public.current_user_role() = 'owner' or public.current_user_role() = v_required_role) then
    raise exception 'Access denied: this quotation requires % approval', v_required_role;
  end if;

  update public.approvals
     set status = (case when p_approve then 'approved' else 'rejected' end)::approval_status,
         approver_id = auth.uid(), reason = p_reason, decided_at = now()
   where id = v_approval.id;

  update public.quotations
     set status = (case when p_approve then 'sent' else 'rejected' end)::quote_status
   where id = p_quotation_id
   returning * into v_quote;

  return v_quote;
end;
$$;
revoke execute on function public.decide_quotation_approval(uuid, boolean, text) from anon, public;

-- Post-send lifecycle (negotiation / awaiting_client / accepted / rejected /
-- expired) — a plain status move, not an approval. Accepting a quote tied
-- to a lead moves that lead to Won, matching the CRM's lead-lifecycle spec.
create or replace function public.set_quotation_status(p_quotation_id uuid, p_status quote_status)
returns quotations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.quotations;
begin
  if not public.has_role(array['owner','admin','bus_dev','ops_manager']::user_role[]) then
    raise exception 'Access denied: missing permission to update quotations';
  end if;

  update public.quotations set status = p_status where id = p_quotation_id returning * into v_quote;
  if not found then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  if p_status = 'accepted' and v_quote.lead_id is not null then
    update public.leads set stage = 'won' where id = v_quote.lead_id and stage <> 'won';
  end if;

  return v_quote;
end;
$$;
revoke execute on function public.set_quotation_status(uuid, quote_status) from anon, public;
