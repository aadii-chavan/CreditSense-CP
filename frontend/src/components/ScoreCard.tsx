import type { ScoreResponse } from "../types/score";
import { tierPalette } from "../lib/format";
import { useCountUp } from "../hooks/useCountUp";

interface Props {
  data: ScoreResponse | null;
}

/** Headline creditworthiness, tier chip, and the risk-band bar. */
export function ScoreCard({ data }: Props) {
  const palette = tierPalette(data?.tier ?? "high_risk");
  const score = data?.score ?? 0;
  // The headline eases to each new score rather than snapping mid-drag.
  const shown = useCountUp(data ? data.score : null) ?? 0;

  return (
    <div className="score-card">
      <div className="score-row">
        <div>
          <div className="score-label">Creditworthiness</div>
          <div className="score-value">{data ? shown.toFixed(1) : "—"}</div>
        </div>
        <div className="score-side">
          <span
            className="tag"
            style={{
              background: palette.background,
              color: palette.foreground,
              border: `1px solid ${palette.background}`,
            }}
          >
            {data?.tierLabel ?? "Awaiting engine"}
          </span>
          <div className="score-fired">
            {data
              ? `${data.firedCount} of ${data.ruleCount} rules fired`
              : "No inference pass yet"}
          </div>
        </div>
      </div>

      <div
        className="score-bar"
        role="meter"
        aria-label="Creditworthiness"
        aria-valuenow={Number(score.toFixed(1))}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="score-bar-fill"
          style={{ width: `${Math.max(0, Math.min(100, score))}%`, background: palette.background }}
        />
        {/* Band boundaries: high risk | moderate at 45, moderate | low risk at 65. */}
        <div className="score-bar-tick" style={{ left: "45%" }} />
        <div className="score-bar-tick" style={{ left: "65%" }} />
      </div>
      <div className="score-scale">
        <span>High risk</span>
        <span>Moderate</span>
        <span>Low risk</span>
      </div>
    </div>
  );
}
