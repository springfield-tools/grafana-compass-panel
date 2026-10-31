import { useState } from 'react';
import { shortestAngleDelta } from './compassMath';

/**
 * Display angle that always takes the short way to `target`.
 * The returned number is not wrapped: 359° then 1° becomes 361°, so a CSS
 * transition rotates through north instead of the long way around the dial.
 * The first reading snaps into place; later changes ease from the previous one.
 */
export function useShortestAngle(target: number | null): number | null {
  const [state, setState] = useState<{ target: number | null; angle: number | null }>({
    target,
    angle: target != null && Number.isFinite(target) ? target : null,
  });

  const usable = target != null && Number.isFinite(target) ? target : null;
  if (usable !== state.target) {
    const angle =
      usable == null ? null : state.angle == null ? usable : state.angle + shortestAngleDelta(state.angle, usable);
    setState({ target: usable, angle });
  }

  return state.angle;
}
