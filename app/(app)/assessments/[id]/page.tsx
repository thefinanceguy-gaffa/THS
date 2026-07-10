import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { AssessmentReport } from "./assessment-report";

export const metadata: Metadata = { title: "Site Assessment" };

export default async function AssessmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAppSession();
  if (!session) return null;

  const supabase = await createClient();
  const [{ data: assessment }, { data: areas }] = await Promise.all([
    supabase.from("site_assessments").select("*, customers(id, company_name), leads(id, company_name)").eq("id", id).single(),
    supabase.from("assessment_areas").select("*").eq("assessment_id", id),
  ]);

  if (!assessment) notFound();

  return (
    <AssessmentReport
      assessment={assessment}
      areas={areas ?? []}
      clientName={assessment.customers?.company_name ?? assessment.leads?.company_name ?? "—"}
      customerId={assessment.customers?.id}
      leadId={assessment.leads?.id}
      canManage={session.permissions["leads.manage"] === "allowed"}
    />
  );
}
