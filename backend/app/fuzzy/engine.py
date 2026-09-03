"""Mamdani inference: fuzzify → apply rules → aggregate → defuzzify."""

from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple

from .rules import EPSILON, ENGINE_VERSION, RULES, RULE_SPACE_SIZE, Rule
from .variables import (
    ANTECEDENT_BY_KEY,
    CREDITWORTHINESS,
    DTI,
    INCOME,
    REPAYMENT,
    tier_label,
    tier_of,
)

#: The output universe is sampled at 1-unit steps, giving 101 points over 0–100.
SAMPLE_STEP = 1
CONSEQUENT_SETS = ("low", "moderate", "high")


@dataclass(frozen=True)
class FiredRule:
    id: str
    text: str
    mu: float
    consequent: str


@dataclass(frozen=True)
class Inference:
    score: float
    tier: str
    tier_label: str
    memberships: Dict[str, Dict[str, float]]
    fired_rules: List[FiredRule]
    aggregated_x: List[int]
    aggregated_mu: List[float]

    @property
    def fired_count(self) -> int:
        return len(self.fired_rules)


def fuzzify(income: float, repayment_history: float, dti: float) -> Dict[str, Dict[str, float]]:
    """Membership degrees for each antecedent, keyed by variable then set.

    ``income`` arrives in rupees and is converted to the ₹-thousands scale the
    sets are defined on.
    """
    return {
        "income": INCOME.fuzzify(income / 1000.0),
        "repaymentHistory": REPAYMENT.fuzzify(repayment_history),
        "dti": DTI.fuzzify(dti),
    }


def firing_strength(rule: Rule, degrees: Dict[str, Dict[str, float]]) -> float:
    """AND across the clauses is the minimum, scaled by the rule's weight."""
    return rule.weight * min(degrees[c.variable][c.set] for c in rule.antecedents)


def implicate(
    rules: Sequence[Rule], degrees: Dict[str, Dict[str, float]]
) -> Tuple[Dict[str, float], List[FiredRule]]:
    """Min-implication: each consequent set is clipped at its strongest rule."""
    clip = {name: 0.0 for name in CONSEQUENT_SETS}
    evaluated: List[FiredRule] = []

    for rule in rules:
        if not rule.active:
            continue
        mu = firing_strength(rule, degrees)
        evaluated.append(FiredRule(rule.id, rule.prose, mu, rule.consequent))
        if mu > clip[rule.consequent]:
            clip[rule.consequent] = mu

    return clip, evaluated


def aggregate(clip: Dict[str, float], output=CREDITWORTHINESS) -> Tuple[List[int], List[float]]:
    """Max-aggregation of the clipped consequent sets across the universe."""
    low, high = output.domain
    xs = list(range(int(low), int(high) + 1, SAMPLE_STEP))
    mus = [
        max(min(clip[s.name], s.mu(x)) for s in output.sets)
        for x in xs
    ]
    return xs, mus


def defuzzify(xs: Sequence[float], mus: Sequence[float]) -> float:
    """Centre of gravity of the aggregated set.

    Returns 0.0 when nothing fired — the set is empty and has no centroid.
    """
    denominator = sum(mus)
    if denominator == 0:
        return 0.0
    return sum(x * mu for x, mu in zip(xs, mus)) / denominator


def infer(
    income: float,
    repayment_history: float,
    dti: float,
    rules: Optional[Sequence[Rule]] = None,
) -> Inference:
    """One full inference pass. ``rules`` defaults to the published base."""
    rules = RULES if rules is None else rules
    degrees = fuzzify(income, repayment_history, dti)
    clip, evaluated = implicate(rules, degrees)
    xs, mus = aggregate(clip)
    score = defuzzify(xs, mus)

    fired = sorted((r for r in evaluated if r.mu > EPSILON), key=lambda r: r.mu, reverse=True)
    tier = tier_of(score)

    return Inference(
        score=score,
        tier=tier,
        tier_label=tier_label(tier),
        memberships=degrees,
        fired_rules=fired,
        aggregated_x=xs,
        aggregated_mu=mus,
    )


def score_only(
    income: float,
    repayment_history: float,
    dti: float,
    rules: Sequence[Rule],
    variables=None,
) -> float:
    """Just the defuzzified score, for replaying many records in a dry run.

    ``variables`` lets a staged rule base override the published sets.
    """
    variables = ANTECEDENT_BY_KEY if variables is None else variables
    values = {
        "income": income / 1000.0,
        "repaymentHistory": repayment_history,
        "dti": dti,
    }
    degrees = {key: variables[key].fuzzify(values[key]) for key in values}
    clip, _ = implicate(rules, degrees)
    xs, mus = aggregate(clip)
    return defuzzify(xs, mus)


__all__ = [
    "ENGINE_VERSION",
    "RULE_SPACE_SIZE",
    "FiredRule",
    "Inference",
    "aggregate",
    "defuzzify",
    "fuzzify",
    "infer",
    "score_only",
]
