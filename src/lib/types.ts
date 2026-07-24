export interface RiskWeights {
  creditRiskWeight: number;
  repaymentRiskWeight: number;
  exposureWeight: number;
}

export type RiskCategory = "Green" | "Amber" | "Red";

export interface RawCustomerRow {
  customerId: string;
  customerName: string;
  industrySector: string;
  creditScore: string;
  repaymentStatus: string;
  loanBalance: string;
}

export interface ScoredCustomer {
  customerId: string;
  customerName: string;
  industrySector: string;
  creditScore: number;
  repaymentStatus: string;
  loanBalance: number;
  creditScoreFactor: number;
  repaymentRiskFactor: number;
  exposureFactor: number;
  riskScore: number;
  category: RiskCategory;
}

export interface CsvParseResult {
  customers: RawCustomerRow[];
  rowsSkipped: number;
}

export interface ExtractedRule {
  text: string;
}

export interface PdfParseResult {
  rawText: string;
  rules: ExtractedRule[];
  pageCount: number;
}

export interface AnalysisResult {
  customers: ScoredCustomer[];
  rules: ExtractedRule[];
  weights: RiskWeights;
  csvFileName: string;
  pdfFileName: string | null;
  pdfPageCount: number | null;
  analysedAt: Date;
  isSampleData: boolean;
  pdfParseFailed: boolean;
  rowsSkipped: number;
}
