import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { OperationsClient } from "./operations-client";

export const metadata: Metadata = { title: "Scheduling" };

export default async function OperationsPage() {
  const session = await getAppSession();
  if (!session) return null;

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const supabase = await createClient();
  const [{ data: jobs }, { data: customers }, { data: teams }, { data: members }] = await Promise.all([
    supabase
      .from("jobs")
      .select("*, customers(company_name)")
      .is("deleted_at", null)
      .gte("scheduled_start", startOfWeek.toISOString())
      .lt("scheduled_start", endOfWeek.toISOString())
      .order("scheduled_start"),
    supabase.from("customers").select("id, company_name").is("deleted_at", null).order("company_name"),
    supabase.from("teams").select("*").is("deleted_at", null).order("name"),
    supabase.from("profiles").select("id, full_name, role").is("deleted_at", null).order("full_name"),
  ]);

  return (
    <OperationsClient
      jobs={(jobs ?? []).map((j) => ({ ...j, clientName: j.customers?.company_name ?? "—" }))}
      customers={customers ?? []}
      teams={teams ?? []}
      members={(members ?? []).map((m) => ({ id: m.id, name: m.full_name, role: m.role }))}
      canManage={session.permissions["jobs.assign"] === "allowed"}
    />
  );
}
