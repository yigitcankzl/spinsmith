import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshMatcapMaterial,
  OctahedronGeometry,
  PlaneGeometry,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  Vector3,
} from '@iwsdk/core';
import { arenaWarning } from './arena-report.js';
import type { ArenaReport } from './arena-report.js';
import { engrave, FONT, glass, GLASS_LIGHT, metalPlate, ORANGE, STEEL as UI_STEEL, TEXT } from './ui.js';
import { DialPlate, popIn, RimTabs, rimSlot, rowSpots } from './rim.js';
import { ARENA_SCALE, RAIL, TAB_LINE, WORKSHOP_TAB_GAP } from './reach.js';
import { miniArena } from './visuals.js';
import { playDrawer, playMachine, playPick, playPlace, playRemove } from './audio.js';
import type { HandState } from './hands.js';
import { angleGap, ArenaLayout, cloneLayout, Floor, MAX_RADIUS, MIN_RADIUS, normRadius, rimRadius, Shape, Theme, validate, Wall } from './layout.js';
import { Arena } from './sim.js';
import { makeMatcap } from './visuals.js';

/**
 * The arena workshop. Instead of a menu, a tray of little 3D pieces sits beside the arena, within
 * reach. Pinch a piece, carry it over the arena and let go: a pocket is cut into the rim where you
 * drop it, a pillar stands where you drop it, a floor piece reshapes the floor, a gem changes the
 * theme. Pieces already on the arena can be picked up and moved, or dropped off the arena to throw
 * them away. Pinch the rim and pull to
 * resize the arena. Works near (pinch) and far (point and pinch), so it is hands-first on a headset
 * and click-and-drag in the emulator.
 */

const FLOOR_DEPTH: Record<Floor, number> = { bowl: 0.011, flat: 0.03, hill: 0.009, ridge: 0.012, tiers: 0.007, crater: 0.012, waves: 0.01, twin: 0.011 };
/** The wild floors share one stepping piece (the drawers hold five pieces at most). */
const WILD: Floor[] = ['tiers', 'crater', 'waves', 'twin'];
const STORE_KEY = 'spinsmith.arenas.v1';
/** A pinch this close to a piece (m) grabs it; a ray this close to it grabs it from afar. */
const GRAB_NEAR = 0.035;
const GRAB_RAY = 0.025;
/** A pinch released this fast and this still counts as a tap. */
const TAP_TIME = 0.3;
const TAP_MOVE = 0.015;

type Piece =
  | { kind: 'pocket' | 'rail' | 'pillar' | 'bumper' | 'pad' }
  | { kind: 'wild' }
  | { kind: 'shape'; value: Shape }
  | { kind: 'floor'; value: Floor }
  | { kind: 'wall' }
  | { kind: 'theme' }
  | { kind: 'extra'; value: 'vortex' | 'spinner' | 'tilt' | 'shrink' | 'orbit' }
  | { kind: 'arena'; index: number };

/** Saved player arenas from this browser. */
export function loadArenas(): ArenaLayout[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const list = raw ? (JSON.parse(raw) as ArenaLayout[]) : [];
    return list.filter((l) => validate(l) === null);
  } catch {
    return [];
  }
}

function saveArenas(list: ArenaLayout[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(list));
}

/** A pinchable 3D card with text, lit while pointed at. Used for the few actions (try, save, back). */
export class Button {
  readonly mesh: Mesh;
  private canvas = document.createElement('canvas');
  private tex: CanvasTexture;
  private text = '';
  private lit = false;

  constructor(
    readonly id: string,
    readonly width: number,
    readonly height: number,
  ) {
    this.canvas.width = 256;
    this.canvas.height = Math.round((256 * height) / width);
    this.tex = new CanvasTexture(this.canvas);
    this.tex.colorSpace = SRGBColorSpace;
    this.mesh = new Mesh(new PlaneGeometry(width, height), new MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false }));
    this.mesh.name = `button-${id}`;
  }

  set(text: string, lit = this.lit) {
    if (text === this.text && lit === this.lit) return;
    this.text = text;
    this.lit = lit;
    const g = this.canvas.getContext('2d')!;
    const { width: w, height: h } = this.canvas;
    glass(g, w, h, lit ? '#ffd2a8' : ORANGE, lit ? 'rgba(255, 138, 42, 0.92)' : GLASS_LIGHT);
    g.fillStyle = TEXT;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let size = Math.round(h * 0.5);
    do g.font = `bold ${size--}px ${FONT}`;
    while (g.measureText(text).width > w - 16 && size > 10);
    g.fillText(text, w / 2, h / 2 + 1);
    this.tex.needsUpdate = true;
  }

  /** Re-renders only when the highlight state actually changes. */
  highlight(lit: boolean) {
    if (lit === this.lit) return;
    const t = this.text;
    this.text = '';
    this.set(t, lit);
  }
}

/** A small floating text tag (piece names, row names, the status line). */
export function tag(text: string, width: number, size = 40) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = TEXT;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let s = size;
  do g.font = `bold ${s--}px ${FONT}`;
  while (g.measureText(text).width > 248 && s > 10);
  g.shadowColor = 'rgba(0,0,0,0.9)';
  g.shadowBlur = 6;
  g.fillText(text, 128, 32);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return new Mesh(new PlaneGeometry(width, width / 4), new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
}

const STEEL = makeMatcap('metal', 0xc8ccd6);
const BRASS = makeMatcap('metal', 0xe2b866);
const THEME_COLOR: Record<Theme, number> = { forge: 0xff6a2a, stone: 0x8fb7c9, clockwork: 0xe2b866, ice: 0x9fe8ff, lava: 0xff2a0a, void: 0xb86cff };

/** A neutral layout used only to draw floor miniatures. */
const MINI: ArenaLayout = {
  name: 'mini',
  theme: 'forge',
  radius: 0.15,
  shape: 'circle',
  floor: 'bowl',
  depth: 0.011,
  wall: 'standard',
  pockets: [],
  rails: [],
  pillars: [],
  vortex: 0,
  spinner: 0,
  tilt: 0,
  shrink: false,
};

