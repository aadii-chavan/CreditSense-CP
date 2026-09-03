"""The assessment store.

An in-memory stand-in for the table a real deployment would keep in Postgres.
Every record's score, tier and dominant rule is produced by running the engine
over its stored inputs, so Dashboard, Records and Rule base can never drift from
what Assess computes for the same numbers.

The generated portion mirrors the frontend mock record for record — see
``app/data/prng.py`` for why that matters.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

from ..fuzzy.engine import Inference, infer
from .prng import js_round, mulberry32

IST = timezone(timedelta(hours=5, minutes=30))

#: Reference "now" for the prototype — the design's 12 Aug 2026, 09:41 sync.
NOW = datetime(2026, 8, 12, 9, 41, tzinfo=IST)

#: Headline figure the prototype quotes for the whole book. The store holds a
#: sample of that population.
PORTFOLIO_TOTAL = 2847
SCORED_THIS_QUARTER = 1206


@dataclass(frozen=True)
class Seed:
    name: str
    location: str
    income: int
    repayment_history: int
    dti: int
    minutes_ago: int
    engine_version: str = "1.2"


@dataclass(frozen=True)
class Assessment:
    id: str
    name: str
    location: str
    score: int
    tier: str
    tier_label: str
    dominant_rule: Tuple[str, str, float]  # (id, text, mu)
    status: str
    scored_at: datetime
    engine_version: str
    inputs: Tuple[int, int, int]  # (income, repayment_history, dti)
    inference: Inference


# The twelve applicants the design names. Their inputs were solved so the engine
# reproduces the scores shown in the artboards; Ananya Iyer's 88 sits above the
# engine's ceiling of 85.3, so hers lands at the ceiling.
NAMED: Tuple[Seed, ...] = (
    Seed("Aarav Mehta", "Pune", 38000, 80, 18, 29),
    Seed("Ananya Iyer", "Kochi", 20000, 100, 0, 47),
    Seed("Rohit Deshmukh", "Jaipur", 27000, 96, 60, 70),
    Seed("Priya Nandakumar", "Indore", 14000, 78, 20, 1001),
    Seed("Vikram Chauhan", "Lucknow", 53000, 92, 82, 1119),
    Seed("Meera Pillai", "Coimbatore", 21000, 44, 58, 2821),
    Seed("Sanjay Kulkarni", "Nagpur", 33000, 48, 90, 2916),
    Seed("Divya Nair", "Thrissur", 18000, 92, 8, 3893),
    Seed("Ishaan Bhatt", "Surat", 9000, 86, 24, 4049),
    Seed("Ritu Agarwal", "Kanpur", 16000, 80, 24, 5591),
    Seed("Arjun Sethi", "Ludhiana", 13000, 74, 94, 5666),
    Seed("Lakshmi Subramanian", "Madurai", 28000, 100, 62, 6939),
)

FIRST = [
    "Aditi", "Rahul", "Neha", "Karthik", "Sneha", "Manish", "Pooja", "Vivek", "Anjali", "Suresh",
    "Kavita", "Nikhil", "Deepa", "Ravi", "Shweta", "Gopal", "Preeti", "Amit", "Rekha", "Sunil",
    "Farhan", "Zoya", "Imran", "Nusrat", "Joseph", "Mary",
]
LAST = [
    "Rao", "Sharma", "Menon", "Gupta", "Patel", "Banerjee", "Krishnan", "Joshi", "Verma", "Shetty",
    "Dutta", "Naidu", "Kaur", "Fernandes", "Bose", "Thomas",
]
CITIES = [
    "Pune", "Kochi", "Jaipur", "Indore", "Lucknow", "Coimbatore", "Nagpur", "Surat", "Kanpur",
    "Ludhiana", "Madurai", "Bhopal", "Patna", "Guwahati", "Raipur", "Vijayawada", "Mysuru", "Nashik",
]

GENERATED_COUNT = 52
_GENERATOR_SEED = 20260812
_STATUS_SEED = 7


def _generated(count: int = GENERATED_COUNT) -> List[Seed]:
    """Applicants who reach scoring are not uniformly distributed: most have a
    usable repayment record and manageable debt. The draws below are skewed that
    way, which gives the scored book a mean near 65 and roughly a 50/40/10 split
    across the tiers.

    The order of ``rand()`` calls is load-bearing — it must match the property
    evaluation order of the object literal in the frontend mock.
    """
    rand = mulberry32(_GENERATOR_SEED)

    def pick(items):
        return items[int(rand() * len(items))]

    seeds: List[Seed] = []
    for i in range(count):
        name = f"{pick(FIRST)} {pick(LAST)}"
        location = pick(CITIES)
        income = 4000 + js_round((54000 * rand() ** 0.7) / 1000) * 1000
        repayment = js_round(40 + 60 * rand() ** 0.8)
        dti = js_round(70 * rand() ** 3)
        minutes_ago = 7200 + i * (90 + js_round(rand() * 810))
        engine_version = "1.1" if rand() < 0.22 else "1.2"
        seeds.append(
            Seed(name, location, income, repayment, dti, minutes_ago, engine_version)
        )
    return seeds


def _status_for(score: float, roll: float) -> str:
    if score < 45:
        return "referred" if roll < 0.6 else "under_review"
    if score < 55:
        return "under_review" if roll < 0.5 else "committed"
    return "committed"


def _build(seeds: List[Seed]) -> List[Assessment]:
    rand = mulberry32(_STATUS_SEED)
    out: List[Assessment] = []

    for index, seed in enumerate(seeds):
        result = infer(seed.income, seed.repayment_history, seed.dti)
        dominant = result.fired_rules[0] if result.fired_rules else None
        out.append(
            Assessment(
                id=f"APP-{2841 - index}",
                name=seed.name,
                location=seed.location,
                score=js_round(result.score),
                tier=result.tier,
                tier_label=result.tier_label,
                dominant_rule=(
                    (dominant.id, dominant.text, round(dominant.mu, 2))
                    if dominant
                    else ("—", "no rule fired", 0.0)
                ),
                status=_status_for(result.score, rand()),
                scored_at=NOW - timedelta(minutes=seed.minutes_ago),
                engine_version=seed.engine_version,
                inputs=(seed.income, seed.repayment_history, seed.dti),
                inference=result,
            )
        )
    return out


#: Newest first, matching the order Records and the Dashboard display.
ASSESSMENTS: List[Assessment] = _build(list(NAMED) + _generated())

_BY_ID: Dict[str, Assessment] = {a.id: a for a in ASSESSMENTS}


def find(assessment_id: str) -> Optional[Assessment]:
    return _BY_ID.get(assessment_id)


def engine_versions() -> List[str]:
    return sorted({a.engine_version for a in ASSESSMENTS}, reverse=True)
