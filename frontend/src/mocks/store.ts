/**
 * ⚠️ DEV-ONLY MOCK — DELETE WHEN THE PYTHON BACKEND LANDS. ⚠️
 *
 * A stand-in for the assessments table. Every record's score, tier and dominant
 * rule is produced by running ./engine over its stored inputs, so Dashboard,
 * Records and Rule base all agree with what Assess computes for the same inputs.
 */

import { evaluate, tierLabelOf } from "./engine";
import type { AssessmentRecord, RecordStatus } from "../types/records";
import type { ScoreRequest, ScoreResponse } from "../types/score";

export interface StoredAssessment {
  record: AssessmentRecord;
  inputs: ScoreRequest;
  score: ScoreResponse;
}

interface Seed {
  name: string;
  location: string;
  income: number;
  repaymentHistory: number;
  dti: number;
  /** Minutes before the reference instant that this was scored. */
  minutesAgo: number;
  engineVersion?: string;
}

/** Reference "now" for the prototype — the design's 12 Aug 2026, 09:41 sync. */
const NOW = new Date("2026-08-12T09:41:00+05:30").getTime();

/**
 * The twelve applicants the design names. Their inputs were solved so the
 * engine reproduces the scores shown in the artboards; Ananya Iyer's 88 sits
 * above the engine's ceiling of 85.3, so hers lands at the ceiling.
 */
const NAMED: Seed[] = [
  { name: "Aarav Mehta", location: "Pune", income: 38000, repaymentHistory: 80, dti: 18, minutesAgo: 29 },
  { name: "Ananya Iyer", location: "Kochi", income: 20000, repaymentHistory: 100, dti: 0, minutesAgo: 47 },
  { name: "Rohit Deshmukh", location: "Jaipur", income: 27000, repaymentHistory: 96, dti: 60, minutesAgo: 70 },
  { name: "Priya Nandakumar", location: "Indore", income: 14000, repaymentHistory: 78, dti: 20, minutesAgo: 1001 },
  { name: "Vikram Chauhan", location: "Lucknow", income: 53000, repaymentHistory: 92, dti: 82, minutesAgo: 1119 },
  { name: "Meera Pillai", location: "Coimbatore", income: 21000, repaymentHistory: 44, dti: 58, minutesAgo: 2821 },
  { name: "Sanjay Kulkarni", location: "Nagpur", income: 33000, repaymentHistory: 48, dti: 90, minutesAgo: 2916 },
  { name: "Divya Nair", location: "Thrissur", income: 18000, repaymentHistory: 92, dti: 8, minutesAgo: 3893 },
  { name: "Ishaan Bhatt", location: "Surat", income: 9000, repaymentHistory: 86, dti: 24, minutesAgo: 4049 },
  { name: "Ritu Agarwal", location: "Kanpur", income: 16000, repaymentHistory: 80, dti: 24, minutesAgo: 5591 },
  { name: "Arjun Sethi", location: "Ludhiana", income: 13000, repaymentHistory: 74, dti: 94, minutesAgo: 5666 },
  { name: "Lakshmi Subramanian", location: "Madurai", income: 28000, repaymentHistory: 100, dti: 62, minutesAgo: 6939 },
];

const FIRST = [
  "Aditi", "Rahul", "Neha", "Karthik", "Sneha", "Manish", "Pooja", "Vivek", "Anjali", "Suresh",
  "Kavita", "Nikhil", "Deepa", "Ravi", "Shweta", "Gopal", "Preeti", "Amit", "Rekha", "Sunil",
  "Farhan", "Zoya", "Imran", "Nusrat", "Joseph", "Mary",
];
const LAST = [
  "Rao", "Sharma", "Menon", "Gupta", "Patel", "Banerjee", "Krishnan", "Joshi", "Verma", "Shetty",
  "Dutta", "Naidu", "Kaur", "Fernandes", "Bose", "Thomas",
];
const CITIES = [
  "Pune", "Kochi", "Jaipur", "Indore", "Lucknow", "Coimbatore", "Nagpur", "Surat", "Kanpur",
  "Ludhiana", "Madurai", "Bhopal", "Patna", "Guwahati", "Raipur", "Vijayawada", "Mysuru", "Nashik",
];

/** Deterministic PRNG so the dataset is identical on every reload. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generated(count: number): Seed[] {
  const rand = mulberry32(20260812);
  const pick = <T,>(list: T[]): T => list[Math.floor(rand() * list.length)]!;

  // Applicants who reach scoring are not uniformly distributed: most have a
  // usable repayment record and manageable debt. The draws below are skewed
  // that way, which is what gives the scored book a mean near 65 and a roughly
  // 50 / 40 / 10 split across the tiers.
  return Array.from({ length: count }, (_, i) => ({
    name: `${pick(FIRST)} ${pick(LAST)}`,
    location: pick(CITIES),
    income: 4000 + Math.round((54000 * Math.pow(rand(), 0.7)) / 1000) * 1000,
    repaymentHistory: Math.round(40 + 60 * Math.pow(rand(), 0.8)),
    dti: Math.round(70 * Math.pow(rand(), 3)),
    minutesAgo: 7200 + i * (90 + Math.round(rand() * 810)),
    // A slice of the store predates the current engine version.
    engineVersion: rand() < 0.22 ? "1.1" : "1.2",
  }));
}

function statusFor(score: number, rand: number): RecordStatus {
  if (score < 45) return rand < 0.6 ? "referred" : "under_review";
  if (score < 55) return rand < 0.5 ? "under_review" : "committed";
  return "committed";
}

function build(seeds: Seed[]): StoredAssessment[] {
  const rand = mulberry32(7);
  return seeds.map((seed, index) => {
    const inputs: ScoreRequest = {
      income: seed.income,
      repaymentHistory: seed.repaymentHistory,
      dti: seed.dti,
    };
    const score = evaluate(inputs);
    const dominant = score.firedRules[0];
    return {
      inputs,
      score,
      record: {
        id: `APP-${2841 - index}`,
        name: seed.name,
        location: seed.location,
        score: Number(score.score.toFixed(0)),
        tier: score.tier,
        tierLabel: tierLabelOf(score.tier),
        dominantRule: dominant
          ? { id: dominant.id, text: dominant.text, mu: Number(dominant.mu.toFixed(2)) }
          : { id: "—", text: "no rule fired", mu: 0 },
        status: statusFor(score.score, rand()),
        scoredAt: new Date(NOW - seed.minutesAgo * 60_000).toISOString(),
        engineVersion: seed.engineVersion ?? "1.2",
      },
    };
  });
}

/** Newest first, matching the order Records and the Dashboard display. */
export const ASSESSMENTS: StoredAssessment[] = build([...NAMED, ...generated(52)]);

export const findAssessment = (id: string): StoredAssessment | undefined =>
  ASSESSMENTS.find((a) => a.record.id === id);

/**
 * Portfolio totals the prototype quotes (2,847 scored, 1,206 this quarter). The
 * store holds a sample of that population, so counts are scaled by this factor
 * where a headline figure is meant to describe the whole book.
 */
export const PORTFOLIO_TOTAL = 2847;
export const POPULATION_SCALE = PORTFOLIO_TOTAL / ASSESSMENTS.length;
