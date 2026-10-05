/**
 * Pure fight simulation: a heightmap arena and spinning tops on it.
 * No three.js here so it can be stepped and checked headlessly.
 * All units are meters and seconds; coordinates are arena-local (center at 0,0).
 */

export const ARENA_RADIUS = 0.15;
const GRID = 32;
const CELL = (2 * ARENA_RADIUS) / (GRID - 1);
/** Shapes the player makes flatten back with this time constant (~2-3 s to vanish). */
const RELAX_TAU = 0.8;
const GRAVITY = 9.81;
/** Global feel knobs (tuned with scripts/sim-check.ts and on device). */
export const TUNING = {
  /** Overall hit strength. */
  hit: 0.43,
  /** Bowl rise at the rim (m): tops roll toward the center, so they meet. */
  bowl: 0.011,
};
/** Fixed simulation step. */
export const STEP = 1 / 120;
/** Below this spin a top topples. */
const TOPPLE_SPIN = 0.06;
/** A fight that lasts longer than this is decided on remaining spin. */
export const TIME_LIMIT = 45;
/** Launch speed (m/s) at full power. Higher makes head-on launches end in one hit. */
export const LAUNCH_SPEED = 0.15;

export class Arena {
  /** Player-made shape layer, added on top of the bowl. */
  readonly shape = new Float32Array(GRID * GRID);

  /** Height of the arena surface at (x, z). */
  height(x: number, z: number): number {
    const r2 = (x * x + z * z) / (ARENA_RADIUS * ARENA_RADIUS);
    return TUNING.bowl * r2 + this.shapeAt(x, z);
  }

  /** Surface slope (dh/dx, dh/dz) written into out. */
  slope(x: number, z: number, out: { x: number; z: number }) {
    const e = CELL * 0.5;
    out.x = (this.height(x + e, z) - this.height(x - e, z)) / (2 * e);
    out.z = (this.height(x, z + e) - this.height(x, z - e)) / (2 * e);
  }

  /**
   * Holds a gaussian bump (amplitude > 0) or dent (< 0) at (x, z) for this frame.
   * Takes the stronger of the existing shape and the stamp, so holding it still keeps it steady.
   */
  stamp(x: number, z: number, amplitude: number, sigma = 0.035) {
    const reach = Math.ceil((sigma * 2.5) / CELL);
    const ci = Math.round((x + ARENA_RADIUS) / CELL);
    const cj = Math.round((z + ARENA_RADIUS) / CELL);
    for (let j = Math.max(0, cj - reach); j <= Math.min(GRID - 1, cj + reach); j++) {
      for (let i = Math.max(0, ci - reach); i <= Math.min(GRID - 1, ci + reach); i++) {
        const dx = i * CELL - ARENA_RADIUS - x;
        const dz = j * CELL - ARENA_RADIUS - z;
        const v = amplitude * Math.exp(-(dx * dx + dz * dz) / (sigma * sigma));
        const k = j * GRID + i;
        this.shape[k] = amplitude > 0 ? Math.max(this.shape[k], v) : Math.min(this.shape[k], v);
      }
    }
  }

  relax(dt: number) {
    const k = Math.exp(-dt / RELAX_TAU);
    for (let i = 0; i < this.shape.length; i++) this.shape[i] *= k;
  }

  clear() {
    this.shape.fill(0);
  }

  /** Bilinear sample of the shape layer. */
  private shapeAt(x: number, z: number): number {
    const fx = Math.min(GRID - 1.001, Math.max(0, (x + ARENA_RADIUS) / CELL));
    const fz = Math.min(GRID - 1.001, Math.max(0, (z + ARENA_RADIUS) / CELL));
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const u = fx - i;
    const v = fz - j;
    const s = this.shape;
    const a = s[j * GRID + i] * (1 - u) + s[j * GRID + i + 1] * u;
    const b = s[(j + 1) * GRID + i] * (1 - u) + s[(j + 1) * GRID + i + 1] * u;
    return a * (1 - v) + b * v;
  }
}

