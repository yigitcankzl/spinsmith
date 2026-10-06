import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Matrix4,
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
import { arenaWarning, reportArena } from './arena-report.js';
import { playPick, playPlace, playRemove } from './audio.js';
import type { HandState } from './hands.js';
import { angleGap, ArenaLayout, cloneLayout, Floor, MAX_RADIUS, MIN_RADIUS, normRadius, rimRadius, Shape, Theme, validate, Wall } from './layout.js';
import { Arena } from './sim.js';
import { makeMatcap } from './visuals.js';

/**
 * The arena workshop. Instead of a menu, a tray of little 3D pieces sits beside the arena, within
 * reach. Pinch a piece, carry it over the arena and let go: a pocket is cut into the rim where you
 * drop it, a pillar stands where you drop it, a floor piece reshapes the floor, a gem changes the
 * theme. Pieces already on the arena can be picked up and moved, or dropped off the arena to throw
 * them away; a quick tap on a pocket switches it between 2 and 3 points. Pinch the rim and pull to
 * resize the arena. Works near (pinch) and far (point and pinch), so it is hands-first on a headset
 * and click-and-drag in the emulator.
 */

const FLOOR_DEPTH: Record<Floor, number> = { bowl: 0.011, flat: 0.03, hill: 0.009, ridge: 0.012, tiers: 0.007 };
const STORE_KEY = 'spinsmith.arenas.v1';
/** A pinch this close to a piece (m) grabs it; a ray this close to it grabs it from afar. */
const GRAB_NEAR = 0.035;
const GRAB_RAY = 0.025;
/** A pinch released this fast and this still counts as a tap. */
const TAP_TIME = 0.3;
const TAP_MOVE = 0.015;

type Piece =
  | { kind: 'pocket' | 'rail' | 'pillar' | 'bumper' }
  | { kind: 'shape'; value: Shape }
  | { kind: 'floor'; value: Floor }
  | { kind: 'wall'; value: Wall }
  | { kind: 'theme'; value: Theme }
  | { kind: 'extra'; value: 'vortex' | 'spinner' | 'tilt' | 'shrink' };

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
    g.clearRect(0, 0, w, h);
    g.fillStyle = lit ? 'rgba(255, 140, 50, 0.95)' : 'rgba(30, 24, 20, 0.85)';
    g.beginPath();
    g.roundRect(3, 3, w - 6, h - 6, 18);
    g.fill();
    g.fillStyle = '#fff4e2';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let size = Math.round(h * 0.5);
    do g.font = `bold ${size--}px system-ui, sans-serif`;
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
function tag(text: string, width: number, size = 40) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff4e2';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let s = size;
  do g.font = `bold ${s--}px system-ui, sans-serif`;
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
const THEME_COLOR: Record<Theme, number> = { forge: 0xff6a2a, stone: 0x8fb7c9, clockwork: 0xe2b866, ice: 0x9fe8ff };

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
      // A miniature of the floor profile: a little bowl, hill, ridge or step.
      const probe = new Arena({ ...MINI, floor: p.value, depth: FLOOR_DEPTH[p.value] });
      const pts: Vector2[] = [new Vector2(0, 0), new Vector2(0.0125, 0)];
      for (let i = 12; i >= 0; i--) pts.push(new Vector2(0.0125 * (i / 12), 0.002 + probe.floorHeight(i / 12) * 0.6));
      m(new LatheGeometry(pts, 28), clay(0xd8c9b0));
      break;
    }
    case 'wall': {
      const h = { low: 0.005, standard: 0.009, high: 0.018, none: 0.0015 }[p.value];
      m(new CylinderGeometry(0.012, 0.012, h, 28, 1, true), steel).position.y = h / 2;
      m(new CircleGeometry(0.0115, 24).rotateX(-Math.PI / 2), clay(0xe9dfd0)).position.y = 0.0005;
      break;
    }
    case 'theme':
      m(new OctahedronGeometry(0.009), new MeshMatcapMaterial({ matcap: makeMatcap('metal', THEME_COLOR[p.value]) })).position.y = 0.01;
      break;
    case 'extra': {
      const c = { vortex: 0x8fe8ff, spinner: 0xe2b866, tilt: 0xc8ccd6, shrink: 0xff4a12 }[p.value];
      if (p.value === 'tilt') m(new SphereGeometry(0.012, 20, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), steel).position.y = 0.012;
      else if (p.value === 'shrink') m(new TorusGeometry(0.01, 0.0025, 8, 24).rotateX(Math.PI / 2), glow(c)).position.y = 0.003;
      else m(new CylinderGeometry(0.011, 0.011, 0.003, 24), new MeshMatcapMaterial({ matcap: makeMatcap('metal', c) })).position.y = 0.0015;
      break;
    }
  }
  return g;
}

