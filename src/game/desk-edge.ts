/**
 * Where the real table edge is close to the arena: the directions in which a top thrown over the
 * rim would soon leave the real desk (a DESK KO). Pure geometry, no three.js.
 *
 * Everything is in arena-local x/z with the arena centre at the origin; angles follow
 * Math.atan2(z, x), the same convention as normRadius/rimRadius.
 */
import { insidePoly } from './room.ts';
import type { XZ } from './room.ts';

export interface DeskSector {
  /** Direction from the arena centre (radians, atan2(z, x)). */
  angle: number;
  /** Half the angular width of the sector (radians). */
  halfWidth: number;
  /** Shortest distance from the centre to the real table edge inside the sector. */
  distance: number;
}

/** Angular sample count (5 degree steps). */
const SAMPLES = 72;

/** Distance from the origin along (dx, dz) to the polygon outline, or Infinity. */
export function rayExit(poly: XZ[], dx: number, dz: number): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ex = b.x - a.x;
    const ez = b.z - a.z;
    const den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = (a.x * ez - a.z * ex) / den;
    const u = (a.x * dz - a.z * dx) / den;
    if (t > 0 && u >= -1e-9 && u <= 1 + 1e-9) best = Math.min(best, t);
  }
  return best;
}

/**
 * Danger sectors: runs of directions where the table edge is within `rim + reach` of the centre.
 * Adjacent dangerous directions merge into one sector, so an arena tucked into a corner (both
 * edges and the corner between them within reach) yields ONE wide sector spanning the corner;
 * if the corner diagonal is out of reach it yields two. At most `max` sectors are returned,
 * nearest edge first. An arena whose centre is off the table returns none.
 */
export function deskSectors(poly: XZ[] | null, rim: number, reach: number, max = 2): DeskSector[] {
  if (!poly || poly.length < 3 || !insidePoly(poly, 0, 0)) return [];
  const limit = rim + reach;
  const step = (Math.PI * 2) / SAMPLES;
  const near: number[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const a = i * step;
    near.push(rayExit(poly, Math.cos(a), Math.sin(a)));
  }
  const hot = near.map((d) => d <= limit);
  if (hot.every(Boolean)) return [{ angle: 0, halfWidth: Math.PI, distance: Math.min(...near) }];
  // Start scanning just after a safe direction so runs never wrap.
  const start = hot.indexOf(false);
  const out: DeskSector[] = [];
  let run: number[] = [];
  const flush = () => {
    if (!run.length) return;
    const first = run[0];
    const span = run.length;
    let mid = (first + (span - 1) / 2) * step;
    mid = Math.atan2(Math.sin(mid), Math.cos(mid));
    out.push({ angle: mid, halfWidth: (span * step) / 2, distance: Math.min(...run.map((i) => near[i % SAMPLES])) });
    run = [];
  };
  for (let k = 1; k <= SAMPLES; k++) {
    const i = start + k;
    if (hot[i % SAMPLES]) run.push(i);
    else flush();
  }
  flush();
  return out.sort((a, b) => a.distance - b.distance).slice(0, max);
}

/**
 * The sector the staged first DESK KO may aim through: the nearest one that does not face the
 * player (the rival would land in their lap) and is not blocked (a wall right behind the edge).
 * `playerAngle` is the direction from the arena centre to the head, in the sectors' frame; a
 * sector whose middle is within `facing` of it is skipped. Null when every sector is ruled out.
 */
export function wrenchSector(sectors: DeskSector[], playerAngle: number | null, blocked: (s: DeskSector) => boolean = () => false, facing = Math.PI / 3): DeskSector | null {
  for (const s of sectors) {
    if (playerAngle !== null && Math.abs(Math.atan2(Math.sin(s.angle - playerAngle), Math.cos(s.angle - playerAngle))) < facing) continue;
    if (blocked(s)) continue;
    return s;
  }
  return null;
}

/** True when `angle` is inside the sector (wrap-safe). */
export function inSector(s: DeskSector, angle: number): boolean {
  const d = Math.atan2(Math.sin(angle - s.angle), Math.cos(angle - s.angle));
  return Math.abs(d) <= s.halfWidth;
}

/**
 * The first match's staged DESK KO aims through the nearest sector, at the direction closest to
 * its middle that stays clear of every slag pocket (a pocket finish never reaches the real desk).
 * Angles are in the same frame as the pockets; falls back to the sector's middle.
 */
export function deskWrenchAngle(s: DeskSector, pockets: { angle: number; half: number }[]): number {
  const clear = (a: number) => pockets.every((p) => Math.abs(Math.atan2(Math.sin(a - p.angle), Math.cos(a - p.angle))) > p.half + 0.15);
  const step = Math.PI / 72;
  for (let d = 0; d <= s.halfWidth * 0.8; d += step) {
    if (clear(s.angle + d)) return s.angle + d;
    if (clear(s.angle - d)) return s.angle - d;
  }
  return s.angle;
}

/** One fixed step of the staged DESK KO's steer: the rival drifts to 80% of `rim` along `angle`. */
export function deskWrenchSteer(top: { x: number; z: number; vx: number; vz: number }, angle: number, rim: number, dt: number) {
  const r = rim * 0.8;
  const k = Math.min(1, 8 * dt);
  top.vx += ((Math.cos(angle) * r - top.x) * 6 - top.vx) * k;
  top.vz += ((Math.sin(angle) * r - top.z) * 6 - top.vz) * k;
}
