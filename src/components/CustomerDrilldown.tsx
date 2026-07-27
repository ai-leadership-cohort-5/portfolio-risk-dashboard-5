"use client";

import { useEffect, useState } from "react";
import RiskBadge from "@/components/RiskBadge";
import { getSnapshotHistory } from "@/lib/storage";
import type { PolicyBreach, PortfolioSnapshot, ScoredCustomer } from "@/lib/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(
    value
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export default function CustomerDrilldown({
  customer,
  breaches,
  onClose,
}: {
  customer: ScoredCustomer;
  breaches: PolicyBreach[];
  onClose: () => void;
}) {
  const [history, setHistory] = useState<PortfolioSnapshot[]>([]);

  useEffect(() => {
    setHistory(getSnapshotHistory());
  }, [customer.customerId]);

  const customerHistory = history
    .map((snap) => ({
      analysedAt: snap.analysedAt,
      record: snap.customers.find((c) => c.customerId === customer.customerId),
    }))
    .filter((h): h is { analysedAt: string; record: NonNullable<typeof h.record> } => !!h.record)
    .sort((a, b) => new Date(a.analysedAt).getTime() - new Date(b.analysedAt).getTime());

  const triggeredBreaches = breaches.filter((b) => b.affectedCustomerIds.includes(customer.customerId));

  const factors = [
    { label: "Credit Score", value: customer.creditScoreFactor, raw: `Score: ${customer.creditScore}` },
    { label: "Repayment Risk", value: customer.repaymentRiskFactor, raw: customer.repaymentStatus },
    { label: "Exposure", value: customer.exposureFactor, raw: formatCurrency(customer.loanBalance) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg overflow-y-auto bg-[var(--surface)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{customer.customerName}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{customer.industrySector}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)]"
          >
            Close
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <RiskBadge category={customer.category} />
          <span className="text-2xl font-semibold text-[var(--foreground)]">{customer.riskScore}</span>
          <span className="text-xs text-[var(--muted)]">risk score</span>
        </div>

        {/* Score breakdown */}
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Score Breakdown
          </h3>
          <div className="mt-3 space-y-3">
            {factors.map((f) => (
              <div key={f.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--foreground)]">{f.label}</span>
                  <span className="text-[var(--muted)]">
                    {f.value.toFixed(0)} · {f.raw}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-[var(--background)]">
                  <div
                    className="h-2 rounded-full bg-[var(--accent)]"
                    style={{ width: `${Math.min(100, f.value)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* History */}
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Score &amp; Exposure History
          </h3>
          {customerHistory.length <= 1 ? (
            <p className="mt-2 text-sm text-[var(--muted)]">
              No prior snapshots for this customer yet — history will build up as the portfolio is
              re-analysed over time.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[var(--muted)]">
                    <th className="py-1 pr-3">Date</th>
                    <th className="py-1 pr-3">Risk Score</th>
                    <th className="py-1 pr-3">Category</th>
                    <th className="py-1 pr-3">Exposure</th>
                    <th className="py-1 pr-3">Repayment</th>
                  </tr>
                </thead>
                <tbody>
                  {customerHistory.map((h) => (
                    <tr key={h.analysedAt} className="border-t border-[var(--border)]">
                      <td className="py-1 pr-3">{formatDate(h.analysedAt)}</td>
                      <td className="py-1 pr-3">{h.record.riskScore}</td>
                      <td className="py-1 pr-3">{h.record.category}</td>
                      <td className="py-1 pr-3">{formatCurrency(h.record.loanBalance)}</td>
                      <td className="py-1 pr-3">{h.record.repaymentStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Policy rules triggered */}
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Policy Rules Triggered
          </h3>
          {triggeredBreaches.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--muted)]">
              This customer does not trip any numerically-tested policy threshold.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {triggeredBreaches.map((b) => (
                <li key={b.id} className="border-l-2 border-[var(--accent)] pl-3 text-sm text-[var(--foreground)]">
                  {b.title}
                  <p className="text-xs italic text-[var(--muted)]">&ldquo;{b.ruleText}&rdquo;</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
