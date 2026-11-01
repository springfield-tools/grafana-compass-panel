/** Where the needle points relative to the reported meteorological direction. */
export type NeedleMeaning = 'from' | 'to';

export interface CompassOptions {
  /** Field name from the panel field picker. Empty uses the first numeric field. */
  directionField?: string;
  /** Optional numeric field drawn in the hub. Empty hides the speed readout. */
  speedField?: string;
  needleMeaning: NeedleMeaning;
  /** Draw faded marks for earlier directions in the current time range. */
  showTrail: boolean;
}
