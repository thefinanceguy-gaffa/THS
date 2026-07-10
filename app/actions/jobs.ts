"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { jobSchema } from "@/lib/validation/jobs";
import type { JobStatus, Json } from "@/lib/supabase/database.types";

export interface ActionState {
  error: string | null;
}

export async function createJob(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = jobSchema.safeParse({
    customer_id: formData.get("customer_id"),
    contract_id: formData.get("contract_id") || undefined,
    site_address: formData.get("site_address"),
    suburb: formData.get("suburb") || undefined,
    service_type: formData.get("service_type") || undefined,
    team_id: formData.get("team_id") || undefined,
    supervisor_id: formData.get("supervisor_id") || undefined,
    priority: formData.get("priority") || "normal",
    scheduled_start: formData.get("scheduled_start"),
    scheduled_end: formData.get("scheduled_end") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form for errors." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_job", {
    p_customer_id: parsed.data.customer_id,
    p_contract_id: parsed.data.contract_id || null,
    p_site_address: parsed.data.site_address,
    p_suburb: parsed.data.suburb || null,
    p_service_type: parsed.data.service_type || null,
    p_team_id: parsed.data.team_id || null,
    p_supervisor_id: parsed.data.supervisor_id || null,
    p_priority: parsed.data.priority,
    p_scheduled_start: new Date(parsed.data.scheduled_start).toISOString(),
    p_scheduled_end: parsed.data.scheduled_end ? new Date(parsed.data.scheduled_end).toISOString() : null,
  });
  if (error) return { error: error.message };

  revalidatePath("/operations");
  return { error: null };
}

export async function updateJobStatus(jobId: string, status: JobStatus): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_job_status", { p_job_id: jobId, p_status: status });
  if (error) return { error: error.message };

  revalidatePath("/operations");
  return { error: null };
}

export async function recordJobEvent(
  jobId: string,
  type: string,
  payload: Json | null,
  gpsLat: number | null,
  gpsLng: number | null,
  clientGeneratedId: string
): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_job_event", {
    p_job_id: jobId,
    p_type: type,
    p_payload: payload,
    p_gps_lat: gpsLat,
    p_gps_lng: gpsLng,
    p_client_generated_id: clientGeneratedId,
  });
  if (error) return { error: error.message };

  revalidatePath("/operations");
  revalidatePath("/operations/field");
  return { error: null };
}

export async function createTeam(name: string, leaderId?: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("teams").insert({ name, leader_id: leaderId || null });
  if (error) return { error: error.message };

  revalidatePath("/operations");
  return { error: null };
}
