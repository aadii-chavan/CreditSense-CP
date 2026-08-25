import type { ScoreRequest, ScoreResponse, ApiErrorBody } from "../types/score";
import type { RecordsQuery, RecordsResponse } from "../types/records";
import type { DashboardResponse } from "../types/dashboard";
import type { DryRunRequest, DryRunResponse, RuleBaseResponse } from "../types/rules";

/**
 * The only door between the UI and the backend.
 *
 * Components never import a mock and never compute inference themselves — they
 * call these functions and render the replies. When the FastAPI service is up,
 * set VITE_USE_MOCK=false and this file is the only thing that changes.
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

async function request<T>(path: string, init: RequestInit, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { ...init, signal });

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

  return (await res.json()) as T;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/** `POST /api/score` — one Mamdani inference pass. */
export async function postScore(body: ScoreRequest, signal?: AbortSignal): Promise<ScoreResponse> {
  if (USE_MOCK) {
    const { mockScore } = await import("../mocks/scoreMock");
    return mockScore(body, signal);
  }
  return request<ScoreResponse>("/score", json(body), signal);
}

/** `GET /api/dashboard` — portfolio stats, recent scores and a worked example. */
export async function getDashboard(signal?: AbortSignal): Promise<DashboardResponse> {
  if (USE_MOCK) {
    const { mockDashboard } = await import("../mocks/dashboardMock");
    return mockDashboard(signal);
  }
  return request<DashboardResponse>("/dashboard", { method: "GET" }, signal);
}

/** `GET /api/records` — the filtered, paginated assessment log. */
export async function getRecords(
  query: RecordsQuery,
  signal?: AbortSignal,
): Promise<RecordsResponse> {
  if (USE_MOCK) {
    const { mockRecords } = await import("../mocks/recordsMock");
    return mockRecords(query, signal);
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return request<RecordsResponse>(`/records?${params}`, { method: "GET" }, signal);
}

/** `GET /api/rules` — membership functions, the rule base and version history. */
export async function getRuleBase(signal?: AbortSignal): Promise<RuleBaseResponse> {
  if (USE_MOCK) {
    const { mockRuleBase } = await import("../mocks/rulesMock");
    return mockRuleBase(signal);
  }
  return request<RuleBaseResponse>("/rules", { method: "GET" }, signal);
}

/** `POST /api/rules/dry-run` — replay stored records through a staged rule base. */
export async function postDryRun(
  body: DryRunRequest,
  signal?: AbortSignal,
): Promise<DryRunResponse> {
  if (USE_MOCK) {
    const { mockDryRun } = await import("../mocks/rulesMock");
    return mockDryRun(body, signal);
  }
  return request<DryRunResponse>("/rules/dry-run", json(body), signal);
}

/** True when the data on screen came from the dev mocks rather than Python. */
export const isMockMode = USE_MOCK;