/** The little 3D model for a piece (about 2.5 cm). */
function pieceModel(p: Piece): Group {
  const g = new Group();
  const m = (geo: BufferGeometry, mat: MeshMatcapMaterial | MeshBasicMaterial) => {
    const mesh = new Mesh(geo, mat);
    g.add(mesh);
    return mesh;
  };
  const steel = new MeshMatcapMaterial({ matcap: STEEL });
  const brass = new MeshMatcapMaterial({ matcap: BRASS });
  const clay = (c: number) => new MeshMatcapMaterial({ matcap: makeMatcap('clay', c) });
  const glow = (c: number) => new MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false });
  switch (p.kind) {
    case 'pocket':
      m(new BoxGeometry(0.022, 0.008, 0.014), new MeshBasicMaterial({ color: 0x15110f }));
      m(new TorusGeometry(0.009, 0.0016, 6, 16, Math.PI).rotateX(-Math.PI / 2), glow(0xff5a28)).position.set(0, 0.005, -0.004);
      break;
    case 'rail':
      m(new TorusGeometry(0.014, 0.0025, 8, 24, Math.PI * 0.7).rotateX(Math.PI / 2), brass).position.y = 0.004;
      break;
    case 'pillar':
      m(new CylinderGeometry(0.005, 0.006, 0.022, 16), steel).position.y = 0.011;
      break;
    case 'pad':
      // A flat plate with a glowing chevron.
      m(new CylinderGeometry(0.011, 0.011, 0.003, 24), steel).position.y = 0.0015;
      m(new ConeGeometry(0.007, 0.012, 3).rotateX(Math.PI / 2).scale(1, 0.25, 1), glow(0x4ad8ff)).position.y = 0.004;
      break;
    case 'wild': {
      // A crater in miniature: the stepping piece for the wild floors.
      m(new TorusGeometry(0.009, 0.0035, 8, 24).rotateX(Math.PI / 2), clay(0xd8c9b0)).position.y = 0.004;
      m(new CircleGeometry(0.012, 24).rotateX(-Math.PI / 2), clay(0x8a7a62)).position.y = 0.0005;
      break;
    }
    case 'bumper':
      m(new CylinderGeometry(0.006, 0.007, 0.018, 16), steel).position.y = 0.009;
      m(new TorusGeometry(0.0065, 0.0018, 6, 20).rotateX(Math.PI / 2), glow(0xff3b5c)).position.y = 0.016;
      break;
    case 'shape': {
      const plate = p.value === 'square' ? new BoxGeometry(0.022, 0.004, 0.022) : new CylinderGeometry(0.012, 0.012, 0.004, 28);
      const mesh = m(plate, clay(0xe9dfd0));
      if (p.value === 'oval') mesh.scale.z = 0.7;
      mesh.position.y = 0.002;
      break;
    }
    case 'floor': {
      // A miniature of the floor profile, its relief exaggerated so each reads without a name:
      // a deep bowl, a thin flat plate, a dome, a sharp ridge, two steps.
      const probe = new Arena({ ...MINI, floor: p.value, depth: FLOOR_DEPTH[p.value] });
      // Flat plays as a very shallow dish; its piece is a plate with only a lip, so it never reads as the bowl.
      const hs = Array.from({ length: 25 }, (_, i) => (p.value === 'flat' ? (i > 21 ? (i - 21) / 3 : 0) : probe.floorHeight(i / 24)));
      const lo = Math.min(...hs);
      const span = Math.max(...hs) - lo;
      const R = 0.0125;
      const pts: Vector2[] = [new Vector2(0, 0), new Vector2(R, 0)];
      for (let i = 24; i >= 0; i--) pts.push(new Vector2(R * (i / 24), 0.0015 + (span > 1e-6 ? ((hs[i] - lo) / span) * 0.011 : 0)));
      m(new LatheGeometry(pts, 28), clay(0xd8c9b0));
      break;
    }
    case 'wall': {
      // A wall ring: tap or drop it to step low, standard, high, none.
      m(new CylinderGeometry(0.012, 0.012, 0.009, 28, 1, true), steel).position.y = 0.0045;
      m(new TorusGeometry(0.012, 0.0012, 6, 28).rotateX(Math.PI / 2), brass).position.y = 0.009;
      m(new CircleGeometry(0.0115, 24).rotateX(-Math.PI / 2), clay(0xe9dfd0)).position.y = 0.0005;
      break;
    }
    case 'theme':
      // One gem per theme in a cluster: tap or drop it to step to the next theme.
      THEMES.forEach((t, i) => {
        const a = (i / THEMES.length) * Math.PI * 2;
        m(new OctahedronGeometry(0.0055), new MeshMatcapMaterial({ matcap: makeMatcap('metal', THEME_COLOR[t]) })).position.set(Math.cos(a) * 0.006, 0.007, Math.sin(a) * 0.006);
      });
      break;
    case 'extra': {
      const c = { vortex: 0x8fe8ff, spinner: 0xe2b866, tilt: 0xc8ccd6, shrink: 0xff4a12, orbit: 0xc8ccd6 }[p.value];
      if (p.value === 'tilt') m(new SphereGeometry(0.012, 20, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), steel).position.y = 0.012;
      else if (p.value === 'orbit') {
        m(new TorusGeometry(0.011, 0.0012, 6, 28).rotateX(Math.PI / 2), brass).position.y = 0.002;
        for (let i = 0; i < 3; i++) m(new CylinderGeometry(0.0028, 0.0028, 0.012, 10), steel).position.set(Math.cos((i * 2 * Math.PI) / 3) * 0.011, 0.006, Math.sin((i * 2 * Math.PI) / 3) * 0.011);
      } else if (p.value === 'shrink') m(new TorusGeometry(0.01, 0.0025, 8, 24).rotateX(Math.PI / 2), glow(c)).position.y = 0.003;
      else m(new CylinderGeometry(0.011, 0.011, 0.003, 24), new MeshMatcapMaterial({ matcap: makeMatcap('metal', c) })).position.y = 0.0015;
      break;
    }
  }
  return g;
}

