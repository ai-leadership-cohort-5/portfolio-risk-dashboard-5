// Shared type definitions for the Portfolio Risk Dashboard prototype.

export type RiskCategory = "Green" | "Amber" | "Red";

export interface RiskWeights {
  creditRiskWeight: number;
  repaymentRiskWeight: number;
  exposureWeight: number;
}

export interface RawCustomerRow {
  customerId: string;
  customerName: string;
  industrySector: string;
  creditScore: number;
  repaymentStatus: string;
  loanBalance: number;
}

export interface ScoredCustomer extends RawCustomerRow {
  creditScoreFactor: number;
  repaymentRiskFactor: number;
  exposureFactor: number;
  riskScore: number;
  category: RiskCategory;
}

export interface ExtractedRule {
  text: string;
}

export interface PdfParseResult {
  rawText: string;
  rules: ExtractedRule[];
  pageCount: number;
}

export interface CsvParseResult {
  customers: RawCustomerRow[];
  rowsSkipped: number;
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
  migration: MigrationResult;
}

export interface TrendPoint {
  label: string;
  averageRiskScore: number;
}

// ---------------------------------------------------------------------------
// Snapshot history — a lightweight record of each analysis run, persisted to
// localStorage so risk migration and customer-level trends are computed from
// real prior data rather than simulated. See src/lib/storage.ts.
// ---------------------------------------------------------------------------

export interface SnapshotCustomer {
  customerId: string;
  customerName: string;
  industrySector: string;
  creditScore: number;
  repaymentStatus: string;
  loanBalance: number;
  riskScore: number;
  category: RiskCategory;
}

export interface PortfolioSnapshot {
  analysedAt: string; // ISO string
  csvFileName: string;
  customers: SnapshotCustomer[];
}

export interface MigrationTransition {
  from: RiskCategory;
  to: RiskCategory;
  count: number;
  customers: SnapshotCustomer[];
}

export interface MigrationResult {
  hasPrevious: boolean;
  previousAnalysedAt: string | null;
  transitions: MigrationTransition[];
  newCustomers: SnapshotCustomer[];
  droppedCustomerIds: string[];
  deterioratedCount: number;
  improvedCount: number;
  stableCount: number;
}

// ---------------------------------------------------------------------------
// Policy breach detection
// ---------------------------------------------------------------------------

export type BreachSeverity = "breach" | "warning" | "info";

export interface PolicyBreach {
  id: string;
  severity: BreachSeverity;
  title: string;
  detail: string;
  ruleText: string;
  metricLabel: string;
  metricValue: string;
  affectedCustomerIds: string[];
}

// ---------------------------------------------------------------------------
// Intervention worklist — persisted to localStorage as an auditable record of
// what action was taken on each flagged customer, by whom, and when.
// ---------------------------------------------------------------------------

export type WorklistStatus = "Open" | "In Progress" | "Resolved";

export interface WorklistNote {
  date: string; // ISO string
  text: string;
}

export interface WorklistItem {
  customerId: string;
  customerName: string;
  industrySector: string;
  category: RiskCategory;
  riskScore: number;
  loanBalance: number;
  assignedTo: string;
  dueDate: string; // yyyy-mm-dd
  status: WorklistStatus;
  notes: WorklistNote[];
  createdAt: string; // ISO string
}

// ---------------------------------------------------------------------------
// Scenario / stress testing
// ---------------------------------------------------------------------------

export interface ScenarioInput {
  industrySector: string | "All";
  creditScoreDelta: number;
  worsenRepayment: boolean;
}

export interface ScenarioResult {
  input: ScenarioInput;
  baselineRedCount: number;
  baselineRedExposure: number;
  baselineTotalExposure: number;
  scenarioRedCount: number;
  scenarioRedExposure: number;
  scenarioTotalExposure: number;
  scenarioCustomers: ScoredCustomer[];
}
