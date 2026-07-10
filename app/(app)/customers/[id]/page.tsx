import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { CustomerDetailClient } from "./customer-detail-client";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAppSession();
  if (!session) return null;

  const supabase = await createClient();
  const [{ data: customer }, { data: contacts }, { data: communications }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).single(),
    supabase.from("contacts").select("*").eq("customer_id", id).is("deleted_at", null).order("is_primary", { ascending: false }),
    supabase.from("communications").select("*").eq("customer_id", id).is("deleted_at", null).order("occurred_at", { ascending: false }),
  ]);

  if (!customer) notFound();

  return (
    <CustomerDetailClient
      customer={customer}
      contacts={contacts ?? []}
      communications={communications ?? []}
      canManage={session.permissions["leads.manage"] === "allowed"}
    />
  );
}
