/**
 * The Circuit Map: the campaign. Three chapters of five bouts, each bout a fixed rival in a fixed
 * arena that teaches one thing, twists it, and asks for two medals beyond the win. The fifth bout
 * of a chapter is its boss. Difficulty comes from where you are on the map, not from how long you
 * have played: rival skill climbs through a chapter and dips at the next one's start (a sawtooth),
 * and two losses in a row on a bout quietly ease it. Medals open chapters, so skill stands in for
 * grinding. No three.js or DOM here.
 */
import type { Goal, OrderEvent } from './orders.ts';

/** What a medal asks for (the win is always the first medal and is not listed). */
export type Medal = 'rampKO' | 'forgeKO' | 'strikeKO' | 'burst' | 'perfect' | 'sweep' | 'wellSpin' | 'edgeKO';

export interface Bout {
  /** '1-1' .. '3-5'. */
  id: string;
  chapter: number;
  rival: string;
  arena: string;
  /** The rival's skill (0..1): launch power and aim, as the level-based skill used to be. */
  skill: number;
  /** The rival shapes the floor too (from the second chapter's middle, and every boss). */
  shapes: boolean;
  boss: boolean;
  /** One line each, on the intro card: what this bout is about and what changes. */
  lesson: string;
  twist: string;
  medals: [Medal, Medal];
}

export const CHAPTERS = [
  { name: 'Cinder Circuit', need: 0 },
  { name: 'Iron Circuit', need: 8 },
  { name: 'The Crown', need: 18 },
] as const;

const b = (id: string, rival: string, arena: string, skill: number, lesson: string, twist: string, medals: [Medal, Medal], extra: Partial<Bout> = {}): Bout => {
  const chapter = Number(id[0]);
  const boss = id.endsWith('-5');
  return { id, chapter, rival, arena, skill, shapes: boss || chapter === 3 || id === '2-4', boss, lesson, twist, medals, ...extra };
};

export const BOUTS: Bout[] = [
  b('1-1', 'Drifter', 'Forge Bowl', 0, 'Rip, then pinch the floor for a ramp', 'It waits you out: ramp it out before it outlasts you', ['rampKO', 'perfect']),
  b('1-2', 'Rim Raider', 'Ember Ring', 0.08, 'Grab the rim and forge the arena', 'It charges along the low rim', ['forgeKO', 'sweep']),
  b('1-3', 'Drifter', 'Zero-G Dish', 0.15, 'Slap your palm down: the Anvil Strike', 'No walls to hide behind', ['strikeKO', 'perfect']),
  b('1-4', 'Rim Raider', 'Twin Basins', 0.22, 'Jab the floor for a cup, then sling', 'Two basins split the floor', ['wellSpin', 'sweep']),
  b('1-5', 'Iron Keep', 'Sumo Square', 0.3, 'Everything you learned, against a wall', 'Ramps barely move it: tilt it or strike it', ['burst', 'sweep']),
  b('2-1', 'Leech', 'Crucible Gate', 0.25, 'Match its spin or lose yours', 'One wide mouth: forge it in', ['forgeKO', 'perfect']),
  b('2-2', 'Hookjaw', 'Clockwork Spire', 0.33, 'A tall Stilt core rides over its lift', 'It lifts you over low walls', ['rampKO', 'sweep']),
  b('2-3', 'Leech', 'Frost Oval', 0.42, 'Ice: every ramp throws farther', 'Your top slides too', ['strikeKO', 'burst']),
  b('2-4', 'Hookjaw', 'Neon Speedway', 0.5, 'Rails: geared tips dash', 'It shapes the floor now, as you do', ['forgeKO', 'sweep']),
  b('2-5', 'Sawtooth', 'Meteor Pit', 0.6, 'Keep your top whole', 'Every hit chips you toward a shatter', ['burst', 'perfect']),
  b('3-1', 'Iron Keep', 'Colossus Bowl', 0.55, 'Iron Keep returns, in a bigger bowl', 'More room to drift, farther to the pits', ['forgeKO', 'sweep']),
  b('3-2', 'Comet', 'Titan Crater', 0.65, 'It never stops: catch it on the crater lip', 'The middle drops away under its lift', ['strikeKO', 'perfect']),
  b('3-3', 'Gearwright', 'Sentinel Gates', 0.75, 'Match its spin, then aim between the guards', 'It grinds opposite spin behind the sentinels', ['rampKO', 'burst']),
  b('3-4', 'Bastion', 'Glacier Steps', 0.85, 'Tall and locked, on ice tiers', 'Low hits get under it', ['forgeKO', 'sweep']),
  b('3-5', 'Bastion', 'Grand Anvil', 1, 'Everything you know, one last time', 'Ring it out to end it', ['edgeKO', 'sweep']),
];

/** Medal bits: 1 the win, 2 the first listed medal, 4 the second. */
export const WIN = 1;
export const MEDALS_PER_BOUT = 3;

export const MEDAL_TEXT: Record<Medal, string> = {
  rampKO: 'Ramp it out',
  forgeKO: 'Forge the arena to knock it out',
  strikeKO: 'Knock it out with your strike',
  burst: 'Shatter it',
  perfect: 'Rip white hot',
  sweep: 'Win without giving up heat',
  wellSpin: 'Outlast it from your cup',
  edgeKO: 'Knock it off the edge',
};

/** The same, short enough for the intro card's one medal line. */
export const MEDAL_SHORT: Record<Medal, string> = {
  rampKO: 'ramp KO',
  forgeKO: 'forge KO',
  strikeKO: 'strike KO',
  burst: 'shatter',
  perfect: 'white-hot rip',
  sweep: 'no heat lost',
  wellSpin: 'cup outlast',
  edgeKO: 'edge KO',
};

