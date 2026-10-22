import { TUNE } from './tuning.js';

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
