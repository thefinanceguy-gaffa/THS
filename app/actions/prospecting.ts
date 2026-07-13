"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { runProspectCollection } from "@/lib/prospecting/collect";

export interface ActionState {
  error: string | null;
}

export async function convertProspectToLead(prospectId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("convert_prospect_to_lead", { p_prospect_id: prospectId });
  if (error) return { error: error.message };

  revalidatePath("/crm/prospecting");
  revalidatePath("/crm");
  return { error: null };
}

export async function dismissProspect(prospectId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("prospect_candidates").update({ suppressed: true }).eq("id", prospectId);
  if (error) return { error: error.message };

  revalidatePath("/crm/prospecting");
  return { error: null };
}

export async function runProspectCollectionNow(): Promise<ActionState & { summary?: Awaited<ReturnType<typeof runProspectCollection>> }> {
  const session = await getAppSession();
  if (!session || !["owner", "admin"].includes(session.profile.role)) {
    return { error: "Only Owner/Admin can trigger a collection run." };
  }

  const summary = await runProspectCollection();
  if (!summary.configured) {
    return { error: "Google Places isn't configured yet (GOOGLE_PLACES_API_KEY missing).", summary };
  }

  revalidatePath("/crm/prospecting");
  return { error: null, summary };
}
