/**
 * Where the arena goes: a comfortable reach ahead of the seated player, on the nearest table at a
 * usable height, or on a floating tray below the eyes when there is none. Pure maths (no three.js),
 * so the headless check can test it.
 */

/** The arena floor sits this far above the real table, leaving room to press wells. */
export const PEDESTAL = 0.08;
/** How far in front of the seated player's head the arena goes (m, horizontal). */
export const REACH = 0.6;
/** Without a table the arena floats on a tray this far below the head. */
export const TRAY_DROP = 0.35;
export const TABLE_MIN_H = 0.45;
export const TABLE_MAX_H = 1.15;
export const TABLE_MAX_DIST = 1.6;
/** A table more than this far below the eyes is not used (m). Seated at a desk it is about 0.4-0.6. */
export const TABLE_MAX_BELOW_EYES = 0.75;

export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface Placement extends Point {
  /** Turn about +Y so the arena's local +Z points back at the head. */
  yaw: number;
  onTable: boolean;
}

/** Height of the nearest usable table (centers of horizontal table/desk planes), or null. */
export function pickTable(head: Point, tables: Point[]): number | null {
  let best: number | null = null;
  let bestDist = TABLE_MAX_DIST;
  for (const t of tables) {
    if (t.y < TABLE_MIN_H || t.y > TABLE_MAX_H) continue;
    // A table far below the eyes (standing over a coffee table) would mean bending over it.
    if (head.y - t.y > TABLE_MAX_BELOW_EYES) continue;
    const d = Math.hypot(t.x - head.x, t.z - head.z);
    if (d < bestDist) {
      bestDist = d;
      best = t.y;
    }
  }
  return best;
}

/** The arena's pose for a head and its horizontal look direction (any length; zero means ahead). */
export function placeArena(head: Point, fwdX: number, fwdZ: number, tables: Point[], reach = REACH): Placement {
  let len = Math.hypot(fwdX, fwdZ);
  if (len < 1e-6) {
    fwdX = 0;
    fwdZ = -1;
    len = 1;
  }
  const x = head.x + (fwdX / len) * reach;
  const z = head.z + (fwdZ / len) * reach;
  const table = pickTable(head, tables);
  const y = table !== null ? table + PEDESTAL : head.y - TRAY_DROP;
  return { x, y, z, yaw: Math.atan2(head.x - x, head.z - z), onTable: table !== null };
}
