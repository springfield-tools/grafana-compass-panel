import { FieldType, LoadingState, PanelData } from '@grafana/data';
import { buildCompassModel } from './compassModel';
import { CompassOptions } from './types';

const options: CompassOptions = {
  directionField: 'wind_direction_degrees',
  speedField: 'wind_speed_miles_per_hour',
  needleMeaning: 'from',
  showTrail: true,
};

function panelData(values: Array<number | null>, speed: Array<number | null> = [12]): PanelData {
  return {
    state: LoadingState.Done,
    series: [
      {
        name: 'wind',
        length: values.length,
        fields: [
          {
            name: 'time',
            type: FieldType.time,
            config: {},
            values: values.map((_, index) => index),
          },
          {
            name: 'wind_direction_degrees',
            type: FieldType.number,
            config: {},
            values,
          },
          {
            name: 'wind_speed_miles_per_hour',
            type: FieldType.number,
            config: {},
            values: speed,
            display: (value: number) => ({ text: String(value), numeric: value, suffix: 'mph' }),
          },
        ],
      },
    ],
    timeRange: {} as PanelData['timeRange'],
  } as PanelData;
}

describe('buildCompassModel', () => {
  it('names the latest in-range sample and aims the needle there', () => {
    const model = buildCompassModel(options, panelData([350, null, 202.5]));
    expect(model.readout).toBe('202.5° SSW');
    expect(model.detail).toBe('from');
    expect(model.target).toBeCloseTo(202.5, 5);
    expect(model.speed).toEqual({ value: '12', unit: 'mph' });
    expect(model.trail.dots.length).toBeGreaterThan(0);
  });

  it('points the needle downwind without changing the reported bearing', () => {
    const model = buildCompassModel({ ...options, needleMeaning: 'to', showTrail: false }, panelData([0]));
    expect(model.readout).toBe('0° N');
    expect(model.detail).toBe('toward S');
    expect(model.target).toBeCloseTo(180, 5);
    expect(model.trail.dots).toHaveLength(0);
  });

  it('hides the needle for null and out-of-range values', () => {
    expect(buildCompassModel(options, panelData([null, null])).readout).toBe('No data');
    expect(buildCompassModel(options, panelData([null, null])).target).toBeNull();

    const outOfRange = buildCompassModel(options, panelData([361]));
    expect(outOfRange.readout).toBe('Out of range');
    expect(outOfRange.detail).toBe('361°');
    expect(outOfRange.target).toBeNull();
  });

  it('reports an empty series separately from a null sample', () => {
    const empty = buildCompassModel(options, {
      state: LoadingState.Done,
      series: [],
      timeRange: {} as PanelData['timeRange'],
    });
    expect(empty.emptySeries).toBe(true);
  });
});