function pieceName(p: Piece): string {
  const cap = (t: string) => t[0].toUpperCase() + t.slice(1);
  if (!('value' in p)) return cap(p.kind);
  if (p.kind === 'extra') return { vortex: 'Vortex', spinner: 'Turntable', tilt: 'Rocking', shrink: 'Embers' }[p.value];
  return cap(p.value);
}

/** The tray: rows of pieces by category. */
const TRAY: [string, Piece[]][] = [
  ['Place', [{ kind: 'pocket' }, { kind: 'rail' }, { kind: 'pillar' }, { kind: 'bumper' }]],
  ['Shape', (['circle', 'oval', 'square'] as Shape[]).map((value) => ({ kind: 'shape', value }))],
  ['Floor', (['bowl', 'flat', 'hill', 'ridge', 'tiers'] as Floor[]).map((value) => ({ kind: 'floor', value }))],
  ['Wall', (['low', 'standard', 'high', 'none'] as Wall[]).map((value) => ({ kind: 'wall', value }))],
  ['Theme', (['forge', 'stone', 'clockwork', 'ice'] as Theme[]).map((value) => ({ kind: 'theme', value }))],
  ['Extras', (['vortex', 'spinner', 'tilt', 'shrink'] as const).map((value) => ({ kind: 'extra', value }))],
];
const CELL = 0.034;
/** The tray is placed this far in front of the eyes (m). */
const TRAY_DISTANCE = 0.4;
const TRAY_SCALE = 1.35;

interface Slot {
  piece: Piece;
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
}

export class Builder {
  /** Lives in arena-local space (a child of the arena root). */
  readonly root = new Group();
  draft!: ArenaLayout;
  private tray = new Group();
  private slots: Slot[] = [];
  private held: Held | null = null;
  private buttons: Button[] = [];
  private status: Mesh;
  private statusText = '';
  private time = 0;
  private readonly p = new Vector3();
  private readonly q = new Vector3();
  private readonly hit = new Vector3();
  private readonly up = new Vector3();
  private readonly right = new Vector3();
  private readonly depth = new Vector3();
  private readonly basis = new Matrix4();
  private trayPlaced = false;

  constructor(private readonly hooks: BuilderHooks) {
    this.root.name = 'arena-workshop';
    // The tray is placed in front of the player's eyes when the workshop opens (see placeTray), a bit enlarged
    // so the pieces and their names read well at that distance.
    this.tray.scale.setScalar(TRAY_SCALE);
    const board = new Mesh(new BoxGeometry(CELL * 5 + 0.05, 0.004, CELL * TRAY.length + 0.05), new MeshMatcapMaterial({ matcap: makeMatcap('clay', 0x5a463a) }));
    board.position.set(0.012, -0.003, 0.012);
    this.tray.add(board);
    TRAY.forEach(([label, pieces], r) => {
      const z = (r - (TRAY.length - 1) / 2) * CELL;
      const rowTag = tag(label, 0.04, 34);
      rowTag.rotation.x = -Math.PI / 2;
      rowTag.position.set(-CELL * 2.6, 0.001, z);
      this.tray.add(rowTag);
      pieces.forEach((piece, c) => {
        const home = new Vector3((c - 1.5) * CELL + 0.012, 0, z);
        const model = pieceModel(piece);
        model.position.copy(home);
        const name = tag(pieceName(piece), 0.032, 30);
        name.rotation.x = -Math.PI / 2;
        name.position.set(home.x, 0.001, z + 0.013);
        this.tray.add(model, name);
        this.slots.push({ piece, model, home });
      });
    });
    // Action buttons along the tray's near edge.
    const actions: [string, string][] = [
      ['try', 'Try it'],
      ['play', 'Save & play'],
      ['back', 'Back'],
    ];
    actions.forEach(([id, text], i) => {
      const b = new Button(id, 0.06, 0.022);
      b.set(text);
      b.mesh.rotation.x = -Math.PI / 2;
      b.mesh.position.set((i - 1) * 0.064 + 0.012, 0.001, (TRAY.length / 2) * CELL + 0.012);
      this.buttons.push(b);
      this.tray.add(b.mesh);
    });
    // The status line floats above the arena, facing the player.
    this.status = tag('', 0.22, 34);
    // The status line sits along the tray's far edge, readable with the pieces.
    this.status.rotation.x = -Math.PI / 2;
    this.status.position.set(0.012, 0.002, -(TRAY.length / 2) * CELL - 0.02);
    this.tray.add(this.status);
    this.root.add(this.tray);
    this.root.visible = false;
  }

