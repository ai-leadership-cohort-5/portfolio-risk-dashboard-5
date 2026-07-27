"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import UploadPanel from "@/components/UploadPanel";
import { useAnalysis } from "@/context/AnalysisContext";
import { parseCustomerCsv } from "@/lib/csvParser";
import { parseLendingPolicyPdf } from "@/lib/pdfParser";
import {
  DEFAULT_WEIGHTS,
  EXPOSURE_CAP,
  RISK_THRESHOLDS,
} from "@/lib/riskScoring";
import { scoreCustomers } from "@/lib/riskScoring";
import type { AnalysisResult } from "@/lib/types";

export default function UploadPage() {
  const router = useRouter();
  const { setResult } = useAnalysis();

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isSampleSelected, setIsSampleSelected] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePdfChange(file: File | null) {
    setPdfFile(file);
    setIsSampleSelected(false);
  }

  function handleCsvChange(file: File | null) {
    setCsvFile(file);
    setIsSampleSelected(false);
  }

  async function handleLoadSampleData() {
    setIsLoadingSample(true);
    setError(null);
    try {
      const [csvResp, pdfResp] = await Promise.all([
        fetch("/sample-data/sample-customers.csv"),
        fetch("/sample-data/sample-lending-policy.pdf"),
      ]);

      const csvBlob = await csvResp.blob();
      const pdfBlob = await pdfResp.blob();

      const csv = new File([csvBlob], "sample-customers.csv", { type: "text/csv" });
      const pdf = new File([pdfBlob], "sample-lending-policy.pdf", { type: "application/pdf" });

      setCsvFile(csv);
      setPdfFile(pdf);
      setIsSampleSelected(true);
    } catch {
      setError("Could not load sample data. Please try again.");
    } finally {
      setIsLoadingSample(false);
    }
  }

  async function handleRunAnalysis() {
    if (!csvFile) return;
    setIsAnalysing(true);
    setError(null);

    try {
      const csvResult = await parseCustomerCsv(csvFile);
      const scored = scoreCustomers(csvResult.customers, DEFAULT_WEIGHTS);

      let rules: AnalysisResult["rules"] = [];
      let pdfPageCount: number | null = null;
      let pdfParseFailed = false;

      if (pdfFile) {
        try {
          const pdfResult = await parseLendingPolicyPdf(pdfFile);
          rules = pdfResult.rules;
          pdfPageCount = pdfResult.pageCount;
        } catch (pdfErr) {
          console.error("PDF parsing failed:", pdfErr);
          pdfParseFailed = true;
        }
      }

      const analysis: AnalysisResult = {
        customers: scored,
        rules,
        weights: DEFAULT_WEIGHTS,
        csvFileName: csvFile.name,
        pdfFileName: pdfFile ? pdfFile.name : null,
        pdfPageCount,
        analysedAt: new Date(),
        isSampleData: isSampleSelected,
        pdfParseFailed,
      };

      setResult(analysis);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong analysing the files.");
    } finally {
      setIsAnalysing(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold text-[var(--foreground)]">Portfolio Risk Analysis</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Upload your lending policy document and customer portfolio to generate an executive
        risk dashboard. All processing happens in your browser — no files are sent to a server.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <UploadPanel
          title="1. Lending Policy & Risk Guidance (PDF)"
          subtext="Used to surface key policy rules and thresholds referenced on the dashboard. Optional, but recommended."
          accept="application/pdf"
          file={pdfFile}
          onChange={handlePdfChange}
        />
        <UploadPanel
          title="2. Customer Portfolio (CSV)"
          subtext="Expected columns: CustomerID, CustomerName, Industry, CreditScore, RepaymentStatus, LoanBalance. Column names are matched flexibly."
          accept=".csv,text/csv"
          file={csvFile}
          onChange={handleCsvChange}
        />
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-[var(--risk-red)] bg-[var(--risk-red-bg)] p-3 text-sm text-[var(--risk-red)]">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleRunAnalysis}
          disabled={!csvFile || isAnalysing}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAnalysing ? "Analysing…" : "Run Analysis"}
        </button>
        <button
          type="button"
          onClick={handleLoadSampleData}
          disabled={isLoadingSample}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoadingSample ? "Loading…" : "Load Sample Data"}
        </button>
      </div>

      <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">How risk is scored</h2>
        <p className="mt-2 text-sm text-[var(--foreground)]">
          Risk Score = ({Math.round(DEFAULT_WEIGHTS.creditRiskWeight * 100)}% × Credit Score
          Factor) + ({Math.round(DEFAULT_WEIGHTS.repaymentRiskWeight * 100)}% × Repayment Status
          Factor) + ({Math.round(DEFAULT_WEIGHTS.exposureWeight * 100)}% × Loan Balance Factor,
          capped at ${EXPOSURE_CAP.toLocaleString()})
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Customers are categorised Green (0–{RISK_THRESHOLDS.greenMax}), Amber (
          {RISK_THRESHOLDS.greenMax + 1}–{RISK_THRESHOLDS.amberMax}), or Red (
          {RISK_THRESHOLDS.amberMax + 1}–100).
        </p>
        <p className="mt-2 text-xs text-[var(--muted)]">
          To change weights or thresholds, edit <code className="rounded bg-[var(--background)] px-1 py-0.5">src/lib/riskScoring.ts</code>.
        </p>
      </div>
    </div>
  );
}
