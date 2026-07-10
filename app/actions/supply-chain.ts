"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { inventoryItemSchema, supplierSchema, vehicleSchema, employeeRecordSchema } from "@/lib/validation/supply-chain";

export interface ActionState {
  error: string | null;
}

export async function createInventoryItem(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = inventoryItemSchema.safeParse({
    code: formData.get("code") || undefined,
    name: formData.get("name"),
    category: formData.get("category") || undefined,
    unit: formData.get("unit") || undefined,
    unit_cost_usd: formData.get("unit_cost_usd") ? Number(formData.get("unit_cost_usd")) : undefined,
    reorder_level: formData.get("reorder_level") ? Number(formData.get("reorder_level")) : undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form for errors." };

  const supabase = await createClient();
  const { error } = await supabase.from("inventory_items").insert(parsed.data);
  if (error) return { error: error.message };

  revalidatePath("/inventory");
  return { error: null };
}

export async function adjustStock(itemId: string, quantity: number, reference: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("adjust_stock", { p_item_id: itemId, p_location_id: null, p_quantity: quantity, p_reference: reference });
  if (error) return { error: error.message };

  revalidatePath("/inventory");
  return { error: null };
}

export async function createSupplier(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = supplierSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category") || undefined,
    suburb: formData.get("suburb") || undefined,
    rating: formData.get("rating") ? Number(formData.get("rating")) : undefined,
    payment_terms: formData.get("payment_terms") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form for errors." };

  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").insert(parsed.data);
  if (error) return { error: error.message };

  revalidatePath("/suppliers");
  return { error: null };
}

export async function createPurchaseOrder(supplierId: string, amountUsd: number): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_purchase_order", { p_supplier_id: supplierId, p_amount_usd: amountUsd });
  if (error) return { error: error.message };

  revalidatePath("/procurement");
  return { error: null };
}

export async function decidePurchaseOrder(poId: string, approve: boolean): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_purchase_order", { p_po_id: poId, p_approve: approve });
  if (error) return { error: error.message };

  revalidatePath("/procurement");
  return { error: null };
}

export async function markPoDelivered(poId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_po_delivered", { p_po_id: poId });
  if (error) return { error: error.message };

  revalidatePath("/procurement");
  return { error: null };
}

export async function createVehicle(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = vehicleSchema.safeParse({
    name: formData.get("name"),
    registration: formData.get("registration"),
    kind: formData.get("kind") || undefined,
    year: formData.get("year") ? Number(formData.get("year")) : undefined,
    mileage_km: formData.get("mileage_km") ? Number(formData.get("mileage_km")) : undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form for errors." };

  const supabase = await createClient();
  const { error } = await supabase.from("vehicles").insert(parsed.data);
  if (error) return { error: error.message };

  revalidatePath("/vehicles");
  return { error: null };
}

export async function createEmployeeRecord(profileId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = employeeRecordSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    detail: formData.get("detail") || undefined,
    status: formData.get("status") || undefined,
    effective_on: formData.get("effective_on") || undefined,
    expires_on: formData.get("expires_on") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form for errors." };

  const supabase = await createClient();
  const { error } = await supabase.from("employee_records").insert({ ...parsed.data, profile_id: profileId });
  if (error) return { error: error.message };

  revalidatePath(`/hr/${profileId}`);
  return { error: null };
}