/** Bout records: medal bits per bout id. */
export type BoutRecord = Record<string, number>;

const bits = (n: number) => (n & 1) + ((n >> 1) & 1) + ((n >> 2) & 1);

export function medalCount(rec: BoutRecord): number {
  return BOUTS.reduce((t, x) => t + bits(rec[x.id] ?? 0), 0);
}

export function chapterOpen(chapter: number, rec: BoutRecord): boolean {
  const c = CHAPTERS[chapter - 1];
  if (!c) return false;
  // A chapter also needs the previous chapter's boss beaten: medals can't skip a boss.
  const boss = BOUTS.find((x) => x.chapter === chapter - 1 && x.boss);
  return medalCount(rec) >= c.need && (!boss || ((rec[boss.id] ?? 0) & WIN) !== 0);
}

/** A bout is open when its chapter is, and the bout before it in the chapter has been won. */
export function boutOpen(bout: Bout, rec: BoutRecord): boolean {
  if (!chapterOpen(bout.chapter, rec)) return false;
  const i = BOUTS.indexOf(bout);
  const prev = BOUTS[i - 1];
  return !prev || prev.chapter !== bout.chapter || ((rec[prev.id] ?? 0) & WIN) !== 0;
}

/** The bout the map offers next: the first open one not won yet, else the first open one missing a medal (when it is a medal turn), else null. */
export function nextBout(rec: BoutRecord, medalTurn = true): Bout | null {
  const open = BOUTS.filter((x) => boutOpen(x, rec));
  // Once every bout is won, medal hunting shares the matches with free play.
  if (!medalTurn && BOUTS.every((x) => (rec[x.id] ?? 0) & WIN)) return null;
  return open.find((x) => !((rec[x.id] ?? 0) & WIN)) ?? open.find((x) => (rec[x.id] ?? 0) !== 7) ?? null;
}

/** What blocks the next chapter, for the map ('8 medals to open the Iron Circuit'), or '' when nothing does. */
export function nextGate(rec: BoutRecord): string {
  for (let c = 2; c <= CHAPTERS.length; c++) {
    if (chapterOpen(c, rec)) continue;
    const short = CHAPTERS[c - 1].need - medalCount(rec);
    const boss = BOUTS.find((x) => x.chapter === c - 1 && x.boss)!;
    if (!((rec[boss.id] ?? 0) & WIN)) return `Beat ${boss.rival} to reach ${chapterName(c)}`;
    return `${short} more medal${short === 1 ? '' : 's'} to open ${chapterName(c)}`;
  }
  return '';
}

/** 'the Iron Circuit', 'The Crown'. */
function chapterName(c: number): string {
  const n: string = CHAPTERS[c - 1].name;
  return n.startsWith('The ') ? n : `the ${n}`;
}

/** The rival's skill this bout, eased after two losses in a row. */
export function boutSkill(bout: Bout, losses: number): number {
  return Math.max(0, bout.skill - (losses >= 2 ? 0.15 : 0));
}

/** Did this round or match earn the medal? `table`: a real table edge exists (else edgeKO is any ring-out). */
export function medalMet(m: Medal, e: OrderEvent, table: boolean): boolean {
  const ko = e.wonRound && (e.finish === 'pocket' || e.finish === 'over');
  switch (m) {
    case 'rampKO':
      return ko && e.cause === 'ramp';
    case 'forgeKO':
      return ko && (e.cause === 'squeeze' || e.cause === 'stretch' || e.cause === 'twist' || e.cause === 'tilt');
    case 'strikeKO':
      return e.wonRound && e.finish !== null && e.finish !== 'spin' && e.cause === 'strike';
    case 'burst':
      return e.wonRound && e.finish === 'burst';
    case 'perfect':
      return e.matchWon && e.perfectInMatch;
    case 'sweep':
      return e.matchWon && e.shutout;
    case 'wellSpin':
      return e.wonRound && e.finish === 'spin' && e.cupCaughtInRound;
    case 'edgeKO':
      return table ? e.wonRound && e.deskKo === true : ko;
  }
}

/** The medal bits a round or match earned in a bout (the win bit only when the match is won). */
export function medalsFrom(bout: Bout, e: OrderEvent, table: boolean): number {
  let out = e.matchWon ? WIN : 0;
  bout.medals.forEach((m, i) => {
    if (medalMet(m, e, table)) out |= 2 << i;
  });
  return out;
}

/** Medals a daily order can ask for, as its goal (forge and strike KOs have no order goal). */
const ORDER_GOAL: Partial<Record<Medal, Goal>> = { rampKO: 'rampKO', burst: 'burst', perfect: 'perfect', sweep: 'sweep', wellSpin: 'wellSpin', edgeKO: 'deskKO' };

/** The first won bout still missing a medal an order can chase, or null (edge medals only with a real table). */
export function medalOrder(rec: BoutRecord, table: boolean): { bout: string; rival: string; arena: string; goal: Goal } | null {
  for (const b of BOUTS) {
    const bits = rec[b.id] ?? 0;
    if (!(bits & WIN)) continue;
    for (let i = 0; i < 2; i++) {
      const goal = ORDER_GOAL[b.medals[i]];
      if (bits & (2 << i) || !goal || (goal === 'deskKO' && !table)) continue;
      return { bout: b.id, rival: b.rival, arena: b.arena, goal };
    }
  }
  return null;
}
