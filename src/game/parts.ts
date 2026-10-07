/**
 * Top parts: a top is a Ring (contact and mass), a Core (height and burst lock) and a Tip
 * (movement), plus a Crest (color and spin direction). Each part is a row of numbers; the
 * fight stats of a build are put together from its rows, like the stats on a toy's box.
 * No three.js here, so builds can be checked and balanced headlessly.
 */
import type { Contact, RivalMove, Seal, TopSpec } from './sim.ts';

export interface Ring {
  id: string;
  name: string;
  /** Collision radius (m). */
  radius: number;
  punch: number;
  knockback: number;
  burstResist: number;
  contact: Contact;
  /** Burst damage dealt multiplier. */
  chip: number;
  /** Multiplies the tip's spin drain: mass out on the rim keeps spinning longer. */
  drain: number;
  /** Grams, against the weight limit. */
  weight: number;
  /** Contact points around the blade (0 = a round blade).*/
  blades: number;
  blurb: string;
}

export interface Core {
  id: string;
  name: string;
  /** Height of the contact ring (m). */
  height: number;
  /** Multiplies burst resistance (lock teeth). */
  lock: number;
  /** Multiplies punch (a stiffer lock gives a little). */
  punch: number;
  /** Lock teeth: the clicks you hear when it locks. */
  teeth: number;
  weight: number;
  blurb: string;
}

export type TipShape = 'flat' | 'rush' | 'taper' | 'ball' | 'needle' | 'orb';

export interface Tip {
  id: TipShape;
  name: string;
  spinDrain: number;
  roam: number;
  cruise: number;
  drive: number;
  maxSpeed: number;
  seek: number;
  center: number;
  gear: number;
  weight: number;
  blurb: string;
}

export const RINGS: Ring[] = [
  {
    id: 'striker',
    name: 'Striker',
    radius: 0.024,
    punch: 0.884,
    knockback: 0.84,
    burstResist: 1,
    contact: 'smash',
    chip: 1,
    drain: 1,
    weight: 24,
    blades: 3,
    blurb: 'Smash: hits hard, bounces hard',
  },
  {
    id: 'hook',
    name: 'Hook',
    radius: 0.025,
    punch: 0.81,
    knockback: 0.86,
    burstResist: 0.95,
    contact: 'upper',
    chip: 1,
    drain: 1,
    weight: 23,
    blades: 3,
    blurb: 'Upper: lifts tops over walls',
  },
  {
    id: 'anvil',
    name: 'Anvil',
    radius: 0.03,
    punch: 0.84,
    knockback: 0.563,
    burstResist: 1.28,
    contact: 'absorb',
    chip: 1,
    drain: 1,
    weight: 30,
    blades: 0,
    blurb: 'Absorb: heavy, shrugs off hits',
  },
  {
    id: 'halo',
    name: 'Halo',
    radius: 0.027,
    punch: 0.7,
    knockback: 1.022,
    burstResist: 0.92,
    contact: 'absorb',
    chip: 1,
    drain: 0.9,
    weight: 27,
    blades: 0,
    blurb: 'Mass on the rim: spins long',
  },
  {
    id: 'saw',
    name: 'Saw',
    radius: 0.026,
    punch: 0.76,
    knockback: 0.78,
    burstResist: 1.05,
    contact: 'smash',
    chip: 1.45,
    drain: 1,
    weight: 25,
    blades: 6,
    blurb: 'Many small teeth: chips toward a shatter',
  },
  {
    id: 'cog',
    name: 'Cog',
    radius: 0.026,
    punch: 0.83,
    knockback: 0.8,
    burstResist: 1.16,
    contact: 'grind',
    chip: 1,
    drain: 1,
    weight: 26,
    blades: 12,
    blurb: 'Grind: steals spin from opposite spin',
  },
  {
    // Rim Raider's signature: knock it out once to take it.
    id: 'gale',
    name: 'Gale',
    radius: 0.025,
    punch: 0.79,
    knockback: 0.92,
    burstResist: 0.95,
    contact: 'upper',
    chip: 1,
    drain: 0.97,
    weight: 22,
    blades: 4,
    blurb: 'Light upper: quick, lifts tops, spins a little longer',
  },
  {
    // Iron Keep's signature.
    id: 'bulwark',
    name: 'Bulwark',
    radius: 0.029,
    punch: 0.75,
    knockback: 0.65,
    burstResist: 1.2,
    contact: 'absorb',
    chip: 1,
    drain: 0.95,
    weight: 29,
    blades: 8,
    blurb: 'A wide wall of studs: hard to move',
  },
];

