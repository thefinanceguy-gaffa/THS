import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { FieldCaptureClient } from "./field-capture-client";

export const metadata: Metadata = { title: "Supervisor App" };

export default async function FieldCapturePage() {
  const session = await getAppSession();
  if (!session) return null;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  // jobs has no crew-roster join table (DATABASE_SCHEMA.sql only tracks
  // one supervisor_id per job) — a Supervisor sees their own assigned
  // jobs; Cleaner/Owner/Ops Manager see every active job today, since
  // there's no per-cleaner assignment column to scope by yet.
  const supabase = await createClient();
  let query = supabase
    .from("jobs")
    .select("*, customers(company_name)")
    .is("deleted_at", null)
    .in("status", ["scheduled", "en_route", "in_progress"])
    .gte("scheduled_start", startOfToday.toISOString())
    .lte("scheduled_start", endOfToday.toISOString())
    .order("scheduled_start");
  if (session.profile.role === "supervisor") {
    query = query.eq("supervisor_id", session.userId);
  }
  const { data: jobs } = await query;

  return <FieldCaptureClient jobs={(jobs ?? []).map((j) => ({ ...j, clientName: j.customers?.company_name ?? "—" }))} />;
}
