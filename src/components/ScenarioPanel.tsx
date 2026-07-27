"use client";

import { useState } from "react";
import { applyScenario } from "@/lib/scenario";
import type { RiskWeights, ScenarioResult, ScoredCustomer } from "@/lib/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function Delta({ before, after, invert = false }: { before: number; after: number; invert?: boolean }) {
  const diff = after - before;
  if (diff === 0) return <span className="text-[var(--muted)]">no change</span>;
  const worse = invert ? diff < 0 : diff > 0;
  const colour = worse ? "text-[var(--risk-red)]" : "text-[var(--risk-green)]";
  const sign = diff > 0 ? "+" : "";
  return <span className={colour}>{sign}{typeof after === "number" && Math.abs(diff) < 1000 ? diff.toFixed(0) : formatCurrency(diff)}</span>;
}

export default function ScenarioPanel({
  customers,
  weights,
  industries,
}: {
  customers: ScoredCustomer[];
  weights: RiskWeights;
  industries: string[];
}) {
  const [industrySector, setIndustrySector] = useState<string>("All");
  const [creditScoreDelta, setCreditScoreDelta] = useState(-30);
  const [worsenRepayment, setWorsenRepayment] = useState(false);
  const [result, setResult] = useState<ScenarioResult | null>(null);

  function runScenario() {
    setResult(
      applyScenario(customers, weights, {
        industrySector,
        creditScoreDelta,
        worsenRepayment,
      })
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-[var(--foreground)]">Scenario / Stress Testing</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Model a hypothetical shock and see the impact on the Red bucket and total exposure. Nothing
        here is saved — it&apos;s a forward-looking what-if, not a change to the live analysis.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="text-xs text-[var(--muted)]">
          Sector affected
          <select
            value={industrySector}
            onChange={(e) => setIndustrySector(e.target.value)}
            className="mt-1 block w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm text-[var(--foreground)]"
          >
            <option value="All">All sectors</option>
            {industries.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-[var(--muted)]">
          Credit score shock: {creditScoreDelta}
          <input
            type="range"
            min={-100}
            max={0}
            step={5}
            value={creditScoreDelta}
            onChange={(e) => setCreditScoreDelta(Number(e.target.value))}
            className="mt-2 block w-full"
          />
        </label>

        <label className="mt-1 flex items-center gap-2 text-xs text-[var(--muted)]">
          <input
            type="checkbox"
            checked={worsenRepayment}
            onChange={(e) => setWorsenRepayment(e.target.checked)}
          />
          Shift repayment status one band worse, portfolio-wide (proxy for a rate rise)
        </label>
      </div>

      <button
        type="button"
        onClick={runScenario}
        className="mt-4 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
      >
        Run Scenario
      </button>

      {result && (
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4 sm:grid-cols-4">
          <div>
            <div className="text-xs text-[var(--muted)]">Red customers</div>
            <div className="text-lg font-semibold text-[var(--foreground)]">{result.scenarioRedCount}</div>
            <div className="text-xs">
              was {result.baselineRedCount} (<Delta before={result.baselineRedCount} after={result.scenarioRedCount} />)
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--muted)]">Red exposure</div>
            <div className="text-lg font-semibold text-[var(--foreground)]">
              {formatCurrency(result.scenarioRedExposure)}
            </div>
            <div className="text-xs">
              was {formatCurrency(result.baselineRedExposure)} (
              <Delta before={result.baselineRedExposure} after={result.scenarioRedExposure} />)
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--muted)]">Total exposure</div>
            <div className="text-lg font-semibold text-[var(--foreground)]">
              {formatCurrency(result.scenarioTotalExposure)}
            </div>
            <div className="text-xs text-[var(--muted)]">unaffected by these shocks</div>
          </div>
          <div>
            <div className="text-xs text-[var(--muted)]">Red share of exposure</div>
            <div className="text-lg font-semibold text-[var(--foreground)]">
              {((result.scenarioRedExposure / (result.scenarioTotalExposure || 1)) * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-[var(--muted)]">
              was {((result.baselineRedExposure / (result.baselineTotalExposure || 1)) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
