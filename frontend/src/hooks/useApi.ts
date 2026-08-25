import { useCallback, useEffect, useState } from "react";

export type ApiStatus = "loading" | "success" | "error";

export interface UseApiResult<T> {
  data: T | null;
  status: ApiStatus;
  error: string | null;
  /** True while a refetch is in flight and `data` is from an earlier query. */
  isStale: boolean;
  refetch: () => void;
}

/**
 * Runs a GET-shaped request and keeps the last good response on screen while
 * the next one is in flight. The previous request is aborted, so a late reply
 * can never overwrite a newer one.
 *
 * `fetcher` must be stable (wrap it in useCallback) — it is the effect's
 * dependency, so a new identity refetches.
 */
export function useApi<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  debounceMs = 0,
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<ApiStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    setStatus("loading");
    const run = () =>
      fetcher(controller.signal)
        .then((response) => {
          if (cancelled) return;
          setData(response);
          setError(null);
          setStatus("success");
        })
        .catch((err: unknown) => {
          if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
          setError(err instanceof Error ? err.message : "Could not reach the backend.");
          setStatus("error");
        });

    const timer = debounceMs > 0 ? setTimeout(run, debounceMs) : null;
    if (!timer) void run();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      controller.abort();
    };
  }, [fetcher, debounceMs, attempt]);

  const refetch = useCallback(() => setAttempt((n) => n + 1), []);

  return { data, status, error, isStale: status === "loading" && data !== null, refetch };
}
