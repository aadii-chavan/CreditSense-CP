import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { SearchField } from "../components/SearchField";
import { Segmented } from "../components/Segmented";
import { PageError, PageLoading } from "../components/PageState";
import { TierTag } from "../components/TierTag";
import { PositionBar } from "../components/PositionBar";
import { Pagination } from "../components/Pagination";
import { useApi } from "../hooks/useApi";
import { getRecords } from "../api/client";
import { STATUS_LABEL, compact, fullWhen } from "../lib/format";
import { stagger } from "../lib/motion";
import { CountUp } from "../components/CountUp";
import type {
  PeriodFilter,
  RecordsQuery,
  StatusFilter,
  TierFilter,
} from "../types/records";

const TIER_OPTIONS: { value: TierFilter; label: string }[] = [
  { value: "all", label: "All tiers" },
  { value: "low_risk", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high_risk", label: "High" },
];
const PERIODS: { value: PeriodFilter; label: string }[] = [
  { value: "30d", label: "Last 30 days" },
  { value: "7d", label: "Last 7 days" },
  { value: "quarter", label: "This quarter" },
  { value: "all", label: "All time" },
];
const STATUSES: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "committed", label: "Committed" },
  { value: "under_review", label: "Under review" },
  { value: "referred", label: "Referred" },
];

const DEFAULTS = {
  tier: "all" as TierFilter,
  period: "all" as PeriodFilter,
  status: "all" as StatusFilter,
  engineVersion: "all",
  search: "",
};

