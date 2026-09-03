"""The linguistic variables of the credit model.

These breakpoints are the specification the frontend was built against; see the
acceptance table in the project README. Income is fuzzified on a ₹-thousands
scale so the numbers stay readable — requests carry rupees and the engine
divides by 1000.
"""

from .membership import FuzzySet, LinguisticVariable

INCOME = LinguisticVariable(
    key="income",
    label="Monthly income",
    unit="₹ thousands",
    domain=(0, 60),
    sets=(
        FuzzySet("low", "Low", -1, 0, 20),
        FuzzySet("moderate", "Moderate", 12, 28, 45),
        FuzzySet("high", "High", 35, 60, 61),
    ),
)

REPAYMENT = LinguisticVariable(
    key="repaymentHistory",
    label="Repayment history",
    unit="% on time",
    domain=(0, 100),
    sets=(
        FuzzySet("weak", "Weak", -1, 0, 45),
        FuzzySet("fair", "Fair", 30, 55, 80),
        FuzzySet("strong", "Strong", 65, 100, 101),
    ),
)

DTI = LinguisticVariable(
    key="dti",
    label="Debt-to-income",
    unit="%",
    domain=(0, 100),
    sets=(
        FuzzySet("low", "Low", -1, 0, 30),
        FuzzySet("medium", "Medium", 20, 45, 70),
        FuzzySet("high", "High", 55, 100, 101),
    ),
)

CREDITWORTHINESS = LinguisticVariable(
    key="creditworthiness",
    label="Creditworthiness",
    unit="score",
    domain=(0, 100),
    sets=(
        FuzzySet("low", "Low", -1, 0, 45),
        FuzzySet("moderate", "Moderate", 25, 50, 75),
        FuzzySet("high", "High", 55, 100, 101),
    ),
)

ANTECEDENTS = (INCOME, REPAYMENT, DTI)
ANTECEDENT_BY_KEY = {v.key: v for v in ANTECEDENTS}

#: Words used when rendering a rule in prose.
VARIABLE_WORD = {"income": "income", "repaymentHistory": "repayment", "dti": "DTI"}

#: Tier band boundaries on the output universe.
HIGH_RISK_CEILING = 45.0
MODERATE_CEILING = 65.0


def tier_of(score: float) -> str:
    if score >= MODERATE_CEILING:
        return "low_risk"
    if score >= HIGH_RISK_CEILING:
        return "moderate"
    return "high_risk"


def tier_label(tier: str) -> str:
    return {"low_risk": "Low risk", "moderate": "Moderate", "high_risk": "High risk"}[tier]
