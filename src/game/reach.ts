/**
 * Where the things you touch sit, and how far they are from a seated player's eyes. One place for
 * the touch layout (arena-local: the arena center is the origin, +Z toward the player, drawn
 * ARENA_SCALE times life size), so the headless check can keep every direct-touch target in comfortable reach.
 * Meta's hands guidance puts direct touch at about 0.42-0.46 m and warns against 0.5-0.8 m.
 * No three.js here.
 */
import { DISPLAY_RIM, rimRadius } from './layout.ts';
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
/** The comfort dial (picks a setting; the plate in front of it toggles it), between the dock and the level plate. */
export const COMFORT_AT: Spot = { x: -0.075, y: 0, z: 0.2 };
/** The brawl pegs: how many tops share the next match (two to four). */
export const BRAWL_AT: Spot = { x: -0.052, y: 0, z: 0.19 };
/**
 * Home pulls the dock and the anvil this much toward the middle of the near rim (the blueprint a
 * little less far out still), so they sit in the seated view; the forge and the workshop keep the wide layout.
 */
export const STATION_PULL = 0.84;
export const BLUEPRINT_PULL = 0.86;
/**
 * The station names lie on the table this far in front of their station (arena-local), SIGN.y up.
 * PLAY and FORGE sit just clear of the dock's foot and the anvil's plinth, which keeps them inside
 * the seated view (16b2); the workshop's sits clear of the blueprint's cradle.
 */
export const SIGN = { y: 0.012, play: 0.02, forge: 0.028, workshop: 0.04 };
/**
 * The bout's MENU (left) and REMATCH (right) buttons on the near rim, arena-local before the match's
 * slide back (the match adds pushed / ARENA_SCALE to z so they stay where the hand finds them).
 * x = 0.15 put them about 40 degrees out at the frame edge; 0.13 keeps them inside the seated view.
 */
export const RESULT_BUTTONS = { x: 0.13, y: 0.012, z: 0.14 };
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
 * sides, just inside the rim. Grips at the sides (x = +-r) put the hands about 0.85 m from the eyes;
 * 65 degrees round (50 degrees apart, about 21 cm between the hands on the smallest arena) keeps
 * every arena's grips within 2 ft (0.61 m) of a seated player's eyes for trays up to 0.4 m below them.
 */
export const FORGE_GRIP = { angle: (65 * Math.PI) / 180, n: 0.86 };
/** Two rim pinches forge only when they are at least about 25 degrees apart (the cosine of the angle between them). */
export const FORGE_GRIP_MAX_COS = 0.9;

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

/** Every target touched directly: tab ends, rail ends, the tray's nearest and outer parts, the home stations, the forge grips of `layouts` (floor level). */
export function touchTargets(layouts: ArenaLayout[] = []): [string, Spot][] {
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
    ['comfort plate', { x: COMFORT_AT.x - 0.012, y: TABLE_Y + 0.02, z: COMFORT_AT.z + 0.026 }],
    ['brawl pegs', { ...BRAWL_AT, y: TABLE_Y + 0.012 }],
    ['MENU button', { x: -RESULT_BUTTONS.x, y: RESULT_BUTTONS.y, z: RESULT_BUTTONS.z }],
    ['REMATCH button', { x: RESULT_BUTTONS.x, y: RESULT_BUTTONS.y, z: RESULT_BUTTONS.z }],
    ...layouts.flatMap((l) => forgeGrips(l).map((g, i): [string, Spot] => [`${l.name} forge grip ${i ? 'right' : 'left'}`, g])),
  ];
}

/**
 * Where the text hangs (arena-local, before the far-arena growth below): the round card over the far
 * rim, the match bar under it, the stamps (count, KO, verdict) above it, the forge's card higher.
 * The headless check keeps each within +-35 degrees up/down and +-40 degrees across of a seated head
 * looking at the arena centre, for trays 0.30-0.45 m below the eyes.
 */
