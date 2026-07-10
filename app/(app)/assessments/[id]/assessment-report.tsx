"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MaterialIcon } from "@/components/ui/material-icon";
import { useMoney } from "@/stores/ui-store";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { completeAssessment } from "@/app/actions/assessments";
import type { Tables } from "@/lib/supabase/database.types";

export function AssessmentReport({
  assessment,
  areas,
  clientName,
  customerId,
  leadId,
  canManage,
}: {
  assessment: Tables<"site_assessments">;
  areas: Tables<"assessment_areas">[];
  clientName: string;
  customerId?: string;
  leadId?: string;
  canManage: boolean;
}) {
  const { currency, fxRate } = useMoney();
  const [isPending, startTransition] = useTransition();

  function onComplete() {
    startTransition(async () => {
      const result = await completeAssessment(assessment.id);
      if (result?.error) toast.error(result.error);
      else toast.success("Marked as completed.");
    });
  }

  const quoteHref = customerId ? `/quotations/new?customerId=${customerId}` : leadId ? `/quotations/new?leadId=${leadId}` : "/quotations/new";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-sm text-muted-foreground">{assessment.reference}</p>
          <h1 className="text-xl font-semibold">{assessment.site_name}</h1>
          <p className="text-sm text-muted-foreground">{clientName} {assessment.suburb ? `· ${assessment.suburb}` : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={assessment.status === "completed" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-blue-300 bg-blue-50 text-blue-800"}>{assessment.status}</Badge>
          {canManage && assessment.status !== "completed" && (
            <Button size="sm" disabled={isPending} onClick={onComplete}>Mark completed</Button>
          )}
          {canManage && (
            <Button size="sm" variant="outline" render={<Link href={quoteHref} />}>
              <MaterialIcon name="request_quote" className="text-[16px]" />
              Convert to quote
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><CardContent><p className="text-xl font-bold">{assessment.total_area_m2 ?? 0}</p><p className="text-xs text-muted-foreground">Total area (m²)</p></CardContent></Card>
        <Card><CardContent><p className="text-lg font-bold">{assessment.recommended_crew ?? "—"}</p><p className="text-xs text-muted-foreground">Recommended crew</p></CardContent></Card>
        <Card><CardContent><p className="text-lg font-bold">{assessment.service_window ?? "—"}</p><p className="text-xs text-muted-foreground">Service window</p></CardContent></Card>
        <Card><CardContent><p className="text-xl font-bold">{formatMoney(assessment.est_monthly_usd ?? 0, currency, fxRate)}</p><p className="text-xs text-muted-foreground">Est. monthly cost</p></CardContent></Card>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Area</TableHead>
                <TableHead className="text-right">Size (m²)</TableHead>
                <TableHead>Surface</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Effort</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areas.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.area_name}</TableCell>
                  <TableCell className="text-right">{a.size_m2}</TableCell>
                  <TableCell className="text-muted-foreground">{a.surface ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{a.frequency ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{a.effort ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {assessment.risks && (
        <Card>
          <CardContent>
            <p className="text-sm font-medium">Risks &amp; special requirements</p>
            <p className="text-sm text-muted-foreground">{assessment.risks}</p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        {assessment.scheduled_at ? `Scheduled ${formatDate(assessment.scheduled_at)}` : ""}
        {assessment.completed_at ? ` · Completed ${formatDate(assessment.completed_at)}` : ""}
      </p>
    </div>
  );
}
