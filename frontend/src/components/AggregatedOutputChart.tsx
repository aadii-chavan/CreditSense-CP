import type { AggregatedOutput } from "../types/score";

interface Props {
  aggregated?: AggregatedOutput;
  centroid?: number;
  /** Hide the section label when the surrounding card already names the chart. */
  showTitle?: boolean;
}

// Chart geometry, in the SVG's own viewBox units.
const WIDTH = 400;
const BASELINE = 90;
const PEAK_HEIGHT = 74;

/**
 * The aggregated (clipped, max-combined) output set with the centroid marked.
 *
 * The curve is drawn straight from the samples the engine returns — the
 * frontend does no membership math of its own.
 */
export function AggregatedOutputChart({ aggregated, centroid, showTitle = true }: Props) {
  const [domainMin, domainMax] = aggregated?.domain ?? [0, 100];
  const span = domainMax - domainMin || 1;
  const toX = (value: number) => ((value - domainMin) / span) * WIDTH;

  // The curve itself, without the baseline corners that close the fill — the
  // stroke is drawn as its own polyline so it can animate in on first paint.
  const curve = aggregated
    ? aggregated.x
        .map(
          (x, i) =>
            `${toX(x).toFixed(1)},${(BASELINE - (aggregated.mu[i] ?? 0) * PEAK_HEIGHT).toFixed(1)}`,
        )
        .join(" ")
    : `0,${BASELINE} ${WIDTH},${BASELINE}`;
  const points = aggregated ? `0,${BASELINE} ${curve} ${WIDTH},${BASELINE}` : curve;

  const centroidX = centroid === undefined ? null : toX(centroid);

  return (
    <div className="agg-block">
      {showTitle && (
        <div className="section-label">Aggregated output set · centroid defuzzification</div>
      )}
      <svg
        viewBox={`0 0 ${WIDTH} 110`}
        preserveAspectRatio="none"
        className="agg-chart"
        role="img"
        aria-label={
          centroid === undefined
            ? "Aggregated output set"
            : `Aggregated output set, centroid at ${centroid.toFixed(1)}`
        }
      >
        <line
          x1="0" y1={BASELINE} x2={WIDTH} y2={BASELINE}
          stroke="var(--color-divider)" strokeWidth="1" vectorEffect="non-scaling-stroke"
        />
        {/* Reference outline of the unclipped universe. */}
        <polygon
          points={`0,${BASELINE} 0,16 180,16 180,${BASELINE}`}
          fill="none" stroke="var(--color-neutral-400)" strokeWidth="1"
          strokeDasharray="2 3" vectorEffect="non-scaling-stroke"
        />
        <polygon
          className="chart-fill"
          points={points}
          fill="color-mix(in srgb, #ec3013 18%, transparent)"
          stroke="none"
        />
        <polyline
          className="chart-draw"
          points={curve}
          fill="none"
          stroke="var(--color-accent)" strokeWidth="2" vectorEffect="non-scaling-stroke"
        />
        {centroidX !== null && (
          <g className="chart-marker">
            {/* Translated rather than repositioned, so the centroid glides. */}
            <line
              className="centroid-line"
              x1="0" y1="0" x2="0" y2={BASELINE}
              style={{ transform: `translateX(${centroidX}px)` }}
              stroke="var(--color-text)" strokeWidth="1.5" vectorEffect="non-scaling-stroke"
            />
            <circle
              className="centroid-dot"
              cx="0" cy={BASELINE} r="4"
              style={{ transform: `translateX(${centroidX}px)` }}
              fill="var(--color-text)"
            />
          </g>
        )}
      </svg>
      <div className="agg-scale">
        <span>Low</span>
        <span>Moderate</span>
        <span>High</span>
      </div>
    </div>
  );
}
