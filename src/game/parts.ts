/**
 * Top parts: a top is a Ring (contact and mass), a Core (height and burst lock) and a Tip
 * (movement), plus a Crest (color and spin direction). Each part is a row of numbers; the
 * fight stats of a build are put together from its rows, like the stats on a toy's box.
 * No three.js here, so builds can be checked and balanced headlessly.
 */
import type { Contact, TopSpec } from './sim.ts';

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
    punch: 0.874,
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
    punch: 0.79,
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
    knockback: 0.587,
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
    knockback: 1.006,
    burstResist: 0.92,
    contact: 'absorb',
    chip: 1,
    drain: 0.92,
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
    blurb: 'Many small teeth: chips toward a burst',
  },
  {
    id: 'cog',
    name: 'Cog',
    radius: 0.026,
    punch: 0.74,
    knockback: 0.8,
    burstResist: 1.1,
    contact: 'grind',
    chip: 1,
    drain: 0.965,
    weight: 26,
    blades: 12,
    blurb: 'Grind: steals spin from opposite spin',
  },
];

export const CORES: Core[] = [
  { id: '3-50', name: '3-50', height: 0.005, lock: 0.9, punch: 1, teeth: 3, weight: 4, blurb: 'Low: hits under, scrapes slopes' },
  { id: '4-60', name: '4-60', height: 0.006, lock: 1, punch: 1, teeth: 4, weight: 5, blurb: 'Standard height and lock' },
  { id: '9-60', name: '9-60', height: 0.006, lock: 1.35, punch: 0.93, teeth: 9, weight: 7, blurb: 'Tight lock: hard to burst' },
  { id: '5-80', name: '5-80', height: 0.008, lock: 1, punch: 1, teeth: 5, weight: 6, blurb: 'Tall: dodges low hits' },
];

export const TIPS: Tip[] = [
  { id: 'flat', name: 'Flat', spinDrain: 0.0544, roam: 0.6, cruise: 0.66, drive: 3, maxSpeed: 2, seek: 3.19, center: 0, gear: 1.15, weight: 4, blurb: 'Fast and aggressive, burns spin' },
  { id: 'rush', name: 'Rush', spinDrain: 0.0533, roam: 0.45, cruise: 0.58, drive: 2.6, maxSpeed: 1.9, seek: 4, center: 0, gear: 1.25, weight: 4, blurb: 'Aggressive, steers better' },
  { id: 'taper', name: 'Taper', spinDrain: 0.0523, roam: 0.35, cruise: 0.45, drive: 2, maxSpeed: 1.8, seek: 1.5, center: 1.2, gear: 0.95, weight: 4, blurb: 'Balanced: roams, then settles' },
  { id: 'ball', name: 'Ball', spinDrain: 0.0536, roam: 0.1, cruise: 0.29, drive: 1.5, maxSpeed: 1.6, seek: 0, center: 7.86, gear: 0.85, weight: 5, blurb: 'Holds the middle' },
  { id: 'needle', name: 'Needle', spinDrain: 0.042, roam: 0.2, cruise: 0.44, drive: 1.5, maxSpeed: 1.8, seek: 0, center: 0, gear: 0.6, weight: 3, blurb: 'Stays still, spins longest' },
  { id: 'orb', name: 'Orb', spinDrain: 0.048, roam: 0.15, cruise: 0.32, drive: 1.5, maxSpeed: 1.6, seek: 0, center: 2, gear: 0.7, weight: 6, blurb: 'Slow drift, long spin' },
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
}

/** The three classic tops as builds; the simulation's ATTACK, DEFENSE and STAMINA are made from these. */
export const PRESETS: { name: string; build: TopBuild }[] = [
  { name: 'Striker', build: { ring: 'striker', core: '4-60', tip: 'flat', spin: 1, color: 0xd6784f } },
  { name: 'Anvil', build: { ring: 'anvil', core: '4-60', tip: 'ball', spin: 1, color: 0xd6784f } },
  { name: 'Needle', build: { ring: 'halo', core: '4-60', tip: 'needle', spin: 1, color: 0xd6784f } },
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