function pieceName(p: Piece, draft?: ArenaLayout): string {
  const cap = (t: string) => t[0].toUpperCase() + t.slice(1);
  if (p.kind === 'pocket') return 'Slag pit';
  if (p.kind === 'rail') return 'Kick rail';
  // The stepping pieces say what the draft has now.
  if (p.kind === 'wall') return draft ? `Wall: ${draft.wall}` : 'Wall';
  if (p.kind === 'theme') return draft ? `Theme: ${draft.theme}` : 'Theme';
  if (p.kind === 'wild') return draft && WILD.includes(draft.floor) ? `Wild floor: ${draft.floor}` : 'Wild floor';
  if (p.kind === 'pad') return 'Boost pad';
  if (!('value' in p)) return cap(p.kind);
  if (p.kind === 'extra') return { vortex: 'Vortex', spinner: 'Turntable', tilt: 'Rocking', shrink: 'Embers', orbit: 'Circling pillars' }[p.value];
  return cap(p.value);
}

/** The tray: rows of pieces by category. */
/** The drawers: at most five pieces each. Wall and Theme are one piece each that steps on a tap. */
const TRAY: [string, Piece[]][] = [
  ['Pieces', [{ kind: 'pocket' }, { kind: 'rail' }, { kind: 'pillar' }, { kind: 'bumper' }, { kind: 'pad' }]],
  ['Floor', [...(['bowl', 'flat', 'hill', 'ridge'] as Floor[]).map((value) => ({ kind: 'floor' as const, value })), { kind: 'wild' }]],
  ['Form', [...(['circle', 'oval', 'square'] as Shape[]).map((value) => ({ kind: 'shape' as const, value })), { kind: 'wall' }, { kind: 'theme' }]],
  ['Extras', (['vortex', 'spinner', 'tilt', 'shrink', 'orbit'] as const).map((value) => ({ kind: 'extra', value }))],
];
const WALLS: Wall[] = ['low', 'standard', 'high', 'none'];
const THEMES: Theme[] = ['forge', 'stone', 'clockwork', 'ice', 'lava', 'void'];
/** Pieces that land somewhere on the arena; the others change the whole arena, so a tap on the rail applies them. */
const PLACED = new Set(['pocket', 'rail', 'pillar', 'bumper', 'pad']);
/** Arena-local layout of the drafting table (the arena center is the origin, +Z toward the player). */
/** The drawer tabs in a row on the near rim (as in the forge), and the actions on the side rims. */
const PLATES = [...TRAY.map(([label]) => label.toUpperCase()), 'ARENAS', 'BACK', 'TRY', 'SAVE'];
/** The last drawer holds the arenas, built-in and yours, five to a page. */
const ARENA_TAB = TRAY.length;
const DRAWERS = TRAY.length + 1;
const ARENAS_PER_PAGE = 5;
/** Five tabs share the forge's tab line, a little closer together. */
const PLATE_GAP = WORKSHOP_TAB_GAP;
const PLATE_Z = TAB_LINE.z;
const PLATE_Y = TAB_LINE.y;
const PLATE_W = 0.054;
const PLATE_H = 0.024;
/** Back on the left rim, Try and Save on the right; Save's plate sits in front of its stamp slot. */
const SAVE_AT = new Vector3(0.205, -0.006, 0.0);
const ACTIONS_AT = [new Vector3(-0.205, 0.004, 0.1), new Vector3(0.205, 0.004, 0.1), new Vector3(0.215, 0.004, 0.045)];
/** The tool rail across the near rim, no wider than the arena: its pieces this far apart, this much larger than life. */
const RAIL_Z = RAIL.z;
const RAIL_Y = RAIL.y;
const RAIL_W = 0.27;
const ITEM_GAP = 0.046;
const ITEM_SCALE = 0.95;
/** The check's plate stands on the far rim, past the largest arena. */
const PLATE_AT = new Vector3(0, 0.1, -0.23);
/** The tools fold out (and back for Try it) in this long (s). */
const FOLD_TIME = 0.6;

interface Slot {
  piece: Piece;
  /** Index of its drawer. */
  tab: number;
  model: Group;
  home: Vector3;
}

/** What a pinch is holding right now. */
type Held =
  | { mode: 'piece'; piece: Piece; model: Group; hand: HandState; from: 'tray' | 'arena'; start: number; startAt: Vector3; pocketPoints: number }
  | { mode: 'resize'; hand: HandState };

export interface BuilderHooks {
  /** The draft changed: show it. */
  preview(layout: ArenaLayout): void;
  /** Watch two AI tops fight in the draft. */
  tryIt(layout: ArenaLayout): void;
  /** Play the saved arena now. */
  play(layout: ArenaLayout): void;
  /** Leave the workshop without playing. */
  exit(): void;
  /** Where a hand points at the arena (arena-local), including just past the rim. */
  arenaPoint(h: HandState): { x: number; z: number } | null;
  /** World point to arena-local (writes into and returns out). */
  toLocal(world: Vector3, out: Vector3): Vector3;
  floorHeight(n: number): number;
  /** Every arena on offer, in order: built-in first, then yours. */
  arenas(): { layout: ArenaLayout; lock: string | null; own: boolean; current: boolean }[];
  /** Pin this arena for every match (-1: back to the rotation). */
  selectArena(index: number): void;
  /** True while an arena is pinned (otherwise the rotation picks). */
  pinned(): boolean;
  /** One of your arenas was thrown away (already gone from storage). */
  removedArena(name: string): void;
}

/**
 * The arena workshop as a drafting table: the arena itself is the canvas. Drawer tabs and the
 * Back, Try and Save plates follow the near rim's arc, the open drawer's pieces hang on a rail
 * across the near rim, blueprint lines and brass knobs mark the draft, and a plate on the far rim
 * shows how the draft plays (checked in a worker after every change).
 */
export class Builder {
  /** Lives in arena-local space (a child of the arena root). */
  readonly root = new Group();
  /** The arena shows shrunk by this much (a big arena at home size); arena-point hooks give true units. */
  viewScale = 1;

