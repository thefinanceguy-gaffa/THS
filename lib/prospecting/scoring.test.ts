import { describe, it, expect } from "vitest";
import { buildWonCustomerProfile, scoreFit } from "./scoring";

const customers = [
  { industry: "Corporate Offices", suburb: "Borrowdale", monthly_value_usd: 1000 },
  { industry: "Corporate Offices", suburb: "Borrowdale", monthly_value_usd: 1200 },
  { industry: "Banking", suburb: "CBD", monthly_value_usd: 2000 },
];

describe("buildWonCustomerProfile", () => {
  it("counts industries and suburbs and averages value", () => {
    const profile = buildWonCustomerProfile(customers);
    expect(profile.industryCounts["Corporate Offices"]).toBe(2);
    expect(profile.industryCounts["Banking"]).toBe(1);
    expect(profile.suburbCounts["Borrowdale"]).toBe(2);
    expect(profile.avgMonthlyValueUsd).toBeCloseTo((1000 + 1200 + 2000) / 3, 5);
  });

  it("ignores customers with no value on an empty list", () => {
    const profile = buildWonCustomerProfile([]);
    expect(profile.avgMonthlyValueUsd).toBe(0);
  });
});

describe("scoreFit", () => {
  const profile = buildWonCustomerProfile(customers);

  it("scores a strong match highly", () => {
    const result = scoreFit({ industry: "Corporate Offices", suburb: "Borrowdale", estimatedValueUsd: 1100 }, profile);
    expect(result.score).toBeGreaterThan(60);
    expect(result.reason).toContain("Corporate Offices");
  });

  it("scores an unrelated industry/suburb low", () => {
    const result = scoreFit({ industry: "Mining", suburb: "Chinhoyi", estimatedValueUsd: null }, profile);
    expect(result.score).toBe(0);
    expect(result.reason).toContain("No strong overlap");
  });

  it("caps score at 100", () => {
    const result = scoreFit({ industry: "Corporate Offices", suburb: "Borrowdale", estimatedValueUsd: 1100 }, profile);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("handles an empty profile without throwing", () => {
    const emptyProfile = buildWonCustomerProfile([]);
    const result = scoreFit({ industry: "Banking", suburb: "CBD", estimatedValueUsd: 500 }, emptyProfile);
    expect(result.score).toBe(0);
  });
});
