import { useMemo, useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { IdentityFields } from "../components/IdentityFields";
import { AntecedentSlider } from "../components/AntecedentSlider";
import { ScoreCard } from "../components/ScoreCard";
import { AggregatedOutputChart } from "../components/AggregatedOutputChart";
import { FiredRules } from "../components/FiredRules";
import { EngineStatus } from "../components/EngineStatus";
import { PageError } from "../components/PageState";
import { useScore } from "../hooks/useScore";
import { rupees } from "../lib/format";
import type { Applicant } from "../types/score";

const DEFAULT_APPLICANT: Applicant = {
  name: "Kavya Reddy",
  location: "Hyderabad, TS",
  purpose: "Inventory — tailoring unit",
  amountRequested: 45000,
};
const DEFAULT_INCOME = 26000;
const DEFAULT_REPAYMENT = 78;
const DEFAULT_DTI = 34;

export function AssessPage() {
  const [applicant, setApplicant] = useState<Applicant>(DEFAULT_APPLICANT);
  const [income, setIncome] = useState(DEFAULT_INCOME);
  const [repaymentHistory, setRepaymentHistory] = useState(DEFAULT_REPAYMENT);
  const [dti, setDti] = useState(DEFAULT_DTI);

  const request = useMemo(
    () => ({ income, repaymentHistory, dti, applicant }),
    [income, repaymentHistory, dti, applicant],
  );
  const { data, status, error, isStale, retry } = useScore(request);

  const reset = () => {
    setApplicant(DEFAULT_APPLICANT);
    setIncome(DEFAULT_INCOME);
    setRepaymentHistory(DEFAULT_REPAYMENT);
    setDti(DEFAULT_DTI);
  };

  return (
    <div className="page">
      <AppHeader><span className="app-saved">Draft saved · 09:44</span></AppHeader>

      <main className="page-main">
        <div className="page-head">
          <div>
            <div className="page-kicker">New assessment · APP-2842</div>
            <h1 className="page-title">Applicant inputs</h1>
            <p className="page-lede">
              Three antecedents feed the inference pass. The score on the right recomputes on
              every change — no submit needed to see the reasoning.
            </p>
          </div>
          <div className="page-actions">
            <button className="btn btn-secondary btn-reset" type="button" onClick={reset}>
              Reset
            </button>
            {/* Commit persists the assessment — wired once POST /api/assessments exists. */}
            <button
              className="btn btn-primary btn-commit"
              type="button"
              disabled={!data}
              title={data ? undefined : "Waiting for a score from the engine"}
            >
              Commit score
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </button>
          </div>
        </div>

        <section className="assess-grid">
          <div className="assess-inputs">
            <IdentityFields value={applicant} onChange={setApplicant} />

            <div className="rule-divider" />
            <div className="section-label section-label-tight">02 · Antecedents</div>
            <p className="section-note">
              Each value is fuzzified into three linguistic sets; membership degrees are shown
              beneath the slider.
            </p>

            <AntecedentSlider
              name="Monthly income"
              displayValue={rupees(income)}
              unit="/mo"
              value={income}
              min={0}
              max={60000}
              step={1000}
              onChange={setIncome}
              scale={["₹0", "₹30,000", "₹60,000"]}
              degrees={data?.memberships.income}
              placeholders={["Low", "Moderate", "High"]}
            />

            <AntecedentSlider
              name="Repayment history"
              displayValue={repaymentHistory}
              unit="% on time"
              value={repaymentHistory}
              min={0}
              max={100}
              step={1}
              onChange={setRepaymentHistory}
              scale={["None", "Informal / SHG record", "Perfect"]}
              degrees={data?.memberships.repaymentHistory}
              placeholders={["Weak", "Fair", "Strong"]}
            />

            <AntecedentSlider
              name="Debt-to-income ratio"
              displayValue={dti}
              unit="%"
              value={dti}
              min={0}
              max={100}
              step={1}
              onChange={setDti}
              scale={["0%", "50%", "100%"]}
              degrees={data?.memberships.dti}
              placeholders={["Low", "Medium", "High"]}
            />

            <div className="assess-footnote">
              Sliders are draggable — every change posts to{" "}
              <span className="mono">POST /api/score</span> and the panel renders the reply.
            </div>
          </div>

          <div className="assess-output">
            <div className="assess-output-sticky">
              <EngineStatus status={status} engineVersion={data?.engine.version} />

              {status === "error" && !data ? (
                <PageError title="Scoring engine unavailable" message={error ?? "Unknown error."} onRetry={retry} />
              ) : (
                <div className={isStale ? "is-stale" : undefined}>
                  <ScoreCard data={data} />
                  <AggregatedOutputChart
                    aggregated={data?.aggregated}
                    centroid={data?.centroid}
                  />
                  <FiredRules rules={data?.firedRules} />
                </div>
              )}

              {status === "error" && data && (
                <p className="rules-empty" style={{ marginTop: 16 }} role="alert">
                  Showing the last good score — {error}{" "}
                  <button className="btn btn-ghost" type="button" onClick={retry}>Retry</button>
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
