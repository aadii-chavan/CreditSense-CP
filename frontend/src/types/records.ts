import type { Tier } from "./score";

export type RecordStatus = "committed" | "under_review" | "referred";

/** One stored assessment, as listed on Records and the Dashboard. */
export interface AssessmentRecord {
  /** Application id, e.g. "APP-2841". */
  id: string;
  name: string;
  location: string;
  score: number;
  tier: Tier;
  tierLabel: string;
  /** The strongest rule from this record's inference pass. */
  dominantRule: { id: string; text: string; mu: number };
  status: RecordStatus;
  /** ISO 8601 timestamp of the scoring pass. */
  scoredAt: string;
  /** Engine version that produced the score. */
  engineVersion: string;
}

export type TierFilter = "all" | Tier;
export type PeriodFilter = "30d" | "7d" | "quarter" | "all";
export type StatusFilter = "all" | RecordStatus;

export interface RecordsQuery {
  tier?: TierFilter;
  period?: PeriodFilter;
  status?: StatusFilter;
  engineVersion?: string;
  /** Free-text match on name or application id. */
  search?: string;
  /** 1-based. */
  page?: number;
  pageSize?: number;
}

export interface RecordsResponse {
  rows: AssessmentRecord[];
  /** Records matching the filters, across all pages. */
  filtered: number;
  /** Records in the store, ignoring filters. */
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  summary: {
    filtered: number;
    meanScore: number;
    underReview: number;
    rescoredAfterRuleEdit: number;
  };
  /** Engine versions present in the store, for the filter dropdown. */
  engineVersions: string[];
}
