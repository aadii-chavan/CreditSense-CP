# CreditSense — Mamdani fuzzy credit assessment

A Mamdani fuzzy inference system for micro-loan credit scoring, with a React
frontend and (next) a Python FastAPI backend.

Current state: **frontend and backend both complete.**

```
frontend/          React + TypeScript + Vite
  src/types/        the API contract both sides implement
  src/api/client.ts the only door to the backend
  src/pages/        Dashboard · Assess · Records · Rule base
  src/mocks/        dev stand-ins, kept as an oracle for the backend
backend/           FastAPI + Pydantic — see backend/README.md
  app/fuzzy/        the Mamdani engine
  app/api/routes.py the five endpoints
```

## Running

Two processes. Backend first:

```bash
conda activate creditsense          # see backend/README.md for env setup
cd backend
uvicorn app.main:app --reload --port 8000
```

Then the frontend:

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

`frontend/.env` controls where data comes from:

| `VITE_USE_MOCK` | Behaviour |
| --------------- | --------- |
| `false` (default) | requests are proxied to FastAPI |
| `true`            | requests are answered in-browser by the dev mocks — no backend needed |

`VITE_API_TARGET` overrides the proxy target if the backend is not on
`http://127.0.0.1:8000`.

### The mocks are an oracle, not dead code

The backend's record store reproduces the frontend mock's seeded dataset bit for
bit — same 64 records, same scores, tiers, statuses and timestamps. Flipping
`VITE_USE_MOCK` changes nothing on screen, which makes the two implementations
directly diffable.

## Pages

| Route | Page | What it does |
| --- | --- | --- |
| `/` | Dashboard | Portfolio stats, score histogram, recent scores (filterable by tier), and a worked "how a score is reached" panel showing the real aggregated output curve for one applicant. |
| `/assess` | Assess | Three antecedent sliders; every change posts to `/score` and renders the memberships, fired rules, output curve and centroid. |
| `/records` | Records | The assessment log — tier / period / status / engine-version filters, search and pagination, all served by the API. |
| `/rules` | Rule base | Membership functions with editable peaks, the rule matrix on switchable axes, the rule list with consequent and active-flag editing, and a dry run that replays stored records through the staged base. |

## Architecture

No component computes fuzzy logic and no component imports a mock. Every page
goes through `src/api/client.ts`; memberships, fired rules, output curves and
centroids all arrive from the engine. Switching from the mocks to Python is one
environment variable.

Requests are debounced and in-flight requests are aborted, so a late reply can
never overwrite a newer one. The last good response stays on screen, dimmed,
while the next is fetched; failures show a retry rather than invented numbers.

## API contract

`src/types/*.ts` is the authoritative version of all of this; the Pydantic
models must mirror it field-for-field.

### `POST /api/score`

```jsonc
// request
{
  "income": 26000,            // ₹ per month, 0–60000
  "repaymentHistory": 78,     // % of instalments paid on time, 0–100
  "dti": 34,                  // debt-to-income ratio %, 0–100
  "applicant": { "name": "…", "location": "…", "purpose": "…", "amountRequested": 45000 }
}

// response
{
  "score": 75.5,
  "tier": "low_risk",              // high_risk | moderate | low_risk
  "tierLabel": "Low risk",
  "memberships": {
    "income":           [{ "set": "low", "label": "Low", "mu": 0.0 }, …],
    "repaymentHistory": [{ "set": "weak", "label": "Weak", "mu": 0.0 }, …],
    "dti":              [{ "set": "low", "label": "Low", "mu": 0.0 }, …]
  },
  "firedRules": [
    { "id": "R-04", "text": "income moderate AND repayment strong → high", "mu": 0.87, "consequent": "high" }
  ],
  "firedCount": 3,
  "ruleCount": 27,
  "aggregated": { "domain": [0, 100], "x": [0, 1, …, 100], "mu": [0.0, …] },
  "centroid": 75.5,
  "engine": { "implication": "min", "aggregation": "max", "defuzzification": "centroid", "version": "1.2" }
}
```

