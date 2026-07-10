"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MaterialIcon } from "@/components/ui/material-icon";
import { useMoney } from "@/stores/ui-store";
import { formatMoney } from "@/lib/utils/format";
import { askBusinessQuestion } from "@/app/actions/ai-insights";
import type { ChurnRisk, UpsellOpportunity } from "@/lib/ai-insights/rules";

const SUGGESTED_QUESTIONS = [
  "Which quotes will close soon?",
  "Who hasn't ordered in 6 months?",
  "Who owes money?",
  "What's running low?",
  "Who completed the most jobs?",
];

const RISK_BADGE: Record<ChurnRisk["riskLevel"], string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  low: "bg-muted text-muted-foreground border-border",
};

const MONTH_LABELS = Array.from({ length: 6 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - (5 - i), 1);
  return d.toLocaleDateString("en-US", { month: "short" });
});

export function AiInsightsClient({
  monthlyRevenue,
  forecast,
  churnRisks,
  upsellOpportunities,
}: {
  monthlyRevenue: number[];
  forecast: number;
  churnRisks: ChurnRisk[];
  upsellOpportunities: UpsellOpportunity[];
}) {
  const { currency, fxRate } = useMoney();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const maxValue = Math.max(1, ...monthlyRevenue, forecast);

  function ask(q: string) {
    setQuestion(q);
    startTransition(async () => {
      const result = await askBusinessQuestion(q);
      setAnswer(result);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Insights</h1>
        <p className="text-sm text-muted-foreground">
          Rule-based analysis over your real data — no external model, every number here is queryable.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            {monthlyRevenue.map((value, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-32 w-full items-end">
                  <div className="w-full rounded-t-md bg-primary/70" style={{ height: `${Math.max(4, (value / maxValue) * 100)}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">{MONTH_LABELS[i]}</p>
              </div>
            ))}
            <div className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-32 w-full items-end">
                <div className="w-full rounded-t-md border-2 border-dashed border-primary bg-primary/10" style={{ height: `${Math.max(4, (forecast / maxValue) * 100)}%` }} />
              </div>
              <p className="text-xs font-medium text-primary">Next</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Projected next month: <span className="font-semibold text-foreground">{formatMoney(forecast, currency, fxRate)}</span> (linear trend over the last {monthlyRevenue.length} months)
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Churn Risk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {churnRisks.length === 0 && <p className="text-sm text-muted-foreground">No customers currently flagged at risk.</p>}
            {churnRisks.map((risk) => (
              <div key={risk.customerId} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{risk.companyName}</p>
                  <Badge variant="outline" className={RISK_BADGE[risk.riskLevel]}>
                    {risk.riskLevel}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{risk.reason}</p>
                <p className="mt-1.5 flex items-center gap-1 text-sm">
                  <MaterialIcon name="tips_and_updates" className="text-[16px] text-primary" />
                  {risk.recommendedAction}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upsell Opportunities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upsellOpportunities.length === 0 && <p className="text-sm text-muted-foreground">No upsell candidates surfaced right now.</p>}
            {upsellOpportunities.map((opp) => (
              <div key={opp.customerId} className="rounded-lg border border-border p-3">
                <p className="font-medium">{opp.companyName}</p>
                <p className="mt-1 text-sm text-muted-foreground">{opp.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ask your business anything</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => ask(q)}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {q}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Textarea
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Who owes money?"
              className="flex-1"
            />
            <Button disabled={isPending || question.trim().length === 0} onClick={() => ask(question)}>
              {isPending ? "Thinking…" : "Ask"}
            </Button>
          </div>
          {answer && (
            <div className="rounded-lg bg-muted p-3 text-sm whitespace-pre-line">{answer}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
