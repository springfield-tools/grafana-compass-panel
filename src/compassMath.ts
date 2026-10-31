import { NeedleMeaning } from './types';

/** Sixteen-point compass names, clockwise from north. */
export const COMPASS_POINTS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
] as const;

const SECTOR_DEGREES = 22.5;
const HALF_SECTOR = SECTOR_DEGREES / 2;
/** Values a hair outside 0–360 still count as north (sensor rounding). */
const RANGE_EPSILON = 1e-6;

export type DirectionReading =
  { status: 'ok'; degrees: number } | { status: 'missing' } | { status: 'out-of-range'; raw: number };

/**
 * Wrap any finite angle into [0, 360).
 * 360 and -360 become 0. Negative angles wrap the short way (–10° → 350°).
 */
export function normalizeDegrees(degrees: number): number {
  if (!Number.isFinite(degrees)) {
    return Number.NaN;
  }
  const wrapped = ((degrees % 360) + 360) % 360;
  return wrapped === 0 ? 0 : wrapped;
}

/**
 * Signed shortest rotation from `from` to `to`, in (–180, 180].
 * 359° → 1° is +2 (through north), not –358.
 */
export function shortestAngleDelta(from: number, to: number): number {
  const start = normalizeDegrees(from);
  const end = normalizeDegrees(to);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return Number.NaN;
  }
  let delta = end - start;
  if (delta > 180) {
    delta -= 360;
  } else if (delta <= -180) {
    delta += 360;
  }
  return delta;
}

/** Bearing the needle should settle on, in [0, 360). */
export function needleTargetDegrees(directionDegrees: number, meaning: NeedleMeaning): number {
  const from = normalizeDegrees(directionDegrees);
  if (meaning === 'to') {
    return normalizeDegrees(from + 180);
  }
  return from;
}

export function compassPointName(degrees: number): string {
  const normalized = normalizeDegrees(degrees);
  if (!Number.isFinite(normalized)) {
    return '';
  }
  const index = Math.floor((normalized + HALF_SECTOR) / SECTOR_DEGREES) % COMPASS_POINTS.length;
  return COMPASS_POINTS[index];
}

export function formatDegrees(degrees: number): string {
  const normalized = normalizeDegrees(degrees);
  if (!Number.isFinite(normalized)) {
    return '';
  }
  const rounded = Math.round(normalized * 10) / 10;
  const shown = rounded >= 360 ? 0 : rounded;
  return shown.toFixed(1).replace(/\.0$/, '');
}

export function formatRawNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '';
  }
  if (Math.abs(value) >= 10000) {
    return value.toExponential(2);
  }
  return value.toFixed(1).replace(/\.0$/, '');
}

/**
 * Classify a raw field value.
 * Finite numbers inside [0, 360] (inclusive, with a tiny epsilon) are directions.
 * Anything else numeric is out of range; null, blank, and non-finite are missing.
 */
export function interpretDirection(value: unknown): DirectionReading {
  if (value == null) {
    return { status: 'missing' };
  }
  if (typeof value === 'string' && value.trim() === '') {
    return { status: 'missing' };
  }
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(numeric)) {
    return { status: 'missing' };
  }
  if (numeric < -RANGE_EPSILON || numeric > 360 + RANGE_EPSILON) {
    return { status: 'out-of-range', raw: numeric };
  }
  return { status: 'ok', degrees: normalizeDegrees(numeric) };
}

/** Point on a dial where 0° is north and degrees increase clockwise. */
export function pointOnDial(degreesFromNorth: number, radius: number): { x: number; y: number } {
  const radians = (normalizeDegrees(degreesFromNorth) * Math.PI) / 180;
  return {
    x: radius * Math.sin(radians),
    y: -radius * Math.cos(radians),
  };
}

/**
 * SVG arc along the dial, taking the short way around.
 * Returns null when the two bearings are effectively the same point.
 */
export function shortArcPath(fromDegrees: number, toDegrees: number, radius: number): string | null {
  const delta = shortestAngleDelta(fromDegrees, toDegrees);
  if (!Number.isFinite(delta) || Math.abs(delta) < 0.4) {
    return null;
  }
  const start = pointOnDial(fromDegrees, radius);
  const end = pointOnDial(toDegrees, radius);
  const sweep = delta > 0 ? 1 : 0;
  const n = (value: number) => value.toFixed(3);
  return `M ${n(start.x)} ${n(start.y)} A ${radius} ${radius} 0 0 ${sweep} ${n(end.x)} ${n(end.y)}`;
}

export function decimate<T>(items: T[], maxPoints: number): T[] {
  if (maxPoints < 1 || items.length <= maxPoints) {
    return items;
  }
  if (maxPoints === 1) {
    return [items[items.length - 1]];
  }
  const sampled: T[] = [];
  const step = (items.length - 1) / (maxPoints - 1);
  for (let index = 0; index < maxPoints; index++) {
    sampled.push(items[Math.round(index * step)]);
  }
  return sampled;
}

export interface TrailDot {
  x: number;
  y: number;
  opacity: number;
}

export interface TrailGeometry {
  dots: TrailDot[];
  arcs: string[];
}

/** Faded dots, and short arcs between neighbors, for a time-ordered list of needle angles. */
export function buildTrailGeometry(needleDegrees: number[], radius: number, maxPoints = 240): TrailGeometry {
  const finite = needleDegrees.filter((degrees) => Number.isFinite(degrees));
  const sampled = decimate(finite, maxPoints);
  const count = sampled.length;
  const dots = sampled.map((degrees, index) => {
    const point = pointOnDial(degrees, radius);
    const opacity = count === 1 ? 0.8 : 0.18 + (0.67 * index) / (count - 1);
    return { x: point.x, y: point.y, opacity };
  });
  const arcs: string[] = [];
  for (let index = 1; index < sampled.length; index++) {
    const path = shortArcPath(sampled[index - 1], sampled[index], radius);
    if (path) {
      arcs.push(path);
    }
  }
  return { dots, arcs };
}
