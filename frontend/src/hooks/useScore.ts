import { useCallback, useEffect, useRef, useState } from "react";
import { postScore } from "../api/client";
import type { ScoreRequest, ScoreResponse } from "../types/score";

export type ScoreStatus = "idle" | "loading" | "success" | "error";

export interface UseScoreResult {
  /** Last successful response; kept on screen while a newer one is in flight. */
  data: ScoreResponse | null;
  status: ScoreStatus;
  error: string | null;
  /** True while a request is in flight and `data` is from an earlier input. */
  isStale: boolean;
  retry: () => void;
}

/**
 * Sends the antecedents to `POST /api/score` whenever they change.
 *
 * Slider drags fire fast, so requests are debounced and the previous one is
 * aborted; a late reply can never overwrite a newer one. The last good response
 * stays rendered (dimmed) while the next is fetched, so the panel never flashes
 * empty mid-drag.
 */
export function useScore(request: ScoreRequest, debounceMs = 120): UseScoreResult {
  const [data, setData] = useState<ScoreResponse | null>(null);
  const [status, setStatus] = useState<ScoreStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const { income, repaymentHistory, dti } = request;

  // Identity fields ride along on the request but must not trigger a recompute,
  // so the effect depends on the antecedents only.
  const applicantRef = useRef(request.applicant);
  applicantRef.current = request.applicant;

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    setStatus("loading");
    const timer = setTimeout(() => {
      postScore(
        { income, repaymentHistory, dti, applicant: applicantRef.current },
        controller.signal,
      )
        .then((response) => {
          if (cancelled) return;
          setData(response);
          setError(null);
          setStatus("success");
        })
        .catch((err: unknown) => {
          if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
          setError(err instanceof Error ? err.message : "Could not reach the scoring engine.");
          setStatus("error");
        });
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [income, repaymentHistory, dti, debounceMs, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    data,
    status,
    error,
    isStale: status === "loading" && data !== null,
    retry,
  };
}
