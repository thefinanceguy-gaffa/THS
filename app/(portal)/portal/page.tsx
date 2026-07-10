import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { PortalHomeClient } from "./portal-home-client";

export const metadata: Metadata = { title: "THS Client Portal" };

export default async function PortalHomePage() {
  const session = await getAppSession();
  if (!session || !session.profile.customer_id) return null;

  const customerId = session.profile.customer_id;
  const supabase = await createClient();

  const [{ data: customer }, { data: nextJob }, { data: awaitingQuotes }, { data: lastCompletedJob }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", customerId).single(),
    supabase.from("jobs").select("*").eq("customer_id", customerId).in("status", ["scheduled", "en_route", "in_progress"]).order("scheduled_start").limit(1).maybeSingle(),
    supabase.from("quotations").select("id, number, total_usd").eq("customer_id", customerId).in("status", ["sent", "negotiation", "awaiting_client"]),
    supabase.from("jobs").select("id, number, site_address").eq("customer_id", customerId).eq("status", "completed").order("scheduled_start", { ascending: false }).limit(1).maybeSingle(),
  ]);

  return (
    <PortalHomeClient
      customerName={customer?.company_name ?? "—"}
      nextJob={nextJob ?? null}
      awaitingQuotes={awaitingQuotes ?? []}
      lastCompletedJob={lastCompletedJob ?? null}
    />
  );
}
