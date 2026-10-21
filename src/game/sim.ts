/**
 * Pure fight simulation: an arena built from an ArenaLayout, and spinning tops on it.
 * No three.js here so it can be stepped and checked headlessly.
 * All units are meters and seconds; coordinates are arena-local (center at 0,0).
 */
import type { ArenaLayout } from './layout.ts';
import {
  MAX_RADIUS,
  normRadius,
  pocketAt,
  pillarAt,
  railAt,
  rimNormal,
  rimRadius,
} from './layout.ts';
import { ARENAS } from './arenas.ts';
import { PRESETS, specFromBuild } from './parts.ts';
import { SHAPE_SIZE } from './shaping.ts';
import { GROOVE_RADIUS } from './hand-tools.ts';
import { launchSpeedScale, launchSpinScale, MATCH_POINT_TARGET, suddenDeathPocketHalf, suddenDeathProgress } from './gameplay-rules.ts';

/** Floor dips toward a pocket over this outer band of the radius. */
const POCKET_BAND = 0.25;
const POCKET_DEPTH = 0.003;
/** Outward speed (m/s) that carries a top over each kind of wall; high walls are never cleared. */
const WALL_ESCAPE = { low: 0.7, standard: 1.1, high: Infinity, none: 0 };
const WALL_BOUNCE = { low: 0.5, standard: 0.55, high: 0.8, none: 0 };
/** A high wall throws a top that climbed it back toward the middle (m/s). */
const HIGH_WALL_DROP = 0.18;
/** Rail dash: speed and the cooldown before the same top can dash again. */
const DASH_SPEED = 1.1;
const DASH_COOLDOWN = 1.0;
/** Pillars deflect; bumpers kick away at this speed (m/s). */
const PILLAR_BOUNCE = 0.8;
const BUMPER_KICK = 0.3;
/** Boost pads: their reach (fraction of the radius), the speed they bring a top up to along their arrow (m/s) and how soon a top can take one again (s). */
export const PAD_R = 0.09;
const PAD_TOP = 0.55;
const PAD_COOLDOWN = 0.8;
/** Center features cover this fraction of the radius. */
const CENTER_ZONE = 0.32;
/** Turntable grip on a top standing on it (1/s). */
const SPINNER_GRIP = 3;
/** Rocking dish: how hard the tops' weight tips it, and its spring and damping. */
const TILT_WEIGHT = 2.5;
const TILT_SPRING = 18;
const TILT_DAMP = 3;
/** The Tilt strike's spring: critically damped, so the arena settles without swinging past level. */
const SHOVE_SPRING = 40;
const SHOVE_DAMP = 12.6;
/** Shrinking ring: starts after this many seconds and closes to this fraction of the radius. */
const SHRINK_START = 16;
const SHRINK_TIME = 15;
const SHRINK_MIN = 0.45;
/** Spin drained per second while standing in the embers outside the safe zone. */
const EMBER_DRAIN = 0.2;
/** Height of the edge berm on arenas without a wall (m). */
const BERM = 0.02;
/** Ice: the tip barely grips, so the drive and the orbit are weaker. */
const ICE_GRIP = 0.45;

/** The heightmap grid covers the largest arena. */
const GRID = 64;
const EXTENT = MAX_RADIUS + 0.01;
const CELL = (2 * EXTENT) / (GRID - 1);
/** Residual deformation in the sampled floor mesh settles quickly. */
const RELAX_TAU = 1.0;
/** Live player/ultimate shapes relax slowly enough that the round remembers what changed it. */
const SHAPE_RELAX_TAU = 1.5;
/** Player shapes: a ramp's and a well's width (sigma, m), and how hard a fresh well slows a top (1/s). */
/** A ramp's footprint (arena-local): about 13 cm across in the world, wide enough to meet a moving top. */
export const RAMP_SIGMA = 0.052;
/** The smaller ramp of a rival, so it does not end rounds too fast. */
export const RIVAL_RAMP_SIGMA = 0.03;
export const WELL_SIGMA = 0.022;
/**
 * The cup: a shallow, held hollow (about 8 cm across in the world) that catches the first top to
 * roll into it and holds only that one (drag and a pull to its middle), until the hand slings it
 * or lets it go. The other top rolls over it.
 */
export const CUP_SIGMA = 0.035;
export const CUP_DEPTH = 0.006;
const CUP_CATCH = 0.8;
const CUP_DRAG = 5;
const CUP_PULL = 250;
/** How fast a sling throws the caught top (sim m/s). */
export const SLING_SPEED = 0.45;

/**
 * A rip's spin from its power (0..1), one formula for the game and the reports. Narrower than it was
 * (0.55..1.0), so a better pull starts a round ahead instead of deciding it; the strike bar starting
 * emptier keeps rounds long enough (docs: shaping report targets).
 */
export function launchSpin(power: number): number {
  return launchSpinScale(power);
}
/** A cup lets go after this long if nothing rolled in (s). */
export const CUP_HOLD = 2;
const WELL_DRAG = 3;
/** How much less a top in the middle of a fresh well is knocked back (0..1). */
const WELL_BRACE = 0.5;
const GRAVITY = 9.81;
/** Global feel knobs (tuned with scripts/sim-check.ts and on device). */
export const TUNING = {
  /** Bounciness of the bodies (0..1). */
  restitution: 0.77,
  /** Spinning rims kick each other apart on contact (m/s at full spin). */
  recoil: 0.265,
  /** Spin lost per unit of impulse. */
  spinHit: 0.03,
  /** Burst damage per unit of impulse (before the top's burst resistance). */
  burst: 0.24,
  /** How strongly a spinning tip turns radial motion into an orbit around the center (1/s). */
  orbit: 1.44,
  /** Scales every top's spin drain: sets how long rounds last. */
  drain: 0.59,
  /**
   * How much of the difference between tops' drains is kept (1 = all). Long rounds magnify
   * stamina's edge, so it is narrowed around a typical drain.
   */
  drainSpread: 0.565,
  /** Outward speed (m/s) a top needs to drop into a pocket. */
  pocket: 0.27,
  /** Seconds a player's ramp or well stays at full strength before it starts to relax. */
  shapeHold: 2.5,
  /** Seconds after the launch during which pockets and walls hold every top (no instant finishes). */
  grace: 1.8,
  /** Hot metal: the strike throws a top this much further at full burst damage (docs/DUEL-DESIGN.md). Clashes are not
   * scaled: that tipped the type loop toward attack. */
  hot: 0.6,
  /** Anvil Strike: outward speed (m/s) it gives a top at the rim, cold; the player's own top takes `strikeOwn` of it. */
  strike: 1.0,
  strikeOwn: 0.6,
  /** Behind on spin (under 70% of the rival's), your strike lands this much harder: the comeback. */
  strikeBehind: 1.6,
};
/** Height rule: a height gap this large (m) gives the lower top its full lift on the taller one. */
const HEIGHT_GAP = 0.002;
/** Extra knockback and tilt the taller top takes at a full height gap. */
const HEIGHT_LIFT = 0.25;
/** Below this height (m) a top's ring scrapes on slopes steeper than SCRAPE_SLOPE. */
const LOW_HEIGHT = 0.0055;
const SCRAPE_SLOPE = 0.12;
const SCRAPE_DRAIN = 0.25;
/** Upper contact: how long a lifted top flies light, and how much easier walls and pockets get. */
const LIFT_TIME = 0.4;
const LIFT_ESCAPE = 0.7;
/** Opposite spins exchange spin on contact (the faster feeds the slower); grind does it harder. */
const SPIN_SHARE = 0.03;
const GRIND_SHARE = 0.17;
/** Same-direction rims grind against each other: extra recoil and spin lost. */
const SAME_SPIN_RECOIL = 1.25;
const SAME_SPIN_COST = 0.012;
/** A typical top's spin drain (1/s), the middle that drainSpread narrows toward. */
const DRAIN_MID = 0.05;
/** Fixed simulation step. */
export const STEP = 1 / 120;
/** Below this spin a top topples. */
const TOPPLE_SPIN = 0.06;
/** A fight that lasts longer than this is decided on remaining spin. */
export const TIME_LIMIT = 45;
/** Launch speed (m/s) at full power. */
export const LAUNCH_SPEED = 0.5;
/** Launch speed from rip power, shared by the live game and every balance report. */
export function launchSpeed(power: number): number {
  return LAUNCH_SPEED * launchSpeedScale(power);
}
/**
 * Hand tracking jitters by fractions of a degree even when the player is holding a steady line.
 * Quantise only the committed launch heading (about 2.9 degree steps), so that invisible sensor
 * noise cannot pick a different winner while every deliberate aim adjustment still matters.
 */
export const LAUNCH_HEADING_STEP = 0.05;
export function stableHeading(angle: number): number {
  return Math.round(angle / LAUNCH_HEADING_STEP) * LAUNCH_HEADING_STEP;
}
/**
 * Launches leave at this angle (radians) off straight-at-center, in the orbit direction, so tops
 * spiral into the bowl like a real angled launch instead of meeting head-on in the first half second.
 */
export const LAUNCH_TILT = 0.75;

export class Arena {
  layout: ArenaLayout;
  /** Player-made shape layer, added on top of the floor. */
  readonly shape = new Float32Array(GRID * GRID);
  /** Rocking dish: current tilt (radians around the x and z axes) and its rate. */
  tiltX = 0;
  tiltZ = 0;
  /** Seconds the rim holds every top after the launch (TUNING.grace; longer in a first match). */
  grace = TUNING.grace;
  /** A Tilt strike: the direction the arena dips toward (unit, arena-local) and seconds left. */
  shove: { x: number; z: number; t: number } | null = null;
  /** The part of tilt caused only by the player's Tilt seal, separated from the arena's native rock. */
  shoveTiltX = 0;
  shoveTiltZ = 0;
  private tiltVX = 0;
  private tiltVZ = 0;
  private shoveVX = 0;
  private shoveVZ = 0;
  /** Fight clock, for the shrinking ring. */
  elapsed = 0;
  /** The circling pillars' clock (s): runs through rounds, and the view turns it between fights, so they never jump. */
  orbitT = 0;
  /** Fight time of the last Anvil Strike (-99: none this round). */
  lastStrike = -99;
  /** Live player-made shapes (ramps and wells); each fades as it relaxes. */
  shapes: FloorShape[] = [];

  constructor(layout: ArenaLayout = ARENAS[0]) {
    this.layout = layout;
  }

  get radius() {
    return this.layout.radius;
  }

  /** Safe zone radius as a fraction of the rim (1 = whole arena). */
  get safe(): number {
    const start = this.layout.shrinkStart ?? SHRINK_START;
    if (!this.layout.shrink || this.elapsed < start) return 1;
    const k = Math.min(1, (this.elapsed - start) / SHRINK_TIME);
    return 1 - (1 - SHRINK_MIN) * k;
  }

  /** Late-round pressure, 0 before 15 s and 1 once the arena is fully opened. */
  get pressure(): number {
    return suddenDeathProgress(this.elapsed);
  }

  /** True when (x, z) is inside the rim. */
  inside(x: number, z: number) {
    return normRadius(this.layout, x, z) < 1;
  }

