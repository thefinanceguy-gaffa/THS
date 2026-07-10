"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { customerSchema, contactSchema } from "@/lib/validation/customers";
import type { InsertTables, UpdateTables } from "@/lib/supabase/database.types";

export interface ActionState {
  error: string | null;
}

function parseCustomerForm(formData: FormData) {
  return customerSchema.safeParse({
    company_name: formData.get("company_name"),
    industry: formData.get("industry") || undefined,
    suburb: formData.get("suburb") || undefined,
    address: formData.get("address") || undefined,
    segment: formData.get("segment") || undefined,
    account_owner_id: formData.get("account_owner_id") || undefined,
    monthly_value_usd: Number(formData.get("monthly_value_usd") || 0),
    status: formData.get("status") || "active",
  });
}

export async function createCustomer(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const parsed = parseCustomerForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form for errors." };

  const payload: InsertTables<"customers"> = { ...parsed.data, account_owner_id: parsed.data.account_owner_id || null };
  const { error } = await supabase.from("customers").insert(payload);
  if (error) return { error: error.message };

  revalidatePath("/customers");
  return { error: null };
}

export async function updateCustomer(customerId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const parsed = parseCustomerForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form for errors." };

  const payload: UpdateTables<"customers"> = { ...parsed.data, account_owner_id: parsed.data.account_owner_id || null };
  const { error } = await supabase.from("customers").update(payload).eq("id", customerId);
  if (error) return { error: error.message };

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  return { error: null };
}

export async function deleteCustomer(customerId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("customers").update({ deleted_at: new Date().toISOString() }).eq("id", customerId);
  if (error) return { error: error.message };

  revalidatePath("/customers");
  return { error: null };
}

export async function createContact(customerId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const parsed = contactSchema.safeParse({
    full_name: formData.get("full_name"),
    role_title: formData.get("role_title") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    is_primary: formData.get("is_primary") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form for errors." };

  const payload: InsertTables<"contacts"> = { ...parsed.data, email: parsed.data.email || null, customer_id: customerId };
  const { error } = await supabase.from("contacts").insert(payload);
  if (error) return { error: error.message };

  revalidatePath(`/customers/${customerId}`);
  return { error: null };
}

export async function logCustomerCommunication(customerId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("log_communication", {
    p_customer_id: customerId,
    p_channel: String(formData.get("channel") ?? "note"),
    p_direction: String(formData.get("direction") ?? "outbound"),
    p_title: (formData.get("title") as string) || null,
    p_note: (formData.get("note") as string) || null,
    p_client_response: (formData.get("client_response") as string) || null,
  });
  if (error) return { error: error.message };

  revalidatePath(`/customers/${customerId}`);
  return { error: null };
}
