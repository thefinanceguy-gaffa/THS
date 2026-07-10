import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Service Reports" };

export default async function PortalReportsPage() {
  const session = await getAppSession();
  if (!session || !session.profile.customer_id) return null;

  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("customer_id", session.profile.customer_id)
    .eq("status", "completed")
    .order("scheduled_start", { ascending: false });

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Service Reports</h1>
      <p className="text-sm text-muted-foreground">Every completed visit at your site.</p>
      {(jobs ?? []).length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No completed services yet.</p>}
      {(jobs ?? []).map((j) => (
        <Card key={j.id}>
          <CardContent>
            <p className="font-mono text-sm font-medium">{j.number}</p>
            <p className="text-sm text-muted-foreground">{j.site_address}</p>
            <p className="text-xs text-muted-foreground">{j.scheduled_start ? formatDate(j.scheduled_start) : "—"}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
