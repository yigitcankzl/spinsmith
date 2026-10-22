import { TUNE } from './tuning.js';
import type { ArenaForgeAction } from './arena-forge.js';

/** Constants shared by MatchSystem and the subsystems split out of it. */

/** The arena (and everything on the table) is drawn this much larger than its simulation size. */
export const ARENA_SCALE = TUNE.scale;
/** A hand lost this long (s) cancels what it was doing, instead of acting as a release. */
export const HAND_LOSS_GRACE = 0.28;
/** A rival crossing the detected real table edge adds this much heat after a normal ring-out. */
export const DESK_KO_BONUS = 1;
export const RESULT_TIME = 4;
/** A finish this soon (s) after the player's shape is credited to it. */
export const CAUSE_WINDOW = 1.5;
export const FINISH_WORD: Record<string, string> = { pocket: 'SLAG', over: 'THROWN', burst: 'SHATTER', spin: 'OUTLAST' };
/** Seconds one shaping charge keeps a Spin Rub open, and the pause before rubbing can spend another. */
export const RUB_WINDOW = 1.2;
export const RUB_REOPEN = 0.4;
/** Launch direction is clamped to this many radians off straight-at-center. */
export const MAX_AIM = 0.6;
/** A launch spot is kept this far inside the rim (fraction of the radius) and this far from the rival (arena-local). */
export const LAUNCH_MAX_N = 0.8;
export const LAUNCH_GAP = 0.05;
export const ARENA_FORGE_TITLE: Record<ArenaForgeAction, string> = {
  squeeze: 'SQUEEZE!',
  stretch: 'STRETCH!',
  twist: 'TWIST!',
  tilt: 'TILT!',
};
/** A sling aimed within this of a slag pit's mouth goes straight in (rad). */
export const SLING_SNAP = (20 * Math.PI) / 180;
