/**
 * Comfort settings as independent toggles that combine: sound, flashes, the strike's gesture (a slap,
 * or a gentle press and hold for trays and shared spaces), assist, one hand, contrast, a
 * colour-blind-safe palette and the left-handed layout. On the home rim, a pinch on the brass dial
 * turns it to the next setting and a pinch on its plate turns that setting on or off (presets such as
 * Calm set several at once). Each toggle is kept in localStorage. No three.js here.
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
  /** Left-handed: the near-rim stations swap sides (also held on after ?lefty, until ?lefty=0 or the toggle is turned off). */
  lefty?: boolean;
  /** Colour-safe: warnings and safe marks use a blue / orange / yellow palette (no red against green or orange). */
  colorSafe?: boolean;
  /** Large text: the card, the stamps and the match bar read 1.3x bigger. */
  bigText?: boolean;
}

/**
 * The colour-safe palette (Okabe-Ito): readable with protanopia, deuteranopia and tritanopia. Who owns
 * a mark is also told by shape (your rings are round, the rival's are hexagons), never colour alone.
 */
export const SAFE_COLORS = { danger: 0xe69f00, safe: 0x56b4e9, edge: 0xf0e442, neutral: 0xf2f2f2 } as const;

/** Large text: how much bigger the card, stamps, bar and gauge labels read. */
export const BIG_TEXT = 1.3;

/** The read surfaces' scale for the Large text setting (1 when it is off). */
export function textScale(): number {
  return COMFORT.bigText ? BIG_TEXT : 1;
}

/** `normal` in the usual palette, `safe` in the colour-safe mode. */
export function warnColor(normal: number, safe: number): number {
  return COMFORT.colorSafe ? safe : normal;
}

/** Every toggle, by its value in COMFORT. */
export type Setting = 'sound' | 'flashes' | 'gentle' | 'assist' | 'oneHand' | 'contrast' | 'lefty' | 'colorSafe' | 'bigText';
const SETTINGS: Setting[] = ['sound', 'flashes', 'gentle', 'assist', 'oneHand', 'contrast', 'lefty', 'colorSafe', 'bigText'];
type Settings = Record<Setting, boolean>;
const DEFAULTS: Settings = { sound: true, flashes: true, gentle: false, assist: false, oneHand: false, contrast: false, lefty: false, colorSafe: false, bigText: false };

/** The toggles (JSON, one boolean per setting). */
const KEY = 'spinsmith.comfort.v2';
/** The old single-choice dial: an index into LEGACY_COMFORT_MODES, migrated to the toggles once. */
const OLD_KEY = 'spinsmith.comfort.v1';
const LEFTY_KEY = 'spinsmith.lefty.v1';

/** The old dial's modes, in order (only read to migrate a saved v1 mode to the toggles). */
export const LEGACY_COMFORT_MODES: (Partial<Settings> & { name: string })[] = [
  { name: 'Standard' },
  { name: 'Calm', flashes: false, gentle: true },
  { name: 'Quiet', sound: false },
  { name: 'Quiet and calm', sound: false, flashes: false, gentle: true },
  { name: 'Assist', flashes: false, gentle: true, assist: true },
  { name: 'One hand', flashes: false, gentle: true, oneHand: true },
  { name: 'High contrast', flashes: false, gentle: true, contrast: true },
  { name: 'Left-handed', lefty: true },
  { name: 'Colour-safe', colorSafe: true },
];

/** A stop on the dial: one toggle (the setting and its value when ON) or a preset (several at once). */
export interface DialStop {
  name: string;
  detail: string;
  toggle?: [Setting, boolean];
  preset?: Partial<Settings>;
}

/** The dial's stops, in order. Presets are combinations of the toggles; Standard keeps the hand. */
export const COMFORT_DIAL: DialStop[] = [
  { name: 'Calm', detail: 'no flashes, press to strike', preset: { flashes: false, gentle: true } },
  { name: 'Quiet', detail: 'sound off', toggle: ['sound', false] },
  { name: 'No flashes', detail: 'no white flashes', toggle: ['flashes', false] },
  { name: 'Press to strike', detail: 'press and hold, no slap', toggle: ['gentle', true] },
  { name: 'Assist', detail: 'fights at 80% speed', toggle: ['assist', true] },
  { name: 'One hand', detail: 'hold the rim to forge', toggle: ['oneHand', true] },
  { name: 'High contrast', detail: 'bold team rings', toggle: ['contrast', true] },
  { name: 'Left-handed', detail: 'home stations swap sides', toggle: ['lefty', true] },
  { name: 'Colour-safe', detail: 'blue and orange warnings', toggle: ['colorSafe', true] },
  { name: 'Large text', detail: 'cards and calls 1.3x', toggle: ['bigText', true] },
  { name: 'Standard', detail: 'every setting off but the hand', preset: { sound: true, flashes: true, gentle: false, assist: false, oneHand: false, contrast: false, colorSafe: false, bigText: false } },
];

