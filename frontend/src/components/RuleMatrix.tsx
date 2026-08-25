import { TierTag } from "./TierTag";
import type { LinguisticVariable, RuleDefinition, VariableKey } from "../types/rules";
import type { Consequent } from "../types/score";

interface Props {
  rules: RuleDefinition[];
  /** The two antecedents forming the axes; `key` is never the output variable. */
  rowVariable: LinguisticVariable;
  colVariable: LinguisticVariable;
  /** Rules whose consequent or active flag has a staged edit. */
  editedIds: Set<string>;
}

const CONSEQUENT_TIER = {
  high: "low_risk",
  moderate: "moderate",
  low: "high_risk",
} as const;
const CONSEQUENT_LABEL: Record<Consequent, string> = { high: "High", moderate: "Moderate", low: "Low" };

/**
 * Finds the rule governing a cell. A rule with fewer clauses (R-25, "repayment
 * weak") covers every cell its clauses match, which is why one rule can appear
 * across a whole row or column.
 */
function ruleFor(
  rules: RuleDefinition[],
  rowKey: VariableKey,
  rowSet: string,
  colKey: VariableKey,
  colSet: string,
): RuleDefinition | undefined {
  const matches = rules.filter((rule) =>
    rule.antecedents.every(
      (c) =>
        (c.variable === rowKey && c.set === rowSet) ||
        (c.variable === colKey && c.set === colSet),
    ),
  );
  // Prefer the most specific rule covering the cell.
  return matches.sort((a, b) => b.antecedents.length - a.antecedents.length)[0];
}

export function RuleMatrix({ rules, rowVariable, colVariable, editedIds }: Props) {
  const rowKey = rowVariable.key as VariableKey;
  const colKey = colVariable.key as VariableKey;

  return (
    <div className="matrix" style={{ gridTemplateColumns: `140px repeat(${colVariable.sets.length}, 1fr)` }}>
      <div className="matrix-corner">
        {rowVariable.label} ↓ / {colVariable.label} →
      </div>
      {colVariable.sets.map((s) => (
        <div key={s.name} className="matrix-head">{s.label}</div>
      ))}

      {rowVariable.sets.map((rowSet) => (
        <div key={rowSet.name} style={{ display: "contents" }}>
          <div className="matrix-row-head">{rowSet.label}</div>
          {colVariable.sets.map((colSet) => {
            const rule = ruleFor(rules, rowKey, rowSet.name, colKey, colSet.name);
            const edited = rule ? editedIds.has(rule.id) : false;
            return (
              <div key={colSet.name} className={`matrix-cell${edited ? " is-edited" : ""}`}>
                {rule ? (
                  <>
                    <TierTag
                      tier={CONSEQUENT_TIER[rule.consequent]}
                      label={CONSEQUENT_LABEL[rule.consequent]}
                      variant={rule.consequent === "high" ? "outline" : "solid"}
                    />
                    <div className="matrix-meta">
                      {rule.id} · w {rule.weight.toFixed(1)}
                      {!rule.active && " · off"}
                      {edited && " · edited"}
                    </div>
                  </>
                ) : (
                  <span className="matrix-empty" title="No rule covers this combination">—</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
