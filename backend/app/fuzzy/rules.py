"""The published rule base."""

from dataclasses import dataclass, replace
from typing import Tuple

from .variables import VARIABLE_WORD


@dataclass(frozen=True)
class Clause:
    """``variable IS set`` — one conjunct of a rule's antecedent."""

    variable: str
    set: str


@dataclass(frozen=True)
class Rule:
    id: str
    antecedents: Tuple[Clause, ...]
    consequent: str  # "low" | "moderate" | "high"
    weight: float = 1.0
    active: bool = True

    @property
    def text(self) -> str:
        """``income high ∧ repayment strong``"""
        return " ∧ ".join(f"{VARIABLE_WORD[c.variable]} {c.set}" for c in self.antecedents)

    @property
    def prose(self) -> str:
        """``income high AND repayment strong → high``"""
        body = " AND ".join(f"{VARIABLE_WORD[c.variable]} {c.set}" for c in self.antecedents)
        return f"{body} → {self.consequent}"

    def edited(self, consequent=None, active=None) -> "Rule":
        return replace(
            self,
            consequent=self.consequent if consequent is None else consequent,
            active=self.active if active is None else active,
        )


def _rule(rid, consequent, *pairs, weight=1.0, active=True) -> Rule:
    return Rule(rid, tuple(Clause(v, s) for v, s in pairs), consequent, weight, active)


#: Ten rules over a 3×3×3 antecedent space. R-22 and R-25 carry a single clause
#: each, so they deliberately cover a whole slice of that space — which is why
#: one rule can govern an entire row of the rule matrix.
RULES: Tuple[Rule, ...] = (
    _rule("R-01", "high", ("income", "high"), ("repaymentHistory", "strong")),
    _rule("R-04", "high", ("income", "moderate"), ("repaymentHistory", "strong")),
    _rule("R-07", "high", ("dti", "low"), ("repaymentHistory", "strong")),
    _rule("R-09", "moderate", ("income", "high"), ("repaymentHistory", "fair")),
    _rule("R-12", "moderate", ("income", "moderate"), ("repaymentHistory", "fair")),
    _rule("R-15", "moderate", ("dti", "medium"), ("repaymentHistory", "fair")),
    _rule("R-18", "moderate", ("income", "low"), ("repaymentHistory", "strong")),
    _rule("R-19", "low", ("income", "low"), ("repaymentHistory", "fair")),
    _rule("R-22", "low", ("dti", "high")),
    _rule("R-25", "low", ("repaymentHistory", "weak")),
)

RULE_BY_ID = {r.id: r for r in RULES}

#: Size of the full antecedent space (3 sets × 3 variables).
RULE_SPACE_SIZE = 27

#: A rule counts as fired above this strength.
EPSILON = 0.01

ENGINE_VERSION = "1.2"
