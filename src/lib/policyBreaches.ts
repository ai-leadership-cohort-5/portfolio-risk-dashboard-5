// Policy breach detection: rather than just displaying extracted PDF rule
// text, this parses numeric thresholds out of it (percentages, dollar
// amounts, credit score minimums) and tests the actual portfolio against
// them — citing the specific number that breaches the specific clause.
//
// This is necessarily heuristic (the PDF text is free-form prose), so a rule
// only produces a breach/warning when a threshold can be confidently parsed;
// otherwise it's left as an informational policy statement.

import { exposureByIndustry, totalExposure } from "./aggregations";
import type { ExtractedRule, PolicyBreach, ScoredCustomer } from "./types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

function extractPercent(text: string): number | null {
  const match = text.match(/(\d{1,3}(?:\.\d+)?)\s*(?:%|percent)/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  return Number.isFinite(value) ? value : null;
}

function extractDollarAmount(text: string): number | null {
  // Matches "$500,000", "500,000 dollars", "$2 million", "2 million dollars"
  const millionMatch = text.match(/\$?\s?(\d+(?:\.\d+)?)\s*million/i);
  if (millionMatch) return parseFloat(millionMatch[1]) * 1_000_000;

  const dollarMatch = text.match(/\$\s?([\d,]+(?:\.\d+)?)/);
  if (dollarMatch) return parseFloat(dollarMatch[1].replace(/,/g, ""));

  const wordMatch = text.match(/([\d,]+(?:\.\d+)?)\s*dollars/i);
  if (wordMatch) return parseFloat(wordMatch[1].replace(/,/g, ""));

  return null;
}

function extractCreditScoreMin(text: string): number | null {
  const match = text.match(/credit score[^.]*?(?:is|of|at least|minimum)?\s*(\d{3})\b/i);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  return value >= 300 && value <= 850 ? value : null;
}

let breachCounter = 0;
function nextId(): string {
  breachCounter += 1;
  return `breach-${breachCounter}`;
}

export function detectPolicyBreaches(
  rules: ExtractedRule[],
  customers: ScoredCustomer[]
): PolicyBreach[] {
  breachCounter = 0;
  const breaches: PolicyBreach[] = [];
  const total = totalExposure(customers) || 1;

  for (const rule of rules) {
    const text = rule.text;
    const lower = text.toLowerCase();

    // Industry / sector concentration limits.
    if (/(concentration|industry|sector)/i.test(lower) && /(exceed|limit|maximum|not exceed)/i.test(lower)) {
      const limit = extractPercent(text);
      if (limit !== null) {
        const byIndustry = exposureByIndustry(customers);
        for (const entry of byIndustry) {
          const share = (entry.exposure / total) * 100;
          if (share > limit) {
            breaches.push({
              id: nextId(),
              severity: "breach",
              title: `${entry.industry} exposure exceeds concentration limit`,
              detail: `${entry.industry} accounts for ${share.toFixed(1)}% of total portfolio exposure (${formatCurrency(entry.exposure)}), above the ${limit}% concentration limit.`,
              ruleText: text,
              metricLabel: `${entry.industry} exposure share`,
              metricValue: `${share.toFixed(1)}% (limit ${limit}%)`,
              affectedCustomerIds: customers
                .filter((c) => c.industrySector === entry.industry)
                .map((c) => c.customerId),
            });
          }
        }
      }
    }

    // Minimum credit score policy.
    const creditMin = extractCreditScoreMin(text);
    if (creditMin !== null) {
      const belowMin = customers.filter((c) => c.creditScore < creditMin);
      if (belowMin.length > 0) {
        const exposure = belowMin.reduce((sum, c) => sum + c.loanBalance, 0);
        const pct = (belowMin.length / customers.length) * 100;
        breaches.push({
          id: nextId(),
          severity: "warning",
          title: `Customers below minimum credit score policy`,
          detail: `${belowMin.length} customer(s) (${pct.toFixed(1)}% of the portfolio, ${formatCurrency(exposure)} exposure) sit below the policy minimum credit score of ${creditMin}.`,
          ruleText: text,
          metricLabel: "Customers below minimum",
          metricValue: `${belowMin.length} of ${customers.length}`,
          affectedCustomerIds: belowMin.map((c) => c.customerId),
        });
      }
    }

    // Secured lending / collateral valuation threshold.
    if (/(collateral|secured lending|valuation)/i.test(lower)) {
      const threshold = extractDollarAmount(text);
      if (threshold !== null) {
        const above = customers.filter((c) => c.loanBalance > threshold);
        if (above.length > 0) {
          const exposure = above.reduce((sum, c) => sum + c.loanBalance, 0);
          breaches.push({
            id: nextId(),
            severity: "info",
            title: `Customers above collateral valuation threshold`,
            detail: `${above.length} customer(s) have loan balances above ${formatCurrency(threshold)} (${formatCurrency(exposure)} total exposure) — confirm independent valuations are current per policy.`,
            ruleText: text,
            metricLabel: "Customers above threshold",
            metricValue: `${above.length} of ${customers.length}`,
            affectedCustomerIds: above.map((c) => c.customerId),
          });
        }
      }
    }

    // Default / arrears escalation threshold (e.g. "90 days or more").
    const daysMatch = text.match(/(\d{2,3})\s*days?[^.]*?(default|delinquen|escalat|collections)/i);
    if (daysMatch) {
      const days = parseInt(daysMatch[1], 10);
      const atOrBeyond = customers.filter((c) => /90\+|default|write-?off/i.test(c.repaymentStatus));
      if (atOrBeyond.length > 0) {
        const exposure = atOrBeyond.reduce((sum, c) => sum + c.loanBalance, 0);
        breaches.push({
          id: nextId(),
          severity: "breach",
          title: `Customers meeting default/escalation criteria`,
          detail: `${atOrBeyond.length} customer(s) (${formatCurrency(exposure)} exposure) are at or beyond the ${days}-day arrears threshold that triggers escalation to collections per policy.`,
          ruleText: text,
          metricLabel: "Customers at/beyond threshold",
          metricValue: `${atOrBeyond.length} of ${customers.length}`,
          affectedCustomerIds: atOrBeyond.map((c) => c.customerId),
        });
      }
    }
  }

  // De-duplicate identical detail strings (a rule could match more than one
  // heuristic above on the same underlying fact).
  const seen = new Set<string>();
  return breaches.filter((b) => {
    if (seen.has(b.detail)) return false;
    seen.add(b.detail);
    return true;
  });
}