  /** Height of the floor at (x, z), before tilt. */
  height(x: number, z: number): number {
    const n = normRadius(this.layout, x, z);
    return this.floorHeight(n) + this.pocketDip(x, z) + this.shapeHeight(x, z) + (this.layout.floor === 'twin' ? this.twinRidge(x, n) : 0);
  }

  /** Twin basins: a ridge along the launch axis splits the bowl into a left and a right basin. */
  private twinRidge(x: number, n: number): number {
    const w = 0.16 * this.layout.radius;
    return this.layout.depth * 0.6 * Math.exp(-((x / w) ** 2)) * (1 - smoothstep(0.75, 0.95, n));
  }

  /** Floor profile by normalized radius. */
  floorHeight(n: number): number {
    // Without a wall, a raised berm at the edge (like a sumo ring's bales) holds tops in unless hit hard.
    const berm = this.layout.wall === 'none' ? BERM * smoothstep(0.8, 1, n) : 0;
    return this.profile(Math.min(n, 1.05)) + berm;
  }

  private profile(r: number): number {
    const L = this.layout;
    switch (L.floor) {
      case 'flat':
        return L.depth * 0.25 * r * r;
      case 'hill':
        // A raised middle that sheds tops toward the rim, inside a shallow bowl.
        return L.depth * 0.4 * r * r + L.depth * Math.max(0, 1 - r / 0.5) ** 2;
      case 'ridge':
        // A bowl with a raised ring to race around without flying out.
        return L.depth * r * r + L.depth * 0.6 * Math.exp(-(((r - 0.68) / 0.09) ** 2));
      case 'tiers':
        // Two levels: a raised outer terrace around a sunken middle, joined by a short step.
        return L.depth * 0.3 * r * r + L.depth * smoothstep(0.45, 0.6, r);
      case 'crater':
        // A deep pit in the middle behind a raised lip: tops that fall in duel at the bottom.
        return L.depth * 0.7 * r * r - L.depth * 0.7 * Math.exp(-((r / 0.28) ** 2)) + L.depth * 0.35 * Math.exp(-(((r - 0.5) / 0.1) ** 2));
      case 'waves':
        // Ripples like a dropped stone: tops hop from ring to ring on their way out.
        return L.depth * 0.8 * r * r + L.depth * 0.14 * (1 - Math.cos(r * Math.PI * 4)) * (1 - r * 0.5);
      default:
        return L.depth * r * r;
    }
  }

  /** The floor slopes down into each pocket near the rim, so a top close to a pocket drifts in. */
  pocketDip(x: number, z: number): number {
    const n = normRadius(this.layout, x, z);
    if (n < 1 - POCKET_BAND) return 0;
    const angle = Math.atan2(z, x);
    let dip = 0;
    for (const p of this.layout.pockets) {
      const half = suddenDeathPocketHalf(p.half, this.elapsed);
      const d = Math.abs(Math.atan2(Math.sin(angle - p.angle), Math.cos(angle - p.angle))) / (half * 1.6);
      if (d < 1) dip = Math.max(dip, (1 - d * d) * ((n - (1 - POCKET_BAND)) / POCKET_BAND));
    }
    return -POCKET_DEPTH * dip;
  }

  /** Surface slope (dh/dx, dh/dz) written into out, including the dish tilt. */
  slope(x: number, z: number, out: { x: number; z: number }) {
    const e = CELL * 0.5;
    out.x = (this.height(x + e, z) - this.height(x - e, z)) / (2 * e) + this.tiltZ;
    out.z = (this.height(x, z + e) - this.height(x, z - e)) / (2 * e) - this.tiltX;
  }

  /**
   * Holds a gaussian bump (amplitude > 0) or dent (< 0) at (x, z) for this frame.
   * Takes the stronger of the existing shape and the stamp, so holding it still keeps it steady.
   */
  stamp(x: number, z: number, amplitude: number, sigma = 0.035) {
    const reach = Math.ceil((sigma * 2.5) / CELL);
    const ci = Math.round((x + EXTENT) / CELL);
    const cj = Math.round((z + EXTENT) / CELL);
    for (let j = Math.max(0, cj - reach); j <= Math.min(GRID - 1, cj + reach); j++) {
      for (let i = Math.max(0, ci - reach); i <= Math.min(GRID - 1, ci + reach); i++) {
        const dx = i * CELL - EXTENT - x;
        const dz = j * CELL - EXTENT - z;
        const v = amplitude * Math.exp(-(dx * dx + dz * dz) / (sigma * sigma));
        const k = j * GRID + i;
        this.shape[k] = amplitude > 0 ? Math.max(this.shape[k], v) : Math.min(this.shape[k], v);
      }
    }
  }

  /**
   * Adds a ramp or well. A hand may leave two ramps in the arena, so the battlefield accumulates
   * a readable history; cups and AI shapes still replace their own previous shape.
   */
  addShape(kind: ShapeKind, x: number, z: number, amp: number, owner: string, dx = 0, dz = 0, sigma?: number): FloorShape {
    // A hand owns 'left' or 'right'; seat-prefixed hands ('p2:left') in a crowded arena count too.
    const hand = owner.slice(owner.lastIndexOf(':') + 1);
    const persistentRamp = kind === 'ramp' && (hand === 'left' || hand === 'right');
    if (persistentRamp) {
      const owned = this.shapes.filter((s) => s.owner === owner && s.kind === 'ramp');
      if (owned.length >= 2) {
        // Array order is creation order even when two ramps are authored in the same frame.
        const oldest = owned[0];
        this.shapes = this.shapes.filter((s) => s !== oldest);
      }
    } else this.shapes = this.shapes.filter((s) => s.owner !== owner);
    const len = Math.hypot(dx, dz);
    const shape: FloorShape = { kind, x, z, dx: len > 1e-6 ? dx / len : 0, dz: len > 1e-6 ? dz / len : 0, amp, age: 0, owner };
    if (sigma !== undefined) shape.sigma = sigma;
    this.shapes.push(shape);
    return shape;
  }

  /** A line scratched by an open fingertip. It guides exactly one crossing top, then relaxes. */
  addGroove(sx: number, sz: number, ex: number, ez: number, owner: string): FloorShape | null {
    const vx = ex - sx;
    const vz = ez - sz;
    const length = Math.hypot(vx, vz);
    if (length < 1e-6) return null;
    // One readable route per hand. Ramps and cups stay: the groove is a separate arena verb.
    this.shapes = this.shapes.filter((s) => s.owner !== `${owner}-groove`);
    const shape: FloorShape = {
      kind: 'groove',
      x: (sx + ex) * 0.5,
      z: (sz + ez) * 0.5,
      dx: vx / length,
      dz: vz / length,
      amp: 0.007,
      age: 0,
      owner: `${owner}-groove`,
      sigma: GROOVE_RADIUS,
      length,
      // Negative means armed indefinitely; zero means the first crossing consumed it.
      boost: -1,
    };
    this.shapes.push(shape);
    return shape;
  }

  /** Turns a live ramp to push another way (the hand still holding it drags its face round). */
  aimShape(shape: FloorShape, dx: number, dz: number) {
    const len = Math.hypot(dx, dz);
    if (len < 1e-6) return;
    shape.dx = dx / len;
    shape.dz = dz / len;
  }

  /** How strong a shape is now: full for a moment after it is made, then fading as it relaxes. */
  static strength(s: FloorShape) {
    if (s.held) return 1;
    return s.age < TUNING.shapeHold ? 1 : Math.exp(-(s.age - TUNING.shapeHold) / SHAPE_RELAX_TAU);
  }

  /** Height of the live shapes at (x, z). */
  shapesHeight(x: number, z: number): number {
    let h = 0;
    for (const s of this.shapes) {
      const k = s.amp * Arena.strength(s);
      const rx = x - s.x;
      const rz = z - s.z;
      if (s.kind === 'groove') {
        const half = (s.length ?? 0) * 0.5;
        const along = Math.max(-half, Math.min(half, rx * s.dx + rz * s.dz));
        const qx = rx - s.dx * along;
        const qz = rz - s.dz * along;
        const gs = s.sigma ?? GROOVE_RADIUS;
        h -= k * Math.exp(-(qx * qx + qz * qz) / (gs * gs));
        continue;
      }
      if (s.kind === 'well') {
        const ws = s.sigma ?? WELL_SIGMA;
        h -= k * Math.exp(-(rx * rx + rz * rz) / (ws * ws));
        continue;
      }
      // A ramp: a mound whose front half (along its push direction) falls away steeply, so a top
      // on it slides off toward the push.
      const sg = s.sigma ?? RAMP_SIGMA;
      const g = Math.exp(-(rx * rx + rz * rz) / (sg * sg));
      const u = rx * s.dx + rz * s.dz;
      h += k * g * 0.5 * (1 - Math.tanh(u / (0.5 * sg)));
    }
    return h;
  }

  /** How deep in a well a point is (0 outside, about 1 at a fresh well's middle). */
  well(x: number, z: number): number {
    let w = 0;
    for (const s of this.shapes) {
      if (s.kind !== 'well') continue;
      const rx = x - s.x;
      const rz = z - s.z;
      w += Arena.strength(s) * Math.exp(-(rx * rx + rz * rz) / (WELL_SIGMA * WELL_SIGMA));
    }
    return Math.min(1, w);
  }

  /** Extra drag (1/s) where wells catch a top; a cup catches the first top in it and holds only that one. */
  drag(t: Top): number {
    let d = 0;
    for (const s of this.shapes) {
      if (s.kind !== 'well') continue;
      const rx = t.x - s.x;
      const rz = t.z - s.z;
      const ws = s.sigma ?? WELL_SIGMA;
      if (s.trap) {
        if (s.caught && s.caught !== t) continue;
        if (!s.caught) {
          if (!t.alive || Math.hypot(rx, rz) > CUP_CATCH * ws) continue;
          s.caught = t;
        }
        d += CUP_DRAG;
        continue;
      }
      d += WELL_DRAG * Arena.strength(s) * Math.exp(-(rx * rx + rz * rz) / (ws * ws));
    }
    return d;
  }

  /** The pull of a cup on the top it caught, toward the cup's middle (applied to velocity). */
  cupPull(t: Top, dt: number) {
    for (const s of this.shapes) {
      if (!s.trap || s.caught !== t) continue;
      const ws = s.sigma ?? WELL_SIGMA;
      const rx = t.x - s.x;
      const rz = t.z - s.z;
      const g = Math.exp(-(rx * rx + rz * rz) / (4 * ws * ws));
      t.vx -= rx * CUP_PULL * g * dt;
      t.vz -= rz * CUP_PULL * g * dt;
    }
  }

  /** Throws a cup's caught top along (dx, dz) and removes the cup. Returns the top thrown, if any. */
  sling(cup: FloorShape, dx: number, dz: number, speed = SLING_SPEED): Top | null {
    const t = cup.caught ?? null;
    this.shapes = this.shapes.filter((s) => s !== cup);
    const len = Math.hypot(dx, dz);
    if (!t || !t.alive || len < 1e-6) return null;
    t.vx = (dx / len) * speed;
    t.vz = (dz / len) * speed;
    t.kick = 0.9;
    // Flung out of a hollow, it flies light for a moment: a sling toward a pit or wall can finish.
    t.lifted = LIFT_TIME;
    return t;
  }

