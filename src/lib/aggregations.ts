// Dashboard aggregation helpers: category breakdowns, industry exposure,
// portfolio trend simulation, and recommended-action derivation.

import { RISK_THRESHOLDS } from "./riskScoring";
import type { RiskCategory, ScoredCustomer, TrendPoint } from "./types";

export interface CategorySummary {
  category: RiskCategory;
  count: number;
  exposure: number;
  pctOfCustomers: number;
  pctOfExposure: number;
}

const CATEGORIES: RiskCategory[] = ["Green", "Amber", "Red"];

export function summariseByCategory(customers: ScoredCustomer[]): CategorySummary[] {
  const totalCount = customers.length || 1;
  const totalExposure = customers.reduce((sum, c) => sum + c.loanBalance, 0) || 1;

  return CATEGORIES.map((category) => {
    const inCategory = customers.filter((c) => c.category === category);
    const count = inCategory.length;
    const exposure = inCategory.reduce((sum, c) => sum + c.loanBalance, 0);

    return {
      category,
      count,
      exposure,
      pctOfCustomers: Math.round((count / totalCount) * 1000) / 10,
      pctOfExposure: Math.round((exposure / totalExposure) * 1000) / 10,
    };
  });
}

export function totalExposure(customers: ScoredCustomer[]): number {
  return customers.reduce((sum, c) => sum + c.loanBalance, 0);
}

export interface IndustryExposure {
  industry: string;
  exposure: number;
}

export function exposureByIndustry(customers: ScoredCustomer[]): IndustryExposure[] {
  const map = new Map<string, number>();
  for (const c of customers) {
    map.set(c.industrySector, (map.get(c.industrySector) ?? 0) + c.loanBalance);
  }
  return Array.from(map.entries())
    .map(([industry, exposure]) => ({ industry, exposure }))
    .sort((a, b) => b.exposure - a.exposure);
}

export function topRiskCustomers(customers: ScoredCustomer[], n = 10): ScoredCustomer[] {
  return [...customers].sort((a, b) => b.riskScore - a.riskScore).slice(0, n);
}

// Seeded pseudo-random walk that tapers to the real current average at the
// most recent point, so the trend chart looks illustrative but always ends
// exactly at the portfolio's actual current average risk score.
export function generatePortfolioTrend(
  currentAverage: number,
  points = 12,
  seed = 42
): TrendPoint[] {
  let state = seed;
  const rand = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };

  const trend: TrendPoint[] = [];
  let value = Math.max(5, Math.min(95, currentAverage + (rand() - 0.5) * 20));

  for (let i = 0; i < points; i += 1) {
    const progress = i / (points - 1);
    if (i === points - 1) {
      value = currentAverage;
    } else {
      const drift = (rand() - 0.5) * 8;
      const pull = (currentAverage - value) * progress * 0.3;
      value = Math.max(0, Math.min(100, value + drift + pull));
    }

    trend.push({
      label: `Month ${i + 1}`,
      averageRiskScore: Math.round(value * 10) / 10,
    });
  }

  return trend;
}

export function recommendedActions(customers: ScoredCustomer[]): string[] {
  const actions: string[] = [];

  const summaries = summariseByCategory(customers);
  const redSummary = summaries.find((s) => s.category === "Red")!;

  const redCustomers = customers.filter((c) => c.category === "Red");
  const amberCustomers = customers.filter((c) => c.category === "Amber");

  if (redCustomers.length > 0) {
    const names = redCustomers
      .slice(0, 5)
      .map((c) => c.customerName)
      .join(", ");
    const more = redCustomers.length > 5 ? ` and ${redCustomers.length - 5} more` : "";
    actions.push(`Escalate ${redCustomers.length} high-risk (Red) customer(s) for review: ${names}${more}.`);
  }

  if (redSummary.pctOfExposure > 15) {
    actions.push(
      `Red-category exposure represents ${redSummary.pctOfExposure}% of total portfolio exposure, above the 15% concentration guideline — consider tightening exposure limits.`
    );
  }

  if (amberCustomers.length > 0) {
    actions.push(`Place ${amberCustomers.length} medium-risk (Amber) customer(s) on watchlist for closer monitoring.`);
  }

  const byIndustry = exposureByIndustry(customers);
  const total = totalExposure(customers) || 1;
  if (byIndustry.length > 0) {
    const top = byIndustry[0];
    const share = Math.round((top.exposure / total) * 1000) / 10;
    if (share > 30) {
      actions.push(
        `${top.industry} accounts for ${share}% of total exposure — review industry concentration limits.`
      );
    }
  }

  if (actions.length === 0) {
    actions.push("Portfolio risk is within normal parameters — no immediate action required.");
  }

  return actions;
}

export { RISK_THRESHOLDS };
