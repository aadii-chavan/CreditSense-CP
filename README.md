<div align="center">

<br/>

# CreditSense

**A Mamdani fuzzy inference system for micro-loan credit scoring**

Three linguistic antecedents. Ten rules. One centroid.<br/>
Every number on screen comes from the engine — nothing is invented in the UI.

<br/>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10-3776AB?style=for-the-badge&logo=python&logoColor=white&labelColor=0D1117" alt="Python 3.10" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white&labelColor=0D1117" alt="FastAPI 0.115" />
  <img src="https://img.shields.io/badge/Pydantic-2.10-E92063?style=for-the-badge&logo=pydantic&logoColor=white&labelColor=0D1117" alt="Pydantic 2.10" />
  <img src="https://img.shields.io/badge/Pytest-8.3-0A9EDC?style=for-the-badge&logo=pytest&logoColor=white&labelColor=0D1117" alt="Pytest 8.3" />
  <br/>
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=white&labelColor=0D1117" alt="React 18.3" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white&labelColor=0D1117" alt="TypeScript 5.6" />
  <img src="https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white&labelColor=0D1117" alt="Vite 5.4" />
  <img src="https://img.shields.io/badge/Conda-Miniconda-44A833?style=for-the-badge&logo=anaconda&logoColor=white&labelColor=0D1117" alt="Miniconda" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-complete-2EA043?style=flat-square&labelColor=0D1117" alt="Status: complete" />
  <img src="https://img.shields.io/badge/engine-v1.2-7C3AED?style=flat-square&labelColor=0D1117" alt="Engine v1.2" />
  <img src="https://img.shields.io/badge/rule%20base-10%20rules%20%2F%2027%20combinations-2F81F7?style=flat-square&labelColor=0D1117" alt="10 rules over 27 combinations" />
  <img src="https://img.shields.io/badge/endpoints-5-8957E5?style=flat-square&labelColor=0D1117" alt="5 endpoints" />
  <img src="https://img.shields.io/badge/defuzzification-centroid-D29922?style=flat-square&labelColor=0D1117" alt="Centroid defuzzification" />
</p>

<br/>

</div>

---

## Overview

CreditSense scores micro-loan applicants with a **Mamdani fuzzy inference
system**. Three antecedents — monthly income, repayment history and
debt-to-income ratio — are fuzzified into triangular sets, run through a
ten-rule base with min implication and max aggregation, and defuzzified by
centroid into a creditworthiness score on `[0, 100]`.

What makes the project more than a calculator is that the **whole inference is
visible**. The interface does not just show a score; it shows the membership
degrees that produced it, which rules fired and at what strength, the
aggregated output curve, and where the centroid landed on it.

Frontend and backend are both complete.

---

## Project structure

```
frontend/                  React + TypeScript + Vite
  src/types/               the API contract both sides implement
  src/api/client.ts        the only door to the backend
  src/pages/               Dashboard · Assess · Records · Rule base
  src/mocks/               dev stand-ins, kept as an oracle for the backend

backend/                   FastAPI + Pydantic — see backend/README.md
  app/fuzzy/               the Mamdani engine
    membership.py          triangular membership functions
    variables.py           the linguistic variables and their sets
    rules.py               the rule base
    engine.py              fuzzify → implicate → aggregate → defuzzify
  app/api/routes.py        the five endpoints
  app/data/                seeded record store, reproducing the frontend mock
  tests/                   pytest — engine and API
```

---

## Getting started

Two processes. Backend first — Python is managed with **miniconda**:

```bash
conda create -n creditsense python=3.10 -y
conda activate creditsense

cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Interactive API docs land at <http://127.0.0.1:8000/docs>, and a health probe
at <http://127.0.0.1:8000/api/health>.

Then the frontend:

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

### Configuration

Copy `frontend/.env.example` to `frontend/.env`. It controls where data comes
from:

| `VITE_USE_MOCK` | Behaviour |
| :-------------- | :-------- |
| `false` *(default)* | requests are proxied to FastAPI |
| `true` | requests are answered in-browser by the dev mocks — no backend needed |

`VITE_API_TARGET` overrides the proxy target if the backend is not on
`http://127.0.0.1:8000`.

### Tests

```bash
conda activate creditsense
cd backend
pytest
```

### The mocks are an oracle, not dead code

