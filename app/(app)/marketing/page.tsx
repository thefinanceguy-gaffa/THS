import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { MarketingClient } from "./marketing-client";

export const metadata: Metadata = { title: "Marketing" };

export default async function MarketingPage() {
  const supabase = await createClient();
  const [{ data: campaigns }, { data: leads }] = await Promise.all([
    supabase.from("campaigns").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("leads").select("campaign_id, stage, est_value_usd").is("deleted_at", null).not("campaign_id", "is", null),
  ]);

  const rows = (campaigns ?? []).map((c) => {
    const attributed = (leads ?? []).filter((l) => l.campaign_id === c.id);
    const won = attributed.filter((l) => l.stage === "won").length;
    const pipelineValue = attributed.reduce((sum, l) => sum + l.est_value_usd, 0);
    return {
      ...c,
      leadsGenerated: attributed.length,
      leadsWon: won,
      pipelineValueUsd: pipelineValue,
      costPerLead: attributed.length > 0 ? c.budget_usd / attributed.length : null,
    };
  });

  return <MarketingClient campaigns={rows} />;
}
