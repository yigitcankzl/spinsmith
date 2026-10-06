/**
 * The forge: build your own top from parts. A board across the arena holds the parts by tab
 * (Ring, Core, Tip, Style, Presets); your top stands big on a spindle over the arena's middle with
 * a stats card beside it. Pinch a part and carry it onto the top (or just tap it) to fit it; a
 * core locks with one click per tooth. Builds over the weight limit are refused.
 */
import {
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshMatcapMaterial,
  Object3D,
  PlaneGeometry,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
} from '@iwsdk/core';
import { playPick, playPlace, playRemove } from './audio.js';
import { Button, tag } from './builder.js';
import type { HandState } from './hands.js';
import { buildName, CORES, PRESETS, RINGS, roleOf, specFromBuild, statsOf, TIPS, WEIGHT_LIMIT, weightOf } from './parts.js';
import type { TopBuild, TopStats } from './parts.js';
import { coreMesh, makeMatcap, ringMeshes, tipMesh, TopView } from './visuals.js';

const STORE_KEY = 'spinsmith.top.v1';

/** Body colors on offer: warm, so the player's top never looks like the (cool) opponent. */
export const TOP_COLORS = [0xd6784f, 0xc94a3a, 0xe0a63c, 0xb5654a, 0xe8d6b0, 0x9a5bb0];

export function loadBuild(): TopBuild {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const b = JSON.parse(raw) as TopBuild;
      if (RINGS.some((r) => r.id === b.ring) && CORES.some((c) => c.id === b.core) && TIPS.some((t) => t.id === b.tip) && weightOf(b) <= WEIGHT_LIMIT) return b;
    }
  } catch {
    // A broken save falls back to the default top.
  }
  return { ...PRESETS[0].build };
}

function saveBuild(b: TopBuild) {
  localStorage.setItem(STORE_KEY, JSON.stringify(b));
}

type Item =
  | { kind: 'ring' | 'core'; id: string; name: string; blurb: string }
  | { kind: 'tip'; id: TopBuild['tip']; name: string; blurb: string }
  | { kind: 'spin'; value: 1 | -1; name: string; blurb: string }
  | { kind: 'color'; value: number; name: string; blurb: string }
  | { kind: 'preset'; build: TopBuild; name: string; blurb: string };

const TABS: [string, Item[]][] = [
  ['Ring', RINGS.map((r) => ({ kind: 'ring' as const, id: r.id, name: r.name, blurb: r.blurb }))],
  ['Core', CORES.map((c) => ({ kind: 'core' as const, id: c.id, name: c.name, blurb: c.blurb }))],
  ['Tip', TIPS.map((t) => ({ kind: 'tip' as const, id: t.id, name: t.name, blurb: t.blurb }))],
  [
    'Style',
    [
      { kind: 'spin', value: 1, name: 'Right spin', blurb: 'Spins clockwise' },
      { kind: 'spin', value: -1, name: 'Left spin', blurb: 'Against right spinners: steals spin' },
      ...TOP_COLORS.slice(0, 4).map((value) => ({ kind: 'color' as const, value, name: 'Color', blurb: 'Body color' })),
    ],
  ],
  ['Presets', PRESETS.map((p) => ({ kind: 'preset' as const, build: p.build, name: p.name, blurb: `${buildName(p.build)}, a classic ${roleOf(specFromBuild(p.build))} top` }))],
];

const ITEM_GAP = 0.04;
/** The board stands this far behind the far rim and this high above the arena, drawn this much larger. */
const BOARD_BEHIND = 0.04;
const BOARD_HEIGHT = 0.16;
const BOARD_SCALE = 1.7;
/** Your top stands this high over the arena's middle, this much larger than life. */
const DISPLAY_Y = 0.05;
const DISPLAY_SCALE = 2.4;
/** A carried part fits when brought this close to the top (m). */
const SNAP = 0.09;
/** Pinch distances: touching a part, and a ray passing this close. */
const GRAB_NEAR = 0.035 * BOARD_SCALE;
const GRAB_RAY = 0.022 * BOARD_SCALE;
/** A part let go where it was picked up (a tap) fits straight away. */
const TAP_MOVE = 0.03;

interface Slot {
  item: Item;
  tab: number;
  model: Object3D;
  name: Mesh;
  home: Vector3;
}

export interface ForgeHooks {
  /** Save the build and go back. */
  done(build: TopBuild): void;
  /** Leave without saving. */
  exit(): void;
  /** Watch your build fight a round. */
  test(build: TopBuild): void;
}

