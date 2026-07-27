"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import CustomerDrilldown from "@/components/CustomerDrilldown";
import InterventionWorklist from "@/components/InterventionWorklist";
import MigrationMatrix from "@/components/MigrationMatrix";
import PolicyBreachPanel from "@/components/PolicyBreachPanel";
import RiskBadge from "@/components/RiskBadge";
import ScenarioPanel from "@/components/ScenarioPanel";
import { useAnalysis } from "@/context/AnalysisContext";
import {
  buildRationale,
  exposureByIndustry,
  recommendedActions,
  summariseByCategory,
  topRiskCustomers,
  totalExposure,
} from "@/lib/aggregations";
import { detectPolicyBreaches } from "@/lib/policyBreaches";
import { RISK_THRESHOLDS } from "@/lib/riskScoring";
import { getWorklist, saveWorklist } from "@/lib/storage";
import type { RiskCategory, WorklistItem } from "@/lib/types";
import { seedWorklist } from "@/lib/worklist";

// NAB brand palette: risk categories keep semantic green/amber, but Red now
// shares the NAB brand red family instead of a generic red, so "High Risk"
// reads as the same red used across the rest of the NAB-branded UI.
const CATEGORY_COLOURS: Record<RiskCategory, string> = {
  Green: "#22c55e",
  Amber: "#f59e0b",
  Red: "#ed0000",
};

const EXPOSURE_COLOUR = "#1a1a1a";

// Black → NAB red → grey qualitative palette (replaces the previous blue-grey
// scale, which no longer matches the brand accent).
const INDUSTRY_PALETTE = [
  "#1a1a1a",
  "#ed0000",
  "#737373",
  "#b30000",
  "#a6a6a6",
  "#4d4d4d",
  "#e08080",
  "#cccccc",
];

