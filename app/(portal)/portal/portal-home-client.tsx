"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/material-icon";
import { formatMoney, formatDateTime } from "@/lib/utils/format";
import { portalLogRequest } from "@/app/actions/portal";
import type { Tables } from "@/lib/supabase/database.types";

const TILES = [
  { href: "/portal/invoices", label: "Invoices", icon: "receipt_long" },
  { href: "/portal/request", label: "Request Clean", icon: "cleaning_services" },
  { href: "/portal/reports", label: "Reports", icon: "summarize" },
  { href: "/portal/complaint", label: "Log Complaint", icon: "report_problem" },
];

export function PortalHomeClient({
  customerName,
  nextJob,
  awaitingQuotes,
  lastCompletedJob,
}: {
  customerName: string;
  nextJob: Tables<"jobs"> | null;
  awaitingQuotes: { id: string; number: string; total_usd: number }[];
  lastCompletedJob: { id: string; number: string; site_address: string | null } | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [rated, setRated] = useState(false);

  function rate(stars: number) {
    startTransition(async () => {
      const result = await portalLogRequest("rating", `Rated ${lastCompletedJob?.number} ${stars} stars`, stars);
      if (result?.error) toast.error(result.error);
      else {
        setRated(true);
        toast.success("Thanks for your feedback!");
      }
    });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">{customerName}</h1>

      {awaitingQuotes.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-900">Quote awaiting your review</p>
              <p className="text-xs text-amber-700">{awaitingQuotes[0].number} · {formatMoney(awaitingQuotes[0].total_usd)}</p>
            </div>
            <Button size="sm" render={<Link href={`/portal/quotes/${awaitingQuotes[0].id}`} />}>Review</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Next service</p>
          {nextJob ? (
            <>
              <p className="mt-1 font-medium">{nextJob.site_address}</p>
              <p className="text-sm text-muted-foreground">{nextJob.scheduled_start ? formatDateTime(nextJob.scheduled_start) : "Time to be confirmed"}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">No service currently scheduled.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {TILES.map((t) => (
          <Link key={t.href} href={t.href} className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-4 text-center hover:ring-1 hover:ring-foreground/20">
            <MaterialIcon name={t.icon} className="text-[22px] text-primary" />
            <span className="text-sm font-medium">{t.label}</span>
          </Link>
        ))}
      </div>

      {lastCompletedJob && !rated && (
        <Card>
          <CardContent className="text-center">
            <p className="text-sm font-medium">Rate your last service</p>
            <p className="text-xs text-muted-foreground">{lastCompletedJob.site_address}</p>
            <div className="mt-2 flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" disabled={isPending} onClick={() => rate(star)}>
                  <MaterialIcon name="star" filled className="text-[28px] text-amber-400" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
