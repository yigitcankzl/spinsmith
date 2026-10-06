/**
 * The forge: build your top with your hands, away from the arena (which hides meanwhile). Your
 * top floats large in the air in front of you, turning over a ring of light; the parts hang on the
 * tool panel of the smithy wall (tips, cores, rings, style, presets). Point at a part and pinch:
 * it flies to your hand.
 * - Pinch your top to pick it up: it follows your hand and turns with it, to look at from any side.
 *   Let go and it settles back on the anvil.
 * - Pinch a part on the shelf and bring it to your top (on the anvil or in your other hand): the
 *   top comes apart to show where it goes and that slot pulses; let go to fit it with a clack. The
 *   old part goes back to the shelf. Builds over the weight limit are refused.
 * - Tap a paint pot (or dip the top into it) to paint the top; spin tokens set its spin direction.
 * - Dunk the top in the quench bucket to save it and go home.
 */
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshMatcapMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
} from '@iwsdk/core';
import { playLocked, playPick, playPlace, playRemove } from './audio.js';
import { unlockHint } from './progress.js';
import type { Progress } from './progress.js';
import { tag } from './builder.js';
import { FONT, glass, GLASS_LIGHT, ORANGE, STEEL, TEXT, TEXT_DIM } from './ui.js';
import type { HandState } from './hands.js';
import { buildName, CORES, PRESETS, RINGS, roleOf, specFromBuild, statsOf, TIPS, WEIGHT_LIMIT, weightOf } from './parts.js';
import type { TopBuild, TopStats } from './parts.js';
import { ANVIL_AT } from './hub.js';
import type { Wall } from './wall.js';
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

export type Item =
  | { kind: 'ring' | 'core'; id: string; name: string; blurb: string }
  | { kind: 'tip'; id: TopBuild['tip']; name: string; blurb: string }
  | { kind: 'spin'; value: 1 | -1; name: string; blurb: string }
  | { kind: 'color'; value: number; name: string; blurb: string }
  | { kind: 'preset'; build: TopBuild; name: string; blurb: string };

/** Shelf rows, front (low) to back (high): label, items, item spacing. */
export const ROWS: [string, Item[], number][] = [
  ['TIPS', TIPS.map((t) => ({ kind: 'tip' as const, id: t.id, name: t.name, blurb: t.blurb })), 0.05],
  ['CORES', CORES.map((c) => ({ kind: 'core' as const, id: c.id, name: c.name, blurb: c.blurb })), 0.06],
  ['RINGS', RINGS.map((r) => ({ kind: 'ring' as const, id: r.id, name: r.name, blurb: r.blurb })), 0.058],
  [
    'STYLE',
    [
      { kind: 'spin', value: 1, name: 'Right spin', blurb: 'Spins clockwise' },
      { kind: 'spin', value: -1, name: 'Left spin', blurb: 'Steals spin from right spinners' },
      ...TOP_COLORS.slice(0, 4).map((value) => ({ kind: 'color' as const, value, name: 'Paint', blurb: 'Dip your top or tap the pot' })),
    ],
    0.05,
  ],
  ['PRESETS', PRESETS.map((p) => ({ kind: 'preset' as const, build: p.build, name: p.name, blurb: `A classic ${roleOf(specFromBuild(p.build))} top` })), 0.08],
];
/** Tool panel rows (wall space, m): row spacing, and how much larger than on the table parts hang. */
const ROW_GAP = 0.165;
const WALL_SCALE = 2.2;
/** The quench bucket stands beside the anvil, toward the player (arena-local). */
const BUCKET_AT = new Vector3(ANVIL_AT.x - 0.05, 0, ANVIL_AT.z + 0.12);
/** Your top floats this much larger than life (arena-local; the arena is drawn larger still). */
const DISPLAY_SCALE = 1.8;
/** It first floats this far (world m) ahead of the eyes, to the right and below them, clear of the wall. */
const FLOAT_AHEAD = 0.35;
const FLOAT_RIGHT = 0.22;
const FLOAT_BELOW = 0.2;
/** A carried part makes the top come apart within this distance, and fits within SNAP (world m). */
const EXPLODE_R = 0.3;
const SNAP = 0.15;
/** A carried top dipped this close to a paint pot is painted; this close to the bucket, saved (world m). */
const DIP = 0.12;
/** Pinch distances (world m): touching a thing, and a pointing ray passing this close. */
const GRAB_NEAR = 0.07;
const GRAB_RAY = 0.06;
/** A part picked from afar flies to the hand in this many seconds. */
const FLY_TIME = 0.3;
/** A part let go where it was picked up (a tap) fits straight away. */
const TAP_MOVE = 0.03;

