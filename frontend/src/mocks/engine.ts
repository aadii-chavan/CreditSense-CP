/**
 * ⚠️ DEV-ONLY MOCK ENGINE — DELETE WHEN THE PYTHON BACKEND LANDS. ⚠️
 *
 * A faithful stand-in for the Mamdani engine that will live in FastAPI, shared
 * by every mocked endpoint so the four pages agree with one another. Its
 * parameters are the spec the Python implementation should be built to; see the
 * reference table in the project README.
 */

import type {
  Consequent,
  FiredRule,
  MembershipDegree,
  ScoreRequest,
  ScoreResponse,
  Tier,
} from "../types/score";
import type {
  FuzzySetDefinition,
  LinguisticVariable,
  RuleDefinition,
  VariableKey,
} from "../types/rules";

/** Triangular membership function with feet at `a`/`c` and peak at `b`. */
export function tri(x: number, a: number, b: number, c: number): number {
  if (x <= a || x >= c) return 0;
  if (x === b) return 1;
  return x < b ? (x - a) / (b - a) : (c - x) / (c - b);
}

const set = (name: string, label: string, a: number, b: number, c: number): FuzzySetDefinition =>
  ({ name, label, a, b, c });

/** Income is fuzzified on a ₹-thousands scale so the breakpoints stay readable. */
export const INCOME: LinguisticVariable = {
  key: "income",
  label: "Monthly income",
  unit: "₹ thousands",
  domain: [0, 60],
  sets: [set("low", "Low", -1, 0, 20), set("moderate", "Moderate", 12, 28, 45), set("high", "High", 35, 60, 61)],
};

export const REPAYMENT: LinguisticVariable = {
  key: "repaymentHistory",
  label: "Repayment history",
  unit: "% on time",
  domain: [0, 100],
  sets: [set("weak", "Weak", -1, 0, 45), set("fair", "Fair", 30, 55, 80), set("strong", "Strong", 65, 100, 101)],
};

export const DTI: LinguisticVariable = {
  key: "dti",
  label: "Debt-to-income",
  unit: "%",
  domain: [0, 100],
  sets: [set("low", "Low", -1, 0, 30), set("medium", "Medium", 20, 45, 70), set("high", "High", 55, 100, 101)],
};

export const CREDITWORTHINESS: LinguisticVariable = {
  key: "creditworthiness",
  label: "Creditworthiness",
  unit: "score",
  domain: [0, 100],
  sets: [set("low", "Low", -1, 0, 45), set("moderate", "Moderate", 25, 50, 75), set("high", "High", 55, 100, 101)],
};

export const VARIABLES: Record<VariableKey, LinguisticVariable> = {
  income: INCOME,
  repaymentHistory: REPAYMENT,
  dti: DTI,
};

const VARIABLE_WORD: Record<VariableKey, string> = {
  income: "income",
  repaymentHistory: "repayment",
  dti: "DTI",
};

/**
 * The published rule base. Ten rules over a 3×3×3 antecedent space — a rule with
 * one clause (R-25, R-22) deliberately covers a whole slice of that space.
 */
export const RULES: Omit<RuleDefinition, "text" | "firesOnPct">[] = [
  { id: "R-01", antecedents: [{ variable: "income", set: "high" }, { variable: "repaymentHistory", set: "strong" }], consequent: "high", weight: 1, active: true },
  { id: "R-04", antecedents: [{ variable: "income", set: "moderate" }, { variable: "repaymentHistory", set: "strong" }], consequent: "high", weight: 1, active: true },
  { id: "R-07", antecedents: [{ variable: "dti", set: "low" }, { variable: "repaymentHistory", set: "strong" }], consequent: "high", weight: 1, active: true },
  { id: "R-09", antecedents: [{ variable: "income", set: "high" }, { variable: "repaymentHistory", set: "fair" }], consequent: "moderate", weight: 1, active: true },
  { id: "R-12", antecedents: [{ variable: "income", set: "moderate" }, { variable: "repaymentHistory", set: "fair" }], consequent: "moderate", weight: 1, active: true },
  { id: "R-15", antecedents: [{ variable: "dti", set: "medium" }, { variable: "repaymentHistory", set: "fair" }], consequent: "moderate", weight: 1, active: true },
  { id: "R-18", antecedents: [{ variable: "income", set: "low" }, { variable: "repaymentHistory", set: "strong" }], consequent: "moderate", weight: 1, active: true },
  { id: "R-19", antecedents: [{ variable: "income", set: "low" }, { variable: "repaymentHistory", set: "fair" }], consequent: "low", weight: 1, active: true },
  { id: "R-22", antecedents: [{ variable: "dti", set: "high" }], consequent: "low", weight: 1, active: true },
  { id: "R-25", antecedents: [{ variable: "repaymentHistory", set: "weak" }], consequent: "low", weight: 1, active: true },
];

