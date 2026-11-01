import { FieldType, PanelPlugin } from '@grafana/data';
import { CompassPanel } from './components/CompassPanel';
import { CompassOptions } from './types';

export const plugin = new PanelPlugin<CompassOptions>(CompassPanel).setPanelOptions((builder) => {
  return builder
    .addFieldNamePicker({
      path: 'directionField',
      name: 'Direction field',
      description: 'Numeric degrees, clockwise from north (0–360). Meteorological direction the wind comes from.',
      settings: {
        filter: (field) => field.type === FieldType.number,
        noFieldsMessage: 'No numeric fields found',
      },
    })
    .addFieldNamePicker({
      path: 'speedField',
      name: 'Speed field',
      description: 'Optional numeric field shown in the center of the dial.',
      settings: {
        filter: (field) => field.type === FieldType.number,
        noFieldsMessage: 'No numeric fields found',
      },
    })
    .addRadio({
      path: 'needleMeaning',
      name: 'Needle points',
      description: 'The direction field is still the meteorological “from” bearing. This only changes the needle.',
      defaultValue: 'from',
      settings: {
        options: [
          { value: 'from', label: 'Where the wind comes from' },
          { value: 'to', label: 'Where the wind blows to' },
        ],
      },
    })
    .addBooleanSwitch({
      path: 'showTrail',
      name: 'Show direction trail',
      description: 'Faded dots and short arcs for earlier directions in the current time range.',
      defaultValue: false,
    });
});
