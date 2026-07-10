import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortalQuoteClient } from "./portal-quote-client";

export const metadata: Metadata = { title: "Quotation" };

export default async function PortalQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: quotation }, { data: lines }] = await Promise.all([
    supabase.from("quotations").select("*").eq("id", id).single(),
    supabase.from("quotation_lines").select("*").eq("quotation_id", id).order("line_no"),
  ]);

  if (!quotation) notFound();

  return <PortalQuoteClient quotation={quotation} lines={lines ?? []} />;
}
