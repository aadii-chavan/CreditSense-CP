interface Props {
  /** Series in display order; drawn on an inverted y-axis, as the design shows. */
  values: number[];
}

/** The mean-score trend line in the Dashboard's stat strip. */
export function Sparkline({ values }: Props) {
  const width = 160;
  const height = 30;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : width;

  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(((v - min) / span) * (height - 6) + 3).toFixed(1)}`)
    .join(" ");
  const last = points.split(" ").at(-1)!.split(",");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="sparkline"
      role="img"
      aria-label="Mean score trend"
    >
      <polyline
        className="chart-draw"
        style={{ "--draw-length": 400 } as React.CSSProperties}
        points={points}
        fill="none" stroke="var(--color-text)" strokeWidth="1.5" vectorEffect="non-scaling-stroke"
      />
      <circle className="chart-marker" cx={last[0]} cy={last[1]} r="3" fill="var(--color-accent)" />
    </svg>
  );
}
