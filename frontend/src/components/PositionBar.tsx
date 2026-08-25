import type { Tier } from "../types/score";
import { scoreBarColor } from "../lib/format";

interface Props {
  score: number;
  tier: Tier;
  /** Draw the midpoint tick, as the Dashboard table does. */
  showMidpoint?: boolean;
  height?: number;
}

/** Where a score sits on the 0–100 universe. */
export function PositionBar({ score, tier, showMidpoint = false, height = 7 }: Props) {
  return (
    <div className="position-bar" style={{ height }}>
      <div
        className="position-bar-fill"
        style={{ width: `${Math.max(0, Math.min(100, score))}%`, background: scoreBarColor(tier) }}
      />
      {showMidpoint && <div className="position-bar-tick" />}
    </div>
  );
}
