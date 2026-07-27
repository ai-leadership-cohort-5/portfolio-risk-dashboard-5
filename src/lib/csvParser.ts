// Client-side CSV parsing for customer portfolio uploads.
// Column matching is flexible (case-insensitive, whitespace-normalised)
// against a set of accepted aliases per logical column.

import Papa from "papaparse";
import type { CsvParseResult, RawCustomerRow } from "./types";

const COLUMN_ALIASES: Record<keyof RawCustomerRow, string[]> = {
  customerId: ["customer_id", "customerid", "id", "account_id", "account number", "customer id"],
  customerName: ["customer_name", "customername", "name", "client name", "customer"],
  industrySector: ["industry_sector", "industry", "sector", "industry sector"],
  creditScore: ["credit_score", "creditscore", "credit score", "score", "bureau_score"],
  repaymentStatus: [
    "repayment_status",
    "repaymentstatus",
    "repayment status",
    "status",
    "arrears_status",
    "delinquency_status",
  ],
  loanBalance: ["loan_balance", "loanbalance", "loan balance", "balance", "exposure", "outstanding_balance"],
};

function normaliseHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildColumnMap(headers: string[]): Partial<Record<keyof RawCustomerRow, string>> {
  const normalisedHeaders = headers.map((h) => ({ raw: h, norm: normaliseHeader(h) }));
  const map: Partial<Record<keyof RawCustomerRow, string>> = {};

  (Object.keys(COLUMN_ALIASES) as Array<keyof RawCustomerRow>).forEach((key) => {
    const aliases = COLUMN_ALIASES[key].map(normaliseHeader);
    const found = normalisedHeaders.find((h) => aliases.includes(h.norm));
    if (found) map[key] = found.raw;
  });

  return map;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export async function parseCustomerCsv(file: File): Promise<CsvParseResult> {
  const text = await file.text();

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = parsed.meta.fields ?? [];
  const columnMap = buildColumnMap(headers);

  const missing = (Object.keys(COLUMN_ALIASES) as Array<keyof RawCustomerRow>).filter(
    (key) => !columnMap[key]
  );

  if (missing.length > 0) {
    throw new Error(
      `The CSV is missing required column(s): ${missing.join(", ")}. Expected columns: ` +
        `CustomerID, CustomerName, Industry, CreditScore, RepaymentStatus, LoanBalance ` +
        `(column names are matched flexibly).`
    );
  }

  let rowsSkipped = 0;
  const customers: RawCustomerRow[] = [];

  for (const row of parsed.data) {
    const customerId = String(row[columnMap.customerId!] ?? "").trim();
    const customerName = String(row[columnMap.customerName!] ?? "").trim();
    const industrySector = String(row[columnMap.industrySector!] ?? "").trim() || "Unclassified";
    const repaymentStatus = String(row[columnMap.repaymentStatus!] ?? "").trim();
    const creditScore = parseNumber(row[columnMap.creditScore!]);
    const loanBalance = parseNumber(row[columnMap.loanBalance!]);

    if (!customerId || creditScore === null || loanBalance === null) {
      rowsSkipped += 1;
      continue;
    }

    customers.push({
      customerId,
      customerName: customerName || customerId,
      industrySector,
      creditScore,
      repaymentStatus: repaymentStatus || "Unknown",
      loanBalance,
    });
  }

  return { customers, rowsSkipped };
}
