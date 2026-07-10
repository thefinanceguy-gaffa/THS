import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { getReport } from "@/lib/reports/registry";
import { ReportView } from "../report-view";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const report = getReport(slug);
  return { title: report ? report.title : "Reports" };
}

export default async function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const report = getReport(slug);
  if (!report) notFound();

  const session = await getAppSession();
  if (!session) return null;

  if (!report.roles.includes(session.profile.role)) {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-muted-foreground">You don&apos;t have permission to view this report.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const result = await report.load(supabase);

  return <ReportView slug={report.slug} title={report.title} description={report.description} columns={result.columns} rows={result.rows} summary={result.summary} />;
}
