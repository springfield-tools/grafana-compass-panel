import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 700;

/** Smoothstep-style ease matching a soft ease-in-out. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Interpolate toward `target` in user-space degrees.
 * `target` is already the unwrapped shortest-path angle (359 then 1 is 361),
 * so a linear tween passes through north. The SVG `transform` attribute consumes
 * the result; a CSS transform on the group is clipped away when the viewBox
 * is centered on the origin.
 */
export function useAnimatedAngle(target: number | null): number | null {
  const usable = target != null && Number.isFinite(target) ? target : null;
  const [angle, setAngle] = useState<number | null>(usable);
  const angleRef = useRef<number | null>(usable);

  useEffect(() => {
    const from = angleRef.current;
    let frame = 0;

    const commit = (next: number | null) => {
      angleRef.current = next;
      setAngle(next);
    };

    if (from === usable) {
      return;
    }

    if (usable == null || from == null || prefersReducedMotion()) {
      frame = requestAnimationFrame(() => commit(usable));
      return () => cancelAnimationFrame(frame);
    }

    const start = performance.now();
    const delta = usable - from;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      commit(from + delta * easeInOutCubic(t));
      if (t < 1) {
        frame = requestAnimationFrame(step);
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [usable]);

  return angle;
}
