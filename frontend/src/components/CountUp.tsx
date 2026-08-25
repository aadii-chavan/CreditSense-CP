import { useCountUp } from "../hooks/useCountUp";

interface Props {
  value: number | null;
  /** Decimal places to show. */
  decimals?: number;
  /** Render with thousands separators (en-IN grouping). */
  grouped?: boolean;
  /** Shown while `value` is null. */
  placeholder?: string;
}

/** A figure that eases to its new value instead of snapping. */
export function CountUp({ value, decimals = 0, grouped = false, placeholder = "—" }: Props) {
  const shown = useCountUp(value);
  if (shown === null) return <>{placeholder}</>;
  return (
    <>
      {grouped
        ? Math.round(shown).toLocaleString("en-IN")
        : shown.toFixed(decimals)}
    </>
  );
}