export class Forge {
  /** Lives in arena-local space (a child of the arena root). */
  readonly root = new Group();
  build: TopBuild = loadBuild();
  private board = new Group();
  private items = new Group();
  private slots: Slot[] = [];
  private tabs: Button[] = [];
  private buttons: Button[] = [];
  private tab = 0;
  private slide = 0;
  private status: Mesh;
  private statusText = '';
  private display!: TopView;
  private displayHolder = new Group();
  private displayTilt = new Group();
  private card = new StatsCard();
  private cardKey = '';
  private held: { item: Item; model: Object3D; hand: HandState; startAt: Vector3 } | null = null;
  /** Lock clicks still to play after a core is fitted, and the time to the next one. */
  private clicks = 0;
  private clickTimer = 0;
  private twist = 0;
  private time = 0;
  private logPending = false;
  private readonly p = new Vector3();
  private readonly q = new Vector3();
  private readonly hit = new Vector3();
  private readonly at = new Vector3();
  private readonly up = new Vector3();
  private readonly right = new Vector3();
  private readonly depth = new Vector3();
  private readonly basis = new Matrix4();

  constructor(private readonly hooks: ForgeHooks) {
    this.root.name = 'top-forge';
    this.board.scale.setScalar(BOARD_SCALE);
    const back = new Mesh(new PlaneGeometry(0.24, 0.17), new MeshBasicMaterial({ color: 0x241c17 }));
    back.position.z = -0.004;
    this.board.add(back);
    TABS.forEach(([label], t) => {
      const b = new Button(`tab:${t}`, 0.044, 0.02);
      b.set(label);
      b.mesh.position.set((t - (TABS.length - 1) / 2) * 0.046, 0.048, 0);
      this.tabs.push(b);
      this.board.add(b.mesh);
    });
    this.board.add(this.items);
    TABS.forEach(([, items], t) => {
      items.forEach((item, c) => {
        const home = new Vector3((c - (items.length - 1) / 2) * ITEM_GAP, 0.004, 0.012);
        const model = itemModel(item);
        model.position.copy(home);
        const name = tag(item.name, 0.04, 34);
        name.position.set(home.x, -0.026, 0.002);
        this.items.add(model, name);
        this.slots.push({ item, tab: t, model, name, home });
      });
    });
    (
      [
        ['test', 'Test'],
        ['done', 'Save'],
        ['back', 'Back'],
      ] as const
    ).forEach(([id, text], i) => {
      const b = new Button(id, 0.064, 0.022);
      b.set(text);
      b.mesh.position.set((i - 1) * 0.07, -0.06, 0);
      this.buttons.push(b);
      this.board.add(b.mesh);
    });
    this.status = tag('', 0.22, 34);
    this.status.position.set(0, 0.073, 0);
    this.board.add(this.status);
    // The spindle your top stands on, over the arena's middle.
    const spindle = new Mesh(new CylinderGeometry(0.002, 0.002, DISPLAY_Y, 8), new MeshMatcapMaterial({ matcap: makeMatcap('metal', 0x6d6f78) }));
    spindle.position.y = DISPLAY_Y / 2;
    this.displayTilt.position.y = DISPLAY_Y;
    this.displayHolder.scale.setScalar(DISPLAY_SCALE);
    // Tipped toward the player so both the profile and the top face show.
    this.displayTilt.rotation.x = 0.35;
    this.displayTilt.add(this.displayHolder);
    this.card.mesh.position.set(0.2, DISPLAY_Y + 0.04, 0.04);
    this.root.add(this.board, spindle, this.displayTilt, this.card.mesh);
    this.showTab(0, 0);
    this.rebuildDisplay();
    this.root.visible = false;
  }

  open() {
    this.build = loadBuild();
    this.rebuildDisplay();
    this.root.visible = true;
    this.held = null;
    this.cardKey = '';
    this.say('Pinch a part and bring it to your top');
    this.logPending = true;
  }

  close() {
    this.root.visible = false;
    if (this.held) this.root.remove(this.held.model);
    this.held = null;
  }

  /** Faces the board and the stats card toward the head (arena-local). */
  place(head: Vector3, arenaRadius: number) {
    this.board.position.set(0, BOARD_HEIGHT, -arenaRadius - BOARD_BEHIND);
    this.face(this.board, head);
    this.face(this.card.mesh, head);
  }

