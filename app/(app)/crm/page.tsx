import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { CrmClient } from "./crm-client";

export const metadata: Metadata = { title: "CRM & Leads" };

export default async function CrmPage() {
  const session = await getAppSession();
  if (!session) return null;

  const supabase = await createClient();
  const [{ data: leads }, { data: members }] = await Promise.all([
    supabase.from("leads").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, role").is("deleted_at", null).order("full_name"),
  ]);

  return (
    <CrmClient
      leads={leads ?? []}
      members={(members ?? []).map((m) => ({ id: m.id, name: m.full_name }))}
      canManage={session.permissions["leads.manage"] === "allowed"}
    />
  );
}
