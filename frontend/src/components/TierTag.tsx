import type { Tier } from "../types/score";
import { tierPalette } from "../lib/format";

interface Props {
  tier: Tier;
  label: string;
  variant?: "solid" | "outline";
}

export function TierTag({ tier, label, variant = "outline" }: Props) {
  const palette = tierPalette(tier, variant);
  return (
    <span
      className="tag"
      style={{
        background: palette.background,
        color: palette.foreground,
        border: `1px solid ${palette.border}`,
      }}
    >
      {label}
    </span>
  );
}