function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatFullCurrency(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

function CategoryLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
      <span className="font-medium text-[var(--foreground)]">Customers:</span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLOURS.Green }} />
        Green
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLOURS.Amber }} />
        Amber
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLOURS.Red }} />
        Red
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: EXPOSURE_COLOUR }} />
        Exposure
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const { result } = useAnalysis();
  const [worklist, setWorklist] = useState<WorklistItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  useEffect(() => {
    setWorklist(getWorklist());
  }, [result]);

  const customers = useMemo(() => result?.customers ?? [], [result]);

  const breaches = useMemo(
    () => (result ? detectPolicyBreaches(result.rules, customers) : []),
    [result, customers]
  );

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-lg font-medium text-[var(--foreground)]">No analysis loaded yet</p>
        <Link
          href="/"
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
        >
          Go to Upload
        </Link>
      </div>
    );
  }

  const { rules, csvFileName, pdfFileName, pdfPageCount, analysedAt, isSampleData, pdfParseFailed, migration, weights } =
    result;

  const categorySummaries = summariseByCategory(customers);
  const exposure = totalExposure(customers);
  const industryData = exposureByIndustry(customers);
  const top10 = topRiskCustomers(customers, 10);
  const actions = recommendedActions(customers, migration, breaches);
  const industries = Array.from(new Set(customers.map((c) => c.industrySector))).sort();
  const selectedCustomer = customers.find((c) => c.customerId === selectedCustomerId) ?? null;

  function handleWorklistChange(items: WorklistItem[]) {
    setWorklist(items);
  }

  function handleSyncWorklist() {
    const merged = seedWorklist(worklist, customers);
    setWorklist(merged);
    saveWorklist(merged);
  }

  const categoryChartData = categorySummaries.map((s) => ({
    category: s.category,
    customers: s.count,
    exposure: s.exposure,
  }));

  const analysedDate = analysedAt.toLocaleDateString("en-AU");
  const analysedTime = analysedAt.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      {/* 1. Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold text-[var(--foreground)]">Executive Dashboard</h1>
        {isSampleData && (
          <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            Sample Data
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {customers.length} customers · {csvFileName} · {pdfFileName ?? "no policy uploaded"} · analysed{" "}
        {analysedDate}, {analysedTime}
      </p>

      {/* 2. Recommended Actions — moved to top: this is what a CRO needs first */}
      <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Recommended Actions</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Auto-generated from this period&rsquo;s risk migration, policy breach testing, and portfolio composition.
        </p>
        <ul className="mt-3 space-y-2">
          {actions.map((action, i) => (
            <li key={i} className="flex gap-2 text-sm text-[var(--foreground)]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 3. Category KPI cards */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {categorySummaries.map((s) => (
          <div key={s.category} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLOURS[s.category] }} />
              <span className="text-sm font-medium text-[var(--foreground)]">{s.category}</span>
            </div>
            <div className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{s.count}</div>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {s.pctOfCustomers}% of customers · {formatCompactCurrency(s.exposure)} exposure ({s.pctOfExposure}%)
            </p>
          </div>
        ))}
      </div>

      {/* 4. Total exposure */}
      <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <p className="text-sm font-medium text-[var(--muted)]">Total Portfolio Exposure</p>
        <p className="mt-1 text-3xl font-semibold text-[var(--foreground)]">{formatFullCurrency(exposure)}</p>
      </div>

      {/* 5. Two-column chart row */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Customers &amp; Exposure by Risk Category</h2>
          <div className="mt-2">
            <CategoryLegend />
          </div>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} stroke="var(--muted)" />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="var(--muted)" />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  stroke="var(--muted)"
                  tickFormatter={(v) => formatCompactCurrency(Number(v))}
                />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) =>
                    name === "exposure" ? formatFullCurrency(Number(value)) : value
                  }
                />
                <Bar yAxisId="left" dataKey="customers" name="Customers" radius={[4, 4, 0, 0]}>
                  {categoryChartData.map((entry) => (
                    <Cell key={entry.category} fill={CATEGORY_COLOURS[entry.category as RiskCategory]} />
                  ))}
                </Bar>
                <Bar yAxisId="right" dataKey="exposure" name="Exposure" fill={EXPOSURE_COLOUR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Exposure by Industry Sector</h2>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={industryData}
                  dataKey="exposure"
                  nameKey="industry"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  label={(props: any) => props.name ?? props.industry ?? ""}
                >
                  {industryData.map((entry, index) => (
                    <Cell key={entry.industry} fill={INDUSTRY_PALETTE[index % INDUSTRY_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => formatFullCurrency(Number(value))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 6. Risk migration + policy breach detection — real data, not illustrative */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <MigrationMatrix migration={migration} />
        <PolicyBreachPanel breaches={breaches} pdfFileName={pdfFileName} />
      </div>

      {/* 7. Top 10 table, now with rationale and click-through to drill-down */}
      <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Top 10 Highest-Risk Customers</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">Click a customer for the full risk profile.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Industry</th>
                <th className="py-2 pr-3">Loan Balance</th>
                <th className="py-2 pr-3">Risk Score</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Rationale</th>
              </tr>
            </thead>
            <tbody>
              {top10.map((c) => (
                <tr
                  key={c.customerId}
                  onClick={() => setSelectedCustomerId(c.customerId)}
                  className="cursor-pointer border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]"
                >
                  <td className="py-2 pr-3 font-medium text-[var(--accent)] underline-offset-2 hover:underline">
                    {c.customerName}
                  </td>
                  <td className="py-2 pr-3 text-[var(--muted)]">{c.industrySector}</td>
                  <td className="py-2 pr-3 text-[var(--muted)]">{formatFullCurrency(c.loanBalance)}</td>
                  <td className="py-2 pr-3 text-[var(--muted)]">{c.riskScore}</td>
                  <td className="py-2 pr-3">
                    <RiskBadge category={c.category} />
                  </td>
                  <td className="py-2 pr-3 text-xs text-[var(--muted)]">{buildRationale(c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8. Intervention worklist */}
      <div className="mt-4">
        <InterventionWorklist
          items={worklist}
          onChange={handleWorklistChange}
          onSelectCustomer={setSelectedCustomerId}
        />
        {worklist.length === 0 && (
          <button
            type="button"
            onClick={handleSyncWorklist}
            className="mt-2 text-xs text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Populate worklist from current Red/Amber customers
          </button>
        )}
      </div>

      {/* 9. Scenario / stress testing */}
      <div className="mt-4">
        <ScenarioPanel customers={customers} weights={weights} industries={industries} />
      </div>

      {/* 10. Scoring methodology + extracted policy highlights */}
      <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Scoring Methodology</h2>
        <p className="mt-2 text-sm text-[var(--foreground)]">
          Risk Score = (Credit Risk Weight × Credit Score Factor) + (Repayment Risk Weight ×
          Repayment Status Factor) + (Exposure Weight × Loan Balance Factor)
        </p>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Green 0–{RISK_THRESHOLDS.greenMax} · Amber {RISK_THRESHOLDS.greenMax + 1}–
          {RISK_THRESHOLDS.amberMax} · Red {RISK_THRESHOLDS.amberMax + 1}–100
        </p>

        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Extracted Policy Highlights
          </h3>
          {pdfFileName ? (
            pdfParseFailed ? (
              <p className="mt-2 text-sm text-[var(--muted)]">
                Could not extract text from {pdfFileName}.
              </p>
            ) : (
              <>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Heuristic extraction from {pdfFileName} — {pdfPageCount ?? 0} page(s) scanned.
                </p>
                {rules.length > 0 ? (
                  <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
                    {rules.map((rule, i) => (
                      <li
                        key={i}
                        className="border-l-2 border-[var(--accent)] pl-2 text-sm text-[var(--foreground)]"
                      >
                        {rule.text}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    No rule statements were identified in this document.
                  </p>
                )}
              </>
            )
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">
              No policy PDF was uploaded, so no rules were extracted for this analysis.
            </p>
          )}
        </div>
      </div>

      {selectedCustomer && (
        <CustomerDrilldown
          customer={selectedCustomer}
          breaches={breaches}
          onClose={() => setSelectedCustomerId(null)}
        />
      )}
    </div>
  );
}
