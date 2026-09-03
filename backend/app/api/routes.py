"""HTTP surface. Every path is mounted under ``/api``."""

from fastapi import APIRouter, Query

from .. import schemas, services
from ..fuzzy.engine import infer

router = APIRouter()


@router.post("/score", response_model=schemas.ScoreResponse, summary="Run one inference pass")
def post_score(body: schemas.ScoreRequest) -> schemas.ScoreResponse:
    """Fuzzify the three antecedents, fire the rule base, aggregate and defuzzify.

    The applicant block is carried for the record and takes no part in inference.
    """
    result = infer(body.income, body.repayment_history, body.dti)
    return services.score_response(result)


@router.get("/dashboard", response_model=schemas.DashboardResponse, summary="Portfolio overview")
def get_dashboard() -> schemas.DashboardResponse:
    return services.dashboard_response()


@router.get("/records", response_model=schemas.RecordsResponse, summary="The assessment log")
def get_records(
    tier: str = Query("all", pattern="^(all|low_risk|moderate|high_risk)$"),
    period: str = Query("30d", pattern="^(7d|30d|quarter|all)$"),
    status: str = Query("all", pattern="^(all|committed|under_review|referred)$"),
    engine_version: str = Query("all", alias="engineVersion"),
    search: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100, alias="pageSize"),
) -> schemas.RecordsResponse:
    matched = services.filter_records(tier, period, status, engine_version, search)
    return services.records_response(matched, page, page_size)


@router.get("/rules", response_model=schemas.RuleBaseResponse, summary="Membership functions and rules")
def get_rules() -> schemas.RuleBaseResponse:
    return services.rule_base_response()


@router.post(
    "/rules/dry-run",
    response_model=schemas.DryRunResponse,
    summary="Replay stored records through a staged rule base",
)
def post_dry_run(body: schemas.DryRunRequest) -> schemas.DryRunResponse:
    """Nothing is persisted; publishing a staged base is a separate, unbuilt step."""
    return services.dry_run(body.edits)
