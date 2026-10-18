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

export type TipShape = 'chisel' | 'spur' | 'awl' | 'dome' | 'pin' | 'bead';

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
  { id: 'stub', name: 'Stub', height: 0.005, lock: 0.9, punch: 1, teeth: 3, weight: 4, blurb: 'Low: hits under, scrapes slopes' },
  { id: 'bolt', name: 'Bolt', height: 0.006, lock: 1, punch: 1, teeth: 4, weight: 5, blurb: 'Standard height and lock' },
  { id: 'clamp', name: 'Clamp', height: 0.006, lock: 1.35, punch: 0.93, teeth: 9, weight: 7, blurb: 'Locked tight: hard to shatter' },
  { id: 'stilt', name: 'Stilt', height: 0.008, lock: 1, punch: 1, teeth: 5, weight: 6, blurb: 'Tall: rides over low hits' },
  // Drifter's signature.
  { id: 'spindle', name: 'Spindle', height: 0.007, lock: 1.15, punch: 0.97, teeth: 7, weight: 6, blurb: 'Mid height, locks well' },
];

export const TIPS: Tip[] = [
  { id: 'chisel', name: 'Chisel', spinDrain: 0.0535, roam: 0.6, cruise: 0.66, drive: 3, maxSpeed: 2, seek: 3, center: 0, gear: 1.15, weight: 4, blurb: 'Fast and aggressive, burns spin' },
  { id: 'spur', name: 'Spur', spinDrain: 0.0533, roam: 0.45, cruise: 0.58, drive: 2.6, maxSpeed: 1.9, seek: 4, center: 0, gear: 1.25, weight: 4, blurb: 'Turns toward the rival sooner; Chisel runs wide on the rim' },
  { id: 'awl', name: 'Awl', spinDrain: 0.053, roam: 0.35, cruise: 0.45, drive: 2, maxSpeed: 1.8, seek: 1.5, center: 1.2, gear: 0.95, weight: 4, blurb: 'Balanced: roams, then settles' },
  { id: 'dome', name: 'Dome', spinDrain: 0.0536, roam: 0.1, cruise: 0.29, drive: 1.5, maxSpeed: 1.6, seek: 0, center: 7.84, gear: 0.85, weight: 5, blurb: 'Holds the middle' },
  { id: 'pin', name: 'Pin', spinDrain: 0.0485, roam: 0.2, cruise: 0.44, drive: 1.5, maxSpeed: 1.8, seek: 0, center: 0, gear: 0.6, weight: 3, blurb: 'Stays still, spins longest' },
  { id: 'bead', name: 'Bead', spinDrain: 0.0525, roam: 0.15, cruise: 0.32, drive: 1.5, maxSpeed: 1.6, seek: 0, center: 2, gear: 0.7, weight: 6, blurb: 'Slow drift, long spin' },
];

/** Part ids before the Oct 8 rename (saves from then still load): old id to new. */
const OLD_IDS: Record<string, string> = { '3-50': 'stub', '4-60': 'bolt', '9-60': 'clamp', '5-80': 'stilt', '7-70': 'spindle', flat: 'chisel', rush: 'spur', taper: 'awl', ball: 'dome', needle: 'pin', orb: 'bead' };

/** A saved build with today's part ids. */
export function migrateBuild<T extends { core: string; tip: string }>(b: T): T {
  return { ...b, core: OLD_IDS[b.core] ?? b.core, tip: OLD_IDS[b.tip] ?? b.tip };
}

/** An unlock key with today's part ids ('tip:rush' becomes 'tip:spur'). */
export function migrateKey(key: string): string {
  const [kind, id] = key.split(':');
  return (kind === 'core' || kind === 'tip') && OLD_IDS[id] ? `${kind}:${OLD_IDS[id]}` : key;
}

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
export const SEAL_NAMES: Record<Seal, string> = { anvil: 'Anvil Strike', rush: 'Rush', magnet: 'Magnet', tilt: 'Tilt', hammer: 'Hammer', ward: 'Ward' };
export const SEAL_BLURBS: Record<Seal, string> = {
  anvil: 'A shockwave from your palm: exposed tops across the arena fly',
  rush: 'Your palm chooses the charge lane: use rails and boost pads',
  magnet: 'Your palm chooses the slag pit that drags the rival',
  tilt: 'The arena dips toward your palm: the rival slides, your top holds',
  hammer: 'Stamp a forge mark: your next solid hit inside it lands three times as hard',
  ward: 'Guard one rim sector for 4 s: a charge through it rebounds on the charger',
};

