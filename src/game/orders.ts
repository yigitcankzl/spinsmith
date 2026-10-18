/**
 * Smith Orders: one order a day, made from the local date and what the player has unlocked, so it
 * is always playable and the same all day. An order is a rival, an arena and one way of winning,
 * measured from what a round or match already reports. No three.js or DOM here.
 */
import type { ArenaLayout } from './layout.ts';
import type { Role } from './parts.ts';

export type Goal = 'rampKO' | 'deskKO' | 'burst' | 'wellSpin' | 'role' | 'perfect' | 'sweep' | 'ownArena';
/** The kind of top a 'role' order asks for (balance tops exist, but orders still ask for one of the classic three). */
export type { Role } from './parts.ts';

export interface Order {
  /** Local date, YYYY-MM-DD. */
  date: string;
  rival: string;
  arena: string;
  goal: Goal;
  /** For 'role': the kind of top to win with. */
  role?: Role;
  /** A Circuit Map bout whose missing medal this order chases (campaign.ts); playing it counts there too. */
  bout?: string;
  /** What the order says, engraved. */
  text: string;
}

export interface OrderContext {
  /** Rivals the player can meet now. */
  rivals: string[];
  /** Built-in arenas the player has unlocked. */
  arenas: ArenaLayout[];
  /** Arenas the player built and saved. */
  built: ArenaLayout[];
  /** The player has reached the match that teaches cups. */
  cup?: boolean;
  /** A horizontal real-world table plane and boundary are available. */
  table?: boolean;
  /** A won bout with a medal still missing, as an order goal (campaign.ts medalOrder). */
  medal?: { bout: string; rival: string; arena: string; goal: Goal };
}

/** What a finished round or match tells the order. */
export interface OrderEvent {
  rival: string;
  arena: string;
  /** The round was won by the player. */
  wonRound: boolean;
  finish: 'pocket' | 'over' | 'burst' | 'spin' | null;
  /** The player's shape that caused the finish (within the cause window), if any. */
  cause: 'ramp' | 'well' | 'sling' | 'strike' | 'parry' | 'squeeze' | 'stretch' | 'twist' | 'tilt' | null;
  /** A cup actually caught a top during this round (a spin finish comes too late for the cause window). */
  cupCaughtInRound: boolean;
  /** The match ended with this round, won by the player, and the rival scored nothing. */
  matchWon: boolean;
  shutout: boolean;
  /** The player's top this match. */
  role: Role;
  /** A perfect rip happened in this match. */
  perfectInMatch: boolean;
  /** This round crossed the real table edge, not only the virtual rim. */
  deskKo?: boolean;
}

/** The local date of a JS Date as YYYY-MM-DD. */
export function localDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** FNV-1a over the date string: the day's seed. */
function seedOf(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** True when a top can be knocked out here: a pocket, or a wall low enough to go over. */
export function canKnockOut(a: ArenaLayout): boolean {
  return a.pockets.length > 0 || a.wall !== 'high';
}

const ROLE_WORD: Record<Role, string> = { attack: 'an attack', defense: 'a defense', stamina: 'a stamina', balance: 'a balance' };

/** Today's order for this player; deterministic for a date and context. */
export function dailyOrder(date: string, ctx: OrderContext): Order {
  let seed = seedOf(date);
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const pick = <T>(list: T[]): T => list[Math.floor(next() * list.length)];
  // Every other day or so the order chases a medal you left on the map: a reason to go back to that bout.
  if (ctx.medal && next() < 0.5) {
    const m = ctx.medal;
    return { date, rival: m.rival, arena: m.arena, goal: m.goal, text: `${orderText(m.rival)[m.goal]} · ${m.bout} medal`, bout: m.bout };
  }
  const rival = pick(ctx.rivals);
  const goals: Goal[] = ['rampKO', 'burst', 'role', 'perfect', 'sweep'];
  if (ctx.cup) goals.push('wellSpin');
  if (ctx.table) goals.push('deskKO');
  if (ctx.built.length > 0) goals.push('ownArena');
  const goal = pick(goals);
  // The arena: your own for 'ownArena'; one where a knockout is possible for 'rampKO'.
  const pool = goal === 'ownArena' ? ctx.built : goal === 'rampKO' ? ctx.arenas.filter(canKnockOut) : ctx.arenas;
  const arena = pick(pool.length ? pool : ctx.arenas).name;
  const role = goal === 'role' ? pick<Role>(['attack', 'defense', 'stamina']) : undefined;
  const text = orderText(rival, role);
  // No role key unless the goal has one, so a saved order reloads equal.
  return { date, rival, arena, goal, ...(role ? { role } : {}), text: text[goal] };
}

/** What an order says for each goal. */
function orderText(rival: string, role?: Role): Record<Goal, string> {
  return {
    rampKO: `Ramp ${rival} into a pit or over the wall`,
    deskKO: `Knock ${rival} off the real desk edge`,
    burst: `Shatter ${rival}`,
    wellSpin: `Outlast ${rival} from your cup`,
    role: `Beat ${rival} with ${ROLE_WORD[role ?? 'attack']} top`,
    perfect: `Beat ${rival} with a white-hot rip`,
    sweep: `Beat ${rival} without giving up heat`,
    ownArena: `Beat ${rival} on your own arena`,
  };
}

/** True when this round or match fulfils the order. */
export function orderMet(o: Order, e: OrderEvent): boolean {
  if (e.rival !== o.rival || e.arena !== o.arena) return false;
  switch (o.goal) {
    case 'rampKO':
      return e.wonRound && (e.finish === 'pocket' || e.finish === 'over') && e.cause === 'ramp';
    case 'deskKO':
      return e.wonRound && e.deskKo === true;
    case 'burst':
      return e.wonRound && e.finish === 'burst';
    case 'wellSpin':
      return e.wonRound && e.finish === 'spin' && e.cupCaughtInRound;
    case 'role':
      return e.matchWon && e.role === o.role;
    case 'perfect':
      return e.matchWon && e.perfectInMatch;
    case 'sweep':
      return e.matchWon && e.shutout;
    case 'ownArena':
      return e.matchWon;
  }
}