  /** Lets a cup go without a throw: its top rolls on, the hollow relaxes away. */
  free(cup: FloorShape) {
    cup.held = false;
    cup.trap = false;
    cup.caught = null;
    cup.age = Math.max(cup.age, TUNING.shapeHold);
  }

  /** A top crossing a re-pinched ramp catches its authored direction like a temporary dash rail. */
  dashShape(t: Top): boolean {
    if (!t.alive || t.sinceDash < 0.45) return false;
    for (const s of this.shapes) {
      if ((s.kind !== 'ramp' && s.kind !== 'groove') || !s.boost) continue;
      const sigma = s.sigma ?? RAMP_SIGMA;
      const rx = t.x - s.x;
      const rz = t.z - s.z;
      if (s.kind === 'groove') {
        const half = (s.length ?? 0) * 0.5;
        const along = rx * s.dx + rz * s.dz;
        const across = Math.abs(rx * -s.dz + rz * s.dx);
        if (Math.abs(along) > half + sigma * 0.5 || across > sigma) continue;
      } else if (Math.hypot(rx, rz) > sigma * 0.72) continue;
      const along = t.vx * s.dx + t.vz * s.dz;
      const add = Math.max(0.28, 0.82 - along);
      t.vx += s.dx * add;
      t.vz += s.dz * add;
      t.kick = Math.max(t.kick, 0.65);
      t.kickX = s.dx;
      t.kickZ = s.dz;
      t.sinceDash = 0;
      s.boost = 0;
      if (s.kind === 'groove') s.age = Math.max(s.age, TUNING.shapeHold + SHAPE_RELAX_TAU * 0.6);
      return true;
    }
    return false;
  }

  /** Per-step arena update: shapes relax, the dish rocks under the tops' weight (two tops, or a list). */
  update(dt: number, a: Top | readonly Top[], b?: Top) {
    const tops = Array.isArray(a) ? (a as readonly Top[]) : b ? [a as Top, b] : [a as Top];
    this.elapsed += dt;
    this.orbitT += dt;
    const k = Math.exp(-dt / RELAX_TAU);
    for (let i = 0; i < this.shape.length; i++) this.shape[i] *= k;
    if (this.shapes.length) {
      for (const s of this.shapes) {
        s.age += dt;
        if (s.boost && s.boost > 0) s.boost = Math.max(0, s.boost - dt);
      }
      this.shapes = this.shapes.filter((s) => Arena.strength(s) > 0.03);
    }
    if (this.shove && (this.shove.t -= dt) <= 0) this.shove = null;
    if (this.layout.tilt > 0 || this.shove || Math.abs(this.tiltX) + Math.abs(this.tiltZ) > 1e-5) {
      // The dish dips toward where the spinning tops are (rotation about x tips +z down, and so on);
      // a Tilt strike dips it toward the palm.
      // Summed in order from 0, so two tops give exactly the old (a + b) sum.
      let sumX = 0;
      let sumZ = 0;
      for (const t of tops) {
        sumX += t.alive ? t.x : 0;
        sumZ += t.alive ? t.z : 0;
      }
      const wx = sumX / this.radius;
      const wz = sumZ / this.radius;
      const sx = this.shove ? this.shove.z * TILT.shove : 0;
      const sz = this.shove ? -this.shove.x * TILT.shove : 0;
      const targetX = Math.max(-1, Math.min(1, wz * TILT_WEIGHT * 0.5)) * this.layout.tilt + sx;
      const targetZ = Math.max(-1, Math.min(1, -wx * TILT_WEIGHT * 0.5)) * this.layout.tilt + sz;
      // A Tilt strike (and its settling back) rides a stiff, well-damped spring: no swing past level.
      const k = this.shove || this.layout.tilt === 0 ? SHOVE_SPRING : TILT_SPRING;
      const c = this.shove || this.layout.tilt === 0 ? SHOVE_DAMP : TILT_DAMP;
      this.tiltVX += ((targetX - this.tiltX) * k - this.tiltVX * c) * dt;
      this.tiltVZ += ((targetZ - this.tiltZ) * k - this.tiltVZ * c) * dt;
      this.tiltX += this.tiltVX * dt;
      this.tiltZ += this.tiltVZ * dt;
    }
    if (this.shove || Math.abs(this.shoveTiltX) + Math.abs(this.shoveTiltZ) > 1e-5) {
      const targetX = this.shove ? this.shove.z * TILT.shove : 0;
      const targetZ = this.shove ? -this.shove.x * TILT.shove : 0;
      this.shoveVX += ((targetX - this.shoveTiltX) * SHOVE_SPRING - this.shoveVX * SHOVE_DAMP) * dt;
      this.shoveVZ += ((targetZ - this.shoveTiltZ) * SHOVE_SPRING - this.shoveVZ * SHOVE_DAMP) * dt;
      this.shoveTiltX += this.shoveVX * dt;
      this.shoveTiltZ += this.shoveVZ * dt;
    }
  }

  /** Back to a fresh, level arena for a new round (keeps the layout). */
  reset(layout = this.layout) {
    this.layout = layout;
    this.shape.fill(0);
    this.shapes = [];
    this.tiltX = this.tiltZ = this.tiltVX = this.tiltVZ = 0;
    this.shoveTiltX = this.shoveTiltZ = this.shoveVX = this.shoveVZ = 0;
    this.shove = null;
    this.elapsed = 0;
    this.lastStrike = -99;
  }

  clear() {
    this.shape.fill(0);
    this.shapes = [];
  }

  /** Bilinear sample of the player-made shape layer (bump > 0, dent < 0). */
  shapeHeight(x: number, z: number): number {
    const fx = Math.min(GRID - 1.001, Math.max(0, (x + EXTENT) / CELL));
    const fz = Math.min(GRID - 1.001, Math.max(0, (z + EXTENT) / CELL));
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const u = fx - i;
    const v = fz - j;
    const s = this.shape;
    const a = s[j * GRID + i] * (1 - u) + s[j * GRID + i + 1] * u;
    const b = s[(j + 1) * GRID + i] * (1 - u) + s[(j + 1) * GRID + i + 1] * u;
    return a * (1 - v) + b * v + (this.shapes.length ? this.shapesHeight(x, z) : 0);
  }
}

export type ShapeKind = 'ramp' | 'well' | 'groove';

/** A player-made shape on the floor: a ramp pushing toward (dx, dz), or a well. */
export interface FloorShape {
  kind: ShapeKind;
  x: number;
  z: number;
  dx: number;
  dz: number;
  /** Peak height (ramp) or depth (well) when made (m). */
  amp: number;
  age: number;
  owner: string;
  /** Footprint, when not the kind's default. */
  sigma?: number;
  /** A cup: held at full strength while the hand keeps it, catching one top. */
  trap?: boolean;
  held?: boolean;
  caught?: Top | null;
  /** Seconds left as a re-pinched dash rail; consumed by the first top crossing it. */
  boost?: number;
  /** Length of a fingertip-drawn one-use groove, centred at x/z and pointing along dx/dz. */
  length?: number;
}

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** How a top's type and shape translate into behavior. */
export interface TopSpec {
  name: string;
  /** Collision radius (m). */
  radius: number;
  /** How hard it hits. */
  punch: number;
  /** How much a hit moves it. */
  knockback: number;
  /** Defense types' signature: knockback taken while inside the arena's inner half (1: none). */
  centerBrace?: number;
  /** Spin lost per second while just spinning. */
  spinDrain: number;
  /** Sideways curving from the tip. */
  roam: number;
  /** Cruise speed (m/s) at full spin: the tip scrubbing the floor keeps the top travelling. */
  cruise: number;
  /** How quickly the tip drive pulls the speed back toward cruise (1/s). */
  drive: number;
  /** Max sliding speed (m/s). */
  maxSpeed: number;
  /** Attack: steers toward the opponent (1/s). */
  seek: number;
  /** Defense: extra pull toward the center (1/s^2). */
  center: number;
  /** Divides burst damage taken. */
  burstResist: number;
  /** Height of the contact ring above the floor (m): a lower top hits under a taller one. */
  height: number;
  /**
   * Contact style: smash and absorb are carried by punch/knockback; upper lifts the opponent (it
   * clears walls and pockets more easily for a moment); grind steals spin from an opposite spinner.
   */
  contact: Contact;
  /** Rail dash strength from the tip's gear (0 = cannot catch the rail). */
  gear: number;
  /** Multiplies the burst damage this top deals (many small teeth chip away). */
  chip: number;
}

export type Contact = 'smash' | 'upper' | 'absorb' | 'grind';

/**
 * Three types in a rock-paper-scissors loop, after real top battling:
 * attack beats stamina (hunts it down and smashes it out), defense beats attack (holds the
 * middle and lets the attacker burn itself out), stamina beats defense (simply outspins it).
 */
export const ATTACK: TopSpec = { ...specFromBuild(PRESETS[0].build), name: 'Striker' };
export const DEFENSE: TopSpec = { ...specFromBuild(PRESETS[1].build), name: 'Anvil' };
export const STAMINA: TopSpec = { ...specFromBuild(PRESETS[2].build), name: 'Halo' };
export const TYPES = [ATTACK, DEFENSE, STAMINA];

export type Outcome = 'spinning' | 'out' | 'toppled';
/** How a round was lost: into a pocket, over the wall, burst apart by a hit, or out of spin. */
export type Finish = 'pocket' | 'over' | 'burst' | 'spin' | null;

export class Top {
  x = 0;
  z = 0;
  vx = 0;
  vz = 0;
  /** Normalized spin energy, 1 = a perfect launch. */
  spin = 0;
  /** Visual spin angle (radians). */
  angle = 0;
  /** Wobble 0..1, grows as spin drains. */
  wobble = 0;
  /** Recent hit: tilt kick (0..1) and its direction in the floor plane; decays quickly. */
  kick = 0;
  kickX = 0;
  kickZ = 0;
  state: Outcome = 'spinning';
  finish: Finish = null;
  /** Seconds since the last rail dash (large = none recently). */
  sinceDash = 99;
  /** Seconds since the last bumper kick (large = none recently). */
  sinceBump = 99;
  /** Seconds since a hand last touched it (large = none recently). */
  sinceTouch = 99;
  /** Arena time until which the rim holds this top alone and it cannot burst (a lesson's safety for the learner only). */
  shieldUntil = 0;
  /** Seconds since a hard knock on the wall, and how hard it was (outward m/s): for scrape sparks. */
  sinceWall = 99;
  wallHit = 0;
  /** Seconds left of a Rush: the charging top is braced and takes half the knockback. */
  rushing = 0;
  /** Seconds this top counts as a deliberate charge (rail dashes are intentionally excluded). */
  charging = 0;
  /** Arena sector a deliberate charge entered from; crossing the center must not erase it. */
  chargeAngle = 0;
  /** Seconds left of a Hammer (the next solid clash shatters harder) and of a Ward (no knockout). */
  hammer = 0;
  hammerX = 0;
  hammerZ = 0;
  guard = 0;
  /** Arena angle protected by Ward; only this rim sector is safe. */
  guardAngle = 0;
  /** Seconds left of a Tilt's hold on your own top (it does not slide with the arena). */
  anchor = 0;
  /** Seconds left of a telegraphed big move (a rival's tell; 0 = none). An Anvil Strike cuts it short. */
  tell = 0;
  /** Seconds since a boost pad flung it. */
  sincePad = 99;
  /** Accumulated hit damage; at 1 the top bursts apart. */
  damage = 0;
  /** Seconds left of being lifted by an upper hit (walls and pockets take less to clear). */
  lifted = 0;
  /** Points of the pocket it fell into (pockets can be worth 2 or 3). */
  pocketPoints = 2;
  /** Sign of the curving direction (tops spin opposite ways). */
  hand = 1;
  /** Fight time it stopped spinning in a stepN round (-1: still in, or ended outside stepN). Ranks a crowded round. */
  outAt = -1;