  /** A hand is pulling the rim to resize the draft. */
  get resizing() {
    return this.held?.mode === 'resize';
  }
  draft!: ArenaLayout;
  /** 0 folded .. 1 open. */
  opened = 0;
  private folding: 'in' | 'out' | null = null;
  /** What happens once the tools have folded away. */
  private afterFold: (() => void) | null = null;
  private tools = new Group();
  private items = new Group();
  private slots: Slot[] = [];
  private names: Mesh;
  private namesCanvas = document.createElement('canvas');
  private namesTex: CanvasTexture;
  private namesKey = '';
  private plates = new RimTabs(PLATES.slice(0, DRAWERS), rowSpots(DRAWERS, PLATE_GAP, PLATE_Z, PLATE_Y), PLATE_W, PLATE_H);
  private actions = new RimTabs(
    PLATES.slice(DRAWERS),
    ACTIONS_AT.map((at) => ({ at, yaw: Math.atan2(-at.x, 0.32 - at.z) })),
    0.05,
    PLATE_H,
    0.9,
  );
  /** Save: a stamp slot set into the right rim; pinch it to save and play. */
  private saveSlot = rimSlot();
  private plateGroup = new Group();
  private dial = new DialPlate();
  private guides = new Group();
  private tab = 0;
  private arenaPage = 0;
  private tabT = 1;
  private held: Held | null = null;
  private message = '';
  private hinted: string | null = null;
  private time = 0;
  /** The draft's check: the worker, the latest report, and whether a newer draft waits. */
  private worker: Worker | null = null;
  private checkId = 0;
  private checking = false;
  private checkAgain = false;
  private report: ArenaReport | null = null;
  private readonly p = new Vector3();
  private readonly q = new Vector3();
  private readonly hit = new Vector3();
  private logged = true;

  constructor(private readonly hooks: BuilderHooks) {
    this.root.name = 'arena-workshop';
    // The rail: a brass bar across the near rim; the open drawer's pieces stand on it, their
    // names engraved on a strip below.
    const bar = new Mesh(new CylinderGeometry(0.003, 0.003, RAIL_W, 12).rotateZ(Math.PI / 2), new MeshMatcapMaterial({ matcap: BRASS }));
    bar.position.set(0, RAIL_Y - 0.004, RAIL_Z);
    this.namesCanvas.width = 1400;
    this.namesCanvas.height = 100;
    this.namesTex = new CanvasTexture(this.namesCanvas);
    this.namesTex.colorSpace = SRGBColorSpace;
    this.names = new Mesh(new PlaneGeometry(RAIL_W, 0.012), new MeshBasicMaterial({ map: this.namesTex, transparent: true, depthWrite: false }));
    this.names.position.set(0, RAIL_Y - 0.021, RAIL_Z + 0.012);
    this.names.rotation.x = -0.7;
    this.tools.add(bar, this.names, this.items);
    TRAY.forEach(([, pieces], t) => {
      pieces.forEach((piece, c) => {
        const home = new Vector3((c - (pieces.length - 1) / 2) * ITEM_GAP, RAIL_Y, RAIL_Z);
        const model = pieceModel(piece);
        // Tipped toward the eyes so the top of each piece shows; floors nearly side-on, so their profile does.
        model.rotation.x = piece.kind === 'floor' ? 0.2 : 0.6;
        model.position.copy(home);
        this.items.add(model);
        this.slots.push({ piece, tab: t, model, home });
      });
    });
    this.saveSlot.position.copy(SAVE_AT);
    this.plateGroup.add(this.plates.mesh, this.actions.mesh, this.saveSlot);
    this.dial.mesh.name = 'workshop-check';
    this.dial.mesh.position.copy(PLATE_AT);
    this.dial.mesh.rotation.x = -0.3;
    this.root.add(this.tools, this.plateGroup, this.dial.mesh, this.guides);
    this.showTab(0, false);
    this.root.visible = false;
  }

  open(from: ArenaLayout) {
    this.draft = cloneLayout(from);
    this.draft.name = 'My Arena';
    // A built-in arena's rule does not describe the player's own.
    delete this.draft.rule;
    this.root.visible = true;
    this.held = null;
    this.tools.visible = true;
    this.opened = 0;
    this.fold('out');
    playMachine();
    this.say('Pinch a piece and drop it on the arena');
    // The drawers open where they were left, the arenas at their first page.
    this.arenaPage = 0;
    this.showTab(this.tab, false);
    this.hooks.preview(this.draft);
    this.rebuildGuides();
    this.drawNames();
    this.check();
    this.logged = false;
  }

  close() {
    this.root.visible = false;
    if (this.held?.mode === 'piece') this.root.remove(this.held.model);
    this.held = null;
    this.folding = null;
    this.afterFold = null;
  }

  /** Folds the tools away (then runs `then`) or back out. */
  fold(dir: 'in' | 'out', then: (() => void) | null = null) {
    this.folding = dir;
    this.afterFold = then;
    if (dir === 'out') this.root.visible = true;
  }

