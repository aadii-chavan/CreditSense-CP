import type { Tier } from "../types/score";

/** Ink for a weak degree, accent once it crosses the halfway mark. */
export const muColor = (mu: number): string =>
  mu >= 0.5 ? "var(--color-accent)" : "var(--color-neutral-800)";

export interface TierPalette {
  background: string;
  foreground: string;
}

/** Tier chip and score-bar colours, as specified by the design. */
export function tierPalette(tier: Tier): TierPalette {
  switch (tier) {
    case "low_risk":
      return { background: "var(--color-text)", foreground: "var(--color-bg)" };
    case "moderate":
      return { background: "var(--color-accent-200)", foreground: "var(--color-accent-800)" };
    case "high_risk":
    default:
      return { background: "var(--color-accent)", foreground: "var(--color-bg)" };
  }
}

export const rupees = (value: number): string => `₹${value.toLocaleString("en-IN")}`;