/** The live settings (read every frame where they matter). */
export const COMFORT: Comfort = { ...DEFAULTS };
/** What the player chose (COMFORT.lefty is also held on by the ?lefty flag). */
let chosen: Settings = { ...DEFAULTS };
let leftyFlag = false;
let stop = 0;
let store: Storage | null = null;

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function read(k: string): string | null {
  try {
    return store?.getItem(k) ?? null;
  } catch {
    return null;
  }
}

function write(k: string, v: string | null) {
  try {
    if (v === null) store?.removeItem(k);
    else store?.setItem(k, v);
  } catch {
    // Not kept: the settings still work for this session.
  }
}

function apply() {
  Object.assign(COMFORT, chosen, { lefty: chosen.lefty || leftyFlag });
}

/**
 * Reads the toggles (migrating an old single-mode save to its matching toggles) and the old ?lefty
 * URL flag (?lefty=0 clears it), which holds the left-handed layout on. Runs once on load; the
 * headless check calls it with its own storage and query.
 */
export function loadComfort(st: Storage | null = storage(), search = typeof location === 'undefined' ? '' : location.search) {
  store = st;
  try {
    const q = new URLSearchParams(search);
    if (q.has('lefty')) write(LEFTY_KEY, q.get('lefty') === '0' ? '' : '1');
  } catch {
    // No query: the saved flag stands.
  }
  leftyFlag = !!read(LEFTY_KEY);
  chosen = { ...DEFAULTS };
  const saved = read(KEY);
  if (saved) {
    try {
      const o = JSON.parse(saved) as Partial<Settings>;
      for (const k of SETTINGS) if (typeof o?.[k] === 'boolean') chosen[k] = o[k];
    } catch {
      // A broken save: the defaults.
    }
  } else {
    const old = read(OLD_KEY);
    if (old !== null) {
      const n = Number(old);
      const L = LEGACY_COMFORT_MODES.length;
      const { name: _name, ...mode } = LEGACY_COMFORT_MODES[Number.isInteger(n) ? ((n % L) + L) % L : 0];
      Object.assign(chosen, mode);
      write(KEY, JSON.stringify(chosen));
      write(OLD_KEY, null);
    }
  }
  stop = 0;
  apply();
}

loadComfort();

/** Whether a dial stop is on now (a preset: every setting it sets already is). */
export function stopOn(s: DialStop): boolean {
  if (s.toggle) return COMFORT[s.toggle[0]] === s.toggle[1];
  return Object.entries(s.preset ?? {}).every(([k, v]) => COMFORT[k as Setting] === v);
}

/** The dial's stop now, its state and its one-line text ("Quiet: ON (sound off)"). */
export function comfortStop() {
  const s = COMFORT_DIAL[stop];
  const on = stopOn(s);
  return { ...s, on, text: `${s.name}: ${on ? 'ON' : 'OFF'} (${s.detail})` };
}

/** Turns the dial to the next stop (changes nothing) and returns its text. */
export function nextComfort(): string {
  stop = (stop + 1) % COMFORT_DIAL.length;
  return comfortStop().text;
}

/**
 * The plate's pinch: turns the dial's toggle on or off, or applies its preset (a preset already on
 * goes back to the defaults for what it sets). Saves every toggle and returns the stop's new text.
 */
export function toggleComfort(): string {
  const s = COMFORT_DIAL[stop];
  const on = stopOn(s);
  if (s.toggle) {
    const [k, v] = s.toggle;
    chosen[k] = on ? !v : v;
    // Turning the left-handed layout off by hand also drops the ?lefty flag that held it.
    if (k === 'lefty' && on && leftyFlag) {
      leftyFlag = false;
      write(LEFTY_KEY, '');
    }
  } else {
    for (const [k, v] of Object.entries(s.preset ?? {})) chosen[k as Setting] = on ? DEFAULTS[k as Setting] : v;
  }
  write(KEY, JSON.stringify(chosen));
  apply();
  return comfortStop().text;
}

/** The dial's stop now (an index into COMFORT_DIAL). */
export function comfortMode() {
  return stop;
}

/** The toggles that are on, by name ("Quiet, Left-handed"), or "Standard". */
export function comfortSummary(): string {
  const on = COMFORT_DIAL.filter((s) => s.toggle && stopOn(s)).map((s) => s.name);
  return on.length ? on.join(', ') : 'Standard';
}
