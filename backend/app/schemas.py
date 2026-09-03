"""Wire models.

These mirror ``frontend/src/types/*.ts`` field for field. Python stays snake_case
and an alias generator emits the camelCase the frontend expects; the few
genuinely snake_case values on the wire (tier names, statuses) are string enums,
not field names, so they pass through untouched.
"""

from typing import List, Literal, Optional, Tuple, Union

from typing_extensions import Annotated

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

Tier = Literal["high_risk", "moderate", "low_risk"]
Consequent = Literal["low", "moderate", "high"]
VariableKey = Literal["income", "repaymentHistory", "dti"]
RecordStatus = Literal["committed", "under_review", "referred"]


class Schema(BaseModel):
    """Serialises as camelCase, accepts either casing on the way in."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ── score ──────────────────────────────────────────────────────────────────

class Applicant(Schema):
    name: str
    location: str
    purpose: str
    amount_requested: int


class ScoreRequest(Schema):
    income: float = Field(ge=0, le=60000, description="Monthly income in rupees")
    repayment_history: float = Field(ge=0, le=100, description="% of instalments paid on time")
    dti: float = Field(ge=0, le=100, description="Debt-to-income ratio, %")
    applicant: Optional[Applicant] = None


class MembershipDegree(Schema):
    set: str
    label: str
    mu: float


class FiredRuleOut(Schema):
    id: str
    text: str
    mu: float
    consequent: Consequent


class Memberships(Schema):
    income: List[MembershipDegree]
    repayment_history: List[MembershipDegree]
    dti: List[MembershipDegree]


class AggregatedOutput(Schema):
    domain: Tuple[float, float]
    x: List[float]
    mu: List[float]


class EngineInfo(Schema):
    implication: str
    aggregation: str
    defuzzification: str
    version: str


class ScoreResponse(Schema):
    score: float
    tier: Tier
    tier_label: str
    memberships: Memberships
    fired_rules: List[FiredRuleOut]
    fired_count: int
    rule_count: int
    aggregated: AggregatedOutput
    centroid: float
    engine: EngineInfo


# ── records ────────────────────────────────────────────────────────────────

class DominantRule(Schema):
    id: str
    text: str
    mu: float


class AssessmentRecord(Schema):
    id: str
    name: str
    location: str
    score: int
    tier: Tier
    tier_label: str
    dominant_rule: DominantRule
    status: RecordStatus
    scored_at: str
    engine_version: str


class RecordsSummary(Schema):
    filtered: int
    mean_score: float
    under_review: int
    rescored_after_rule_edit: int


class RecordsResponse(Schema):
    rows: List[AssessmentRecord]
    filtered: int
    total: int
    page: int
    page_size: int
    page_count: int
    summary: RecordsSummary
    engine_versions: List[str]


# ── dashboard ──────────────────────────────────────────────────────────────

class DistributionBin(Schema):
    from_: float = Field(alias="from")
    to: float
    pct: float

    model_config = ConfigDict(populate_by_name=True)


class ScoredStat(Schema):
    total: int
    this_quarter: int
    rejected_outright: int


class MeanScoreStat(Schema):
    value: float
    delta: float
    trend: List[float]


class WeekStat(Schema):
    total: int
    daily: List[int]


class GreyBandStat(Schema):
    count: int
    of: int
    range: Tuple[float, float]


class DashboardStats(Schema):
    scored: ScoredStat
    mean_score: MeanScoreStat
    this_week: WeekStat
    grey_band: GreyBandStat


class TierShare(BaseModel):
    """Keys are tier names, so this one keeps snake_case on the wire."""

    low_risk: float
    moderate: float
    high_risk: float


class Distribution(Schema):
    bins: List[DistributionBin]
    tier_share: TierShare


class Explainer(Schema):
    record: AssessmentRecord
    score: ScoreResponse


class DashboardResponse(Schema):
    engine_synced_at: str
    stats: DashboardStats
    distribution: Distribution
    recent: List[AssessmentRecord]
    explainer: Optional[Explainer] = None


# ── rule base ──────────────────────────────────────────────────────────────

class FuzzySetDefinition(Schema):
    name: str
    label: str
    a: float
    b: float
    c: float


class LinguisticVariableOut(Schema):
    key: str
    label: str
    unit: str
    domain: Tuple[float, float]
    sets: List[FuzzySetDefinition]


class RuleClause(Schema):
    variable: VariableKey
    set: str


class RuleDefinition(Schema):
    id: str
    antecedents: List[RuleClause]
    consequent: Consequent
    weight: float
    active: bool
    text: str
    fires_on_pct: float


class RuleBaseVersion(Schema):
    version: str
    summary: str
    author: str
    timestamp: str
    published: bool


class RuleBaseResponse(Schema):
    engine_version: str
    antecedents: List[LinguisticVariableOut]
    output: LinguisticVariableOut
    rules: List[RuleDefinition]
    rule_space_size: int
    versions: List[RuleBaseVersion]


class PeakEdit(Schema):
    kind: Literal["peak"]
    variable: VariableKey
    set: str
    from_: float = Field(alias="from")
    to: float

    model_config = ConfigDict(populate_by_name=True)


class ConsequentEdit(Schema):
    kind: Literal["consequent"]
    rule_id: str
    from_: Consequent = Field(alias="from")
    to: Consequent

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ActiveEdit(Schema):
    kind: Literal["active"]
    rule_id: str
    from_: bool = Field(alias="from")
    to: bool

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


#: The discriminator lives on the union itself, not on the field that holds it.
StagedEdit = Annotated[
    Union[PeakEdit, ConsequentEdit, ActiveEdit], Field(discriminator="kind")
]


class DryRunRequest(Schema):
    edits: List[StagedEdit] = Field(default_factory=list)


class DryRunResponse(Schema):
    records_evaluated: int
    records_affected: int
    mean_shift: float
    tier_changes: int
    current_bins: List[float]
    staged_bins: List[float]
