-- ============================================================================
-- THS OS — 0020: AI Prospecting write path
--
-- prospect_candidates/suppression_list already exist (0003_crm.sql) — that
-- migration's comment documents candidates as populated by a scheduled
-- collector job using the service_role key (bypasses RLS entirely), never
-- by client writes. This migration adds the one thing a real staff member
-- does through the UI: converting a reviewed candidate into a normal lead.
-- Idempotent — calling it again on an already-converted candidate just
-- returns the existing lead, same pattern as convert_lead_to_customer().
-- ============================================================================

create or replace function public.convert_prospect_to_lead(p_prospect_id uuid)
returns leads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prospect public.prospect_candidates;
  v_lead public.leads;
begin
  if not public.has_role(array['owner','admin','bus_dev','ops_manager']::user_role[]) then
    raise exception 'Access denied: missing permission to convert prospects';
  end if;

  select * into v_prospect from public.prospect_candidates where id = p_prospect_id;
  if not found then
    raise exception 'Prospect % not found', p_prospect_id;
  end if;

  if v_prospect.converted_lead_id is not null then
    select * into v_lead from public.leads where id = v_prospect.converted_lead_id;
    return v_lead;
  end if;

  insert into public.leads (company_name, suburb, industry, source, est_value_usd, owner_id, ai_recommendation)
  values (
    v_prospect.company_name, v_prospect.suburb, v_prospect.industry, 'ai_prospecting',
    coalesce(v_prospect.estimated_value_usd, 0), auth.uid(), v_prospect.fit_reason
  )
  returning * into v_lead;

  update public.prospect_candidates set converted_lead_id = v_lead.id where id = p_prospect_id;

  return v_lead;
end;
$$;
revoke execute on function public.convert_prospect_to_lead(uuid) from anon, public;
grant execute on function public.convert_prospect_to_lead(uuid) to authenticated;