  /** One frame of the workshop for all pointers. */
  update(pointers: HandState[], dt: number) {
    this.time += dt;
    this.animate(dt);
    if (import.meta.env.DEV && !this.logged && this.opened >= 1) {
      // Piece and plate positions, for driving the workshop from the emulator CLI.
      this.logged = true;
      this.root.updateWorldMatrix(true, true);
      const fmt = (v: Vector3) => v.toArray().map((x) => x.toFixed(3)).join(',');
      console.log(`[BUILD] ${this.slots.filter((s) => s.tab === this.tab).map((s) => `${pieceName(s.piece)}@${fmt(s.model.getWorldPosition(new Vector3()))}`).join(' ')} ${PLATES.map((l, i) => `${l.toLowerCase()}@${fmt(this.root.localToWorld([...this.plates.spots, ...this.actions.spots][i].at.clone()))}`).join(' ')} save@${fmt(this.root.localToWorld(SAVE_AT.clone()))}`);
    }
    if (this.opened < 1 || this.folding) return;
    if (this.held) {
      this.updateHeld();
      return;
    }
    // Hover feedback: pieces under a pointer lift and turn, plates light up.
    let hovered: Slot | null = null;
    let hoveredPlate = -1;
    for (const h of pointers) {
      if (!h.tracked) continue;
      hovered ??= this.slotUnder(h);
      if (hoveredPlate < 0) hoveredPlate = this.plateUnder(h);
    }
    this.tabT += dt;
    const shown = this.slots.filter((s) => s.tab === this.tab);
    for (const s of shown) {
      const on = s === hovered;
      const pop = popIn(this.tabT, shown.indexOf(s));
      s.model.position.set(s.home.x, s.home.y + (on ? 0.008 : 0) - 0.015 * (1 - pop), s.home.z);
      s.model.rotation.y = on ? this.time * 2 : 0;
      s.model.scale.setScalar(ITEM_SCALE * pop * (on ? 1.2 : 1));
    }
    this.plates.draw((i) => ({ on: i === this.tab, hover: i === hoveredPlate }));
    this.actions.draw((i) => ({ hover: i + DRAWERS === hoveredPlate || (i === 2 && hoveredPlate === PLATES.length), hot: i > 0 }));
    this.saveSlot.scale.setScalar(hoveredPlate >= PLATES.length - 1 ? 1.15 : 1);
    this.hint(hovered ? this.nameOf(hovered.piece) : null);

    // A new pinch: a plate, a rail piece, a piece on the arena, or the rim to resize. A hand
    // touching a plate or piece goes first, so a ray or the dev gaze can't take its pinch.
    for (const touchOnly of [true, false]) {
      for (const h of pointers) {
        if (!h.tracked || !h.justPinched) continue;
        const plate = this.plateUnder(h, touchOnly);
        if (plate >= 0) return this.press(plate);
        const slot = this.slotUnder(h, touchOnly);
        if (slot) {
          if (slot.piece.kind === 'arena' && this.hooks.arenas()[slot.piece.index]?.lock) return this.reject(`Locked: ${this.hooks.arenas()[slot.piece.index].lock}`);
          return this.grab(slot.piece, h, 'tray', 2);
        }
        if (touchOnly) continue;
        const at = this.hooks.arenaPoint(h);
        if (at && this.pickFromArena(at.x, at.z, h)) return;
        if (at && this.isRim(at.x, at.z)) {
          this.held = { mode: 'resize', hand: h };
          this.say('Pull the rim out or in to resize');
          return;
        }
      }
    }
  }

  /** The transformation: plates and rail slide out of the near rim, the plate rises, the lines draw in. */
  private animate(dt: number) {
    if (this.folding === 'out') {
      this.opened = Math.min(1, this.opened + dt / FOLD_TIME);
      if (this.opened >= 1) this.folding = null;
    } else if (this.folding === 'in') {
      this.opened = Math.max(0, this.opened - dt / (FOLD_TIME / 2));
      if (this.opened <= 0) {
        this.folding = null;
        const then = this.afterFold;
        this.afterFold = null;
        then?.();
      }
    }
    const ease = (u: number) => 1 - (1 - Math.min(1, Math.max(0, u))) ** 3;
    const k = ease(this.opened);
    this.plateGroup.position.set(0, -0.02 * (1 - k), -0.03 * (1 - k));
    this.plateGroup.visible = k > 0.01;
    this.tools.position.y = -0.06 * (1 - ease((this.opened - 0.3) / 0.7));
    this.items.visible = this.opened > 0.3;
    this.dial.mesh.position.y = PLATE_AT.y - 0.08 * (1 - k);
    this.dial.mesh.visible = k > 0.01;
    const v = this.viewScale;
    this.guides.scale.set(Math.max(0.001, k) * v, v, Math.max(0.001, k) * v);
    this.guides.visible = k > 0.01;
  }

  private grab(piece: Piece, hand: HandState, from: 'tray' | 'arena', pocketPoints: number) {
    const model = pieceModel(piece);
    model.scale.setScalar(1.4);
    this.root.add(model);
    this.held = { mode: 'piece', piece, model, hand, from, start: this.time, startAt: hand.pinch.clone(), pocketPoints };
    // The rail lifts away while a piece is carried, so the near rim stays in view.
    this.tools.visible = false;
    playPick();
    this.say(piece.kind === 'arena' ? `${this.nameOf(piece)}: let go to play it${this.hooks.arenas()[piece.index]?.own ? ', or drop it off the arena to throw it away' : ''}` : `${pieceName(piece)}: drop it on the arena${from === 'arena' ? ', or off it to remove' : ''}`);
  }

