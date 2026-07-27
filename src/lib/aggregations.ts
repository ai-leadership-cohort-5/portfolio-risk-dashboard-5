// Dashboard aggregation helpers: category breakdowns, industry exposure,
// portfolio trend simulation, and recommended-action derivation.

import { RISK_THRESHOLDS } from "./riskScoring";
import type {
  MigrationResult,
  MigrationTransition,
  PolicyBreach,
  PortfolioSnapshot,
  RiskCategory,
  ScoredCustomer,
  SnapshotCustomer,
  TrendPoint,
} from "./types";

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

export function recommendedActions(
  customers: ScoredCustomer[],
  migration?: MigrationResult,
  breaches?: PolicyBreach[]
): string[] {
  const actions: string[] = [];

  // Emerging risks from this period's movement and policy testing surface
  // first — they're the freshest signal and the reason a CRO would open the
  // dashboard today rather than last week.
  if (migration?.hasPrevious) {
    const worseningTransitions = migration.transitions.filter(
      (t) =>
        (t.from === "Amber" && t.to === "Red") ||
        (t.from === "Green" && t.to === "Red") ||
        (t.from === "Green" && t.to === "Amber")
    );
    for (const t of worseningTransitions) {
      actions.push(
        `${t.count} customer(s) migrated ${t.from} → ${t.to} since the last snapshot — review for early intervention before further deterioration.`
      );
    }
  }

  if (breaches) {
    for (const b of breaches.filter((b) => b.severity === "breach")) {
      actions.push(`Policy breach: ${b.detail}`);
    }
  }

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

// ---------------------------------------------------------------------------
// Risk migration — compares the current scored portfolio against the most
// recent previously-saved snapshot (see src/lib/storage.ts) so the dashboard
// can report real Green/Amber/Red movement instead of a simulated trend.
// ---------------------------------------------------------------------------

export function toSnapshotCustomers(customers: ScoredCustomer[]): SnapshotCustomer[] {
  return customers.map((c) => ({
    customerId: c.customerId,
    customerName: c.customerName,
    industrySector: c.industrySector,
    creditScore: c.creditScore,
    repaymentStatus: c.repaymentStatus,
    loanBalance: c.loanBalance,
    riskScore: c.riskScore,
    category: c.category,
  }));
}

const CATEGORY_RANK: Record<RiskCategory, number> = { Green: 0, Amber: 1, Red: 2 };

export function computeMigration(
  currentCustomers: ScoredCustomer[],
  previous: PortfolioSnapshot | null
): MigrationResult {
  if (!previous) {
    return {
      hasPrevious: false,
      previousAnalysedAt: null,
      transitions: [],
      newCustomers: [],
      droppedCustomerIds: [],
      deterioratedCount: 0,
      improvedCount: 0,
      stableCount: 0,
    };
  }

  const previousById = new Map(previous.customers.map((c) => [c.customerId, c]));
  const currentIds = new Set(currentCustomers.map((c) => c.customerId));

  const transitionMap = new Map<string, MigrationTransition>();
  let deteriorated = 0;
  let improved = 0;
  let stable = 0;
  const newCustomers: SnapshotCustomer[] = [];

  for (const current of currentCustomers) {
    const prior = previousById.get(current.customerId);
    if (!prior) {
      newCustomers.push({
        customerId: current.customerId,
        customerName: current.customerName,
        industrySector: current.industrySector,
        creditScore: current.creditScore,
        repaymentStatus: current.repaymentStatus,
        loanBalance: current.loanBalance,
        riskScore: current.riskScore,
        category: current.category,
      });
      continue;
    }

    const key = `${prior.category}->${current.category}`;
    if (!transitionMap.has(key)) {
      transitionMap.set(key, { from: prior.category, to: current.category, count: 0, customers: [] });
    }
    const transition = transitionMap.get(key)!;
    transition.count += 1;
    transition.customers.push({
      customerId: current.customerId,
      customerName: current.customerName,
      industrySector: current.industrySector,
      creditScore: current.creditScore,
      repaymentStatus: current.repaymentStatus,
      loanBalance: current.loanBalance,
      riskScore: current.riskScore,
      category: current.category,
    });

    const rankDelta = CATEGORY_RANK[current.category] - CATEGORY_RANK[prior.category];
    if (rankDelta > 0) deteriorated += 1;
    else if (rankDelta < 0) improved += 1;
    else stable += 1;
  }

  const droppedCustomerIds = previous.customers
    .filter((c) => !currentIds.has(c.customerId))
    .map((c) => c.customerId);

  return {
    hasPrevious: true,
    previousAnalysedAt: previous.analysedAt,
    transitions: Array.from(transitionMap.values()).sort((a, b) => b.count - a.count),
    newCustomers,
    droppedCustomerIds,
    deterioratedCount: deteriorated,
    improvedCount: improved,
    stableCount: stable,
  };
}

// ---------------------------------------------------------------------------
// Rationale — a short, deterministic explanation of what's driving a
// customer's risk score, built from the three weighted factor contributions.
// ---------------------------------------------------------------------------

export function buildRationale(customer: ScoredCustomer): string {
  const contributions = [
    {
      label: `credit score of ${customer.creditScore}`,
      value: customer.creditScoreFactor,
      weight: "credit",
    },
    {
      label: `repayment status "${customer.repaymentStatus}"`,
      value: customer.repaymentRiskFactor,
      weight: "repayment",
    },
    {
      label: `exposure of ${new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: "AUD",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(customer.loanBalance)}`,
      value: customer.exposureFactor,
      weight: "exposure",
    },
  ].sort((a, b) => b.value - a.value);

  const [top, second] = contributions;

  if (customer.category === "Green" && top.value < 40) {
    return `Low risk overall — ${top.label} and ${second.label} are both within normal ranges.`;
  }

  return `Driven primarily by ${top.label} (factor ${top.value.toFixed(0)}), with ${second.label} (factor ${second.value.toFixed(0)}) adding further weight.`;
}

export { RISK_THRESHOLDS };
