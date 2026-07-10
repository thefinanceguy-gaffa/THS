import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MaterialIcon } from "@/components/ui/material-icon";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Site Assessments" };

const STATUS_BADGE: Record<string, string> = {
  scheduled: "border-blue-300 bg-blue-50 text-blue-800",
  completed: "border-emerald-300 bg-emerald-50 text-emerald-800",
};

export default async function AssessmentsPage() {
  const session = await getAppSession();
  if (!session) return null;

  const supabase = await createClient();
  const { data: assessments } = await supabase
    .from("site_assessments")
    .select("*, customers(company_name), leads(company_name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Site Assessments</h1>
          <p className="text-sm text-muted-foreground">On-site surveys that feed accurate quotes.</p>
        </div>
        {session.permissions["leads.manage"] === "allowed" && (
          <Button size="lg" render={<Link href="/assessments/new" />}>
            <MaterialIcon name="add" className="text-[18px]" />
            New Assessment
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {(assessments ?? []).length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No site assessments yet.</p>}
        {(assessments ?? []).map((a) => (
          <Link key={a.id} href={`/assessments/${a.id}`} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-sm hover:ring-1 hover:ring-foreground/20">
            <div>
              <p className="font-mono font-medium">{a.reference}</p>
              <p className="text-muted-foreground">{a.site_name} · {a.customers?.company_name ?? a.leads?.company_name ?? "—"}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{a.scheduled_at ? formatDate(a.scheduled_at) : "—"}</span>
              <Badge variant="outline" className={STATUS_BADGE[a.status] ?? "border-border"}>{a.status}</Badge>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
