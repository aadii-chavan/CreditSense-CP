import type { ScoreStatus } from "../hooks/useScore";
import { isMockMode } from "../api/client";

interface Props {
  status: ScoreStatus;
  engineVersion?: string;
}

/** A one-line read on where the numbers on screen came from. */
export function EngineStatus({ status, engineVersion }: Props) {
  const dotClass =
    status === "loading" ? "is-pending" : status === "error" ? "is-error" : "";

  const text =
    status === "loading"
      ? "Scoring…"
      : status === "error"
        ? "Engine unreachable"
        : engineVersion
          ? `Engine ${engineVersion}`
          : "Live inference";

  return (
    <div className="status-strip">
      <span className={`status-dot ${dotClass}`} aria-hidden="true" />
      <span role="status">{text}</span>
      {isMockMode && <span>· dev mock</span>}
    </div>
  );
}