  spec: TopSpec;

  constructor(spec: TopSpec) {
    this.spec = spec;
  }

  launch(x: number, z: number, vx: number, vz: number, spin: number, hand: number) {
    Object.assign(this, { x, z, vx, vz, spin, hand, angle: 0, wobble: 0, kick: 0, lifted: 0, sinceDash: 99, sinceBump: 99, sinceTouch: 99, shieldUntil: 0, sinceWall: 99, sincePad: 99, tell: 0, rushing: 0, charging: 0, chargeAngle: 0, hammer: 0, hammerX: 0, hammerZ: 0, guard: 0, guardAngle: 0, anchor: 0, damage: 0, pocketPoints: 2, finish: null, outAt: -1, state: 'spinning' as Outcome });
  }

  get alive() {
    return this.state === 'spinning';
  }
}

export interface Clash {
  x: number;
  z: number;
  /** Impulse strength, 0..~1. */
  strength: number;
  /** A Hammer landed in this clash. */
  hammer?: boolean;
  /** A charge rebounded off a Ward in this clash. */
  parry?: boolean;
  /** Shape whose slope fed this meeting, used to refund only the player who authored it. */
  shapeOwner?: string;
  /** stepN only: the indices of the two tops that met. */
  a?: number;
  b?: number;
}

const slopeTmp = { x: 0, z: 0 };
const normalTmp = { x: 0, z: 0 };

/** Advances one fixed step. Returns a clash event when the two tops collided this step. */
export function step(arena: Arena, a: Top, b: Top, dt = STEP): Clash | null {
  arena.update(dt, a, b);
  advance(arena, a, b, dt);
  advance(arena, b, a, dt);
  return a.alive && b.alive ? collide(a, b, arena) : null;
}

/**
 * Advances a crowded arena (2-4 tops, free-for-all) one fixed step. Each top seeks its nearest live
 * foe at the moment it moves (so two tops move exactly as in step), then every live pair collides
 * once, in index order (0-1, 0-2, ..., 1-2, ...). Returns this step's clashes.
 */
export function stepN(arena: Arena, tops: readonly Top[], dt = STEP): Clash[] {
  arena.update(dt, tops);
  const n = tops.length;
  for (let i = 0; i < n; i++) {
    const t = tops[i];
    if (!t.alive) continue;
    // With no live foe the seek target is a dead one (or the top itself): advance then skips seeking.
    let target: Top = n > 1 ? tops[(i + 1) % n] : t;
    let best = Infinity;
    for (let j = 0; j < n; j++) {
      const o = tops[j];
      if (j === i || !o.alive) continue;
      const d = Math.hypot(o.x - t.x, o.z - t.z);
      if (d < best) {
        best = d;
        target = o;
      }
    }
    advance(arena, t, target, dt);
    if (!t.alive) t.outAt = arena.elapsed;
  }
  const clashes: Clash[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = tops[i];
      const b = tops[j];
      if (!a.alive || !b.alive) continue;
      const clash = collide(a, b, arena);
      if (clash) clashes.push({ ...clash, a: i, b: j });
      if (!a.alive && a.outAt < 0) a.outAt = arena.elapsed;
      if (!b.alive && b.outAt < 0) b.outAt = arena.elapsed;
    }
  }
  return clashes;
}

function advance(arena: Arena, t: Top, other: Top, dt: number) {
  if (!t.alive) return;
  const s = t.spec;
  const L = arena.layout;
  const grip = L.theme === 'ice' ? ICE_GRIP : 1;
  arena.slope(t.x, t.z, slopeTmp);
  // A top anchored by its own Tilt ignores only that seal's added slope; native arena rocking stays.
  if (t.anchor > 0) {
    slopeTmp.x -= arena.shoveTiltZ;
    slopeTmp.z += arena.shoveTiltX;
  }
  // Gravity along the slope.
  t.vx -= GRAVITY * slopeTmp.x * dt;
  t.vz -= GRAVITY * slopeTmp.z * dt;
  let speed = Math.hypot(t.vx, t.vz);
  if (speed < 1e-4) {
    // Standing still: the tip starts it moving around the center, in its spin direction.
    const r = Math.hypot(t.x, t.z) || 1;
    t.vx = (-t.z / r) * t.hand * 1e-3;
    t.vz = (t.x / r) * t.hand * 1e-3;
    speed = 1e-3;
  }
  // Spinning tip curves the path sideways (stronger while spinning fast).
  const curve = (s.roam * t.spin * t.hand * dt * grip) / speed;
  const cvx = t.vx;
  t.vx -= t.vz * curve;
  t.vz += cvx * curve;
  // Spinning tops precess around the stadium: the tip turns radial motion into an orbit
  // in the spin direction, so tops circle instead of swinging through the middle like a pendulum.
  const r = Math.hypot(t.x, t.z);
  const n = normRadius(L, t.x, t.z);
  if (r > 1e-3) {
    const sp = Math.hypot(t.vx, t.vz);
    const tx = (-t.z / r) * t.hand * sp;
    const tz = (t.x / r) * t.hand * sp;
    // Right after a hit the top flies free; the orbit only takes over again as the kick fades.
    const k = Math.min(1, TUNING.orbit * grip * Math.max(0, t.spin) * (1 - t.kick) * dt);
    t.vx += (tx - t.vx) * k;
    t.vz += (tz - t.vz) * k;
    if (n < CENTER_ZONE) {
      // Vortex: a swirl in the middle that whips tops around faster.
      if (L.vortex > 0) {
        t.vx += (-t.z / r) * t.hand * L.vortex * dt;
        t.vz += (t.x / r) * t.hand * L.vortex * dt;
      }
      // Turntable: the floor itself turns and drags the top with it.
      if (L.spinner > 0) {
        const fx = -t.z * L.spinner;
        const fz = t.x * L.spinner;
        const g = Math.min(1, SPINNER_GRIP * dt);
        t.vx += (fx - t.vx) * g;
        t.vz += (fz - t.vz) * g;
      }
    }
    // Pressure physically flattens the outside of the bowl and opens the exits. A mild radial
    // drift becomes decisive over the final six seconds, converting passive spin-outs into aimed
    // pocket/ring finishes without teleporting either top.
    const pressure = arena.pressure;
    if (pressure > 0) {
      const outward = pressure * pressure * 1.6 * dt;
      t.vx += (t.x / r) * outward;
      t.vz += (t.z / r) * outward;
    }
  }
  // Attack types hunt the opponent: their heading turns toward it.
  if (s.seek > 0 && other !== t && other.alive) {
    const dx = other.x - t.x;
    const dz = other.z - t.z;
    const d = Math.hypot(dx, dz) || 1;
    const sp = Math.hypot(t.vx, t.vz);
    const k = Math.min(1, s.seek * grip * Math.max(0, t.spin) * (1 - t.kick) * dt);
    t.vx += ((dx / d) * sp - t.vx) * k;
    t.vz += ((dz / d) * sp - t.vz) * k;
  }
  // Defense types hold the middle.
  if (s.center > 0) {
    t.vx -= t.x * s.center * dt;
    t.vz -= t.z * s.center * dt;
  }
  // Tip drive: speed eases toward the cruise speed for the current spin (weak on ice).
  speed = Math.hypot(t.vx, t.vz) || 1e-3;
  const target = s.cruise * Math.max(0, t.spin);
  const k = 1 + ((target - speed) / speed) * Math.min(1, s.drive * grip * dt);
  t.vx *= k;
  t.vz *= k;
  const v = Math.hypot(t.vx, t.vz);
  if (v > s.maxSpeed) {
    t.vx *= s.maxSpeed / v;
    t.vz *= s.maxSpeed / v;
  }
  t.x += t.vx * dt;
  t.z += t.vz * dt;
  // Spin drains on its own, faster while scraping across the floor, much faster in the embers.
  t.spin -= (DRAIN_MID + (s.spinDrain - DRAIN_MID) * TUNING.drainSpread + v * 0.02) * TUNING.drain * dt;
  // A well catches the top: it slows down inside it.
  if (arena.shapes.length) {
    const drag = arena.drag(t);
    if (drag > 0) {
      const f = Math.exp(-drag * dt);
      t.vx *= f;
      t.vz *= f;
    }
    arena.cupPull(t, dt);
  }
  // A low ring scrapes the floor on steep slopes (the bumps the player raises, steep bowls).
  if (s.height < LOW_HEIGHT) {
    const steep = Math.hypot(slopeTmp.x, slopeTmp.z) - SCRAPE_SLOPE;
    if (steep > 0) t.spin -= steep * SCRAPE_DRAIN * dt;
  }
  t.lifted = Math.max(0, t.lifted - dt);
  if (n > arena.safe) t.spin -= EMBER_DRAIN * dt;
  // Visual spin, capped so the body stripes never alias into spinning backwards on screen.
  t.angle += (6 + 22 * Math.max(0, t.spin)) * dt * t.hand;
  t.kick *= Math.exp(-6 * dt);
  t.wobble = Math.min(1, Math.max(0, (0.35 - t.spin) / (0.35 - TOPPLE_SPIN)));
  t.sinceDash += dt;
  t.sinceBump += dt;
  t.sinceTouch += dt;
  t.sinceWall += dt;
  t.sincePad += dt;
  t.rushing = Math.max(0, t.rushing - dt);
  t.charging = Math.max(0, t.charging - dt);
  t.hammer = Math.max(0, t.hammer - dt);
  t.guard = Math.max(0, t.guard - dt);
  t.anchor = Math.max(0, t.anchor - dt);
  arena.dashShape(t);
  pillars(arena, t);
  pads(arena, t);
  wall(arena, t);
  if (t.alive && t.spin <= TOPPLE_SPIN) {
    t.spin = 0;
    t.state = 'toppled';
    t.finish = 'spin';
  }
}

const pillarTmp = { x: 0, z: 0 };

/** Boost pads fling a top crossing them the way they point. */
function pads(arena: Arena, t: Top) {
  const L = arena.layout;
  if (!L.pads || t.sincePad < PAD_COOLDOWN) return;
  for (const p of L.pads) {
    if (Math.hypot(t.x - p.x * L.radius, t.z - p.z * L.radius) > PAD_R * L.radius) continue;
    // Topped up to the pad's speed, never stacked past it.
    const c = Math.cos(p.angle);
    const s = Math.sin(p.angle);
    const add = Math.max(0, PAD_TOP - (t.vx * c + t.vz * s));
    if (add <= 0) continue;
    t.vx += c * add;
    t.vz += s * add;
    t.kick = Math.min(1, t.kick + 0.5);
    t.kickX = Math.cos(p.angle);
    t.kickZ = Math.sin(p.angle);
    t.sincePad = 0;
    return;
  }
}

