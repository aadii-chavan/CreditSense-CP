import type { FiredRule } from "../types/score";
import { Link } from "react-router-dom";
import { muColor } from "../lib/format";

interface Props {
  rules?: FiredRule[];
  /** How many of the strongest rules to list. */
  limit?: number;
}

/** The strongest rules from this pass, with their firing strengths. */
export function FiredRules({ rules, limit = 4 }: Props) {
  const shown = (rules ?? []).slice(0, limit);

  return (
    <>
      <div className="rules-divider" />
      <div className="rules-head">
        <div className="section-label" style={{ marginBottom: 0 }}>Active rules</div>
        <Link className="rules-link" to="/rules">Edit rule base →</Link>
      </div>

      {shown.length === 0 ? (
        <p className="rules-empty">
          {rules ? "No rule fires on these inputs." : "Waiting for the first inference pass."}
        </p>
      ) : (
        <div className="rules-list">
          {shown.map((rule) => (
            <div key={rule.id}>
              <div className="rule-row">
                <span>{rule.text}</span>
                <span className="rule-mu">{rule.mu.toFixed(2)}</span>
              </div>
              <div
                className="rule-track"
                role="meter"
                aria-label={`${rule.text} firing strength`}
                aria-valuenow={Number(rule.mu.toFixed(2))}
                aria-valuemin={0}
                aria-valuemax={1}
              >
                <div
                  className="rule-fill"
                  style={{ width: `${Math.round(rule.mu * 100)}%`, background: muColor(rule.mu) }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
