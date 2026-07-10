"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MaterialIcon } from "@/components/ui/material-icon";
import { useMoney } from "@/stores/ui-store";
import { formatMoney, formatDateTime } from "@/lib/utils/format";
import { STAGE_LABELS, STAGE_DOT_COLORS } from "@/lib/crm/pipeline";
import type { LeadStage, JobStatus } from "@/lib/supabase/database.types";

interface KpiCardProps {
  label: string;
  amountUsd: number;
  icon: string;
}

const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  scheduled: "Scheduled",
  en_route: "En route",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function KpiCard({ label, amountUsd, icon }: KpiCardProps) {
  const { currency, fxRate } = useMoney();
  return (
    <Card>
      <CardContent className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{formatMoney(amountUsd, currency, fxRate)}</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-[9px] bg-accent text-accent-foreground">
          <MaterialIcon name={icon} />
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardClient({
  fullName,
  revenueMtd,
  recurringMonthly,
  outstandingDebtors,
  pipelineValue,
  funnel,
  maxFunnelValue,
  jobsToday,
  activity,
}: {
  fullName: string;
  revenueMtd: number;
  recurringMonthly: number;
  outstandingDebtors: number;
  pipelineValue: number;
  funnel: { stage: LeadStage; count: number; value: number }[];
  maxFunnelValue: number;
  jobsToday: { id: string; number: string; status: JobStatus; siteAddress: string | null; scheduledStart: string | null; teamName?: string }[];
  activity: { id: string; actor_name: string | null; action: string; entity_type: string | null; created_at: string }[];
}) {
  const firstName = fullName.split(" ")[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Good day, {firstName}</h1>
          <p className="text-sm text-muted-foreground">Here&apos;s how The Hygiene Squad is doing.</p>
        </div>
        <Link href="/crm" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[0_4px_12px_rgba(27,86,214,.3)]">
          <MaterialIcon name="add" className="text-[18px]" />
          New Lead
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Revenue MTD" amountUsd={revenueMtd} icon="payments" />
        <KpiCard label="Recurring Monthly Value" amountUsd={recurringMonthly} icon="autorenew" />
        <KpiCard label="Pipeline Value" amountUsd={pipelineValue} icon="target" />
        <KpiCard label="Outstanding Debtors" amountUsd={outstandingDebtors} icon="trending_down" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnel.map((f) => (
              <div key={f.stage} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className={`size-2 rounded-full ${STAGE_DOT_COLORS[f.stage]}`} />
                    {STAGE_LABELS[f.stage]}
                  </span>
                  <span className="text-muted-foreground">
                    {f.count} · {formatMoney(f.value)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(4, (f.value / maxFunnelValue) * 100)}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Operations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xl font-bold">{jobsToday.length}</p>
                <p className="text-xs text-muted-foreground">Jobs today</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xl font-bold">{jobsToday.filter((j) => j.status === "in_progress" || j.status === "en_route").length}</p>
                <p className="text-xs text-muted-foreground">Active now</p>
              </div>
            </div>
            <div className="space-y-2">
              {jobsToday.length === 0 && <p className="text-sm text-muted-foreground">No jobs scheduled today.</p>}
              {jobsToday.slice(0, 6).map((job) => (
                <div key={job.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
                  <div>
                    <p className="font-mono font-medium">{job.number}</p>
                    <p className="text-xs text-muted-foreground">{job.siteAddress ?? "—"}{job.teamName ? ` · ${job.teamName}` : ""}</p>
                  </div>
                  <Badge variant="outline" className="border-border">
                    {JOB_STATUS_LABEL[job.status]}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {activity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Live Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activity.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span>
                  <span className="font-medium">{a.actor_name ?? "System"}</span> {a.action}d a {a.entity_type}
                </span>
                <span className="text-xs text-muted-foreground">{formatDateTime(a.created_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