interface Slot {
  item: Item;
  model: Object3D;
  home: Vector3;
  /** The card behind the part: its frame lights up when the part is on your top. */
  frame: MeshBasicMaterial;
  equipped: Mesh;
  /** Seconds left of the flash after the part was fitted. */
  flash: number;
  /** Its scale on the wall. */
  size: number;
  /** Unlock key ('ring:hook'), or null for things never locked; its LOCKED tag. */
  key: string | null;
  lock: Mesh | null;
  face: MeshBasicMaterial;
}

/** The unlock key of a shelf item, or null when it is never locked. */
export function itemKey(item: Item): string | null {
  if (item.kind === 'ring' || item.kind === 'core' || item.kind === 'tip') return `${item.kind}:${item.id}`;
  if (item.kind === 'color') return `paint:${TOP_COLORS.indexOf(item.value)}`;
  return null;
}

/** Tile frame colors: idle, pointed at, on your top. */
const FRAME_IDLE = new Color(0x2a3446);
const FRAME_HOVER = new Color(0xdfe8f5);
const FRAME_ON = new Color(ORANGE);

export interface ForgeHooks {
  /** Save the build and go back. */
  done(build: TopBuild): void;
  /** The first session's new part was fitted. */
  fitted?(): void;
}

type Target = { kind: 'slot'; slot: Slot } | { kind: 'top' } | { kind: 'bucket' };

export class Forge {
  /** Lives in arena-local space (a child of the arena root). */
  readonly root = new Group();
  build: TopBuild = loadBuild();
  private shelf = new Group();
  private slots: Slot[] = [];
  private bucket = new Group();
  private display!: TopView;
  /** The top's resting spot on the anvil, and the holder that is carried around. */
  /** Where your top floats (arena-local): first set from the head, then wherever you leave it. */
  private floatSpot = new Vector3(0, 0.2, 0.05);
  private floatSet = false;
  private halo: Mesh;
  /** Tips the floating top toward the eyes so its face shows; it spins about its own axis inside. */
  private displayTilt = new Group();
  private displayHolder = new Group();
  private card = new StatsCard();
  private cardKey = '';
  private message = '';
  private heldPart: { item: Item; model: Object3D; hand: HandState; startAt: Vector3; from: Vector3; fly: number } | null = null;
  /** The top in hand: the hand, and the hand's and top's orientations when it was picked up. */
  private heldTop: { hand: HandState; handQuat: Quaternion; topQuat: Quaternion } | null = null;
  private explode = 0;
  /** The part the first session asks the player to fit, if any. */
  private focus: Slot | null = null;
  /** The halo flares when a part is fitted. */
  private glow = 0;
  private readonly white = new Color(0xffffff);
  /** The paint pot the carried top is dipped in (so a dip paints once). */
  private dippedIn: Slot | null = null;
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
  private readonly topAt = new Vector3();
  private readonly quat = new Quaternion();
  private readonly up = new Vector3();
  private readonly right = new Vector3();
  private readonly depth = new Vector3();
  private readonly basis = new Matrix4();

