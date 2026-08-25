/**
 * ⚠️ DEV-ONLY MOCK — DELETE WHEN THE PYTHON BACKEND LANDS. ⚠️
 *
 * The real Mamdani engine lives in the FastAPI service; this file exists only so
 * the frontend can be developed and demoed before that service is written. It is
 * a throwaway stand-in for `POST /api/score`, reached exclusively through
 * `api/client.ts`, so no component ever depends on it.
 *
 * Its parameters are copied from the design prototype and are the spec the
 * Python engine should be built to. When the backend is live: set
 * VITE_USE_MOCK=false, verify, then remove this directory.
 */

import type {
  Consequent,
  FiredRule,
  MembershipDegree,
  ScoreRequest,
  ScoreResponse,
  Tier,
} from "../types/score";

/** Triangular membership function with feet at `a`/`c` and peak at `b`. */
function tri(x: number, a: number, b: number, c: number): number {
  if (x <= a || x >= c) return 0;
  if (x === b) return 1;
  return x < b ? (x - a) / (b - a) : (c - x) / (c - b);
}

/** Income is fuzzified on a ₹-thousands scale, 0–60. */
const INCOME_SETS: Record<string, [number, number, number]> = {
  low: [-1, 0, 20],
  moderate: [12, 28, 45],
  high: [35, 60, 61],
};
const REPAYMENT_SETS: Record<string, [number, number, number]> = {
  weak: [-1, 0, 45],
  fair: [30, 55, 80],
  strong: [65, 100, 101],
};
const DTI_SETS: Record<string, [number, number, number]> = {
  low: [-1, 0, 30],
  medium: [20, 45, 70],
  high: [55, 100, 101],
};
/** Output universe: creditworthiness, 0–100. */
const OUTPUT_SETS: Record<Consequent, [number, number, number]> = {
  low: [-1, 0, 45],
  moderate: [25, 50, 75],
  high: [55, 100, 101],
};

/** The full antecedent space is 3×3×3; this base defines the 10 rules that matter. */
const RULE_COUNT = 27;
const EPSILON = 0.01;
const TITLE = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function degrees(
  value: number,
  sets: Record<string, [number, number, number]>,
): MembershipDegree[] {
  return Object.entries(sets).map(([set, [a, b, c]]) => ({
    set,
    label: TITLE(set),
    mu: tri(value, a, b, c),
  }));
}

const mu = (list: MembershipDegree[], set: string): number =>
  list.find((d) => d.set === set)?.mu ?? 0;

function evaluate(req: ScoreRequest): ScoreResponse {
  const income = degrees(req.income / 1000, INCOME_SETS);
  const repaymentHistory = degrees(req.repaymentHistory, REPAYMENT_SETS);
  const dti = degrees(req.dti, DTI_SETS);

  const I = (s: string) => mu(income, s);
  const R = (s: string) => mu(repaymentHistory, s);
  const D = (s: string) => mu(dti, s);

  const rules: FiredRule[] = [
    ["R1", "income high AND repayment strong → high", Math.min(I("high"), R("strong")), "high"],
    ["R2", "income moderate AND repayment strong → high", Math.min(I("moderate"), R("strong")), "high"],
    ["R3", "DTI low AND repayment strong → high", Math.min(D("low"), R("strong")), "high"],
    ["R4", "income high AND repayment fair → moderate", Math.min(I("high"), R("fair")), "moderate"],
    ["R5", "income moderate AND repayment fair → moderate", Math.min(I("moderate"), R("fair")), "moderate"],
    ["R6", "income low AND repayment strong → moderate", Math.min(I("low"), R("strong")), "moderate"],
    ["R7", "DTI medium AND repayment fair → moderate", Math.min(D("medium"), R("fair")), "moderate"],
    ["R8", "repayment weak → low", R("weak"), "low"],
    ["R9", "DTI high → low", D("high"), "low"],
    ["R10", "income low AND repayment fair → low", Math.min(I("low"), R("fair")), "low"],
  ].map(([id, text, strength, consequent]) => ({
    id: id as string,
    text: text as string,
    mu: strength as number,
    consequent: consequent as Consequent,
  }));

  // Mamdani implication (min-clip), then max-aggregation per consequent set.
  const clip: Record<Consequent, number> = { low: 0, moderate: 0, high: 0 };
  for (const rule of rules) {
    clip[rule.consequent] = Math.max(clip[rule.consequent], rule.mu);
  }

  const xs: number[] = [];
  const mus: number[] = [];
  let numerator = 0;
  let denominator = 0;
  for (let x = 0; x <= 100; x += 1) {
    const aggregated = (Object.keys(OUTPUT_SETS) as Consequent[]).reduce(
      (acc, key) => Math.max(acc, Math.min(clip[key], tri(x, ...OUTPUT_SETS[key]))),
      0,
    );
    xs.push(x);
    mus.push(aggregated);
    numerator += x * aggregated;
    denominator += aggregated;
  }

  // Centroid defuzzification.
  const score = denominator ? numerator / denominator : 0;
  const tier: Tier = score >= 65 ? "low_risk" : score >= 45 ? "moderate" : "high_risk";
  const tierLabel = tier === "low_risk" ? "Low risk" : tier === "moderate" ? "Moderate" : "High risk";

  const fired = rules
    .filter((r) => r.mu > EPSILON)
    .sort((a, b) => b.mu - a.mu);

  return {
    score,
    tier,
    tierLabel,
    memberships: { income, repaymentHistory, dti },
    firedRules: fired,
    firedCount: fired.length,
    ruleCount: RULE_COUNT,
    aggregated: { domain: [0, 100], x: xs, mu: mus },
    centroid: score,
    engine: {
      implication: "min",
      aggregation: "max",
      defuzzification: "centroid",
      version: "mock-1.2",
    },
  };
}

/** Stands in for the network call, latency and cancellation included. */
export function mockScore(
  req: ScoreRequest,
  signal?: AbortSignal,
): Promise<ScoreResponse> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve(evaluate(req));
    }, 90);
    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