export const HUD = {
  card: { x: 0, y: 0.14, z: -0.21 } as Spot,
  /** At home after the first session the card is a note just above the Smith's board. */
  homeNoteY: 0.18,
  /** In the forge the card rides this much higher and stands this much farther back. */
  forgeLift: 0.05,
  forgeBack: 0.03,
  /** The match bar's height and how far it leans back from the card. */
  barY: 0.063,
  /** In a fight the card hangs over the tops, so the bar alone rides this high: clear of the text over them. */
  fightBarY: 0.095,
  barBack: 0.021,
  /** On a result the card rides this much higher, clear of the bar's full plate (its top is at about 0.103). */
  resultLift: 0.012,
  textReach: 0.55,
  /** fightTextSpot: a top's crown above the floor and the gap text keeps from it on screen. */
  topCrown: 0.028,
  textGap: 0.004,
  /** Text keeps its upper edge this many degrees under the match bar's lower edge. */
  barClearDeg: 0.5,
  /** Text ends stay within this share of the side rim's reach (and text no nearer the player than that). */
  textSpan: 0.5,
  /** The largest stamp weight in a fight (a decided match or a level stamps up to 1.6 elsewhere). */
  fightStampWeight: 1,
};

/** Where fight text of half-height `hh` about a top at (x, z) hangs (arena-local, before the view
 * scale), seen from `head` (arena-local). It stands at the top's crown, moved along the view's up
 * direction by its half-height and a gap, so on screen it sits just above the top without covering it.
 * If its upper edge would then reach `barBottom` (the match bar's lower edge) it goes just below the
 * top instead. `hw` is its half-width. */
export function fightTextSpot(x: number, z: number, floor: number, hh: number, head: Spot, barBottom: Spot | null, hw = 0, halfSpan = Infinity): Spot {
  // Sideways its ends stay over the bowl (`halfSpan` across), so a top by the side rim keeps its text in view.
  const tx = Math.max(-(halfSpan - hw), Math.min(halfSpan - hw, x));
  // Toward the player it stops at the same span: right under the eyes text would fill the view.
  z = Math.min(z, halfSpan);
  const crown = { x: tx, y: floor + HUD.topCrown, z };
  const up = viewUp(crown, head);
  const d = hh + HUD.textGap;
  const above = { x: tx + up.x * d, y: crown.y + up.y * d, z: z + up.z * d };
  if (barBottom) {
    const edge = { x: above.x + up.x * hh, y: above.y + up.y * hh, z: above.z + up.z * hh };
    if (elevation(edge, head) > elevation(barBottom, head) - HUD.barClearDeg) return { x: tx - up.x * d, y: floor - up.y * d, z: z - up.z * d };
  }
  return above;
}

/** The unit vector (arena-local) that points up on screen at `p` for an eye at `head`. */
function viewUp(p: Spot, head: Spot): Spot {
  let dx = p.x - head.x, dy = p.y - head.y, dz = p.z - head.z;
  const n = Math.hypot(dx, dy, dz) || 1;
  dx /= n; dy /= n; dz /= n;
  // World up with its part along the view removed.
  const ux = -dy * dx, uy = 1 - dy * dy, uz = -dy * dz;
  const m = Math.hypot(ux, uy, uz) || 1;
  return { x: ux / m, y: uy / m, z: uz / m };
}

/** Degrees above the horizontal of `p` from `head`. */
function elevation(p: Spot, head: Spot): number {
  return (Math.atan2(p.y - head.y, Math.hypot(p.x - head.x, p.z - head.z)) * 180) / Math.PI;
}

/** A seated eye `drop` m above the arena's floor level, `reach` m in front of its centre (arena-local; gazeAngles' frame). */
export function seatedEye(drop: number, reach = REACH): Spot {
  return { x: 0, y: drop / ARENA_SCALE, z: reach / ARENA_SCALE };
}

