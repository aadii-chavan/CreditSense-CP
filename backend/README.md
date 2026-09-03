# CreditSense API

FastAPI service implementing the Mamdani fuzzy inference engine and the four
data endpoints the frontend consumes.

## Setup

Python is managed with **miniconda**:

```bash
conda create -n creditsense python=3.10 -y
conda activate creditsense
pip install -r requirements.txt
```

## Running

```bash
conda activate creditsense
uvicorn app.main:app --reload --port 8000
```

- Interactive docs: <http://127.0.0.1:8000/docs>
- Health probe: <http://127.0.0.1:8000/api/health>

If port 8000 is busy, run on another port and point the frontend at it with
`VITE_API_TARGET=http://127.0.0.1:8001` in `frontend/.env`.

## Tests

```bash
conda activate creditsense
pytest -q
```

36 tests: the six-row acceptance table, membership-function shape, engine
invariants (bounded degrees, in-universe scores, monotonicity in repayment and
DTI), and the HTTP contract including camelCase serialisation, filter and
pagination behaviour, and validation rejections.

## Layout

```
app/
  main.py            FastAPI app, CORS, router mount
  api/routes.py      the five endpoints, all under /api
  schemas.py         Pydantic models mirroring frontend/src/types/*.ts
  services.py        engine + store output → wire models
  fuzzy/
    membership.py    triangular(), FuzzySet, LinguisticVariable
    variables.py     the four linguistic variables and the tier bands
    rules.py         the ten-rule base
    engine.py        fuzzify → implicate → aggregate → defuzzify
  data/
    store.py         in-memory assessment store (64 records)
    prng.py          JS-compatible PRNG, see "Dataset parity" below
tests/
```

## The engine

`infer()` runs one pass:

1. **Fuzzify** — each crisp input gets a membership degree in each of its three
   triangular sets. Income arrives in rupees and is scaled to ₹-thousands.
2. **Implicate** — a rule's firing strength is `weight × min(clause degrees)`;
   each consequent set is clipped at the strongest rule pointing to it (Mamdani
   min-implication).
3. **Aggregate** — the clipped sets are combined with max across the output
   universe, sampled at 101 points over 0–100.
4. **Defuzzify** — centre of gravity of the aggregated set.

Reachable range is roughly 14.7–85.3: the centroid of a clipped triangle cannot
sit at the edge of the universe, so the engine never returns 0 or 100.

Membership functions, the rule base and the acceptance table are documented in
the project README one directory up.

## Dataset parity

`app/data/store.py` holds a 64-record sample: twelve named applicants from the
design, plus 52 generated from a seeded PRNG. `app/data/prng.py` reproduces
JavaScript's `mulberry32` and `Math.round` bit for bit, so this store is
**identical** to the frontend's dev mock — same names, scores, tiers, statuses,
dominant rules and timestamps.

That is deliberate: flipping `VITE_USE_MOCK` must not change a single number on
screen, which makes the two implementations directly diffable and turns the mock
into a usable oracle for this service.

## Not implemented

`Commit score` and `Publish` in the UI have no endpoint yet — they need
`POST /api/assessments` and `POST /api/rules/publish`, which have not been
designed. The buttons are disabled in the frontend rather than failing.

The store is in-memory and read-only; it rebuilds on every process start.
