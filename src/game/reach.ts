/**
 * Where the things you touch sit, and how far they are from a seated player's eyes. One place for
 * the touch layout (arena-local: the arena center is the origin, +Z toward the player, drawn
 * ARENA_SCALE times life size), so the headless check can keep every direct-touch target in comfortable reach.
 * Meta's hands guidance puts direct touch at about 0.42-0.46 m and warns against 0.5-0.8 m.
 * No three.js here.
 */
import { rimRadius } from './layout.ts';
import type { ArenaLayout } from './layout.ts';
import { PEDESTAL, REACH } from './placement.ts';

export interface Spot {
  x: number;
  y: number;
  z: number;
}

/** The arena-local to world scale: the arena is drawn 2.4 times its simulation size (about 72 cm across). */
export const ARENA_SCALE = 2.4;
/** The real table under the arena, arena-local (the props stand on it): the pedestal below the floor. */
export const TABLE_Y = -PEDESTAL / ARENA_SCALE;

/** The drawer tabs of the forge and the workshop share one line along the near rim. */
export const TAB_LINE = { z: 0.18, y: 0.006, gap: 0.066 };
/** The workshop's five tabs on the same line, a little closer together. */
export const WORKSHOP_TAB_GAP = 0.052;
/** The workshop's piece rail, above the near wall. */
export const RAIL = { z: 0.16, y: 0.03 };
/** Home: your top's dock, the forge's small anvil and the blueprint, on the near rim. */
export const DOCK_AT: Spot = { x: -0.14, y: 0, z: 0.165 };
export const FORGE_AT: Spot = { x: 0.14, y: 0, z: 0.165 };
export const BLUEPRINT_AT: Spot = { x: 0.08, y: 0, z: 0.185 };
/** The comfort dial (sound, flashes, the strike's gesture), between the dock and the level plate. */
export const COMFORT_AT: Spot = { x: -0.075, y: 0, z: 0.2 };
/** The brawl pegs: how many tops share the next match (two to four). */
export const BRAWL_AT: Spot = { x: -0.052, y: 0, z: 0.19 };
/** The forge: where your top stands on the anvil, and the part tray: an arc of this radius around it, spanning this angle toward the player. */
export const WORK: Spot = { x: 0, y: 0.07, z: 0.06 };
export const TRAY = { r: 0.11, y: 0.035, gap: 0.047 };

/** The arc the tray spans for n parts: a third of a circle, opening up to a half circle so parts keep their gap. */
export function traySpan(n: number): number {
  // At most 0.8 of a half circle: the ends stay in front of the anvil, not beside it.
  return Math.min(0.8 * Math.PI, Math.max((2 * Math.PI) / 3, (n * TRAY.gap) / TRAY.r));
}

/**
 * The i-th of n parts on the forge tray: on an arc flattened toward the player (the nearest parts
 * stay clear of the drawer tabs), spaced evenly along it, so the ends are as far apart as the middle.
 */
export function traySpot(i: number, n: number): Spot {
  const span = traySpan(n);
  const rz = TRAY.r * 0.8;
  const a0 = Math.PI / 2 + span / 2;
  // ponytail: arc length by 64 steps, fine for a handful of parts.
  const steps = 64;
  const len: number[] = [0];
  for (let k = 1; k <= steps; k++) {
    const a = a0 - (span * (k - 0.5)) / steps;
    len.push(len[k - 1] + (Math.hypot(TRAY.r * Math.sin(a), rz * Math.cos(a)) * span) / steps);
  }
  const want = (len[steps] * (i + 0.5)) / n;
  let k = 1;
  while (k < steps && len[k] < want) k++;
  const a = a0 - (span * (k - 1 + (want - len[k - 1]) / (len[k] - len[k - 1]))) / steps;
  return { x: WORK.x + Math.cos(a) * TRAY.r, y: TRAY.y, z: WORK.z + Math.sin(a) * rz };
}

/**
 * The two-hand forge grips: on the rim's near half, this far round toward the player from the
 * sides, just inside the rim. Grips at the sides (x = +-r) put the hands about 0.85 m from the eyes.
 */
export const FORGE_GRIP = { angle: Math.PI / 4, n: 0.86 };

/** True only in the two authored inner-rim sectors that belong to two-hand Arena Forge. */
export function forgeGripIntent(n: number, angle: number) {
  if (Math.abs(n - FORGE_GRIP.n) > 0.055) return false;
  const gap = (target: number) => Math.abs(Math.atan2(Math.sin(angle - target), Math.cos(angle - target)));
  return Math.min(gap(FORGE_GRIP.angle), gap(Math.PI - FORGE_GRIP.angle)) <= 0.2;
}

/** The left and right forge grips of an arena (floor level; add the arena height for y). */
export function forgeGrips(layout: ArenaLayout): [Spot, Spot] {
  return ([Math.PI - FORGE_GRIP.angle, FORGE_GRIP.angle] as const).map((a) => {
    const r = rimRadius(layout, a) * FORGE_GRIP.n;
    return { x: Math.cos(a) * r, y: 0, z: Math.sin(a) * r };
  }) as [Spot, Spot];
}

/** Distance (m) and angle below eye level (degrees) of an arena-local spot, for a tray `drop` below the eyes. */
export function eyeView(p: Spot, drop: number, reach = REACH): { distance: number; below: number } {
  const x = p.x * ARENA_SCALE;
  const y = -drop + p.y * ARENA_SCALE;
  const ahead = reach - p.z * ARENA_SCALE;
  const across = Math.hypot(x, ahead);
  return { distance: Math.hypot(across, y), below: (Math.atan2(-y, across) * 180) / Math.PI };
}

/** Every target touched directly: tab ends, rail ends, the tray's nearest and outer parts, the home stations. */
export function touchTargets(): [string, Spot][] {
  const tabEnd = (n: number) => ((n - 1) / 2) * TAB_LINE.gap;
  return [
    ['tab, center', { x: 0, y: TAB_LINE.y, z: TAB_LINE.z }],
    ['tab, outer', { x: tabEnd(4), y: TAB_LINE.y, z: TAB_LINE.z }],
    ['workshop tab, outer', { x: 2 * WORKSHOP_TAB_GAP, y: TAB_LINE.y, z: TAB_LINE.z }],
    ['rail, center', { x: 0, y: RAIL.y, z: RAIL.z }],
    ['rail, end', { x: 0.092, y: RAIL.y, z: RAIL.z }],
    ['tray, nearest', { x: 0, y: TRAY.y, z: WORK.z + TRAY.r * 0.8 }],
    ['tray, outer', traySpot(0, 6)],
    ['top on the anvil', WORK],
    ['dock', { ...DOCK_AT, y: TABLE_Y + 0.04 }],
    ['anvil', { ...FORGE_AT, y: TABLE_Y + 0.06 }],
    ['blueprint', { ...BLUEPRINT_AT, y: TABLE_Y + 0.02 }],
    ['comfort dial', { ...COMFORT_AT, y: TABLE_Y + 0.012 }],
    ['brawl pegs', { ...BRAWL_AT, y: TABLE_Y + 0.012 }],
  ];
}
