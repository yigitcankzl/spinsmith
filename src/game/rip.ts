/**
 * The rip's measurement, pure (shared by the game and scripts/sim-check.ts): the pull's speed over
 * a short window instead of one frame, so hand-tracking jitter and the headset's refresh rate do
 * not decide the power (one-frame speed turned an honest 0.75 m/s rip white hot 20-41% of the time
 * with 4 mm of jitter, depending on 72/90/120 Hz).
 */
export const RIP_WINDOW = 0.04;
/** The peak speed fades with this time constant (s): only a rip still moving at release keeps it. */
export const RIP_DECAY = 0.08;
/** The fingers must stay open this long (s) before the rip lets go: one blurred frame is not a release. */
export const RIP_RELEASE = 0.025;

export class RipMeter {
  peak = 0;
  private t = 0;
  private times: number[] = [];
  private dists: number[] = [];

  reset() {
    this.peak = 0;
    this.t = 0;
    this.times.length = 0;
    this.dists.length = 0;
  }

  /** One tracked, pinching frame `dt` s long with the pull `dist` m from its start; returns the peak speed. */
  push(dt: number, dist: number): number {
    this.t += dt;
    this.times.push(this.t);
    this.dists.push(dist);
    // Keep just enough history for the window (and one sample older than it).
    while (this.times.length > 2 && this.t - this.times[1] >= RIP_WINDOW) {
      this.times.shift();
      this.dists.shift();
    }
    const span = this.t - this.times[0];
    const speed = span > 1e-4 ? (dist - this.dists[0]) / span : 0;
    this.peak = Math.max(this.peak * Math.exp(-dt / RIP_DECAY), speed);
    return this.peak;
  }
}

/** Power 0..1 from the longest pull and the peak speed (the game's TUNE values passed in). */
export function ripPower(maxPull: number, peak: number, minPull: number, fullPull: number, fullSpeed: number): number {
  if (maxPull < minPull) return 0;
  return Math.min(1, 0.4 * Math.min(1, maxPull / fullPull) + 0.6 * Math.min(1, peak / fullSpeed));
}
