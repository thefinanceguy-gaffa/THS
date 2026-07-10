import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { ContractsClient } from "./contracts-client";

export const metadata: Metadata = { title: "Contracts" };

export default async function ContractsPage() {
  const session = await getAppSession();
  if (!session) return null;

  const supabase = await createClient();
  const [{ data: contracts }, { data: customers }] = await Promise.all([
    supabase.from("contracts").select("*, customers(company_name)").is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("customers").select("id, company_name").is("deleted_at", null).order("company_name"),
  ]);

  return (
    <ContractsClient
      contracts={(contracts ?? []).map((c) => ({ ...c, clientName: c.customers?.company_name ?? "—" }))}
      customers={customers ?? []}
      canManage={session.profile.role === "owner" || session.profile.role === "finance"}
    />
  );
}
