/**
 * riskScoring.ts
 * -----------------------------------------------------------------------
 * THIS IS THE SINGLE FILE TO EDIT TO CHANGE SCORING BEHAVIOUR.
 *
 * Risk Score = (Credit Risk Weight × Credit Score Factor)
 *            + (Repayment Risk Weight × Repayment Status Factor)
 *            + (Exposure Weight × Loan Balance Factor)
 *
 * All three factors are normalised to a 0-100 scale before weighting, so the
 * final Risk Score is also on a 0-100 scale. Adjust DEFAULT_WEIGHTS or
 * RISK_THRESHOLDS below to change how the portfolio is scored and
 * categorised — no other file needs to change.
 * -----------------------------------------------------------------------
 */

import type { RawCustomerRow, RiskCategory, RiskWeights, ScoredCustomer } from "./types";

// Rationale: credit history and repayment behaviour are the strongest
// predictors of default; exposure reflects materiality (how much is at
// stake), not probability of default, hence the lower weight.
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

/**
 * Credit Score Factor: lower credit scores => higher risk factor.
 * Clamped to the [300, 850] band before conversion.
 */
export function creditScoreFactor(creditScore: number): number {
  const clamped = Math.min(CREDIT_SCORE_MAX, Math.max(CREDIT_SCORE_MIN, creditScore));
  return ((CREDIT_SCORE_MAX - clamped) / (CREDIT_SCORE_MAX - CREDIT_SCORE_MIN)) * 100;
}

/**
 * Exposure Factor: loan balance relative to the exposure cap, capped at 100.
 */
export function exposureFactor(loanBalance: number): number {
  const clamped = Math.min(Math.max(loanBalance, 0), EXPOSURE_CAP);
  return (clamped / EXPOSURE_CAP) * 100;
}

// Free-text lookup table. Unrecognised text with no parseable day count
// defaults to 50 (moderate risk, never silently ignored).
// NOTE: the "60 days past due" (75) vs "60 Days Past Due" single-label (60)
// asymmetry below is intentional historical behaviour — keep both entries.
const REPAYMENT_STATUS_TABLE: Array<{ match: RegExp; factor: number }> = [
  { match: /\bcurrent\b/i, factor: 0 },
  { match: /\bon\s*time\b/i, factor: 0 },
  { match: /\bwatchlist\b/i, factor: 20 },
  { match: /\bgrace\b/i, factor: 20 },
  { match: /^\s*60\s*days?\s*past\s*due\s*$/i, factor: 60 },
  { match: /\bnon[-\s]?performing\b/i, factor: 95 },
  { match: /\bnpl\b/i, factor: 95 },
  { match: /\bdefault\b/i, factor: 100 },
  { match: /\bwrite[-\s]?off\b/i, factor: 100 },
  { match: /90\+?\s*days?/i, factor: 90 },
  { match: /60[-\s]?89\s*days?/i, factor: 75 },
  { match: /\b60\s*days?\b/i, factor: 75 },
  { match: /30\s*days?/i, factor: 55 },
  { match: /1[-\s]?29\s*days?/i, factor: 35 },
];

/**
 * Repayment Status Factor: free-text lookup with a day-count fallback.
 */
export function repaymentRiskFactor(rawStatus: string): number {
  const status = rawStatus.trim();

  for (const entry of REPAYMENT_STATUS_TABLE) {
    if (entry.match.test(status)) return entry.factor;
  }

  // Fallback: try to parse a day count out of the free text.
  const dayMatch = status.match(/(\d+)\s*\+?\s*days?/i);
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
  row: RawCustomerRow,
  weights: RiskWeights = DEFAULT_WEIGHTS
): ScoredCustomer | null {
  const creditScore = Number(row.creditScore);
  const loanBalance = Number(row.loanBalance);

  if (!row.customerId || Number.isNaN(creditScore) || Number.isNaN(loanBalance)) {
    return null;
  }

  const csf = creditScoreFactor(creditScore);
  const rrf = repaymentRiskFactor(row.repaymentStatus);
  const ef = exposureFactor(loanBalance);

  const riskScore =
    weights.creditRiskWeight * csf + weights.repaymentRiskWeight * rrf + weights.exposureWeight * ef;

  return {
    customerId: row.customerId,
    customerName: row.customerName,
    industrySector: row.industrySector,
    creditScore,
    repaymentStatus: row.repaymentStatus,
    loanBalance,
    creditScoreFactor: csf,
    repaymentRiskFactor: rrf,
    exposureFactor: ef,
    riskScore,
    category: categoriseRiskScore(riskScore),
  };
}

export function scoreCustomers(
  rows: RawCustomerRow[],
  weights: RiskWeights = DEFAULT_WEIGHTS
): { scored: ScoredCustomer[]; rowsSkipped: number } {
  const scored: ScoredCustomer[] = [];
  let rowsSkipped = 0;

  for (const row of rows) {
    const result = scoreCustomer(row, weights);
    if (result) {
      scored.push(result);
    } else {
      rowsSkipped += 1;
    }
  }

  return { scored, rowsSkipped };
}
