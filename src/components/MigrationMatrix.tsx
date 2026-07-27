"use client";

import type { MigrationResult, RiskCategory } from "@/lib/types";

const CATEGORY_ORDER: RiskCategory[] = ["Green", "Amber", "Red"];

const DOT_COLOUR: Record<RiskCategory, string> = {
  Green: "#22c55e",
  Amber: "#f59e0b",
  Red: "#ed0000",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export default function MigrationMatrix({ migration }: { migration: MigrationResult }) {
  if (!migration.hasPrevious) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Risk Migration</h2>
        <p className="mt-3 text-sm text-[var(--muted)]">
          This is the first snapshot saved for this portfolio. Run analysis again after the next
          data update to see which customers moved between Green, Amber, and Red — and how fast.
        </p>
      </div>
    );
  }

  const countFor = (from: RiskCategory, to: RiskCategory): number =>
    migration.transitions.find((t) => t.from === from && t.to === to)?.count ?? 0;

  const deteriorating = migration.transitions
    .filter((t) => CATEGORY_ORDER.indexOf(t.to) > CATEGORY_ORDER.indexOf(t.from))
    .flatMap((t) => t.customers)
    .sort((a, b) => b.riskScore - a.riskScore);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-[var(--foreground)]">Risk Migration</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Since last snapshot ({formatDate(migration.previousAnalysedAt!)})
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-md bg-[var(--risk-red-bg)] p-3">
          <div className="text-2xl font-semibold text-[var(--risk-red)]">{migration.deterioratedCount}</div>
          <div className="text-xs text-[var(--muted)]">Deteriorated</div>
        </div>
        <div className="rounded-md bg-[var(--background)] p-3">
          <div className="text-2xl font-semibold text-[var(--foreground)]">{migration.stableCount}</div>
          <div className="text-xs text-[var(--muted)]">Stable</div>
        </div>
        <div className="rounded-md bg-[var(--risk-green-bg)] p-3">
          <div className="text-2xl font-semibold text-[var(--risk-green)]">{migration.improvedCount}</div>
          <div className="text-xs text-[var(--muted)]">Improved</div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[360px] text-center text-xs">
          <thead>
            <tr>
              <th className="p-2 text-left text-[var(--muted)]">From \ To</th>
              {CATEGORY_ORDER.map((to) => (
                <th key={to} className="p-2 text-[var(--muted)]">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: DOT_COLOUR[to] }} />
                    {to}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORY_ORDER.map((from) => (
              <tr key={from} className="border-t border-[var(--border)]">
                <td className="p-2 text-left font-medium text-[var(--foreground)]">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: DOT_COLOUR[from] }} />
                    {from}
                  </span>
                </td>
                {CATEGORY_ORDER.map((to) => {
                  const count = countFor(from, to);
                  const isDeterioration = CATEGORY_ORDER.indexOf(to) > CATEGORY_ORDER.indexOf(from);
                  const isImprovement = CATEGORY_ORDER.indexOf(to) < CATEGORY_ORDER.indexOf(from);
                  return (
                    <td
                      key={to}
                      className={`p-2 font-semibold ${
                        count === 0
                          ? "text-[var(--border)]"
                          : isDeterioration
                            ? "text-[var(--risk-red)]"
                            : isImprovement
                              ? "text-[var(--risk-green)]"
                              : "text-[var(--foreground)]"
                      }`}
                    >
                      {count}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {migration.newCustomers.length > 0 && (
        <p className="mt-3 text-xs text-[var(--muted)]">
          {migration.newCustomers.length} new customer(s) since last snapshot.
        </p>
      )}
      {migration.droppedCustomerIds.length > 0 && (
        <p className="mt-1 text-xs text-[var(--muted)]">
          {migration.droppedCustomerIds.length} customer(s) from the last snapshot no longer appear
          in this dataset.
        </p>
      )}

      {deteriorating.length > 0 && (
        <div className="mt-4 border-t border-[var(--border)] pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Fastest deteriorating
          </p>
          <ul className="mt-2 space-y-1">
            {deteriorating.slice(0, 5).map((c) => (
              <li key={c.customerId} className="text-sm text-[var(--foreground)]">
                {c.customerName} <span className="text-[var(--muted)]">— {c.industrySector}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
