import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AssessmentForm } from "./assessment-form";

export const metadata: Metadata = { title: "New Site Assessment" };

export default async function NewAssessmentPage({ searchParams }: { searchParams: Promise<{ leadId?: string; customerId?: string }> }) {
  const { leadId, customerId } = await searchParams;
  const supabase = await createClient();

  const [{ data: customers }, { data: leads }, { data: members }] = await Promise.all([
    supabase.from("customers").select("id, company_name").is("deleted_at", null).order("company_name"),
    supabase.from("leads").select("id, company_name, suburb").is("deleted_at", null).order("company_name"),
    supabase.from("profiles").select("id, full_name").is("deleted_at", null).order("full_name"),
  ]);

  return (
    <AssessmentForm
      customers={customers ?? []}
      leads={leads ?? []}
      members={(members ?? []).map((m) => ({ id: m.id, name: m.full_name }))}
      defaultCustomerId={customerId}
      defaultLeadId={leadId}
    />
  );
}
