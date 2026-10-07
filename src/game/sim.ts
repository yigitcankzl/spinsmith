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
/** Shapes the player makes flatten back with this time constant (~2-3 s to vanish). */
const RELAX_TAU = 1.0;
/** Player shapes: a ramp's and a well's width (sigma, m), and how hard a fresh well slows a top (1/s). */
/** A ramp's footprint (arena-local): about 11 cm across in the world, wide enough to meet a moving top. */
export const RAMP_SIGMA = 0.045;
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
  shapeHold: 1.0,
  /** Seconds after the launch during which pockets and walls hold every top (no instant finishes). */
  grace: 2.5,
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
const GRIND_SHARE = 0.12;
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
  private tiltVX = 0;
  private tiltVZ = 0;
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
      const d = Math.abs(Math.atan2(Math.sin(angle - p.angle), Math.cos(angle - p.angle))) / (p.half * 1.6);
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
   * Adds a ramp or well. An owner holds one live shape at a time: its previous one dissolves.
   * Returns the shape.
   */
  addShape(kind: ShapeKind, x: number, z: number, amp: number, owner: string, dx = 0, dz = 0, sigma?: number): FloorShape {
    this.shapes = this.shapes.filter((s) => s.owner !== owner);
    const len = Math.hypot(dx, dz);
    const shape: FloorShape = { kind, x, z, dx: len > 1e-6 ? dx / len : 0, dz: len > 1e-6 ? dz / len : 0, amp, age: 0, owner };
    if (sigma !== undefined) shape.sigma = sigma;
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
    return s.age < TUNING.shapeHold ? 1 : Math.exp(-(s.age - TUNING.shapeHold) / RELAX_TAU);
  }

  /** Height of the live shapes at (x, z). */
  shapesHeight(x: number, z: number): number {
    let h = 0;
    for (const s of this.shapes) {
      const k = s.amp * Arena.strength(s);
      const rx = x - s.x;
      const rz = z - s.z;
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
    return t;
  }

  /** Lets a cup go without a throw: its top rolls on, the hollow relaxes away. */
  free(cup: FloorShape) {
    cup.held = false;
    cup.trap = false;
    cup.caught = null;
    cup.age = Math.max(cup.age, TUNING.shapeHold);
  }

  /** Per-step arena update: shapes relax, the dish rocks under the tops' weight. */
  update(dt: number, a: Top, b: Top) {
    this.elapsed += dt;
    this.orbitT += dt;
    const k = Math.exp(-dt / RELAX_TAU);
    for (let i = 0; i < this.shape.length; i++) this.shape[i] *= k;
    if (this.shapes.length) {
      for (const s of this.shapes) s.age += dt;
      this.shapes = this.shapes.filter((s) => Arena.strength(s) > 0.03);
    }
    if (this.layout.tilt > 0) {
      // The dish dips toward where the spinning tops are (rotation about x tips +z down, and so on).
      const wx = ((a.alive ? a.x : 0) + (b.alive ? b.x : 0)) / this.radius;
      const wz = ((a.alive ? a.z : 0) + (b.alive ? b.z : 0)) / this.radius;
      const targetX = Math.max(-1, Math.min(1, wz * TILT_WEIGHT * 0.5)) * this.layout.tilt;
      const targetZ = Math.max(-1, Math.min(1, -wx * TILT_WEIGHT * 0.5)) * this.layout.tilt;
      this.tiltVX += ((targetX - this.tiltX) * TILT_SPRING - this.tiltVX * TILT_DAMP) * dt;
      this.tiltVZ += ((targetZ - this.tiltZ) * TILT_SPRING - this.tiltVZ * TILT_DAMP) * dt;
      this.tiltX += this.tiltVX * dt;
      this.tiltZ += this.tiltVZ * dt;
    }
  }

  /** Back to a fresh, level arena for a new round (keeps the layout). */
  reset(layout = this.layout) {
    this.layout = layout;
    this.shape.fill(0);
    this.shapes = [];
    this.tiltX = this.tiltZ = this.tiltVX = this.tiltVZ = 0;
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

export type ShapeKind = 'ramp' | 'well';

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
  /** Seconds left of a Rush: the charging top is braced and takes half the knockback. */
  rushing = 0;
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

  spec: TopSpec;

  constructor(spec: TopSpec) {
    this.spec = spec;
  }

  launch(x: number, z: number, vx: number, vz: number, spin: number, hand: number) {
    Object.assign(this, { x, z, vx, vz, spin, hand, angle: 0, wobble: 0, kick: 0, lifted: 0, sinceDash: 99, sinceBump: 99, sincePad: 99, tell: 0, rushing: 0, damage: 0, pocketPoints: 2, finish: null, state: 'spinning' as Outcome });
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

function advance(arena: Arena, t: Top, other: Top, dt: number) {
  if (!t.alive) return;
  const s = t.spec;
  const L = arena.layout;
  const grip = L.theme === 'ice' ? ICE_GRIP : 1;
  arena.slope(t.x, t.z, slopeTmp);
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
  }
  // Attack types hunt the opponent: their heading turns toward it.
  if (s.seek > 0 && other.alive) {
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
  t.sincePad += dt;
  t.rushing = Math.max(0, t.rushing - dt);
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
    const k = TUNING.strike * rage * n * n * (1 + TUNING.hot * t.damage) * (t === mine ? TUNING.strikeOwn : 1);
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
export type Seal = 'anvil' | 'rush' | 'magnet';
export const SEALS: Seal[] = ['anvil', 'rush', 'magnet'];
/** Your Magnet pulls a little softer than a rival's pull: it lands more often. */
const MAGNET_SPEED = 0.45;
/** Your Rush hits harder than a rival's charge: it is your one strike. */
const RUSH_SPEED = 1.2;

export function sealStrike(arena: Arena, mine: Top, rival: Top, seal: Seal, ox = 0, oz = 0) {
  if (seal === 'anvil') return strike(arena, mine, rival, ox, oz);
  if (seal === 'magnet') rivalMove(arena, mine, rival, 'pull', MAGNET_SPEED);
  else {
    rivalMove(arena, mine, rival, 'charge');
    const v = Math.hypot(mine.vx, mine.vz) || 1;
    mine.vx *= RUSH_SPEED / v;
    mine.vz *= RUSH_SPEED / v;
    mine.rushing = 0.6;
  }
  arena.lastStrike = arena.elapsed;
  rival.tell = 0;
}

/** A rival's one big move, by its style (docs/DUEL-DESIGN.md); shown TELL_TIME ahead by a glow and a sound. */
export type RivalMove = 'charge' | 'quake' | 'pull';
export const TELL_TIME = 1;
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
  const braced = arena.shapes.some((s) => s.caught === you);
  if (kind === 'charge') {
    const dx = you.x - rival.x;
    const dz = you.z - rival.z;
    const d = Math.hypot(dx, dz) || 1;
    rival.vx = (dx / d) * CHARGE_SPEED;
    rival.vz = (dz / d) * CHARGE_SPEED;
    rival.kick = Math.min(1, rival.kick + 0.4);
    rival.sinceDash = 0;
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
  // No wall: crossing the edge is a ring-out (sumo).
  if (L.wall === 'none') {
    // Out once its center has crossed the edge (riding the berm is still in); during the opening
    // grace the edge bounces it back instead.
    if (r > rim) {
      if (arena.elapsed >= TUNING.grace) {
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
  const pocket = pocketAt(L, angle);
  const ease = t.lifted > 0 ? LIFT_ESCAPE : 1;
  // Opening grace: right after the launch the rim holds everything, so no round is decided by
  // the first collision before anyone can read it.
  const open = arena.elapsed >= TUNING.grace;
  if (open && pocket && outward > TUNING.pocket * ease) {
    t.state = 'out';
    t.finish = 'pocket';
    t.pocketPoints = pocket.points;
    return;
  }
  if (open && outward > WALL_ESCAPE[L.wall] * ease) {
    t.state = 'out';
    t.finish = 'over';
    return;
  }
  // Keep it inside.
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
  const impulse = ((1 + TUNING.restitution) / 2) * closing + TUNING.recoil * (a.spin + b.spin) * 0.5 * (same ? SAME_SPIN_RECOIL : 1);
  // The lower top hits under the taller one: the taller takes extra knockback and tilt.
  const gap = Math.max(-1, Math.min(1, (a.spec.height - b.spec.height) / HEIGHT_GAP));
  const liftA = gap > 0 ? gap * HEIGHT_LIFT : 0;
  const liftB = gap < 0 ? -gap * HEIGHT_LIFT : 0;
  // A top braced in a well is knocked back less.
  const braceA = (arena && arena.shapes.length ? 1 - WELL_BRACE * arena.well(a.x, a.z) : 1) * (a.rushing > 0 ? 0.5 : 1);
  const braceB = (arena && arena.shapes.length ? 1 - WELL_BRACE * arena.well(b.x, b.z) : 1) * (b.rushing > 0 ? 0.5 : 1);
  const ja = impulse * b.spec.punch * a.spec.knockback * (1 + liftA) * braceA;
  const jb = impulse * a.spec.punch * b.spec.knockback * (1 + liftB) * braceB;
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
  // Hard hits crack the top; enough damage bursts it apart.
  a.damage += (TUNING.burst * impulse * impulse * b.spec.punch * b.spec.chip) / a.spec.burstResist;
  b.damage += (TUNING.burst * impulse * impulse * a.spec.punch * a.spec.chip) / b.spec.burstResist;
  if (a.damage >= 1) burstApart(a);
  if (b.damage >= 1) burstApart(b);
  return { x: a.x + nx * a.spec.radius, z: a.z + nz * a.spec.radius, strength: Math.min(1, impulse * 1.6) };
}

/** Points the winner scores: the pocket's value, 2 for over the wall or a burst, 1 out of spin. */
/** Heat to win a match: first to this many. */
export const MATCH_HEAT = 3;

/**
 * Heat the winner scores: 1 for outlasting the other top, 2 for any knockout (into a slag pit,
 * thrown over the wall, or shattered). Every pit is worth the same.
 */
export function finishPoints(loser: Top): number {
  return loser.finish === 'spin' || loser.finish === null ? 1 : 2;
}

/**
 * Who won: 1 = a, -1 = b, 0 = undecided (both still spinning before the time limit).
 * Simultaneous ends and the time limit are decided on remaining spin; an exact tie is a replay (2).
 */
export function verdict(a: Top, b: Top, elapsed: number): -1 | 0 | 1 | 2 {
  if (a.alive && b.alive && elapsed < TIME_LIMIT) return 0;
  if (a.alive !== b.alive) return a.alive ? 1 : -1;
  if (a.spin === b.spin) return 2;
  return a.spin > b.spin ? 1 : -1;
}
