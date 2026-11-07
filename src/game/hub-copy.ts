/**
 * Home's always-visible words: the station plates (hub.ts), the Smith's board and its Circuit Map
 * side (board.ts). Every label shown at rest stays within HUB_WORDS; the detail (the arena, the
 * full order, the level road, a bout's medals) waits until that thing is pointed at. PLAY is the
 * one call to action. No three.js here: scripts/sim-check.ts enumerates every rival, arena,
 * chapter, rank and goal against HUB_WORDS.
 */
import { wordsIn } from './come-back.ts';
import type { Goal, Role } from './orders.ts';

/** The most words any label at home shows while nothing points at it. */
export const HUB_WORDS = 4;

/** The first candidate that fits HUB_WORDS, or '' (say nothing rather than too much). */
export function fitHub(...lines: string[]): string {
  return lines.find((l) => wordsIn(l) <= HUB_WORDS) ?? '';
}

/** PLAY's second line at rest: the next rival only ('VS RIM RAIDER'); `match` is 'Rim Raider in Ember Ring'. */
export function playSub(match: string): string {
  const rival = match.split(' in ')[0].trim();
  return rival ? fitHub(`VS ${rival}`.toUpperCase()) : '';
}

const GOAL_SHORT: Record<Goal, string> = {
  rampKO: 'RAMP KO',
  deskKO: 'DESK EDGE KO',
  burst: 'SHATTER',
  wellSpin: 'CUP OUTLAST',
  role: 'ROLE WIN',
  perfect: 'WHITE-HOT RIP',
  sweep: 'NO HEAT LOST',
  ownArena: 'OWN ARENA WIN',
};

/** The board's order at rest, as a title and a line under it ('RAMP KO' / 'VS RIM RAIDER · 1-2'). */
export function orderShort(o: { goal: Goal; role?: Role; rival: string; bout?: string }): [string, string] {
  const title = o.goal === 'role' ? fitHub(`${o.role ?? 'attack'} top win`.toUpperCase(), GOAL_SHORT.role) : GOAL_SHORT[o.goal];
  const vs = `VS ${o.rival}`.toUpperCase();
  return [title, o.bout ? fitHub(`${vs} · ${o.bout}`, vs) : fitHub(vs)];
}

/** The board's headline at rest: a streak at risk leads, else the order's state. */
export function boardHead(streakLine: string | null, done: boolean): string {
  return fitHub(streakLine ?? '', done ? 'ORDER DONE' : "TODAY'S ORDER");
}

/** Under a finished order at rest; tomorrow's room decides the new order. */
export const ORDER_DONE_SUB = 'NEW ORDER TOMORROW';

/** The Circuit Map's headline: 'CINDER CIRCUIT · 4/45 MEDALS'. */
export function mapHead(chapter: string, medals: number, of: number): string {
  return fitHub(`${chapter} · ${medals}/${of} medals`.toUpperCase(), `${medals}/${of} MEDALS`);
}

/** The map's one line at rest: what opens the next chapter ('BEAT IRON KEEP', 'IRON CIRCUIT: 3 MEDALS'), or ''. */
export function gateShort(gate: { boss: string } | { chapter: string; short: number } | null): string {
  if (!gate) return '';
  if ('boss' in gate) return fitHub(`BEAT ${gate.boss}`.toUpperCase(), 'BEAT THE BOSS');
  return fitHub(`${gate.chapter}: ${gate.short} medal${gate.short === 1 ? '' : 's'}`.toUpperCase(), `${gate.short} MORE MEDALS`);
}

/** The ledger's line at rest: '7 STAMPS · 3/12 FEATS'. */
export function ledgerLine(stamps: number, feats: number, featsOf: number): string {
  return fitHub(`${stamps} STAMP${stamps === 1 ? '' : 'S'} · ${feats}/${featsOf} FEATS`);
}

/** The level plate at rest: 'LV 7' and the rank. */
export function rankLine(level: number, rank: string): [string, string] {
  const lv = `LV ${level}`;
  return [lv, fitHub(`${lv} ${rank}`) ? rank.toUpperCase() : ''];
}

/** The notes over the far rim at home (match-system.ts guideNote and the pegs' once-only intro): two lines, each within HUB_WORDS. */
export const HUB_NOTE = {
  ramp: 'One lesson left: ramps\nPut your top in',
  forge: 'New part: Spur tip\nPinch the anvil',
  rematch: 'Your top is ready\nPut it in: rematch',
  brawl: 'New: the brass pegs\nPinch: brawl or online',
} as const;
