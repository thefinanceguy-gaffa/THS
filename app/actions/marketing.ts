"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { campaignSchema } from "@/lib/validation/marketing";

export interface ActionState {
  error: string | null;
}

export async function createCampaign(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = campaignSchema.safeParse({
    name: formData.get("name"),
    channel: formData.get("channel"),
    status: formData.get("status") || undefined,
    budget_usd: formData.get("budget_usd") ? Number(formData.get("budget_usd")) : undefined,
    starts_on: formData.get("starts_on") || undefined,
    ends_on: formData.get("ends_on") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form for errors." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("campaigns").insert({ ...parsed.data, created_by: user?.id });
  if (error) return { error: error.message };

  revalidatePath("/marketing");
  return { error: null };
}

export async function updateCampaignStatus(campaignId: string, status: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("campaigns").update({ status }).eq("id", campaignId);
  if (error) return { error: error.message };

  revalidatePath("/marketing");
  return { error: null };
}
