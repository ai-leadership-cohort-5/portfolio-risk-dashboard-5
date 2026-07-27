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
3. **Executive Dashboard** (`/dashboard`) shows, in order: recommended
   actions (auto-generated from this period's risk migration and policy
   breaches), customers and exposure by risk category, total exposure,
   exposure by industry, a real Green/Amber/Red **risk migration matrix**
   comparing this analysis to the last one, **policy breach detection**
   (numeric thresholds parsed from the PDF and tested against the actual
   portfolio), the top 10 highest-risk customers with a rationale for each
   score, an **intervention worklist** (assignable owner, due date, status,
   action log), a **scenario/stress-testing** panel, and the scoring
   methodology.
4. Clicking any customer opens a **drill-down panel**: factor-level score
   breakdown, real historical score/exposure trend, and which policy rules
   they trigger.

All processing happens in the browser — no backend, no server-side database,
no authentication. Analysis snapshots and the intervention worklist are
saved to the browser's own `localStorage` (not sent anywhere) so risk
migration and the worklist audit trail persist across page reloads; this is
still a prototype for internal review only.

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
