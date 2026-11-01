import { act, renderHook } from '@testing-library/react';
import { useAnimatedAngle } from './useAnimatedAngle';

describe('useAnimatedAngle', () => {
  const callbacks: FrameRequestCallback[] = [];

  beforeEach(() => {
    callbacks.length = 0;
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callbacks.push(callback);
      return callbacks.length;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    jest.spyOn(performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the first bearing immediately', () => {
    const { result } = renderHook(() => useAnimatedAngle(180));
    expect(result.current).toBe(180);
    expect(callbacks).toHaveLength(0);
  });

  it('eases across the unwrapped short path and finishes on the target', () => {
    const { result, rerender } = renderHook(({ target }: { target: number | null }) => useAnimatedAngle(target), {
      initialProps: { target: 359 as number | null },
    });

    rerender({ target: 361 });
    expect(callbacks.length).toBeGreaterThan(0);

    act(() => {
      jest.spyOn(performance, 'now').mockReturnValue(350);
      callbacks.shift()?.(350);
    });
    expect(result.current).toBeGreaterThan(359);
    expect(result.current).toBeLessThan(361);

    act(() => {
      jest.spyOn(performance, 'now').mockReturnValue(700);
      callbacks.shift()?.(700);
    });
    expect(result.current).toBeCloseTo(361, 5);
  });

  it('hides the needle when the target disappears', () => {
    const { result, rerender } = renderHook(({ target }: { target: number | null }) => useAnimatedAngle(target), {
      initialProps: { target: 180 as number | null },
    });
    rerender({ target: null });
    act(() => {
      callbacks.shift()?.(0);
    });
    expect(result.current).toBeNull();
  });
});
