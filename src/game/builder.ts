import { CanvasTexture, Group, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Vector3 } from '@iwsdk/core';
import { arenaWarning, reportArena } from './arena-report.js';
import type { HandState } from './hands.js';
import {
  angleGap,
  ArenaLayout,
  cloneLayout,
  Floor,
  MAX_RADIUS,
  MIN_RADIUS,
  Shape,
  Theme,
  validate,
  Wall,
} from './layout.js';

/**
 * The arena builder: a panel of big 3D buttons beside the arena and four placement tools.
 * Everything works by pinch, near or far (point and pinch), so it is hands-first on a headset
 * and click-driven in the emulator. Edits apply to a draft layout that the arena shows live.
 */

const SHAPES: Shape[] = ['circle', 'oval', 'square'];
const FLOORS: Floor[] = ['bowl', 'flat', 'hill', 'ridge', 'tiers'];
const WALLS: Wall[] = ['standard', 'low', 'high', 'none'];
const THEMES: Theme[] = ['forge', 'stone', 'clockwork', 'ice'];
const FLOOR_DEPTH: Record<Floor, number> = { bowl: 0.011, flat: 0.03, hill: 0.009, ridge: 0.012, tiers: 0.007 };
export type Tool = 'pocket' | 'rail' | 'pillar' | 'bumper';
const TOOLS: Tool[] = ['pocket', 'rail', 'pillar', 'bumper'];

const STORE_KEY = 'spinsmith.arenas.v1';

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

