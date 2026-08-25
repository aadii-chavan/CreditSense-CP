import type { Consequent } from "./score";

/** Which antecedent a rule clause refers to. */
export type VariableKey = "income" | "repaymentHistory" | "dti";

/** A triangular fuzzy set: feet at `a` and `c`, peak at `b`. */
export interface FuzzySetDefinition {
  name: string;
  label: string;
  a: number;
  b: number;
  c: number;
}

/** One linguistic variable and the sets defined over its universe. */
export interface LinguisticVariable {
  key: VariableKey | "creditworthiness";
  label: string;
  /** Unit the breakpoints are expressed in, e.g. "₹ thousands" or "%". */
  unit: string;
  domain: [number, number];
  sets: FuzzySetDefinition[];
}

/** `variable IS set` — one clause of a rule's antecedent. */
export interface RuleClause {
  variable: VariableKey;
  set: string;
}

export interface RuleDefinition {
  id: string;
  /** Clauses combined with AND (min). */
  antecedents: RuleClause[];
  consequent: Consequent;
  /** Rule weight, 0–1; scales the firing strength. */
  weight: number;
  active: boolean;
  /** Human-readable rendering, e.g. "income high ∧ repayment strong". */
  text: string;
  /** Share of stored records this rule fired on, 0–100. */
  firesOnPct: number;
}

export interface RuleBaseVersion {
  version: string;
  summary: string;
  author: string;
  timestamp: string;
  /** True for the version currently scoring new applications. */
  published: boolean;
}

export interface RuleBaseResponse {
  engineVersion: string;
  antecedents: LinguisticVariable[];
  output: LinguisticVariable;
  rules: RuleDefinition[];
  /** Size of the full antecedent space, e.g. 27. */
  ruleSpaceSize: number;
  versions: RuleBaseVersion[];
}

/** A staged, unpublished change to the rule base. */
export type StagedEdit =
  | { kind: "peak"; variable: VariableKey; set: string; from: number; to: number }
  | { kind: "consequent"; ruleId: string; from: Consequent; to: Consequent }
  | { kind: "active"; ruleId: string; from: boolean; to: boolean };

export interface DryRunRequest {
  edits: StagedEdit[];
}

export interface DryRunResponse {
  /** Records the staged base was replayed against. */
  recordsEvaluated: number;
  /** Records whose score changed at all. */
  recordsAffected: number;
  /** Change in mean score, staged minus current. */
  meanShift: number;
  /** Records that would move to a different tier. */
  tierChanges: number;
  /** Percentage per 10-point bin, current base then staged base. */
  currentBins: number[];
  stagedBins: number[];
}