/** The match bar's lower edge centre (arena-local) for an arena slid `pushed` back (match-system's bar placement). */
export function barBottomSpot(layout: ArenaLayout, pushed = 0, read = 1, lift = 0, barY = HUD.fightBarY): Spot {
  const far = rimRadius(layout, -Math.PI / 2);
  const grow = hudGrow(far, pushed);
  const hh = (BAR_PLANE.h * BAR_PLANE.scale * grow * read) / 2;
  return { x: 0, y: (barY + lift) * grow - hh * Math.cos(BAR_PLANE.tilt), z: hudCardZ(far) + HUD.barBack * grow + hh * Math.sin(BAR_PLANE.tilt) };
}

/** The view-angle box (degrees, seated head looking at the arena centre) of a flat rectangle centred
 * at `c`, half-size hw x hh, tilted back by `tilt` radians about its horizontal axis. */
export function viewBox(c: Spot, hw: number, hh: number, drop: number, reach: number, tilt = 0) {
  const corners = [-1, 1].flatMap((sx) => [-1, 1].map((sy) => gazeAngles({ x: c.x + sx * hw, y: c.y + sy * hh * Math.cos(tilt), z: c.z - sy * hh * Math.sin(tilt) }, drop, reach)));
  return { up: [Math.min(...corners.map((g) => g.up)), Math.max(...corners.map((g) => g.up))], side: [Math.min(...corners.map((g) => g.side)), Math.max(...corners.map((g) => g.side))] };
}

/** The match bar's view box for an arena slid `pushed` back, with read surfaces at `read` (match-system's bar placement). */
export function barViewBox(layout: ArenaLayout, drop: number, pushed = 0, read = 1, lift = 0, barY = HUD.fightBarY) {
  const far = rimRadius(layout, -Math.PI / 2);
  const grow = hudGrow(far, pushed);
  const z = hudCardZ(far) + HUD.barBack * grow;
  const k = BAR_PLANE.scale * grow * read;
  return viewBox({ x: 0, y: (barY + lift) * grow, z }, (BAR_PLANE.w * k) / 2, (BAR_PLANE.h * k) / 2, drop, REACH + pushed, BAR_PLANE.tilt);
}

/** The fight card's half-size (Label 0.22 wide, 160:512, at match-system's CARD_FIGHT_SCALE 0.55) and the
 * largest fight stamp's (0.2 x 0.05 at 0.8 in the bowl, weight HUD.fightStampWeight). */
export const FIGHT_CARD_HALF = { w: 0.11 * 0.55, h: ((0.22 * 160) / 512 / 2) * 0.55 };
export const FIGHT_STAMP_HALF = { w: 0.1 * 0.8, h: 0.025 * 0.8 };

/** The match bar's plane (match-bar.ts PW x PH) and how match-system scales and leans it. */
export const BAR_PLANE = { w: 1.31, h: (1.31 * 404) / 1400, scale: 0.21, tilt: 0.55 };

/** How much the card and the bar grow for an arena whose far rim is `far` out (arena-local) and slid `pushed` m back. */
export function hudGrow(far: number, pushed = 0, reach = REACH): number {
  const r = reach / ARENA_SCALE;
  return Math.max(1, (r + pushed / ARENA_SCALE + far) / (r + 0.17));
}

/** The card's distance back for an arena whose far rim is `far` out: never inside the far wall. */
export function hudCardZ(far: number, forge = false): number {
  return Math.min(HUD.card.z - (forge ? HUD.forgeBack : 0), -(far + 0.04));
}

/** Every essential read surface of an arena (arena-local), for a wall `lift` above the standard one,
 * a slide `pushed` m back and read surfaces grown by `read` (Large text; match-system readScale). */
