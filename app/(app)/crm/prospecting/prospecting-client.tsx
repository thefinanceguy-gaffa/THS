"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MaterialIcon } from "@/components/ui/material-icon";
import { convertProspectToLead, dismissProspect, runProspectCollectionNow } from "@/app/actions/prospecting";
import type { Tables } from "@/lib/supabase/database.types";

type Prospect = Tables<"prospect_candidates">;

function scoreBadgeClass(score: number | null): string {
  if (score === null) return "border-border bg-muted text-muted-foreground";
  if (score >= 60) return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (score >= 30) return "border-amber-300 bg-amber-50 text-amber-800";
  return "border-border bg-muted text-muted-foreground";
}

export function ProspectingClient({ prospects, canRunCollection }: { prospects: Prospect[]; canRunCollection: boolean }) {
  const [isPending, startTransition] = useTransition();

  function onConvert(id: string, companyName: string) {
    startTransition(async () => {
      const result = await convertProspectToLead(id);
      if (result?.error) toast.error(result.error);
      else toast.success(`${companyName} added to your pipeline.`);
    });
  }

  function onDismiss(id: string) {
    startTransition(async () => {
      const result = await dismissProspect(id);
      if (result?.error) toast.error(result.error);
    });
  }

  function onRunCollection() {
    startTransition(async () => {
      const result = await runProspectCollectionNow();
      if (result?.error) {
        toast.error(result.error);
      } else if (result.summary) {
        toast.success(`Collection complete — ${result.summary.inserted} new prospects found.`);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">AI Prospecting</h1>
          <p className="text-sm text-muted-foreground">Public business data, scored against the customers you&apos;ve already won — never personal or private data.</p>
        </div>
        {canRunCollection && (
          <Button variant="outline" disabled={isPending} onClick={onRunCollection}>
            <MaterialIcon name="travel_explore" className="text-[18px]" />
            Run collection now
          </Button>
        )}
      </div>

      {prospects.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No prospects yet. {canRunCollection ? 'Click "Run collection now" to search public business listings.' : "Ask an Owner/Admin to run a collection."}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {prospects.map((p) => (
          <Card key={p.id}>
            <CardContent className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{p.company_name}</p>
                <Badge variant="outline" className={scoreBadgeClass(p.fit_score)}>
                  {p.fit_score ?? 0}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {p.industry ?? "Unknown industry"} {p.suburb ? `· ${p.suburb}` : ""}
              </p>
              <p className="text-sm text-muted-foreground">{p.fit_reason}</p>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Source: {p.source.replace("_", " ")}</p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" disabled={isPending} onClick={() => onConvert(p.id, p.company_name)}>
                  Add to Pipeline
                </Button>
                <Button size="sm" variant="outline" disabled={isPending} onClick={() => onDismiss(p.id)}>
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
