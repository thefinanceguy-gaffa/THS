import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { computeChurnRisks, computeUpsellOpportunities, forecastNextMonthRevenue, type CustomerSnapshot } from "@/lib/ai-insights/rules";
import { AiInsightsClient } from "./ai-insights-client";

export const metadata: Metadata = { title: "AI Insights" };

export default async function AiInsightsPage() {
  const supabase = await createClient();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [{ data: customers }, { data: lastComms }, { data: payments }] = await Promise.all([
    supabase.from("customers").select("id, company_name, monthly_value_usd, satisfaction, status").is("deleted_at", null),
    supabase.from("communications").select("customer_id, occurred_at").is("deleted_at", null).order("occurred_at", { ascending: false }),
    supabase.from("payments").select("amount_usd, paid_at").gte("paid_at", sixMonthsAgo.toISOString()),
  ]);

  const lastActivityByCustomer = new Map<string, string>();
  for (const c of lastComms ?? []) {
    if (c.customer_id && !lastActivityByCustomer.has(c.customer_id)) lastActivityByCustomer.set(c.customer_id, c.occurred_at);
  }

  const snapshots: CustomerSnapshot[] = (customers ?? []).map((c) => {
    const last = lastActivityByCustomer.get(c.id);
    return {
      id: c.id,
      company_name: c.company_name,
      monthly_value_usd: c.monthly_value_usd,
      satisfaction: c.satisfaction,
      status: c.status,
      lastActivityDaysAgo: last ? Math.floor((Date.now() - new Date(last).getTime()) / 86_400_000) : null,
    };
  });

  const churnRisks = computeChurnRisks(snapshots);
  const upsellOpportunities = computeUpsellOpportunities(snapshots);

  const monthlyRevenue: number[] = Array.from({ length: 6 }, (_, i) => {
    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth() - (5 - i), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    return (payments ?? []).filter((p) => new Date(p.paid_at) >= monthStart && new Date(p.paid_at) < monthEnd).reduce((sum, p) => sum + (p.amount_usd ?? 0), 0);
  });

  const forecast = forecastNextMonthRevenue(monthlyRevenue);

  return <AiInsightsClient monthlyRevenue={monthlyRevenue} forecast={forecast} churnRisks={churnRisks} upsellOpportunities={upsellOpportunities} />;
}
