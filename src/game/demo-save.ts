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
export const SAVE_KEYS = ['spinsmith.progress.v1', 'spinsmith.top.v1', 'spinsmith.arenas.v1'];

export interface WritableStorage extends Storage {
  removeItem(key: string): void;
}

/** Forgets everything: the next start is a new player's first session. */
export function freshSave(storage: WritableStorage) {
  for (const k of SAVE_KEYS) storage.removeItem(k);
}

/** A smith at level 8, past the first session, with three stamps, some marks and two champions. */
export function demoSave(storage: WritableStorage, today = new Date()): Progress {
  freshSave(storage);
  const p = new Progress(storage);
  while (p.level < 8) p.award({ won: true, finish: 'pocket', perfect: false, matchOver: true, matchWon: true });
  p.advance('done');
  for (let d = 3; d >= 1; d--) p.completeOrder(localDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - d)));
  p.mark('Rim Raider', MARK.beaten | MARK.knockout | MARK.shape);
  p.mark('Iron Keep', MARK.beaten | MARK.knockout);
  p.mark('Drifter', MARK.beaten);
  const halo: TopBuild = { ...PRESETS[2].build };
  const striker: TopBuild = { ...PRESETS[0].build, tip: 'rush' };
  p.recordChampion(halo);
  p.recordChampion(striker);
  p.recordChampion(striker);
  storage.setItem('spinsmith.top.v1', JSON.stringify(striker));
  return p;
}
