# Portfolio Risk Dashboard (Prototype)

An internal prototype that turns a lending policy PDF and a customer portfolio
CSV into an executive risk dashboard — entirely client-side, no backend.

## What it does

1. **Upload** (`/`) — upload a lending policy PDF (optional) and a customer
   portfolio CSV (required), or click **Load Sample Data** to try it with
   bundled sample files.
2. **Run Analysis** parses the CSV, scores every customer with a weighted
   risk formula, and heuristically extracts key policy rules from the PDF
   (keyword matching — no external AI calls).
3. **Executive Dashboard** (`/dashboard`) shows customers and exposure by
   risk category, total portfolio exposure, exposure by industry, a
   portfolio risk trend, the top 10 highest-risk customers, recommended
   actions, and the scoring methodology.

All processing happens in the browser. No files are uploaded to a server, no
data is persisted, and there is no authentication — this is a prototype for
internal review only.

## Running locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel

1. Push this repository to GitHub (already done for this project).
2. In Vercel: **Import Project** → select this GitHub repo → accept the
   default Next.js build settings → Deploy. No environment variables are
   required.
3. Vercel auto-deploys on every push to `main`.

## Changing scoring weights or thresholds

Edit **`src/lib/riskScoring.ts`** — it's the single file that controls:

- `DEFAULT_WEIGHTS` (credit risk / repayment risk / exposure weights)
- `CREDIT_SCORE_MIN` / `CREDIT_SCORE_MAX`
- `EXPOSURE_CAP`
- the repayment-status lookup table
- `RISK_THRESHOLDS` (Green / Amber / Red cut-offs)

The Upload page and dashboard read these constants directly, so any change
here is reflected everywhere automatically.

## Tech stack

Next.js (App Router, TypeScript), Tailwind CSS, Recharts, PapaParse, and
pdfjs-dist. No backend, no database, no authentication.
