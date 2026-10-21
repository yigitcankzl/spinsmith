/** Shared duel rules. Keep these pure so the headless simulator and live match agree. */
export const SUDDEN_DEATH_AT = 15;
export const SUDDEN_DEATH_FULL_AT = 19;
export const STRIKE_START = 0.45;
export const PERFECT_INTERRUPT_WINDOW = 0.25;
export const SHAPE_CHARGE_REFILL_SECONDS = 6;
export const MATCH_POINT_TARGET = 4;

/** Narrows launch advantage while preserving a clearly stronger deliberate rip. */
export function launchSpinScale(power: number) {
  const stable = Math.round(Math.max(0, Math.min(1, power)) * 20) / 20;
  return 0.72 + 0.26 * stable;
}

/** Keeps launch speed readable without letting a small pull error decide the whole round. */
export function launchSpeedScale(power: number) {
  const stable = Math.round(Math.max(0, Math.min(1, power)) * 20) / 20;
  return 0.68 + 0.32 * stable;
}

/** 0 before pressure, 1 once the arena has fully opened for a decisive finish. */
export function suddenDeathProgress(elapsed: number) {
  return Math.max(0, Math.min(1, (elapsed - SUDDEN_DEATH_AT) / (SUDDEN_DEATH_FULL_AT - SUDDEN_DEATH_AT)));
}

/** Pocket mouths visibly open during pressure; a full opening is 75% wider. */
export function suddenDeathPocketHalf(half: number, elapsed: number) {
  return half * (1 + suddenDeathProgress(elapsed) * 0.75);
}
