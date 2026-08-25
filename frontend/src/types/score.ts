/**
 * The wire contract between this frontend and the Python (FastAPI) engine.
 *
 * These types are the single source of truth for `POST /api/score`. The Pydantic
 * models on the backend mirror them field-for-field; if you change one, change
 * both. Nothing in the UI computes fuzzy logic — it only renders what comes back
 * from here.
 */

/** Linguistic tier the defuzzified score falls into. */
export type Tier = "high_risk" | "moderate" | "low_risk";

/** Consequent set a rule points at, in the output universe. */
export type Consequent = "low" | "moderate" | "high";

/** Identity fields — carried for the record, not used by inference. */
export interface Applicant {
  name: string;
  location: string;
  purpose: string;
  /** Amount requested, in whole rupees. */
  amountRequested: number;
}

/** Crisp antecedent values sent to the engine. */
export interface ScoreRequest {
  /** Monthly income in rupees, 0–60000. */
  income: number;
  /** Share of past instalments paid on time, 0–100. */
  repaymentHistory: number;
  /** Debt-to-income ratio as a percentage, 0–100. */
  dti: number;
  /** Optional; echoed back on a committed assessment. */
  applicant?: Applicant;
}

/** One fuzzy set's membership degree for a crisp input. */
export interface MembershipDegree {
  /** Machine name of the set, e.g. "low". */
  set: string;
  /** Display name, e.g. "Low". */
  label: string;
  /** Membership degree, 0–1. */
  mu: number;
}

/** A rule from the base, with the firing strength it reached this pass. */
export interface FiredRule {
  id: string;
  /** Human-readable form, e.g. "income high AND repayment strong → high". */
  text: string;
  /** Firing strength (min of the antecedent degrees), 0–1. */
  mu: number;
  consequent: Consequent;
}

/** The clipped, max-aggregated output set, sampled across its universe. */
export interface AggregatedOutput {
  /** Inclusive domain of the output variable, e.g. [0, 100]. */
  domain: [number, number];
  /** Sample points along the domain, ascending. */
  x: number[];
  /** Membership at each `x`; same length as `x`. */
  mu: number[];
}

/** How the engine was configured for this pass — shown as provenance. */
export interface EngineInfo {
  implication: string;
  aggregation: string;
  defuzzification: string;
  version: string;
}

export interface ScoreResponse {
  /** Defuzzified creditworthiness, 0–100. */
  score: number;
  tier: Tier;
  /** Display form of `tier`, e.g. "Low risk". */
  tierLabel: string;
  /** Fuzzification of each antecedent, keyed by input field. */
  memberships: {
    income: MembershipDegree[];
    repaymentHistory: MembershipDegree[];
    dti: MembershipDegree[];
  };
  /** Every rule that fired above the engine's epsilon, strongest first. */
  firedRules: FiredRule[];
  /** Count of fired rules (may exceed `firedRules.length` if truncated). */
  firedCount: number;
  /** Size of the full rule base, e.g. 27. */
  ruleCount: number;
  aggregated: AggregatedOutput;
  /** x-position of the centroid; equals `score` for centroid defuzzification. */
  centroid: number;
  engine: EngineInfo;
}

/** Shape of a non-2xx response body from the backend. */
export interface ApiErrorBody {
  detail: string;
}
