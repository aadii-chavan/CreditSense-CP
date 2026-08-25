interface Props {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}

/** Builds a page list with an ellipsis, e.g. 1 2 3 … 12. */
function pageList(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 5) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages = new Set<number>([1, pageCount, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);

  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

export function Pagination({ page, pageCount, onChange }: Props) {
  if (pageCount <= 1) return null;

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        className="btn btn-secondary pagination-step"
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </button>
      {pageList(page, pageCount).map((entry, i) =>
        entry === "gap" ? (
          <span key={`gap-${i}`} className="pagination-gap">…</span>
        ) : (
          <button
            key={entry}
            type="button"
            className={`btn pagination-page${entry === page ? " is-current" : " btn-secondary"}`}
            aria-current={entry === page ? "page" : undefined}
            onClick={() => onChange(entry)}
          >
            {entry}
          </button>
        ),
      )}
      <button
        className="btn btn-secondary pagination-step"
        type="button"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}
