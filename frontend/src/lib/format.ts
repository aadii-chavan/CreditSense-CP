import type { Tier } from "../types/score";
import type { RecordStatus } from "../types/records";

/** Ink for a weak degree, accent once it crosses the halfway mark. */
export const muColor = (mu: number): string =>
  mu >= 0.5 ? "var(--color-accent)" : "var(--color-neutral-800)";

export interface TierPalette {
  background: string;
  foreground: string;
  border: string;
}

/**
 * Tier colours. The headline chip on Assess is filled; chips inside tables use
 * the lighter outline treatment for low risk, as the design specifies.
 */
export function tierPalette(tier: Tier, variant: "solid" | "outline" = "solid"): TierPalette {
  switch (tier) {
    case "low_risk":
      return variant === "solid"
        ? { background: "var(--color-text)", foreground: "var(--color-bg)", border: "var(--color-text)" }
        : { background: "transparent", foreground: "var(--color-text)", border: "var(--color-text)" };
    case "moderate":
      return {
        background: "var(--color-accent-200)",
        foreground: "var(--color-accent-800)",
        border: "var(--color-accent-200)",
      };
    case "high_risk":
    default:
      return {
        background: "var(--color-accent)",
        foreground: "var(--color-bg)",
        border: "var(--color-accent)",
      };
  }
}

/** Fill colour for a score bar at this tier. */
export const scoreBarColor = (tier: Tier): string =>
  tier === "high_risk"
    ? "var(--color-accent)"
    : tier === "moderate"
      ? "var(--color-neutral-800)"
      : "var(--color-text)";

export const rupees = (value: number): string => `₹${value.toLocaleString("en-IN")}`;

export const STATUS_LABEL: Record<RecordStatus, string> = {
  committed: "Committed",
  under_review: "Under review",
  referred: "Referred",
};

/** Reference instant for the prototype, so "today" is stable in the demo. */
const NOW = new Date("2026-08-12T09:41:00+05:30");

const TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
const DAY = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" });

/** "09:12" today, "Yesterday", else "10 Aug" — the Dashboard's short form. */
export function shortWhen(iso: string): string {
  const date = new Date(iso);
  const days = Math.floor((startOfDay(NOW) - startOfDay(date)) / 86_400_000);
  if (days === 0) return TIME.format(date);
  if (days === 1) return "Yesterday";
  return DAY.format(date);
}

/** "12 Aug · 09:12" — the Records table's full form. */
export const fullWhen = (iso: string): string => {
  const date = new Date(iso);
  return `${DAY.format(date)} · ${TIME.format(date)}`;
};

const startOfDay = (d: Date): number =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export const compact = (n: number): string => n.toLocaleString("en-IN");
