/**
 * The frame-rate guard's pure rules (no three.js, checked by scripts/sim-check.ts). The game feeds
 * one-second fps windows in; the guard answers with a quality level. Rendering only: the fixed-step
 * 120 Hz simulation never reads it.
 *
 * Levels, stepped down one at a time: 0 full, 1 lite (no room dimming), 2 lite + full fixed
 * foveation. The eye-buffer scale is not a step: WebXR fixes it when the session starts.
 */
export const QUALITY_LEVELS = ['full', 'lite', 'lite+foveation'] as const;
export const QUALITY_MAX = QUALITY_LEVELS.length - 1;
/** Seconds of slow windows before a step down, and of comfortable windows before a step up. */
export const QUALITY_DOWN_AFTER = 3;
export const QUALITY_UP_AFTER = 10;
/** Without XRSession.frameRate the Quest's default 72 Hz is assumed, and below 66 fps is slow. */
export const QUALITY_DEFAULT_HZ = 72;
export const QUALITY_DEFAULT_SLOW = 66;
/** Slow below this share of the refresh rate when the session reports one; comfortable above the second. */
export const QUALITY_SLOW_SHARE = 0.9;
export const QUALITY_COMFORT_SHARE = 0.97;

export function qualityThresholds(frameRate: number | undefined): { slow: number; comfort: number } {
  if (!frameRate || !Number.isFinite(frameRate) || frameRate <= 0) return { slow: QUALITY_DEFAULT_SLOW, comfort: QUALITY_DEFAULT_HZ * QUALITY_COMFORT_SHARE };
  return { slow: frameRate * QUALITY_SLOW_SHARE, comfort: frameRate * QUALITY_COMFORT_SHARE };
}

export interface QualityStep {
  from: number;
  to: number;
  fps: number;
  reason: 'slow' | 'comfortable';
}

export class QualityGuard {
  level = 0;
  private slowFor = 0;
  private comfortFor = 0;

  /** One fps window of `seconds` length; returns the step taken, if any. */
  sample(fps: number, seconds: number, frameRate?: number): QualityStep | null {
    const { slow, comfort } = qualityThresholds(frameRate);
    this.slowFor = fps < slow ? this.slowFor + seconds : 0;
    this.comfortFor = fps >= comfort ? this.comfortFor + seconds : 0;
    const from = this.level;
    if (this.slowFor >= QUALITY_DOWN_AFTER && this.level < QUALITY_MAX) this.level++;
    else if (this.comfortFor >= QUALITY_UP_AFTER && this.level > 0) this.level--;
    else return null;
    this.slowFor = 0;
    this.comfortFor = 0;
    return { from, to: this.level, fps, reason: this.level > from ? 'slow' : 'comfortable' };
  }
}

/** Per-phase fps windows for the headset test report (count, mean, lowest, the last few). */
export class FpsBook {
  private book = new Map<string, { n: number; sum: number; min: number; last: number[] }>();

  add(phase: string, fps: number) {
    const e = this.book.get(phase) ?? { n: 0, sum: 0, min: Infinity, last: [] };
    e.n++;
    e.sum += fps;
    e.min = Math.min(e.min, fps);
    e.last.push(Math.round(fps));
    if (e.last.length > 20) e.last.shift();
    this.book.set(phase, e);
  }

  /** "n=12 mean 71.4 min 68 last 72,71,…", or "no samples". */
  summary(phase: string): string {
    const e = this.book.get(phase);
    if (!e) return 'no samples';
    return `n=${e.n} mean ${(e.sum / e.n).toFixed(1)} min ${Math.round(e.min)} last ${e.last.join(',')}`;
  }
}

/** The report's phase bucket for a game phase (others are not sampled). */
export function fpsPhase(phase: string): 'hub' | 'fight' | 'forge' | null {
  if (phase === 'hub') return 'hub';
  if (phase === 'fight' || phase === 'pulling' || phase === 'ready' || phase === 'result') return 'fight';
  if (phase === 'forge' || phase === 'build') return 'forge';
  return null;
}
