import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { QuotationsClient } from "./quotations-client";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/material-icon";

export const metadata: Metadata = { title: "Quotations" };

export default async function QuotationsPage() {
  const session = await getAppSession();
  if (!session) return null;

  const supabase = await createClient();
  const { data: quotations } = await supabase
    .from("quotations")
    .select("*, customers(company_name), leads(company_name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Quotations</h1>
          <p className="text-sm text-muted-foreground">Build, approve, and send priced quotes.</p>
        </div>
        {session.permissions["quotations.create"] === "allowed" && (
          <Button size="lg" render={<Link href="/quotations/new" />}>
            <MaterialIcon name="add" className="text-[18px]" />
            New Quotation
          </Button>
        )}
      </div>
      <QuotationsClient
        quotations={(quotations ?? []).map((q) => ({
          ...q,
          clientName: q.customers?.company_name ?? q.leads?.company_name ?? "—",
        }))}
      />
    </div>
  );
}
