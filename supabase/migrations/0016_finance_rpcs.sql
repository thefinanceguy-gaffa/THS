-- ============================================================================
-- THS OS — 0016: Finance write path (Invoicing, Payments)
-- ============================================================================

create or replace function public.create_invoice(
  p_customer_id uuid, p_contract_id uuid, p_issued_on date, p_due_on date, p_lines jsonb
)
returns invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices;
  v_line jsonb;
  v_subtotal numeric(12,2) := 0;
  v_line_no int := 0;
begin
  if not public.has_role(array['owner','finance']::user_role[]) then
    raise exception 'Access denied: missing permission to create invoices';
  end if;

  insert into public.invoices (customer_id, contract_id, issued_on, due_on, created_by)
  values (p_customer_id, p_contract_id, coalesce(p_issued_on, current_date), p_due_on, auth.uid())
  returning * into v_invoice;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    insert into public.invoice_lines (invoice_id, description, quantity, unit, rate_usd, line_no)
    values (v_invoice.id, v_line->>'description', coalesce((v_line->>'quantity')::numeric, 1), v_line->>'unit', coalesce((v_line->>'rate_usd')::numeric, 0), v_line_no);
    v_subtotal := v_subtotal + coalesce((v_line->>'quantity')::numeric, 1) * coalesce((v_line->>'rate_usd')::numeric, 0);
    v_line_no := v_line_no + 1;
  end loop;

  update public.invoices
     set subtotal_usd = v_subtotal, vat_usd = round(v_subtotal * 0.15, 2), total_usd = round(v_subtotal * 1.15, 2),
         status = 'sent'
   where id = v_invoice.id
   returning * into v_invoice;

  return v_invoice;
end;
$$;
revoke execute on function public.create_invoice(uuid, uuid, date, date, jsonb) from anon, public;
grant execute on function public.create_invoice(uuid, uuid, date, date, jsonb) to authenticated;

create or replace function public.record_payment(p_invoice_id uuid, p_customer_id uuid, p_amount_usd numeric, p_method text)
returns payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments;
  v_invoice public.invoices;
  v_paid_total numeric(12,2);
begin
  if not public.has_role(array['owner','finance']::user_role[]) then
    raise exception 'Access denied: missing permission to record payments';
  end if;
  if p_amount_usd <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  insert into public.payments (invoice_id, customer_id, amount_usd, method, allocated, recorded_by)
  values (p_invoice_id, p_customer_id, p_amount_usd, p_method, p_invoice_id is not null, auth.uid())
  returning * into v_payment;

  if p_invoice_id is not null then
    select * into v_invoice from public.invoices where id = p_invoice_id;
    select coalesce(sum(amount_usd), 0) into v_paid_total from public.payments where invoice_id = p_invoice_id;

    update public.invoices
       set status = (case when v_paid_total >= v_invoice.total_usd then 'paid' when v_paid_total > 0 then 'part_paid' else v_invoice.status end)::invoice_status
     where id = p_invoice_id;
  end if;

  return v_payment;
end;
$$;
revoke execute on function public.record_payment(uuid, uuid, numeric, text) from anon, public;
grant execute on function public.record_payment(uuid, uuid, numeric, text) to authenticated;

create or replace function public.create_contract(
  p_customer_id uuid, p_service_type text, p_monthly_usd numeric, p_term_months int, p_starts_on date, p_auto_renew boolean
)
returns contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.contracts;
begin
  if not public.has_role(array['owner','finance']::user_role[]) then
    raise exception 'Access denied: missing permission to create contracts';
  end if;

  insert into public.contracts (customer_id, service_type, monthly_usd, term_months, starts_on, renews_on, auto_renew, status)
  values (p_customer_id, p_service_type, p_monthly_usd, p_term_months, p_starts_on, p_starts_on + make_interval(months => coalesce(p_term_months, 12)), coalesce(p_auto_renew, true), 'active')
  returning * into v_contract;

  return v_contract;
end;
$$;
revoke execute on function public.create_contract(uuid, text, numeric, int, date, boolean) from anon, public;
grant execute on function public.create_contract(uuid, text, numeric, int, date, boolean) to authenticated;
