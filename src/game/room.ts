/**
 * The real table as a shape: is a point over it, and where must the arena go so its rim stays on
 * the wood. Pure maths on the table's polygon (horizontal, x/z in metres), no three.js.
 */

export interface XZ {
  x: number;
  z: number;
}

/** True when (x, z) is inside the polygon (even-odd rule). */
export function insidePoly(poly: XZ[], x: number, z: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

/** Distance from (x, z) to the polygon's nearest edge. */
export function edgeDistance(poly: XZ[], x: number, z: number): number {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j];
    const b = poly[i];
    const ex = b.x - a.x;
    const ez = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * ex + (z - a.z) * ez) / (ex * ex + ez * ez || 1)));
    best = Math.min(best, Math.hypot(x - (a.x + ex * t), z - (a.z + ez * t)));
  }
  return best;
}

/** The arena's rim keeps at least this much wood around it (m). */
export const RIM_MARGIN = 0.03;
/** The arena moves at most this far to stay on the table (m). */
export const MAX_FIT_MOVE = 0.15;

/**
 * The arena's center moved toward the table's middle, as little as needed (and at most
 * MAX_FIT_MOVE), so a rim of radius `rim` stays RIM_MARGIN inside the table's edge.
 */
export function fitToTable(center: XZ, poly: XZ[], rim: number): XZ {
  const fits = (p: XZ) => insidePoly(poly, p.x, p.z) && edgeDistance(poly, p.x, p.z) >= rim + RIM_MARGIN;
  if (poly.length < 3 || fits(center)) return center;
  let cx = 0;
  let cz = 0;
  for (const p of poly) {
    cx += p.x / poly.length;
    cz += p.z / poly.length;
  }
  const dx = cx - center.x;
  const dz = cz - center.z;
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return center;
  // The smallest step toward the middle that fits; failing that, the furthest allowed.
  const reach = Math.min(MAX_FIT_MOVE, len);
  for (let s = 0.01; s <= reach + 1e-9; s += 0.01) {
    const p = { x: center.x + (dx / len) * s, z: center.z + (dz / len) * s };
    if (fits(p)) return p;
  }
  return { x: center.x + (dx / len) * reach, z: center.z + (dz / len) * reach };
}
