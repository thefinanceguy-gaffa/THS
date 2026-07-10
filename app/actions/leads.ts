"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { leadSchema, communicationSchema } from "@/lib/validation/leads";
import type { InsertTables, UpdateTables, LeadStage } from "@/lib/supabase/database.types";

export interface ActionState {
  error: string | null;
}

function firstFieldError(errors: Record<string, string[] | undefined> | undefined): string | null {
  if (!errors) return null;
  for (const key of Object.keys(errors)) {
    const message = errors[key]?.[0];
    if (message) return message;
  }
  return null;
}

function parseLeadForm(formData: FormData) {
  return leadSchema.safeParse({
    company_name: formData.get("company_name"),
    contact_name: formData.get("contact_name") || undefined,
    contact_role: formData.get("contact_role") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    industry: formData.get("industry") || undefined,
    suburb: formData.get("suburb") || undefined,
    company_size: formData.get("company_size") || undefined,
    service_required: formData.get("service_required") || undefined,
    source: formData.get("source") || "website",
    score: formData.get("score") || "warm",
    est_value_usd: Number(formData.get("est_value_usd") || 0),
    win_probability: Number(formData.get("win_probability") || 0),
    owner_id: formData.get("owner_id") || undefined,
    next_followup_at: formData.get("next_followup_at") || undefined,
  });
}

export async function createLead(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired — please log in again." };

  const parsed = parseLeadForm(formData);
  if (!parsed.success) {
    return { error: firstFieldError(parsed.error.flatten().fieldErrors) ?? "Please check the form for errors." };
  }

  const payload: InsertTables<"leads"> = {
    ...parsed.data,
    email: parsed.data.email || null,
    owner_id: parsed.data.owner_id || user.id,
    next_followup_at: parsed.data.next_followup_at || null,
    created_by: user.id,
    updated_by: user.id,
  };

  const { error } = await supabase.from("leads").insert(payload);
  if (error) {
    if (error.message.includes("leads_email_uniq") || error.message.includes("leads_phone_uniq")) {
      return { error: "A lead with this email or phone already exists." };
    }
    return { error: error.message };
  }

  revalidatePath("/crm");
  return { error: null };
}

export async function updateLead(leadId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired — please log in again." };

  const parsed = parseLeadForm(formData);
  if (!parsed.success) {
    return { error: firstFieldError(parsed.error.flatten().fieldErrors) ?? "Please check the form for errors." };
  }

  const payload: UpdateTables<"leads"> = {
    ...parsed.data,
    email: parsed.data.email || null,
    owner_id: parsed.data.owner_id || null,
    next_followup_at: parsed.data.next_followup_at || null,
    updated_by: user.id,
  };

  const { error } = await supabase.from("leads").update(payload).eq("id", leadId);
  if (error) return { error: error.message };

  revalidatePath("/crm");
  return { error: null };
}

export async function deleteLead(leadId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("leads").update({ deleted_at: new Date().toISOString() }).eq("id", leadId);
  if (error) return { error: error.message };

  revalidatePath("/crm");
  return { error: null };
}

export async function moveLeadStage(leadId: string, stage: LeadStage): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_lead_stage", { p_lead_id: leadId, p_stage: stage });
  if (error) return { error: error.message };

  revalidatePath("/crm");
  return { error: null };
}

export async function updateLeadBant(leadId: string, field: "bant_budget" | "bant_authority" | "bant_need" | "bant_timeline", value: "yes" | "no" | "unknown"): Promise<ActionState> {
  const supabase = await createClient();
  const payload: UpdateTables<"leads"> = {};
  payload[field] = value;
  const { error } = await supabase.from("leads").update(payload).eq("id", leadId);
  if (error) return { error: error.message };

  revalidatePath("/crm");
  return { error: null };
}

export async function logLeadCommunication(leadId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = communicationSchema.safeParse({
    channel: formData.get("channel"),
    direction: formData.get("direction"),
    title: formData.get("title") || undefined,
    note: formData.get("note") || undefined,
    client_response: formData.get("client_response") || undefined,
    next_followup_at: formData.get("next_followup_at") || undefined,
  });
  if (!parsed.success) {
    return { error: firstFieldError(parsed.error.flatten().fieldErrors) ?? "Please check the form for errors." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("log_communication", {
    p_lead_id: leadId,
    p_channel: parsed.data.channel,
    p_direction: parsed.data.direction,
    p_title: parsed.data.title || null,
    p_note: parsed.data.note || null,
    p_client_response: parsed.data.client_response || null,
    p_next_followup_at: parsed.data.next_followup_at || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/crm");
  return { error: null };
}

export async function convertLeadToCustomer(leadId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("convert_lead_to_customer", { p_lead_id: leadId });
  if (error) return { error: error.message };

  revalidatePath("/crm");
  revalidatePath("/customers");
  return { error: null };
}