export function hudAnchors(layout: ArenaLayout, lift = 0, pushed = 0, read = 1): [string, Spot][] {
  const far = rimRadius(layout, -Math.PI / 2);
  const grow = hudGrow(far, pushed);
  const z = hudCardZ(far);
  // The card's centre rises with its size above the bar's (match-system's card placement).
  const cardY = (HUD.barY + (HUD.card.y - HUD.barY) * read + lift) * grow;
  // In a fight the card hangs over a top, anywhere out to textReach of the rim.
  const overTop = ([-Math.PI / 2, Math.PI / 2, 0, Math.PI] as const).map((a, i): [string, Spot] => {
    // A top near that rim; the floor taken at its highest (the rim's rise) as the worst case.
    const r = rimRadius(layout, a) * 0.9;
    return [`fight card over a top (${['far', 'near', 'right', 'left'][i]})`, fightTextSpot(Math.cos(a) * r, Math.sin(a) * r, layout.depth, FIGHT_CARD_HALF.h * read, seatedEye(0.35, REACH + pushed), barBottomSpot(layout, pushed, read, lift), FIGHT_CARD_HALF.w * read, rimRadius(layout, 0) * HUD.textSpan)];
  });
  return [
    ['round card', { x: HUD.card.x, y: cardY, z }],
    ['result card', { x: HUD.card.x, y: (HUD.barY + (HUD.card.y - HUD.barY + HUD.resultLift) * read + lift) * grow, z }],
    ...overTop,
    ['match bar', { x: 0, y: (HUD.barY + lift) * grow, z: z + HUD.barBack * grow }],
    ['match bar in a fight', { x: 0, y: (HUD.fightBarY + lift) * grow, z: z + HUD.barBack * grow }],
    // The stamp hangs in the bowl, over a top or the centre (match-system), a few cm above the floor.
    ['stamp (count, KO, verdict)', { x: 0, y: 0.05, z: 0 }],
    // The buttons do not slide with the arena: arena-local they come forward by the slide.
    ...(['MENU button', 'REMATCH button'] as const).map((n, i): [string, Spot] => [n, { x: (i ? 1 : -1) * RESULT_BUTTONS.x, y: RESULT_BUTTONS.y, z: RESULT_BUTTONS.z + pushed / ARENA_SCALE }]),
  ];
}

/** The read surfaces off the match (the forge's card, the home note): the arena is shown at display size there and not slid back. */
export function hudAnchorsOffMatch(layout: ArenaLayout): [string, Spot][] {
  const far = Math.min(rimRadius(layout, -Math.PI / 2), DISPLAY_RIM);
  return [
    ['forge card', { x: HUD.card.x, y: HUD.card.y + HUD.forgeLift, z: hudCardZ(far, true) }],
    ['home note', { x: HUD.card.x, y: HUD.homeNoteY, z: hudCardZ(far) }],
    ...hubSigns(),
  ];
}

/**
 * Home's station names that always show (right-handed; left-handed mirrors x): PLAY in front of the
 * dock, FORGE in front of the anvil. The WORKSHOP name in front of the blueprint is not held to the
 * band: it sits about 39-44 degrees below the gaze (only the cradle's depth in front of the blueprint
 * would clear it), and it is the secondary station.
 */
export function hubSigns(): [string, Spot][] {
  return [
    ['PLAY station name', { x: DOCK_AT.x * STATION_PULL, y: TABLE_Y + SIGN.y, z: DOCK_AT.z + SIGN.play }],
    ['FORGE station name', { x: FORGE_AT.x * STATION_PULL, y: TABLE_Y + SIGN.y, z: FORGE_AT.z + SIGN.forge }],
  ];
}

/**
 * Degrees above (+) and beside a seated head looking at the arena centre, of an arena-local spot, for
 * a tray `drop` below the eyes: in the head's own frame (pitched down at the centre), as a display's
 * frame sees it (tan = offset / depth along the gaze). For spots straight ahead (x = 0) this is the
 * plain elevation difference; for near, low spots off to the side it is what the frame actually shows.
 */
export function gazeAngles(p: Spot, drop: number, reach = REACH): { up: number; side: number } {
  const deg = 180 / Math.PI;
  const x = p.x * ARENA_SCALE;
  const ahead = reach - p.z * ARENA_SCALE;
  const y = -drop + p.y * ARENA_SCALE;
  const pitch = Math.atan2(drop, reach);
  const depth = ahead * Math.cos(pitch) - y * Math.sin(pitch);
  const up = y * Math.cos(pitch) + ahead * Math.sin(pitch);
  return { up: Math.atan2(up, depth) * deg, side: Math.atan2(x, depth) * deg };
}
