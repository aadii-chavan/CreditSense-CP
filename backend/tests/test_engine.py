"""The engine's contract: the acceptance table, and the properties behind it."""

import pytest

from app.fuzzy.engine import aggregate, defuzzify, fuzzify, infer
from app.fuzzy.membership import triangular
from app.fuzzy.rules import RULES, RULE_SPACE_SIZE
from app.fuzzy.variables import tier_of

# (income ₹, repayment %, dti %, expected score, expected rules fired)
ACCEPTANCE = [
    (26000, 78, 34, 75.5, 3),
    (55000, 95, 10, 84.8, 2),
    (8000, 20, 80, 16.8, 2),
    (0, 0, 100, 14.7, 2),
    (60000, 100, 0, 85.3, 2),
    (30000, 50, 50, 50.0, 2),
]


@pytest.mark.parametrize("income,repayment,dti,expected,fired", ACCEPTANCE)
def test_acceptance_table(income, repayment, dti, expected, fired):
    """These are the values the frontend and the design prototype agree on."""
    result = infer(income, repayment, dti)
    assert round(result.score, 1) == expected
    assert result.fired_count == fired


def test_triangular_shape():
    assert triangular(0, 0, 5, 10) == 0.0     # at the left foot
    assert triangular(5, 0, 5, 10) == 1.0     # at the peak
    assert triangular(10, 0, 5, 10) == 0.0    # at the right foot
    assert triangular(2.5, 0, 5, 10) == 0.5   # halfway up
    assert triangular(7.5, 0, 5, 10) == 0.5   # halfway down
    assert triangular(-3, 0, 5, 10) == 0.0    # outside


def test_membership_degrees_are_bounded():
    for income in range(0, 60001, 2500):
        for repayment in range(0, 101, 10):
            for dti in range(0, 101, 10):
                for degrees in fuzzify(income, repayment, dti).values():
                    for mu in degrees.values():
                        assert 0.0 <= mu <= 1.0


def test_score_stays_inside_the_universe():
    for income in range(0, 60001, 5000):
        for repayment in range(0, 101, 20):
            for dti in range(0, 101, 20):
                assert 0.0 <= infer(income, repayment, dti).score <= 100.0


def test_something_always_fires():
    """The sets cover their universes, so no input leaves the rule base silent."""
    for income in range(0, 60001, 5000):
        for repayment in range(0, 101, 10):
            for dti in range(0, 101, 10):
                assert infer(income, repayment, dti).fired_count > 0


def test_empty_aggregate_defuzzifies_to_zero():
    """A set with no membership anywhere has no centre of gravity."""
    xs, mus = aggregate({"low": 0.0, "moderate": 0.0, "high": 0.0})
    assert defuzzify(xs, mus) == 0.0


# Centroid arithmetic accumulates float error across 101 samples, so
# monotonicity is asserted with a tolerance rather than exactly. Anything
# larger than this is a real inversion, not noise.
MONOTONIC_TOLERANCE = 1e-9


def test_score_is_monotonic_in_repayment():
    """Better repayment never lowers the score, all else held equal."""
    scores = [infer(26000, r, 34).score for r in range(0, 101, 5)]
    for earlier, later in zip(scores, scores[1:]):
        assert later >= earlier - MONOTONIC_TOLERANCE


def test_score_is_monotonic_in_dti():
    """More debt relative to income never raises the score."""
    scores = [infer(26000, 78, d).score for d in range(0, 101, 5)]
    for earlier, later in zip(scores, scores[1:]):
        assert later <= earlier + MONOTONIC_TOLERANCE


def test_tier_bands():
    assert tier_of(44.9) == "high_risk"
    assert tier_of(45.0) == "moderate"
    assert tier_of(64.9) == "moderate"
    assert tier_of(65.0) == "low_risk"


def test_rule_base_shape():
    assert len(RULES) == 10
    assert RULE_SPACE_SIZE == 27
    assert len({r.id for r in RULES}) == 10, "rule ids must be unique"
    assert all(0.0 <= r.weight <= 1.0 for r in RULES)
    assert all(r.consequent in {"low", "moderate", "high"} for r in RULES)


def test_aggregated_curve_is_sampled_at_101_points():
    result = infer(26000, 78, 34)
    assert len(result.aggregated_x) == 101
    assert len(result.aggregated_mu) == 101
    assert result.aggregated_x[0] == 0 and result.aggregated_x[-1] == 100


def test_centroid_equals_score():
    """Centroid defuzzification means the two are the same number by definition."""
    result = infer(38000, 80, 18)
    xs, mus = result.aggregated_x, result.aggregated_mu
    assert defuzzify(xs, mus) == pytest.approx(result.score)
