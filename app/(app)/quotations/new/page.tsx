import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { QuoteBuilder } from "./quote-builder";

export const metadata: Metadata = { title: "New Quotation" };

export default async function NewQuotationPage({ searchParams }: { searchParams: Promise<{ leadId?: string; customerId?: string }> }) {
  const { leadId, customerId } = await searchParams;
  const supabase = await createClient();

  const [{ data: customers }, { data: leads }, lead] = await Promise.all([
    supabase.from("customers").select("id, company_name").is("deleted_at", null).order("company_name"),
    supabase.from("leads").select("id, company_name").is("deleted_at", null).order("company_name"),
    leadId ? supabase.from("leads").select("*").eq("id", leadId).single().then((r) => r.data) : Promise.resolve(null),
  ]);

  return (
    <QuoteBuilder
      customers={customers ?? []}
      leads={leads ?? []}
      defaultCustomerId={customerId}
      defaultLeadId={leadId}
      prefillServiceSummary={lead?.service_required ?? undefined}
    />
  );
}
