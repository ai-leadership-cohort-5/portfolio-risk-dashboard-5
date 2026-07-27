// Client-side PDF text extraction and keyword-based rule surfacing.
// No LLM/API calls — pure heuristics, per DESIGN_SPEC §8. PDF parsing is
// optional and best-effort: callers must catch failures and never let them
// block CSV analysis.

import type { ExtractedRule, PdfParseResult } from "./types";

// pdfjs-dist v6 requires Promise.withResolvers, which is undefined on
// browsers older than Safari 17.4 / Chrome 119 / Firefox 121. Polyfill
// defensively before importing/using pdfjs-dist.
function polyfillPromiseWithResolvers() {
  if (typeof Promise.withResolvers !== "function") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Promise as any).withResolvers = function withResolvers<T>() {
      let resolve!: (value: T | PromiseLike<T>) => void;
      let reject!: (reason?: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }
}

const RULE_KEYWORDS = [
  "credit score",
  "debt-to-income",
  "debt to income",
  "dti",
  "loan-to-value",
  "loan to value",
  "ltv",
  "delinquen",
  "default",
  "past due",
  "arrears",
  "watchlist",
  "covenant",
  "exposure limit",
  "concentration limit",
  "threshold",
  "risk rating",
  "risk grade",
  "write-off",
  "write off",
  "provisioning",
  "collateral",
  "minimum",
  "maximum",
];

const MAX_RULES = 25;

function splitIntoStatements(text: string): string[] {
  const normalised = text.replace(/\s+/g, " ").trim();
  const parts = normalised.split(/(?:\. |; )/);
  return parts
    .map((p) => p.trim())
    .filter((p) => p.length >= 15 && p.length <= 320);
}

function isRuleStatement(statement: string): boolean {
  const lower = statement.toLowerCase();
  return RULE_KEYWORDS.some((kw) => lower.includes(kw));
}

export async function parseLendingPolicyPdf(file: File): Promise<PdfParseResult> {
  polyfillPromiseWithResolvers();

  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let rawText = "";
  const pageCount = pdf.numPages;

  for (let pageNum = 1; pageNum <= pageCount; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    rawText += pageText + " ";
  }

  const statements = splitIntoStatements(rawText);
  const rules: ExtractedRule[] = statements
    .filter(isRuleStatement)
    .slice(0, MAX_RULES)
    .map((text) => ({ text }));

  return { rawText, rules, pageCount };
}