/**
 * The Anvil Strike (docs/DUEL-DESIGN.md): the player's palm on the table beside the arena sends a
 * shockwave through the floor from the rim point at (ox, oz). Every top is thrown outward, harder near the rim and the hotter it is, and
 * lifted for a moment (walls and pits take less to clear); the player's own top, braced, takes only
 * TUNING.strikeOwn of it. A caught top is let go first.
 */
export function strike(arena: Arena, mine: Top, rival: Top, ox = 0, oz = 0) {
  for (const s of arena.shapes) if (s.caught) arena.free(s);
  for (const t of [mine, rival]) {
    if (!t.alive) continue;
    // Away from where the palm struck (the rim beside it): a top near your hand is thrown toward
    // the middle, one across the arena out over the far rim. (0, 0): from the middle.
    const dx = t.x - ox;
    const dz = t.z - oz;
    const r = Math.hypot(dx, dz);
    const n = Math.min(1, normRadius(arena.layout, t.x, t.z));
    // A top right at the origin goes the way it was already moving.
    const ux = r > 1e-4 ? dx / r : t.vx / (Math.hypot(t.vx, t.vz) || 1);
    const uz = r > 1e-4 ? dz / r : t.vz / (Math.hypot(t.vx, t.vz) || 1);
    // Felt mostly out near the rim: a top in the middle barely moves, so when you strike matters.
    const rage = mine.spin < 0.7 * rival.spin ? TUNING.strikeBehind : 1;
    const k = TUNING.strike * rage * n * n * (1 + TUNING.hot * t.damage) * (t === mine ? TUNING.strikeOwn : 1) * (wardCovers(t, Math.atan2(oz, ox)) ? 0.5 : 1);
    t.vx += ux * k;
    t.vz += uz * k;
    t.kick = 1;
    t.kickX = ux;
    t.kickZ = uz;
    t.lifted = LIFT_TIME;
  }
  arena.lastStrike = arena.elapsed;
  // The strike cuts a rival's telegraphed move short.
  rival.tell = 0;
}

/**
 * The player's strike, chosen in the forge (the seal engraved on the top): Anvil, the shockwave;
 * Rush, your top charges the rival; Magnet, the rival is dragged toward a pit. Every one cuts a
 * rival's tell short. (A spin refill was tried: even a small one decided spin finishes.)
 */
export type Seal = 'anvil' | 'rush' | 'magnet' | 'tilt' | 'hammer' | 'ward';
export const SEALS: Seal[] = ['anvil', 'rush', 'magnet', 'tilt', 'hammer', 'ward'];
/** Tilt: the arena dips toward the palm by this slope for TILT_TIME s (tops slide that way). */
export const TILT = { shove: 0.16, time: 3 };
/** Hammer: for HAMMER_TIME s, your next solid clash deals HAMMER times the burst damage. */
export const HAMMER = 3;
export const HAMMER_TIME = 5;
/** Hammer only lands when the clash occurs inside the palm-authored forge mark. */
export const HAMMER_ZONE = 0.045;
/** Ward: for WARD_TIME s one palm-authored rim sector prevents ring-outs and braces impacts. */
export const WARD_TIME = 4;
export const WARD_HALF = Math.PI / 4;
/** A top that dashed or charged within PARRY_WINDOW s and hits a Ward takes WARD_PARRY times the knockback. */
const WARD_PARRY = 4;
const PARRY_WINDOW = 0.8;
/** A clash at least this strong (0..1, as Clash.strength) is solid enough for the Hammer. */
const HAMMER_MIN = 0.3;
const HAMMER_FLOOR = 0.22;
/** A wall knock at least this fast outward (m/s) scrapes sparks off the wall. */
const WALL_SCRAPE = 0.25;
/** Your Magnet pulls a little softer than a rival's pull: it lands more often. */
const MAGNET_SPEED = 0.45;
/** Your Rush hits harder than a rival's charge: it is your one strike. */
const RUSH_SPEED = 1.15;

function angleGap(a: number, b: number) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function wardCovers(t: Top, angle: number) {
  return t.guard > 0 && angleGap(angle, t.guardAngle) <= WARD_HALF;
}

/**
 * An open palm held at the rim becomes a temporary wall. This is intentionally a generous sector,
 * not a fingertip collider: the player chooses the rebound angle while the simulation keeps the
 * fast-moving top readable and deterministic.
 */
export function palmBrace(arena: Arena, top: Top, angle: number, half = 0.42) {
  if (!top.alive || top.sinceWall < 0.14) return false;
  const n = normRadius(arena.layout, top.x, top.z);
  if (n < 0.72 || n > 1.12) return false;
  const topAngle = Math.atan2(top.z, top.x);
  if (angleGap(topAngle, angle) > half) return false;
  const nx = Math.cos(topAngle);
  const nz = Math.sin(topAngle);
  const outward = top.vx * nx + top.vz * nz;
  if (outward < 0.035) return false;
  top.vx -= nx * outward * 1.85;
  top.vz -= nz * outward * 1.85;
  top.kick = Math.min(1, top.kick + outward * 1.5);
  top.kickX = -nx;
  top.kickZ = -nz;
  top.wallHit = outward;
  top.sinceWall = 0;
  top.charging = 0;
  return true;
}

/** True when a live top is actually crossing the finite rail between two open palms. */
export function crossguardCrosses(top: Top, ax: number, az: number, bx: number, bz: number) {
  if (!top.alive || top.sinceWall < 0.14) return false;
  const dx = bx - ax;
  const dz = bz - az;
  const length2 = dx * dx + dz * dz;
  if (length2 < 0.0064) return false;
  const along = ((top.x - ax) * dx + (top.z - az) * dz) / length2;
  if (along < 0.04 || along > 0.96) return false;
  const qx = ax + along * dx;
  const qz = az + along * dz;
  const length = Math.sqrt(length2);
  const nx = -dz / length;
  const nz = dx / length;
  const distance = (top.x - qx) * nx + (top.z - qz) * nz;
  const crossing = top.vx * nx + top.vz * nz;
  return Math.abs(distance) <= 0.016 && Math.abs(crossing) >= 0.045;
}

/** A two-palm Crossguard is a one-hit rail: it reflects the first top that crosses its chord. */
export function crossguard(top: Top, ax: number, az: number, bx: number, bz: number, strength = 1) {
  if (!crossguardCrosses(top, ax, az, bx, bz)) return false;
  const dx = bx - ax;
  const dz = bz - az;
  const length = Math.hypot(dx, dz);
  const nx = -dz / length;
  const nz = dx / length;
  const crossing = top.vx * nx + top.vz * nz;
  const rebound = crossing * (1.78 + 0.18 * Math.min(1, strength));
  top.vx -= nx * rebound;
  top.vz -= nz * rebound;
  top.kick = Math.min(1, top.kick + Math.abs(crossing) * 1.5);
  top.kickX = crossing > 0 ? -nx : nx;
  top.kickZ = crossing > 0 ? -nz : nz;
  top.wallHit = Math.abs(crossing);
  top.sinceWall = 0;
  top.charging = 0;
  return true;
}

/** One-use player-forged bumper: a compact physical reflection, not an arena-wide spell. */
export function emberBumper(top: Top, x: number, z: number, radius = 0.014) {
  if (!top.alive || top.sinceBump < 0.2) return false;
  const dx = top.x - x;
  const dz = top.z - z;
  const d = Math.hypot(dx, dz) || 1;
  if (d > top.spec.radius + radius) return false;
  const nx = dx / d;
  const nz = dz / d;
  const inward = top.vx * nx + top.vz * nz;
  if (inward >= 0) return false;
  top.vx -= nx * inward * 1.8;
  top.vz -= nz * inward * 1.8;
  top.vx += nx * 0.22;
  top.vz += nz * 0.22;
  top.kick = Math.max(top.kick, 0.6);
  top.kickX = nx;
  top.kickZ = nz;
  top.sinceBump = 0;
  return true;
}

/** Fingertip collider radius (arena-local m). */
export const FINGER_RADIUS = 0.009;
/** Approach speed (arena m/s) at which a touch becomes a paid, decisive flick. */
export const FLICK_HARD = 0.32;
/** Most speed one flick can hand a top (arena m/s): enough to pocket a tired top; walls need a ramp or a clash too. */
export const FLICK_MAX = 0.7;
/** Approach-to-speed gain of a paid flick. */
export const FLICK_GAIN = 1.6;
/** Share of a flick a top at full spin still takes (gyroscopic stiffness). */
export const FLICK_STIFF_MIN = 0.35;

/** True when a fingertip at (x, z) moving at (vx, vz) is pressing into this live top. */
export function fingerTouches(top: Top, x: number, z: number, vx: number, vz: number, radius = FINGER_RADIUS) {
  if (!top.alive || top.sinceTouch < 0.12) return 0;
  const dx = top.x - x;
  const dz = top.z - z;
  const reach = top.spec.radius + radius;
  const d2 = dx * dx + dz * dz;
  if (d2 > reach * reach) return 0;
  const d = Math.sqrt(d2);
  if (d < 1e-6) return 0;
  const approach = ((vx - top.vx) * dx + (vz - top.vz) * dz) / d;
  return approach > 0 ? approach : 0;
}

/**
 * The hand is a body in the fight. A fingertip pressing into a top pushes it out of the finger.
 * `power` 0 is a soft touch: the top rebounds off the finger but never takes the hand's speed.
 * `power` > 0 is a paid flick: the top takes the finger's approach speed, so the swing decides.
 */
export function fingerContact(top: Top, x: number, z: number, vx: number, vz: number, power: number, radius = FINGER_RADIUS) {
  const approach = fingerTouches(top, x, z, vx, vz, radius);
  if (!approach) return 0;
  const dx = top.x - x;
  const dz = top.z - z;
  const d = Math.hypot(dx, dz);
  const nx = dx / d;
  const nz = dz / d;
  const reach = top.spec.radius + radius;
  top.x = x + nx * reach;
  top.z = z + nz * reach;
  // A fast-spinning top is gyroscopically stiff and shrugs a flick off; a tired, wobbling one is
  // thrown. When to flick matters as much as where.
  const stiff = FLICK_STIFF_MIN + (1 - FLICK_STIFF_MIN) * (1 - Math.max(0, Math.min(1, top.spin)));
  const gain = power > 0
    ? Math.min(FLICK_MAX, approach * FLICK_GAIN) * Math.min(1, power) * Math.max(0.6, top.spec.knockback) * stiff
    : approach * 0.6;
  top.vx += nx * gain;
  top.vz += nz * gain;
  top.kick = Math.min(1, top.kick + gain * 1.4);
  top.kickX = nx;
  top.kickZ = nz;
  if (power > 0) top.damage = Math.min(0.95, top.damage + 0.02 * power);
  top.charging = 0;
  top.sinceTouch = 0;
  return gain;
}