  update(pointers: HandState[], dt: number) {
    this.time += dt;
    if (import.meta.env.DEV && this.logPending) {
      this.logPending = false;
      console.log(`[FORGE] ${this.debugPositions()}`);
    }
    // Your top turns slowly on the spindle; a core lock clicks it round tooth by tooth.
    if (this.clicks > 0 && (this.clickTimer -= dt) <= 0) {
      this.clicks--;
      this.clickTimer = 0.07;
      this.twist += 0.35;
      playPick();
    }
    this.displayHolder.rotation.y += dt * 0.5;
    if (this.twist > 0) {
      const step = Math.min(this.twist, dt * 6);
      this.displayHolder.rotation.y += step;
      this.twist -= step;
    }
    this.slide *= Math.exp(-dt * 14);
    this.items.position.x = this.slide;
    if (this.held) {
      this.updateHeld();
      return;
    }
    let hovered: Slot | null = null;
    let hoveredButton: Button | null = null;
    for (const h of pointers) {
      if (!h.tracked) continue;
      hovered ??= this.slotUnder(h);
      hoveredButton ??= this.buttonUnder(h);
    }
    for (const s of this.slots) {
      if (s.tab !== this.tab) continue;
      const lift = s === hovered ? 0.006 + 0.002 * Math.sin(this.time * 8) : 0;
      s.model.position.set(s.home.x, s.home.y + lift, s.home.z + lift);
      s.model.rotation.y = s === hovered ? this.time * 2 : 0;
    }
    for (const b of this.buttons) b.highlight(b === hoveredButton);
    for (const b of this.tabs) b.highlight(b === hoveredButton || b.id === `tab:${this.tab}`);
    this.showCard(hovered ? this.withItem(hovered.item) : null);

    // A hand touching a part or button goes first, then pointing rays (and the dev gaze).
    for (const touchOnly of [true, false]) {
      for (const h of pointers) {
        if (!h.tracked || !h.justPinched) continue;
        const button = this.buttonUnder(h, touchOnly);
        if (button) return this.press(button.id);
        const slot = this.slotUnder(h, touchOnly);
        if (slot) return this.grab(slot, h);
      }
    }
  }

  private grab(slot: Slot, hand: HandState) {
    const model = itemModel(slot.item);
    this.root.add(model);
    this.held = { item: slot.item, model, hand, startAt: this.pointAt(hand, new Vector3()) };
    playPick();
    this.say(`${slot.item.name}: ${slot.item.blurb}`);
  }

  /** While carrying: the part follows the pointer; near your top it fits on release. */
  private updateHeld() {
    const held = this.held!;
    const h = held.hand;
    const at = this.pointAt(h, this.at);
    this.root.worldToLocal(held.model.position.copy(at));
    held.model.rotation.y = this.time * 2;
    this.displayHolder.getWorldPosition(this.p);
    const near = at.distanceTo(this.p) < SNAP;
    // Your top swells a little when the part is close enough to fit.
    this.displayHolder.scale.setScalar(DISPLAY_SCALE * (near ? 1.08 + 0.03 * Math.sin(this.time * 12) : 1));
    this.showCard(this.withItem(held.item));
    if (h.pinching && h.tracked) return;
    const tap = at.distanceTo(held.startAt) < TAP_MOVE;
    this.root.remove(held.model);
    this.held = null;
    this.displayHolder.scale.setScalar(DISPLAY_SCALE);
    if (near || tap) this.fit(held.item);
    else this.say('Bring the part to your top to fit it');
  }

  /** Where a pointer is: the pinch itself when the hand is near the forge, else along its ray. */
  private pointAt(h: HandState, out: Vector3): Vector3 {
    this.displayHolder.getWorldPosition(this.q);
    if (h.pinch.distanceTo(this.q) < 0.6 || !h.hasRay) return out.copy(h.pinch);
    // Along the ray, as far out as the top is.
    const d = this.q.distanceTo(h.rayOrigin);
    return out.copy(h.rayDir).multiplyScalar(d).add(h.rayOrigin);
  }

  /** The build with this item fitted, or null when the item does not change the build. */
  private withItem(item: Item): TopBuild | null {
    const b = { ...this.build };
    if (item.kind === 'ring') b.ring = item.id;
    else if (item.kind === 'core') b.core = item.id;
    else if (item.kind === 'tip') b.tip = item.id;
    else if (item.kind === 'preset') return { ...item.build, spin: this.build.spin, color: this.build.color };
    else return null;
    return b;
  }

