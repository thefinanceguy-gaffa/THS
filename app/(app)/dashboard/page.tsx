import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { DashboardClient } from "./dashboard-client";
import { PIPELINE_STAGE_ORDER } from "@/lib/crm/pipeline";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await getAppSession();
  if (!session) return null;

  const supabase = await createClient();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [
    { data: payments },
    { data: activeContracts },
    { data: openInvoices },
    { data: leads },
    { data: jobsToday },
    { data: activity },
  ] = await Promise.all([
    supabase.from("payments").select("amount_usd").gte("paid_at", startOfMonth.toISOString()),
    supabase.from("contracts").select("monthly_usd").eq("status", "active").is("deleted_at", null),
    supabase.from("invoices").select("total_usd").in("status", ["sent", "part_paid", "overdue"]).is("deleted_at", null),
    supabase.from("leads").select("stage, est_value_usd").is("deleted_at", null),
    supabase
      .from("jobs")
      .select("id, number, status, site_address, scheduled_start, team:teams(name)")
      .gte("scheduled_start", startOfToday.toISOString())
      .lte("scheduled_start", endOfToday.toISOString())
      .is("deleted_at", null)
      .order("scheduled_start"),
    session.permissions["audit.view"] === "allowed"
      ? supabase.from("audit_logs").select("id, actor_name, action, entity_type, created_at").order("created_at", { ascending: false }).limit(8)
      : Promise.resolve({ data: null }),
  ]);

  const revenueMtd = (payments ?? []).reduce((sum, p) => sum + (p.amount_usd ?? 0), 0);
  const recurringMonthly = (activeContracts ?? []).reduce((sum, c) => sum + (c.monthly_usd ?? 0), 0);
  const outstandingDebtors = (openInvoices ?? []).reduce((sum, i) => sum + i.total_usd, 0);
  const pipelineValue = (leads ?? []).filter((l) => l.stage !== "won" && l.stage !== "lost").reduce((sum, l) => sum + l.est_value_usd, 0);

  const funnel = PIPELINE_STAGE_ORDER.map((stage) => {
    const stageLeads = (leads ?? []).filter((l) => l.stage === stage);
    return { stage, count: stageLeads.length, value: stageLeads.reduce((sum, l) => sum + l.est_value_usd, 0) };
  });
  const maxFunnelValue = Math.max(1, ...funnel.map((f) => f.value));

  return (
    <DashboardClient
      fullName={session.profile.full_name}
      revenueMtd={revenueMtd}
      recurringMonthly={recurringMonthly}
      outstandingDebtors={outstandingDebtors}
      pipelineValue={pipelineValue}
      funnel={funnel}
      maxFunnelValue={maxFunnelValue}
      jobsToday={(jobsToday ?? []).map((j) => ({
        id: j.id,
        number: j.number,
        status: j.status,
        siteAddress: j.site_address,
        scheduledStart: j.scheduled_start,
        teamName: Array.isArray(j.team) ? j.team[0]?.name : (j.team as { name: string } | null)?.name,
      }))}
      activity={activity ?? []}
    />
  );
}
