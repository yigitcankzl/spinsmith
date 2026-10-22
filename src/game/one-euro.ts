/**
 * One-Euro filter (Casiez, Roussel, Vogel, CHI 2012) for a 3D point: a low-pass whose cutoff
 * rises with speed, so a still hand stops shaking while a moving one keeps up. Pure (no three.js)
 * so the sim check can drive it. Only position-precision consumers (hover rings, aim, hit tests)
 * read the smoothed point; anything that measures a speed or a swing keeps the raw joints.
 */
export interface Point3 {
  x: number;
  y: number;
  z: number;
}

export interface OneEuroParams {
  /** Cutoff at rest (Hz): lower is steadier and laggier. */
  minCutoff: number;
  /** Cutoff added per m/s of speed: higher keeps fast motion closer. */
  beta: number;
  /** Cutoff of the speed estimate (Hz). */
  dCutoff: number;
}

/**
 * Hand defaults (TUNE.euro* knobs override them in dev). Beta is 10 rather than the paper-ish 8: a
 * first-order filter trails a steady sweep by v / (2 pi (minCutoff + beta v)), and beta 8 leaves a
 * 1.5 m/s sweep 16.6 mm behind; 10 keeps it under 14 mm while a still hand still loses ~2/3 of its jitter.
 */
export const HAND_EURO: OneEuroParams = { minCutoff: 2.5, beta: 10, dCutoff: 2 };

const alpha = (cutoff: number, dt: number) => 1 / (1 + 1 / (2 * Math.PI * cutoff * dt));

export class OneEuro3 {
  readonly value: Point3 = { x: 0, y: 0, z: 0 };
  private raw: Point3 = { x: 0, y: 0, z: 0 };
  private dx = 0;
  private dy = 0;
  private dz = 0;
  private primed = false;
  readonly params: OneEuroParams;

  constructor(params: OneEuroParams) {
    this.params = params;
  }

  /** Forget the history (tracking lost): the next sample passes through unfiltered. */
  reset() {
    this.primed = false;
    this.dx = this.dy = this.dz = 0;
  }

  /** Filters one sample taken dt seconds after the last; returns the smoothed point (this.value). */
  update(x: number, y: number, z: number, dt: number): Point3 {
    const v = this.value;
    if (!this.primed || !(dt > 0)) {
      if (!this.primed) {
        v.x = x;
        v.y = y;
        v.z = z;
        this.primed = true;
      }
      this.raw.x = x;
      this.raw.y = y;
      this.raw.z = z;
      return v;
    }
    const { minCutoff, beta, dCutoff } = this.params;
    const ad = alpha(dCutoff, dt);
    this.dx += ad * ((x - this.raw.x) / dt - this.dx);
    this.dy += ad * ((y - this.raw.y) / dt - this.dy);
    this.dz += ad * ((z - this.raw.z) / dt - this.dz);
    const a = alpha(minCutoff + beta * Math.hypot(this.dx, this.dy, this.dz), dt);
    v.x += a * (x - v.x);
    v.y += a * (y - v.y);
    v.z += a * (z - v.z);
    this.raw.x = x;
    this.raw.y = y;
    this.raw.z = z;
    return v;
  }
}