/** A pinchable 3D button: a rounded card with text, highlighted while pointed at. */
export class Button {
  readonly mesh: Mesh;
  private canvas = document.createElement('canvas');
  private tex: CanvasTexture;
  private text = '';
  private lit = false;
  private drawnActive = false;
  active = false;

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
    this.mesh.name = `builder-${id}`;
  }

  set(text: string, lit = this.lit) {
    if (text === this.text && lit === this.lit && this.active === this.drawnActive) return;
    this.text = text;
    this.lit = lit;
    this.drawnActive = this.active;
    const g = this.canvas.getContext('2d')!;
    const { width: w, height: h } = this.canvas;
    g.clearRect(0, 0, w, h);
    g.fillStyle = this.active ? 'rgba(255, 140, 50, 0.95)' : lit ? 'rgba(90, 70, 55, 0.95)' : 'rgba(30, 24, 20, 0.85)';
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

export interface BuilderEvents {
  /** The draft changed: show it. */
  preview(layout: ArenaLayout): void;
  /** Play the saved arena now. */
  play(layout: ArenaLayout): void;
  /** Leave the builder without playing. */
  exit(): void;
}

export class Builder {
  readonly panel = new Group();
  draft!: ArenaLayout;
  tool: Tool = 'pocket';
  private buttons: Button[] = [];
  private status: Button;
  private readonly p = new Vector3();
  private readonly q = new Vector3();
  private readonly hovered = new Set<Button>();

  constructor(private readonly events: BuilderEvents) {
    this.panel.name = 'arena-builder';
    // Rows of buttons, top to bottom. Width 0.15 m keeps text readable at arm's length.
    const rows: [string, number][][] = [
      [['size-', 0.045], ['size', 0.06], ['size+', 0.045]],
      [['shape', 0.16]],
      [['floor', 0.16]],
      [['wall', 0.16]],
      [['theme', 0.16]],
      [['vortex', 0.078], ['spinner', 0.078]],
      [['tilt', 0.078], ['shrink', 0.078]],
      [['pocket', 0.038], ['rail', 0.038], ['pillar', 0.038], ['bumper', 0.038]],
      [['test', 0.078], ['play', 0.078]],
      [['exit', 0.16]],
    ];
    const rowH = 0.024;
    rows.forEach((row, r) => {
      const total = row.reduce((s, [, w]) => s + w, 0) + (row.length - 1) * 0.004;
      let x = -total / 2;
      for (const [id, w] of row) {
        const b = new Button(id, w, rowH - 0.004);
        b.mesh.position.set(x + w / 2, -r * rowH, 0);
        x += w + 0.004;
        this.buttons.push(b);
        this.panel.add(b.mesh);
      }
    });
    this.status = new Button('status', 0.16, 0.03);
    this.status.mesh.position.set(0, -rows.length * rowH - 0.01, 0);
    this.panel.add(this.status.mesh);
    this.panel.visible = false;
  }

  open(from: ArenaLayout) {
    this.draft = cloneLayout(from);
    this.draft.name = 'My Arena';
    this.panel.visible = true;
    this.status.set('Pick a tool, then pinch the arena');
    this.refresh();
  }

  close() {
    this.panel.visible = false;
  }

  /** Button under a hand: the pinch point near it, or its pointing ray. */
  private pick(h: HandState): Button | null {
    let best: Button | null = null;
    let bestD = Infinity;
    for (const b of this.buttons) {
      b.mesh.getWorldPosition(this.p);
      const near = h.pinch.distanceTo(this.p);
      let d = near < 0.03 ? near : Infinity;
      if (d === Infinity && h.hasRay) {
        // Distance from the ray to the button center, compared with the button's half size.
        const t = this.q.copy(this.p).sub(h.rayOrigin).dot(h.rayDir);
        if (t > 0) {
          const off = this.q.copy(h.rayDir).multiplyScalar(t).add(h.rayOrigin).distanceTo(this.p);
          if (off < Math.min(b.width, b.height) * 0.6) d = off + 0.05;
        }
      }
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    return best;
  }

  /**
   * Handles both hands for this frame. Returns true when a pinch was used by the panel,
   * so the caller does not also treat it as an arena edit.
   */
  update(hands: HandState[]): boolean {
    let consumed = false;
    const hovered = this.hovered;
    hovered.clear();
    for (const h of hands) {
      if (!h.tracked) continue;
      const b = this.pick(h);
      if (!b) continue;
      hovered.add(b);
      if (h.justPinched) {
        this.press(b.id);
        consumed = true;
      }
    }
    for (const b of this.buttons) b.highlight(hovered.has(b));
    return consumed;
  }

  /** A pinch on the arena (arena-local point and normalized radius) with the current tool. */
  edit(x: number, z: number, n: number) {
    const L = this.draft;
    const angle = Math.atan2(z, x);
    if (this.tool === 'pocket' || this.tool === 'rail') {
      if (n < 0.75) return this.say('Pockets and rails go on the rim');
      if (this.tool === 'pocket') {
        const hit = L.pockets.find((p) => angleGap(p.angle, angle) < p.half + 0.05);
        if (!hit) L.pockets.push({ angle, half: 0.2, points: 2 });
        else if (hit.points < 3) hit.points = 3;
        else L.pockets.splice(L.pockets.indexOf(hit), 1);
        // Rails and pockets do not overlap: a new pocket cuts rails out of its way.
        L.rails = L.rails.filter((r) => angleGap(r.angle, angle) > r.half + 0.2);
      } else {
        const hit = L.rails.find((r) => angleGap(r.angle, angle) < r.half);
        if (hit) L.rails.splice(L.rails.indexOf(hit), 1);
        else if (L.pockets.some((p) => angleGap(p.angle, angle) < p.half + 0.4)) return this.say('Too close to a pocket');
        else L.rails.push({ angle, half: 0.4 });
      }
    } else {
      if (n > 0.85) return this.say('Pillars go on the floor');
      const fx = x / L.radius;
      const fz = z / L.radius;
      const hit = L.pillars.find((p) => Math.hypot(p.x - fx, p.z - fz) < 0.15);
      if (hit) L.pillars.splice(L.pillars.indexOf(hit), 1);
      else L.pillars.push({ x: fx, z: fz, r: 0.009, bumper: this.tool === 'bumper' });
    }
    this.changed();
  }

  private press(id: string) {
    const L = this.draft;
    const cycle = <T>(list: T[], v: T) => list[(list.indexOf(v) + 1) % list.length];
    switch (id) {
      case 'size-':
      case 'size+':
        L.radius = Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, Math.round((L.radius + (id === 'size+' ? 0.01 : -0.01)) * 100) / 100));
        break;
      case 'shape':
        L.shape = cycle(SHAPES, L.shape);
        break;
      case 'floor':
        L.floor = cycle(FLOORS, L.floor);
        L.depth = FLOOR_DEPTH[L.floor];
        break;
      case 'wall':
        L.wall = cycle(WALLS, L.wall);
        break;
      case 'theme':
        L.theme = cycle(THEMES, L.theme);
        break;
      case 'vortex':
        L.vortex = L.vortex > 0 ? 0 : 0.6;
        break;
      case 'spinner':
        L.spinner = L.spinner > 0 ? 0 : 6;
        break;
      case 'tilt':
        L.tilt = L.tilt > 0 ? 0 : 0.06;
        break;
      case 'shrink':
        L.shrink = !L.shrink;
        break;
      case 'pocket':
      case 'rail':
      case 'pillar':
      case 'bumper':
        this.tool = id;
        this.refresh();
        return this.say(id === 'pocket' ? 'Pinch the rim: add, 3 points, remove' : id === 'rail' ? 'Pinch the rim to add or remove a rail' : `Pinch the floor to add or remove a ${id}`);
      case 'test':
        return this.test();
      case 'play':
        return this.play();
      case 'exit':
        return this.events.exit();
      default:
        return;
    }
    this.changed();
  }

  private changed() {
    const problem = validate(this.draft);
    this.status.set(problem ?? 'Pinch Test to try it out');
    this.refresh();
    this.events.preview(this.draft);
  }

  /** Simulates the draft and reports how it plays. */
  private test() {
    const problem = validate(this.draft);
    if (problem) return this.say(problem);
    const r = reportArena(this.draft, 4);
    const warning = arenaWarning(r);
    this.say(warning ?? `Plays well · rounds ~${r.median.toFixed(0)} s · KO ${(r.knockout * 100).toFixed(0)}%`);
  }

  private play() {
    const problem = validate(this.draft);
    if (problem) return this.say(problem);
    const saved = loadArenas();
    const layout = cloneLayout(this.draft);
    layout.name = `My Arena ${saved.length + 1}`;
    saved.push(layout);
    saveArenas(saved);
    this.events.play(layout);
  }

  private say(text: string) {
    this.status.set(text);
  }

  /** Updates every button's text from the draft. */
  private refresh() {
    const L = this.draft;
    const label: Record<string, string> = {
      'size-': '−',
      size: `${Math.round(L.radius * 200)} cm`,
      'size+': '+',
      shape: `Shape: ${L.shape}`,
      floor: `Floor: ${L.floor}`,
      wall: `Wall: ${L.wall}`,
      theme: `Theme: ${L.theme}`,
      vortex: `Vortex ${L.vortex > 0 ? 'on' : 'off'}`,
      spinner: `Turntable ${L.spinner > 0 ? 'on' : 'off'}`,
      tilt: `Rocking ${L.tilt > 0 ? 'on' : 'off'}`,
      shrink: `Embers ${L.shrink ? 'on' : 'off'}`,
      pocket: 'Pocket',
      rail: 'Rail',
      pillar: 'Pillar',
      bumper: 'Bumper',
      test: 'Test',
      play: 'Save & play',
      exit: 'Back',
    };
    for (const b of this.buttons) {
      b.active = (TOOLS as string[]).includes(b.id) && b.id === this.tool;
      b.set(label[b.id] ?? b.id, false);
    }
  }
}
