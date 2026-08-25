/** ⚠️ DEV-ONLY MOCK — DELETE WHEN THE PYTHON BACKEND LANDS. ⚠️ */

import { withLatency } from "./engine";
import { ASSESSMENTS, PORTFOLIO_TOTAL, POPULATION_SCALE } from "./store";
import type { AssessmentRecord, RecordsQuery, RecordsResponse } from "../types/records";

const NOW = new Date("2026-08-12T09:41:00+05:30").getTime();
const PERIOD_DAYS: Record<string, number> = { "7d": 7, "30d": 30, quarter: 92 };

export function filterRecords(query: RecordsQuery): AssessmentRecord[] {
  const { tier = "all", period = "30d", status = "all", engineVersion = "all", search = "" } = query;
  const needle = search.trim().toLowerCase();
  const days = PERIOD_DAYS[period];
  const cutoff = days ? NOW - days * 86_400_000 : null;

  return ASSESSMENTS.map((a) => a.record).filter((r) => {
    if (tier !== "all" && r.tier !== tier) return false;
    if (status !== "all" && r.status !== status) return false;
    if (engineVersion !== "all" && r.engineVersion !== engineVersion) return false;
    if (cutoff !== null && new Date(r.scoredAt).getTime() < cutoff) return false;
    if (needle && !`${r.name} ${r.id} ${r.location}`.toLowerCase().includes(needle)) return false;
    return true;
  });
}

export function mockRecords(query: RecordsQuery, signal?: AbortSignal): Promise<RecordsResponse> {
  return withLatency(() => {
    const matched = filterRecords(query);
    const pageSize = query.pageSize ?? 12;
    const pageCount = Math.max(1, Math.ceil(matched.length / pageSize));
    const page = Math.min(Math.max(1, query.page ?? 1), pageCount);
    const start = (page - 1) * pageSize;
    const mean = matched.length
      ? matched.reduce((sum, r) => sum + r.score, 0) / matched.length
      : 0;

    return {
      rows: matched.slice(start, start + pageSize),
      filtered: matched.length,
      total: ASSESSMENTS.length,
      page,
      pageSize,
      pageCount,
      summary: {
        filtered: matched.length,
        meanScore: Number(mean.toFixed(1)),
        underReview: matched.filter((r) => r.status === "under_review").length,
        rescoredAfterRuleEdit: matched.filter((r) => r.engineVersion !== "1.2").length,
      },
      engineVersions: [...new Set(ASSESSMENTS.map((a) => a.record.engineVersion))].sort().reverse(),
    };
  }, signal, 130);
}

/** Headline figures describing the whole book rather than the sample. */
export const scaled = (n: number): number => Math.round(n * POPULATION_SCALE);
export { PORTFOLIO_TOTAL };
