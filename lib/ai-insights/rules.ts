/**
 * Rule-based "AI Insights" engine — pure functions over already-fetched
 * data, no LLM call. Mirrors semillaPOS's lib/dashboard/health-score.ts
 * convention: swapping this for a real model later means changing what's
 * inside these functions, not any of their callers (BUILD_ROADMAP.md
 * Sprint 8 calls out the Edge Function version as future work).
 */

export interface CustomerSnapshot {
  id: string;
  company_name: string;
  monthly_value_usd: number;
  satisfaction: number | null;
  status: string;
  lastActivityDaysAgo: number | null;
}

export interface ChurnRisk {
  customerId: string;
  companyName: string;
  reason: string;
  riskLevel: "high" | "medium" | "low";
  recommendedAction: string;
}

export function computeChurnRisks(customers: CustomerSnapshot[]): ChurnRisk[] {
  const risks: ChurnRisk[] = [];
  for (const c of customers) {
    if (c.status !== "active") continue;

    if (c.lastActivityDaysAgo !== null && c.lastActivityDaysAgo >= 180) {
      risks.push({
        customerId: c.id,
        companyName: c.company_name,
        reason: `No contact in ${c.lastActivityDaysAgo} days`,
        riskLevel: "high",
        recommendedAction: "Schedule a check-in call this week",
      });
      continue;
    }
    if (c.satisfaction !== null && c.satisfaction <= 3) {
      risks.push({
        customerId: c.id,
        companyName: c.company_name,
        reason: `Low satisfaction score (${c.satisfaction}/5)`,
        riskLevel: "high",
        recommendedAction: "Have an Account Manager reach out and offer a service review",
      });
      continue;
    }
    if (c.lastActivityDaysAgo !== null && c.lastActivityDaysAgo >= 90) {
      risks.push({
        customerId: c.id,
        companyName: c.company_name,
        reason: `No contact in ${c.lastActivityDaysAgo} days`,
        riskLevel: "medium",
        recommendedAction: "Send a courtesy check-in message",
      });
    }
  }
  return risks.sort((a, b) => (a.riskLevel === b.riskLevel ? 0 : a.riskLevel === "high" ? -1 : 1));
}

export interface UpsellOpportunity {
  customerId: string;
  companyName: string;
  reason: string;
}

export function computeUpsellOpportunities(customers: CustomerSnapshot[]): UpsellOpportunity[] {
  return customers
    .filter((c) => c.status === "active" && (c.satisfaction ?? 0) >= 4.5 && (c.lastActivityDaysAgo ?? 999) < 60)
    .map((c) => ({
      customerId: c.id,
      companyName: c.company_name,
      reason: `High satisfaction (${c.satisfaction}/5) and recently active — good candidate for an add-on service or contract upgrade`,
    }));
}

/** Simple linear projection from the last N months of revenue (no seasonality model — see header). */
export function forecastNextMonthRevenue(monthlyRevenue: number[]): number {
  if (monthlyRevenue.length === 0) return 0;
  if (monthlyRevenue.length === 1) return monthlyRevenue[0];

  const n = monthlyRevenue.length;
  const xs = Array.from({ length: n }, (_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = monthlyRevenue.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((sum, x, i) => sum + (x - meanX) * (monthlyRevenue[i] - meanY), 0);
  const den = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  return Math.max(0, slope * n + intercept);
}