### `GET /api/dashboard`

Portfolio stats (scored totals, mean score with trend, weekly counts, grey-band
count), the score histogram with tier shares, the most recent records, and an
`explainer` pairing one record with its full `ScoreResponse`. See
`src/types/dashboard.ts`.

### `GET /api/records`

Query: `tier`, `period` (`7d` | `30d` | `quarter` | `all`), `status`,
`engineVersion`, `search`, `page`, `pageSize`. Returns the page of rows plus
`filtered` / `total` / `pageCount` and a summary block. See
`src/types/records.ts`.

### `GET /api/rules`

The linguistic variables with their triangular sets, the rule base (antecedent
clauses, consequent, weight, active flag, firing rate), the rule-space size and
the version history. See `src/types/rules.ts`.

### `POST /api/rules/dry-run`

Takes a list of staged edits (`peak`, `consequent`, `active`), replays the
stored records through the staged base and returns records affected, mean
shift, tier changes and the two distributions. Nothing is persisted.

All five are implemented in `backend/app/api/routes.py`, with interactive docs
at <http://127.0.0.1:8000/docs>.

### Not yet specced

`Commit score` on Assess and `Publish` on Rule base are deliberately inert —
they need `POST /api/assessments` and `POST /api/rules/publish`, which we
haven't designed. Both buttons are disabled until there is something to send.

## Engine spec for the Python side

Triangular membership functions `(a, b, c)`, min implication, max aggregation,
centroid defuzzification sampled at 101 points over `[0, 100]`.

| Variable | Sets |
| --- | --- |
| Income (₹ thousands) | low `(-1, 0, 20)` · moderate `(12, 28, 45)` · high `(35, 60, 61)` |
| Repayment history (%) | weak `(-1, 0, 45)` · fair `(30, 55, 80)` · strong `(65, 100, 101)` |
| DTI (%) | low `(-1, 0, 30)` · medium `(20, 45, 70)` · high `(55, 100, 101)` |
| Creditworthiness (output) | low `(-1, 0, 45)` · moderate `(25, 50, 75)` · high `(55, 100, 101)` |

Tier bands: `< 45` high risk, `45–65` moderate, `≥ 65` low risk.
Rules fire above ε = 0.01. Firing strength is `weight × min(antecedent degrees)`.

### The rule base

Ten rules over a 27-combination antecedent space. R-22 and R-25 have a single
clause each, so they deliberately cover a whole slice of that space — which is
why one rule repeats across a row of the matrix.

| Rule | Antecedent | Consequent |
| --- | --- | --- |
| R-01 | income high ∧ repayment strong | high |
| R-04 | income moderate ∧ repayment strong | high |
| R-07 | DTI low ∧ repayment strong | high |
| R-09 | income high ∧ repayment fair | moderate |
| R-12 | income moderate ∧ repayment fair | moderate |
| R-15 | DTI medium ∧ repayment fair | moderate |
| R-18 | income low ∧ repayment strong | moderate |
| R-19 | income low ∧ repayment fair | low |
| R-22 | DTI high | low |
| R-25 | repayment weak | low |

### Acceptance table

Reference values the Python engine must reproduce, verified against both the
design prototype and the mock:

| Income | Repayment | DTI | Score | Fired |
| --- | --- | --- | --- | --- |
| ₹26,000 | 78% | 34% | 75.5 | 3 |
| ₹55,000 | 95% | 10% | 84.8 | 2 |
| ₹8,000  | 20% | 80% | 16.8 | 2 |
| ₹0      | 0%  | 100% | 14.7 | 2 |
| ₹60,000 | 100% | 0% | 85.3 | 2 |
| ₹30,000 | 50% | 50% | 50.0 | 2 |

The engine's reachable range is roughly 14.7–85.3; it never returns 0 or 100,
because the centroid of a clipped triangle cannot sit at the universe's edge.
