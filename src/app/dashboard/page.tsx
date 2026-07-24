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
import { useAnalysis } from "@/context/AnalysisContext";
import RiskBadge from "@/components/RiskBadge";
import {
  averageRiskScore,
  categorySummaries,
  exposureByIndustry,
  generatePortfolioTrend,
  recommendedActions,
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
const INDUSTRY_PALETTE = ["#1f4267", "#2c5a8c", "#4a7ab0", "#7098c2", "#9db8d6", "#5b6572", "#8b95a1", "#b8c0c9"];

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

function CustomBarLegend() {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: "var(--muted)" }}>
      <span className="font-medium" style={{ color: "var(--foreground)" }}>
        Customers:
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLOURS.Green }} /> Green
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLOURS.Amber }} /> Amber
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLOURS.Red }} /> Red
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: EXPOSURE_COLOUR }} /> Exposure
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const { result } = useAnalysis();

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-lg font-medium">No analysis loaded yet</p>
        <Link
          href="/"
          className="rounded-md px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: "var(--accent)" }}
        >
          Go to Upload
        </Link>
      </div>
    );
  }

  const { customers, isSampleData, csvFileName, pdfFileName, analysedAt, rules, pdfPageCount, pdfParseFailed } =
    result;

  const summaries = categorySummaries(customers);
  const totalExp = totalExposure(customers);
  const top10 = topRiskCustomers(customers, 10);
  const industryData = exposureByIndustry(customers);
  const avgScore = averageRiskScore(customers);
  const trend = generatePortfolioTrend(avgScore);
  const actions = recommendedActions(customers);

  const barData = summaries.map((s) => ({
    category: s.category,
    Customers: s.count,
    Exposure: s.exposure,
  }));

  const dateLabel = analysedAt.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  const timeLabel = analysedAt.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold">Executive Dashboard</h1>
        {isSampleData && (
          <span
            className="rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white"
            style={{ backgroundColor: "var(--accent)" }}
          >
            Sample Data
          </span>
        )}
      </div>
      <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
        {customers.length} customers · {csvFileName} · {pdfFileName ?? "no policy uploaded"} · analysed{" "}
        {dateLabel}, {timeLabel}
      </p>

      {/* KPI cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {summaries.map((s) => (
          <div key={s.category} className="rounded-xl border bg-[var(--surface)] p-5 shadow-sm" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLOURS[s.category] }} />
              <span className="text-sm font-medium">{s.category}</span>
            </div>
            <p className="mt-2 text-3xl font-semibold">{s.count}</p>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              {s.pctOfCustomers.toFixed(1)}% of customers · {formatCompactCurrency(s.exposure)} exposure (
              {s.pctOfExposure.toFixed(1)}%)
            </p>
          </div>
        ))}
      </div>

      {/* Total exposure */}
      <div className="mt-4 rounded-xl border bg-[var(--surface)] p-5 shadow-sm" style={{ borderColor: "var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Total portfolio exposure
        </p>
        <p className="mt-1 text-3xl font-semibold">{formatFullCurrency(totalExp)}</p>
      </div>

      {/* Chart row */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-[var(--surface)] p-5 shadow-sm" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-sm font-semibold">Customers & Exposure by Risk Category</h3>
          <CustomBarLegend />
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v: number) => formatCompactCurrency(v)}
                />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) =>
                    name === "Exposure" ? [formatFullCurrency(Number(value)), name] : [value, name]
                  }
                />
                <Bar yAxisId="left" dataKey="Customers" radius={[4, 4, 0, 0]}>
                  {barData.map((entry) => (
                    <Cell key={entry.category} fill={CATEGORY_COLOURS[entry.category as RiskCategory]} />
                  ))}
                </Bar>
                <Bar yAxisId="right" dataKey="Exposure" fill={EXPOSURE_COLOUR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-[var(--surface)] p-5 shadow-sm" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-sm font-semibold">Exposure by Industry Sector</h3>
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
                  label={(entry: any) => entry.name ?? entry.industry}
                >
                  {industryData.map((entry, i) => (
                    <Cell key={entry.industry} fill={INDUSTRY_PALETTE[i % INDUSTRY_PALETTE.length]} />
                  ))}
                </Pie>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Tooltip formatter={(value: any) => formatFullCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Trend chart */}
      <div className="mt-4 rounded-xl border bg-[var(--surface)] p-5 shadow-sm" style={{ borderColor: "var(--border)" }}>
        <h3 className="text-sm font-semibold">Portfolio Risk Trend</h3>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Illustrative trend leading up to current position
        </p>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip formatter={(value: any) => Number(value).toFixed(1)} />
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

      {/* Top 10 table */}
      <div className="mt-4 rounded-xl border bg-[var(--surface)] p-5 shadow-sm" style={{ borderColor: "var(--border)" }}>
        <h3 className="text-sm font-semibold">Top 10 Highest-Risk Customers</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
                <th className="py-2 pr-3 font-medium">Customer</th>
                <th className="py-2 pr-3 font-medium">Industry</th>
                <th className="py-2 pr-3 font-medium">Credit Score</th>
                <th className="py-2 pr-3 font-medium">Repayment Status</th>
                <th className="py-2 pr-3 font-medium">Loan Balance</th>
                <th className="py-2 pr-3 font-medium">Risk Score</th>
                <th className="py-2 pr-3 font-medium">Category</th>
              </tr>
            </thead>
            <tbody>
              {top10.map((c) => (
                <tr key={c.customerId} className="border-b" style={{ borderColor: "var(--border)" }}>
                  <td className="py-2 pr-3">{c.customerName}</td>
                  <td className="py-2 pr-3">{c.industrySector}</td>
                  <td className="py-2 pr-3">{c.creditScore}</td>
                  <td className="py-2 pr-3">{c.repaymentStatus}</td>
                  <td className="py-2 pr-3">{formatFullCurrency(c.loanBalance)}</td>
                  <td className="py-2 pr-3">{c.riskScore.toFixed(1)}</td>
                  <td className="py-2 pr-3">
                    <RiskBadge category={c.category} compact />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom row */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-[var(--surface)] p-5 shadow-sm" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-sm font-semibold">Recommended Actions</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {actions.map((action, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border bg-[var(--surface)] p-5 shadow-sm" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-sm font-semibold">Scoring Methodology</h3>
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            Risk Score = (Credit Risk Weight × Credit Score Factor) + (Repayment Risk Weight × Repayment
            Status Factor) + (Exposure Weight × Loan Balance Factor)
          </p>
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            Green 0–{RISK_THRESHOLDS.greenMax} · Amber {RISK_THRESHOLDS.greenMax + 1}–{RISK_THRESHOLDS.amberMax} ·
            Red {RISK_THRESHOLDS.amberMax + 1}–100
          </p>

          <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--border)" }}>
            <h4 className="text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>
              Extracted Policy Highlights
            </h4>
            {!pdfFileName && (
              <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                No policy PDF was uploaded, so no rules were extracted for this analysis.
              </p>
            )}
            {pdfFileName && pdfParseFailed && (
              <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                Could not extract text from {pdfFileName}.
              </p>
            )}
            {pdfFileName && !pdfParseFailed && (
              <>
                <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                  Heuristic extraction from {pdfFileName} — {pdfPageCount ?? 0} page(s) scanned.
                </p>
                {rules.length === 0 ? (
                  <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                    No policy rules were identified in this document.
                  </p>
                ) : (
                  <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1 text-sm">
                    {rules.map((rule, i) => (
                      <li
                        key={i}
                        className="border-l-2 pl-3"
                        style={{ borderColor: "var(--accent)" }}
                      >
                        {rule.text}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
