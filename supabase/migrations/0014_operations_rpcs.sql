-- ============================================================================
-- THS OS — 0014: Operations & Scheduling write path
-- ============================================================================

create or replace function public.create_job(
  p_customer_id uuid, p_contract_id uuid, p_site_address text, p_suburb text, p_service_type text,
  p_team_id uuid, p_supervisor_id uuid, p_priority text, p_scheduled_start timestamptz, p_scheduled_end timestamptz
)
returns jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.jobs;
begin
  if not public.has_role(array['owner','admin','ops_manager']::user_role[]) then
    raise exception 'Access denied: missing permission to assign jobs';
  end if;

  insert into public.jobs (customer_id, contract_id, site_address, suburb, service_type, team_id, supervisor_id, priority, scheduled_start, scheduled_end)
  values (p_customer_id, p_contract_id, p_site_address, p_suburb, p_service_type, p_team_id, p_supervisor_id, coalesce(p_priority, 'normal'), p_scheduled_start, p_scheduled_end)
  returning * into v_job;

  return v_job;
end;
$$;
revoke execute on function public.create_job(uuid, uuid, text, text, text, uuid, uuid, text, timestamptz, timestamptz) from anon, public;

create or replace function public.update_job_status(p_job_id uuid, p_status job_status)
returns jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.jobs;
begin
  select * into v_job from public.jobs where id = p_job_id;
  if not found then
    raise exception 'Job % not found', p_job_id;
  end if;

  if not (
    public.has_role(array['owner','admin','ops_manager']::user_role[])
    or v_job.supervisor_id = auth.uid()
    or exists (select 1 from public.teams t where t.id = v_job.team_id and t.leader_id = auth.uid())
  ) then
    raise exception 'Access denied';
  end if;

  update public.jobs
     set status = p_status,
         progress = case p_status
           when 'scheduled' then 0 when 'en_route' then 10
           when 'in_progress' then greatest(progress, 25) when 'completed' then 100
           when 'cancelled' then progress else progress end
   where id = p_job_id
   returning * into v_job;

  return v_job;
end;
$$;
revoke execute on function public.update_job_status(uuid, job_status) from anon, public;

-- Field capture — one row per event (check-in, photo, checklist item,
-- chemical/equipment used, incident, signature). client_generated_id makes
-- this safe to replay from an offline outbox without double-inserting.
-- Every event nudges progress forward except monotonic-decrease guards
-- (progress only increases, matching semillaPOS's offline conflict policy).
create or replace function public.record_job_event(
  p_job_id uuid, p_type text, p_payload jsonb default null::jsonb,
  p_gps_lat numeric default null::numeric, p_gps_lng numeric default null::numeric,
  p_client_generated_id text default null::text
)
returns job_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.job_events;
  v_job public.jobs;
begin
  select * into v_job from public.jobs where id = p_job_id;
  if not found then
    raise exception 'Job % not found', p_job_id;
  end if;

  if not public.has_role(array['owner','ops_manager','supervisor','cleaner']::user_role[]) then
    raise exception 'Access denied: missing permission to capture field data';
  end if;

  if p_client_generated_id is not null then
    select * into v_event from public.job_events where client_generated_id = p_client_generated_id;
    if found then
      return v_event;
    end if;
  end if;

  insert into public.job_events (job_id, type, payload, gps_lat, gps_lng, captured_by, synced_at, client_generated_id)
  values (p_job_id, p_type, p_payload, p_gps_lat, p_gps_lng, auth.uid(), now(), p_client_generated_id)
  returning * into v_event;

  update public.jobs
     set progress = case
           when p_type = 'check_in' then greatest(progress, 20)
           when p_type = 'checklist' then least(95, greatest(progress, 50))
           when p_type in ('photo_after', 'signature') then greatest(progress, 90)
           else progress
         end,
         status = case when status = 'scheduled' and p_type = 'check_in' then 'in_progress'::job_status else status end
   where id = p_job_id;

  return v_event;
end;
$$;
revoke execute on function public.record_job_event(uuid, text, jsonb, numeric, numeric, text) from anon, public;
