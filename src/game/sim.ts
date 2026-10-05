/**
 * Pure fight simulation: a heightmap arena and spinning tops on it.
 * No three.js here so it can be stepped and checked headlessly.
 * All units are meters and seconds; coordinates are arena-local (center at 0,0).
 */

export const ARENA_RADIUS = 0.15;

/**
 * Stadium layout, symmetric for both players (player at +Z, opponent at -Z):
 * a wall around the rim with four pockets on the diagonals and dash rails on the rim between them.
 * Angles are atan2(z, x) in radians.
 */
export const POCKETS = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
/** Half-angle of a pocket opening (~6 cm wide at the rim). */
export const POCKET_HALF = 0.2;
/** Dash rails between the pockets (sides, and the rim behind each launch spot): center angle and half-angle. */
export const RAILS = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
export const RAIL_HALF = 0.45;
/** Floor dips toward a pocket over this outer band of the radius. */
const POCKET_BAND = 0.25;
const POCKET_DEPTH = 0.003;
/**
 * A top only drops into a pocket when it is driven outward at least this fast (m/s): cruising
 * along the rim passes over the mouth, a hit or a bump sends it in.
 */
export const POCKET_SPEED = 0.06;
/** Hitting the wall faster than this (m/s, outward) sends a top over it. */
const WALL_ESCAPE = 0.42;
const WALL_BOUNCE = 0.55;
/** Rail dash: speed and the cooldown before the same top can dash again. */
const DASH_SPEED = 0.42;
const DASH_COOLDOWN = 1.2;

/** Smallest angle between two angles (radians). */
function angleGap(a: number, b: number) {
  const d = Math.abs(a - b) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
}

export function inPocket(angle: number) {
  return POCKETS.some((p) => angleGap(angle, p) < POCKET_HALF);
}