  /** While holding: the piece follows the pointer over the arena; letting go drops it. */
  private updateHeld() {
    const held = this.held!;
    const h = held.hand;
    if (held.mode === 'resize') {
      const at = this.hooks.arenaPoint(h);
      if (at) {
        const n = normRadius(this.draft, at.x, at.z);
        const radius = Math.round(Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, this.draft.radius * n)) * 100) / 100;
        if (radius !== this.draft.radius) {
          this.draft.radius = radius;
          this.say(`${Math.round(radius * 200 * ARENA_SCALE)} cm across`);
          this.hooks.preview(this.draft);
        }
      }
      if (!h.pinching || !h.tracked) {
        this.held = null;
        this.rebuildGuides();
        playPlace();
        this.changed();
      }
      return;
    }
    const at = this.hooks.arenaPoint(h);
    const model = held.model;
    if (at) {
      // Over the arena: the piece sits where it would land (rim pieces snap to the rim).
      let { x, z } = at;
      if (held.piece.kind === 'pocket' || held.piece.kind === 'rail') {
        const a = Math.atan2(z, x);
        const r = rimRadius(this.draft, a) - 0.006;
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
        model.rotation.y = -a + Math.PI / 2;
      }
      const k = this.viewScale;
      model.position.set(x * k, this.hooks.floorHeight(Math.min(1, normRadius(this.draft, x, z))) * k + 0.012 + 0.003 * Math.sin(this.time * 10), z * k);
    } else if (h.pinch.y > -50) {
      // Off the arena: it follows the pinch.
      this.hooks.toLocal(h.pinch, model.position);
    } else {
      // A gaze pointer has no hand position: hang the piece along the ray.
      this.hooks.toLocal(this.q.copy(h.rayDir).multiplyScalar(0.45).add(h.rayOrigin), model.position);
    }
    if (h.pinching && h.tracked) return;

    // Released.
    this.held = null;
    this.tools.visible = true;
    this.root.remove(model);
    const tapped = this.time - held.start < TAP_TIME && h.pinch.distanceTo(held.startAt) < TAP_MOVE;
    if (held.from === 'tray' && tapped && !PLACED.has(held.piece.kind)) return this.place(held.piece, 0, 0, 2);
    if (!at) {
      if (held.piece.kind === 'arena' && !tapped) return this.removeArena(held.piece.index);
      if (held.from === 'arena') {
        playRemove();
        this.changed(`${pieceName(held.piece)} removed`);
      }
      return;
    }
    this.place(held.piece, at.x, at.z, held.pocketPoints);
  }

  /** Applies a dropped piece at an arena-local point. */
  private place(piece: Piece, x: number, z: number, pocketPoints: number) {
    const L = this.draft;
    const a = Math.atan2(z, x);
    const n = normRadius(L, x, z);
    switch (piece.kind) {
      case 'pocket':
        if (n < 0.6) return this.reject('Drop slag pits near the rim');
        L.pockets = L.pockets.filter((p) => angleGap(p.angle, a) > p.half + 0.2);
        L.rails = L.rails.filter((r) => angleGap(r.angle, a) > r.half + 0.2);
        L.pockets.push({ angle: a, half: 0.2, points: pocketPoints });
        break;
      case 'rail':
        if (n < 0.6) return this.reject('Drop rails near the rim');
        if (L.pockets.some((p) => angleGap(p.angle, a) < p.half + 0.4)) return this.reject('Too close to a slag pit');
        L.rails = L.rails.filter((r) => angleGap(r.angle, a) > r.half + 0.3);
        L.rails.push({ angle: a, half: 0.4 });
        break;
      case 'pillar':
      case 'bumper':
        if (n > 0.85) return this.reject('Drop it on the floor, away from the rim');
        L.pillars.push({ x: x / L.radius, z: z / L.radius, r: 0.009, bumper: piece.kind === 'bumper' });
        break;
      case 'pad':
        if (n > 0.85) return this.reject('Drop it on the floor, away from the rim');
        // It points along the rim, so a top running round is flung faster on its way.
        (L.pads ??= []).push({ x: x / L.radius, z: z / L.radius, angle: a + Math.PI / 2 });
        break;
      case 'wild': {
        const i = WILD.indexOf(L.floor);
        L.floor = WILD[(i + 1) % WILD.length];
        L.depth = FLOOR_DEPTH[L.floor];
        break;
      }
      case 'shape':
        L.shape = piece.value;
        break;
      case 'floor':
        L.floor = piece.value;
        L.depth = FLOOR_DEPTH[piece.value];
        break;
      case 'wall':
        L.wall = WALLS[(WALLS.indexOf(L.wall) + 1) % WALLS.length];
        break;
      case 'theme':
        L.theme = THEMES[(THEMES.indexOf(L.theme) + 1) % THEMES.length];
        break;
      case 'arena':
        return this.useArena(piece.index);
      case 'extra':
        if (piece.value === 'vortex') L.vortex = L.vortex > 0 ? 0 : 0.6;
        if (piece.value === 'spinner') L.spinner = L.spinner > 0 ? 0 : 6;
        if (piece.value === 'tilt') L.tilt = L.tilt > 0 ? 0 : 0.06;
        if (piece.value === 'shrink') L.shrink = !L.shrink;
        if (piece.value === 'orbit') L.orbit = L.orbit ? 0 : 0.7;
        break;
    }
    playPlace();
    this.changed();
  }

  /** Pinching a piece already on the arena picks it up (it leaves the draft until dropped). */
  private pickFromArena(x: number, z: number, h: HandState): boolean {
    const L = this.draft;
    const a = Math.atan2(z, x);
    for (const p of L.pillars) {
      if (Math.hypot(p.x * L.radius - x, p.z * L.radius - z) < p.r + 0.015) {
        L.pillars.splice(L.pillars.indexOf(p), 1);
        this.hooks.preview(L);
        this.grab({ kind: p.bumper ? 'bumper' : 'pillar' }, h, 'arena', 2);
        return true;
      }
    }
    for (const p of L.pads ?? []) {
      if (Math.hypot(p.x * L.radius - x, p.z * L.radius - z) < 0.02) {
        L.pads!.splice(L.pads!.indexOf(p), 1);
        this.hooks.preview(L);
        this.grab({ kind: 'pad' }, h, 'arena', 2);
        return true;
      }
    }
    if (normRadius(L, x, z) < 0.8) return false;
    for (const p of L.pockets) {
      if (angleGap(p.angle, a) < p.half) {
        L.pockets.splice(L.pockets.indexOf(p), 1);
        this.hooks.preview(L);
        this.grab({ kind: 'pocket' }, h, 'arena', p.points);
        return true;
      }
    }
    for (const r of L.rails) {
      if (angleGap(r.angle, a) < r.half) {
        L.rails.splice(L.rails.indexOf(r), 1);
        this.hooks.preview(L);
        this.grab({ kind: 'rail' }, h, 'arena', 2);
        return true;
      }
    }
    return false;
  }

  private isRim(x: number, z: number) {
    const n = normRadius(this.draft, x, z);
    return n > 0.88 && n < 1.25;
  }

  private slotUnder(h: HandState, touchOnly = false): Slot | null {
    let best: Slot | null = null;
    let bestD = Infinity;
    for (const s of this.slots) {
      if (s.tab !== this.tab) continue;
      s.model.getWorldPosition(this.p);
      const d = this.distance(h, this.p, GRAB_NEAR, touchOnly ? 0 : GRAB_RAY);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  /** The plate under a pointer (index into PLATES), or -1. */
  private plateUnder(h: HandState, touchOnly = false): number {
    let best = -1;
    let bestD = Infinity;
    [...this.plates.spots, ...this.actions.spots, { at: SAVE_AT, yaw: 0 }].forEach((s, i) => {
      // The slot itself counts as the Save plate.
      this.root.localToWorld(this.p.copy(s.at));
      const d = this.distance(h, this.p, GRAB_NEAR * 1.6, touchOnly ? 0 : GRAB_RAY * 1.6);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  /** Near pinch distance, or ray distance (+ a small bias), or Infinity when out of reach. */
  private distance(h: HandState, point: Vector3, near: number, ray: number) {
    const d = h.pinch.distanceTo(point);
    if (d < near) return d;
    if (!h.hasRay) return Infinity;
    const t = this.q.copy(point).sub(h.rayOrigin).dot(h.rayDir);
    if (t <= 0) return Infinity;
    const off = this.hit.copy(h.rayDir).multiplyScalar(t).add(h.rayOrigin).distanceTo(point);
    return off < ray ? off + 0.05 : Infinity;
  }

  private press(i: number) {
    if (i < DRAWERS) {
      if (i !== this.tab) this.showTab(i, true);
      else if (i === ARENA_TAB) {
        // The open arenas drawer again: its next page.
        this.arenaPage++;
        this.showTab(i, true);
      }
      return;
    }
    if (PLATES[i] === 'BACK') {
      playDrawer();
      return this.fold('in', () => this.hooks.exit());
    }
    // TRY, or past the plates: the save slot.
    const problem = validate(this.draft);
    if (problem) return this.reject(problem);
    if (PLATES[i] === 'TRY') {
      playPick();
      // The tools fold away so the round is in plain view; the match system unfolds them after.
      return this.fold('in', () => this.hooks.tryIt(this.draft));
    }
    const saved = loadArenas();
    const layout = cloneLayout(this.draft);
    // The next free number, so a name never repeats after one is thrown away.
    const used = saved.map((a) => Number(/^My Arena (\d+)$/.exec(a.name)?.[1] ?? 0));
    layout.name = `My Arena ${Math.max(0, ...used) + 1}`;
    saved.push(layout);
    saveArenas(saved);
    playPlace();
    this.fold('in', () => this.hooks.play(layout));
  }

  private changed(text?: string) {
    this.say(text ?? validate(this.draft) ?? 'Pinch TRY to watch a round');
    this.hooks.preview(this.draft);
    this.rebuildGuides();
    this.drawNames();
    this.check();
    const L = this.draft;
    if (import.meta.env.DEV) console.log(`[BUILD] draft ${L.shape} ${L.floor} ${L.wall} ${L.theme} r=${L.radius} pockets=${L.pockets.length} rails=${L.rails.length} pillars=${L.pillars.length}`);
  }

  private reject(text: string) {
    playRemove();
    this.say(text);
    this.hooks.preview(this.draft);
  }

  /** The message line on the far plate (the piece pointed at shows instead while pointed at). */
  private say(text: string) {
    this.message = text;
    this.drawDial();
  }

  private hint(text: string | null) {
    if (text === this.hinted) return;
    this.hinted = text;
    this.drawDial();
  }

  /** The far plate: the draft's name and form, and three dials from the latest check. */
  private drawDial() {
    const L = this.draft;
    if (!L) return;
    const r = this.report;
    const spread = r ? Math.max(...Object.values(r.typeWin)) - Math.min(...Object.values(r.typeWin)) : 0;
    const form = `${pieceName({ kind: 'shape', value: L.shape })} · ${pieceName({ kind: 'floor', value: L.floor })} · ${L.wall} wall · ${L.pockets.length} pits`;
    this.dial.draw(
      L.name,
      this.checking ? `${form} · checking` : form,
      [
        { label: r ? `ROUND ${r.median.toFixed(0)} S` : 'ROUND', value: r ? (r.median / 30) * 100 : 0 },
        { label: r ? `KO ${Math.round(r.knockout * 100)}%` : 'KO', value: r ? r.knockout * 100 : 0 },
        { label: r ? `BALANCE ${Math.round((1 - spread) * 100)}` : 'BALANCE', value: r ? (1 - spread) * 100 : 0 },
      ],
      this.hinted ?? (r && arenaWarning(r)) ?? this.message,
      r && arenaWarning(r) ? '#ff8a5a' : undefined,
    );
  }

  /** Checks the draft in the worker; a change while it runs is checked when it answers. */
  private check() {
    if (this.checking) {
      this.checkAgain = true;
      return;
    }
    if (!this.worker) {
      this.worker = new Worker(new URL('./check-worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent<{ id: number; report: ArenaReport }>) => {
        this.checking = false;
        if (e.data.id === this.checkId) this.report = e.data.report;
        if (this.checkAgain) {
          this.checkAgain = false;
          this.check();
        } else this.drawDial();
      };
    }
    this.checking = true;
    this.worker.postMessage({ id: ++this.checkId, layout: cloneLayout(this.draft) });
    this.drawDial();
  }

  /** Blueprint lines over the draft's floor (rings and spokes) and brass knobs on its rim. */
  private rebuildGuides() {
    for (const c of [...this.guides.children]) {
      c.removeFromParent();
      (c as Mesh).geometry.dispose();
    }
    const L = this.draft;
    const pts: number[] = [];
    const at = (a: number, n: number) => {
      const r = rimRadius(L, a) * n;
      pts.push(Math.cos(a) * r, this.hooks.floorHeight(n) + 0.0015, Math.sin(a) * r);
    };
    for (const n of [0.25, 0.5, 0.75, 0.97]) {
      for (let i = 0; i < 48; i++) {
        at((i / 48) * Math.PI * 2, n);
        at(((i + 1) / 48) * Math.PI * 2, n);
      }
    }
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      for (let i = 0; i < 8; i++) {
        at(a, 0.12 + (0.85 * i) / 8);
        at(a, 0.12 + (0.85 * (i + 1)) / 8);
      }
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(pts, 3));
    this.guides.add(new LineSegments(geo, GUIDE_LINE));
    // Four brass knobs on the rim say it can be pulled.
    const knobs: BufferGeometry[] = [];
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      const r = rimRadius(L, a) + 0.008;
      knobs.push(new SphereGeometry(0.005, 12, 8).translate(Math.cos(a) * r, 0.012, Math.sin(a) * r));
    }
    this.guides.add(new Mesh(mergePlain(knobs), KNOB));
  }

  /** Switches the rail to a drawer; its pieces pop up one after another. */
  private showTab(t: number, sound: boolean) {
    if (t === ARENA_TAB) this.fillArenas();
    this.tab = t;
    this.tabT = 0;
    for (const s of this.slots) s.model.visible = s.tab === t;
    this.drawNames();
    if (sound) playDrawer();
    this.logged = false;
  }

  /** A piece's name on the rail; an arena shows its own name, or how it is earned while locked. */
  private nameOf(p: Piece): string {
    if (p.kind !== 'arena') return pieceName(p, this.draft);
    if (p.index < 0) return this.hooks.pinned() ? 'Rotation' : 'Rotation (on)';
    const a = this.hooks.arenas()[p.index];
    return a ? (a.lock ? `${a.layout.name} · ${a.lock}` : a.layout.name) : '';
  }

  /** The arenas drawer: this page of arena miniatures on the rail (locked ones dark). */
  private fillArenas() {
    for (const s of this.slots.filter((x) => x.tab === ARENA_TAB)) {
      s.model.removeFromParent();
      s.model.traverse((o) => (o as Mesh).geometry?.dispose());
    }
    this.slots = this.slots.filter((x) => x.tab !== ARENA_TAB);
    // The rotation comes first: index -1.
    const list = [null, ...this.hooks.arenas()];
    const pages = Math.max(1, Math.ceil(list.length / ARENAS_PER_PAGE));
    const page = ((this.arenaPage % pages) + pages) % pages;
    const shown = list.slice(page * ARENAS_PER_PAGE, (page + 1) * ARENAS_PER_PAGE);
    shown.forEach((a, c) => {
      const index = page * ARENAS_PER_PAGE + c - 1;
      const home = new Vector3((c - (shown.length - 1) / 2) * ITEM_GAP, RAIL_Y, RAIL_Z);
      const model = new Group();
      const mini = a ? miniArena(a.layout, a.current) : rotationModel(!this.hooks.pinned());
      mini.scale.setScalar(0.4);
      if (a?.lock) mini.traverse((o) => ((o as Mesh).material as MeshBasicMaterial | undefined)?.color?.setHex(0x1c2230));
      model.add(mini);
      model.rotation.x = 0.6;
      model.position.copy(home);
      model.visible = false;
      this.items.add(model);
      this.slots.push({ piece: { kind: 'arena', index }, tab: ARENA_TAB, model, home });
    });
    if (pages > 1) this.say(`Arenas ${page + 1} of ${pages}: pinch ARENAS again for more`);
    this.namesKey = '';
  }

  /** Plays this arena from now on, and starts the draft from it. */
  private useArena(index: number) {
    if (index < 0) {
      this.hooks.selectArena(-1);
      playPlace();
      this.say('Rotation: each match picks its arena, new ones first');
      this.fillArenas();
      this.showTab(ARENA_TAB, false);
      return;
    }
    const a = this.hooks.arenas()[index];
    if (!a) return;
    this.hooks.selectArena(index);
    this.draft = cloneLayout(a.layout);
    this.draft.name = 'My Arena';
    delete this.draft.rule;
    playPlace();
    this.changed(`${a.layout.name}: pinned for every match (Rotation undoes it)`);
    if (import.meta.env.DEV) console.log(`[BUILD] selected ${a.layout.name}`);
    this.fillArenas();
    this.showTab(ARENA_TAB, false);
  }

  /** Throws one of your arenas away (built-in ones stay). */
  private removeArena(index: number) {
    const a = this.hooks.arenas()[index];
    if (!a?.own) {
      playRemove();
      this.say('Built-in arenas stay');
      return;
    }
    saveArenas(loadArenas().filter((x) => x.name !== a.layout.name));
    this.hooks.removedArena(a.layout.name);
    playRemove();
    this.say(`${a.layout.name} thrown away`);
    if (import.meta.env.DEV) console.log(`[BUILD] removed ${a.layout.name}`);
    this.fillArenas();
    this.showTab(ARENA_TAB, false);
  }

  /** The names under the rail's pieces, engraved on one strip. */
  private drawNames() {
    const shown = this.slots.filter((s) => s.tab === this.tab);
    const key = shown.map((s) => this.nameOf(s.piece)).join('|');
    if (key === this.namesKey) return;
    this.namesKey = key;
    const g = this.namesCanvas.getContext('2d')!;
    const W = this.namesCanvas.width;
    const H = this.namesCanvas.height;
    metalPlate(g, W, H);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const k = W / RAIL_W;
    for (const s of shown) {
      // Each name fits the space under its own piece.
      const name = this.nameOf(s.piece).toUpperCase();
      let size = 54;
      do g.font = `700 ${size--}px ${FONT}`;
      while (g.measureText(name).width > ITEM_GAP * k * 0.94 && size > 20);
      engrave(g, name, W / 2 + s.home.x * k, H / 2 + 2, UI_STEEL);
    }
    this.namesTex.needsUpdate = true;
  }
}

/** The rotation's plate: a brass ring with arrows chasing round it, lit while the rotation is on. */
function rotationModel(on: boolean): Group {
  const g = new Group();
  const color = on ? 0xff8a2a : 0x8a919c;
  const base = new Mesh(new CylinderGeometry(0.034, 0.036, 0.012, 32), new MeshMatcapMaterial({ matcap: makeMatcap('metal', 0x4a4e57) }));
  base.position.y = 0.006;
  const ring = new Mesh(new TorusGeometry(0.022, 0.003, 8, 40, Math.PI * 1.6).rotateX(Math.PI / 2), new MeshBasicMaterial({ color }));
  ring.position.y = 0.014;
  const head = new Mesh(new ConeGeometry(0.007, 0.012, 12).rotateZ(-Math.PI / 2), new MeshBasicMaterial({ color }));
  head.position.set(0.022, 0.014, -0.004);
  g.add(base, ring, head);
  return g;
}

/** Blueprint lines: thin, light steel, see-through. */
const GUIDE_LINE = new LineBasicMaterial({ color: 0xc9d3e0, transparent: true, opacity: 0.35, depthWrite: false });
const KNOB = new MeshMatcapMaterial({ matcap: BRASS });

/** Merges indexed or plain geometries with positions and normals only. */
function mergePlain(parts: BufferGeometry[]): BufferGeometry {
  const flat = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  const pos: number[] = [];
  const nor: number[] = [];
  for (const g of flat) {
    pos.push(...(g.getAttribute('position').array as Float32Array));
    nor.push(...(g.getAttribute('normal').array as Float32Array));
  }
  const out = new BufferGeometry();
  out.setAttribute('position', new Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  return out;
}
