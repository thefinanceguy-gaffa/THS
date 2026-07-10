import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { InvoiceBuilder } from "./invoice-builder";

export const metadata: Metadata = { title: "New Invoice" };

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ customerId?: string }> }) {
  const { customerId } = await searchParams;
  const supabase = await createClient();
  const [{ data: customers }, { data: contracts }] = await Promise.all([
    supabase.from("customers").select("id, company_name").is("deleted_at", null).order("company_name"),
    supabase.from("contracts").select("id, number, customer_id, service_type, monthly_usd").eq("status", "active").is("deleted_at", null),
  ]);

  return <InvoiceBuilder customers={customers ?? []} contracts={contracts ?? []} defaultCustomerId={customerId} />;
}
