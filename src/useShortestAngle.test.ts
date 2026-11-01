import { renderHook } from '@testing-library/react';
import { useShortestAngle } from './useShortestAngle';

describe('useShortestAngle', () => {
  it('snaps to the first bearing', () => {
    const { result } = renderHook(() => useShortestAngle(359));
    expect(result.current).toBe(359);
  });

  it('advances across 360 when the bearing crosses north', () => {
    const { result, rerender } = renderHook(({ target }: { target: number | null }) => useShortestAngle(target), {
      initialProps: { target: 359 as number | null },
    });
    rerender({ target: 1 });
    expect(result.current).toBeCloseTo(361, 5);
  });

  it('comes back across north without unwinding the long way', () => {
    const { result, rerender } = renderHook(({ target }: { target: number | null }) => useShortestAngle(target), {
      initialProps: { target: 359 as number | null },
    });
    rerender({ target: 1 });
    rerender({ target: 359 });
    expect(result.current).toBeCloseTo(359, 5);
  });

  it('hides the needle when the reading disappears, then snaps to the next one', () => {
    const { result, rerender } = renderHook(({ target }: { target: number | null }) => useShortestAngle(target), {
      initialProps: { target: 90 as number | null },
    });
    rerender({ target: null });
    expect(result.current).toBeNull();
    rerender({ target: 10 });
    expect(result.current).toBe(10);
  });
});
