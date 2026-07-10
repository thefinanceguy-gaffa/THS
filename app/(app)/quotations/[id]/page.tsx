import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { QuotationDetailClient } from "./quotation-detail-client";

export const metadata: Metadata = { title: "Quotation" };

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAppSession();
  if (!session) return null;

  const supabase = await createClient();
  const [{ data: quotation }, { data: lines }, { data: approvals }] = await Promise.all([
    supabase.from("quotations").select("*, customers(company_name, address, suburb), leads(company_name, suburb)").eq("id", id).single(),
    supabase.from("quotation_lines").select("*").eq("quotation_id", id).order("line_no"),
    supabase.from("approvals").select("*").eq("entity_type", "quotation").eq("entity_id", id).order("created_at", { ascending: false }),
  ]);

  if (!quotation) notFound();

  return (
    <QuotationDetailClient
      quotation={quotation}
      lines={lines ?? []}
      approvals={approvals ?? []}
      clientName={quotation.customers?.company_name ?? quotation.leads?.company_name ?? "—"}
      clientAddress={quotation.customers?.address ?? undefined}
      role={session.profile.role}
      canManage={session.permissions["quotations.create"] === "allowed"}
    />
  );
}
