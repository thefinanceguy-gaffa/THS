import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InvoiceDetailClient } from "./invoice-detail-client";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: invoice }, { data: lines }, { data: payments }] = await Promise.all([
    supabase.from("invoices").select("*, customers(company_name, address, suburb)").eq("id", id).single(),
    supabase.from("invoice_lines").select("*").eq("invoice_id", id).order("line_no"),
    supabase.from("payments").select("*").eq("invoice_id", id).order("paid_at", { ascending: false }),
  ]);

  if (!invoice) notFound();

  return <InvoiceDetailClient invoice={invoice} lines={lines ?? []} payments={payments ?? []} clientName={invoice.customers?.company_name ?? "—"} clientAddress={invoice.customers?.address ?? undefined} />;
}
