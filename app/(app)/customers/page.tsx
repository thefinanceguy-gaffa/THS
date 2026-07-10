import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { CustomersManager } from "./customers-manager";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage() {
  const session = await getAppSession();
  if (!session) return null;

  const supabase = await createClient();
  const [{ data: customers }, { data: members }] = await Promise.all([
    supabase.from("customers").select("*").is("deleted_at", null).order("company_name"),
    supabase.from("profiles").select("id, full_name").is("deleted_at", null).order("full_name"),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Customers</h1>
        <p className="text-sm text-muted-foreground">Every account, its contacts, and its full communication history.</p>
      </div>
      <CustomersManager
        customers={customers ?? []}
        members={(members ?? []).map((m) => ({ id: m.id, name: m.full_name }))}
        canManage={session.permissions["leads.manage"] === "allowed"}
      />
    </div>
  );
}
