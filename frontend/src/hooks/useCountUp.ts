import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../lib/motion";

interface Options {
  durationMs?: number;
}

/**
 * Eases a number towards `target` so figures settle rather than snap.
 *
 * An in-flight animation is picked up from wherever it had reached, so rapid
 * changes — dragging a slider on Assess — stay smooth instead of restarting.
 * Returns `target` immediately when the viewer prefers reduced motion, and
 * `null` passes straight through for "no value yet".
 */
export function useCountUp(target: number | null, { durationMs = 420 }: Options = {}): number | null {
  const [value, setValue] = useState<number | null>(target);
  const currentRef = useRef(target ?? 0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === null) {
      setValue(null);
      return;
    }
    if (prefersReducedMotion()) {
      currentRef.current = target;
      setValue(target);
      return;
    }

    const from = currentRef.current;
    const delta = target - from;
    if (Math.abs(delta) < 0.005) {
      currentRef.current = target;
      setValue(target);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // Cubic ease-out: quick to move, slow to settle.
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + delta * eased;
      currentRef.current = next;
      setValue(next);
      frameRef.current = t < 1 ? requestAnimationFrame(tick) : null;
      if (t >= 1) currentRef.current = target;
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, durationMs]);

  return value;
}
