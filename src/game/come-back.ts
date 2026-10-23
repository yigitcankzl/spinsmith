/**
 * Tomorrow's pull: the day streak (days in a row with a finished match) and what waits next time
 * (tomorrow's Smith Order, the next Circuit Map bout), worded for the match result card and the
 * Smith's board. Every line stays at six words or fewer. No three.js or DOM here.
 */
import type { Order } from './orders.ts';

/** Most words a come-back line may use (read at a glance, from a result card over the far rim). */
export const COME_BACK_WORDS = 6;

/** Words in a line ('·' and other punctuation are not words). */
export function wordsIn(line: string): number {
  return line.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** A local YYYY-MM-DD date `n` days later (or earlier). */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(y, m - 1, d + n);
  const p = (k: number) => String(k).padStart(2, '0');
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
}

/**
 * Days in a row with a finished match, ending today; or ending yesterday while today is still to
 * play (the streak is alive until the day is over). 0 when the last play was before yesterday.
 */
export function dayStreak(days: Iterable<string>, today: string): number {
  const set = new Set(days);
  let day = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

const fit = (...lines: string[]) => lines.find((l) => wordsIn(l) <= COME_BACK_WORDS) ?? lines[lines.length - 1];

/** The streak as a card headline. */
export function streakTitle(streak: number, playedToday: boolean): string {
  if (streak <= 0) return 'START A STREAK TODAY';
  // Day one has no streak to keep yet: it says what starts one.
  if (playedToday && streak === 1) return 'DAY 1 · COME BACK TOMORROW';
  return playedToday ? `DAY ${streak} STREAK` : `${streak}-DAY STREAK · PLAY TODAY`;
}

/** What tomorrow brings: its Smith Order's rival and arena when known. */
export function tomorrowLine(order: Order | null): string {
  if (!order) return 'Tomorrow: a new Smith Order';
  // "vs" says the name is the rival; the arena follows when it fits.
  return fit(`Tomorrow: vs ${order.rival} in ${order.arena}`, `Tomorrow: vs ${order.rival}`, 'Tomorrow: a new Smith Order');
}

/** The next Circuit Map bout, or '' when every bout is won. */
export function boutLine(bout: { id: string; rival: string } | null): string {
  if (!bout) return '';
  return fit(`Next bout ${bout.id}: ${bout.rival}`, `Next bout: ${bout.id}`);
}

/** The hand move the next match unlocks, as a line. */
export function nextMoveLine(move: string): string {
  return fit(`Next match: new move ${move}`, `Next match: ${move}`);
}

/**
 * The match result's last card: the streak, what the very next match unlocks (a new hand move
 * pulls harder than a bout number), else the next bout, and tomorrow's order.
 */
export function comeBackCard(streak: number, tomorrow: Order | null, bout: { id: string; rival: string } | null, nextMove?: string): string {
  return [streakTitle(streak, true), nextMove ? nextMoveLine(nextMove) : boutLine(bout), tomorrowLine(tomorrow)].filter(Boolean).join('\n');
}
