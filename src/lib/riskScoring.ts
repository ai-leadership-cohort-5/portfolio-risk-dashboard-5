// ---------------------------------------------------------------------------
// THE FILE TO EDIT to change scoring behaviour (weights, thresholds, the
// repayment-status lookup table). Everything the dashboard displays about
// "how risk is scored" is pulled from the constants in this file — nothing
// is hard-coded elsewhere in the UI.
//
//   Risk Score = (Credit Risk Weight × Credit Score Factor)
//              + (Repayment Risk Weight × Repayment Status Factor)
//              + (Exposure Weight × Loan Balance Factor)
// ---------------------------------------------------------------------------

import type { RawCustomerRow, RiskCategory, RiskWeights, ScoredCustomer } from "./types";

// Credit history and repayment behaviour are the strongest predictors of
// default; exposure reflects materiality (how much is at stake), not
// probability of loss, hence the lower weight.
export const DEFAULT_WEIGHTS: RiskWeights = {
  creditRiskWeight: 0.4,
  repaymentRiskWeight: 0.4,
  exposureWeight: 0.2,
};

export const CREDIT_SCORE_MIN = 300;
export const CREDIT_SCORE_MAX = 850;

export const EXPOSURE_CAP = 500_000;

export const RISK_THRESHOLDS = {
  greenMax: 35,
  amberMax: 65,
};

// Free-text lookup table for repayment status. Unrecognised text with no
// parseable day count defaults to 50 (moderate risk, never silently ignored).
// The 60-day asymmetry (75 for "60-89 days" style labels vs 60 for an exact
// "60 Days Past Due" label) is intentional history, not a bug to "fix".
const REPAYMENT_STATUS_TABLE: Array<{ match: RegExp; factor: number }> = [
  { match: /\b(current|on time|on-time)\b/i, factor: 0 },
  { match: /\b(watchlist|grace)\b/i, factor: 20 },
  { match: /\b(1|[12]?[0-9])\s*-?\s*(day|days)\b.*\b(1[- ]?29|29)\b/i, factor: 35 },
  { match: /\b1[- ]?29\s*days?\b/i, factor: 35 },
  { match: /\b60\s*days?\s*past\s*due\b/i, factor: 60 },
  { match: /\b30\s*days?\b/i, factor: 55 },
  { match: /\b60\s*-?\s*89\s*days?\b/i, factor: 75 },
  { match: /\b60\s*days?\b/i, factor: 75 },
  { match: /\b90\+?\s*days?\b/i, factor: 90 },
  { match: /\b(default|write-?off)\b/i, factor: 100 },
  { match: /\b(non-?performing|npl)\b/i, factor: 95 },
];

export function creditScoreFactor(creditScore: number): number {
  const clamped = Math.min(Math.max(creditScore, CREDIT_SCORE_MIN), CREDIT_SCORE_MAX);
  return ((CREDIT_SCORE_MAX - clamped) / (CREDIT_SCORE_MAX - CREDIT_SCORE_MIN)) * 100;
}

export function exposureFactor(loanBalance: number): number {
  const capped = Math.min(Math.max(loanBalance, 0), EXPOSURE_CAP);
  return (capped / EXPOSURE_CAP) * 100;
}

export function repaymentRiskFactor(repaymentStatus: string): number {
  const text = repaymentStatus.trim();

  for (const entry of REPAYMENT_STATUS_TABLE) {
    if (entry.match.test(text)) return entry.factor;
  }

  // Try to parse a raw day count, e.g. "45 days past due".
  const dayMatch = text.match(/(\d+)\s*day/i);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    if (days === 0) return 0;
    if (days < 30) return 35;
    if (days < 60) return 55;
    if (days < 90) return 75;
    return 90;
  }

  return 50;
}

export function categoriseRiskScore(riskScore: number): RiskCategory {
  if (riskScore <= RISK_THRESHOLDS.greenMax) return "Green";
  if (riskScore <= RISK_THRESHOLDS.amberMax) return "Amber";
  return "Red";
}

export function scoreCustomer(
  customer: RawCustomerRow,
  weights: RiskWeights = DEFAULT_WEIGHTS
): ScoredCustomer {
  const credit = creditScoreFactor(customer.creditScore);
  const repayment = repaymentRiskFactor(customer.repaymentStatus);
  const exposure = exposureFactor(customer.loanBalance);

  const riskScore =
    weights.creditRiskWeight * credit +
    weights.repaymentRiskWeight * repayment +
    weights.exposureWeight * exposure;

  return {
    ...customer,
    creditScoreFactor: Math.round(credit * 10) / 10,
    repaymentRiskFactor: Math.round(repayment * 10) / 10,
    exposureFactor: Math.round(exposure * 10) / 10,
    riskScore: Math.round(riskScore * 10) / 10,
    category: categoriseRiskScore(riskScore),
  };
}

export function scoreCustomers(
  customers: RawCustomerRow[],
  weights: RiskWeights = DEFAULT_WEIGHTS
): ScoredCustomer[] {
  return customers.map((c) => scoreCustomer(c, weights));
}
