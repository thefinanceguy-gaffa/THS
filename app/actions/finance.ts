"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { contractSchema, invoiceSchema, paymentSchema, expenseSchema } from "@/lib/validation/finance";
import { sendInvoiceEmail, sendReceiptEmail } from "@/lib/email/send";

export interface ActionState {
  error: string | null;
}

export async function createContract(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = contractSchema.safeParse({
    customer_id: formData.get("customer_id"),
    service_type: formData.get("service_type"),
    monthly_usd: Number(formData.get("monthly_usd") || 0),
    term_months: Number(formData.get("term_months") || 12),
    starts_on: formData.get("starts_on"),
    auto_renew: formData.get("auto_renew") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form for errors." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_contract", {
    p_customer_id: parsed.data.customer_id,
    p_service_type: parsed.data.service_type,
    p_monthly_usd: parsed.data.monthly_usd,
    p_term_months: parsed.data.term_months,
    p_starts_on: parsed.data.starts_on,
    p_auto_renew: parsed.data.auto_renew,
  });
  if (error) return { error: error.message };

  revalidatePath("/contracts");
  return { error: null };
}

export async function createInvoice(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const linesRaw = formData.get("lines");
  const parsed = invoiceSchema.safeParse({
    customer_id: formData.get("customer_id"),
    contract_id: formData.get("contract_id") || undefined,
    issued_on: formData.get("issued_on") || undefined,
    due_on: formData.get("due_on") || undefined,
    lines: linesRaw ? JSON.parse(String(linesRaw)) : [],
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form for errors." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_invoice", {
    p_customer_id: parsed.data.customer_id,
    p_contract_id: parsed.data.contract_id || null,
    p_issued_on: parsed.data.issued_on || null,
    p_due_on: parsed.data.due_on || null,
    p_lines: parsed.data.lines,
  });
  if (error) return { error: error.message };
  await sendInvoiceEmail(supabase, data);

  revalidatePath("/finance/invoices");
  redirect(`/finance/invoices/${data.id}`);
}

export async function recordPayment(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = paymentSchema.safeParse({
    invoice_id: formData.get("invoice_id") || undefined,
    customer_id: formData.get("customer_id"),
    amount_usd: Number(formData.get("amount_usd") || 0),
    method: formData.get("method") || "EFT",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form for errors." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_payment", {
    p_invoice_id: parsed.data.invoice_id || null,
    p_customer_id: parsed.data.customer_id,
    p_amount_usd: parsed.data.amount_usd,
    p_method: parsed.data.method,
  });
  if (error) return { error: error.message };
  await sendReceiptEmail(supabase, data);

  revalidatePath("/finance/payments");
  revalidatePath("/finance/invoices");
  revalidatePath("/finance/debtors");
  if (parsed.data.invoice_id) revalidatePath(`/finance/invoices/${parsed.data.invoice_id}`);
  return { error: null };
}

export async function createExpense(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired — please log in again." };

  const parsed = expenseSchema.safeParse({
    category: formData.get("category"),
    description: formData.get("description") || undefined,
    amount_usd: Number(formData.get("amount_usd") || 0),
    incurred_on: formData.get("incurred_on"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form for errors." };

  const { error } = await supabase.from("expenses").insert({ ...parsed.data, recorded_by: user.id });
  if (error) return { error: error.message };

  revalidatePath("/finance/expenses");
  return { error: null };
}