export function onRail(angle: number) {
  return RAILS.some((r) => angleGap(angle, r) < RAIL_HALF);
}
const GRID = 32;
const CELL = (2 * ARENA_RADIUS) / (GRID - 1);
/** Shapes the player makes flatten back with this time constant (~2-3 s to vanish). */
const RELAX_TAU = 0.8;
const GRAVITY = 9.81;
/** Global feel knobs (tuned with scripts/sim-check.ts and on device). */
export const TUNING = {
  /** Bounciness of the bodies (0..1). */
  restitution: 0.73,
  /** Spinning rims kick each other apart on contact (m/s at full spin). */
  recoil: 0.14,
  /** Spin lost per unit of impulse. */
  spinHit: 0.041,
  /** Bowl rise at the rim (m): tops roll toward the center, so they meet. */
  bowl: 0.007,
  /** How strongly a spinning tip turns radial motion into an orbit around the center (1/s). */
  orbit: 2.08,
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
    return TUNING.bowl * r2 + this.pocketDip(x, z) + this.shapeHeight(x, z);
  }

  /** The floor slopes down into each pocket near the rim, so a top close to a pocket drifts in. */
  pocketDip(x: number, z: number): number {
    const r = Math.hypot(x, z) / ARENA_RADIUS;
    if (r < 1 - POCKET_BAND) return 0;
    const angle = Math.atan2(z, x);
    let dip = 0;
    for (const p of POCKETS) {
      const g = angleGap(angle, p) / (POCKET_HALF * 1.6);
      if (g < 1) dip = Math.max(dip, (1 - g * g) * ((r - (1 - POCKET_BAND)) / POCKET_BAND));
    }
    return -POCKET_DEPTH * dip;
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

  /** Bilinear sample of the player-made shape layer (bump > 0, dent < 0). */
  shapeHeight(x: number, z: number): number {
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
  /**
   * Cruise speed (m/s) at full spin: a spinning tip scrubbing the floor keeps the top travelling,
   * so with the bowl pulling inward the tops orbit instead of settling in the middle.
   */
  cruise: number;
  /** How quickly the tip drive pulls the speed back toward cruise (1/s). */
  drive: number;
  /** Max sliding speed (m/s). */
  maxSpeed: number;
}

export const WIDE: TopSpec = {
  radius: 0.03,
  punch: 1.33,
  knockback: 0.94,
  spinDrain: 0.026,
  roam: 0.12,
  cruise: 0.11,
  drive: 1.3,
  maxSpeed: 0.9,
};

export const NARROW: TopSpec = {
  radius: 0.021,
  punch: 0.97,
  knockback: 1.27,
  spinDrain: 0.02,
  roam: 0.3,
  cruise: 0.155,
  drive: 2.4,
  maxSpeed: 1.1,
};

export type Outcome = 'spinning' | 'out' | 'toppled';
/** How a round was lost: into a pocket, over the wall, or out of spin. */
export type Finish = 'pocket' | 'over' | 'spin' | null;

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
  /** Sign of the curving direction (tops spin opposite ways). */
  hand = 1;

  readonly spec: TopSpec;

  constructor(spec: TopSpec) {
    this.spec = spec;
  }

  launch(x: number, z: number, vx: number, vz: number, spin: number, hand: number) {
    Object.assign(this, { x, z, vx, vz, spin, hand, angle: 0, wobble: 0, kick: 0, sinceDash: 99, finish: null, state: 'spinning' as Outcome });
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
  let speed = Math.hypot(t.vx, t.vz);
  if (speed < 1e-4) {
    // Standing still: the tip starts it moving around the center, in its spin direction.
    const r = Math.hypot(t.x, t.z) || 1;
    t.vx = (-t.z / r) * t.hand * 1e-3;
    t.vz = (t.x / r) * t.hand * 1e-3;
    speed = 1e-3;
  }
  // Spinning tip curves the path sideways (stronger while spinning fast).
  const curve = (s.roam * t.spin * t.hand * dt) / speed;
  const cvx = t.vx;
  t.vx -= t.vz * curve;
  t.vz += cvx * curve;
  // Spinning tops precess around the stadium: the tip turns radial motion into an orbit
  // in the spin direction, so tops circle instead of swinging through the middle like a pendulum.
  const r = Math.hypot(t.x, t.z);
  if (r > 1e-3) {
    const sp = Math.hypot(t.vx, t.vz);
    const tx = (-t.z / r) * t.hand * sp;
    const tz = (t.x / r) * t.hand * sp;
    // Right after a hit the top flies free; the orbit only takes over again as the kick fades.
    const k = Math.min(1, TUNING.orbit * Math.max(0, t.spin) * (1 - t.kick) * dt);
    t.vx += (tx - t.vx) * k;
    t.vz += (tz - t.vz) * k;
  }
  // Tip drive: speed eases toward the cruise speed for the current spin.
  const target = s.cruise * Math.max(0, t.spin);
  const k = 1 + ((target - speed) / speed) * Math.min(1, s.drive * dt);
  t.vx *= k;
  t.vz *= k;
  const v = Math.hypot(t.vx, t.vz);
  if (v > s.maxSpeed) {
    t.vx *= s.maxSpeed / v;
    t.vz *= s.maxSpeed / v;
  }
  t.x += t.vx * dt;
  t.z += t.vz * dt;
  // Spin drains on its own and faster while scraping across the floor.
  t.spin -= (s.spinDrain + v * 0.05) * dt;
  // Visual spin, capped so the body stripes never alias into spinning backwards on screen.
  t.angle += (6 + 22 * Math.max(0, t.spin)) * dt * t.hand;
  t.kick *= Math.exp(-6 * dt);
  t.wobble = Math.min(1, Math.max(0, (0.35 - t.spin) / (0.35 - TOPPLE_SPIN)));
  t.sinceDash += dt;
  wall(t);
  if (t.alive && t.spin <= TOPPLE_SPIN) {
    t.spin = 0;
    t.state = 'toppled';
    t.finish = 'spin';
  }
}

/** Rim: pockets swallow, rails dash, a hard enough hit flies over, everything else bounces. */
function wall(t: Top) {
  const r = Math.hypot(t.x, t.z);
  const limit = ARENA_RADIUS - t.spec.radius;
  if (r < limit) return;
  const angle = Math.atan2(t.z, t.x);
  const nx = t.x / r;
  const nz = t.z / r;
  const outward = t.vx * nx + t.vz * nz;
  if (inPocket(angle) && outward > POCKET_SPEED) {
    t.state = 'out';
    t.finish = 'pocket';
    return;
  }
  if (outward > WALL_ESCAPE) {
    t.state = 'out';
    t.finish = 'over';
    return;
  }
  // Keep it inside.
  t.x = nx * limit;
  t.z = nz * limit;
  if (onRail(angle) && t.sinceDash > DASH_COOLDOWN && t.spin > 0.2) {
    // Rail dash: the tip catches the rail and the top shoots along it and into the middle.
    const tx = -nz * t.hand;
    const tz = nx * t.hand;
    const k = DASH_SPEED * Math.min(1, t.spin + 0.2);
    t.vx = (tx * 0.55 - nx * 0.85) * k;
    t.vz = (tz * 0.55 - nz * 0.85) * k;
    t.sinceDash = 0;
    return;
  }
  if (outward > 0) {
    t.vx -= (1 + WALL_BOUNCE) * outward * nx;
    t.vz -= (1 + WALL_BOUNCE) * outward * nz;
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
  // Only a fresh hit (approaching) bounces; resting contact is just pushed apart above.
  if (closing <= 0) return null;
  // Equal-mass bounce plus a kick from the spinning rims, scaled by each side's punch/knockback.
  const impulse = ((1 + TUNING.restitution) / 2) * closing + TUNING.recoil * (a.spin + b.spin) * 0.5;
  const ja = impulse * b.spec.punch * a.spec.knockback;
  const jb = impulse * a.spec.punch * b.spec.knockback;
  a.vx -= nx * ja;
  a.vz -= nz * ja;
  b.vx += nx * jb;
  b.vz += nz * jb;
  // The hit knocks each top's axis away from the other.
  a.kick = Math.min(1, a.kick + ja * 6);
  a.kickX = -nx;
  a.kickZ = -nz;
  b.kick = Math.min(1, b.kick + jb * 6);
  b.kickX = nx;
  b.kickZ = nz;
  // Hits cost spin, the weaker puncher loses more.
  a.spin -= TUNING.spinHit * impulse * b.spec.punch;
  b.spin -= TUNING.spinHit * impulse * a.spec.punch;
  return { x: a.x + nx * a.spec.radius, z: a.z + nz * a.spec.radius, strength: Math.min(1, impulse * 5) };
}

/** Points the winner scores for a finish: pocket or over the wall 2, out of spin 1. */
export function finishPoints(loser: Top): number {
  return loser.finish === 'pocket' || loser.finish === 'over' ? 2 : 1;
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
