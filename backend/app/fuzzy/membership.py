"""Membership functions over a crisp universe."""

from dataclasses import dataclass


def triangular(x: float, a: float, b: float, c: float) -> float:
    """Triangular membership with feet at ``a``/``c`` and peak at ``b``.

    Feet may sit outside the variable's domain — that is how a shoulder set
    (one that stays at full membership out to the edge of the universe) is
    expressed, e.g. ``(-1, 0, 20)`` for "low" on a domain starting at 0.
    """
    if x <= a or x >= c:
        return 0.0
    if x == b:
        return 1.0
    return (x - a) / (b - a) if x < b else (c - x) / (c - b)


@dataclass(frozen=True)
class FuzzySet:
    """One named triangular set."""

    name: str
    label: str
    a: float
    b: float
    c: float

    def mu(self, x: float) -> float:
        return triangular(x, self.a, self.b, self.c)

    def with_peak(self, peak: float) -> "FuzzySet":
        """A copy with the peak moved — used to evaluate staged rule-base edits."""
        return FuzzySet(self.name, self.label, self.a, peak, self.c)


@dataclass(frozen=True)
class LinguisticVariable:
    """A variable and the sets defined over its universe."""

    key: str
    label: str
    unit: str
    domain: tuple  # (min, max)
    sets: tuple    # tuple[FuzzySet, ...]

    def fuzzify(self, x: float) -> dict:
        """Membership degree of ``x`` in each set, keyed by set name."""
        return {s.name: s.mu(x) for s in self.sets}

    def set_by_name(self, name: str) -> FuzzySet:
        for s in self.sets:
            if s.name == name:
                return s
        raise KeyError(f"{self.key} has no set named {name!r}")
