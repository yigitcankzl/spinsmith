import type { OpeningZone } from './progress.ts';

export interface RematchEvidence {
  openingOutcome: string;
  zone: OpeningZone;
  rip: number;
  finish: 'pocket' | 'over' | 'burst' | 'spin' | null;
  ownBackfire: string | null;
  rivalMove: string | null;
  shaped: boolean;
}

/** One evidenced cause and one action; never a generic rival biography tip. */
export function rematchAdvice(e: RematchEvidence): string {
  if (e.openingOutcome.includes('COUNTER-HIT')) return `Your ${e.zone} start was read — change zones`;
  if (e.ownBackfire) return `Your ${e.ownBackfire.toLowerCase()} backfired — aim outside your path`;
  if (e.rivalMove) return `Their ${e.rivalMove.toLowerCase()} decided it — hold your strike`;
  if (e.rip < 0.58) return 'Your launch was soft — pull farther and release moving';
  if (e.finish === 'spin') return 'You ran dry — start center or fit stamina';
  if (!e.shaped) return 'The fight ran itself — shape the arena earlier';
  return 'Follow the cyan line — counter from another zone';
}
