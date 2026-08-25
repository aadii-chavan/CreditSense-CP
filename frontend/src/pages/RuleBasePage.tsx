import { useCallback, useMemo, useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { PageError, PageLoading } from "../components/PageState";
import { MembershipChart } from "../components/MembershipChart";
import { RuleMatrix } from "../components/RuleMatrix";
import { useApi } from "../hooks/useApi";
import { getRuleBase, postDryRun } from "../api/client";
import type {
  DryRunResponse,
  LinguisticVariable,
  RuleDefinition,
  StagedEdit,
  VariableKey,
} from "../types/rules";
import type { Consequent } from "../types/score";

const CONSEQUENTS: Consequent[] = ["low", "moderate", "high"];
const CONSEQUENT_LABEL: Record<Consequent, string> = { high: "High", moderate: "Moderate", low: "Low" };

const AXIS_PAIRS: { id: string; label: string; row: VariableKey; col: VariableKey }[] = [
  { id: "income-repay", label: "Income × repayment", row: "income", col: "repaymentHistory" },
  { id: "income-dti", label: "Income × DTI", row: "income", col: "dti" },
  { id: "dti-repay", label: "DTI × repayment", row: "dti", col: "repaymentHistory" },
];

export function RuleBasePage() {
  const fetcher = useCallback((signal: AbortSignal) => getRuleBase(signal), []);
  const { data, status, error, refetch } = useApi(fetcher);

  // Staged, unpublished edits. Nothing here touches live scoring until publish.
  const [peaks, setPeaks] = useState<Record<string, number>>({});
  const [consequents, setConsequents] = useState<Record<string, Consequent>>({});
  const [actives, setActives] = useState<Record<string, boolean>>({});
  const [showAllRules, setShowAllRules] = useState(false);
  const [axis, setAxis] = useState(AXIS_PAIRS[0]!);
  const [dryRun, setDryRun] = useState<DryRunResponse | null>(null);
  const [dryRunning, setDryRunning] = useState(false);
  const [dryRunError, setDryRunError] = useState<string | null>(null);

  /** The staged edits, expressed against the published base. */
  const edits: StagedEdit[] = useMemo(() => {
    if (!data) return [];
    const out: StagedEdit[] = [];
    for (const variable of data.antecedents) {
      for (const s of variable.sets) {
        const staged = peaks[`${variable.key}.${s.name}`];
        if (staged !== undefined && staged !== s.b) {
          out.push({ kind: "peak", variable: variable.key as VariableKey, set: s.name, from: s.b, to: staged });
        }
      }
    }
    for (const rule of data.rules) {
      const c = consequents[rule.id];
      if (c && c !== rule.consequent) {
        out.push({ kind: "consequent", ruleId: rule.id, from: rule.consequent, to: c });
      }
      const a = actives[rule.id];
      if (a !== undefined && a !== rule.active) {
        out.push({ kind: "active", ruleId: rule.id, from: rule.active, to: a });
      }
    }
    return out;
  }, [data, peaks, consequents, actives]);

  const editedRuleIds = useMemo(
    () => new Set(edits.flatMap((e) => ("ruleId" in e ? [e.ruleId] : []))),
    [edits],
  );

  /** The base as staged, for the matrix and rule list to render. */
  const stagedRules: RuleDefinition[] = useMemo(
    () =>
      (data?.rules ?? []).map((rule) => ({
        ...rule,
        consequent: consequents[rule.id] ?? rule.consequent,
        active: actives[rule.id] ?? rule.active,
      })),
    [data, consequents, actives],
  );

  const discard = () => {
    setPeaks({});
    setConsequents({});
    setActives({});
    setDryRun(null);
    setDryRunError(null);
  };

  const runDryRun = async () => {
    setDryRunning(true);
    setDryRunError(null);
    try {
      setDryRun(await postDryRun({ edits }));
    } catch (err) {
      setDryRunError(err instanceof Error ? err.message : "Dry run failed.");
    } finally {
      setDryRunning(false);
    }
  };

  const variableByKey = useMemo(
    () =>
      Object.fromEntries((data?.antecedents ?? []).map((v) => [v.key, v])) as Record<
        VariableKey,
        LinguisticVariable | undefined
      >,
    [data],
  );
  const nextVersion = data ? `${data.engineVersion.split(".")[0]}.${Number(data.engineVersion.split(".")[1]) + 1}` : "";
  const visibleRules = showAllRules ? stagedRules : stagedRules.slice(0, 6);

  return (
    <div className="page">
      <AppHeader>
        <span className="tag" style={{ border: "1px solid var(--color-accent)", color: "var(--color-accent)" }}>
          Admin view
        </span>
      </AppHeader>

      <main className="page-main">
        <div className="page-head">
          <div>
            <div className="page-kicker">
              Rule base · engine v{data?.engineVersion ?? "—"}
            </div>
            <h1 className="page-title">
              Membership functions
              <br />
              and {data?.rules.length ?? "—"} rules
            </h1>
            <p className="page-lede">
              Edit the peak of each linguistic set, or the consequent of any rule. Changes are
              staged — nothing is applied to live records until you publish a new engine version.
            </p>
          </div>
          <div className="page-actions">
            <button
              className="btn btn-secondary"
              style={{ height: 42, padding: "0 16px" }}
              type="button"
              disabled={edits.length === 0}
              onClick={discard}
            >
              Discard changes
            </button>
            {/* Publishing needs POST /api/rules/publish — not yet specced. */}
            <button
              className="btn btn-primary"
              style={{ height: 42, padding: "0 18px", gap: 9 }}
              type="button"
              disabled={edits.length === 0}
              title={edits.length === 0 ? "No staged changes to publish" : undefined}
            >
              Publish v{nextVersion || "—"}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 19V5" />
                <path d="M6 11l6-6 6 6" />
              </svg>
            </button>
          </div>
        </div>

        {status === "error" && !data ? (
          <PageError message={error ?? "Unknown error."} onRetry={refetch} />
        ) : !data ? (
          <PageLoading label="Loading rule base…" />
        ) : (
          <>
            <section className="mf-section">
              <div className="block-head">
                <h2 className="block-title">Antecedent variables</h2>
                <span className="block-sub">Triangular sets · type a peak to stage a change</span>
              </div>
              <div className="mf-grid">
                {data.antecedents.map((variable) => (
                  <div key={variable.key} className="mf-cell">
                    <div className="mf-head">
                      <div className="mf-name">{variable.label}</div>
                      <div className="mf-range">
                        {variable.domain[0]} – {variable.domain[1]} {variable.unit}
                      </div>
                    </div>
                    <MembershipChart
                      variable={variable}
                      peaks={Object.fromEntries(
                        variable.sets
                          .map((s) => [s.name, peaks[`${variable.key}.${s.name}`]])
                          .filter(([, v]) => v !== undefined) as [string, number][],
                      )}
                    />
                    <div className="mf-fields">
                      {variable.sets.map((s) => {
                        const key = `${variable.key}.${s.name}`;
                        const value = peaks[key] ?? s.b;
                        return (
                          <div className="field" key={s.name}>
                            <label htmlFor={`peak-${key}`}>{s.label} peak</label>
                            <input
                              id={`peak-${key}`}
                              className={`input${value !== s.b ? " is-edited" : ""}`}
                              type="number"
                              min={variable.domain[0]}
                              max={variable.domain[1]}
                              value={value}
                              onChange={(e) => {
                                const next = Number(e.target.value);
                                setPeaks((p) => ({ ...p, [key]: next }));
                                setDryRun(null);
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rules-grid">
              <div className="rules-main">
                <div className="block-head">
                  <h2 className="block-title">Rule matrix</h2>
                  <select
                    className="input filter-select"
                    aria-label="Matrix axes"
                    value={axis.id}
                    onChange={(e) => setAxis(AXIS_PAIRS.find((p) => p.id === e.target.value)!)}
                  >
                    {AXIS_PAIRS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
                <p className="block-sub" style={{ margin: "0 0 18px" }}>
                  Each cell shows the rule governing that antecedent pair, out of a{" "}
                  {data.ruleSpaceSize}-combination space. A rule with a single clause — R-25,
                  “repayment weak” — covers every cell it matches, so it repeats across a slice.
                </p>

                <RuleMatrix
                  rules={stagedRules}
                  rowVariable={variableByKey[axis.row]!}
                  colVariable={variableByKey[axis.col]!}
                  editedIds={editedRuleIds}
                />

                <h2 className="block-title" style={{ margin: "36px 0 14px" }}>Rule list</h2>
                <table className="table">
                  <thead>
                    <tr>
                      <th className="col-first" style={{ width: 64 }}>Rule</th>
                      <th>Antecedent</th>
                      <th style={{ width: 150 }}>Consequent</th>
                      <th style={{ width: 80 }}>Weight</th>
                      <th style={{ width: 140 }}>Fires on</th>
                      <th className="col-last" style={{ width: 80 }}>Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRules.map((rule) => {
                      const edited = editedRuleIds.has(rule.id);
                      return (
                        <tr key={rule.id} className={edited ? "is-edited-row" : undefined}>
                          <td className="col-first mono">{rule.id}</td>
                          <td>{rule.text}</td>
                          <td>
                            <select
                              className="input consequent-select"
                              aria-label={`${rule.id} consequent`}
                              value={rule.consequent}
                              onChange={(e) => {
                                setConsequents((c) => ({ ...c, [rule.id]: e.target.value as Consequent }));
                                setDryRun(null);
                              }}
                            >
                              {CONSEQUENTS.map((c) => (
                                <option key={c} value={c}>{CONSEQUENT_LABEL[c]}</option>
                              ))}
                            </select>
                          </td>
                          <td>{rule.weight.toFixed(2)}</td>
                          <td className="row-rule">{rule.firesOnPct}% of records</td>
                          <td className="col-last">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={rule.active}
                              aria-label={`${rule.id} active`}
                              className={`toggle${rule.active ? " is-on" : ""}`}
                              onClick={() => {
                                setActives((a) => ({ ...a, [rule.id]: !rule.active }));
                                setDryRun(null);
                              }}
                            >
                              <span className="toggle-knob" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="block-foot">
                  <span className="block-sub">
                    {visibleRules.length} of {stagedRules.length} rules shown ·{" "}
                    {edits.length === 0 ? "no staged edits" : `${edits.length} staged edit${edits.length > 1 ? "s" : ""}`}
                  </span>
                  {stagedRules.length > 6 && (
                    <button className="btn btn-ghost" type="button" onClick={() => setShowAllRules((v) => !v)}>
                      {showAllRules ? "Show fewer rules" : "Show all rules"}
                    </button>
                  )}
                </div>
              </div>

              <div className="rules-side">
                <div className="rules-side-sticky">
                  <div className="section-label">Staged impact</div>

                  <div className="score-card">
                    {edits.length === 0 ? (
                      <>
                        <h3 className="explainer-title">No staged changes</h3>
                        <p className="explainer-body" style={{ marginBottom: 0 }}>
                          Edit a set peak, a consequent or a rule's active flag, then dry-run the
                          staged base against the stored records to see what would move.
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="explainer-title">
                          {edits.length} staged edit{edits.length > 1 ? "s" : ""}
                        </h3>
                        <ul className="edit-list">
                          {edits.map((edit, i) => (
                            <li key={i}>
                              {edit.kind === "peak" &&
                                `${edit.variable} · ${edit.set} peak ${edit.from} → ${edit.to}`}
                              {edit.kind === "consequent" &&
                                `${edit.ruleId} consequent ${edit.from} → ${edit.to}`}
                              {edit.kind === "active" &&
                                `${edit.ruleId} ${edit.to ? "re-enabled" : "disabled"}`}
                            </li>
                          ))}
                        </ul>

                        {dryRun ? (
                          <>
                            <p className="explainer-body">
                              Replayed against {dryRun.recordsEvaluated} stored records. Dashed
                              outline is the current distribution; bars are the staged one.
                            </p>
                            <div className="impact-chart">
                              {dryRun.stagedBins.map((pct, i) => {
                                const peak = Math.max(...dryRun.stagedBins, ...dryRun.currentBins) || 1;
                                const changed = Math.abs(pct - (dryRun.currentBins[i] ?? 0)) > 0.05;
                                return (
                                  <div
                                    key={i}
                                    className={`impact-bar${changed ? " is-changed" : ""}`}
                                    style={{ height: `${(pct / peak) * 100}%` }}
                                    title={`${i * 10}–${i * 10 + 10}: ${pct}% (was ${dryRun.currentBins[i]}%)`}
                                  />
                                );
                              })}
                              <svg viewBox="0 0 300 120" preserveAspectRatio="none" className="impact-overlay">
                                <polyline
                                  points={dryRun.currentBins
                                    .map((pct, i) => {
                                      const peak = Math.max(...dryRun.stagedBins, ...dryRun.currentBins) || 1;
                                      const x = (i + 0.5) * (300 / dryRun.currentBins.length);
                                      return `${x.toFixed(1)},${(120 - (pct / peak) * 120).toFixed(1)}`;
                                    })
                                    .join(" ")}
                                  fill="none"
                                  stroke="var(--color-text)"
                                  strokeWidth="1.2"
                                  strokeDasharray="4 3"
                                  vectorEffect="non-scaling-stroke"
                                />
                              </svg>
                            </div>
                            <div className="impact-scale"><span>0</span><span>50</span><span>100</span></div>

                            <div className="impact-stats">
                              <div className="impact-stat">
                                <div className="tier-share-label">Mean shift</div>
                                <div className="impact-value">
                                  {dryRun.meanShift > 0 ? "+" : ""}{dryRun.meanShift.toFixed(1)}
                                </div>
                              </div>
                              <div className="impact-stat">
                                <div className="tier-share-label">Tier changes</div>
                                <div className="impact-value is-accent">{dryRun.tierChanges}</div>
                              </div>
                            </div>
                            <div className="block-sub" style={{ marginTop: 12 }}>
                              {dryRun.recordsAffected} of {dryRun.recordsEvaluated} records change score.
                            </div>
                          </>
                        ) : (
                          <p className="explainer-body">
                            Dry-run the staged base to see how the distribution would move before
                            publishing.
                          </p>
                        )}

                        {dryRunError && <p className="dry-run-error" role="alert">{dryRunError}</p>}

                        <button
                          className="btn btn-secondary btn-block"
                          style={{ marginTop: 20, height: 40, justifyContent: "center" }}
                          type="button"
                          disabled={dryRunning}
                          onClick={runDryRun}
                        >
                          {dryRunning ? "Replaying records…" : "Dry-run against stored records"}
                        </button>
                      </>
                    )}
                  </div>

                  <div className="rules-divider" />
                  <div className="section-label">Version history</div>
                  <div className="version-list">
                    {edits.length > 0 && (
                      <div className="version-row">
                        <span className="version-tag">v{nextVersion}</span>
                        <div>
                          <div className="version-summary">
                            Staged · {edits.length} unpublished edit{edits.length > 1 ? "s" : ""}
                          </div>
                          <div className="version-meta">R. Venkatesan · not yet published</div>
                        </div>
                      </div>
                    )}
                    {data.versions.map((v) => (
                      <div className="version-row" key={v.version}>
                        <span className="version-tag">v{v.version}</span>
                        <div>
                          <div className="version-summary">
                            {v.summary}
                            {v.published && <span className="version-live"> · live</span>}
                          </div>
                          <div className="version-meta">
                            {v.author} ·{" "}
                            {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(
                              new Date(v.timestamp),
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="block-sub" style={{ marginTop: 18 }}>
                    Published versions are immutable — every record stores the version that scored it.
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