export const CORES: Core[] = [
  { id: '3-50', name: 'Stub', height: 0.005, lock: 0.9, punch: 1, teeth: 3, weight: 4, blurb: 'Low: hits under, scrapes slopes' },
  { id: '4-60', name: 'Bolt', height: 0.006, lock: 1, punch: 1, teeth: 4, weight: 5, blurb: 'Standard height and lock' },
  { id: '9-60', name: 'Clamp', height: 0.006, lock: 1.35, punch: 0.93, teeth: 9, weight: 7, blurb: 'Locked tight: hard to shatter' },
  { id: '5-80', name: 'Stilt', height: 0.008, lock: 1, punch: 1, teeth: 5, weight: 6, blurb: 'Tall: rides over low hits' },
  // Drifter's signature.
  { id: '7-70', name: 'Spindle', height: 0.007, lock: 1.15, punch: 0.97, teeth: 7, weight: 6, blurb: 'Mid height, locks well' },
];

export const TIPS: Tip[] = [
  { id: 'flat', name: 'Chisel', spinDrain: 0.0535, roam: 0.6, cruise: 0.66, drive: 3, maxSpeed: 2, seek: 3, center: 0, gear: 1.15, weight: 4, blurb: 'Fast and aggressive, burns spin' },
  { id: 'rush', name: 'Spur', spinDrain: 0.0533, roam: 0.45, cruise: 0.58, drive: 2.6, maxSpeed: 1.9, seek: 4, center: 0, gear: 1.25, weight: 4, blurb: 'Aggressive, steers better' },
  { id: 'taper', name: 'Awl', spinDrain: 0.0523, roam: 0.35, cruise: 0.45, drive: 2, maxSpeed: 1.8, seek: 1.5, center: 1.2, gear: 0.95, weight: 4, blurb: 'Balanced: roams, then settles' },
  { id: 'ball', name: 'Dome', spinDrain: 0.0536, roam: 0.1, cruise: 0.29, drive: 1.5, maxSpeed: 1.6, seek: 0, center: 7.84, gear: 0.85, weight: 5, blurb: 'Holds the middle' },
  { id: 'needle', name: 'Pin', spinDrain: 0.0485, roam: 0.2, cruise: 0.44, drive: 1.5, maxSpeed: 1.8, seek: 0, center: 0, gear: 0.6, weight: 3, blurb: 'Stays still, spins longest' },
  { id: 'orb', name: 'Bead', spinDrain: 0.0525, roam: 0.15, cruise: 0.32, drive: 1.5, maxSpeed: 1.6, seek: 0, center: 2, gear: 0.7, weight: 6, blurb: 'Slow drift, long spin' },
];

/** A build must stay at or under this many grams: heavy rings need light cores and tips. */
export const WEIGHT_LIMIT = 40;

export interface TopBuild {
  ring: string;
  core: string;
  tip: TipShape;
  /** Spin direction: 1 right, -1 left. */
  spin: 1 | -1;
  /** Body color (hex). */
  color: number;
  /** Emblem glow (index into EMBLEM_COLORS); unset is the first. */
  emblem?: number;
  /** The strike engraved on it (docs/DUEL-DESIGN.md); unset is the Anvil Strike. */
  seal?: Seal;
}

/** What each seal's strike is called on the cards. */
export const SEAL_NAMES: Record<Seal, string> = { anvil: 'Anvil Strike', rush: 'Rush', magnet: 'Magnet' };
export const SEAL_BLURBS: Record<Seal, string> = {
  anvil: 'A shockwave from the middle: hot tops near the rim fly',
  rush: 'Your top charges straight at the rival',
  magnet: 'The rival is dragged toward the nearest slag pit',
};

/** Emblem glows: the forge's orange first; the rest are earned (levels 15-19, order stamps). Never cyan, the rival's color. */
export const EMBLEM_COLORS = [0xffb347, 0xf4f1ea, 0xb07cff, 0xffd34a, 0x6fe36f, 0xff5a5a, 0x4a72ff, 0xff8fc8];
export const EMBLEM_NAMES = ['Forge orange', 'White heat', 'Violet', 'Gold', 'Green', 'Red', 'Blue', 'Rose'];

/** The three classic tops as builds; the simulation's ATTACK, DEFENSE and STAMINA are made from these. */
export const PRESETS: { name: string; build: TopBuild }[] = [
  { name: 'Striker', build: { ring: 'striker', core: '4-60', tip: 'flat', spin: 1, color: 0xd6784f } },
  { name: 'Anvil', build: { ring: 'anvil', core: '4-60', tip: 'ball', spin: 1, color: 0xd6784f } },
  { name: 'Halo', build: { ring: 'halo', core: '4-60', tip: 'needle', spin: 1, color: 0xd6784f } },
];

export const ringOf = (b: TopBuild) => RINGS.find((r) => r.id === b.ring) ?? RINGS[0];
export const coreOf = (b: TopBuild) => CORES.find((c) => c.id === b.core) ?? CORES[1];
export const tipOf = (b: TopBuild) => TIPS.find((t) => t.id === b.tip) ?? TIPS[0];

