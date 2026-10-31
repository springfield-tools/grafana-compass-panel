import { DataFrame, Field, FieldType, getFieldDisplayName, PanelData } from '@grafana/data';

export interface NumericFieldRef {
  frame: DataFrame;
  field: Field;
  displayName: string;
}

export interface TimedSample {
  time: number;
  value: number;
}

export function listNumericFields(data: PanelData): NumericFieldRef[] {
  const refs: NumericFieldRef[] = [];
  for (const frame of data.series) {
    for (const field of frame.fields) {
      if (field.type !== FieldType.number) {
        continue;
      }
      refs.push({
        frame,
        field,
        displayName: getFieldDisplayName(field, frame, data.series),
      });
    }
  }
  return refs;
}

/**
 * Resolve a panel field-picker value.
 * When `fallback` is set and no name was chosen, the first numeric field is used.
 * A name that does not match returns undefined so the panel can say so.
 */
export function selectNumericField(
  data: PanelData,
  configuredName: string | undefined,
  fallback: boolean
): NumericFieldRef | undefined {
  const fields = listNumericFields(data);
  const name = configuredName?.trim();
  if (name) {
    return fields.find((item) => item.field.name === name || item.displayName === name);
  }
  return fallback ? fields[0] : undefined;
}

/** Finite numeric samples ordered by the frame's time field (or by index). Nulls are skipped. */
export function readFiniteSamples(frame: DataFrame, field: Field): TimedSample[] {
  const timeField = frame.fields.find((candidate) => candidate.type === FieldType.time);
  const samples: TimedSample[] = [];
  const length = field.values?.length ?? 0;

  for (let index = 0; index < length; index++) {
    const raw = field.values[index];
    const numeric = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : Number.NaN;
    if (!Number.isFinite(numeric)) {
      continue;
    }
    const timeRaw = timeField ? timeField.values[index] : index;
    const time = typeof timeRaw === 'number' && Number.isFinite(timeRaw) ? timeRaw : index;
    samples.push({ time, value: numeric });
  }

  samples.sort((left, right) => left.time - right.time);
  return samples;
}

export interface FormattedMeasurement {
  value: string;
  unit?: string;
}

/** Use the field's Grafana display processor when the datasource or unit override provides one. */
export function formatMeasurement(field: Field, value: number): FormattedMeasurement {
  const display = field.display?.(value);
  if (display?.text) {
    const unit = display.suffix && !display.text.endsWith(display.suffix) ? display.suffix : undefined;
    return { value: display.text, unit };
  }
  const rounded = Math.round(value * 10) / 10;
  return { value: rounded.toFixed(1).replace(/\.0$/, '') };
}
