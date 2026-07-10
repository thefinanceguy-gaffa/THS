-- ============================================================================
-- THS OS — 0018: Client Portal write path
--
-- A 'client' profile is scoped to exactly one customer via profiles.
-- customer_id (see 0002/0003) and every read-side RLS policy already
-- carries a "current_user_role() = 'client' and ... = my customer_id"
-- branch. These two RPCs are the only writes a client is ever allowed to
-- make, and both re-derive the caller's own customer_id server-side —
-- never trust a customer_id passed in from the client for a portal user.
-- ============================================================================

create or replace function public.portal_respond_to_quotation(p_quotation_id uuid, p_accept boolean)
returns quotations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.quotations;
  v_my_customer_id uuid;
begin
  if public.current_user_role() <> 'client' then
    raise exception 'Access denied: portal-only action';
  end if;

  select customer_id into v_my_customer_id from public.profiles where id = auth.uid();

  select * into v_quote from public.quotations where id = p_quotation_id;
  if not found or v_quote.customer_id is distinct from v_my_customer_id then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;
  if v_quote.status not in ('sent', 'negotiation', 'awaiting_client') then
    raise exception 'This quotation is not awaiting a decision';
  end if;

  update public.quotations set status = (case when p_accept then 'accepted' else 'rejected' end)::quote_status where id = p_quotation_id returning * into v_quote;

  if p_accept and v_quote.lead_id is not null then
    update public.leads set stage = 'won' where id = v_quote.lead_id and stage <> 'won';
  end if;

  return v_quote;
end;
$$;
revoke execute on function public.portal_respond_to_quotation(uuid, boolean) from anon, public;

-- Request Clean / Log Complaint / Rate last service — all logged as
-- communications against the caller's own customer (channel='portal'),
-- so they show up in the same communication log staff already use; no
-- separate "service request" table needed for this to be real.
create or replace function public.portal_log_request(p_kind text, p_note text, p_rating int default null::int)
returns communications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comm public.communications;
  v_my_customer_id uuid;
begin
  if public.current_user_role() <> 'client' then
    raise exception 'Access denied: portal-only action';
  end if;
  if p_kind not in ('clean_request', 'complaint', 'rating') then
    raise exception 'Unknown request kind %', p_kind;
  end if;

  select customer_id into v_my_customer_id from public.profiles where id = auth.uid();
  if v_my_customer_id is null then
    raise exception 'This account is not linked to a customer';
  end if;

  insert into public.communications (customer_id, channel, direction, title, note, logged_by)
  values (
    v_my_customer_id, 'portal', 'inbound',
    case p_kind when 'clean_request' then 'Service request' when 'complaint' then 'Complaint' else 'Service rating' end,
    p_note, auth.uid()
  )
  returning * into v_comm;

  if p_kind = 'rating' and p_rating is not null then
    update public.customers
       set satisfaction = round((coalesce(satisfaction, p_rating::numeric) + p_rating) / 2, 1)
     where id = v_my_customer_id;
  end if;

  return v_comm;
end;
$$;
revoke execute on function public.portal_log_request(text, text, int) from anon, public;
