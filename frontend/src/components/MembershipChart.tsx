import type { LinguisticVariable } from "../types/rules";

interface Props {
  variable: LinguisticVariable;
  /** Peak overrides from staged edits, keyed by set name. */
  peaks?: Record<string, number>;
}

const WIDTH = 300;
const BASELINE = 74;
const PEAK_Y = 12;

/** The triangular sets of one linguistic variable, drawn over its universe. */
export function MembershipChart({ variable, peaks = {} }: Props) {
  const [min, max] = variable.domain;
  const span = max - min || 1;
  const toX = (value: number) => ((Math.max(min, Math.min(max, value)) - min) / span) * WIDTH;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} 90`}
      preserveAspectRatio="none"
      className="mf-chart"
      role="img"
      aria-label={`${variable.label} membership functions`}
    >
      <line x1="0" y1={BASELINE} x2={WIDTH} y2={BASELINE} stroke="var(--color-divider)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      {variable.sets.map((s, i) => {
        const peak = peaks[s.name] ?? s.b;
        const isLast = i === variable.sets.length - 1;
        const points = [
          `${toX(s.a).toFixed(1)},${BASELINE}`,
          `${toX(peak).toFixed(1)},${PEAK_Y}`,
          `${toX(s.c).toFixed(1)},${BASELINE}`,
        ];
        // A shoulder set that runs to the edge of the universe stays flat there.
        if (s.a < min) points.unshift(`0,${PEAK_Y}`);
        if (s.c > max) points.splice(points.length - 1, 0, `${WIDTH},${PEAK_Y}`);

        return (
          <polygon
            key={s.name}
            points={points.join(" ")}
            fill={isLast ? "color-mix(in srgb, #ec3013 14%, transparent)" : "color-mix(in srgb, #201e1d 7%, transparent)"}
            stroke={isLast ? "var(--color-accent)" : "var(--color-neutral-700)"}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      {variable.sets.map((s, i) => {
        const peak = peaks[s.name] ?? s.b;
        const x = Math.max(3, Math.min(WIDTH - 3, toX(peak)));
        return (
          <rect
            key={`handle-${s.name}`}
            x={x - 3}
            y={PEAK_Y - 3}
            width="6"
            height="6"
            fill={i === variable.sets.length - 1 ? "var(--color-accent)" : "var(--color-text)"}
          />
        );
      })}
    </svg>
  );
}