The backend's record store reproduces the frontend mock's seeded dataset **bit
for bit** — same 64 records, same scores, tiers, statuses and timestamps.
Flipping `VITE_USE_MOCK` changes nothing on screen, which makes the two
implementations directly diffable.

---

## Pages

| Route | Page | What it does |
| :--- | :--- | :--- |
| `/` | **Dashboard** | Portfolio stats, score histogram, recent scores (filterable by tier), and a worked "how a score is reached" panel showing the real aggregated output curve for one applicant. |
| `/assess` | **Assess** | Three antecedent sliders; every change posts to `/score` and renders the memberships, fired rules, output curve and centroid. |
| `/records` | **Records** | The assessment log — tier / period / status / engine-version filters, search and pagination, all served by the API. |
| `/rules` | **Rule base** | Membership functions with editable peaks, the rule matrix on switchable axes, the rule list with consequent and active-flag editing, and a dry run that replays stored records through the staged base. |

---

## Architecture

No component computes fuzzy logic and no component imports a mock. Every page
goes through `src/api/client.ts`; memberships, fired rules, output curves and
centroids all arrive from the engine. Switching from the mocks to Python is one
environment variable.

Requests are debounced and in-flight requests are aborted, so a late reply can
never overwrite a newer one. The last good response stays on screen, dimmed,
while the next is fetched; failures show a retry rather than invented numbers.

---

## API contract

`src/types/*.ts` is the authoritative version of all of this; the Pydantic
models mirror it field-for-field. All five endpoints are implemented in
`backend/app/api/routes.py`.

<details open>
<summary><b><code>POST /api/score</code></b> &nbsp;— score one applicant</summary>

<br/>

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

</details>

<details>
<summary><b><code>GET /api/dashboard</code></b> &nbsp;— portfolio overview</summary>

<br/>

Portfolio stats (scored totals, mean score with trend, weekly counts, grey-band
count), the score histogram with tier shares, the most recent records, and an
`explainer` pairing one record with its full `ScoreResponse`.
See `src/types/dashboard.ts`.

</details>

<details>
<summary><b><code>GET /api/records</code></b> &nbsp;— the assessment log</summary>

<br/>

Query parameters: `tier`, `period` (`7d` | `30d` | `quarter` | `all`),
`status`, `engineVersion`, `search`, `page`, `pageSize`. Returns the page of
rows plus `filtered` / `total` / `pageCount` and a summary block.
See `src/types/records.ts`.

</details>

<details>
<summary><b><code>GET /api/rules</code></b> &nbsp;— variables and rule base</summary>

<br/>

The linguistic variables with their triangular sets, the rule base (antecedent
clauses, consequent, weight, active flag, firing rate), the rule-space size and
the version history. See `src/types/rules.ts`.

</details>

<details>
<summary><b><code>POST /api/rules/dry-run</code></b> &nbsp;— replay staged edits</summary>

<br/>

Takes a list of staged edits (`peak`, `consequent`, `active`), replays the
stored records through the staged base and returns records affected, mean
shift, tier changes and the two distributions. Nothing is persisted.

</details>

### Not yet specced

`Commit score` on Assess and `Publish` on Rule base are deliberately inert —
they need `POST /api/assessments` and `POST /api/rules/publish`, which have not
been designed. Both buttons are disabled until there is something to send.

---

## Engine specification

Triangular membership functions `(a, b, c)`, **min** implication, **max**
aggregation, **centroid** defuzzification sampled at 101 points over `[0, 100]`.

| Variable | Sets |
| :--- | :--- |
| **Income** (₹ thousands) | low `(-1, 0, 20)` · moderate `(12, 28, 45)` · high `(35, 60, 61)` |
| **Repayment history** (%) | weak `(-1, 0, 45)` · fair `(30, 55, 80)` · strong `(65, 100, 101)` |
| **DTI** (%) | low `(-1, 0, 30)` · medium `(20, 45, 70)` · high `(55, 100, 101)` |
| **Creditworthiness** *(output)* | low `(-1, 0, 45)` · moderate `(25, 50, 75)` · high `(55, 100, 101)` |

Tier bands are `< 45` high risk, `45–65` moderate, `≥ 65` low risk. Rules fire
above ε = 0.01, and firing strength is `weight × min(antecedent degrees)`.

### The rule base

