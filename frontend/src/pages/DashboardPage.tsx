import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { SearchField } from "../components/SearchField";
import { Segmented } from "../components/Segmented";
import { PageError, PageLoading } from "../components/PageState";
import { TierTag } from "../components/TierTag";
import { PositionBar } from "../components/PositionBar";
import { AggregatedOutputChart } from "../components/AggregatedOutputChart";
import { Sparkline } from "../components/Sparkline";
import { useApi } from "../hooks/useApi";
import { getDashboard } from "../api/client";
import { compact, muColor, shortWhen } from "../lib/format";
import type { TierFilter } from "../types/records";

const TIER_OPTIONS: { value: TierFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "low_risk", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high_risk", label: "High" },
];

export function DashboardPage() {
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState<TierFilter>("all");

  const fetcher = useCallback((signal: AbortSignal) => getDashboard(signal), []);
  const { data, status, error, isStale, refetch } = useApi(fetcher);

  const recent = useMemo(
    () => (data?.recent ?? []).filter((r) => tier === "all" || r.tier === tier),
    [data, tier],
  );

  return (
    <div className="page">
      <AppHeader>
        <SearchField value={search} onChange={setSearch} />
        <button className="btn btn-icon btn-secondary" type="button" title="Notifications" aria-label="Notifications">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
            <path d="M10.3 21a2 2 0 003.4 0" />
          </svg>
        </button>
      </AppHeader>

      <main className="page-main">
        <div className="page-head">
          <div style={{ maxWidth: 560 }}>
            <div className="page-kicker">Portfolio overview</div>
            <h1 className="page-title page-title-lg">
              Creditworthiness,
              <br />
              graded — not gated.
            </h1>
            <p className="page-lede">
              Every score below is produced by a Mamdani fuzzy inference pass over income,
              repayment history and debt-to-income — with the reasoning path kept on record.
            </p>
          </div>
          <div className="page-actions page-actions-wide">
            <div className="synced">
              <div className="section-label" style={{ marginBottom: 0 }}>Engine synced</div>
              <div className="synced-value">
                {data ? new Intl.DateTimeFormat("en-GB", {
                  day: "2-digit", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit", hour12: false,
                }).format(new Date(data.engineSyncedAt)).replace(",", " ·") : "—"}
              </div>
            </div>
            <button className="btn btn-secondary" style={{ height: 44, padding: "0 16px" }} type="button">
              Export batch
            </button>
            <Link className="btn btn-primary" to="/assess" style={{ height: 44, padding: "0 20px", gap: 10 }}>
              New assessment
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M5 12h14" />
                <path d="M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        </div>

        {status === "error" && !data ? (
          <PageError message={error ?? "Unknown error."} onRetry={refetch} />
        ) : !data ? (
          <PageLoading label="Loading portfolio…" />
        ) : (
          <div className={isStale ? "is-stale" : undefined}>
            <section className="stat-strip">
              <div className="stat-cell">
                <div className="section-label">Applications scored</div>
                <div className="stat-value">{compact(data.stats.scored.total)}</div>
                <div className="stat-note">
                  {compact(data.stats.scored.thisQuarter)} this quarter ·{" "}
                  {data.stats.scored.rejectedOutright} rejected outright
                </div>
              </div>

              <div className="stat-cell">
                <div className="section-label">Mean score</div>
                <div className="stat-row">
                  <div className="stat-value">{data.stats.meanScore.value.toFixed(1)}</div>
                  <div className="stat-delta">▲ {data.stats.meanScore.delta.toFixed(1)}</div>
                </div>
                <Sparkline values={data.stats.meanScore.trend} />
              </div>

              <div className="stat-cell">
                <div className="section-label">Scored this week</div>
                <div className="stat-value">{data.stats.thisWeek.total}</div>
                <div className="minibars">
                  {data.stats.thisWeek.daily.map((value, i) => {
                    const peak = Math.max(...data.stats.thisWeek.daily);
                    const isPeak = value === peak;
                    const isLast = i === data.stats.thisWeek.daily.length - 1;
                    return (
                      <div
                        key={i}
                        className="minibar"
                        style={{
                          height: `${(value / peak) * 100}%`,
                          background: isPeak
                            ? "var(--color-text)"
                            : isLast
                              ? "var(--color-neutral-300)"
                              : "var(--color-neutral-400)",
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="stat-cell">
                <div className="section-label">In the grey band</div>
                <div className="stat-row">
                  <div className="stat-value">{data.stats.greyBand.count}</div>
                  <div className="stat-of">of {data.stats.greyBand.of}</div>
                </div>
                <div className="stat-note">
                  Scores {data.stats.greyBand.range[0]}–{data.stats.greyBand.range[1]} — flagged for
                  analyst review
                </div>
              </div>
            </section>

            <section className="dashboard-grid">
              <div className="dashboard-main">
                <div className="block-head">
                  <div>
                    <h2 className="block-title">Recent applicant scores</h2>
                    <div className="block-sub">
                      Last 24 hours · {recent.length} of {compact(data.stats.scored.total)} shown
                    </div>
                  </div>
                  <Segmented
                    name="dashboard-tier"
                    ariaLabel="Filter by risk tier"
                    value={tier}
                    options={TIER_OPTIONS}
                    onChange={setTier}
                  />
                </div>

                <table className="table records-table">
                  <thead>
                    <tr>
                      <th className="col-first">Applicant</th>
                      <th>Score</th>
                      <th style={{ width: 210 }}>Distribution position</th>
                      <th>Risk tier</th>
                      <th className="col-last">Scored</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((row) => (
                      <tr key={row.id}>
                        <td className="col-first">
                          <div className="row-name">{row.name}</div>
                          <div className="row-meta">{row.id} · {row.location}</div>
                        </td>
                        <td>
                          <span
                            className="row-score"
                            style={row.tier === "high_risk" ? { color: "var(--color-accent-700)" } : undefined}
                          >
                            {row.score}
                          </span>
                          <span className="row-score-of">/100</span>
                        </td>
                        <td>
                          <PositionBar score={row.score} tier={row.tier} showMidpoint height={8} />
                        </td>
                        <td><TierTag tier={row.tier} label={row.tierLabel} /></td>
                        <td className="col-last">{shortWhen(row.scoredAt)}</td>
                      </tr>
                    ))}
                    {recent.length === 0 && (
                      <tr>
                        <td colSpan={5} className="table-empty">No applicants in this tier.</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div className="block-foot">
                  <div className="block-sub">
                    Each row keeps the rule trace that produced it; open Records for the full view.
                  </div>
                  <Link className="link-arrow" to="/records">
                    View all records
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M5 12h14" />
                      <path d="M13 6l6 6-6 6" />
                    </svg>
                  </Link>
                </div>
              </div>

              <div className="dashboard-side">
                <div>
                  <h2 className="block-title">Score distribution</h2>
                  <div className="block-sub" style={{ marginBottom: 22 }}>
                    All {compact(data.stats.scored.total)} applicants · graded, not binary
                  </div>

                  <div className="histogram">
                    {data.distribution.bins.map((bin) => {
                      const peak = Math.max(...data.distribution.bins.map((b) => b.pct));
                      const isModal = bin.pct === peak;
                      return (
                        <div
                          key={bin.from}
                          className={`histogram-bar${isModal ? " is-modal" : ""}`}
                          style={{ height: `${(bin.pct / peak) * 100}%` }}
                          title={`${bin.from}–${bin.to}: ${bin.pct}%${isModal ? " — modal band" : ""}`}
                        />
                      );
                    })}
                  </div>
                  <div className="histogram-scale">
                    <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
                  </div>

                  <div className="tier-share">
                    <div className="tier-share-cell">
                      <div className="tier-share-label">Low risk</div>
                      <div className="tier-share-value">{data.distribution.tierShare.low_risk}%</div>
                    </div>
                    <div className="tier-share-cell">
                      <div className="tier-share-label">Moderate</div>
                      <div className="tier-share-value">{data.distribution.tierShare.moderate}%</div>
                    </div>
                    <div className="tier-share-cell">
                      <div className="tier-share-label is-accent">High risk</div>
                      <div className="tier-share-value is-accent">{data.distribution.tierShare.high_risk}%</div>
                    </div>
                  </div>
                </div>

                {data.explainer && (
                  <div className="explainer-card">
                    <div className="explainer-kicker">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2">
                        <path d="M3 17l6-6 4 4 8-8" />
                      </svg>
                      <span>Transparency</span>
                    </div>
                    <h3 className="explainer-title">How a score is reached</h3>
                    <p className="explainer-body">
                      Applicant {data.explainer.record.id} sits in more than one output set at once.
                      The score is the centroid of their union — no threshold, no black box.
                    </p>

                    <AggregatedOutputChart
                      aggregated={data.explainer.score.aggregated}
                      centroid={data.explainer.score.centroid}
                      showTitle={false}
                    />

                    <div className="explainer-divider" />

                    <div className="section-label">
                      Rules fired · {data.explainer.score.firedCount} of {data.explainer.score.ruleCount}
                    </div>
                    <div className="rules-list">
                      {data.explainer.score.firedRules.slice(0, 3).map((rule) => (
                        <div key={rule.id}>
                          <div className="rule-row">
                            <span>IF {rule.text}</span>
                            <span className="rule-mu">{rule.mu.toFixed(2)}</span>
                          </div>
                          <div className="rule-track">
                            <div
                              className="rule-fill"
                              style={{ width: `${Math.round(rule.mu * 100)}%`, background: muColor(rule.mu) }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="explainer-foot">
                      <span className="section-label" style={{ marginBottom: 0 }}>Centroid</span>
                      <span className="explainer-centroid">
                        {data.explainer.score.centroid.toFixed(1)}
                      </span>
                      <Link className="rules-link" to="/records" style={{ marginLeft: "auto" }}>
                        Full trace →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <div className="page-foot">
              <span>
                CreditSense · Mamdani fuzzy inference · {data.explainer?.score.ruleCount ?? 27} rule
                space, 3 antecedents
              </span>
              <span>Academic prototype — scores are not lending decisions</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
