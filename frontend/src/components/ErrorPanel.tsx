interface Props {
  message: string;
  onRetry: () => void;
}

/** Shown when `POST /api/score` fails — the UI has no fallback maths of its own. */
export function ErrorPanel({ message, onRetry }: Props) {
  return (
    <div className="error-panel" role="alert">
      <h4>Scoring engine unavailable</h4>
      <p>{message}</p>
      <button className="btn btn-secondary" type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