export const RULE_SPACE_SIZE = 27;
export const ENGINE_VERSION = "1.2";
const EPSILON = 0.01;

/** "income high ∧ repayment strong" */
export function clauseText(rule: Pick<RuleDefinition, "antecedents">): string {
  return rule.antecedents
    .map((c) => `${VARIABLE_WORD[c.variable]} ${c.set}`)
    .join(" ∧ ");
}

/** "income high AND repayment strong → high" */
export function ruleText(rule: Pick<RuleDefinition, "antecedents" | "consequent">): string {
  const body = rule.antecedents
    .map((c) => `${VARIABLE_WORD[c.variable]} ${c.set}`)
    .join(" AND ");
  return `${body} → ${rule.consequent}`;
}

function degrees(value: number, variable: LinguisticVariable): MembershipDegree[] {
  return variable.sets.map((s) => ({ set: s.name, label: s.label, mu: tri(value, s.a, s.b, s.c) }));
}

const muOf = (list: MembershipDegree[], name: string): number =>
  list.find((d) => d.set === name)?.mu ?? 0;

export function evaluate(req: ScoreRequest): ScoreResponse {
  const income = degrees(req.income / 1000, INCOME);
  const repaymentHistory = degrees(req.repaymentHistory, REPAYMENT);
  const dti = degrees(req.dti, DTI);
  const byVariable: Record<VariableKey, MembershipDegree[]> = { income, repaymentHistory, dti };

  // Firing strength: min over the antecedent clauses, scaled by the rule weight.
  const evaluated: FiredRule[] = RULES.filter((r) => r.active).map((rule) => ({
    id: rule.id,
    text: ruleText(rule),
    mu:
      rule.weight *
      Math.min(...rule.antecedents.map((c) => muOf(byVariable[c.variable], c.set))),
    consequent: rule.consequent,
  }));

  // Mamdani implication (min-clip), then max-aggregation per consequent set.
  const clip: Record<Consequent, number> = { low: 0, moderate: 0, high: 0 };
  for (const rule of evaluated) {
    clip[rule.consequent] = Math.max(clip[rule.consequent], rule.mu);
  }

  const xs: number[] = [];
  const mus: number[] = [];
  let numerator = 0;
  let denominator = 0;
  for (let x = 0; x <= 100; x += 1) {
    const aggregated = CREDITWORTHINESS.sets.reduce(
      (acc, s) => Math.max(acc, Math.min(clip[s.name as Consequent], tri(x, s.a, s.b, s.c))),
      0,
    );
    xs.push(x);
    mus.push(aggregated);
    numerator += x * aggregated;
    denominator += aggregated;
  }

  // Centroid defuzzification.
  const score = denominator ? numerator / denominator : 0;
  const fired = evaluated.filter((r) => r.mu > EPSILON).sort((a, b) => b.mu - a.mu);

  return {
    score,
    tier: tierOf(score),
    tierLabel: tierLabelOf(tierOf(score)),
    memberships: { income, repaymentHistory, dti },
    firedRules: fired,
    firedCount: fired.length,
    ruleCount: RULE_SPACE_SIZE,
    aggregated: { domain: [0, 100], x: xs, mu: mus },
    centroid: score,
    engine: {
      implication: "min",
      aggregation: "max",
      defuzzification: "centroid",
      version: `mock-${ENGINE_VERSION}`,
    },
  };
}

/** Band boundaries: under 45 high risk, 45–65 moderate, 65 and over low risk. */
export function tierOf(score: number): Tier {
  return score >= 65 ? "low_risk" : score >= 45 ? "moderate" : "high_risk";
}

export function tierLabelOf(tier: Tier): string {
  return tier === "low_risk" ? "Low risk" : tier === "moderate" ? "Moderate" : "High risk";
}

/** Resolves a promise after `ms`, honouring an abort signal — stands in for the network. */
export function withLatency<T>(value: () => T, signal?: AbortSignal, ms = 90): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve(value());
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
