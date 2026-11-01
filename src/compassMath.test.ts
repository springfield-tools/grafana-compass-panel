import {
  buildTrailGeometry,
  compassPointName,
  decimate,
  formatDegrees,
  interpretDirection,
  needleTargetDegrees,
  normalizeDegrees,
  shortArcPath,
  shortestAngleDelta,
} from './compassMath';

describe('normalizeDegrees', () => {
  it.each([
    [0, 0],
    [360, 0],
    [720.5, 0.5],
    [-10, 350],
    [-370, 350],
    [90, 90],
    [359.9, 359.9],
  ])('wraps %s to %s', (input, expected) => {
    expect(normalizeDegrees(input)).toBeCloseTo(expected, 5);
  });

  it('returns NaN for non-finite input', () => {
    expect(normalizeDegrees(Number.NaN)).toBeNaN();
    expect(normalizeDegrees(Number.POSITIVE_INFINITY)).toBeNaN();
  });
});

describe('shortestAngleDelta', () => {
  it('rotates 359° to 1° through north', () => {
    expect(shortestAngleDelta(359, 1)).toBeCloseTo(2, 5);
  });

  it('rotates 1° to 359° through north the other way', () => {
    expect(shortestAngleDelta(1, 359)).toBeCloseTo(-2, 5);
  });

  it('keeps an exact half turn on the positive side of the open interval', () => {
    expect(shortestAngleDelta(0, 180)).toBeCloseTo(180, 5);
    expect(shortestAngleDelta(180, 0)).toBeCloseTo(180, 5);
  });

  it('takes the short way when the numeric gap is more than half a turn', () => {
    expect(shortestAngleDelta(10, 200)).toBeCloseTo(-170, 5);
    expect(shortestAngleDelta(350, 10)).toBeCloseTo(20, 5);
  });

  it('is zero when both angles are the same bearing', () => {
    expect(shortestAngleDelta(720, 0)).toBeCloseTo(0, 5);
  });
});

describe('needleTargetDegrees', () => {
  it('points at the reported bearing when the needle means “from”', () => {
    expect(needleTargetDegrees(202.5, 'from')).toBeCloseTo(202.5, 5);
  });

  it('points opposite the reported bearing when the needle means “to”', () => {
    expect(needleTargetDegrees(202.5, 'to')).toBeCloseTo(22.5, 5);
    expect(needleTargetDegrees(10, 'to')).toBeCloseTo(190, 5);
    expect(needleTargetDegrees(350, 'to')).toBeCloseTo(170, 5);
  });
});

describe('compassPointName', () => {
  it.each([
    [0, 'N'],
    [11.24, 'N'],
    [11.25, 'NNE'],
    [33.75, 'NE'],
    [180, 'S'],
    [202.5, 'SSW'],
    [213.75, 'SW'],
    [225, 'SW'],
    [348.74, 'NNW'],
    [348.75, 'N'],
    [359.9, 'N'],
    [360, 'N'],
    [-10, 'N'],
    [340, 'NNW'],
  ])('names %s° as %s', (degrees, name) => {
    expect(compassPointName(degrees)).toBe(name);
  });
});

describe('formatDegrees', () => {
  it('prints whole degrees without a decimal', () => {
    expect(formatDegrees(0)).toBe('0');
    expect(formatDegrees(360)).toBe('0');
    expect(formatDegrees(90)).toBe('90');
  });

  it('keeps a tenth when the bearing needs it', () => {
    expect(formatDegrees(202.5)).toBe('202.5');
  });
});

describe('interpretDirection', () => {
  it('accepts bearings inside 0–360, including the endpoints', () => {
    expect(interpretDirection(0)).toEqual({ status: 'ok', degrees: 0 });
    expect(interpretDirection(360)).toEqual({ status: 'ok', degrees: 0 });
    expect(interpretDirection('202.5')).toEqual({ status: 'ok', degrees: 202.5 });
  });

  it('treats null, blank, and non-finite values as missing', () => {
    expect(interpretDirection(null)).toEqual({ status: 'missing' });
    expect(interpretDirection(undefined)).toEqual({ status: 'missing' });
    expect(interpretDirection('')).toEqual({ status: 'missing' });
    expect(interpretDirection('   ')).toEqual({ status: 'missing' });
    expect(interpretDirection(Number.NaN)).toEqual({ status: 'missing' });
    expect(interpretDirection('north')).toEqual({ status: 'missing' });
    expect(interpretDirection(Number.POSITIVE_INFINITY)).toEqual({ status: 'missing' });
  });

  it('rejects values outside 0–360 instead of spinning the needle', () => {
    expect(interpretDirection(-1)).toEqual({ status: 'out-of-range', raw: -1 });
    expect(interpretDirection(361)).toEqual({ status: 'out-of-range', raw: 361 });
    expect(interpretDirection(720)).toEqual({ status: 'out-of-range', raw: 720 });
  });
});

describe('shortArcPath', () => {
  it('sweeps clockwise across north from 350° to 10°', () => {
    const path = shortArcPath(350, 10, 76);
    expect(path).not.toBeNull();
    expect(path).toMatch(/A 76 76 0 0 1 /);
  });

  it('sweeps counter-clockwise for the opposite short hop', () => {
    const path = shortArcPath(10, 350, 76);
    expect(path).toMatch(/A 76 76 0 0 0 /);
  });

  it('skips a degenerate arc', () => {
    expect(shortArcPath(20, 20, 76)).toBeNull();
  });
});

describe('decimate and trail geometry', () => {
  it('keeps the first and last sample when thinning a long trail', () => {
    const items = Array.from({ length: 10 }, (_, index) => index);
    expect(decimate(items, 3)).toEqual([0, 5, 9]);
  });

  it('fades older dots and draws one short arc', () => {
    const trail = buildTrailGeometry([350, 10], 76);
    expect(trail.dots).toHaveLength(2);
    expect(trail.dots[0].opacity).toBeLessThan(trail.dots[1].opacity);
    expect(trail.arcs).toHaveLength(1);
    expect(trail.dots[0].y).toBeLessThan(0);
    expect(trail.dots[1].x).toBeGreaterThan(0);
  });
});
