import type { Metadata } from "next";
import Link from "next/link";
import { getAppSession } from "@/lib/session/get-app-session";
import { Card, CardContent } from "@/components/ui/card";
import { MaterialIcon } from "@/components/ui/material-icon";
import { REPORTS } from "@/lib/reports/registry";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsHubPage() {
  const session = await getAppSession();
  if (!session) return null;

  const visible = REPORTS.filter((r) => r.roles.includes(session.profile.role));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">Operational and financial reports, exportable to CSV.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((report) => (
          <Link key={report.slug} href={`/reports/${report.slug}`}>
            <Card className="h-full transition-colors hover:bg-accent">
              <CardContent className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-[9px] bg-accent text-accent-foreground">
                  <MaterialIcon name={report.icon} />
                </div>
                <div>
                  <p className="font-medium">{report.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{report.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {visible.length === 0 && <p className="text-sm text-muted-foreground">No reports are available for your role.</p>}
      </div>
    </div>
  );
}