/** Emblem glows: the forge's orange first; the rest are earned (levels 15-19, order stamps). Never cyan, the rival's color. */
export const EMBLEM_COLORS = [0xffb347, 0xf4f1ea, 0xb07cff, 0xffd34a, 0x6fe36f, 0xff5a5a, 0x4a72ff, 0xff8fc8];
export const EMBLEM_NAMES = ['Forge orange', 'White heat', 'Violet', 'Gold', 'Green', 'Red', 'Blue', 'Rose'];

/** The three classic tops as builds; the simulation's ATTACK, DEFENSE and STAMINA are made from these. */
export const PRESETS: { name: string; build: TopBuild }[] = [
  { name: 'Striker', build: { ring: 'striker', core: 'bolt', tip: 'chisel', spin: 1, color: 0xe8661c } },
  { name: 'Anvil', build: { ring: 'anvil', core: 'bolt', tip: 'dome', spin: 1, color: 0xe8661c } },
  { name: 'Halo', build: { ring: 'halo', core: 'bolt', tip: 'pin', spin: 1, color: 0xe8661c } },
];

/**
 * Named builds: tops with an identity, made only from existing parts. Kept apart from PRESETS
 * (the three classics the simulation's types and the showcase are built from).
 */
export const NAMED_BUILDS: { name: string; role: Role; blurb: string; build: TopBuild }[] = [
  { name: 'Ember Comet', role: 'attack', blurb: 'A light upper on a low core: streaks in and lifts tops off the rim', build: { ring: 'gale', core: 'stub', tip: 'spur', spin: 1, color: 0xff7a1a } },
  { name: 'Long Ember', role: 'stamina', blurb: 'Rim mass on a locked core and a still tip: the last glow in the forge', build: { ring: 'halo', core: 'spindle', tip: 'pin', spin: 1, color: 0xffb347 } },
  { name: 'Twin Gear', role: 'balance', blurb: 'Left-spin teeth that sit and wait: right spinners grind their spin into it', build: { ring: 'cog', core: 'spindle', tip: 'pin', spin: -1, color: 0xc9a227 } },
  { name: 'Saw Wraith', role: 'attack', blurb: 'Six teeth slung low on a fast tip: every pass chips toward a shatter', build: { ring: 'saw', core: 'stub', tip: 'chisel', spin: 1, color: 0xd94a2b } },
  { name: 'Low Tide', role: 'defense', blurb: 'All weight, slung low on a slow drift: the hits wash over it', build: { ring: 'anvil', core: 'stub', tip: 'bead', spin: 1, color: 0x8a5a3c } },
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

/** What kind of top a build is: one of the three classic types, or a balance top that leans on none. */
export type Role = 'attack' | 'defense' | 'stamina' | 'balance';

/** A build is a balance top when its two strongest of attack, defense and stamina are this close (stat points). */
export const BALANCE_GAP = 10;

/** The role a build leans toward: its strongest of attack, defense and stamina, or 'balance' when the top two are within BALANCE_GAP. */
export function roleOf(s: TopSpec): Role {
  const st = statsOf(s);
  // Stable sort: on a tie, attack before defense before stamina (as before balance existed).
  const ranked = (['attack', 'defense', 'stamina'] as const).map((k) => ({ k, v: st[k] })).sort((p, q) => q.v - p.v);
  return ranked[0].v - ranked[1].v <= BALANCE_GAP ? 'balance' : ranked[0].k;
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
  /** How it plays, in a few plain words. */
  style: string;
  /** Its title, its line as the match starts, and what it says when it wins and when it loses. */
  title: string;
  intro: string;
  win: string;
  lose: string;
  /** What to try against it, shown after you lose to it. */
  tip: string;
  build: TopBuild;
  /** Smith level from which it can appear. */
  level: number;
}

export const RIVALS: Rival[] = [
  { name: 'Rim Raider', move: 'charge', style: 'hits hard from the rim', title: 'the Ember Runner', intro: 'Keep up if you can.', win: 'Too slow, smith.', lose: 'Next time I go faster.', tip: 'Ramp it as it comes round the rim, or forge an Anvil: weight shrugs off its hits', build: { ring: 'striker', core: 'bolt', tip: 'chisel', spin: -1, color: 0 }, level: 1 },
  { name: 'Iron Keep', move: 'quake', style: 'holds the middle, hard to move', title: 'the Cinder Champion', intro: 'Move me. I dare you.', win: 'The middle is mine.', lose: 'You moved the mountain.', tip: 'It shrugs off ramps: Tilt it off the middle or Ward its quake, or forge a Halo or a Pin to outlast it', build: { ring: 'anvil', core: 'bolt', tip: 'dome', spin: -1, color: 0 }, level: 1 },
  { name: 'Drifter', move: 'pull', style: 'spins longest, waits you out', title: 'the Long Spin', intro: 'I can wait all day.', win: 'Still spinning.', lose: 'You outlasted the drift.', tip: 'Knock it out before its spin outlasts yours: a Striker or a Spur hunts it down', build: { ring: 'halo', core: 'bolt', tip: 'pin', spin: -1, color: 0 }, level: 1 },
  { name: 'Leech', move: 'pull', style: 'opposite spin: steals yours', title: 'the Spin Thief', intro: 'Your spin looks tasty.', win: 'Thanks for the spin.', lose: 'Nothing left to steal.', tip: 'It steals spin from opposite spinners: tap the spin token to match its left spin', build: { ring: 'cog', core: 'clamp', tip: 'awl', spin: -1, color: 0 }, level: 4 },
  { name: 'Hookjaw', move: 'charge', style: 'lifts you over low walls', title: 'the Wall Breaker', intro: 'Walls are suggestions.', win: 'Over you go.', lose: 'You kept your feet.', tip: 'Cup your top when it charges, or forge a Stilt: a tall top rides over its lift', build: { ring: 'hook', core: 'stub', tip: 'spur', spin: -1, color: 0 }, level: 6 },
  { name: 'Sawtooth', move: 'charge', style: 'chips you toward a shatter', title: 'the Iron Champion', intro: 'Every hit takes a piece.', win: 'In pieces.', lose: 'Not a scratch? Fine.', tip: 'Every hit chips you: a Clamp core or a Ward keeps you whole', build: { ring: 'saw', core: 'stub', tip: 'bead', spin: -1, color: 0 }, level: 8 },
  { name: 'Bastion', move: 'quake', style: 'tall, locked and patient', title: 'the Crown', intro: 'The crown is earned here.', win: 'Not yet, smith.', lose: 'Wear it well.', tip: "Tall and locked: a Stub's low hits get under it, or tip it with a Tilt", build: { ring: 'anvil', core: 'stilt', tip: 'pin', spin: -1, color: 0 }, level: 10 },
];

/**
 * The circuits: the rivals in the order you climb them, each circuit ending in its champion.
 * The next bout is the first rival you can face and have not beaten yet; once all are beaten,
 * any rival (weighted toward the newer ones).
 */
export const CIRCUITS: { name: string; rivals: string[] }[] = [
  { name: 'Cinder Circuit', rivals: ['Drifter', 'Rim Raider', 'Iron Keep'] },
  { name: 'Iron Circuit', rivals: ['Leech', 'Hookjaw', 'Sawtooth'] },
  { name: 'Crown', rivals: ['Bastion'] },
];

/** The circuit a rival belongs to, its bout number in it, and whether it is the champion. */
export function circuitOf(name: string): { circuit: string; bout: number; of: number; champion: boolean } | null {
  for (const c of CIRCUITS) {
    const i = c.rivals.indexOf(name);
    if (i >= 0) return { circuit: c.name, bout: i + 1, of: c.rivals.length, champion: i === c.rivals.length - 1 };
  }
  return null;
}
