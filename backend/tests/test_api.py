"""The HTTP contract the frontend depends on."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.fixture(scope="module")
def score():
    res = client.post("/api/score", json={"income": 26000, "repaymentHistory": 78, "dti": 34})
    assert res.status_code == 200
    return res.json()


def test_health():
    assert client.get("/api/health").json()["status"] == "ok"


def test_score_is_camel_case_on_the_wire(score):
    """The frontend reads camelCase; a snake_case leak would break it silently."""
    for key in ("tierLabel", "firedRules", "firedCount", "ruleCount"):
        assert key in score
    assert "repaymentHistory" in score["memberships"]
    assert set(score["engine"]) == {"implication", "aggregation", "defuzzification", "version"}


def test_score_values(score):
    assert round(score["score"], 1) == 75.5
    assert score["tier"] == "low_risk"
    assert score["centroid"] == score["score"]
    assert len(score["aggregated"]["x"]) == 101
    assert score["firedRules"] == sorted(score["firedRules"], key=lambda r: -r["mu"])


def test_score_rejects_out_of_range_input():
    res = client.post("/api/score", json={"income": 26000, "repaymentHistory": 178, "dti": 34})
    assert res.status_code == 422


def test_score_rejects_missing_field():
    assert client.post("/api/score", json={"income": 26000, "dti": 34}).status_code == 422


def test_score_accepts_an_applicant_block():
    res = client.post(
        "/api/score",
        json={
            "income": 26000, "repaymentHistory": 78, "dti": 34,
            "applicant": {
                "name": "Kavya Reddy", "location": "Hyderabad, TS",
                "purpose": "Inventory", "amountRequested": 45000,
            },
        },
    )
    assert res.status_code == 200


def test_dashboard_shape():
    d = client.get("/api/dashboard").json()
    assert len(d["distribution"]["bins"]) == 10
    assert d["distribution"]["bins"][0]["from"] == 0
    share = d["distribution"]["tierShare"]
    assert share["low_risk"] + share["moderate"] + share["high_risk"] == 100
    assert len(d["recent"]) == 7
    # The worked example must agree with the record it describes.
    assert round(d["explainer"]["score"]["centroid"]) == d["explainer"]["record"]["score"]


def test_records_pagination():
    first = client.get("/api/records", params={"period": "all", "page": 1}).json()
    assert first["page"] == 1 and first["pageCount"] > 1
    assert len(first["rows"]) == first["pageSize"]

    second = client.get("/api/records", params={"period": "all", "page": 2}).json()
    assert {r["id"] for r in first["rows"]}.isdisjoint({r["id"] for r in second["rows"]})


def test_records_page_beyond_the_end_clamps():
    res = client.get("/api/records", params={"period": "all", "page": 9999}).json()
    assert res["page"] == res["pageCount"]


def test_records_tier_filter():
    res = client.get("/api/records", params={"period": "all", "tier": "high_risk"}).json()
    assert res["filtered"] > 0
    assert all(r["tier"] == "high_risk" and r["score"] < 45 for r in res["rows"])


def test_records_search_matches_name_and_id():
    by_name = client.get("/api/records", params={"period": "all", "search": "aarav"}).json()
    assert by_name["rows"][0]["name"] == "Aarav Mehta"
    by_id = client.get("/api/records", params={"period": "all", "search": "APP-2841"}).json()
    assert by_id["rows"][0]["id"] == "APP-2841"


def test_records_search_with_no_match_is_empty_not_an_error():
    res = client.get("/api/records", params={"period": "all", "search": "zzzznope"}).json()
    assert res["rows"] == [] and res["filtered"] == 0 and res["summary"]["meanScore"] == 0


def test_records_rejects_an_unknown_tier():
    assert client.get("/api/records", params={"tier": "nonsense"}).status_code == 422


def test_rules_shape():
    r = client.get("/api/rules").json()
    assert r["ruleSpaceSize"] == 27
    assert len(r["rules"]) == 10
    assert {v["key"] for v in r["antecedents"]} == {"income", "repaymentHistory", "dti"}
    assert all(0 <= rule["firesOnPct"] <= 100 for rule in r["rules"])
    # Single-clause rules are what let one rule cover a whole slice of the space.
    assert any(len(rule["antecedents"]) == 1 for rule in r["rules"])


def test_dry_run_with_no_edits_changes_nothing():
    d = client.post("/api/rules/dry-run", json={"edits": []}).json()
    assert d["recordsAffected"] == 0
    assert d["meanShift"] == 0
    assert d["tierChanges"] == 0
    assert d["currentBins"] == d["stagedBins"]


def test_dry_run_consequent_edit():
    d = client.post(
        "/api/rules/dry-run",
        json={"edits": [{"kind": "consequent", "ruleId": "R-09", "from": "moderate", "to": "high"}]},
    ).json()
    assert d["recordsEvaluated"] == 64
    assert d["recordsAffected"] == 19
    assert d["meanShift"] == 5.86
    assert d["tierChanges"] == 13


def test_dry_run_disabling_a_rule():
    d = client.post(
        "/api/rules/dry-run",
        json={"edits": [{"kind": "active", "ruleId": "R-25", "from": True, "to": False}]},
    ).json()
    assert d["recordsAffected"] >= 0
    assert sum(d["stagedBins"]) == pytest.approx(100, abs=0.5)


def test_dry_run_peak_edit_moves_the_distribution():
    d = client.post(
        "/api/rules/dry-run",
        json={"edits": [{"kind": "peak", "variable": "dti", "set": "medium", "from": 45, "to": 20}]},
    ).json()
    assert d["recordsAffected"] > 0


def test_dry_run_rejects_an_unknown_edit_kind():
    res = client.post("/api/rules/dry-run", json={"edits": [{"kind": "colour", "to": "red"}]})
    assert res.status_code == 422