/** A rub only counts within this much of the rim's touching distance (arena m), so a finger tracing the rim stays on it. */
export const RUB_SLACK = 0.004;
/** Fingertip speed along the rim (arena m/s) a rub needs before it does anything. */
export const RUB_MIN = 0.04;
/** Fingertip speed along the rim (arena m/s) that reaches the full rub rate. */
export const RUB_FULL = 0.22;
/** Most spin a rub adds per second (spin is 0..1). */
export const RUB_RATE = 0.3;
/** Most spin one rub call adds, whatever the frame time. */
export const RUB_STEP_MAX = 0.012;
/** Most spin one paid rub window can add (also the cap on a remote rub). */
export const RUB_WINDOW_MAX = 0.28;
/** Share of the rub rate a wrong-way rub brakes by. */
export const RUB_BRAKE = 0.4;

/**
 * Rubbing a fingertip along a spinning top's rim the way it turns puts spin back into it; rubbing
 * against the spin brakes it a little. Returns the spin change (negative when braking). Only the
 * tangential part of the finger's motion (perpendicular to centre -> tip) counts, and only when it
 * dominates the radial part. The top is only eased out of the finger, never kicked: no velocity
 * change. Spin never rises above 1.
 */
export function spinRub(top: Top, x: number, z: number, vx: number, vz: number, power: number, dt = STEP) {
  if (!top.alive || power <= 0 || dt <= 0) return 0;
  const rx = x - top.x;
  const rz = z - top.z;
  const d = Math.hypot(rx, rz);
  const reach = top.spec.radius + FINGER_RADIUS;
  if (d < 1e-6 || d > reach + RUB_SLACK) return 0;
  const ux = rx / d;
  const uz = rz / d;
  // The rim surface moves along (uz, -ux) * hand: the angle advances by hand (three.js rotation.y).
  const rvx = vx - top.vx;
  const rvz = vz - top.vz;
  const tan = (rvx * uz - rvz * ux) * top.hand;
  const rad = rvx * ux + rvz * uz;
  if (Math.abs(tan) <= Math.abs(rad) || Math.abs(tan) < RUB_MIN) return 0;
  const k = Math.min(1, (Math.abs(tan) - RUB_MIN) / (RUB_FULL - RUB_MIN));
  let gain = Math.min(RUB_STEP_MAX, k * RUB_RATE * dt) * Math.min(1, power);
  if (tan > 0) gain = Math.min(gain, Math.max(0, 1 - top.spin));
  else gain = -Math.min(gain * RUB_BRAKE, Math.max(0, top.spin));
  top.spin += gain;
  // A finger inside the rim eases the top off it by at most a millimetre a call.
  if (d < reach) {
    const push = Math.min(0.001, reach - d);
    top.x -= ux * push;
    top.z -= uz * push;
  }
  return gain;
}

/** Seconds a rim spring holds the wall shut behind your own top. */
export const SPRING_SHIELD = 1;
/** A rival caught in the sector is slung this many times harder than your own top is pulled in. */
export const SPRING_SLING = 2;

/**
 * Pulling a rim spring acts only through the selected sector (within 0.6 rad, outer half of the
 * bowl). Your own top is pulled inward and the rim holds behind it for SPRING_SHIELD seconds; a
 * rival there is slung along the wall toward its nearest pocket (outward when there are none).
 */
export function springRim(arena: Arena, mine: Top, others: readonly Top[], sx: number, sz: number, x: number, z: number, strength = 1) {
  const r = Math.hypot(sx, sz) || 1;
  const ix = -sx / r;
  const iz = -sz / r;
  const pull = (x - sx) * ix + (z - sz) * iz;
  let hits = 0;
  for (const top of [mine, ...others]) {
    const tr = Math.hypot(top.x, top.z);
    if (!top.alive || tr < arena.radius * 0.5) continue;
    const sameSector = (top.x * sx + top.z * sz) / Math.max(1e-5, tr * r);
    if (sameSector < Math.cos(0.6)) continue;
    let impulse = (0.13 + Math.min(0.07, pull * 2)) * strength;
    let dx = ix;
    let dz = iz;
    if (top === mine) {
      top.shieldUntil = Math.max(top.shieldUntil, arena.elapsed + SPRING_SHIELD);
    } else {
      const a0 = Math.atan2(top.z, top.x);
      let best = a0;
      let gap = Infinity;
      for (const p of arena.layout.pockets) {
        const d = Math.abs(Math.atan2(Math.sin(p.angle - a0), Math.cos(p.angle - a0)));
        if (d < gap) {
          gap = d;
          best = p.angle;
        }
      }
      const pr = rimRadius(arena.layout, best);
      const ex = Math.cos(best) * pr - top.x;
      const ez = Math.sin(best) * pr - top.z;
      const el = Math.hypot(ex, ez) || 1;
      dx = ex / el;
      dz = ez / el;
      impulse *= SPRING_SLING;
    }
    top.vx += dx * impulse;
    top.vz += dz * impulse;
    top.kick = Math.min(1, top.kick + impulse * 1.5);
    top.kickX = dx;
    top.kickZ = dz;
    hits++;
  }
  return hits;
}

/** A paid gust sweeping a rival at a pocket (within this angle) hits harder and lifts it. */
const GUST_AIM = 0.6;
const GUST_AIMED_PUSH = 2;

/**
 * A fast open-palm sweep pushes only tops crossed by the hand's path. It is directional rather
 * than an arena-wide spell: timing and the physical sweep line decide what moves. When `own` is
 * given, the hand steers around that top (it is never pushed), and a rival swept toward a pocket
 * mouth takes a doubled push and is lifted so the pocket is easier to clear.
 */
export function palmGust(arena: Arena, tops: readonly Top[], sx: number, sz: number, ex: number, ez: number, strength = 1, own: Top | null = null) {
  const dx = ex - sx;
  const dz = ez - sz;
  const length = Math.hypot(dx, dz);
  if (length < 1e-5) return 0;
  const nx = dx / length;
  const nz = dz / length;
  const heading = Math.atan2(nz, nx);
  const reach = Math.max(arena.radius * 0.46, 0.065);
  let hits = 0;
  for (const top of tops) {
    if (top === own || !palmGustCrosses(arena, top, sx, sz, ex, ez)) continue;
    const along = Math.max(0, Math.min(1, ((top.x - sx) * dx + (top.z - sz) * dz) / (length * length)));
    const gap = Math.hypot(top.x - (sx + dx * along), top.z - (sz + dz * along));
    const falloff = 1 - gap / reach;
    const aimed = !!own && palmGustAimed(arena, top, heading);
    const impulse = (aimed ? GUST_AIMED_PUSH : 1) * (0.075 + 0.055 * Math.max(0, Math.min(1.5, strength))) * (0.45 + falloff * 0.55);
    top.vx += nx * impulse;
    top.vz += nz * impulse;
    top.kick = Math.min(1, top.kick + impulse * 2.2);
    top.kickX = nx;
    top.kickZ = nz;
    top.charging = 0;
    if (aimed) top.lifted = Math.max(top.lifted, LIFT_TIME);
    hits++;
  }
  return hits;
}

/** True when a sweep heading points this top at a pocket mouth. */
export function palmGustAimed(arena: Arena, top: Top, heading: number) {
  for (const p of arena.layout.pockets) {
    const r = rimRadius(arena.layout, p.angle);
    const a = Math.atan2(Math.sin(p.angle) * r - top.z, Math.cos(p.angle) * r - top.x);
    if (Math.abs(Math.atan2(Math.sin(a - heading), Math.cos(a - heading))) < GUST_AIM) return true;
  }
  return false;
}

/** True when the hand's physical sweep corridor crosses this live top. */
export function palmGustCrosses(arena: Arena, top: Top, sx: number, sz: number, ex: number, ez: number) {
  if (!top.alive) return false;
  const dx = ex - sx;
  const dz = ez - sz;
  const length2 = dx * dx + dz * dz;
  if (length2 < 1e-10) return false;
  const along = Math.max(0, Math.min(1, ((top.x - sx) * dx + (top.z - sz) * dz) / length2));
  const px = sx + dx * along;
  const pz = sz + dz * along;
  return Math.hypot(top.x - px, top.z - pz) <= Math.max(arena.radius * 0.46, 0.065);
}

/** The palm-authored spatial target shared by simulation and presentation. */
export function sealTarget(arena: Arena, mine: Top, rival: Top, seal: Seal, ox = 0, oz = 0) {
  const palmAngle = Math.atan2(oz, ox);
  if (seal === 'magnet') {
    let angle = palmAngle;
    let gap = Infinity;
    for (const p of arena.layout.pockets) {
      const g = angleGap(p.angle, palmAngle);
      if (g < gap) {
        gap = g;
        angle = p.angle;
      }
    }
    return { x: Math.cos(angle) * arena.radius, z: Math.sin(angle) * arena.radius };
  }
  if (seal === 'hammer') return { x: Math.cos(palmAngle) * arena.radius * 0.55, z: Math.sin(palmAngle) * arena.radius * 0.55 };
  if (seal === 'rush') {
    const d = Math.hypot(ox - mine.x, oz - mine.z);
    return d > 1e-4 ? { x: ox, z: oz } : { x: rival.x, z: rival.z };
  }
  if (seal === 'ward') return { x: Math.cos(palmAngle) * arena.radius, z: Math.sin(palmAngle) * arena.radius };
  return { x: ox, z: oz };
}

/**
 * The lasting physical consequence of an ultimate. It uses ordinary live shapes so rendering,
 * collisions and headless balance reports all read the exact same changed battlefield.
 */
function leaveUltimateTerrain(arena: Arena, mine: Top, rival: Top, seal: Seal, ox: number, oz: number) {
  const target = sealTarget(arena, mine, rival, seal, ox, oz);
  const od = Math.hypot(ox, oz) || 1;
  const tx = target.x;
  const tz = target.z;
  if (seal === 'anvil') {
    // The slap buckles two broad ridges inward from that side of the rim.
    for (let i = 0; i < 2; i++) {
      const across = (i * 2 - 1) * 0.035;
      arena.addShape('ramp', ox * (0.68 - i * 0.14) - (oz / od) * across, oz * (0.68 - i * 0.14) + (ox / od) * across, SHAPE_SIZE.ramp * 0.55, `ultimate-anvil-${i}`, -ox, -oz, 0.064);
    }
  } else if (seal === 'rush') {
    const dx = tx - mine.x;
    const dz = tz - mine.z;
    arena.addShape('ramp', mine.x + dx * 0.55, mine.z + dz * 0.55, SHAPE_SIZE.ramp * 0.5, 'ultimate-rush', dx, dz, 0.048);
  } else if (seal === 'magnet') {
    arena.addShape('well', tx * 0.88, tz * 0.88, SHAPE_SIZE.well * 0.8, 'ultimate-magnet', 0, 0, 0.05);
  } else if (seal === 'hammer') {
    arena.addShape('well', tx, tz, SHAPE_SIZE.well * 0.7, 'ultimate-hammer', 0, 0, 0.046);
  } else if (seal === 'ward') {
    arena.addShape('ramp', tx * 0.82, tz * 0.82, SHAPE_SIZE.ramp * 0.58, 'ultimate-ward', -tx, -tz, 0.07);
  }
  // Tilt already changes the whole physical dish; a local mound would muddy the downhill read.
}

