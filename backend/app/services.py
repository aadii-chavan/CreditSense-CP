"""Turns engine and store output into wire models."""

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Sequence, Tuple

from . import schemas
from .data.store import (
    ASSESSMENTS,
    NOW,
    PORTFOLIO_TOTAL,
    SCORED_THIS_QUARTER,
    Assessment,
    engine_versions,
)
from .fuzzy.engine import Inference, aggregate, defuzzify, infer, score_only
from .fuzzy.membership import LinguisticVariable
from .fuzzy.rules import ENGINE_VERSION, EPSILON, RULES, RULE_SPACE_SIZE, Rule
from .fuzzy.variables import (
    ANTECEDENTS,
    ANTECEDENT_BY_KEY,
    CREDITWORTHINESS,
    tier_of,
)

BIN_COUNT = 10
BIN_WIDTH = 10


def _iso(dt: datetime) -> str:
    """UTC with a trailing Z, matching JavaScript's ``Date.toISOString()``.

    The frontend parses either form, but emitting the same shape as its dev mock
    keeps the two datasets byte-identical and makes diffing them meaningful.
    """
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


# ── score ──────────────────────────────────────────────────────────────────

def score_response(result: Inference) -> schemas.ScoreResponse:
    def degrees(variable: LinguisticVariable, values: Dict[str, float]):
        return [
            schemas.MembershipDegree(set=s.name, label=s.label, mu=values[s.name])
            for s in variable.sets
        ]

    income_var, repayment_var, dti_var = ANTECEDENTS

    return schemas.ScoreResponse(
        score=result.score,
        tier=result.tier,
        tier_label=result.tier_label,
        memberships=schemas.Memberships(
            income=degrees(income_var, result.memberships["income"]),
            repayment_history=degrees(repayment_var, result.memberships["repaymentHistory"]),
            dti=degrees(dti_var, result.memberships["dti"]),
        ),
        fired_rules=[
            schemas.FiredRuleOut(id=r.id, text=r.text, mu=r.mu, consequent=r.consequent)
            for r in result.fired_rules
        ],
        fired_count=result.fired_count,
        rule_count=RULE_SPACE_SIZE,
        aggregated=schemas.AggregatedOutput(
            domain=CREDITWORTHINESS.domain,
            x=[float(x) for x in result.aggregated_x],
            mu=result.aggregated_mu,
        ),
        centroid=result.score,
        engine=schemas.EngineInfo(
            implication="min",
            aggregation="max",
            defuzzification="centroid",
            version=ENGINE_VERSION,
        ),
    )


# ── records ────────────────────────────────────────────────────────────────

def record_out(a: Assessment) -> schemas.AssessmentRecord:
    rule_id, rule_text, mu = a.dominant_rule
    return schemas.AssessmentRecord(
        id=a.id,
        name=a.name,
        location=a.location,
        score=a.score,
        tier=a.tier,
        tier_label=a.tier_label,
        dominant_rule=schemas.DominantRule(id=rule_id, text=rule_text, mu=mu),
        status=a.status,
        scored_at=_iso(a.scored_at),
        engine_version=a.engine_version,
    )


PERIOD_DAYS = {"7d": 7, "30d": 30, "quarter": 92}


def filter_records(
    tier: str = "all",
    period: str = "30d",
    status: str = "all",
    engine_version: str = "all",
    search: str = "",
) -> List[Assessment]:
    needle = search.strip().lower()
    days = PERIOD_DAYS.get(period)
    cutoff = NOW - timedelta(days=days) if days else None

    matched = []
    for a in ASSESSMENTS:
        if tier != "all" and a.tier != tier:
            continue
        if status != "all" and a.status != status:
            continue
        if engine_version != "all" and a.engine_version != engine_version:
            continue
        if cutoff is not None and a.scored_at < cutoff:
            continue
        if needle and needle not in f"{a.name} {a.id} {a.location}".lower():
            continue
        matched.append(a)
    return matched