  constructor(
    private readonly hooks: ForgeHooks,
    private readonly wall: Wall,
    private readonly progress: Progress,
  ) {
    this.root.name = 'top-forge';
    this.buildShelf();
    this.wall.tools.add(this.shelf);
    this.buildBucket();
    // A ring of light under the floating top.
    this.halo = new Mesh(new TorusGeometry(0.035, 0.0018, 8, 48).rotateX(Math.PI / 2), new MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0.8 }));
    this.displayHolder.position.copy(this.floatSpot);
    this.displayHolder.scale.setScalar(DISPLAY_SCALE);
    this.displayTilt.rotation.x = 0.6;
    this.displayHolder.add(this.displayTilt);
    // The stats card floats to the right of your top, close enough to read.
    this.card.mesh.scale.setScalar(0.6);
    this.root.add(this.bucket, this.halo, this.displayHolder, this.card.mesh);
    this.rebuildDisplay();
    this.root.visible = false;
  }

  /** A build with any part you have not unlocked swapped for a starter (old saves, fresh progress). */
  allowed(b: TopBuild): TopBuild {
    const open = (key: string) => this.progress.isUnlocked(key) || unlockHint(key) === null;
    const out = { ...b };
    if (!open(`ring:${out.ring}`)) out.ring = PRESETS[0].build.ring;
    if (!open(`core:${out.core}`)) out.core = PRESETS[0].build.core;
    if (!open(`tip:${out.tip}`)) out.tip = PRESETS[0].build.tip;
    const paint = TOP_COLORS.indexOf(out.color);
    if (paint >= 0 && !open(`paint:${paint}`)) out.color = TOP_COLORS[0];
    return out;
  }

  /** Opens the forge; with a focus key (the first session's new part) only that part is called out. */
  open(focus: string | null = null) {
    this.floatSet = false;
    this.build = this.allowed(loadBuild());
    this.rebuildDisplay();
    this.root.visible = true;
    this.dropAll();
    this.focus = focus ? (this.slots.find((s) => s.key === focus) ?? null) : null;
    this.say(this.focus ? `Your new part: bring the ${this.focus.item.name} ${this.focus.item.kind} to your top` : 'Pick up your top, or bring it a part from the shelf');
    this.logPending = true;
  }

  close() {
    this.root.visible = false;
    this.dropAll();
  }

  private dropAll() {
    if (this.heldPart) this.root.remove(this.heldPart.model);
    this.heldPart = null;
    this.heldTop = null;
    this.displayHolder.position.copy(this.floatSpot);
    this.displayHolder.quaternion.identity();
  }

  /** The parts on the wall's tool panel hide while the workshop hangs its board there. */
  showShelf(on: boolean) {
    this.shelf.visible = on;
  }

  /** Sets where the top first floats and turns the bucket toward the head (arena-local). */
  place(head: Vector3) {
    if (!this.floatSet) {
      // Once, when the forge opens: ahead and to the right, below the line of sight to the wall.
      this.floatSet = true;
      const k = 1 / this.root.parent!.getWorldScale(this.p).x;
      this.floatSpot.set(head.x + FLOAT_RIGHT * k, head.y - FLOAT_BELOW * k, head.z - FLOAT_AHEAD * k);
      this.displayHolder.position.copy(this.floatSpot);
    }
    this.halo.position.set(this.floatSpot.x, this.floatSpot.y - 0.03, this.floatSpot.z);
    this.glow = Math.max(0, this.glow - 0.03);
    this.halo.scale.setScalar(1 + 0.04 * Math.sin(this.time * 3) + 0.8 * this.glow);
    (this.halo.material as MeshBasicMaterial).color.setHex(0xff9a3c).lerp(this.white, this.glow);
    this.face(this.bucket, head);
    this.card.mesh.position.set(this.floatSpot.x + 0.14, this.floatSpot.y + 0.05, this.floatSpot.z - 0.02);
    this.face(this.card.mesh, head);
  }

  update(pointers: HandState[], dt: number) {
    this.time += dt;
    if (import.meta.env.DEV && this.logPending) {
      this.logPending = false;
      console.log(`[FORGE] ${this.debugPositions()}`);
    }
    // A core lock clicks the top round tooth by tooth.
    if (this.clicks > 0 && (this.clickTimer -= dt) <= 0) {
      this.clicks--;
      this.clickTimer = 0.07;
      this.twist += 0.35;
      playPick();
    }
    if (this.twist > 0) {
      const step = Math.min(this.twist, dt * 6);
      this.display.root.rotation.y += step;
      this.twist -= step;
    }

    // New pinches: a hand touching something goes first, then pointing rays (and the dev gaze).
    for (const touchOnly of [true, false]) {
      for (const h of pointers) {
        if (!h.tracked || !h.justPinched || h === this.heldPart?.hand || h === this.heldTop?.hand) continue;
        const target = this.under(h, touchOnly);
        if (target) this.pinch(target, h);
      }
    }
    this.updateTop(dt);
    this.updatePart(dt);
    // Hover: shelf items under a free pointer lift and turn.
    let hovered: Slot | null = null;
    for (const h of pointers) {
      if (!h.tracked || h === this.heldPart?.hand || h === this.heldTop?.hand) continue;
      const t = this.under(h, false);
      if (t?.kind === 'slot') hovered ??= t.slot;
    }
    for (const s of this.slots) {
      const locked = this.locked(s);
      if (s.lock) s.lock.visible = locked;
      s.face.color.setHex(locked ? 0x07090e : 0x111824);
      const on = s === hovered && !locked;
      const fitted = this.isOn(s.item);
      s.flash = Math.max(0, s.flash - dt);
      s.equipped.visible = fitted;
      s.frame.color.copy(fitted ? FRAME_ON : on ? FRAME_HOVER : FRAME_IDLE);
      // A part just fitted flashes white and pulses.
      if (s.flash > 0) s.frame.color.lerp(this.white, s.flash / 0.8);
      // The first session's new part breathes until it is fitted.
      if (s === this.focus) s.frame.color.copy(FRAME_ON).lerp(this.white, 0.5 + 0.5 * Math.sin(this.time * 5));
      const pulse = s.flash > 0 ? 1 + 0.25 * Math.sin((s.flash / 0.8) * Math.PI) : 1;
      s.model.position.set(s.home.x, s.home.y, s.home.z + (on ? 0.03 + 0.005 * Math.sin(this.time * 8) : 0));
      s.model.scale.setScalar(s.size * (on ? 1.15 : 1) * pulse * (locked ? 0.55 : 1));
    }
    if (!this.heldPart) this.showCard(hovered ? this.withItem(hovered.item) : null);
  }

  private pinch(target: Target, h: HandState) {
    if (target.kind === 'bucket') return this.save();
    if (target.kind === 'top') {
      if (this.heldTop) return;
      this.heldTop = { hand: h, handQuat: h.rayQuat.clone(), topQuat: this.displayHolder.quaternion.clone() };
      playPick();
      this.say('Move it anywhere and let go: it stays. Dunk it in the bucket to save');
      return;
    }
    if (this.heldPart) return;
    if (this.locked(target.slot)) {
      playLocked();
      this.say(`Locked: ${unlockHint(target.slot.key!)}`);
      return;
    }
    const item = target.slot.item;
    const model = itemModel(item);
    this.root.add(model);
    // From the wall the part flies to the hand.
    const from = target.slot.model.getWorldPosition(new Vector3());
    this.heldPart = { item, model, hand: h, startAt: this.pointAt(h, new Vector3()), from, fly: h.pinch.distanceTo(from) > 0.3 ? 0 : 1 };
    playPick();
    this.say(`${item.name}: ${item.blurb}`);
  }

  /** The top: follows and turns with the hand holding it, else eases back onto the anvil. */
  private updateTop(dt: number) {
    const held = this.heldTop;
    if (!held) {
      // Floats with a slow bob.
      this.q.copy(this.floatSpot).setY(this.floatSpot.y + 0.004 * Math.sin(this.time * 1.6));
      this.displayHolder.position.lerp(this.q, Math.min(1, dt * 10));
      this.displayHolder.quaternion.slerp(this.quat.identity(), Math.min(1, dt * 8));
      if (!this.heldPart) this.display.root.rotation.y += dt * 0.5;
      return;
    }
    const h = held.hand;
    const at = this.pointAt(h, this.at);
    this.root.worldToLocal(this.displayHolder.position.copy(at));
    // Turn with the hand: the hand's rotation since the pickup, applied to the top.
    this.quat.copy(h.rayQuat).multiply(this.q2.copy(held.handQuat).invert());
    this.displayHolder.quaternion.copy(this.quat).multiply(held.topQuat);
    // Dipped into a paint pot: painted once per dip.
    const pot = this.slots.find((s) => s.item.kind === 'color' && s.model.getWorldPosition(this.p).distanceTo(at) < DIP) ?? null;
    if (pot && pot !== this.dippedIn) this.fit(pot.item);
    this.dippedIn = pot;
    if (h.pinching && h.tracked) return;
    this.heldTop = null;
    this.bucket.getWorldPosition(this.p);
    if (at.distanceTo(this.p) < DIP * 1.5) return this.save();
    // Left anywhere else, it floats right there.
    this.floatSpot.copy(this.displayHolder.position);
    playPlace();
  }

  /** A carried part: follows the pointer; near the top, the top comes apart to show its slot. */
  private updatePart(dt: number) {
    const held = this.heldPart;
    this.displayHolder.getWorldPosition(this.topAt);
    if (!held) {
      this.explode = Math.max(0, this.explode - 0.08);
      this.display.explode(this.explode, null, this.time);
      return;
    }
    const h = held.hand;
    const at = this.pointAt(h, this.at);
    held.fly = Math.min(1, held.fly + dt / FLY_TIME);
    const k = 1 - (1 - held.fly) ** 3;
    this.root.worldToLocal(held.model.position.copy(held.from).lerp(at, k));
    held.model.rotation.y = this.time * 2;
    const d = at.distanceTo(this.topAt);
    const slotKind = held.item.kind === 'ring' || held.item.kind === 'core' || held.item.kind === 'tip' ? held.item.kind : null;
    const target = slotKind && d < EXPLODE_R ? Math.min(1, (EXPLODE_R - d) / (EXPLODE_R - SNAP) ) : 0;
    this.explode += (target - this.explode) * 0.25;
    this.display.explode(this.explode, slotKind, this.time);
    this.showCard(this.withItem(held.item));
    if (h.pinching && h.tracked) return;
    this.root.remove(held.model);
    this.heldPart = null;
    if (d < SNAP || at.distanceTo(held.startAt) < TAP_MOVE) this.fit(held.item);
    else {
      playRemove();
      this.say('Bring the part to your top to fit it');
    }
  }

  /** Where a pointer is: the pinch itself when the hand is near the forge, else along its ray. */
  private pointAt(h: HandState, out: Vector3): Vector3 {
    this.root.localToWorld(this.q.copy(this.floatSpot));
    if (h.pinch.distanceTo(this.q) < 0.9 || !h.hasRay) return out.copy(h.pinch);
    // Along the ray, as far out as the anvil is.
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

  private locked(s: Slot) {
    return s.key !== null && !this.progress.isUnlocked(s.key) && unlockHint(s.key) !== null;
  }

  /** True when the item is part of your top right now. */
  private isOn(item: Item): boolean {
    const b = this.build;
    switch (item.kind) {
      case 'ring':
        return b.ring === item.id;
      case 'core':
        return b.core === item.id;
      case 'tip':
        return b.tip === item.id;
      case 'spin':
        return b.spin === item.value;
      case 'color':
        return b.color === item.value;
      default:
        return b.ring === item.build.ring && b.core === item.build.core && b.tip === item.build.tip;
    }
  }

  private fit(item: Item) {
    const slot = this.slots.find((s) => s.item === item);
    const before = JSON.stringify(this.build);
    if (item.kind === 'spin') {
      this.build = { ...this.build, spin: item.value };
      this.say(item.value === 1 ? 'Right spin' : 'Left spin: steals spin from right spinners');
    } else if (item.kind === 'color') {
      this.build = { ...this.build, color: item.value };
      this.say('Painted');
    } else {
      const next = this.withItem(item)!;
      const w = weightOf(next);
      if (w > WEIGHT_LIMIT) {
        playRemove();
        this.say(`Too heavy by ${w - WEIGHT_LIMIT} g. ${this.lighterFix(next, item.kind)}`);
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
    if (slot && JSON.stringify(this.build) !== before) {
      slot.flash = 0.8;
      this.glow = 1;
      if (slot === this.focus) {
        this.focus = null;
        this.say('Fitted! Dunk your top in the bucket to save it, then play');
        this.hooks.fitted?.();
      }
    }
  }

  /**
   * The smallest change that brings an overweight build under the limit: the unlocked part, in
   * one of the other two slots, that changes the weight least while fitting.
   */
  private lighterFix(b: TopBuild, keep: string): string {
    const open = (key: string) => this.progress.isUnlocked(key) || unlockHint(key) === null;
    let best: { text: string; cost: number } | null = null;
    const consider = (kind: 'ring' | 'core' | 'tip', id: string, name: string, weight: number, current: number) => {
      if (kind === keep || !open(`${kind}:${id}`)) return;
      const total = weightOf(b) - current + weight;
      if (total > WEIGHT_LIMIT) return;
      const cost = current - weight;
      if (cost > 0 && (!best || cost < best.cost)) best = { text: `Try the ${name} ${kind} instead`, cost };
    };
    for (const r of RINGS) consider('ring', r.id, r.name, r.weight, RINGS.find((x) => x.id === b.ring)!.weight);
    for (const c of CORES) consider('core', c.id, c.name, c.weight, CORES.find((x) => x.id === b.core)!.weight);
    for (const t of TIPS) consider('tip', t.id, t.name, t.weight, TIPS.find((x) => x.id === b.tip)!.weight);
    return (best as { text: string } | null)?.text ?? 'Pick a lighter part';
  }

  private save() {
    saveBuild(this.build);
    playPlace();
    this.dropAll();
    this.hooks.done(this.build);
  }

  private rebuildDisplay() {
    this.display?.dispose();
    this.display = new TopView(this.build, this.build.color);
    this.displayTilt.add(this.display.root);
    this.explode = 0;
    this.cardKey = '';
    this.showCard(null);
  }

  private showCard(preview: TopBuild | null) {
    const key = JSON.stringify([this.build, preview, this.message]);
    if (key === this.cardKey) return;
    this.cardKey = key;
    this.card.draw(this.build, preview, this.message);
  }

  /** What a pointer would pinch: the top, a shelf item, or the bucket (nearest wins). */
  private under(h: HandState, touchOnly: boolean): Target | null {
    let best: Target | null = null;
    let bestD = Infinity;
    const consider = (o: Object3D, t: Target, near = GRAB_NEAR) => {
      o.getWorldPosition(this.p);
      const d = this.distance(h, this.p, near, touchOnly ? 0 : GRAB_RAY);
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    };
    if (!this.heldTop) consider(this.displayHolder, { kind: 'top' }, GRAB_NEAR * 1.5);
    for (const slot of this.slots) consider(slot.model, { kind: 'slot', slot });
    consider(this.bucket, { kind: 'bucket' });
    return best;
  }

  /** Near pinch distance, or ray distance (+ a small bias), or Infinity when out of reach. */
  private distance(h: HandState, point: Vector3, near: number, ray: number) {
    const d = h.pinch.distanceTo(point);
    if (d < near) return d;
    if (!h.hasRay) return Infinity;
    const t = this.hit.copy(point).sub(h.rayOrigin).dot(h.rayDir);
    if (t <= 0) return Infinity;
    const off = this.hit.copy(h.rayDir).multiplyScalar(t).add(h.rayOrigin).distanceTo(point);
    return off < ray ? off + 0.05 : Infinity;
  }

  private say(text: string) {
    this.message = text;
    this.cardKey = '';
    this.showCard(null);
    if (import.meta.env.DEV) console.log(`[FORGE] ${text} | ${buildName(this.build)} ${weightOf(this.build)} g spin ${this.build.spin}`);
  }

  /** Turns an object upright toward the head: +Z toward the head, +Y up. */
  private face(o: Object3D, head: Vector3) {
    const z = this.depth.copy(head).sub(o.position).setY(0).normalize();
    const x = this.right.crossVectors(this.up.set(0, 1, 0), z).normalize();
    const y = this.up.crossVectors(z, x);
    o.quaternion.setFromRotationMatrix(this.basis.makeBasis(x, y, z));
  }

  /** The tool panel on the wall: a row of parts on pegs per kind, its name above the row. */
  private buildShelf() {
    ROWS.forEach(([label, items, gap], r) => {
      const y = 0.33 - r * ROW_GAP;
      const name = tag(label, 0.12, 44);
      name.position.set(-0.47, y, 0.005);
      this.shelf.add(name);
      const step = Math.max(0.15, gap * WALL_SCALE * 1.25);
      items.forEach((item, c) => {
        // Tips and cores stand up from their base, so they sit lower on the card.
        const low = item.kind === 'tip' || item.kind === 'core';
        const home = new Vector3((c - (items.length - 1) / 2) * step + 0.08, y + (low ? -0.028 : 0.008), 0.04);
        // A card behind each part: a lit frame, a lighter face, the part's name below.
        const w = Math.min(step - 0.012, 0.16);
        const frame = new MeshBasicMaterial({ color: FRAME_IDLE.clone() });
        const border = new Mesh(new PlaneGeometry(w, ROW_GAP - 0.012), frame);
        border.position.set(home.x, y, 0.004);
        const faceMat = new MeshBasicMaterial({ color: 0x111824 });
        const face = new Mesh(new PlaneGeometry(w - 0.008, ROW_GAP - 0.02), faceMat);
        face.position.set(home.x, y, 0.005);
        const label = tag(item.name, w * 0.95, 40);
        label.position.set(home.x, y - ROW_GAP / 2 + 0.022, 0.007);
        const equipped = tag('EQUIPPED', w * 0.8, 40);
        equipped.position.set(home.x, y + ROW_GAP / 2 - 0.02, 0.007);
        equipped.visible = false;
        // Rings and presets show their top face; tips and cores their profile; pots their paint.
        const model = new Group();
        const inner = itemModel(item);
        inner.rotation.x = item.kind === 'tip' || item.kind === 'core' ? 0.35 : item.kind === 'color' ? 1.35 : 1.1;
        model.add(inner);
        model.position.copy(home);
        // Rings and preset tops are wide: a little smaller, so they stay on their card.
        const size = WALL_SCALE * (item.kind === 'ring' ? 0.98 : item.kind === 'preset' ? 0.78 : item.kind === 'core' ? 0.8 : 1.3);
        model.scale.setScalar(size);
        // Locked parts show how they are earned.
        const key = itemKey(item);
        const hint = key ? unlockHint(key) : null;
        let lock: Mesh | null = null;
        if (hint) {
          lock = tag(`LOCKED · ${hint}`, w * 0.95, 34);
          lock.position.set(home.x, y - 0.012, 0.1);
        }
        this.shelf.add(border, face, label, equipped, model, ...(lock ? [lock] : []));
        this.slots.push({ item, model, home, frame, equipped, flash: 0, size, key, lock, face: faceMat });
      });
    });
  }

  /** The quench bucket: dunk your top in it to save and go home. */
  private buildBucket() {
    this.bucket.position.copy(BUCKET_AT);
    const wall = new Mesh(new CylinderGeometry(0.035, 0.03, 0.05, 24, 1, true), new MeshMatcapMaterial({ matcap: makeMatcap('metal', 0x4a4e57), side: 2 }));
    wall.position.y = 0.025;
    const hoop = new Mesh(new TorusGeometry(0.035, 0.0025, 8, 32).rotateX(Math.PI / 2), new MeshMatcapMaterial({ matcap: makeMatcap('metal', 0x8a8f99) }));
    hoop.position.y = 0.05;
    const water = new Mesh(new CircleGeometry(0.033, 24).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0x3f8fb8, transparent: true, opacity: 0.8 }));
    water.position.y = 0.042;
    const sign = tag('SAVE', 0.1, 48);
    sign.position.set(0, 0.09, 0);
    this.bucket.add(wall, hoop, water, sign);
  }

  /** Dev: world positions of the top, the shelf items and the bucket, for the emulator CLI. */
  debugPositions(): string {
    this.root.updateWorldMatrix(true, true);
    const at = (o: Object3D) => o.getWorldPosition(new Vector3()).toArray().map((v) => v.toFixed(3)).join(',');
    return [
      `top@${at(this.displayHolder)}`,
      ...this.slots.map((s) => `${s.item.name.replace(/ /g, '_')}${s.item.kind === 'color' ? this.slots.indexOf(s) : ''}@${at(s.model)}`),
      `bucket@${at(this.bucket)}`,
    ].join(' ');
  }

  private readonly q2 = new Quaternion();
}