export function RecordsPage() {
  const [filters, setFilters] = useState(DEFAULTS);
  const [page, setPage] = useState(1);

  // Any filter change starts the listing again from the first page.
  useEffect(() => setPage(1), [filters]);

  const query: RecordsQuery = { ...filters, page, pageSize: 12 };
  const { tier, period, status, engineVersion, search } = filters;
  const fetcher = useCallback(
    (signal: AbortSignal) =>
      getRecords({ tier, period, status, engineVersion, search, page, pageSize: 12 }, signal),
    [tier, period, status, engineVersion, search, page],
  );
  // Typing in the search box debounces; other changes fetch immediately.
  const { data, status: reqStatus, error, isStale, refetch } = useApi(fetcher, 150);

  const isFiltered = JSON.stringify(filters) !== JSON.stringify(DEFAULTS);
  const from = data ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.filtered) : 0;

  return (
    <div className="page">
      <AppHeader>
        <SearchField
          value={filters.search}
          onChange={(next) => setFilters((f) => ({ ...f, search: next }))}
        />
      </AppHeader>

      <main className="page-main">
        <div className="page-head">
          <div>
            <div className="page-kicker">Records</div>
            <h1 className="page-title">
              {data ? `${compact(data.total)} scored applicants` : "Scored applicants"}
            </h1>
            <p className="page-lede">
              Every row keeps its full inference trace — inputs, membership degrees, rules fired and
              the engine version that produced it.
            </p>
          </div>
          <div className="page-actions">
            <button className="btn btn-secondary" style={{ height: 42, padding: "0 16px", gap: 8 }} type="button">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v12" />
                <path d="M7 10l5 5 5-5" />
                <path d="M4 21h16" />
              </svg>
              Export CSV
            </button>
            <Link className="btn btn-primary" to="/assess" style={{ height: 42, padding: "0 18px", gap: 9 }}>
              New assessment
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M5 12h14" />
                <path d="M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        </div>

        {reqStatus === "error" && !data ? (
          <PageError message={error ?? "Unknown error."} onRetry={refetch} />
        ) : (
          <>
            <section className="stat-strip stat-strip-sm">
              <div className="stat-cell">
                <div className="section-label">Filtered set</div>
                <div className="stat-value stat-value-sm">
                  <CountUp value={data ? data.summary.filtered : null} grouped />
                </div>
              </div>
              <div className="stat-cell">
                <div className="section-label">Mean score</div>
                <div className="stat-value stat-value-sm">
                  <CountUp value={data ? data.summary.meanScore : null} decimals={1} />
                </div>
              </div>
              <div className="stat-cell">
                <div className="section-label">Under review</div>
                <div className="stat-value stat-value-sm">
                  <CountUp value={data ? data.summary.underReview : null} />
                </div>
              </div>
              <div className="stat-cell">
                <div className="section-label">Scored on an older engine</div>
                <div className="stat-value stat-value-sm">
                  <CountUp value={data ? data.summary.rescoredAfterRuleEdit : null} />
                </div>
              </div>
            </section>

            <div className="filter-bar">
              <Segmented
                name="records-tier"
                ariaLabel="Filter by risk tier"
                value={filters.tier}
                options={TIER_OPTIONS}
                onChange={(next) => setFilters((f) => ({ ...f, tier: next }))}
              />
              <select
                className="input filter-select"
                aria-label="Time period"
                value={filters.period}
                onChange={(e) => setFilters((f) => ({ ...f, period: e.target.value as PeriodFilter }))}
              >
                {PERIODS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select
                className="input filter-select"
                aria-label="Status"
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as StatusFilter }))}
              >
                {STATUSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select
                className="input filter-select"
                aria-label="Engine version"
                value={filters.engineVersion}
                onChange={(e) => setFilters((f) => ({ ...f, engineVersion: e.target.value }))}
              >
                <option value="all">All engine versions</option>
                {(data?.engineVersions ?? []).map((v) => (
                  <option key={v} value={v}>Engine v{v}{v === "1.2" ? " (current)" : ""}</option>
                ))}
              </select>
              <button
                className="btn btn-ghost"
                type="button"
                style={{ marginLeft: "auto" }}
                disabled={!isFiltered}
                onClick={() => setFilters(DEFAULTS)}
              >
                Clear filters
              </button>
            </div>

            {!data ? (
              <PageLoading label="Loading records…" />
            ) : (
              <div className={isStale ? "is-stale" : undefined}>
                <table className="table records-table" style={{ marginTop: 6 }}>
                  <thead>
                    <tr>
                      <th className="col-first">Applicant</th>
                      <th>Score</th>
                      <th style={{ width: 170 }}>Position</th>
                      <th>Tier</th>
                      <th>Dominant rule</th>
                      <th>Status</th>
                      <th className="col-last">Scored</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row, i) => (
                      <tr
                        key={`${data.page}-${row.id}`}
                        className="anim-row"
                        style={stagger(i)}
                      >
                        <td className="col-first">
                          <div className="row-name">{row.name}</div>
                          <div className="row-meta">{row.id} · {row.location}</div>
                        </td>
                        <td>
                          <span
                            className="row-score row-score-sm"
                            style={row.tier === "high_risk" ? { color: "var(--color-accent-700)" } : undefined}
                          >
                            {row.score}
                          </span>
                        </td>
                        <td><PositionBar score={row.score} tier={row.tier} /></td>
                        <td><TierTag tier={row.tier} label={row.tierLabel} /></td>
                        <td className="row-rule">
                          {row.dominantRule.id} {row.dominantRule.text}{" "}
                          <span className="row-rule-mu">{row.dominantRule.mu.toFixed(2)}</span>
                        </td>
                        <td className="row-status">
                          <span className={row.status === "under_review" ? "is-flagged" : undefined}>
                            {STATUS_LABEL[row.status]}
                          </span>
                        </td>
                        <td className="col-last">{fullWhen(row.scoredAt)}</td>
                      </tr>
                    ))}
                    {data.rows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="table-empty">
                          No records match these filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div className="block-foot block-foot-wrap">
                  <div className="block-sub">
                    {data.filtered === 0
                      ? "Nothing to show"
                      : `Showing ${from}–${to} of ${compact(data.filtered)}`}
                    {query.pageSize ? " · each row stores its own inference trace" : ""}
                  </div>
                  <Pagination page={data.page} pageCount={data.pageCount} onChange={setPage} />
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
