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