/** The model of a shelf item, sized to be easy to grab. */
export function itemModel(item: Item): Object3D {
  const g = new Group();
  if (item.kind === 'ring') {
    const ring = RINGS.find((r) => r.id === item.id)!;
    g.add(...ringMeshes(ring, 0xb9ada0, 0));
    g.scale.setScalar(1.05);
  } else if (item.kind === 'core') {
    g.add(coreMesh(CORES.find((c) => c.id === item.id)!));
    g.scale.setScalar(2);
  } else if (item.kind === 'tip') {
    g.add(tipMesh(item.id));
    g.scale.setScalar(2.2);
  } else if (item.kind === 'spin') {
    // A token with a curved arrow showing the spin direction.
    const mat = new MeshBasicMaterial({ color: 0xffb347 });
    const coin = new Mesh(new CylinderGeometry(0.016, 0.016, 0.004, 24), new MeshMatcapMaterial({ matcap: makeMatcap('metal', 0x5d6068) }));
    const arc = new Mesh(new TorusGeometry(0.01, 0.0018, 6, 24, Math.PI * 1.5).rotateX(-Math.PI / 2), mat);
    arc.position.y = 0.003;
    const head = new Mesh(new ConeGeometry(0.0035, 0.007, 12).rotateZ(-Math.PI / 2), mat);
    head.position.set(0.0, 0.003, 0.01);
    if (item.value === -1) g.scale.x = -1;
    g.add(coin, arc, head);
  } else if (item.kind === 'color') {
    // A paint pot.
    const pot = new Mesh(new CylinderGeometry(0.014, 0.012, 0.018, 20), new MeshMatcapMaterial({ matcap: makeMatcap('metal', 0x7d828c) }));
    pot.position.y = 0.009;
    const paint = new Mesh(new CircleGeometry(0.0125, 20).rotateX(-Math.PI / 2), new MeshMatcapMaterial({ matcap: makeMatcap('clay', item.value) }));
    paint.position.y = 0.0186;
    g.add(pot, paint);
  } else if (item.kind === 'preset') {
    const view = new TopView(item.build, item.build.color);
    g.add(view.root);
    g.scale.setScalar(0.9);
  }
  return g;
}

