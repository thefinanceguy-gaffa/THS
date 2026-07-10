-- ============================================================================
-- THS OS — 0013: Site assessment write path
-- ============================================================================

create or replace function public.create_site_assessment(
  p_customer_id uuid, p_lead_id uuid, p_site_name text, p_suburb text, p_assessor_id uuid,
  p_scheduled_at timestamptz, p_recommended_crew text, p_service_window text,
  p_est_monthly_usd numeric, p_risks text, p_areas jsonb
)
returns site_assessments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assessment public.site_assessments;
  v_area jsonb;
  v_total numeric(10,2) := 0;
begin
  if not public.has_role(array['owner','admin','bus_dev','ops_manager']::user_role[]) then
    raise exception 'Access denied: missing permission to create site assessments';
  end if;

  insert into public.site_assessments (customer_id, lead_id, site_name, suburb, assessor_id, scheduled_at, recommended_crew, service_window, est_monthly_usd, risks, status)
  values (p_customer_id, p_lead_id, p_site_name, p_suburb, coalesce(p_assessor_id, auth.uid()), p_scheduled_at, p_recommended_crew, p_service_window, p_est_monthly_usd, p_risks, 'scheduled')
  returning * into v_assessment;

  for v_area in select * from jsonb_array_elements(p_areas) loop
    insert into public.assessment_areas (assessment_id, area_name, size_m2, surface, frequency, effort)
    values (v_assessment.id, v_area->>'area_name', coalesce((v_area->>'size_m2')::numeric, 0), v_area->>'surface', v_area->>'frequency', v_area->>'effort');
    v_total := v_total + coalesce((v_area->>'size_m2')::numeric, 0);
  end loop;

  update public.site_assessments set total_area_m2 = v_total where id = v_assessment.id returning * into v_assessment;

  if p_lead_id is not null then
    update public.leads set stage = 'site_visit' where id = p_lead_id and stage in ('new', 'contacted', 'qualified');
  end if;

  return v_assessment;
end;
$$;
revoke execute on function public.create_site_assessment(uuid, uuid, text, text, uuid, timestamptz, text, text, numeric, text, jsonb) from anon, public;

create or replace function public.complete_site_assessment(p_assessment_id uuid)
returns site_assessments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assessment public.site_assessments;
begin
  if not public.has_role(array['owner','admin','bus_dev','ops_manager']::user_role[]) then
    raise exception 'Access denied';
  end if;

  update public.site_assessments set status = 'completed', completed_at = now() where id = p_assessment_id returning * into v_assessment;
  if not found then
    raise exception 'Site assessment % not found', p_assessment_id;
  end if;

  return v_assessment;
end;
$$;
revoke execute on function public.complete_site_assessment(uuid) from anon, public;
