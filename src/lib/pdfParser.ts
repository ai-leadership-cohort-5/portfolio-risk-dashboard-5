import type { ExtractedRule, PdfParseResult } from "./types";

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

function polyfillPromiseWithResolvers() {
  if (typeof Promise.withResolvers === "undefined") {
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

function extractRules(rawText: string): ExtractedRule[] {
  const normalised = rawText.replace(/\s+/g, " ").trim();
  const statements = normalised
    .split(/(?:\. |; )/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 15 && s.length <= 320);

  const rules: ExtractedRule[] = [];
  for (const statement of statements) {
    const lower = statement.toLowerCase();
    if (RULE_KEYWORDS.some((kw) => lower.includes(kw))) {
      rules.push({ text: statement });
      if (rules.length >= MAX_RULES) break;
    }
  }

  return rules;
}

export async function parsePdf(file: File): Promise<PdfParseResult> {
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
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ");
    rawText += `${pageText} `;
  }

  const rules = extractRules(rawText);

  return { rawText, rules, pageCount: pdf.numPages };
}
