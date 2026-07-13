/**
 * Rule-based "look-alike" fit scoring — no LLM, same convention as
 * lib/ai-insights/rules.ts. Compares a prospect against the shape of
 * customers the business has actually won (industry, suburb, deal size)
 * and produces a 0-100 score plus a template-built reason, not a
 * generated one.
 */

export interface WonCustomerProfile {
  industryCounts: Record<string, number>;
  suburbCounts: Record<string, number>;
  avgMonthlyValueUsd: number;
}

export interface ProspectInput {
  industry: string | null;
  suburb: string | null;
  estimatedValueUsd: number | null;
}

export interface FitResult {
  score: number;
  reason: string;
}

export function buildWonCustomerProfile(customers: { industry: string | null; suburb: string | null; monthly_value_usd: number }[]): WonCustomerProfile {
  const industryCounts: Record<string, number> = {};
  const suburbCounts: Record<string, number> = {};
  let totalValue = 0;
  let valuedCount = 0;

  for (const c of customers) {
    if (c.industry) industryCounts[c.industry] = (industryCounts[c.industry] ?? 0) + 1;
    if (c.suburb) suburbCounts[c.suburb] = (suburbCounts[c.suburb] ?? 0) + 1;
    if (c.monthly_value_usd > 0) {
      totalValue += c.monthly_value_usd;
      valuedCount += 1;
    }
  }

  return { industryCounts, suburbCounts, avgMonthlyValueUsd: valuedCount > 0 ? totalValue / valuedCount : 0 };
}

export function scoreFit(prospect: ProspectInput, profile: WonCustomerProfile): FitResult {
  const industryTotal = Object.values(profile.industryCounts).reduce((a, b) => a + b, 0);
  const suburbTotal = Object.values(profile.suburbCounts).reduce((a, b) => a + b, 0);

  const reasons: string[] = [];

  let industryScore = 0;
  if (prospect.industry && industryTotal > 0 && profile.industryCounts[prospect.industry]) {
    const share = profile.industryCounts[prospect.industry] / industryTotal;
    industryScore = Math.round(share * 50);
    reasons.push(`${Math.round(share * 100)}% of your won customers are in ${prospect.industry}`);
  }

  let suburbScore = 0;
  if (prospect.suburb && suburbTotal > 0 && profile.suburbCounts[prospect.suburb]) {
    suburbScore = Math.round((profile.suburbCounts[prospect.suburb] / suburbTotal) * 30);
    reasons.push(`you already service customers in ${prospect.suburb}`);
  }

  let valueScore = 0;
  if (prospect.estimatedValueUsd && profile.avgMonthlyValueUsd > 0) {
    const ratio = Math.min(prospect.estimatedValueUsd, profile.avgMonthlyValueUsd) / Math.max(prospect.estimatedValueUsd, profile.avgMonthlyValueUsd);
    valueScore = Math.round(ratio * 20);
    if (ratio > 0.6) reasons.push("estimated deal size is close to your average customer");
  }

  const score = Math.min(100, industryScore + suburbScore + valueScore);
  const reason = reasons.length > 0 ? `Good fit — ${reasons.join(", and ")}.` : "No strong overlap with your current customer base yet — worth a first conversation.";

  return { score, reason };
}
