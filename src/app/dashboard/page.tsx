"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import RiskBadge from "@/components/RiskBadge";
import { useAnalysis } from "@/context/AnalysisContext";
import {
  exposureByIndustry,
  generatePortfolioTrend,
  recommendedActions,
  summariseByCategory,
  topRiskCustomers,
  totalExposure,
} from "@/lib/aggregations";
import { RISK_THRESHOLDS } from "@/lib/riskScoring";
import type { RiskCategory } from "@/lib/types";

const CATEGORY_COLOURS: Record<RiskCategory, string> = {
  Green: "#2f7d4f",
  Amber: "#b5720f",
  Red: "#b13030",
};

const EXPOSURE_COLOUR = "#333a42";

const INDUSTRY_PALETTE = [
  "#1f4267",
  "#2c5a8c",
  "#4a7ab0",
  "#7098c2",
  "#9db8d6",
  "#5b6572",
  "#8b95a1",
  "#b8c0c9",
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

  const { customers, rules, csvFileName, pdfFileName, pdfPageCount, analysedAt, isSampleData, pdfParseFailed } = result;

  const categorySummaries = summariseByCategory(customers);
  const exposure = totalExposure(customers);
  const industryData = exposureByIndustry(customers);
  const currentAverage =
    customers.length > 0
      ? customers.reduce((sum, c) => sum + c.riskScore, 0) / customers.length
      : 0;
  const trend = generatePortfolioTrend(currentAverage);
  const top10 = topRiskCustomers(customers, 10);
  const actions = recommendedActions(customers);

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

      {/* 2. Category KPI cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
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

      {/* 3. Total exposure */}
      <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <p className="text-sm font-medium text-[var(--muted)]">Total Portfolio Exposure</p>
        <p className="mt-1 text-3xl font-semibold text-[var(--foreground)]">{formatFullCurrency(exposure)}</p>
      </div>

      {/* 4. Two-column chart row */}
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

      {/* 5. Trend chart */}
      <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Portfolio Risk Trend</h2>
        <p className="text-xs text-[var(--muted)]">Illustrative trend leading up to current position</p>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--muted)" />
              <YAxis tick={{ fontSize: 12 }} stroke="var(--muted)" domain={[0, 100]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="averageRiskScore"
                name="Average Risk Score"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 6. Top 10 table */}
      <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Top 10 Highest-Risk Customers</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Industry</th>
                <th className="py-2 pr-3">Credit Score</th>
                <th className="py-2 pr-3">Repayment Status</th>
                <th className="py-2 pr-3">Loan Balance</th>
                <th className="py-2 pr-3">Risk Score</th>
                <th className="py-2 pr-3">Category</th>
              </tr>
            </thead>
            <tbody>
              {top10.map((c) => (
                <tr key={c.customerId} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2 pr-3 font-medium text-[var(--foreground)]">{c.customerName}</td>
                  <td className="py-2 pr-3 text-[var(--muted)]">{c.industrySector}</td>
                  <td className="py-2 pr-3 text-[var(--muted)]">{c.creditScore}</td>
                  <td className="py-2 pr-3 text-[var(--muted)]">{c.repaymentStatus}</td>
                  <td className="py-2 pr-3 text-[var(--muted)]">{formatFullCurrency(c.loanBalance)}</td>
                  <td className="py-2 pr-3 text-[var(--muted)]">{c.riskScore}</td>
                  <td className="py-2 pr-3">
                    <RiskBadge category={c.category} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. Bottom row */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Recommended Actions</h2>
          <ul className="mt-3 space-y-2">
            {actions.map((action, i) => (
              <li key={i} className="flex gap-2 text-sm text-[var(--foreground)]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
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
      </div>
    </div>
  );
}
