# CreditSense — Mamdani fuzzy credit assessment

A Mamdani fuzzy inference system for micro-loan credit scoring, with a React
frontend and (next) a Python FastAPI backend.

Current state: **frontend complete, backend not yet written.**

```
frontend/          React + TypeScript + Vite  ← done
  src/types/score.ts     the API contract both sides implement
  src/api/client.ts      the only door to the engine
  src/mocks/scoreMock.ts DEV-ONLY stand-in — delete when the backend lands
backend/           FastAPI + Pydantic         ← to be built
```

## Running the frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

`frontend/.env` controls where scores come from:

| `VITE_USE_MOCK` | Behaviour |
| --------------- | --------- |
| `true` (default) | `POST /api/score` is answered in-browser by the dev mock |
| `false`          | requests are proxied to FastAPI on `http://127.0.0.1:8000` |

## Architecture

No component computes fuzzy logic. Every recompute goes through
`postScore()` in `src/api/client.ts`, which issues `POST /api/score` and
renders the reply — memberships, fired rules, the aggregated output curve and
the centroid all arrive from the engine. Switching from the mock to Python is
a single environment variable; no component changes.

Slider drags are debounced (120 ms) and in-flight requests are aborted, so a
late reply can never overwrite a newer one. The last good score stays on
screen, dimmed, while the next is fetched.

## The API contract

`POST /api/score`

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
    { "id": "R2", "text": "income moderate AND repayment strong → high", "mu": 0.87, "consequent": "high" }
  ],
  "firedCount": 3,
  "ruleCount": 27,
  "aggregated": { "domain": [0, 100], "x": [0, 1, …, 100], "mu": [0.0, …] },
  "centroid": 75.5,
  "engine": { "implication": "min", "aggregation": "max", "defuzzification": "centroid", "version": "1.2" }
}
```

`src/types/score.ts` is the authoritative version of this; the Pydantic models
must mirror it field-for-field.

### Engine spec for the Python side

Triangular membership functions `(a, b, c)`, min implication, max aggregation,
centroid defuzzification sampled at 101 points over `[0, 100]`.

| Variable | Sets |
| --- | --- |
| Income (₹ thousands) | low `(-1, 0, 20)` · moderate `(12, 28, 45)` · high `(35, 60, 61)` |
| Repayment history (%) | weak `(-1, 0, 45)` · fair `(30, 55, 80)` · strong `(65, 100, 101)` |
| DTI (%) | low `(-1, 0, 30)` · medium `(20, 45, 70)` · high `(55, 100, 101)` |
| Creditworthiness (output) | low `(-1, 0, 45)` · moderate `(25, 50, 75)` · high `(55, 100, 101)` |

Tier bands: `< 45` high risk, `45–65` moderate, `≥ 65` low risk.
Rules fire above ε = 0.01. Rule base: 10 defined of 27 possible combinations.

Reference values the Python engine must reproduce (verified against both the
design prototype and the mock):

| Income | Repayment | DTI | Score | Fired |
| --- | --- | --- | --- | --- |
| ₹26,000 | 78% | 34% | 75.5 | 3 |
| ₹55,000 | 95% | 10% | 84.8 | 2 |
| ₹8,000  | 20% | 80% | 16.8 | 2 |
| ₹0      | 0%  | 100% | 14.7 | 2 |
| ₹60,000 | 100% | 0% | 85.3 | 2 |
| ₹30,000 | 50% | 50% | 50.0 | 2 |
