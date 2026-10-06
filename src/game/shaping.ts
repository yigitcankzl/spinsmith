/**
 * The arena-shaping economy (docs/ARENA-SHAPING.md, docs/QUESTLESS-PLAN.md): two charges; a solid
 * clash refills one, and a slow passive refill keeps a player from being locked out; no shaping
 * during the opening grace; a second shape within a second comes out weaker (strain) instead of
 * a hard cooldown. Pure, shared by the game and the shaping report.
 */
export const SHAPING = {
  charges: 2,
  /** Seconds for the passive refill of one charge. */
  refill: 6,
  /** A clash at least this strong (0..1) refills a charge, at most once per clashGap seconds. */
  clashMin: 0.45,
  clashGap: 1,
  /** A shape within this many seconds of the last one is made at strainFactor strength. */
  strainWindow: 1,
  strainFactor: 0.5,
};

/**
 * Shape sizes (arena-local m): a ramp's height grows with the lift from min to max (the far
 * version grows while held); a well has one depth. The shaping report uses max and well.
 */
export const SHAPE_SIZE = { rampMin: 0.02, ramp: 0.06, well: 0.02 };

export class ShapingCharges {
  charges = SHAPING.charges;
  private passive = 0;
  private lastClash = -99;
  private lastShape = -99;

  reset() {
    this.charges = SHAPING.charges;
    this.passive = 0;
    this.lastClash = -99;
    this.lastShape = -99;
  }

  /** Progress of the passive refill toward the next charge (0..1). */
  get refilling() {
    return this.charges >= SHAPING.charges ? 0 : this.passive / SHAPING.refill;
  }

  update(dt: number) {
    if (this.charges >= SHAPING.charges) {
      this.passive = 0;
      return;
    }
    this.passive += dt;
    if (this.passive >= SHAPING.refill) {
      this.passive = 0;
      this.charges++;
    }
  }

  /** A clash at fight time t: a solid one refills a charge. */
  clash(strength: number, t: number) {
    if (strength < SHAPING.clashMin || t - this.lastClash < SHAPING.clashGap || this.charges >= SHAPING.charges) return;
    this.lastClash = t;
    this.charges++;
    this.passive = 0;
  }

  /**
   * Spends a charge for a shape at fight time t (after the opening grace). Returns the shape's
   * strength factor (1, or less under strain), or 0 when no shape may be made.
   */
  spend(t: number, grace: number): number {
    if (t < grace || this.charges < 1) return 0;
    this.charges--;
    const factor = t - this.lastShape < SHAPING.strainWindow ? SHAPING.strainFactor : 1;
    this.lastShape = t;
    return factor;
  }
}