export function sealStrike(arena: Arena, mine: Top, rival: Top, seal: Seal, ox = 0, oz = 0) {
  if (seal === 'anvil') {
    strike(arena, mine, rival, ox, oz);
    leaveUltimateTerrain(arena, mine, rival, seal, ox, oz);
    return;
  }
  const target = sealTarget(arena, mine, rival, seal, ox, oz);
  if (seal === 'magnet') {
    const dx = target.x - rival.x;
    const dz = target.z - rival.z;
    const d = Math.hypot(dx, dz) || 1;
    // A centered or Tilt-anchored top resists the field; an exposed outer top is easy to convert.
    const exposure = 0.65 + 0.35 * Math.min(1, normRadius(arena.layout, rival.x, rival.z));
    const resistance = rival.anchor > 0 ? 0.55 : 1;
    rival.vx += (dx / d) * MAGNET_SPEED * exposure * resistance;
    rival.vz += (dz / d) * MAGNET_SPEED * exposure * resistance;
    rival.lifted = LIFT_TIME;
  }
  else if (seal === 'tilt') {
    // The arena dips toward the palm: everything slides that way (a hand on the far side of a pit
    // tips the rival into it).
    const d = Math.hypot(ox, oz) || 1;
    arena.shove = { x: ox / d, z: oz / d, t: TILT.time };
    // Your top digs in: the tip holds while everything else slides.
    mine.anchor = TILT.time + 0.3;
  } else if (seal === 'hammer') {
    mine.hammer = HAMMER_TIME;
    mine.hammerX = target.x;
    mine.hammerZ = target.z;
  }
  else if (seal === 'ward') {
    // A directional parry, not an interrupt: only the palm-authored rim sector is protected.
    mine.guard = WARD_TIME;
    mine.guardAngle = Math.atan2(target.z, target.x);
    arena.lastStrike = arena.elapsed;
    leaveUltimateTerrain(arena, mine, rival, seal, ox, oz);
    return;
  }
  else {
    const dx = target.x - mine.x;
    const dz = target.z - mine.z;
    const d = Math.hypot(dx, dz) || 1;
    mine.vx = (dx / d) * RUSH_SPEED;
    mine.vz = (dz / d) * RUSH_SPEED;
    mine.rushing = 0.6;
    // The rim catches your own rushing top: a missed Rush is a wasted strike, not a self-knockout.
    mine.shieldUntil = Math.max(mine.shieldUntil, arena.elapsed + 0.6);
    mine.charging = PARRY_WINDOW;
    mine.chargeAngle = Math.atan2(mine.z, mine.x);
    mine.kick = Math.min(1, mine.kick + 0.4);
    mine.sinceDash = 0;
  }
  leaveUltimateTerrain(arena, mine, rival, seal, ox, oz);
  arena.lastStrike = arena.elapsed;
  rival.tell = 0;
}

/**
 * Keeps the arena-authored part of a seal under the player's hand after it is stamped. The
 * activation still comes from `sealStrike`; this only steers effects whose fantasy is continuous
 * (a held tilt, a dragged gravity well, or a moving guard sector). Keeping this in the pure
 * simulation means emulator drives and headless checks see the same forces as the presentation.
 */
export function controlSeal(arena: Arena, mine: Top, rival: Top, seal: Seal, ox: number, oz: number, dt: number) {
  const d = Math.hypot(ox, oz) || 1;
  if (seal === 'tilt') {
    arena.shove = { x: ox / d, z: oz / d, t: Math.max(0.18, dt * 2) };
    mine.anchor = Math.max(mine.anchor, 0.3);
    return;
  }
  if (seal === 'ward') {
    mine.guard = Math.max(mine.guard, 0.25);
    mine.guardAngle = Math.atan2(oz, ox);
    return;
  }
  if (seal !== 'magnet' || !rival.alive) return;
  const target = sealTarget(arena, mine, rival, seal, ox, oz);
  const dx = target.x - rival.x;
  const dz = target.z - rival.z;
  const gap = Math.hypot(dx, dz) || 1;
  const exposure = 0.65 + 0.35 * Math.min(1, normRadius(arena.layout, rival.x, rival.z));
  const resistance = rival.anchor > 0 ? 0.55 : 1;
  // Same peak pull as the stamped impulse, integrated while the player drags the field.
  const pull = MAGNET_SPEED * exposure * resistance * Math.min(0.05, Math.max(0, dt)) * 2.2;
  rival.vx += (dx / gap) * pull;
  rival.vz += (dz / gap) * pull;
  rival.lifted = Math.max(rival.lifted, LIFT_TIME * 0.35);
}

/** A rival's one big move, by its style (docs/DUEL-DESIGN.md); shown TELL_TIME ahead by a glow and a sound. */
export type RivalMove = 'charge' | 'quake' | 'pull';
export const TELL_TIME = 1.3;
/** Charge speed (m/s) and the pull's speed toward a pit (m/s). (A spin-refill move was tried: any refill decided spin finishes.) */
const CHARGE_SPEED = 1.1;
const PULL_SPEED = 0.6;

/**
 * Does `rival`'s big move against `you`. A top held in a cup is braced: the quake and the pull pass
 * it by, a charge only meets it in a clash. Charge: it rushes straight at you. Quake: its own
 * shockwave (as the Anvil Strike, with the rival braced). Pull:
 * your top is dragged toward the nearest slag pit (or the rim) and lifted.
 */
export function rivalMove(arena: Arena, rival: Top, you: Top, kind: RivalMove, pull = PULL_SPEED): boolean {
  // A rival held in your cup cannot move.
  if (!rival.alive || arena.shapes.some((s) => s.caught === rival)) return false;
  // A top in your cup, or behind the authored side of a Ward, is braced.
  const braced = arena.shapes.some((s) => s.caught === you) || wardCovers(you, Math.atan2(rival.z, rival.x));
  if (kind === 'charge') {
    const dx = you.x - rival.x;
    const dz = you.z - rival.z;
    const d = Math.hypot(dx, dz) || 1;
    rival.vx = (dx / d) * CHARGE_SPEED;
    rival.vz = (dz / d) * CHARGE_SPEED;
    rival.kick = Math.min(1, rival.kick + 0.4);
    rival.sinceDash = 0;
    rival.charging = PARRY_WINDOW;
    rival.chargeAngle = Math.atan2(rival.z, rival.x);
  } else if (!braced && you.alive) {
    if (kind === 'quake') {
      const tell = you.tell;
      const last = arena.lastStrike;
      strike(arena, rival, you);
      you.tell = tell;
      // A rival's quake is not your strike.
      arena.lastStrike = last;
    } else {
      // Toward the nearest pit mouth, else straight out.
      const a0 = Math.atan2(you.z, you.x);
      let a = a0;
      let gap = Infinity;
      for (const p of arena.layout.pockets) {
        const g = Math.abs(Math.atan2(Math.sin(p.angle - a0), Math.cos(p.angle - a0)));
        if (g < gap) {
          gap = g;
          a = p.angle;
        }
      }
      const tx = Math.cos(a) * arena.radius - you.x;
      const tz = Math.sin(a) * arena.radius - you.z;
      const d = Math.hypot(tx, tz) || 1;
      you.vx += (tx / d) * pull;
      you.vz += (tz / d) * pull;
      you.lifted = LIFT_TIME;
    }
  }
  return true;
}

/** Pillars deflect a top; bumpers kick it away hard. Orbiting pillars also shove it along. */
function pillars(arena: Arena, t: Top) {
  const L = arena.layout;
  for (const p of L.pillars) {
    pillarAt(L, p, arena.orbitT, pillarTmp);
    const px = pillarTmp.x;
    const pz = pillarTmp.z;
    let nx = t.x - px;
    let nz = t.z - pz;
    const d = Math.hypot(nx, nz);
    const min = p.r + t.spec.radius;
    if (d >= min || d < 1e-6) continue;
    nx /= d;
    nz /= d;
    t.x = px + nx * min;
    t.z = pz + nz * min;
    // Bounce off the pillar as it moves (a circling one sweeps the top along with it).
    const vpx = L.orbit ? -pz * L.orbit : 0;
    const vpz = L.orbit ? px * L.orbit : 0;
    const into = (t.vx - vpx) * nx + (t.vz - vpz) * nz;
    if (into < 0) {
      t.vx -= (1 + PILLAR_BOUNCE) * into * nx;
      t.vz -= (1 + PILLAR_BOUNCE) * into * nz;
    }
    if (p.bumper) {
      t.vx += nx * BUMPER_KICK;
      t.vz += nz * BUMPER_KICK;
      t.kick = Math.min(1, t.kick + 0.6);
      t.kickX = nx;
      t.kickZ = nz;
      t.sinceBump = 0;
    }
  }
}

/** Rim: pockets swallow, rails dash, a hard enough hit flies over, everything else bounces. */
function wall(arena: Arena, t: Top) {
  const L = arena.layout;
  const angle = Math.atan2(t.z, t.x);
  const rim = rimRadius(L, angle);
  const r = Math.hypot(t.x, t.z);
  // Ward holds only the palm-authored rim sector; every other exit stays dangerous.
  const open = arena.elapsed >= Math.max(arena.grace, t.shieldUntil) && !wardCovers(t, angle);
  // No wall: crossing the edge is a ring-out (sumo).
  if (L.wall === 'none') {
    // Out once its center has crossed the edge (riding the berm is still in); during the opening
    // grace the edge bounces it back instead.
    if (r > rim) {
      if (open) {
        t.state = 'out';
        t.finish = 'over';
      } else {
        t.x = (t.x / r) * rim;
        t.z = (t.z / r) * rim;
        const out = (t.vx * t.x + t.vz * t.z) / rim;
        if (out > 0) {
          t.vx -= (1.5 * out * t.x) / rim;
          t.vz -= (1.5 * out * t.z) / rim;
        }
      }
    }
    return;
  }
  const limit = rim - t.spec.radius;
  if (r < limit) return;
  rimNormal(L, t.x, t.z, normalTmp);
  const nx = normalTmp.x;
  const nz = normalTmp.z;
  const outward = t.vx * nx + t.vz * nz;
  const pocket = L.pockets.find((p) => Math.abs(Math.atan2(Math.sin(angle - p.angle), Math.cos(angle - p.angle))) < suddenDeathPocketHalf(p.half, arena.elapsed)) ?? null;
  const ease = t.lifted > 0 ? LIFT_ESCAPE : 1;
  const pressureEscape = 1 - arena.pressure * 0.22;
  // Opening grace: right after the launch the rim holds everything, so no round is decided by
  // the first collision before anyone can read it.
  if (open && pocket && outward > TUNING.pocket * ease * pressureEscape) {
    t.state = 'out';
    t.finish = 'pocket';
    t.pocketPoints = pocket.points;
    return;
  }
  if (open && outward > WALL_ESCAPE[L.wall] * ease * pressureEscape) {
    t.state = 'out';
    t.finish = 'over';
    return;
  }
  // Keep it inside (a hard knock is an event for the view: sparks scraping off the wall).
  if (outward > WALL_SCRAPE && t.sinceWall > 0.2) {
    t.sinceWall = 0;
    t.wallHit = outward;
  }
  t.x = (t.x / r) * limit;
  t.z = (t.z / r) * limit;
  if (railAt(L, angle) && t.spec.gear > 0 && t.sinceDash > DASH_COOLDOWN && t.spin > 0.2) {
    // Rail dash: the tip catches the rail and the top shoots along it and into the middle.
    const tx = -nz * t.hand;
    const tz = nx * t.hand;
    const k = DASH_SPEED * t.spec.gear * Math.min(1, t.spin + 0.2);
    t.vx = (tx * 0.55 - nx * 0.85) * k;
    t.vz = (tz * 0.55 - nz * 0.85) * k;
    t.sinceDash = 0;
    return;
  }
  if (outward > 0) {
    const bounce = WALL_BOUNCE[L.wall];
    t.vx -= (1 + bounce) * outward * nx;
    t.vz -= (1 + bounce) * outward * nz;
    // A high wall: the top climbs it and drops back toward the middle with speed.
    if (L.wall === 'high') {
      t.vx -= nx * HIGH_WALL_DROP * Math.min(1, outward * 3);
      t.vz -= nz * HIGH_WALL_DROP * Math.min(1, outward * 3);
    }
  }
}