/** How a top's shape translates into behavior. Mass is the same for every top. */
export interface TopSpec {
  /** Collision radius (m). Wider tops carry mass outward. */
  radius: number;
  /** How hard it hits: wider body = more momentum at the rim. */
  punch: number;
  /** How much a hit moves it: narrow tops get knocked around more. */
  knockback: number;
  /** Spin lost per second while just spinning. */
  spinDrain: number;
  /** Sideways curving from the tip (round tips roam). */
  roam: number;
  /** Linear damping (grip of the tip). */
  grip: number;
  /** Max sliding speed (m/s). */
  maxSpeed: number;
}

export const WIDE: TopSpec = {
  radius: 0.03,
  punch: 1.34,
  knockback: 0.81,
  spinDrain: 0.031,
  roam: 0.12,
  grip: 0.6,
  maxSpeed: 0.9,
};

export const NARROW: TopSpec = {
  radius: 0.021,
  punch: 0.84,
  knockback: 1.31,
  spinDrain: 0.025,
  roam: 0.3,
  grip: 0.35,
  maxSpeed: 1.1,
};

export type Outcome = 'spinning' | 'out' | 'toppled';

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
  state: Outcome = 'spinning';
  /** Sign of the curving direction (tops spin opposite ways). */
  hand = 1;

  readonly spec: TopSpec;

  constructor(spec: TopSpec) {
    this.spec = spec;
  }

  launch(x: number, z: number, vx: number, vz: number, spin: number, hand: number) {
    Object.assign(this, { x, z, vx, vz, spin, hand, angle: 0, wobble: 0, state: 'spinning' as Outcome });
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

/** Advances one fixed step. Returns a clash event when the two tops collided this step. */
export function step(arena: Arena, a: Top, b: Top, dt = STEP): Clash | null {
  advance(arena, a, dt);
  advance(arena, b, dt);
  return a.alive && b.alive ? collide(a, b) : null;
}

function advance(arena: Arena, t: Top, dt: number) {
  if (!t.alive) return;
  const s = t.spec;
  arena.slope(t.x, t.z, slopeTmp);
  // Gravity along the slope.
  t.vx -= GRAVITY * slopeTmp.x * dt;
  t.vz -= GRAVITY * slopeTmp.z * dt;
  // Spinning tip curves the path sideways (stronger while spinning fast).
  const speed = Math.hypot(t.vx, t.vz);
  if (speed > 1e-4) {
    const curve = (s.roam * t.spin * t.hand * dt) / speed;
    const vx = t.vx;
    t.vx -= t.vz * curve;
    t.vz += vx * curve;
  }
  const damp = Math.exp(-s.grip * dt);
  t.vx *= damp;
  t.vz *= damp;
  const v = Math.hypot(t.vx, t.vz);
  if (v > s.maxSpeed) {
    t.vx *= s.maxSpeed / v;
    t.vz *= s.maxSpeed / v;
  }
  t.x += t.vx * dt;
  t.z += t.vz * dt;
  // Spin drains on its own and faster while scraping across the floor.
  t.spin -= (s.spinDrain + v * 0.05) * dt;
  t.angle += (8 + 52 * Math.max(0, t.spin)) * dt * t.hand;
  t.wobble = Math.min(1, Math.max(0, (0.35 - t.spin) / (0.35 - TOPPLE_SPIN)));
  if (Math.hypot(t.x, t.z) > ARENA_RADIUS + s.radius * 0.3) t.state = 'out';
  else if (t.spin <= TOPPLE_SPIN) {
    t.spin = 0;
    t.state = 'toppled';
  }
}

function collide(a: Top, b: Top): Clash | null {
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
  // Spinning rims grind and kick each other apart even when barely moving.
  const grind = 0.03 * (a.spin + b.spin);
  const impulse = (Math.max(0, closing) * 0.9 + grind) * TUNING.hit;
  // Each top is pushed by the other's punch, scaled by its own knockback.
  const ja = impulse * b.spec.punch * a.spec.knockback;
  const jb = impulse * a.spec.punch * b.spec.knockback;
  a.vx -= nx * ja;
  a.vz -= nz * ja;
  b.vx += nx * jb;
  b.vz += nz * jb;
  // Hits cost spin, the weaker puncher loses more.
  a.spin -= 0.05 * impulse * b.spec.punch;
  b.spin -= 0.05 * impulse * a.spec.punch;
  return { x: a.x + nx * a.spec.radius, z: a.z + nz * a.spec.radius, strength: Math.min(1, impulse * 4) };
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
