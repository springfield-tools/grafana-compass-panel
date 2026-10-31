import { DataFrame, Field, FieldType } from '@grafana/data';
import { formatMeasurement, readFiniteSamples, selectNumericField } from './readSeries';

function frame(fields: Field[]): DataFrame {
  return {
    name: 'wind',
    length: fields[0]?.values.length ?? 0,
    fields,
  };
}

function field(name: string, type: FieldType, values: unknown[], extra: Partial<Field> = {}): Field {
  return {
    name,
    type,
    config: {},
    values: values as Field['values'],
    ...extra,
  } as Field;
}

describe('readFiniteSamples', () => {
  it('skips nulls and orders samples by time', () => {
    const data = frame([
      field('time', FieldType.time, [30, 10, 20]),
      field('wind_direction_degrees', FieldType.number, [1, null, 202.5]),
    ]);
    const samples = readFiniteSamples(data, data.fields[1]);
    expect(samples).toEqual([
      { time: 20, value: 202.5 },
      { time: 30, value: 1 },
    ]);
  });

  it('uses index order when the frame has no time field', () => {
    const data = frame([field('wind_direction_degrees', FieldType.number, [10, null, 20])]);
    expect(readFiniteSamples(data, data.fields[0]).map((sample) => sample.value)).toEqual([10, 20]);
  });
});

describe('selectNumericField', () => {
  const data = {
    series: [
      frame([
        field('time', FieldType.time, [1]),
        field('wind_direction_degrees', FieldType.number, [180]),
        field('wind_speed_miles_per_hour', FieldType.number, [8]),
      ]),
    ],
    state: 'Done',
  };

  it('falls back to the first numeric field when no direction is chosen', () => {
    expect(selectNumericField(data as never, '', true)?.field.name).toBe('wind_direction_degrees');
    expect(selectNumericField(data as never, undefined, true)?.field.name).toBe('wind_direction_degrees');
  });

  it('does not invent a speed field', () => {
    expect(selectNumericField(data as never, '', false)).toBeUndefined();
  });

  it('matches the configured name and reports a miss', () => {
    expect(selectNumericField(data as never, 'wind_speed_miles_per_hour', false)?.field.name).toBe(
      'wind_speed_miles_per_hour'
    );
    expect(selectNumericField(data as never, 'missing', true)).toBeUndefined();
  });
});

describe('formatMeasurement', () => {
  it('prefers the field display processor', () => {
    const speed = field('wind_speed_miles_per_hour', FieldType.number, [12.4], {
      display: () => ({ text: '12.4', numeric: 12.4, suffix: 'mph' }),
    });
    expect(formatMeasurement(speed, 12.4)).toEqual({ value: '12.4', unit: 'mph' });
  });

  it('rounds a bare number when the field has no display processor', () => {
    const speed = field('wind_speed_miles_per_hour', FieldType.number, [8]);
    expect(formatMeasurement(speed, 8)).toEqual({ value: '8' });
  });
});