Ten rules over a 27-combination antecedent space. `R-22` and `R-25` have a
single clause each, so they deliberately cover a whole slice of that space —
which is why one rule repeats across a row of the matrix.

| Rule | Antecedent | Consequent |
| :--- | :--- | :--- |
| `R-01` | income high ∧ repayment strong | High |
| `R-04` | income moderate ∧ repayment strong | High |
| `R-07` | DTI low ∧ repayment strong | High |
| `R-09` | income high ∧ repayment fair | Moderate |
| `R-12` | income moderate ∧ repayment fair | Moderate |
| `R-15` | DTI medium ∧ repayment fair | Moderate |
| `R-18` | income low ∧ repayment strong | Moderate |
| `R-19` | income low ∧ repayment fair | Low |
| `R-22` | DTI high | Low |
| `R-25` | repayment weak | Low |

### Acceptance table

Reference values the Python engine reproduces, verified against both the design
prototype and the mock:

| Income | Repayment | DTI | Score | Fired |
| ---: | ---: | ---: | ---: | ---: |
| ₹26,000 | 78% | 34% | **75.5** | 3 |
| ₹55,000 | 95% | 10% | **84.8** | 2 |
| ₹8,000 | 20% | 80% | **16.8** | 2 |
| ₹0 | 0% | 100% | **14.7** | 2 |
| ₹60,000 | 100% | 0% | **85.3** | 2 |
| ₹30,000 | 50% | 50% | **50.0** | 2 |

The engine's reachable range is roughly **14.7–85.3**; it never returns 0 or
100, because the centroid of a clipped triangle cannot sit at the universe's
edge.

---

<div align="center">

<br/>

### Author

<br/>

[![aadii-chavan](https://img.shields.io/badge/aadii--chavan-7C3AED?style=for-the-badge&logo=github&logoColor=white&labelColor=0D1117)](https://github.com/aadii-chavan)
[![Portfolio](https://img.shields.io/badge/Portfolio-000000?style=for-the-badge&logo=google-chrome&logoColor=white&labelColor=0D1117)](https://your-portfolio.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white&labelColor=0D1117)](https://www.linkedin.com/in/aadii-chavan)
[![X](https://img.shields.io/badge/X-000000?style=for-the-badge&logo=x&logoColor=white&labelColor=0D1117)](https://x.com/aadii_chavan)
[![Email](https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white&labelColor=0D1117)](mailto:workwithaadichavan@gmail.com)

<br/>

### Tech Stack

<p align="center">
  <sub><b>LANGUAGES</b></sub>
  <br/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white&labelColor=0D1117" alt="TypeScript" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black&labelColor=0D1117" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white&labelColor=0D1117" alt="Python" />
  <img src="https://img.shields.io/badge/C++-00599C?style=for-the-badge&logo=cplusplus&logoColor=white&labelColor=0D1117" alt="C++" />
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white&labelColor=0D1117" alt="MySQL" />
</p>

<p align="center">
  <sub><b>FRONTEND</b></sub>
  <br/>
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black&labelColor=0D1117" alt="React" />
  <img src="https://img.shields.io/badge/Framer%20Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white&labelColor=0D1117" alt="Framer Motion" />
  <img src="https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white&labelColor=0D1117" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white&labelColor=0D1117" alt="Vite" />
</p>

<p align="center">
  <sub><b>BACKEND &amp; AI</b></sub>
  <br/>
  <img src="https://img.shields.io/badge/Node.js-5FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white&labelColor=0D1117" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white&labelColor=0D1117" alt="Express" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white&labelColor=0D1117" alt="FastAPI" />
  <img src="https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white&labelColor=0D1117" alt="OpenAI" />
</p>

<p align="center">
  <sub><b>TOOLING</b></sub>
  <br/>
  <img src="https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white&labelColor=0D1117" alt="Git" />
  <img src="https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white&labelColor=0D1117" alt="GitHub Actions" />
  <img src="https://img.shields.io/badge/Conda-44A833?style=for-the-badge&logo=anaconda&logoColor=white&labelColor=0D1117" alt="Conda" />
  <img src="https://img.shields.io/badge/Postman-FF6C37?style=for-the-badge&logo=postman&logoColor=white&labelColor=0D1117" alt="Postman" />
</p>

<br/>

<sub>Soft Computing — Course Project</sub>

</div>
