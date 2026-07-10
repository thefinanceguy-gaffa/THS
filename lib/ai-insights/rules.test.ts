import { describe, it, expect } from "vitest";
import { computeChurnRisks, computeUpsellOpportunities, forecastNextMonthRevenue, type CustomerSnapshot } from "./rules";

function customer(overrides: Partial<CustomerSnapshot> = {}): CustomerSnapshot {
  return {
    id: "1",
    company_name: "Test Co",
    monthly_value_usd: 1000,
    satisfaction: 4.5,
    status: "active",
    lastActivityDaysAgo: 10,
    ...overrides,
  };
}

describe("computeChurnRisks", () => {
  it("flags no-contact-180-days as high risk", () => {
    const risks = computeChurnRisks([customer({ lastActivityDaysAgo: 200 })]);
    expect(risks).toHaveLength(1);
    expect(risks[0].riskLevel).toBe("high");
  });

  it("flags low satisfaction as high risk even with recent contact", () => {
    const risks = computeChurnRisks([customer({ satisfaction: 2, lastActivityDaysAgo: 5 })]);
    expect(risks).toHaveLength(1);
    expect(risks[0].riskLevel).toBe("high");
    expect(risks[0].reason).toContain("satisfaction");
  });

  it("flags no-contact-90-days as medium risk", () => {
    const risks = computeChurnRisks([customer({ lastActivityDaysAgo: 100 })]);
    expect(risks[0].riskLevel).toBe("medium");
  });

  it("ignores healthy, recently-contacted customers", () => {
    expect(computeChurnRisks([customer()])).toHaveLength(0);
  });

  it("ignores non-active customers", () => {
    expect(computeChurnRisks([customer({ status: "inactive", lastActivityDaysAgo: 300 })])).toHaveLength(0);
  });

  it("sorts high risk before medium", () => {
    const risks = computeChurnRisks([
      customer({ id: "medium", lastActivityDaysAgo: 100 }),
      customer({ id: "high", lastActivityDaysAgo: 200 }),
    ]);
    expect(risks[0].customerId).toBe("high");
  });
});

describe("computeUpsellOpportunities", () => {
  it("surfaces high-satisfaction, recently-active customers", () => {
    const opportunities = computeUpsellOpportunities([customer({ satisfaction: 4.8, lastActivityDaysAgo: 20 })]);
    expect(opportunities).toHaveLength(1);
  });

  it("excludes low-satisfaction customers", () => {
    expect(computeUpsellOpportunities([customer({ satisfaction: 3.5 })])).toHaveLength(0);
  });

  it("excludes stale customers", () => {
    expect(computeUpsellOpportunities([customer({ lastActivityDaysAgo: 200 })])).toHaveLength(0);
  });
});

describe("forecastNextMonthRevenue", () => {
  it("returns 0 for empty input", () => {
    expect(forecastNextMonthRevenue([])).toBe(0);
  });

  it("returns the single value when only one month given", () => {
    expect(forecastNextMonthRevenue([5000])).toBe(5000);
  });

  it("projects a rising trend upward", () => {
    const forecast = forecastNextMonthRevenue([1000, 1200, 1400, 1600]);
    expect(forecast).toBeGreaterThan(1600);
  });

  it("never returns negative revenue for a sharply declining trend", () => {
    const forecast = forecastNextMonthRevenue([1000, 200, 50, 10]);
    expect(forecast).toBeGreaterThanOrEqual(0);
  });

  it("projects a flat trend as roughly flat", () => {
    const forecast = forecastNextMonthRevenue([1000, 1000, 1000]);
    expect(forecast).toBeCloseTo(1000, 0);
  });
});
