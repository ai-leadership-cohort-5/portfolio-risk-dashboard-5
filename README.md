# Portfolio Risk Dashboard

A client-side prototype that turns a lending policy PDF and a customer portfolio CSV into an
executive risk dashboard — customer risk scoring, Green/Amber/Red categorisation, exposure
breakdowns, a top-10 highest-risk table, and recommended actions.

Everything runs in the browser. There is no backend, no database, no authentication, and no
data is ever sent to a server — the PDF and CSV are parsed client-side with `pdfjs-dist` and
`papaparse`, and results live only in memory for the current session.

## Running locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000). Click **Load Sample Data** on the
Upload page to try it instantly with the bundled sample files, or upload your own CSV
(optionally with a policy PDF) and click **Run Analysis**.

## Deploying to Vercel

1. Push this repository to GitHub (already done if you're reading this from the deployed repo).
2. In Vercel: **Import Project** → select this GitHub repo → accept the defaults (framework is
   auto-detected as Next.js via `vercel.json`).
3. No environment variables are required — the app is entirely client-side.

## Changing scoring thresholds

All scoring logic — the weight given to credit score, repayment status, and exposure, plus the
Green/Amber/Red thresholds — lives in a single file:

```
src/lib/riskScoring.ts
```

Edit `DEFAULT_WEIGHTS` (must sum to 1) or `RISK_THRESHOLDS` there to change how customers are
scored and categorised. No other file needs to change.

## How scoring works

```
Risk Score = (Credit Risk Weight × Credit Score Factor)
           + (Repayment Risk Weight × Repayment Status Factor)
           + (Exposure Weight × Loan Balance Factor)
```

- **Credit Score Factor** — lower credit scores produce a higher risk factor (300–850 band).
- **Repayment Status Factor** — a lookup table from free-text status (e.g. "Current", "30 Days
  Late", "Default") to a 0–100 risk value.
- **Exposure Factor** — loan balance relative to a $500,000 cap.

Customers are categorised Green (0–35), Amber (36–65), or Red (66–100).

## Project structure

```
src/
  app/            Upload page ("/") and Executive Dashboard ("/dashboard")
  components/     NavBar, UploadPanel, RiskBadge
  context/        AnalysisContext (in-memory analysis state)
  lib/            riskScoring.ts, csvParser.ts, pdfParser.ts, aggregations.ts, types.ts
public/
  sample-data/    Bundled sample CSV + PDF used by "Load Sample Data"
```

## Scope

This is a prototype for internal review. No real customer data, no authentication, and no
persisted storage anywhere in the application.