  private fit(item: Item) {
    if (item.kind === 'spin') {
      this.build = { ...this.build, spin: item.value };
      this.say(item.value === 1 ? 'Right spin' : 'Left spin: steals spin from right spinners');
    } else if (item.kind === 'color') {
      this.build = { ...this.build, color: item.value };
      this.say('New color');
    } else {
      const next = this.withItem(item)!;
      const w = weightOf(next);
      if (w > WEIGHT_LIMIT) {
        playRemove();
        this.say(`Too heavy: ${w} g of ${WEIGHT_LIMIT} g. Pick a lighter part`);
        return;
      }
      this.build = next;
      if (item.kind === 'core') {
        // The core locks onto the ring with one click per tooth.
        this.clicks = CORES.find((c) => c.id === item.id)!.teeth;
        this.clickTimer = 0.15;
      }
      this.say(item.kind === 'preset' ? `${item.name}: ${buildName(next)}` : `${item.name} fitted: ${item.blurb}`);
    }
    playPlace();
    this.rebuildDisplay();
  }

  private press(id: string) {
    if (id.startsWith('tab:')) {
      this.showTab(Number(id.slice(4)), 1);
      this.logPending = true;
      return;
    }
    if (id === 'back') return this.hooks.exit();
    if (id === 'test') return this.hooks.test(this.build);
    if (id === 'done') {
      saveBuild(this.build);
      playPlace();
      return this.hooks.done(this.build);
    }
  }

  private rebuildDisplay() {
    this.display?.dispose();
    this.display = new TopView(this.build, this.build.color);
    // Only the body: no floor shadow on the spindle.
    this.displayHolder.add(this.display.root);
    this.cardKey = '';
    this.showCard(null);
  }

  private showCard(preview: TopBuild | null) {
    const key = JSON.stringify([this.build, preview]);
    if (key === this.cardKey) return;
    this.cardKey = key;
    this.card.draw(this.build, preview);
  }

