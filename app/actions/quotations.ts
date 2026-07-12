"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { quotationSchema } from "@/lib/validation/quotations";
import { sendQuotationEmail } from "@/lib/email/send";
import type { QuoteStatus, Tables } from "@/lib/supabase/database.types";

export interface ActionState {
  error: string | null;
}

export async function createQuotation(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const linesRaw = formData.get("lines");
  const parsed = quotationSchema.safeParse({
    customer_id: formData.get("customer_id") || undefined,
    lead_id: formData.get("lead_id") || undefined,
    service_summary: formData.get("service_summary") || undefined,
    discount_percent: Number(formData.get("discount_percent") || 0),
    valid_until: formData.get("valid_until") || undefined,
    lines: linesRaw ? JSON.parse(String(linesRaw)) : [],
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form for errors." };
  }
  if (!parsed.data.customer_id && !parsed.data.lead_id) {
    return { error: "Select a customer or a lead for this quotation." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_quotation", {
    p_customer_id: parsed.data.customer_id || null,
    p_lead_id: parsed.data.lead_id || null,
    p_assessment_id: null,
    p_service_summary: parsed.data.service_summary || null,
    p_discount_percent: parsed.data.discount_percent,
    p_valid_until: parsed.data.valid_until || null,
    p_lines: parsed.data.lines,
  });
  if (error) return { error: error.message };

  revalidatePath("/quotations");
  redirect(`/quotations/${data.id}`);
}

async function emailIfSent(supabase: Awaited<ReturnType<typeof createClient>>, quotation: Tables<"quotations"> | null) {
  if (quotation?.status === "sent") await sendQuotationEmail(supabase, quotation);
}

export async function submitQuotation(quotationId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_quotation", { p_quotation_id: quotationId });
  if (error) return { error: error.message };
  await emailIfSent(supabase, data);

  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath("/quotations");
  return { error: null };
}

export async function decideQuotationApproval(quotationId: string, approve: boolean, reason?: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("decide_quotation_approval", { p_quotation_id: quotationId, p_approve: approve, p_reason: reason || null });
  if (error) return { error: error.message };
  await emailIfSent(supabase, data);

  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath("/quotations");
  return { error: null };
}

export async function setQuotationStatus(quotationId: string, status: QuoteStatus): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_quotation_status", { p_quotation_id: quotationId, p_status: status });
  if (error) return { error: error.message };

  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath("/quotations");
  revalidatePath("/crm");
  return { error: null };
}
