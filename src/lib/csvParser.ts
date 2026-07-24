import Papa from "papaparse";
import type { CsvParseResult, RawCustomerRow } from "./types";

type LogicalColumn = keyof RawCustomerRow;

const COLUMN_ALIASES: Record<LogicalColumn, string[]> = {
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

function matchColumns(headers: string[]): Partial<Record<LogicalColumn, string>> {
  const normalisedToOriginal = new Map<string, string>();
  for (const h of headers) {
    normalisedToOriginal.set(normaliseHeader(h), h);
  }

  const matched: Partial<Record<LogicalColumn, string>> = {};

  (Object.keys(COLUMN_ALIASES) as LogicalColumn[]).forEach((logical) => {
    const aliases = [logical.toLowerCase(), ...COLUMN_ALIASES[logical]];
    for (const alias of aliases) {
      const normalisedAlias = normaliseHeader(alias);
      if (normalisedToOriginal.has(normalisedAlias)) {
        matched[logical] = normalisedToOriginal.get(normalisedAlias)!;
        break;
      }
    }
  });

  return matched;
}

export function parseCsv(fileText: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(fileText, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = parsed.meta.fields ?? [];
  const columnMap = matchColumns(headers);

  const requiredColumns: LogicalColumn[] = [
    "customerId",
    "customerName",
    "industrySector",
    "creditScore",
    "repaymentStatus",
    "loanBalance",
  ];

  const missing = requiredColumns.filter((col) => !columnMap[col]);
  if (missing.length > 0) {
    throw new Error(
      `Could not find required column(s) in the CSV: ${missing
        .map((m) => m)
        .join(", ")}. Expected columns like CustomerID, CustomerName, Industry, CreditScore, RepaymentStatus, LoanBalance (column names are matched flexibly).`
    );
  }

  const customers: RawCustomerRow[] = [];
  let rowsSkipped = 0;

  for (const row of parsed.data) {
    const customerId = (row[columnMap.customerId!] ?? "").trim();
    const customerName = (row[columnMap.customerName!] ?? "").trim();
    const industrySector = (row[columnMap.industrySector!] ?? "").trim();
    const creditScoreRaw = (row[columnMap.creditScore!] ?? "").trim();
    const repaymentStatus = (row[columnMap.repaymentStatus!] ?? "").trim();
    const loanBalanceRaw = (row[columnMap.loanBalance!] ?? "").trim().replace(/[$,]/g, "");

    const creditScoreNum = Number(creditScoreRaw);
    const loanBalanceNum = Number(loanBalanceRaw);

    if (!customerId || Number.isNaN(creditScoreNum) || Number.isNaN(loanBalanceNum)) {
      rowsSkipped += 1;
      continue;
    }

    customers.push({
      customerId,
      customerName: customerName || customerId,
      industrySector: industrySector || "Unclassified",
      creditScore: creditScoreRaw,
      repaymentStatus: repaymentStatus || "Unknown",
      loanBalance: loanBalanceRaw,
    });
  }

  return { customers, rowsSkipped };
}
