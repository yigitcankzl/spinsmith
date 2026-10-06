/**
 * Arena layouts as plain data: every knob that shapes a stadium. The simulation, the visuals,
 * the preset arenas and the arena builder all read and write this one structure.
 * Positions of pillars are in fractions of the arena radius so a layout survives resizing.
 * Angles are atan2(z, x) in radians; the player launches from +Z, the opponent from -Z.
 */

export type Shape = 'circle' | 'oval' | 'square';
export type Floor = 'bowl' | 'flat' | 'hill' | 'ridge' | 'tiers';
export type Wall = 'low' | 'standard' | 'high' | 'none';
export type Theme = 'forge' | 'stone' | 'clockwork' | 'ice';

export interface Pocket {
  angle: number;
  /** Half-angle of the opening (radians). */
  half: number;
  /** Points scored by knocking the opponent in. */
  points: number;
}

export interface Rail {
  angle: number;
  half: number;
}

export interface Pillar {
  /** Center in fractions of the arena radius. */
  x: number;
  z: number;
  /** Radius in meters. */
  r: number;
  /** Bumpers kick tops away like a pinball bumper; plain pillars just deflect. */
  bumper: boolean;
}

export interface ArenaLayout {
  name: string;
  /** The arena's main rule in a few words, shown before a match (built-in arenas). */
  rule?: string;
  theme: Theme;
  /** Arena radius in meters (the long side for an oval). 0.12 to 0.18 fits a seated reach. */
  radius: number;
  shape: Shape;
  floor: Floor;
  /** Rise of the floor at the rim (m); for a hill, the height of the central hill. */
  depth: number;
  wall: Wall;
  pockets: Pocket[];
  rails: Rail[];
  pillars: Pillar[];
  /** Center vortex speed boost (0 = none). */
  vortex: number;
  /** Center turntable speed in rad/s (0 = none). */
  spinner: number;
  /** Max tilt of a rocking dish in radians (0 = fixed floor). */
  tilt: number;
  /** After a while, embers close in from the rim and drain spin outside a shrinking safe zone. */
  shrink: boolean;
}

export const MIN_RADIUS = 0.12;
export const MAX_RADIUS = 0.18;
/** Oval arenas are this much shorter front to back than side to side. */
const OVAL_RATIO = 0.78;
/** Square arenas are a superellipse with this exponent (rounded corners). */
const SQUARE_POWER = 4;

/** Distance from the center to the rim in the direction `angle`. */
export function rimRadius(layout: ArenaLayout, angle: number): number {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  if (layout.shape === 'oval') return layout.radius / Math.sqrt(c * c + (s / OVAL_RATIO) ** 2);
  if (layout.shape === 'square') return layout.radius / Math.pow(Math.abs(c) ** SQUARE_POWER + Math.abs(s) ** SQUARE_POWER, 1 / SQUARE_POWER);
  return layout.radius;
}

/** 0 at the center, 1 on the rim, above 1 outside. */
export function normRadius(layout: ArenaLayout, x: number, z: number): number {
  const r = Math.hypot(x, z);
  return r < 1e-9 ? 0 : r / rimRadius(layout, Math.atan2(z, x));
}

/** Outward unit normal of the rim near (x, z), written into out. */
export function rimNormal(layout: ArenaLayout, x: number, z: number, out: { x: number; z: number }) {
  if (layout.shape === 'circle') {
    const r = Math.hypot(x, z) || 1;
    out.x = x / r;
    out.z = z / r;
    return;
  }
  const e = 1e-4;
  const gx = normRadius(layout, x + e, z) - normRadius(layout, x - e, z);
  const gz = normRadius(layout, x, z + e) - normRadius(layout, x, z - e);
  const g = Math.hypot(gx, gz) || 1;
  out.x = gx / g;
  out.z = gz / g;
}

/** Smallest angle between two angles (radians). */
export function angleGap(a: number, b: number) {
  const d = Math.abs(a - b) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
}

export function pocketAt(layout: ArenaLayout, angle: number): Pocket | null {
  return layout.pockets.find((p) => angleGap(angle, p.angle) < p.half) ?? null;
}

export function railAt(layout: ArenaLayout, angle: number): Rail | null {
  return layout.rails.find((r) => angleGap(angle, r.angle) < r.half) ?? null;
}

/** Where each side's top starts: on the launch axis, most of the way to the rim. */
export function spawnDistance(layout: ArenaLayout) {
  return rimRadius(layout, Math.PI / 2) * 0.72;
}

/** A layout that would not play is rejected with a reason (the builder shows it). */
export function validate(layout: ArenaLayout): string | null {
  if (layout.radius < MIN_RADIUS - 1e-6 || layout.radius > MAX_RADIUS + 1e-6) return 'Arena size is out of reach';
  if (layout.wall !== 'none') {
    const open = layout.pockets.reduce((sum, p) => sum + p.half * 2, 0);
    if (open > Math.PI) return 'Too many pockets: more than half the rim is open';
  }
  const spawn = spawnDistance(layout) / layout.radius;
  for (const p of layout.pillars) {
    // Keep both launch spots clear.
    if (Math.hypot(p.x, Math.abs(p.z) - spawn) < 0.25) return 'A pillar blocks a launch spot';
    if (Math.hypot(p.x, p.z) > 0.85) return 'A pillar is too close to the rim';
  }
  return null;
}

export function cloneLayout(layout: ArenaLayout): ArenaLayout {
  return JSON.parse(JSON.stringify(layout)) as ArenaLayout;
}