export function weightOf(b: TopBuild): number {
  return ringOf(b).weight + coreOf(b).weight + tipOf(b).weight;
}

/** Short name like "Striker 4-60 Flat". */
export function buildName(b: TopBuild): string {
  return `${ringOf(b).name} ${coreOf(b).name} ${tipOf(b).name}`;
}

/** Fight stats of a build: ring, core and tip rows put together. */
export function specFromBuild(b: TopBuild): TopSpec {
  const ring = ringOf(b);
  const core = coreOf(b);
  const tip = tipOf(b);
  return {
    name: buildName(b),
    radius: ring.radius,
    punch: ring.punch * core.punch,
    knockback: ring.knockback,
    spinDrain: tip.spinDrain * ring.drain,
    roam: tip.roam,
    cruise: tip.cruise,
    drive: tip.drive,
    maxSpeed: tip.maxSpeed,
    seek: tip.seek,
    center: tip.center,
    burstResist: ring.burstResist * core.lock,
    height: core.height,
    contact: ring.contact,
    gear: tip.gear,
    chip: ring.chip,
  };
}

/** Box-style stats, 0..100, for the bars in the forge. */
export interface TopStats {
  attack: number;
  defense: number;
  stamina: number;
  dash: number;
  burst: number;
}

export function statsOf(s: TopSpec): TopStats {
  const pct = (v: number, lo: number, hi: number) => Math.round(Math.max(0, Math.min(1, (v - lo) / (hi - lo))) * 100);
  return {
    attack: pct(s.punch * s.chip * (1 + s.seek / 8) * (s.contact === 'upper' ? 1.15 : 1), 0.6, 1.4),
    defense: pct((1 / s.knockback) * (1 + s.center / 15), 0.9, 2.3),
    stamina: pct(1 / s.spinDrain, 12, 45),
    dash: pct(s.gear, 0.5, 1.3),
    burst: pct(s.burstResist, 0.8, 1.75),
  };
}

/** The role a build leans toward, from its strongest of attack, defense and stamina. */
export function roleOf(s: TopSpec): 'attack' | 'defense' | 'stamina' {
  const st = statsOf(s);
  if (st.attack >= st.defense && st.attack >= st.stamina) return 'attack';
  return st.defense >= st.stamina ? 'defense' : 'stamina';
}

/** Every build under the weight limit. */
export function allBuilds(): TopBuild[] {
  const out: TopBuild[] = [];
  for (const ring of RINGS)
    for (const core of CORES)
      for (const tip of TIPS) {
        const b: TopBuild = { ring: ring.id, core: core.id, tip: tip.id, spin: 1, color: PRESETS[0].build.color };
        if (weightOf(b) <= WEIGHT_LIMIT) out.push(b);
      }
  return out;
}

/**
 * Rivals: build archetypes the player can learn. A rival keeps its build and spin for a whole
 * match; higher Smith levels add archetypes. Difficulty comes from launch quality, not stats.
 */
export interface Rival {
  name: string;
  /** Its one big move, telegraphed a second ahead (docs/DUEL-DESIGN.md). */
  move: RivalMove;
  /** How it plays, in a few words. */
  style: string;
  build: TopBuild;
  /** Smith level from which it can appear. */
  level: number;
}

export const RIVALS: Rival[] = [
  { name: 'Rim Raider', move: 'charge', style: 'aggressive rim attacker', build: { ring: 'striker', core: '4-60', tip: 'flat', spin: -1, color: 0 }, level: 1 },
  { name: 'Iron Keep', move: 'quake', style: 'heavy center holder', build: { ring: 'anvil', core: '4-60', tip: 'ball', spin: -1, color: 0 }, level: 1 },
  { name: 'Drifter', move: 'pull', style: 'stamina drifter', build: { ring: 'halo', core: '4-60', tip: 'needle', spin: -1, color: 0 }, level: 1 },
  { name: 'Leech', move: 'pull', style: 'opposite-spin equalizer', build: { ring: 'cog', core: '9-60', tip: 'taper', spin: -1, color: 0 }, level: 4 },
  { name: 'Hookjaw', move: 'charge', style: 'upper attacker, deadly on low walls', build: { ring: 'hook', core: '3-50', tip: 'rush', spin: -1, color: 0 }, level: 6 },
  { name: 'Sawtooth', move: 'charge', style: 'chips toward a shatter', build: { ring: 'saw', core: '3-50', tip: 'orb', spin: -1, color: 0 }, level: 9 },
  { name: 'Bastion', move: 'quake', style: 'tall, locked and patient', build: { ring: 'anvil', core: '5-80', tip: 'needle', spin: -1, color: 0 }, level: 12 },
];
