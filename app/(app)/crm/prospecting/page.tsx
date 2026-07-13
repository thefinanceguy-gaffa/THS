import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { ProspectingClient } from "./prospecting-client";

export const metadata: Metadata = { title: "AI Prospecting" };

export default async function ProspectingPage() {
  const session = await getAppSession();
  if (!session) return null;

  const supabase = await createClient();
  const { data: prospects } = await supabase
    .from("prospect_candidates")
    .select("*")
    .eq("suppressed", false)
    .is("converted_lead_id", null)
    .order("fit_score", { ascending: false, nullsFirst: false })
    .limit(100);

  return <ProspectingClient prospects={prospects ?? []} canRunCollection={["owner", "admin"].includes(session.profile.role)} />;
}
