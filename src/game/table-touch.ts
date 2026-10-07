/**
 * A palm (or fingertips) pressed onto the real table, from hand tracking alone: the hand's lowest
 * point comes down with some intent, then holds still. A hand resting from the start, a slow
 * drift or a hold in mid-air is not a press. Pure maths, no three.js.
 */

/** Press thresholds (device-tuned through TUNE): came down faster than `down` (m/s) within
 * `window` (s), then held below `still` (m/s) for `hold` (s). */
export const PRESS = { down: 0.15, window: 0.5, still: 0.04, hold: 0.25 };

/** Smoothing of the hand's vertical speed (s): tracking jitter is not motion. */
const SMOOTH = 0.05;

export class TableTouch {
  private y: number | null = null;
  private v = 0;
  private time = 0;
  private downAt = -Infinity;
  private still = 0;

  private readonly k: typeof PRESS;

  constructor(k = PRESS) {
    this.k = k;
  }

  /**
   * Feeds this frame's lowest hand point (world y, null when untracked) and the band the table
   * can be in. Returns the contact height once a press completes, else null.
   */
  update(y: number | null, dt: number, lo: number, hi: number): number | null {
    this.time += dt;
    if (y === null || dt <= 0) {
      this.y = null;
      this.still = 0;
      return null;
    }
    if (this.y === null) {
      this.y = y;
      return null;
    }
    const raw = (this.y - y) / dt;
    this.y = y;
    this.v += (raw - this.v) * (1 - Math.exp(-dt / SMOOTH));
    if (this.v >= this.k.down) this.downAt = this.time;
    const came = this.time - this.downAt <= this.k.window;
    if (Math.abs(this.v) < this.k.still && y >= lo && y <= hi) {
      // The stillness only counts if the hand came down just before it.
      if (this.still > 0 || came) this.still += dt;
    } else this.still = 0;
    if (this.still < this.k.hold) return null;
    this.still = 0;
    this.downAt = -Infinity;
    return y;
  }
}