  open(from: ArenaLayout) {
    this.draft = cloneLayout(from);
    this.draft.name = 'My Arena';
    this.root.visible = true;
    this.trayPlaced = false;
    this.held = null;
    this.say('Pinch a piece and drop it on the arena');
    this.hooks.preview(this.draft);
    if (import.meta.env.DEV) {
      // Piece positions, for driving the workshop from the emulator CLI.
      this.root.updateWorldMatrix(true, true);
      const at = (o: { getWorldPosition(v: Vector3): Vector3 }) => o.getWorldPosition(new Vector3()).toArray().map((v) => v.toFixed(3)).join(',');
      console.log(`[BUILD] ${this.slots.map((s) => `${pieceName(s.piece)}@${at(s.model)}`).join(' ')} ${this.buttons.map((b) => `${b.id}@${at(b.mesh)}`).join(' ')}`);
    }
  }

  close() {
    this.root.visible = false;
    if (this.held?.mode === 'piece') this.root.remove(this.held.model);
    this.held = null;
  }

  /** One frame of the workshop for all pointers. */
  update(pointers: HandState[], dt: number) {
    this.time += dt;
    if (this.held) {
      this.updateHeld();
      return;
    }
    // Hover feedback: pieces under a pointer lift and turn, buttons light up.
    let hovered: Slot | null = null;
    let hoveredButton: Button | null = null;
    for (const h of pointers) {
      if (!h.tracked) continue;
      hovered ??= this.slotUnder(h);
      hoveredButton ??= this.buttonUnder(h);
    }
    for (const s of this.slots) {
      const lift = s === hovered ? 0.006 + 0.002 * Math.sin(this.time * 8) : 0;
      s.model.position.set(s.home.x, s.home.y + lift, s.home.z);
      s.model.rotation.y = s === hovered ? this.time * 2 : 0;
    }
    for (const b of this.buttons) b.highlight(b === hoveredButton);

    // A new pinch: a button, a tray piece, a piece on the arena, or the rim to resize.
    for (const h of pointers) {
      if (!h.tracked || !h.justPinched) continue;
      const button = this.buttonUnder(h);
      if (button) return this.press(button.id);
      const slot = this.slotUnder(h);
      if (slot) return this.grab(slot.piece, h, 'tray', 2);
      const at = this.hooks.arenaPoint(h);
      if (at && this.pickFromArena(at.x, at.z, h)) return;
      if (at && this.isRim(at.x, at.z)) {
        this.held = { mode: 'resize', hand: h };
        this.say('Pull the rim out or in to resize');
        return;
      }
    }
  }

