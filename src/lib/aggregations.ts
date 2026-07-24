import type { RiskCategory, ScoredCustomer } from "./types";

export interface CategorySummary {
  category: RiskCategory;
  count: number;
  exposure: number;
  pctOfCustomers: number;
  pctOfExposure: number;
}

export function totalExposure(customers: ScoredCustomer[]): number {
  return customers.reduce((sum, c) => sum + c.loanBalance, 0);
}

export function categorySummaries(customers: ScoredCustomer[]): CategorySummary[] {
  const categories: RiskCategory[] = ["Green", "Amber", "Red"];
  const total = customers.length;
  const totalExp = totalExposure(customers);

  return categories.map((category) => {
    const inCategory = customers.filter((c) => c.category === category);
    const exposure = totalExposure(inCategory);
    return {
      category,
      count: inCategory.length,
      exposure,
      pctOfCustomers: total > 0 ? (inCategory.length / total) * 100 : 0,
      pctOfExposure: totalExp > 0 ? (exposure / totalExp) * 100 : 0,
    };
  });
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

export interface TrendPoint {
  label: string;
  averageRiskScore: number;
}

/**
 * Seeded pseudo-random walk that tapers to the real current portfolio
 * average risk score at the most recent point, giving an "illustrative
 * trend leading up to current position" without persisting any real
 * historical data (there is none — this is a prototype).
 */
export function generatePortfolioTrend(currentAverage: number, points = 12): TrendPoint[] {
  let seed = Math.round(currentAverage * 1000) || 42;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const trend: TrendPoint[] = [];
  let value = currentAverage + (random() - 0.5) * 20;

  for (let i = 0; i < points; i += 1) {
    const progress = i / (points - 1);
    const pull = progress * progress;
    const noise = (random() - 0.5) * 10 * (1 - progress);
    value = value * (1 - pull * 0.4) + currentAverage * (pull * 0.4) + noise;
    const clamped = Math.min(100, Math.max(0, value));

    trend.push({
      label: i === points - 1 ? "Now" : `T-${points - 1 - i}`,
      averageRiskScore: i === points - 1 ? currentAverage : clamped,
    });
  }

  return trend;
}

export function averageRiskScore(customers: ScoredCustomer[]): number {
  if (customers.length === 0) return 0;
  return customers.reduce((sum, c) => sum + c.riskScore, 0) / customers.length;
}

export function recommendedActions(customers: ScoredCustomer[]): string[] {
  const actions: string[] = [];
  const total = customers.length;
  const totalExp = totalExposure(customers);

  const redCustomers = customers.filter((c) => c.category === "Red");
  const amberCustomers = customers.filter((c) => c.category === "Amber");

  if (redCustomers.length > 0) {
    const names = redCustomers
      .slice(0, 5)
      .map((c) => c.customerName)
      .join(", ");
    const suffix = redCustomers.length > 5 ? ` and ${redCustomers.length - 5} more` : "";
    actions.push(`Escalate ${redCustomers.length} Red (High Risk) customer(s) for review: ${names}${suffix}.`);
  }

  const redExposure = totalExposure(redCustomers);
  const redExposureShare = totalExp > 0 ? (redExposure / totalExp) * 100 : 0;
  if (redExposureShare > 15) {
    actions.push(
      `Red-category exposure represents ${redExposureShare.toFixed(1)}% of total portfolio exposure, above the 15% concentration guideline — consider provisioning review.`
    );
  }

  if (amberCustomers.length > 0) {
    actions.push(`Place ${amberCustomers.length} Amber (Medium Risk) customer(s) on watchlist for closer monitoring.`);
  }

  const byIndustry = new Map<string, number>();
  for (const c of customers) {
    byIndustry.set(c.industrySector, (byIndustry.get(c.industrySector) ?? 0) + c.loanBalance);
  }
  const topIndustry = Array.from(byIndustry.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topIndustry) {
    const [industry, exposure] = topIndustry;
    const share = totalExp > 0 ? (exposure / totalExp) * 100 : 0;
    if (share > 30) {
      actions.push(
        `${industry} accounts for ${share.toFixed(1)}% of total exposure, above the 30% single-sector concentration guideline.`
      );
    }
  }

  if (actions.length === 0) {
    actions.push(`Portfolio is within normal parameters across ${total} customers — no immediate escalation required.`);
  }

  return actions;
}