function burstApart(t: Top) {
  t.state = 'out';
  t.finish = 'burst';
}

function collide(a: Top, b: Top, arena: Arena | null = null): Clash | null {
  let nx = b.x - a.x;
  let nz = b.z - a.z;
  const dist = Math.hypot(nx, nz);
  const min = a.spec.radius + b.spec.radius;
  if (dist >= min || dist < 1e-6) return null;
  nx /= dist;
  nz /= dist;
  // Push apart so they never overlap.
  const push = (min - dist) / 2;
  a.x -= nx * push;
  a.z -= nz * push;
  b.x += nx * push;
  b.z += nz * push;
  const closing = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
  // Only a fresh hit (approaching) bounces; resting contact is just pushed apart above.
  if (closing <= 0) return null;
  // Equal-mass bounce plus a kick from the spinning rims, scaled by each side's punch/knockback.
  const same = a.hand === b.hand;
  // Tracking and fixed-step noise should not turn a grazing touch into a different round. Tiny
  // closing speeds ease in quadratically; intentional hits retain their full response.
  const stableClosing = closing < 0.09 ? (closing * closing) / 0.09 : closing;
  const impulse = ((1 + TUNING.restitution) / 2) * stableClosing + TUNING.recoil * (a.spin + b.spin) * 0.5 * (same ? SAME_SPIN_RECOIL : 1);
  // The lower top hits under the taller one: the taller takes extra knockback and tilt.
  const gap = Math.max(-1, Math.min(1, (a.spec.height - b.spec.height) / HEIGHT_GAP));
  const liftA = gap > 0 ? gap * HEIGHT_LIFT : 0;
  const liftB = gap < 0 ? -gap * HEIGHT_LIFT : 0;
  // A charge keeps its entry sector after crossing the center. Otherwise atan2 can flip by PI at
  // contact and make a visually correct directional parry fail.
  const fromB = b.charging > 0 ? b.chargeAngle : Math.atan2(b.z, b.x);
  const fromA = a.charging > 0 ? a.chargeAngle : Math.atan2(a.z, a.x);
  const guardedA = wardCovers(a, fromB);
  const guardedB = wardCovers(b, fromA);
  // A top braced in a well, a Rush, or the protected side of a Ward is knocked back less.
  const braceA = (arena && arena.shapes.length ? 1 - WELL_BRACE * arena.well(a.x, a.z) : 1) * (a.rushing > 0 || guardedA ? 0.5 : 1);
  const braceB = (arena && arena.shapes.length ? 1 - WELL_BRACE * arena.well(b.x, b.z) : 1) * (b.rushing > 0 || guardedB ? 0.5 : 1);
  // Only a deliberate charge through the guarded sector rebounds; an ordinary rail dash does not.
  const parryA = guardedB && a.charging > 0 ? WARD_PARRY : 1;
  const parryB = guardedA && b.charging > 0 ? WARD_PARRY : 1;
  // A defense top holding the middle digs in (its signature); dragged to the rim it is a top like any other.
  const holdA = a.spec.centerBrace && arena && Math.hypot(a.x, a.z) < arena.radius * 0.5 ? a.spec.centerBrace : 1;
  const holdB = b.spec.centerBrace && arena && Math.hypot(b.x, b.z) < arena.radius * 0.5 ? b.spec.centerBrace : 1;
  const ja = impulse * b.spec.punch * a.spec.knockback * (1 + liftA) * braceA * parryA * holdA;
  const jb = impulse * a.spec.punch * b.spec.knockback * (1 + liftB) * braceB * parryB * holdB;
  a.vx -= nx * ja;
  a.vz -= nz * ja;
  b.vx += nx * jb;
  b.vz += nz * jb;
  // The hit knocks each top's axis away from the other.
  a.kick = Math.min(1, a.kick + ja * 2 + liftA);
  a.kickX = -nx;
  a.kickZ = -nz;
  b.kick = Math.min(1, b.kick + jb * 2 + liftB);
  // Upper contact lifts the other top: for a moment walls and pockets take less to clear.
  if (a.spec.contact === 'upper') b.lifted = LIFT_TIME;
  if (b.spec.contact === 'upper') a.lifted = LIFT_TIME;
  b.kickX = nx;
  b.kickZ = nz;
  // Hits cost spin, the weaker puncher loses more.
  a.spin -= TUNING.spinHit * impulse * b.spec.punch;
  b.spin -= TUNING.spinHit * impulse * a.spec.punch;
  if (same) {
    // Same direction: the rims rub against each other's motion and both lose spin.
    a.spin -= SAME_SPIN_COST;
    b.spin -= SAME_SPIN_COST;
  } else {
    // Opposite directions mesh like gears: spin flows from the faster top to the slower one.
    const share = a.spec.contact === 'grind' || b.spec.contact === 'grind' ? GRIND_SHARE : SPIN_SHARE;
    const flow = (a.spin - b.spin) * share;
    a.spin -= flow;
    b.spin += flow;
  }
  // Hard hits crack the top; enough damage bursts it apart once the opening grace has passed.
  // A Hammer lands only when the solid clash happens inside its palm-authored forge mark.
  const solid = impulse * 1.6 >= HAMMER_MIN;
  const clashX = a.x + nx * a.spec.radius;
  const clashZ = a.z + nz * a.spec.radius;
  const hitA = solid && b.hammer > 0 && Math.hypot(clashX - b.hammerX, clashZ - b.hammerZ) <= HAMMER_ZONE ? HAMMER : 1;
  const hitB = solid && a.hammer > 0 && Math.hypot(clashX - a.hammerX, clashZ - a.hammerZ) <= HAMMER_ZONE ? HAMMER : 1;
  if (hitA > 1) b.hammer = 0;
  if (hitB > 1) a.hammer = 0;
  // A Hammer always cracks a top visibly (at least HAMMER_FLOOR of damage).
  const dA = (TUNING.burst * impulse * impulse * b.spec.punch * b.spec.chip * hitA) / a.spec.burstResist;
  const dB = (TUNING.burst * impulse * impulse * a.spec.punch * a.spec.chip * hitB) / b.spec.burstResist;
  a.damage += hitA > 1 ? Math.max(HAMMER_FLOOR, dA) : dA;
  b.damage += hitB > 1 ? Math.max(HAMMER_FLOOR, dB) : dB;
  const burstOpen = (t: Top) => !arena || arena.elapsed >= Math.max(arena.grace, t.shieldUntil);
  if (burstOpen(a) && a.damage >= 1) burstApart(a);
  if (burstOpen(b) && b.damage >= 1) burstApart(b);
  let shapeOwner: string | undefined;
  if (arena) {
    let influence = 0;
    for (const s of arena.shapes) {
      const sigma = s.sigma ?? (s.kind === 'ramp' ? RAMP_SIGMA : WELL_SIGMA);
      const da = Math.hypot(a.x - s.x, a.z - s.z);
      const db = Math.hypot(b.x - s.x, b.z - s.z);
      const k = Arena.strength(s) * Math.max(0, 1 - Math.min(da, db) / (sigma * 1.45));
      if (k > influence) {
        influence = k;
        shapeOwner = s.owner;
      }
    }
  }
  return { x: clashX, z: clashZ, strength: Math.min(1, impulse * 1.6), hammer: hitA > 1 || hitB > 1, parry: parryA > 1 || parryB > 1, ...(shapeOwner ? { shapeOwner } : {}) };
}

/** Points the winner scores: the pocket's value, 2 for over the wall or a burst, 1 out of spin. */
/** Heat to win a match: first to this many. */
export const MATCH_HEAT = MATCH_POINT_TARGET;

/**
 * Heat the winner scores: 1 for outlasting the other top, 2 for a wall/burst knockout, and the
 * authored pocket value (the glowing Crucible mouth is 3). A thrown top that also leaves the
 * detected real desk adds one room-aware bonus heat.
 */
export function finishPoints(loser: Top, tutorial = false, deskKo = false): number {
  const base = tutorial || loser.finish === 'spin' || loser.finish === null ? 1 : loser.finish === 'pocket' ? loser.pocketPoints : 2;
  return base + (deskKo && loser.finish === 'over' ? 1 : 0);
}

/**
 * Who won: 1 = a, -1 = b, 0 = undecided (both still spinning before the time limit).
 * Simultaneous ends and the time limit are decided on remaining spin; an exact tie is a replay (2).
 */
export function verdict(a: Top, b: Top, elapsed: number): -1 | 0 | 1 | 2 {
  if (a.alive && b.alive && elapsed < TIME_LIMIT) return 0;
  if (a.alive !== b.alive) return a.alive ? 1 : -1;
  if (a.spin !== b.spin) return a.spin > b.spin ? 1 : -1;
  if (a.damage !== b.damage) return a.damage < b.damage ? 1 : -1;
  // Final deterministic tie-break: the top closer to the safe middle takes the round. Exact
  // mirrored states favour the first seat instead of forcing another long replay.
  return Math.hypot(a.x, a.z) <= Math.hypot(b.x, b.z) ? 1 : -1;
}

/** True when a crowded round is over: at most one top still in play, or the time limit is reached. */
export function roundOverN(tops: readonly Top[], elapsed: number): boolean {
  let live = 0;
  for (const t of tops) if (t.alive) live++;
  return live <= 1 || elapsed >= TIME_LIMIT;
}

/**
 * Finishing order of a crowded round as indices, winner first. Mirrors verdict: tops still in play
 * rank above those out, and among them (the time limit) more remaining spin is better. Tops that are
 * out rank by how long they lasted in stepN (outAt), then by remaining spin. An exact tie keeps the
 * lower index first (verdict would call a two-top tie a replay; check that before ranking).
 */
export function rankingN(tops: readonly Top[], elapsed: number): number[] {
  void elapsed; // the order itself does not depend on the clock; roundOverN says when it is final
  const order = tops.map((_, i) => i);
  return order.sort((i, j) => {
    const a = tops[i];
    const b = tops[j];
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    if (!a.alive && a.outAt !== b.outAt) return b.outAt - a.outAt;
    if (a.spin !== b.spin) return b.spin - a.spin;
    return i - j;
  });
}
