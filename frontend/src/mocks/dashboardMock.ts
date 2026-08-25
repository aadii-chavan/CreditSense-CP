/** ⚠️ DEV-ONLY MOCK — DELETE WHEN THE PYTHON BACKEND LANDS. ⚠️ */

import { withLatency } from "./engine";
import { ASSESSMENTS, PORTFOLIO_TOTAL } from "./store";
import type { DashboardResponse, DistributionBin } from "../types/dashboard";

function histogram(): DistributionBin[] {
  const bins = Array.from({ length: 10 }, (_, i) => ({ from: i * 10, to: i * 10 + 10, count: 0 }));
  for (const { record } of ASSESSMENTS) {
    const index = Math.min(9, Math.floor(record.score / 10));
    bins[index]!.count += 1;
  }
  const total = ASSESSMENTS.length || 1;
  return bins.map((b) => ({
    from: b.from,
    to: b.to,
    pct: Number(((b.count / total) * 100).toFixed(1)),
  }));
}

export function mockDashboard(signal?: AbortSignal): Promise<DashboardResponse> {
  return withLatency(() => {
    const records = ASSESSMENTS.map((a) => a.record);
    const scores = records.map((r) => r.score);
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    // Rounded so the three shares still sum to exactly 100.
    const rawShare = (predicate: (s: number) => boolean) =>
      (scores.filter(predicate).length / scores.length) * 100;
    const lowShare = Math.round(rawShare((s) => s >= 65));
    const moderateShare = Math.round(rawShare((s) => s >= 45 && s < 65));

    // The seven most recent records feed the dashboard table.
    const recent = records.slice(0, 7);
    const greyBand = records.filter((r) => r.score >= 45 && r.score <= 55);
    const week = records.filter(
      (r) => new Date(r.scoredAt).getTime() > new Date("2026-08-05T00:00:00+05:30").getTime(),
    );
    const explainerSource = ASSESSMENTS[0]!;

    return {
      engineSyncedAt: "2026-08-12T09:41:00+05:30",
      stats: {
        scored: { total: PORTFOLIO_TOTAL, thisQuarter: 1206, rejectedOutright: 0 },
        meanScore: {
          value: Number(mean.toFixed(1)),
          delta: 2.1,
          trend: [24, 22, 25, 17, 19, 13, 15, 8, 5],
        },
        thisWeek: { total: week.length, daily: [38, 56, 44, 72, 60, 88, 34] },
        greyBand: { count: greyBand.length, of: records.length, range: [45, 55] },
      },
      distribution: {
        bins: histogram(),
        tierShare: {
          low_risk: lowShare,
          moderate: moderateShare,
          high_risk: 100 - lowShare - moderateShare,
        },
      },
      recent,
      explainer: { record: explainerSource.record, score: explainerSource.score },
    };
  }, signal, 140);
}
