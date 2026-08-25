import type { ScoreRequest, ScoreResponse, ApiErrorBody } from "../types/score";

/**
 * The only door between the UI and the fuzzy engine.
 *
 * Components never import the mock, and never do inference themselves — they
 * call `postScore` and render the reply. When the FastAPI backend is up, set
 * VITE_USE_MOCK=false and this file is the only thing that changes behaviour.
 */

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function postScore(
  body: ScoreRequest,
  signal?: AbortSignal,
): Promise<ScoreResponse> {
  if (USE_MOCK) {
    const { mockScore } = await import("../mocks/scoreMock");
    return mockScore(body, signal);
  }

  const res = await fetch(`${BASE_URL}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let detail = `Request failed with status ${res.status}`;
    try {
      const parsed = (await res.json()) as Partial<ApiErrorBody>;
      if (parsed.detail) detail = parsed.detail;
    } catch {
      // Non-JSON error body — keep the status-based message.
    }
    throw new ApiError(detail, res.status);
  }

  return (await res.json()) as ScoreResponse;
}

/** True when the score shown came from the dev mock rather than Python. */
export const isMockMode = USE_MOCK;