  private showTab(t: number, direction: number) {
    if (direction !== 0) this.slide = (t > this.tab ? 1 : -1) * 0.12;
    this.tab = t;
    for (const s of this.slots) {
      const on = s.tab === t;
      s.model.visible = on;
      s.name.visible = on;
    }
    if (direction !== 0) playPick();
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

  private buttonUnder(h: HandState, touchOnly = false): Button | null {
    for (const b of [...this.tabs, ...this.buttons]) {
      b.mesh.getWorldPosition(this.p);
      if (this.distance(h, this.p, 0.03 * BOARD_SCALE, touchOnly ? 0 : (b.height / 2) * BOARD_SCALE) < Infinity) return b;
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

  private say(text: string) {
    if (text === this.statusText) return;
    this.statusText = text;
    const old = this.status;
    this.status = tag(text, 0.22, 34);
    this.status.position.copy(old.position);
    this.board.remove(old);
    old.geometry.dispose();
    const mat = old.material as MeshBasicMaterial;
    mat.map?.dispose();
    mat.dispose();
    this.board.add(this.status);
    if (import.meta.env.DEV) console.log(`[FORGE] ${text} | ${buildName(this.build)} ${weightOf(this.build)} g spin ${this.build.spin}`);
  }

  /** Turns an object upright toward the head: +Z toward the head, +Y up. */
  private face(o: Object3D, head: Vector3) {
    const z = this.depth.copy(head).sub(o.position).setY(0).normalize();
    const x = this.right.crossVectors(this.up.set(0, 1, 0), z).normalize();
    const y = this.up.crossVectors(z, x);
    o.quaternion.setFromRotationMatrix(this.basis.makeBasis(x, y, z));
  }

  /** Dev: board item and button positions (world), for driving the forge from the emulator CLI. */
  debugPositions(): string {
    this.root.updateWorldMatrix(true, true);
    const at = (o: Object3D) => o.getWorldPosition(new Vector3()).toArray().map((v) => v.toFixed(3)).join(',');
    return [
      // Item homes, not their current spot, so a tab's slide-in does not throw the numbers off.
      ...this.slots.filter((s) => s.tab === this.tab).map((s) => `${s.item.name.replace(/ /g, '_')}@${this.board.localToWorld(s.home.clone()).toArray().map((v) => v.toFixed(3)).join(',')}`),
      ...[...this.tabs, ...this.buttons].map((b) => `${b.id}@${at(b.mesh)}`),
      `top@${at(this.displayHolder)}`,
    ].join(' ');
  }
}

/** The model shown on the board for an item, sized to fit its slot. */
function itemModel(item: Item): Object3D {
  const g = new Group();
  if (item.kind === 'ring') {
    const ring = RINGS.find((r) => r.id === item.id)!;
    g.add(...ringMeshes(ring, 0xb9ada0, -0.01));
    g.scale.setScalar(0.65);
  } else if (item.kind === 'core') {
    const m = coreMesh(CORES.find((c) => c.id === item.id)!);
    m.position.y -= 0.004;
    g.add(m);
    g.scale.setScalar(1.9);
  } else if (item.kind === 'tip') {
    const m = tipMesh(item.id);
    m.position.y -= 0.004;
    g.add(m);
    g.scale.setScalar(2.2);
  } else if (item.kind === 'spin') {
    // A curved arrow showing the spin direction (seen from above, tipped toward the eyes).
    const mat = new MeshBasicMaterial({ color: 0xffb347 });
    const arc = new Mesh(new TorusGeometry(0.012, 0.0022, 6, 24, Math.PI * 1.5), mat);
    const head = new Mesh(new ConeGeometry(0.004, 0.008, 12), mat);
    head.position.set(0.012, -0.003, 0);
    head.rotation.z = Math.PI;
    if (item.value === -1) g.scale.x = -1;
    g.add(arc, head);
  } else if (item.kind === 'color') {
    g.add(new Mesh(new SphereGeometry(0.011, 20, 14), new MeshMatcapMaterial({ matcap: makeMatcap('clay', item.value) })));
  } else if (item.kind === 'preset') {
    const view = new TopView(item.build, item.build.color);
    view.root.position.y = -0.012;
    g.add(view.root);
    g.scale.setScalar(0.45);
  }
  g.rotation.x = item.kind === 'spin' ? 0 : 0.6;
  return g;
}

/** A card beside your top: its name, weight against the limit, and box-style stat bars. */
class StatsCard {
  readonly mesh: Mesh;
  private canvas = document.createElement('canvas');
  private tex: CanvasTexture;

  constructor() {
    this.canvas.width = 512;
    this.canvas.height = 400;
    this.tex = new CanvasTexture(this.canvas);
    this.tex.colorSpace = SRGBColorSpace;
    this.mesh = new Mesh(new PlaneGeometry(0.16, 0.125), new MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false }));
    this.mesh.name = 'forge-stats';
  }

  /** Draws the build; a preview build shows as gains (green) and losses (red) on each bar. */
  draw(build: TopBuild, preview: TopBuild | null) {
    const g = this.canvas.getContext('2d')!;
    g.clearRect(0, 0, 512, 400);
    g.fillStyle = 'rgba(30, 24, 20, 0.88)';
    g.beginPath();
    g.roundRect(4, 4, 504, 392, 30);
    g.fill();
    const spec = specFromBuild(build);
    const now = statsOf(spec);
    const next = preview ? statsOf(specFromBuild(preview)) : null;
    g.fillStyle = '#fff4e2';
    g.textBaseline = 'middle';
    g.font = 'bold 38px system-ui, sans-serif';
    g.fillText(buildName(preview ?? build), 26, 44);
    g.font = '28px system-ui, sans-serif';
    const w = weightOf(preview ?? build);
    g.fillStyle = w > WEIGHT_LIMIT ? '#e0574a' : '#d8c8b4';
    g.fillText(`${roleOf(specFromBuild(preview ?? build))} · ${build.spin === 1 ? 'right' : 'left'} spin · ${w} / ${WEIGHT_LIMIT} g`, 26, 88);
    const rows: [keyof TopStats, string][] = [
      ['attack', 'Attack'],
      ['defense', 'Defense'],
      ['stamina', 'Stamina'],
      ['dash', 'Dash'],
      ['burst', 'Burst res.'],
    ];
    rows.forEach(([key, label], i) => {
      const y = 140 + i * 54;
      g.fillStyle = '#fff4e2';
      g.font = 'bold 28px system-ui, sans-serif';
      g.fillText(label, 26, y);
      const x0 = 190;
      const width = 290;
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(x0, y - 14, width, 28);
      const a = now[key] / 100;
      const b = next ? next[key] / 100 : a;
      g.fillStyle = '#ff9a3c';
      g.fillRect(x0, y - 14, width * Math.min(a, b), 28);
      if (b > a) {
        g.fillStyle = '#6fd36f';
        g.fillRect(x0 + width * a, y - 14, width * (b - a), 28);
      } else if (b < a) {
        g.fillStyle = '#e0574a';
        g.fillRect(x0 + width * b, y - 14, width * (a - b), 28);
      }
    });
    this.tex.needsUpdate = true;
  }
}