def records_response(
    matched: List[Assessment], page: int, page_size: int
) -> schemas.RecordsResponse:
    page_count = max(1, -(-len(matched) // page_size))  # ceiling division
    page = min(max(1, page), page_count)
    start = (page - 1) * page_size
    rows = matched[start : start + page_size]
    mean = sum(a.score for a in matched) / len(matched) if matched else 0.0

    return schemas.RecordsResponse(
        rows=[record_out(a) for a in rows],
        filtered=len(matched),
        total=len(ASSESSMENTS),
        page=page,
        page_size=page_size,
        page_count=page_count,
        summary=schemas.RecordsSummary(
            filtered=len(matched),
            mean_score=round(mean, 1),
            under_review=sum(1 for a in matched if a.status == "under_review"),
            rescored_after_rule_edit=sum(1 for a in matched if a.engine_version != ENGINE_VERSION),
        ),
        engine_versions=engine_versions(),
    )


# ── dashboard ──────────────────────────────────────────────────────────────

def _histogram(scores: Sequence[float]) -> List[schemas.DistributionBin]:
    counts = [0] * BIN_COUNT
    for s in scores:
        counts[min(BIN_COUNT - 1, int(s // BIN_WIDTH))] += 1
    total = len(scores) or 1
    return [
        schemas.DistributionBin(
            **{"from": i * BIN_WIDTH, "to": i * BIN_WIDTH + BIN_WIDTH,
               "pct": round(c / total * 100, 1)}
        )
        for i, c in enumerate(counts)
    ]


def dashboard_response() -> schemas.DashboardResponse:
    scores = [a.score for a in ASSESSMENTS]
    mean = sum(scores) / len(scores)

    def share(predicate) -> float:
        return len([s for s in scores if predicate(s)]) / len(scores) * 100

    # Rounded so the three shares still sum to exactly 100.
    low = round(share(lambda s: s >= 65))
    moderate = round(share(lambda s: 45 <= s < 65))

    grey_band = [a for a in ASSESSMENTS if 45 <= a.score <= 55]
    week_cutoff = NOW - timedelta(days=7)
    this_week = [a for a in ASSESSMENTS if a.scored_at > week_cutoff]
    source = ASSESSMENTS[0]

    return schemas.DashboardResponse(
        engine_synced_at=_iso(NOW),
        stats=schemas.DashboardStats(
            scored=schemas.ScoredStat(
                total=PORTFOLIO_TOTAL, this_quarter=SCORED_THIS_QUARTER, rejected_outright=0
            ),
            mean_score=schemas.MeanScoreStat(
                value=round(mean, 1), delta=2.1, trend=[24, 22, 25, 17, 19, 13, 15, 8, 5]
            ),
            this_week=schemas.WeekStat(total=len(this_week), daily=[38, 56, 44, 72, 60, 88, 34]),
            grey_band=schemas.GreyBandStat(count=len(grey_band), of=len(ASSESSMENTS), range=(45, 55)),
        ),
        distribution=schemas.Distribution(
            bins=_histogram(scores),
            tier_share=schemas.TierShare(
                low_risk=low, moderate=moderate, high_risk=100 - low - moderate
            ),
        ),
        recent=[record_out(a) for a in ASSESSMENTS[:7]],
        explainer=schemas.Explainer(
            record=record_out(source), score=score_response(source.inference)
        ),
    )


# ── rule base ──────────────────────────────────────────────────────────────

def _firing_rates() -> Dict[str, float]:
    counts: Dict[str, int] = {}
    for a in ASSESSMENTS:
        for r in a.inference.fired_rules:
            counts[r.id] = counts.get(r.id, 0) + 1
    total = len(ASSESSMENTS) or 1
    return {r.id: round(counts.get(r.id, 0) / total * 100, 1) for r in RULES}


def _variable_out(v: LinguisticVariable) -> schemas.LinguisticVariableOut:
    return schemas.LinguisticVariableOut(
        key=v.key,
        label=v.label,
        unit=v.unit,
        domain=v.domain,
        sets=[
            schemas.FuzzySetDefinition(name=s.name, label=s.label, a=s.a, b=s.b, c=s.c)
            for s in v.sets
        ],
    )


VERSIONS = (
    ("1.2", "DTI medium peak 40 → 45", "A. Krishnan", "2026-08-02T11:20:00+05:30", True),
    ("1.1", "Added R-25 · repayment weak → low", "A. Krishnan", "2026-07-21T15:05:00+05:30", False),
    ("1.0", "Initial 10-rule base, 3 antecedents", "R. Venkatesan", "2026-07-02T09:00:00+05:30", False),
)


def rule_base_response() -> schemas.RuleBaseResponse:
    rates = _firing_rates()
    return schemas.RuleBaseResponse(
        engine_version=ENGINE_VERSION,
        antecedents=[_variable_out(v) for v in ANTECEDENTS],
        output=_variable_out(CREDITWORTHINESS),
        rules=[
            schemas.RuleDefinition(
                id=r.id,
                antecedents=[
                    schemas.RuleClause(variable=c.variable, set=c.set) for c in r.antecedents
                ],
                consequent=r.consequent,
                weight=r.weight,
                active=r.active,
                text=r.text,
                fires_on_pct=rates.get(r.id, 0.0),
            )
            for r in RULES
        ],
        rule_space_size=RULE_SPACE_SIZE,
        versions=[
            schemas.RuleBaseVersion(
                version=v, summary=s, author=a, timestamp=t, published=p
            )
            for v, s, a, t, p in VERSIONS
        ],
    )


def dry_run(edits: Sequence[schemas.StagedEdit]) -> schemas.DryRunResponse:
    """Replay every stored record through the staged rule base.

    Nothing is persisted — this answers "what would happen if we published?".
    """
    peaks: Dict[Tuple[str, str], float] = {}
    consequents: Dict[str, str] = {}
    actives: Dict[str, bool] = {}

    for edit in edits:
        if edit.kind == "peak":
            peaks[(edit.variable, edit.set)] = edit.to
        elif edit.kind == "consequent":
            consequents[edit.rule_id] = edit.to
        elif edit.kind == "active":
            actives[edit.rule_id] = edit.to

    staged_variables = {
        key: LinguisticVariable(
            key=v.key,
            label=v.label,
            unit=v.unit,
            domain=v.domain,
            sets=tuple(
                s.with_peak(peaks[(key, s.name)]) if (key, s.name) in peaks else s
                for s in v.sets
            ),
        )
        for key, v in ANTECEDENT_BY_KEY.items()
    }
    staged_rules: List[Rule] = [
        r.edited(consequent=consequents.get(r.id), active=actives.get(r.id)) for r in RULES
    ]

    current_counts = [0] * BIN_COUNT
    staged_counts = [0] * BIN_COUNT
    affected = 0
    tier_changes = 0
    current_sum = 0.0
    staged_sum = 0.0

    for a in ASSESSMENTS:
        income, repayment, dti = a.inputs
        before = a.inference.score
        after = score_only(income, repayment, dti, staged_rules, staged_variables)

        current_sum += before
        staged_sum += after
        current_counts[min(BIN_COUNT - 1, int(before // BIN_WIDTH))] += 1
        staged_counts[min(BIN_COUNT - 1, int(after // BIN_WIDTH))] += 1
        if abs(after - before) > 0.05:
            affected += 1
        if tier_of(after) != tier_of(before):
            tier_changes += 1

    n = len(ASSESSMENTS) or 1
    to_pct = lambda counts: [round(c / n * 100, 1) for c in counts]  # noqa: E731

    return schemas.DryRunResponse(
        records_evaluated=n,
        records_affected=affected,
        mean_shift=round((staged_sum - current_sum) / n, 2),
        tier_changes=tier_changes,
        current_bins=to_pct(current_counts),
        staged_bins=to_pct(staged_counts),
    )
