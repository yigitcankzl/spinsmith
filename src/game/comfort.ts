/**
 * Comfort settings, one dial on the home rim that steps through its modes: sound, flashes, the
 * strike's gesture (a slap, or a gentle press and hold for trays and shared spaces), assist, one
 * hand, contrast, a colour-blind-safe palette and the left-handed layout. Kept in localStorage. No three.js here.
 */
export interface Comfort {
  sound: boolean;
  flashes: boolean;
  /** The strike is a palm pressed and held still, not slapped. */
  gentle: boolean;
  /** Assist: fights run at 80% speed (more time to read and reach). */
  assist?: boolean;
  /** One hand: a single rim grip forges the arena; the far rim mirrors the hand. */
  oneHand?: boolean;
  /** High contrast: each top's team ring is wide and solid, so who is who reads at a glance. */
  contrast?: boolean;
  /** Left-handed: the near-rim stations swap sides (also on in every mode after ?lefty, until ?lefty=0). */
  lefty?: boolean;
  /** Colour-safe: warnings and safe marks use a blue / orange / yellow palette (no red against green or orange). */
  colorSafe?: boolean;
}

/**
 * The colour-safe palette (Okabe-Ito): readable with protanopia, deuteranopia and tritanopia. Who owns
 * a mark is also told by shape (your rings are round, the rival's are hexagons), never colour alone.
 */
export const SAFE_COLORS = { danger: 0xe69f00, safe: 0x56b4e9, edge: 0xf0e442, neutral: 0xf2f2f2 } as const;

/** `normal` in the usual palette, `safe` in the colour-safe mode. */
export function warnColor(normal: number, safe: number): number {
  return COMFORT.colorSafe ? safe : normal;
}

const KEY = 'spinsmith.comfort.v1';
const LEFTY_KEY = 'spinsmith.lefty.v1';

/** The dial's modes, in order. */
export const COMFORT_MODES: (Comfort & { name: string })[] = [
  { name: 'Standard', sound: true, flashes: true, gentle: false },
  { name: 'Calm: no flashes, press to strike', sound: true, flashes: false, gentle: true },
  { name: 'Quiet: sound off', sound: false, flashes: true, gentle: false },
  { name: 'Quiet and calm', sound: false, flashes: false, gentle: true },
  { name: 'Assist: fights at 80% speed, calm', sound: true, flashes: false, gentle: true, assist: true },
  { name: 'One hand: hold the rim to forge, calm', sound: true, flashes: false, gentle: true, oneHand: true },
  { name: 'High contrast: bold team rings, calm', sound: true, flashes: false, gentle: true, contrast: true },
  { name: 'Left-handed: home stations swap sides', sound: true, flashes: true, gentle: false, lefty: true },
  { name: 'Colour-safe: blue and orange warnings', sound: true, flashes: true, gentle: false, colorSafe: true },
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

/** The old ?lefty URL flag (?lefty=0 clears it): kept, and it holds the left-handed layout in every mode. */
const leftyFlag = (() => {
  try {
    const q = typeof location === 'undefined' ? null : new URLSearchParams(location.search);
    if (q?.has('lefty')) storage()?.setItem(LEFTY_KEY, q.get('lefty') === '0' ? '' : '1');
    return !!storage()?.getItem(LEFTY_KEY);
  } catch {
    return false;
  }
})();

function apply(i: number) {
  mode = (i + COMFORT_MODES.length) % COMFORT_MODES.length;
  const { sound, flashes, gentle, assist = false, oneHand = false, contrast = false, lefty = false, colorSafe = false } = COMFORT_MODES[mode];
  Object.assign(COMFORT, { sound, flashes, gentle, assist, oneHand, contrast, lefty: lefty || leftyFlag, colorSafe });
}

apply(Number(storage()?.getItem(KEY) ?? 0) || 0);

/** Steps the dial to the next mode, saves it and returns its name. */
export function nextComfort(): string {
  apply(mode + 1);
  try {
    storage()?.setItem(KEY, String(mode));
  } catch {
    // Not kept: the dial still works for this session.
  }
  return COMFORT_MODES[mode].name;
}

/** The dial's mode now (an index into COMFORT_MODES). */
export function comfortMode() {
  return mode;
}
