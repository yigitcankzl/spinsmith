/**
 * Where the arena goes: a comfortable reach ahead of the seated player, on the nearest table at a
 * usable height, or on a floating tray below the eyes when there is none. Pure maths (no three.js),
 * so the headless check can test it.
 */

import { edgeDistance, insidePoly, MAX_FIT_MOVE } from './room.ts';
import type { XZ } from './room.ts';

/** The arena floor sits this far above the real table, leaving room to press wells. */
export const PEDESTAL = 0.08;
/** How far in front of the seated player's head the arena goes (m, horizontal). */
export const REACH = 0.68;
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

/**
 * A detected plane that could hold the arena. rank 0: labelled table or desk; rank 1: an
 * unlabelled (or 'other'/unknown) flat, upward-facing surface at desk height, used only when no
 * labelled table qualifies. poly is its world x/z outline, when the plane has one.
 */
export interface TablePlane extends Point {
  rank?: 0 | 1;
  poly?: XZ[];
}

/** What a detected plane says about itself, as the classifier needs it. */
export interface PlaneInfo {
  orientation?: string;
  semanticLabel?: string;
  /** World Y of the plane's normal (its local +Y): 1 faces up, -1 (a ceiling) faces down. */
  upY: number;
  /** World height of the plane. */
  y: number;
  /** World x/z outline (empty when the plane has no polygon). */
  poly: XZ[];
}

/** Labels that are never a surface for the arena, even unconfirmed. */
const NOT_A_TABLE = /floor|ceiling|wall|door|window|couch|sofa|bed|screen|lamp|plant|art|mesh|shelf|storage/;
/** An unlabelled surface must be at least this wide every way (m) and this large (m^2). */
export const SURFACE_MIN_SIDE = 0.3;
export const SURFACE_MIN_AREA = 0.12;
/** Without a floor plane, an unlabelled surface must sit this far below the eyes (m). */
export const SURFACE_MIN_BELOW_EYES = 0.2;

/** Area (m^2) of a polygon in x/z. */
export function polyArea(poly: XZ[]): number {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += poly[j].x * poly[i].z - poly[i].x * poly[j].z;
  return Math.abs(a) / 2;
}

/** The polygon's narrowest width over its edge directions (exact for convex outlines). */
export function polyMinWidth(poly: XZ[]): number {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const ex = poly[i].x - poly[j].x;
    const ez = poly[i].z - poly[j].z;
    const len = Math.hypot(ex, ez);
    if (len < 1e-6) continue;
    let w = 0;
    for (const p of poly) w = Math.max(w, Math.abs((p.x - poly[j].x) * ez - (p.z - poly[j].z) * ex) / len);
    best = Math.min(best, w);
  }
  return Number.isFinite(best) ? best : 0;
}

/**
 * Whether a plane can hold the arena: 0 for a labelled table/desk, 1 for an unlabelled surface
 * (horizontal, facing up, 0.45-1.15 m above the floor, or 0.2-0.75 m below the eyes when there
 * is no floor plane, and at least 30 cm wide and 0.12 m^2), null otherwise.
 */
export function tableRank(plane: PlaneInfo, floorY: number | null, headY: number): 0 | 1 | null {
  if (plane.orientation !== 'horizontal') return null;
  const label = (plane.semanticLabel ?? '').toLowerCase();
  if (/table|desk/.test(label)) return 0;
  if (NOT_A_TABLE.test(label) || plane.upY < 0.9 || plane.poly.length < 3) return null;
  if (floorY !== null) {
    const h = plane.y - floorY;
    if (h < TABLE_MIN_H || h > TABLE_MAX_H) return null;
  } else {
    const below = headY - plane.y;
    if (below < SURFACE_MIN_BELOW_EYES || below > TABLE_MAX_BELOW_EYES) return null;
  }
  return polyMinWidth(plane.poly) >= SURFACE_MIN_SIDE && polyArea(plane.poly) >= SURFACE_MIN_AREA ? 1 : null;
}

/** Where the arena would stand: a reach ahead of the head along its horizontal look. */
export function reachSpot(head: Point, fwdX: number, fwdZ: number, reach = REACH): XZ {
  const len = Math.hypot(fwdX, fwdZ);
  if (len < 1e-6) return { x: head.x, z: head.z - reach };
  return { x: head.x + (fwdX / len) * reach, z: head.z + (fwdZ / len) * reach };
}

/**
 * The usable table: the nearest labelled table/desk at a usable height; failing that, the
 * unlabelled surface under (or within MAX_FIT_MOVE of) `spot`, where the arena would stand in
 * front of the player, and not one the head is above (the player's own chair).
 */
export function pickTablePlane(head: Point, tables: TablePlane[], spot?: XZ): TablePlane | null {
  let best: TablePlane | null = null;
  let bestKey = Infinity;
  for (const t of tables) {
    const rank = t.rank ?? 0;
    // A table far below the eyes (standing over a coffee table) would mean bending over it.
    if (head.y - t.y > TABLE_MAX_BELOW_EYES) continue;
    const d = Math.hypot(t.x - head.x, t.z - head.z);
    if (d >= TABLE_MAX_DIST) continue;
    let key = d;
    if (rank === 0) {
      if (t.y < TABLE_MIN_H || t.y > TABLE_MAX_H) continue;
    } else {
      if (!spot || !t.poly || t.poly.length < 3 || insidePoly(t.poly, head.x, head.z)) continue;
      const off = insidePoly(t.poly, spot.x, spot.z) ? 0 : edgeDistance(t.poly, spot.x, spot.z);
      if (off > MAX_FIT_MOVE) continue;
      // Ranked after every labelled table; among surfaces, the one under the spot, then nearest.
      key = 10 + off * 10 + d;
    }
    if (key < bestKey) {
      bestKey = key;
      best = t;
    }
  }
  return best;
}

/** Height of the usable table (see pickTablePlane), or null. */
export function pickTable(head: Point, tables: TablePlane[], spot?: XZ): number | null {
  return pickTablePlane(head, tables, spot)?.y ?? null;
}

/** The arena's pose for a head and its horizontal look direction (any length; zero means ahead). */
export function placeArena(head: Point, fwdX: number, fwdZ: number, tables: TablePlane[], reach = REACH): Placement {
  let len = Math.hypot(fwdX, fwdZ);
  if (len < 1e-6) {
    fwdX = 0;
    fwdZ = -1;
    len = 1;
  }
  const x = head.x + (fwdX / len) * reach;
  const z = head.z + (fwdZ / len) * reach;
  const table = pickTable(head, tables, { x, z });
  const y = table !== null ? table + PEDESTAL : head.y - TRAY_DROP;
  return { x, y, z, yaw: Math.atan2(head.x - x, head.z - z), onTable: table !== null };
}
