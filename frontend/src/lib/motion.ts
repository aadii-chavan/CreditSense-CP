/** True when the viewer has asked the system for reduced motion. */
export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * Inline style carrying a child's position in a staggered group. The CSS reads
 * it as `--stagger-index` to offset that child's animation-delay.
 */
export const stagger = (index: number): React.CSSProperties =>
  ({ "--stagger-index": index }) as React.CSSProperties;
