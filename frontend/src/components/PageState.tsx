interface ErrorProps {
  message: string;
  onRetry: () => void;
  title?: string;
}

/** Shown when a page's data request fails — no page invents a fallback. */
export function PageError({ message, onRetry, title = "Backend unavailable" }: ErrorProps) {
  return (
    <div className="error-panel" role="alert">
      <h4>{title}</h4>
      <p>{message}</p>
      <button className="btn btn-secondary" type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

/** First-load placeholder, before any response has arrived. */
export function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="page-loading-skeleton" role="status" aria-label={label}>
      <div className="page-loading" aria-hidden="true">
        <span className="status-dot is-pending" />
        {label}
      </div>
      <div className="skeleton skeleton-line" style={{ width: "70%" }} aria-hidden="true" />
      <div className="skeleton skeleton-line" style={{ width: "45%" }} aria-hidden="true" />
      <div className="skeleton skeleton-block" aria-hidden="true" />
    </div>
  );
}