/** A card beside your top: its name, weight against the limit, and box-style stat bars. */
class StatsCard {
  readonly mesh: Mesh;
  private canvas = document.createElement('canvas');
  private tex: CanvasTexture;

  constructor() {
    this.canvas.width = 512;
    this.canvas.height = 470;
    this.tex = new CanvasTexture(this.canvas);
    this.tex.colorSpace = SRGBColorSpace;
    this.mesh = new Mesh(new PlaneGeometry(0.16, 0.147), new MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false }));
    this.mesh.name = 'forge-stats';
  }

  /** Draws the build; a preview build shows as gains (green) and losses (red) on each bar. */
  draw(build: TopBuild, preview: TopBuild | null, message: string) {
    const g = this.canvas.getContext('2d')!;
    glass(g, 512, 470, STEEL, GLASS_LIGHT);
    const spec = specFromBuild(build);
    const now = statsOf(spec);
    const next = preview ? statsOf(specFromBuild(preview)) : null;
    g.fillStyle = TEXT;
    g.textBaseline = 'middle';
    g.font = `700 38px ${FONT}`;
    g.fillText(buildName(preview ?? build), 26, 44);
    g.font = `28px ${FONT}`;
    const w = weightOf(preview ?? build);
    g.fillStyle = w > WEIGHT_LIMIT ? '#ff5a4a' : TEXT_DIM;
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
      g.fillStyle = TEXT;
      g.font = `700 28px ${FONT}`;
      g.fillText(label, 26, y);
      const x0 = 190;
      const width = 290;
      g.fillStyle = 'rgba(255,255,255,0.08)';
      g.fillRect(x0, y - 14, width, 28);
      const a = now[key] / 100;
      const b = next ? next[key] / 100 : a;
      const fill = g.createLinearGradient(x0, 0, x0 + width, 0);
      fill.addColorStop(0, '#ff6a1a');
      fill.addColorStop(1, '#ffb347');
      g.fillStyle = fill;
      g.fillRect(x0, y - 14, width * Math.min(a, b), 28);
      if (b > a) {
        g.fillStyle = '#6fd36f';
        g.fillRect(x0 + width * a, y - 14, width * (b - a), 28);
      } else if (b < a) {
        g.fillStyle = '#e0574a';
        g.fillRect(x0 + width * b, y - 14, width * (a - b), 28);
      }
    });
    // What just happened, or what to do next.
    g.fillStyle = STEEL;
    let size = 26;
    do g.font = `${size--}px ${FONT}`;
    while (g.measureText(message).width > 470 && size > 14);
    g.fillText(message, 26, 425);
    this.tex.needsUpdate = true;
  }
}
