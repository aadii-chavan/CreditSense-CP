import type { MembershipDegree } from "../types/score";
import { muColor } from "../lib/format";

interface Props {
  /** Degrees from the engine; renders three placeholder bars when absent. */
  degrees?: MembershipDegree[];
  /** Set names to show before the first response arrives. */
  placeholders: string[];
}

/** The row of per-set membership degrees beneath an antecedent slider. */
export function MembershipBars({ degrees, placeholders }: Props) {
  const rows: MembershipDegree[] =
    degrees ??
    placeholders.map((label) => ({ set: label.toLowerCase(), label, mu: 0 }));

  return (
    <div className="membership-grid">
      {rows.map((d) => (
        <div key={d.set}>
          <div className="membership-head">
            <span>{d.label}</span>
            <span className="membership-mu">{d.mu.toFixed(2)}</span>
          </div>
          <div
            className="membership-track"
            role="meter"
            aria-label={`${d.label} membership`}
            aria-valuenow={Number(d.mu.toFixed(2))}
            aria-valuemin={0}
            aria-valuemax={1}
          >
            <div
              className="membership-fill"
              style={{ width: `${Math.round(d.mu * 100)}%`, background: muColor(d.mu) }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
