"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ActionState {
  error: string | null;
}

export async function portalLogRequest(kind: "clean_request" | "complaint" | "rating", note: string, rating?: number): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("portal_log_request", { p_kind: kind, p_note: note, p_rating: rating ?? null });
  if (error) return { error: error.message };

  revalidatePath("/portal");
  return { error: null };
}

export async function portalRespondToQuotation(quotationId: string, accept: boolean): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("portal_respond_to_quotation", { p_quotation_id: quotationId, p_accept: accept });
  if (error) return { error: error.message };

  revalidatePath("/portal");
  revalidatePath(`/portal/quotes/${quotationId}`);
  return { error: null };
}
