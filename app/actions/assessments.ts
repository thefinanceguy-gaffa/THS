"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assessmentSchema } from "@/lib/validation/assessments";

export interface ActionState {
  error: string | null;
}

export async function createAssessment(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const areasRaw = formData.get("areas");
  const parsed = assessmentSchema.safeParse({
    customer_id: formData.get("customer_id") || undefined,
    lead_id: formData.get("lead_id") || undefined,
    site_name: formData.get("site_name"),
    suburb: formData.get("suburb") || undefined,
    assessor_id: formData.get("assessor_id") || undefined,
    scheduled_at: formData.get("scheduled_at") || undefined,
    recommended_crew: formData.get("recommended_crew") || undefined,
    service_window: formData.get("service_window") || undefined,
    est_monthly_usd: formData.get("est_monthly_usd") ? Number(formData.get("est_monthly_usd")) : undefined,
    risks: formData.get("risks") || undefined,
    areas: areasRaw ? JSON.parse(String(areasRaw)) : [],
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form for errors." };
  if (!parsed.data.customer_id && !parsed.data.lead_id) return { error: "Select a customer or a lead." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_site_assessment", {
    p_customer_id: parsed.data.customer_id || null,
    p_lead_id: parsed.data.lead_id || null,
    p_site_name: parsed.data.site_name,
    p_suburb: parsed.data.suburb || null,
    p_assessor_id: parsed.data.assessor_id || null,
    p_scheduled_at: parsed.data.scheduled_at || null,
    p_recommended_crew: parsed.data.recommended_crew || null,
    p_service_window: parsed.data.service_window || null,
    p_est_monthly_usd: parsed.data.est_monthly_usd ?? null,
    p_risks: parsed.data.risks || null,
    p_areas: parsed.data.areas,
  });
  if (error) return { error: error.message };

  revalidatePath("/assessments");
  redirect(`/assessments/${data.id}`);
}

export async function completeAssessment(assessmentId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_site_assessment", { p_assessment_id: assessmentId });
  if (error) return { error: error.message };

  revalidatePath(`/assessments/${assessmentId}`);
  revalidatePath("/assessments");
  return { error: null };
}
