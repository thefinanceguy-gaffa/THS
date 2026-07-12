import "server-only";
import { getResendClient, EMAIL_FROM } from "./client";
import { quotationEmail, invoiceEmail, receiptEmail } from "./templates";
import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

type Supa = Awaited<ReturnType<typeof createClient>>;
type Recipient = { email: string; name: string };

function appUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}${path}`;
}

async function recipientForCustomer(supabase: Supa, customerId: string): Promise<Recipient | null> {
  const { data: customer } = await supabase.from("customers").select("company_name").eq("id", customerId).maybeSingle();
  const { data: contact } = await supabase
    .from("contacts")
    .select("full_name, email")
    .eq("customer_id", customerId)
    .not("email", "is", null)
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!contact?.email) return null;
  return { email: contact.email, name: contact.full_name || customer?.company_name || "there" };
}

async function recipientForLead(supabase: Supa, leadId: string): Promise<Recipient | null> {
  const { data: lead } = await supabase.from("leads").select("email, contact_name, company_name").eq("id", leadId).maybeSingle();
  if (!lead?.email) return null;
  return { email: lead.email, name: lead.contact_name || lead.company_name || "there" };
}

/** Best-effort — never throws. Callers should not let a failed/unconfigured send block the primary write. */
async function send(to: string, subject: string, html: string): Promise<{ error: string | null }> {
  const client = getResendClient();
  if (!client) {
    console.warn(`[email] RESEND_API_KEY not set — skipped "${subject}" to ${to}`);
    return { error: "Email is not configured yet (RESEND_API_KEY missing)." };
  }
  const { error } = await client.emails.send({ from: EMAIL_FROM, to, subject, html });
  if (error) {
    console.error(`[email] send failed for "${subject}" to ${to}:`, error);
    return { error: error.message };
  }
  return { error: null };
}

async function logEmailSent(supabase: Supa, opts: { leadId?: string | null; customerId?: string | null; title: string; note: string }) {
  await supabase.rpc("log_communication", {
    p_lead_id: opts.leadId ?? null,
    p_customer_id: opts.customerId ?? null,
    p_channel: "email",
    p_direction: "outbound",
    p_title: opts.title,
    p_note: opts.note,
  });
}

export async function sendQuotationEmail(supabase: Supa, quotation: Tables<"quotations">): Promise<{ error: string | null }> {
  const recipient = quotation.customer_id
    ? await recipientForCustomer(supabase, quotation.customer_id)
    : quotation.lead_id
      ? await recipientForLead(supabase, quotation.lead_id)
      : null;
  if (!recipient) return { error: "No email address on file for this quotation's customer/lead." };

  const { subject, html } = quotationEmail({
    number: quotation.number,
    customerName: recipient.name,
    totalUsd: quotation.total_usd,
    validUntil: quotation.valid_until,
    portalUrl: appUrl(`/portal/quotes/${quotation.id}`),
  });
  const result = await send(recipient.email, subject, html);
  if (!result.error) {
    await logEmailSent(supabase, {
      leadId: quotation.lead_id,
      customerId: quotation.customer_id,
      title: `Quotation ${quotation.number} emailed`,
      note: `Sent to ${recipient.email}`,
    });
  }
  return result;
}

export async function sendInvoiceEmail(supabase: Supa, invoice: Tables<"invoices">): Promise<{ error: string | null }> {
  if (!invoice.customer_id) return { error: "Invoice has no customer." };
  const recipient = await recipientForCustomer(supabase, invoice.customer_id);
  if (!recipient) return { error: "No email address on file for this customer." };

  const { subject, html } = invoiceEmail({
    number: invoice.number,
    customerName: recipient.name,
    totalUsd: invoice.total_usd,
    dueOn: invoice.due_on,
    portalUrl: appUrl(`/portal/invoices`),
  });
  const result = await send(recipient.email, subject, html);
  if (!result.error) {
    await logEmailSent(supabase, {
      customerId: invoice.customer_id,
      title: `Invoice ${invoice.number} emailed`,
      note: `Sent to ${recipient.email}`,
    });
  }
  return result;
}

export async function sendReceiptEmail(supabase: Supa, payment: Tables<"payments">): Promise<{ error: string | null }> {
  if (!payment.customer_id) return { error: "Payment has no customer." };
  const recipient = await recipientForCustomer(supabase, payment.customer_id);
  if (!recipient) return { error: "No email address on file for this customer." };

  const { subject, html } = receiptEmail({
    receiptNumber: payment.receipt_number ?? "—",
    customerName: recipient.name,
    amountUsd: payment.amount_usd ?? 0,
    method: payment.method,
    portalUrl: appUrl(`/portal/invoices`),
  });
  const result = await send(recipient.email, subject, html);
  if (!result.error) {
    await logEmailSent(supabase, {
      customerId: payment.customer_id,
      title: `Receipt ${payment.receipt_number} emailed`,
      note: `Sent to ${recipient.email}`,
    });
  }
  return result;
}
