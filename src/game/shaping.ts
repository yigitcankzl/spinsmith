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

/**
 * The forge bar (docs/DUEL-DESIGN.md): fills from solid clashes and slowly on its own, twice as
 * fast while your top is behind on spin (three times); when full, the Anvil Strike is ready. Separate from the
 * shaping charges, so the strike adds a decision (when) without taking ramps away.
 */
/** A top with less than this share of its rival's spin counts as behind: its bar fills STRIKE_BAR.behind times as fast (the comeback). */
export const BEHIND_SHARE = 0.7;
export const behindOn = (me: { alive: boolean; spin: number }, rival: { alive: boolean; spin: number }) => me.alive && rival.alive && me.spin < BEHIND_SHARE * rival.spin;

export const STRIKE_BAR = {
  /** Seconds to fill on its own. */
  passive: 18,
  /** Filled per solid clash (strength at least SHAPING.clashMin), at most once per clashGap. */
  clash: 0.07,
  /** Behind on spin, the bar fills this many times as fast. */
  behind: 3,
};

export class StrikeBar {
  value = StrikeBar.START;
  private lastClash = -99;

  /** Each round starts with the bar this full, so the strike comes in time to matter. */
  static readonly START = 0.3;

  reset() {
    this.value = StrikeBar.START;
    this.lastClash = -99;
  }

  get full() {
    return this.value >= 1;
  }

  update(dt: number, behind: boolean) {
    this.value = Math.min(1, this.value + (dt / STRIKE_BAR.passive) * (behind ? STRIKE_BAR.behind : 1));
  }

  clash(strength: number, t: number, behind: boolean) {
    if (strength < SHAPING.clashMin || t - this.lastClash < SHAPING.clashGap) return;
    this.lastClash = t;
    this.value = Math.min(1, this.value + STRIKE_BAR.clash * (behind ? STRIKE_BAR.behind : 1));
  }

  /** Spends the full bar at fight time t; false when it is not full or still the opening grace. */
  spend(t: number, grace: number): boolean {
    if (t < grace || !this.full) return false;
    this.value = 0;
    return true;
  }
}
