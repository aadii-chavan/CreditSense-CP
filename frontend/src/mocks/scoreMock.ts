/**
 * ⚠️ DEV-ONLY MOCK — DELETE WHEN THE PYTHON BACKEND LANDS. ⚠️
 *
 * Stands in for `POST /api/score`. Reached only through `api/client.ts`, so no
 * component ever depends on it. The maths lives in ./engine.
 */

import { evaluate, withLatency } from "./engine";
import type { ScoreRequest, ScoreResponse } from "../types/score";

export function mockScore(req: ScoreRequest, signal?: AbortSignal): Promise<ScoreResponse> {
  return withLatency(() => evaluate(req), signal);
}
