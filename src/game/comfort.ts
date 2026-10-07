/**
 * Comfort settings, one dial on the home rim that steps through four modes: sound, flashes and the
 * strike's gesture (a slap, or a gentle press and hold for trays and shared spaces). Kept in
 * localStorage. No three.js here.
 */
export interface Comfort {
  sound: boolean;
  flashes: boolean;
  /** The strike is a palm pressed and held still, not slapped. */
  gentle: boolean;
}

const KEY = 'spinsmith.comfort.v1';

/** The dial's modes, in order. */
export const COMFORT_MODES: (Comfort & { name: string })[] = [
  { name: 'Standard', sound: true, flashes: true, gentle: false },
  { name: 'Calm: no flashes, press to strike', sound: true, flashes: false, gentle: true },
  { name: 'Quiet: sound off', sound: false, flashes: true, gentle: false },
  { name: 'Quiet and calm', sound: false, flashes: false, gentle: true },
];

/** The live settings (read every frame where they matter). */
export const COMFORT: Comfort = { ...COMFORT_MODES[0] };
let mode = 0;

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function apply(i: number) {
  mode = (i + COMFORT_MODES.length) % COMFORT_MODES.length;
  const { sound, flashes, gentle } = COMFORT_MODES[mode];
  Object.assign(COMFORT, { sound, flashes, gentle });
}

apply(Number(storage()?.getItem(KEY) ?? 0) || 0);

/** Steps the dial to the next mode, saves it and returns its name. */
export function nextComfort(): string {
  apply(mode + 1);
  storage()?.setItem(KEY, String(mode));
  return COMFORT_MODES[mode].name;
}

/** The dial's mode now (an index into COMFORT_MODES). */
export function comfortMode() {
  return mode;
}
