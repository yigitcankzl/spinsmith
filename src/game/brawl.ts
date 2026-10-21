/** Crowded-match rules kept independent from rendering so every mode is deterministic and testable. */
export type BrawlMode = 'last' | 'pocket' | 'crucible';

export interface BrawlTopState {
  finish: string | null;
  pocketPoints: number;
}

/** First qualifying pocket plus the most recent top that touched its victim. */
export function targetWinner(mode: BrawlMode, tops: readonly BrawlTopState[], lastHitBy: ArrayLike<number>): { winner: number; victim: number } | null {
  if (mode === 'last') return null;
  for (let victim = 0; victim < tops.length; victim++) {
    const top = tops[victim];
    if (top.finish !== 'pocket' || (mode === 'crucible' && top.pocketPoints < 3)) continue;
    const winner = lastHitBy[victim];
    if (winner >= 0 && winner < tops.length && winner !== victim) return { winner, victim };
  }
  return null;
}

export function brawlModeName(mode: BrawlMode): string {
  return mode === 'pocket' ? 'KING OF THE POCKET' : mode === 'crucible' ? 'CRUCIBLE RACE' : 'LAST SPIN STANDING';
}

/**
 * The match bar's brawl row: `n` equal slots across a plate `width` px wide, inside `margin` on each
 * side with `gap` between them (left edge and width of each, in px).
 */
export function brawlSlots(n: number, width: number, margin: number, gap: number): { x: number; w: number }[] {
  const w = (width - 2 * margin - (n - 1) * gap) / n;
  return Array.from({ length: n }, (_, i) => ({ x: margin + i * (w + gap), w }));
}

/** A brawl top's spin as the match bar's redraw step (twentieths; a stopped top is 0). */
export function spinStep(spin: number): number {
  return Math.round(Math.max(0, Math.min(1, spin)) * 20);
}
