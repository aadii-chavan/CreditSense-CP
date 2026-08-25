/** ⚠️ DEV-ONLY MOCK — DELETE WHEN THE PYTHON BACKEND LANDS. ⚠️ */

import {
  CREDITWORTHINESS,
  DTI,
  ENGINE_VERSION,
  INCOME,
  REPAYMENT,
  RULES,
  RULE_SPACE_SIZE,
  clauseText,
  evaluate,
  tierOf,
  tri,
  withLatency,
} from "./engine";
import { ASSESSMENTS } from "./store";
import type {
  DryRunRequest,
  DryRunResponse,
  RuleBaseResponse,
  RuleDefinition,
  VariableKey,
} from "../types/rules";
import type { Consequent, ScoreRequest } from "../types/score";

/** Share of stored records each rule actually fired on. */
function firingRates(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const { score } of ASSESSMENTS) {
    for (const rule of score.firedRules) {
      counts[rule.id] = (counts[rule.id] ?? 0) + 1;
    }
  }
  const total = ASSESSMENTS.length || 1;
  return Object.fromEntries(
    RULES.map((r) => [r.id, Number((((counts[r.id] ?? 0) / total) * 100).toFixed(1))]),
  );
}

export function mockRuleBase(signal?: AbortSignal): Promise<RuleBaseResponse> {
  return withLatency(() => {
    const rates = firingRates();
    const rules: RuleDefinition[] = RULES.map((rule) => ({
      ...rule,
      text: clauseText(rule),
      firesOnPct: rates[rule.id] ?? 0,
    }));

    return {
      engineVersion: ENGINE_VERSION,
      antecedents: [INCOME, REPAYMENT, DTI],
      output: CREDITWORTHINESS,
      rules,
      ruleSpaceSize: RULE_SPACE_SIZE,
      versions: [
        { version: "1.2", summary: "DTI medium peak 40 → 45", author: "A. Krishnan", timestamp: "2026-08-02T11:20:00+05:30", published: true },
        { version: "1.1", summary: "Added R-25 · repayment weak → low", author: "A. Krishnan", timestamp: "2026-07-21T15:05:00+05:30", published: false },
        { version: "1.0", summary: "Initial 10-rule base, 3 antecedents", author: "R. Venkatesan", timestamp: "2026-07-02T09:00:00+05:30", published: false },
      ],
    };
  }, signal, 120);
}

/**
 * Replays the stored records through a rule base with the staged edits applied
 * and reports how the distribution would move. Real arithmetic over the same
 * store the other pages read — no invented figures.
 */
export function mockDryRun(body: DryRunRequest, signal?: AbortSignal): Promise<DryRunResponse> {
  return withLatency(() => {
    // Apply staged edits to a copy of the published base.
    const peaks = new Map<string, number>();
    const consequents = new Map<string, Consequent>();
    const actives = new Map<string, boolean>();
    for (const edit of body.edits) {
      if (edit.kind === "peak") peaks.set(`${edit.variable}.${edit.set}`, edit.to);
      if (edit.kind === "consequent") consequents.set(edit.ruleId, edit.to);
      if (edit.kind === "active") actives.set(edit.ruleId, edit.to);
    }

    const variables = { income: INCOME, repaymentHistory: REPAYMENT, dti: DTI };
    const stagedSets = (key: VariableKey) =>
      variables[key].sets.map((s) => {
        const peak = peaks.get(`${key}.${s.name}`);
        return peak === undefined ? s : { ...s, b: peak };
      });

    const stagedRules = RULES.map((r) => ({
      ...r,
      consequent: consequents.get(r.id) ?? r.consequent,
      active: actives.get(r.id) ?? r.active,
    }));

    const stagedScore = (inputs: ScoreRequest): number => {
      const degree = (key: VariableKey, value: number, setName: string) => {
        const s = stagedSets(key).find((x) => x.name === setName);
        return s ? tri(value, s.a, s.b, s.c) : 0;
      };
      const values: Record<VariableKey, number> = {
        income: inputs.income / 1000,
        repaymentHistory: inputs.repaymentHistory,
        dti: inputs.dti,
      };
      const clip: Record<Consequent, number> = { low: 0, moderate: 0, high: 0 };
      for (const rule of stagedRules) {
        if (!rule.active) continue;
        const mu =
          rule.weight *
          Math.min(...rule.antecedents.map((c) => degree(c.variable, values[c.variable], c.set)));
        clip[rule.consequent] = Math.max(clip[rule.consequent], mu);
      }
      let num = 0;
      let den = 0;
      for (let x = 0; x <= 100; x += 1) {
        const mu = CREDITWORTHINESS.sets.reduce(
          (acc, s) => Math.max(acc, Math.min(clip[s.name as Consequent], tri(x, s.a, s.b, s.c))),
          0,
        );
        num += x * mu;
        den += mu;
      }
      return den ? num / den : 0;
    };

    const currentBins = new Array(10).fill(0);
    const stagedBins = new Array(10).fill(0);
    let affected = 0;
    let tierChanges = 0;
    let currentSum = 0;
    let stagedSum = 0;

    for (const { inputs, score } of ASSESSMENTS) {
      const before = score.score;
      const after = stagedScore(inputs);
      currentSum += before;
      stagedSum += after;
      currentBins[Math.min(9, Math.floor(before / 10))] += 1;
      stagedBins[Math.min(9, Math.floor(after / 10))] += 1;
      if (Math.abs(after - before) > 0.05) affected += 1;
      if (tierOf(after) !== tierOf(before)) tierChanges += 1;
    }

    const n = ASSESSMENTS.length || 1;
    const toPct = (bins: number[]) => bins.map((c) => Number(((c / n) * 100).toFixed(1)));

    return {
      recordsEvaluated: n,
      recordsAffected: affected,
      meanShift: Number(((stagedSum - currentSum) / n).toFixed(2)),
      tierChanges,
      currentBins: toPct(currentBins),
      stagedBins: toPct(stagedBins),
    };
  }, signal, 320);
}

/** Re-exported so the page can score a preview without importing the engine. */
export { evaluate };
