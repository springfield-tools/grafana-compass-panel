import { PanelData } from '@grafana/data';
import {
  buildTrailGeometry,
  compassPointName,
  formatDegrees,
  formatRawNumber,
  interpretDirection,
  needleTargetDegrees,
  TrailGeometry,
} from './compassMath';
import { formatMeasurement, readFiniteSamples, selectNumericField } from './readSeries';
import { CompassOptions } from './types';

export interface CompassModel {
  /** No query result at all — the caller shows Grafana's standard empty state. */
  emptySeries: boolean;
  /** Banner when the panel cannot resolve a direction field. */
  blockedMessage: string | null;
  /** Unwrapped-ready needle angle in degrees clockwise from north, or null to hide the needle. */
  target: number | null;
  readout: string;
  detail: string | null;
  speed: { value: string; unit?: string } | null;
  trail: TrailGeometry;
  ariaLabel: string;
}

const EMPTY_TRAIL: TrailGeometry = { dots: [], arcs: [] };
const TRAIL_RADIUS = 76;

export function buildCompassModel(options: CompassOptions, data: PanelData): CompassModel {
  const meaning = options.needleMeaning === 'to' ? 'to' : 'from';
  const showTrail = options.showTrail === true;

  if (!data.series?.length) {
    return {
      emptySeries: true,
      blockedMessage: null,
      target: null,
      readout: 'No data',
      detail: null,
      speed: null,
      trail: EMPTY_TRAIL,
      ariaLabel: 'Compass, no data',
    };
  }

  const direction = selectNumericField(data, options.directionField, !options.directionField?.trim());
  if (!direction) {
    const blockedMessage = options.directionField?.trim() ? 'Direction field not found' : 'No numeric field';
    return {
      emptySeries: false,
      blockedMessage,
      target: null,
      readout: blockedMessage,
      detail: null,
      speed: null,
      trail: EMPTY_TRAIL,
      ariaLabel: `Compass, ${blockedMessage}`,
    };
  }

  const samples = readFiniteSamples(direction.frame, direction.field);
  const latest = samples.length > 0 ? samples[samples.length - 1].value : undefined;
  const reading = latest === undefined ? interpretDirection(null) : interpretDirection(latest);

  const speedField = selectNumericField(data, options.speedField, false);
  let speed: CompassModel['speed'] = null;
  if (speedField) {
    const speedSamples = readFiniteSamples(speedField.frame, speedField.field);
    const latestSpeed = speedSamples.length > 0 ? speedSamples[speedSamples.length - 1].value : undefined;
    if (latestSpeed !== undefined) {
      speed = formatMeasurement(speedField.field, latestSpeed);
    }
  }

  const trailDegrees = showTrail
    ? samples.flatMap((sample) => {
        const interpreted = interpretDirection(sample.value);
        return interpreted.status === 'ok' ? [needleTargetDegrees(interpreted.degrees, meaning)] : [];
      })
    : [];
  const trail = buildTrailGeometry(trailDegrees, TRAIL_RADIUS);

  if (reading.status === 'missing') {
    return {
      emptySeries: false,
      blockedMessage: null,
      target: null,
      readout: 'No data',
      detail: null,
      speed,
      trail,
      ariaLabel: 'Compass, no direction data',
    };
  }

  if (reading.status === 'out-of-range') {
    const raw = formatRawNumber(reading.raw);
    return {
      emptySeries: false,
      blockedMessage: null,
      target: null,
      readout: 'Out of range',
      detail: raw ? `${raw}°` : null,
      speed,
      trail,
      ariaLabel: `Compass, direction out of range${raw ? ` (${raw} degrees)` : ''}`,
    };
  }

  const point = compassPointName(reading.degrees);
  const degreesText = formatDegrees(reading.degrees);
  const toward = needleTargetDegrees(reading.degrees, meaning);
  const detail = meaning === 'from' ? 'from' : `toward ${compassPointName(toward)}`;

  return {
    emptySeries: false,
    blockedMessage: null,
    target: toward,
    readout: `${degreesText}° ${point}`,
    detail,
    speed,
    trail,
    ariaLabel: `Wind from ${degreesText} degrees ${point}`,
  };
}
