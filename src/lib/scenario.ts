// Scenario / stress testing: apply a hypothetical shock to the current
// portfolio (a credit score shift for one sector, and/or a one-band
// worsening of repayment status across the book) and compare the resulting
// Red-bucket count and exposure against the baseline. Purely client-side and
// ephemeral — never persisted, never mutates the live analysis.

import { scoreCustomers } from "./riskScoring";
import { summariseByCategory, totalExposure } from "./aggregations";
import type { RawCustomerRow, RiskWeights, ScenarioInput, ScenarioResult, ScoredCustomer } from "./types";

// Maps a repayment status to the next-worse band, using the same keyword
// families as riskScoring.ts's repaymentRiskFactor lookup table.
export function worsenRepaymentStatus(status: string): string {
  const text = status.trim();

  if (/\b(current|on time|on-time)\b/i.test(text)) return "30 Days Late";
  if (/\b(watchlist|grace)\b/i.test(text)) return "60 Days Late";
  if (/\b1[- ]?29\s*days?\b/i.test(text)) return "30 Days Late";
  if (/\b30\s*days?\b/i.test(text)) return "60 Days Late";
  if (/\b60\s*days?\s*past\s*due\b/i.test(text)) return "90+ Days Late";
  if (/\b60\s*-?\s*89\s*days?\b/i.test(text)) return "90+ Days Late";
  if (/\b60\s*days?\b/i.test(text)) return "90+ Days Late";
  if (/\b90\+?\s*days?\b/i.test(text)) return "Default";
  if (/\b(default|write-?off|non-?performing|npl)\b/i.test(text)) return "Default";

  return text; // unrecognised — leave unchanged
}

export function applyScenario(
  customers: ScoredCustomer[],
  weights: RiskWeights,
  input: ScenarioInput
): ScenarioResult {
  const baselineSummaries = summariseByCategory(customers);
  const baselineRed = baselineSummaries.find((s) => s.category === "Red")!;
  const baselineTotal = totalExposure(customers);

  const shocked: RawCustomerRow[] = customers.map((c) => {
    const inSector = input.industrySector === "All" || c.industrySector === input.industrySector;

    const creditScore = inSector
      ? Math.min(850, Math.max(300, c.creditScore + input.creditScoreDelta))
      : c.creditScore;

    const repaymentStatus = input.worsenRepayment ? worsenRepaymentStatus(c.repaymentStatus) : c.repaymentStatus;

    return {
      customerId: c.customerId,
      customerName: c.customerName,
      industrySector: c.industrySector,
      creditScore,
      repaymentStatus,
      loanBalance: c.loanBalance,
    };
  });

  const scenarioCustomers = scoreCustomers(shocked, weights);
  const scenarioSummaries = summariseByCategory(scenarioCustomers);
  const scenarioRed = scenarioSummaries.find((s) => s.category === "Red")!;
  const scenarioTotal = totalExposure(scenarioCustomers);

  return {
    input,
    baselineRedCount: baselineRed.count,
    baselineRedExposure: baselineRed.exposure,
    baselineTotalExposure: baselineTotal,
    scenarioRedCount: scenarioRed.count,
    scenarioRedExposure: scenarioRed.exposure,
    scenarioTotalExposure: scenarioTotal,
    scenarioCustomers,
  };
}
