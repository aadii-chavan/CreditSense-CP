import type { AssessmentRecord } from "./records";
import type { ScoreResponse } from "./score";

/** One bar of the score histogram. */
export interface DistributionBin {
  from: number;
  to: number;
  /** Share of all records in this bin, 0–100. */
  pct: number;
}

export interface DashboardResponse {
  /** ISO 8601 timestamp of the last engine sync. */
  engineSyncedAt: string;
  stats: {
    scored: { total: number; thisQuarter: number; rejectedOutright: number };
    meanScore: { value: number; delta: number; trend: number[] };
    thisWeek: { total: number; daily: number[] };
    greyBand: { count: number; of: number; range: [number, number] };
  };
  distribution: {
    bins: DistributionBin[];
    tierShare: { low_risk: number; moderate: number; high_risk: number };
  };
  /** Most recently scored applicants. */
  recent: AssessmentRecord[];
  /** A worked example for the transparency panel. */
  explainer: {
    record: AssessmentRecord;
    score: ScoreResponse;
  } | null;
}
