<div align="center">

# CreditSense

### A Mamdani fuzzy inference system for micro-loan credit scoring

*Three linguistic antecedents. Ten rules. One centroid.*
*Every number on screen comes from the engine — nothing is invented in the UI.*

<br/>

[![Python](https://img.shields.io/badge/python-3.10-%233776AB.svg?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/fastapi-0.115-%23009688.svg?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Pydantic](https://img.shields.io/badge/pydantic-2.10-%23E92063.svg?style=for-the-badge&logo=pydantic&logoColor=white)](https://docs.pydantic.dev/)
<br/>
[![React](https://img.shields.io/badge/react-18.3-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5.6-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/vite-5.4-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)

<br/>

![Status](https://img.shields.io/badge/status-complete-brightgreen?style=flat-square)
![Engine](https://img.shields.io/badge/engine-v1.2-7C3AED?style=flat-square)
![Rules](https://img.shields.io/badge/rules-10%20over%2027%20combinations-blue?style=flat-square)
![Tests](https://img.shields.io/badge/tests-pytest-0A9EDC?style=flat-square)
![Course](https://img.shields.io/badge/soft%20computing-course%20project-orange?style=flat-square)

</div>

---

## 📑 Contents

- [Overview](#-overview)
- [Project structure](#-project-structure)
- [Getting started](#-getting-started)
- [Pages](#-pages)
- [Architecture](#-architecture)
- [API contract](#-api-contract)
- [Engine specification](#-engine-specification)
- [The rule base](#-the-rule-base)
- [Acceptance table](#-acceptance-table)
- [Author](#-author)

---

## 🔍 Overview

CreditSense scores micro-loan applicants with a **Mamdani fuzzy inference
system**. Three antecedents — monthly income, repayment history and
debt-to-income ratio — are fuzzified into triangular sets, run through a
ten-rule base with min implication and max aggregation, and defuzzified by
centroid into a creditworthiness score on `[0, 100]`.

What makes the project more than a calculator is that the **whole inference is
visible**. The UI does not just show a score; it shows the membership degrees
that produced it, which rules fired and at what strength, the aggregated output
curve, and where the centroid landed on it.

> **Current state:** frontend and backend both complete.

---

## 📂 Project structure

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

## 🚀 Getting started

Two processes. **Backend first:**

```bash
conda create -n creditsense python=3.10 -y
conda activate creditsense

cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Interactive API docs land at <http://127.0.0.1:8000/docs>.

**Then the frontend:**

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

### Configuration

`frontend/.env` controls where data comes from — copy `.env.example` to get
started.

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

### 💡 The mocks are an oracle, not dead code

The backend's record store reproduces the frontend mock's seeded dataset **bit
for bit** — same 64 records, same scores, tiers, statuses and timestamps.
Flipping `VITE_USE_MOCK` changes nothing on screen, which makes the two
implementations directly diffable.

---

## 📄 Pages

| Route | Page | What it does |
| :--- | :--- | :--- |
| `/` | **Dashboard** | Portfolio stats, score histogram, recent scores (filterable by tier), and a worked "how a score is reached" panel showing the real aggregated output curve for one applicant. |
| `/assess` | **Assess** | Three antecedent sliders; every change posts to `/score` and renders the memberships, fired rules, output curve and centroid. |
| `/records` | **Records** | The assessment log — tier / period / status / engine-version filters, search and pagination, all served by the API. |
| `/rules` | **Rule base** | Membership functions with editable peaks, the rule matrix on switchable axes, the rule list with consequent and active-flag editing, and a dry run that replays stored records through the staged base. |

---

## 🏗️ Architecture

No component computes fuzzy logic and no component imports a mock. Every page
goes through `src/api/client.ts`; memberships, fired rules, output curves and
centroids all arrive from the engine. Switching from the mocks to Python is one
environment variable.

Requests are debounced and in-flight requests are aborted, so a late reply can
never overwrite a newer one. The last good response stays on screen, dimmed,
while the next is fetched; failures show a retry rather than invented numbers.

---

## 🔌 API contract

`src/types/*.ts` is the authoritative version of all of this; the Pydantic
models mirror it field-for-field.

<details open>
<summary><b><code>POST /api/score</code></b> — score one applicant</summary>

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
<summary><b><code>GET /api/dashboard</code></b> — portfolio overview</summary>

<br/>

Portfolio stats (scored totals, mean score with trend, weekly counts, grey-band
count), the score histogram with tier shares, the most recent records, and an
`explainer` pairing one record with its full `ScoreResponse`.
See `src/types/dashboard.ts`.

</details>

<details>
<summary><b><code>GET /api/records</code></b> — the assessment log</summary>

<br/>

Query: `tier`, `period` (`7d` | `30d` | `quarter` | `all`), `status`,
`engineVersion`, `search`, `page`, `pageSize`. Returns the page of rows plus
`filtered` / `total` / `pageCount` and a summary block.
See `src/types/records.ts`.

</details>

<details>
<summary><b><code>GET /api/rules</code></b> — variables and rule base</summary>

<br/>

The linguistic variables with their triangular sets, the rule base (antecedent
clauses, consequent, weight, active flag, firing rate), the rule-space size and
the version history. See `src/types/rules.ts`.

</details>

<details>
<summary><b><code>POST /api/rules/dry-run</code></b> — replay staged edits</summary>

<br/>

Takes a list of staged edits (`peak`, `consequent`, `active`), replays the
stored records through the staged base and returns records affected, mean
shift, tier changes and the two distributions. **Nothing is persisted.**

</details>

All five are implemented in `backend/app/api/routes.py`, with interactive docs
at <http://127.0.0.1:8000/docs>.

### Not yet specced

`Commit score` on Assess and `Publish` on Rule base are deliberately inert —
they need `POST /api/assessments` and `POST /api/rules/publish`, which we
haven't designed. Both buttons are disabled until there is something to send.

---

## ⚙️ Engine specification

Triangular membership functions `(a, b, c)`, **min** implication, **max**
aggregation, **centroid** defuzzification sampled at 101 points over `[0, 100]`.

| Variable | Sets |
| :--- | :--- |
| **Income** (₹ thousands) | low `(-1, 0, 20)` · moderate `(12, 28, 45)` · high `(35, 60, 61)` |
| **Repayment history** (%) | weak `(-1, 0, 45)` · fair `(30, 55, 80)` · strong `(65, 100, 101)` |
| **DTI** (%) | low `(-1, 0, 30)` · medium `(20, 45, 70)` · high `(55, 100, 101)` |
| **Creditworthiness** *(output)* | low `(-1, 0, 45)` · moderate `(25, 50, 75)` · high `(55, 100, 101)` |

**Tier bands:** `< 45` high risk · `45–65` moderate · `≥ 65` low risk.
Rules fire above ε = 0.01. Firing strength is `weight × min(antecedent degrees)`.

---

## 📋 The rule base

Ten rules over a 27-combination antecedent space. **R-22** and **R-25** have a
single clause each, so they deliberately cover a whole slice of that space —
which is why one rule repeats across a row of the matrix.

| Rule | Antecedent | Consequent |
| :--- | :--- | :--- |
| `R-01` | income high ∧ repayment strong | 🟢 high |
| `R-04` | income moderate ∧ repayment strong | 🟢 high |
| `R-07` | DTI low ∧ repayment strong | 🟢 high |
| `R-09` | income high ∧ repayment fair | 🟡 moderate |
| `R-12` | income moderate ∧ repayment fair | 🟡 moderate |
| `R-15` | DTI medium ∧ repayment fair | 🟡 moderate |
| `R-18` | income low ∧ repayment strong | 🟡 moderate |
| `R-19` | income low ∧ repayment fair | 🔴 low |
| `R-22` | DTI high | 🔴 low |
| `R-25` | repayment weak | 🔴 low |

---

## ✅ Acceptance table

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

## 👤 Author

<div align="center">

  <br/>
  <br/>

  [![aadii-chavan](https://img.shields.io/badge/aadii--chavan-7C3AED?style=for-the-badge&logo=github&logoColor=white)](https://github.com/aadii-chavan)
  [![Portfolio](https://img.shields.io/badge/Portfolio-000000?style=for-the-badge&logo=google-chrome&logoColor=white)](https://your-portfolio.com)
  [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/aadii-chavan)
  [![X](https://img.shields.io/badge/X-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/aadii_chavan)
  [![Email](https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:workwithaadichavan@gmail.com)

  ---

  ### 🛠️ Tech Stack

  <p align="center">
    <!-- Languages -->
    <img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" />
    <img src="https://img.shields.io/badge/javascript-%23F7DF1E.svg?style=for-the-badge&logo=javascript&logoColor=black" />
    <img src="https://img.shields.io/badge/python-%233776AB.svg?style=for-the-badge&logo=python&logoColor=white" />
    <img src="https://img.shields.io/badge/c++-%2300599C.svg?style=for-the-badge&logo=c%2B%2B&logoColor=white" />
    <img src="https://img.shields.io/badge/mysql-%234479A1.svg?style=for-the-badge&logo=mysql&logoColor=white" />
    <br/>
    <!-- Frontend -->
    <img src="https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB" />
    <img src="https://img.shields.io/badge/framer--motion-black?style=for-the-badge&logo=framer&logoColor=white" />
    <img src="https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white" />
    <br/>
    <!-- Backend & AI -->
    <img src="https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white" />
    <img src="https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB" />
    <img src="https://img.shields.io/badge/fastapi-%23005571.svg?style=for-the-badge&logo=fastapi&logoColor=white" />
    <img src="https://img.shields.io/badge/AI-%23000000.svg?style=for-the-badge&logo=openai&logoColor=white" />
    <br/>
    <!-- Tools -->
    <img src="https://img.shields.io/badge/git-%23F05033.svg?style=for-the-badge&logo=git&logoColor=white" />
    <img src="https://img.shields.io/badge/github--actions-%232088FF.svg?style=for-the-badge&logo=github-actions&logoColor=white" />
  </p>

  ---

  <sub>Soft Computing — Course Project</sub>

</div>
