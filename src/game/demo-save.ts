/**
 * Saves for showing the game on a shared headset: a fresh start (the first session again), or a
 * prepared smith at level 8 with order stamps, rival marks and champions, so the reasons to come
 * back are on show in one visit. Built by driving Progress itself, so it stays valid when the
 * save format changes. No three.js or DOM here (storage is passed in).
 */
import { localDate } from './orders.ts';
import { PRESETS } from './parts.ts';
import type { TopBuild } from './parts.ts';
import { MARK, Progress } from './progress.ts';
import type { Storage } from './progress.ts';

/** Every key the game saves under. */
export const SAVE_KEYS = ['spinsmith.progress.v1', 'spinsmith.top.v1', 'spinsmith.arenas.v1', 'spinsmith.echo.v1', 'spinsmith.seats.v1', 'spinsmith.hint.brawl', 'spinsmith.hint.pass', 'spinsmith.resume.v1'];

export interface WritableStorage extends Storage {
  removeItem(key: string): void;
  /** Present on real browser storage: lets a fresh start find keys added after this list. */
  readonly length?: number;
  key?(index: number): string | null;
}

/**
 * Forgets everything: the next start is a new player's first session. On a shared headset that
 * includes the last player's anchored smithy pose, desk scars, hints and comfort choices.
 */
export function freshSave(storage: WritableStorage) {
  const keys = new Set(SAVE_KEYS);
  if (storage.key && storage.length !== undefined) {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k?.startsWith('spinsmith.')) keys.add(k);
    }
  }
  for (const k of keys) storage.removeItem(k);
}

/** A smith at level 8, past the first session, with three stamps, a three-day streak, some marks, the first chapter cleared, the second up to its boss, and two champions. */
export function demoSave(storage: WritableStorage, today = new Date()): Progress {
  freshSave(storage);
  const p = new Progress(storage);
  while (p.level < 8) p.award({ won: true, finish: 'pocket', perfect: false, matchOver: true, matchWon: true });
  p.advance('done');
  for (let d = 3; d >= 1; d--) {
    const day = localDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - d));
    p.completeOrder(day);
    // Played on each of those days too: a three-day streak, alive until today is played.
    p.playedOn(day);
  }
  p.mark('Rim Raider', MARK.beaten | MARK.knockout | MARK.shape);
  p.mark('Iron Keep', MARK.beaten | MARK.knockout);
  p.mark('Drifter', MARK.beaten);
  p.claimSignature('Rim Raider');
  p.claimSignature('Iron Keep');
  // The Cinder Circuit cleared with ten medals: the Circuit Map opens on the Iron Circuit.
  // The first chapter cleared and the second won up to its boss, so the next PLAY is Sawtooth (2-5), whose seal a visitor should meet.
  for (const [id, bits] of [['1-1', 7], ['1-2', 3], ['1-3', 5], ['1-4', 1], ['1-5', 3], ['2-1', 3], ['2-2', 1], ['2-3', 5], ['2-4', 1]] as const) p.recordBout(id, bits, true);
  const halo: TopBuild = { ...PRESETS[2].build };
  const striker: TopBuild = { ...PRESETS[0].build, tip: 'spur' };
  p.recordChampion(halo);
  p.recordChampion(striker);
  p.recordChampion(striker);
  storage.setItem('spinsmith.top.v1', JSON.stringify(striker));
  return p;
}