  private grab(piece: Piece, hand: HandState, from: 'tray' | 'arena', pocketPoints: number) {
    const model = pieceModel(piece);
    model.scale.setScalar(1.4);
    this.root.add(model);
    this.held = { mode: 'piece', piece, model, hand, from, start: this.time, startAt: hand.pinch.clone(), pocketPoints };
    playPick();
    this.say(`${pieceName(piece)}: drop it on the arena${from === 'arena' ? ', or off it to remove' : ''}`);
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
          this.say(`${Math.round(radius * 200)} cm across`);
          this.hooks.preview(this.draft);
        }
      }
      if (!h.pinching || !h.tracked) {
        this.held = null;
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
      model.position.set(x, this.hooks.floorHeight(Math.min(1, normRadius(this.draft, x, z))) + 0.012 + 0.003 * Math.sin(this.time * 10), z);
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
    this.root.remove(model);
    const tapped = this.time - held.start < TAP_TIME && h.pinch.distanceTo(held.startAt) < TAP_MOVE;
    if (held.from === 'arena' && held.piece.kind === 'pocket' && tapped && at) {
      // A quick tap on a pocket flips it between 2 and 3 points.
      this.place(held.piece, at.x, at.z, held.pocketPoints >= 3 ? 2 : 3);
      return;
    }
    if (!at) {
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
        if (n < 0.6) return this.reject('Drop pockets near the rim');
        L.pockets = L.pockets.filter((p) => angleGap(p.angle, a) > p.half + 0.2);
        L.rails = L.rails.filter((r) => angleGap(r.angle, a) > r.half + 0.2);
        L.pockets.push({ angle: a, half: 0.2, points: pocketPoints });
        break;
      case 'rail':
        if (n < 0.6) return this.reject('Drop rails near the rim');
        if (L.pockets.some((p) => angleGap(p.angle, a) < p.half + 0.4)) return this.reject('Too close to a pocket');
        L.rails = L.rails.filter((r) => angleGap(r.angle, a) > r.half + 0.3);
        L.rails.push({ angle: a, half: 0.4 });
        break;
      case 'pillar':
      case 'bumper':
        if (n > 0.85) return this.reject('Drop it on the floor, away from the rim');
        L.pillars.push({ x: x / L.radius, z: z / L.radius, r: 0.009, bumper: piece.kind === 'bumper' });
        break;
      case 'shape':
        L.shape = piece.value;
        break;
      case 'floor':
        L.floor = piece.value;
        L.depth = FLOOR_DEPTH[piece.value];
        break;
      case 'wall':
        L.wall = piece.value;
        break;
      case 'theme':
        L.theme = piece.value;
        break;
      case 'extra':
        if (piece.value === 'vortex') L.vortex = L.vortex > 0 ? 0 : 0.6;
        if (piece.value === 'spinner') L.spinner = L.spinner > 0 ? 0 : 6;
        if (piece.value === 'tilt') L.tilt = L.tilt > 0 ? 0 : 0.06;
        if (piece.value === 'shrink') L.shrink = !L.shrink;
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

  private slotUnder(h: HandState): Slot | null {
    let best: Slot | null = null;
    let bestD = Infinity;
    for (const s of this.slots) {
      s.model.getWorldPosition(this.p);
      const d = this.distance(h, this.p, GRAB_NEAR, GRAB_RAY);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  private buttonUnder(h: HandState): Button | null {
    for (const b of this.buttons) {
      b.mesh.getWorldPosition(this.p);
      if (this.distance(h, this.p, 0.03, 0.02) < Infinity) return b;
    }
    return null;
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

  private press(id: string) {
    if (id === 'back') return this.hooks.exit();
    const problem = validate(this.draft);
    if (problem) return this.reject(problem);
    if (id === 'try') {
      const r = reportArena(this.draft, 3);
      this.say(arenaWarning(r) ?? `Plays well · rounds ~${r.median.toFixed(0)} s`);
      return this.hooks.tryIt(this.draft);
    }
    if (id === 'play') {
      const saved = loadArenas();
      const layout = cloneLayout(this.draft);
      layout.name = `My Arena ${saved.length + 1}`;
      saved.push(layout);
      saveArenas(saved);
      this.hooks.play(layout);
    }
  }

  private changed(text?: string) {
    this.say(text ?? validate(this.draft) ?? 'Pinch Try it to watch a round');
    this.hooks.preview(this.draft);
    const L = this.draft;
    if (import.meta.env.DEV) console.log(`[BUILD] draft ${L.shape} ${L.floor} ${L.wall} ${L.theme} r=${L.radius} pockets=${L.pockets.length} rails=${L.rails.length} pillars=${L.pillars.length}`);
  }

  private reject(text: string) {
    playRemove();
    this.say(text);
    this.hooks.preview(this.draft);
  }

  /** Redraws the status line (only when the text changes). */
  private say(text: string) {
    if (text === this.statusText) return;
    this.statusText = text;
    const old = this.status;
    this.status = tag(text, 0.22, 34);
    this.status.position.copy(old.position);
    this.status.rotation.copy(old.rotation);
    this.tray.remove(old);
    old.geometry.dispose();
    const mat = old.material as MeshBasicMaterial;
    mat.map?.dispose();
    mat.dispose();
    this.tray.add(this.status);
  }

  /**
   * Places the tray once, when the workshop opens: about 40 cm from the eyes toward the arena, at
   * eye level (slightly below) and to the right of the arena, facing the player. It then stays where it is, so
   * the player neither has to bend down to it nor chase it. head and forward are arena-local.
   */
  placeTray(head: Vector3, forward: Vector3) {
    if (this.trayPlaced) return;
    this.trayPlaced = true;
    // Level forward: looking down at the arena while opening must not put the tray down there.
    const level = this.depth.set(forward.x, 0, forward.z).normalize();
    const right = this.right.set(-level.z, 0, level.x);
    this.tray.position.copy(head).addScaledVector(level, TRAY_DISTANCE).addScaledVector(right, 0.2);
    this.tray.position.y -= 0.06;
    // Face the eyes upright: the board's up side (+Y) toward the head, its x axis to the right.
    const toward = this.p.copy(head).sub(this.tray.position).normalize();
    const x = this.q.copy(right).addScaledVector(toward, -right.dot(toward)).normalize();
    const z = this.up.crossVectors(x, toward);
    this.tray.quaternion.setFromRotationMatrix(this.basis.makeBasis(x, toward, z));
  }
}
