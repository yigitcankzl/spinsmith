/**
 * The forge is the arena, transformed: its floor sinks, an anvil rises at the near third of the
 * bowl with your top on it, drawers slide out of the near rim and the stats rise on the far rim.
 * Everything is within a seated arm's reach and used the same way: pinch, carry, drop.
 * - Four drawer tabs on the near rim (Ring, Core, Tip, Style) choose which parts lie on the tray,
 *   a half circle around the anvil's near side. One kind at a time, at most six parts.
 * - Pinch a part and bring it to your top: the top comes apart to show where it goes and that
 *   slot pulses; let go to fit it with a clack. A tap fits it too. Builds over the weight limit
 *   are refused.
 * - Pinch your top to pick it up and turn it; let go and it settles back on the anvil. Dip it in
 *   a paint pot to paint it; spin tokens set its spin direction.
 * - Drop the top in the quench slot beside the anvil to save it and go home.
 */
import {
  BoxGeometry,
  Color,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshMatcapMaterial,
  Object3D,
  Quaternion,
  TorusGeometry,
  Vector3,
} from '@iwsdk/core';
import { playDrawer, playLocked, playMachine, playPick, playPlace, playRemove } from './audio.js';
import { unlockHint } from './progress.js';
import type { Progress } from './progress.js';
import { ORANGE, TEXT_DIM } from './ui.js';
import { tag } from './builder.js';
import { DialPlate, popIn, RimTabs, rimSlot, rowSpots } from './rim.js';
import { TAB_LINE, traySpot, WORK as REACH_WORK } from './reach.js';
import type { HandState } from './hands.js';
import { buildName, CORES, migrateBuild, EMBLEM_COLORS, EMBLEM_NAMES, PRESETS, RINGS, roleOf, SEAL_BLURBS, SEAL_NAMES, specFromBuild, statsOf, TIPS, WEIGHT_LIMIT, weightOf } from './parts.js';
import { SEALS } from './sim.js';
import type { Seal } from './sim.js';
import type { TopBuild, TopStats } from './parts.js';
import { ANVIL_FACE, anvilModel } from './hub.js';
import { coreMesh, makeMatcap, ringMeshes, tipMesh, TopView } from './visuals.js';

const STORE_KEY = 'spinsmith.top.v1';

/** Body colors on offer: warm, so the player's top never looks like the (cool) opponent. */
/** The paints' names, shown over their pots. */
const PAINT_NAMES = ['Forge', 'Ember', 'Brass', 'Rust', 'Bone', 'Plum'];
export const TOP_COLORS = [0xe8661c, 0xc94a3a, 0xe0a63c, 0xb5654a, 0xe8d6b0, 0x9a5bb0];

export function loadBuild(): TopBuild {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const b = migrateBuild(JSON.parse(raw) as TopBuild);
      // The first paint was a salmon before the palette pass: old saves get the new forge orange.
      if (b.color === 0xd6784f) b.color = TOP_COLORS[0];
      if (RINGS.some((r) => r.id === b.ring) && CORES.some((c) => c.id === b.core) && TIPS.some((t) => t.id === b.tip) && weightOf(b) <= WEIGHT_LIMIT) return b;
    }
  } catch {
    // A broken save falls back to the default top.
  }
  return { ...PRESETS[0].build };
}

export function saveBuild(b: TopBuild) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(b));
  } catch {
    // Storage full or blocked (a private window): the top lives for this session only.
  }
}

export type Item =
  | { kind: 'ring' | 'core'; id: string; name: string; blurb: string }
  | { kind: 'tip'; id: TopBuild['tip']; name: string; blurb: string }
  | { kind: 'spin'; value: 1 | -1; name: string; blurb: string }
  | { kind: 'color'; value: number; name: string; blurb: string }
  | { kind: 'emblem'; name: string; blurb: string }
  | { kind: 'seal'; name: string; blurb: string }
  | { kind: 'preset'; build: TopBuild; name: string; blurb: string };

export type Drawer = 'ring' | 'core' | 'tip' | 'style';

/** Every part on offer by kind: label, items, spacing (also used to show unlocks). */
export const ROWS: [string, Item[], number][] = [
  ['TIPS', TIPS.map((t) => ({ kind: 'tip' as const, id: t.id, name: t.name, blurb: t.blurb })), 0.05],
  ['CORES', CORES.map((c) => ({ kind: 'core' as const, id: c.id, name: c.name, blurb: c.blurb })), 0.06],
  ['RINGS', RINGS.map((r) => ({ kind: 'ring' as const, id: r.id, name: r.name, blurb: r.blurb })), 0.058],
  [
    'STYLE',
    [
      { kind: 'spin', value: 1, name: 'Spin', blurb: 'Tap to turn it: left spin steals spin from right spinners' },
      ...TOP_COLORS.map((value, i) => ({ kind: 'color' as const, value, name: PAINT_NAMES[i] ?? 'Paint', blurb: 'Dip your top or tap the pot' })),
      { kind: 'emblem' as const, name: 'Emblem glow', blurb: 'Tap to step through the glows you have earned' },
      { kind: 'seal' as const, name: 'Strike', blurb: 'Tap to choose your strike: Anvil; Rush, Magnet, Tilt, Hammer and Ward open with levels' },
    ],
    0.05,
  ],
];
/** The drawers, left to right on the near rim, and which shelf row each opens. */
const DRAWERS: [Drawer, string, number][] = [
  ['ring', 'RING', 2],
  ['core', 'CORE', 1],
  ['tip', 'TIP', 0],
  ['style', 'STYLE', 3],
];
/** Arena-local layout (the arena center is the origin, +Z toward the player, the world is half as large); the touch layout is in reach.ts. */
/** Your top stands here on the anvil: the near third of the bowl, about 0.5 m from the eyes. */
const WORK = new Vector3(REACH_WORK.x, REACH_WORK.y, REACH_WORK.z);
/** The anvil is drawn this much larger than the home one. */
const ANVIL_SCALE = 1.35;
/** The arena floor sinks this far while the forge is open. */
export const FORGE_SINK = 0.03;
/** The drawer tabs: a row along the near rim (the line in reach.ts, shared with the workshop). */
const TAB_Z = TAB_LINE.z;
const TAB_Y = TAB_LINE.y;
const TAB_W = 0.058;
const TAB_GAP = TAB_LINE.gap;
const TAB_H = 0.024;
/** The quench slot, set into the right rim beside the anvil. */
const QUENCH_AT = new Vector3(0.205, -0.006, 0.06);
/** The stats plate stands on the far rim. */
const STATS_AT = new Vector3(0, 0.1, -0.2);
/** Your top on the anvil is this much larger than in the arena. */
const DISPLAY_SCALE = 1.7;
/** The transformation takes this long (s). */
const OPEN_TIME = 0.8;
/** A carried part makes the top come apart within this distance, and fits within SNAP (world m). */
const EXPLODE_R = 0.3;
const SNAP = 0.15;
/** A carried top dipped this close to a paint pot is painted; this close to the quench slot, saved (world m). */
const DIP = 0.12;
/** Pinch distances (world m): touching a thing, and a pointing ray passing this close. */
const GRAB_NEAR = 0.07;
const GRAB_RAY = 0.06;
/** A part picked from afar flies to the hand in this many seconds. */
const FLY_TIME = 0.3;
/** A hand lost this long (s) cancels a carry instead of releasing it (same as the match and home). */
const HAND_LOSS_GRACE = 0.1;
/** A part let go where it was picked up (a tap) fits straight away. */
const TAP_MOVE = 0.03;

interface Slot {
  item: Item;
  drawer: Drawer;
  model: Object3D;
  /** Its name, below it on the tray. */
  name: Object3D;
  home: Vector3;
  /** Its pedestal: the instance in the shared pedestal mesh. */
  pad: number;
  /** Seconds left of the flash after the part was fitted. */
  flash: number;
  /** Its scale on the tray. */
  size: number;
  /** Unlock key ('ring:hook'), or null for things never locked, and how it is earned. */
  key: string | null;
  hint: string | null;
}

/** The unlock key of a shelf item, or null when it is never locked. */
export function itemKey(item: Item): string | null {
  if (item.kind === 'ring' || item.kind === 'core' || item.kind === 'tip') return `${item.kind}:${item.id}`;
  if (item.kind === 'color') return `paint:${TOP_COLORS.indexOf(item.value)}`;
  return null;
}

/** Pedestal colors: idle, pointed at, on your top, locked. */
const PAD_IDLE = new Color(0x8a919c);
const PAD_HOVER = new Color(0xdfe8f5);
const PAD_ON = new Color(ORANGE);
const PAD_LOCKED = new Color(0x2a2e35);

export interface ForgeHooks {
  /** Save the build and go back. */
  done(build: TopBuild): void;
  /** The first session's new part was fitted. */
  fitted?(): void;
}

type Target = { kind: 'slot'; slot: Slot } | { kind: 'top' } | { kind: 'quench' } | { kind: 'tab'; drawer: Drawer };

export class Forge {
  /** Lives in arena-local space (a child of the arena root). */
  readonly root = new Group();
  build: TopBuild = loadBuild();
  /** 0 closed .. 1 open: the arena sinks and the forge rises with it. */
  opened = 0;
  private opening = false;
  /** Saved: the forge folds back into the arena, then goes home. */
  private closing = false;
  private tray = new Group();
  private slots: Slot[] = [];
  private pads!: InstancedMesh;
  private drawer: Drawer = 'tip';
  /** Seconds since the drawer opened: its parts pop up one after another. */
  private drawerT = 1;
  private tabs = new Group();
  private tabPlates = new RimTabs(
    DRAWERS.map(([, label]) => label),
    rowSpots(DRAWERS.length, TAB_GAP, TAB_Z, TAB_Y),
    TAB_W,
    TAB_H,
  );
  private anvil = anvilModel();
  private quench = new Group();
  private display!: TopView;
  /** Tips the top toward the eyes so its face shows; it spins about its own axis inside. */
  private displayTilt = new Group();
  private displayHolder = new Group();
  private stats = new DialPlate();
  private cardKey = '';
  private message = '';
  private heldPart: { item: Item; model: Object3D; hand: HandState; startAt: Vector3; from: Vector3; fly: number; lost: number } | null = null;
  /** The top in hand: the hand, and the hand's and top's orientations when it was picked up. */
  private heldTop: { hand: HandState; handQuat: Quaternion; topQuat: Quaternion; lost: number } | null = null;
  private explode = 0;
  private readonly padColor = new Color();
  /** The part the first session asks the player to fit, if any. */
  private focus: Slot | null = null;
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
  private readonly q2 = new Quaternion();
  private readonly m = new Matrix4();

  constructor(
    private readonly hooks: ForgeHooks,
    private readonly progress: Progress,
  ) {
    this.root.name = 'top-forge';
    this.buildTray();
    this.tabs.add(this.tabPlates.mesh);
    this.buildQuench();
    this.anvil.scale.setScalar(ANVIL_SCALE);
    this.displayHolder.position.copy(WORK);
    this.displayHolder.scale.setScalar(DISPLAY_SCALE);
    this.displayTilt.rotation.x = 0.5;
    this.displayHolder.add(this.displayTilt);
    this.stats.mesh.name = 'forge-stats';
    this.stats.mesh.position.copy(STATS_AT);
    this.stats.mesh.rotation.x = -0.3;
    this.root.add(this.anvil, this.tray, this.tabs, this.quench, this.displayHolder, this.stats.mesh);
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
    if (out.emblem && !this.progress.isUnlocked(`emblem:${out.emblem}`)) out.emblem = 0;
    if (out.seal && out.seal !== 'anvil' && !this.progress.isUnlocked(`seal:${out.seal}`)) out.seal = 'anvil';
    return out;
  }

  /** The seal's coin on the tray shows the strike engraved now. */
  private showSeal() {
    const slot = this.slots.find((s) => s.item.kind === 'seal');
    if (!slot) return;
    slot.model.clear();
    const coin = sealModel(this.build.seal ?? 'anvil');
    coin.rotation.x = 0.8;
    slot.model.add(coin);
    // Its name over it says which strike is set.
    const seal = this.build.seal ?? 'anvil';
    if (slot.name.userData.seal !== seal) {
      slot.name.userData.seal = seal;
      const old = slot.name as Mesh;
      const fresh = tag(SEAL_NAMES[seal].toUpperCase(), 0.05, 44);
      (old.material as MeshBasicMaterial).map?.dispose();
      old.material = fresh.material;
    }
  }

  /** Opens the forge; with a focus key (the first session's new part) its drawer opens and it pulses. */
  open(focus: string | null = null) {
    this.build = this.allowed(loadBuild());
    this.rebuildDisplay();
    this.showSeal();
    this.root.visible = true;
    this.dropAll();
    this.opened = 0;
    this.opening = true;
    playMachine();
    this.focus = focus ? (this.slots.find((s) => s.key === focus) ?? null) : null;
    this.setDrawer(this.focus?.drawer ?? 'ring', false);
    this.say(this.focus ? `Your new part: bring the ${this.focus.item.name} ${this.focus.item.kind} to your top` : 'Pick a drawer, bring a part to your top');
    this.logPending = true;
  }

  close() {
    this.root.visible = false;
    this.opened = 0;
    this.opening = false;
    this.closing = false;
    this.dropAll();
  }

  private dropAll() {
    if (this.heldPart) this.root.remove(this.heldPart.model);
    this.heldPart = null;
    this.heldTop = null;
    this.displayHolder.position.copy(WORK);
    this.displayHolder.quaternion.identity();
  }

  private setDrawer(d: Drawer, sound = true) {
    this.drawer = d;
    this.drawerT = 0;
    // Only the open drawer's parts and pedestals show; the others' pedestals shrink to nothing.
    for (const s of this.slots) {
      s.model.visible = s.name.visible = s.drawer === d;
      this.pads.setMatrixAt(s.pad, this.m.makeScale(s.drawer === d ? 1 : 0, 1, s.drawer === d ? 1 : 0).setPosition(s.home.x, s.home.y - 0.016, s.home.z));
    }
    this.pads.instanceMatrix.needsUpdate = true;
    if (sound) playDrawer();
    this.logPending = true;
  }

  update(pointers: HandState[], dt: number) {
    this.time += dt;
    if (import.meta.env.DEV && this.logPending) {
      this.logPending = false;
      console.log(`[FORGE] ${this.debugPositions()}`);
    }
    this.animate(dt);
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
    // Nothing is picked until the forge has risen.
    if (this.opened < 1) return;

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
    // Hover: tray parts under a free pointer lift and turn.
    let hovered: Slot | null = null;
    let hoveredTab: Drawer | null = null;
    for (const h of pointers) {
      if (!h.tracked || h === this.heldPart?.hand || h === this.heldTop?.hand) continue;
      const t = this.under(h, false);
      if (t?.kind === 'slot') hovered ??= t.slot;
      if (t?.kind === 'tab') hoveredTab ??= t.drawer;
    }
    const blink = Math.floor(this.time * 4) % 2 === 0;
    this.tabPlates.draw((i) => {
      const d = DRAWERS[i][0];
      return { on: d === this.drawer || (this.focus?.drawer === d && blink), hover: d === hoveredTab };
    });
    this.drawerT += dt;
    for (const s of this.slots) {
      if (s.drawer !== this.drawer) continue;
      const locked = this.locked(s);
      const on = s === hovered && !locked;
      s.flash = Math.max(0, s.flash - dt);
      const pad = this.padColor.copy(locked ? PAD_LOCKED : this.isOn(s.item) ? PAD_ON : on ? PAD_HOVER : PAD_IDLE);
      // A part just fitted flashes white; the first session's new part breathes until fitted.
      if (s.flash > 0) pad.lerp(this.white, s.flash / 0.8);
      if (s === this.focus) pad.copy(PAD_ON).lerp(this.white, 0.5 + 0.5 * Math.sin(this.time * 5));
      this.pads.setColorAt(s.pad, pad);
      // Out of the drawer one after another, then a slow turn; lifted while pointed at.
      const pop = popIn(this.drawerT, this.slots.filter((x) => x.drawer === this.drawer).indexOf(s));
      const pulse = s.flash > 0 ? 1 + 0.25 * Math.sin((s.flash / 0.8) * Math.PI) : 1;
      s.model.position.set(s.home.x, s.home.y + (on ? 0.012 : 0) - 0.02 * (1 - pop), s.home.z);
      s.model.rotation.y += dt * (on ? 2 : 0.4);
      s.model.scale.setScalar(s.size * pop * (on ? 1.15 : 1) * pulse * (locked ? 0.7 : 1));
    }
    this.pads.instanceColor!.needsUpdate = true;
    if (!this.heldPart) {
      this.showCard(hovered ? this.withItem(hovered.item) : null);
      if (hovered) this.hint(this.locked(hovered) ? `${hovered.item.name}: locked, ${hovered.hint}` : `${hovered.item.name}: ${hovered.item.blurb}`);
      else this.hint(null);
    }
  }

  /** The transformation: the anvil rises, the tray and tabs slide out, the stats rise on the far rim. */
  private animate(dt: number) {
    if (this.opening) {
      this.opened = Math.min(1, this.opened + dt / OPEN_TIME);
      if (this.opened >= 1) this.opening = false;
    }
    if (this.closing) {
      this.opened = Math.max(0, this.opened - dt / (OPEN_TIME / 2));
      if (this.opened <= 0) {
        this.closing = false;
        this.hooks.done(this.build);
        return;
      }
    }
    const k = this.opened;
    const ease = (u: number) => 1 - (1 - Math.min(1, Math.max(0, u))) ** 3;
    // The anvil stands on the sunken floor, its plinth under it; it rises out of the floor.
    const rise = ease(k / 0.7);
    this.anvil.position.set(WORK.x, WORK.y - ANVIL_FACE * ANVIL_SCALE - 0.16 * (1 - rise), WORK.z);
    if (!this.heldTop) this.displayHolder.position.y = WORK.y + 0.004 * Math.sin(this.time * 1.6) - 0.16 * (1 - rise);
    const slide = ease((k - 0.4) / 0.6);
    this.tabs.position.set(0, -0.02 * (1 - slide), -0.03 * (1 - slide));
    this.tabs.visible = slide > 0.01;
    this.tray.visible = slide > 0.01;
    this.tray.scale.setScalar(Math.max(0.001, slide));
    this.tray.position.set(WORK.x * (1 - slide), 0, WORK.z * (1 - slide));
    // The slot breathes while your top is carried, so it is easy to find.
    this.quench.scale.setScalar(Math.max(0.001, slide) * (this.heldTop ? 1.1 + 0.08 * Math.sin(this.time * 6) : 1));
    const up = ease((k - 0.2) / 0.6);
    this.stats.mesh.position.set(STATS_AT.x, STATS_AT.y - 0.08 * (1 - up), STATS_AT.z);
    this.stats.mesh.visible = up > 0.01;
  }

  private pinch(target: Target, h: HandState) {
    if (target.kind === 'tab') return target.drawer === this.drawer ? undefined : this.setDrawer(target.drawer);
    if (target.kind === 'quench') return this.save();
    if (target.kind === 'top') {
      if (this.heldTop) return;
      this.heldTop = { hand: h, handQuat: h.rayQuat.clone(), topQuat: this.displayHolder.quaternion.clone(), lost: 0 };
      playPick();
      this.say('Turn it to look. Drop it in the quench slot to save');
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
    model.scale.multiplyScalar(0.8);
    this.root.add(model);
    // From afar the part flies to the hand.
    const from = target.slot.model.getWorldPosition(new Vector3());
    this.heldPart = { item, model, hand: h, startAt: this.pointAt(h, new Vector3()), from, fly: h.pinch.distanceTo(from) > 0.3 ? 0 : 1, lost: 0 };
    playPick();
    this.say(`${item.name}: ${item.blurb}`);
  }

  /** The top: follows and turns with the hand holding it, else eases back onto the anvil. */
  private updateTop(dt: number) {
    const held = this.heldTop;
    if (!held) {
      this.q.set(WORK.x, this.displayHolder.position.y, WORK.z);
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
    const pot = this.slots.find((s) => s.item.kind === 'color' && s.model.visible && !this.locked(s) && s.model.getWorldPosition(this.p).distanceTo(at) < DIP) ?? null;
    if (pot && pot !== this.dippedIn) this.fit(pot.item);
    this.dippedIn = pot;
    if (h.pinching && h.tracked) {
      held.lost = 0;
      return;
    }
    // A lost hand is not a release: after a moment the top goes back to the anvil, unsaved.
    if (!h.tracked) {
      if ((held.lost += dt) < HAND_LOSS_GRACE) return;
      this.heldTop = null;
      return;
    }
    this.heldTop = null;
    // Saved when let go over the quench slot, or pointing into it from afar.
    this.quench.getWorldPosition(this.p);
    if (at.distanceTo(this.p) < DIP * 1.5 || this.distance(h, this.p, 0, GRAB_RAY * 1.5) < Infinity) return this.save();
    // Let go anywhere else: it settles back on the anvil.
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
    const target = slotKind && d < EXPLODE_R ? Math.min(1, (EXPLODE_R - d) / (EXPLODE_R - SNAP)) : 0;
    this.explode += (target - this.explode) * 0.25;
    this.display.explode(this.explode, slotKind, this.time);
    this.showCard(this.withItem(held.item));
    if (h.pinching && h.tracked) {
      held.lost = 0;
      return;
    }
    // A lost hand is not a release: after a moment the part goes back to the tray, unfitted.
    if (!h.tracked) {
      if ((held.lost += dt) < HAND_LOSS_GRACE) return;
      this.root.remove(held.model);
      this.heldPart = null;
      return;
    }
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
    this.root.localToWorld(this.q.copy(WORK));
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
        return b.spin === -1;
      case 'color':
        return b.color === item.value;
      case 'emblem':
        return (b.emblem ?? 0) > 0;
      case 'seal':
        // A top always carries a seal: the coin shows which.
        return true;
      default:
        return b.ring === item.build.ring && b.core === item.build.core && b.tip === item.build.tip;
    }
  }

  private fit(item: Item) {
    const slot = this.slots.find((s) => s.item === item);
    const before = JSON.stringify(this.build);
    if (item.kind === 'spin') {
      // One token: each tap turns the spin the other way.
      const spin = this.build.spin === 1 ? -1 : 1;
      this.build = { ...this.build, spin };
      this.say(spin === 1 ? 'Right spin' : 'Left spin: steals spin from right spinners');
    } else if (item.kind === 'color') {
      this.build = { ...this.build, color: item.value };
      this.say('Painted');
    } else if (item.kind === 'seal') {
      // The next strike you have earned (the Anvil Strike is always yours).
      const owned = SEALS.filter((s) => s === 'anvil' || this.progress.isUnlocked(`seal:${s}`));
      const seal = owned[(owned.indexOf(this.build.seal ?? 'anvil') + 1) % owned.length];
      this.build = { ...this.build, seal };
      this.say(owned.length > 1 ? `${SEAL_NAMES[seal]}: ${SEAL_BLURBS[seal]}` : 'Earn more strikes: Rush at Lv 4, Magnet at Lv 7, Tilt at Lv 10, Hammer at Lv 13, Ward at Lv 16');
      this.showSeal();
    } else if (item.kind === 'emblem') {
      // The next glow you have earned (the forge's orange is always yours).
      const owned = EMBLEM_COLORS.map((_, i) => i).filter((i) => i === 0 || this.progress.isUnlocked(`emblem:${i}`));
      const emblem = owned[(owned.indexOf(this.build.emblem ?? 0) + 1) % owned.length];
      this.build = { ...this.build, emblem };
      this.say(owned.length > 1 ? `Emblem glow: ${EMBLEM_NAMES[emblem]}` : 'Earn more glows: levels 15-19 and order stamps');
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
      if (slot === this.focus) {
        this.focus = null;
        this.say('Fitted! Drop your top in the quench slot to save it');
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
    playMachine();
    this.dropAll();
    this.closing = true;
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
    const message = this.hinted ?? this.message;
    const key = JSON.stringify([this.build, preview, message]);
    if (key === this.cardKey) return;
    this.cardKey = key;
    const shown = preview ?? this.build;
    const spec = specFromBuild(shown);
    const now = statsOf(specFromBuild(this.build));
    const next = preview ? statsOf(spec) : null;
    const w = weightOf(shown);
    const dials: [keyof TopStats, string][] = [
      ['attack', 'HIT'],
      ['defense', 'GUARD'],
      ['stamina', 'ENDURE'],
      ['dash', 'KICK'],
      ['burst', 'HOLD'],
    ];
    this.stats.draw(
      buildName(shown),
      `${roleOf(spec)} · ${shown.spin === 1 ? 'right' : 'left'} spin · ${w} / ${WEIGHT_LIMIT} g`,
      dials.map(([k, label]) => ({ label, value: now[k], preview: next?.[k] })),
      message,
      w > WEIGHT_LIMIT ? '#ff5a4a' : TEXT_DIM,
    );
  }

  /** Distance from a pointer to a fixed point (world), handed to a callback. */
  private consider(h: HandState, local: Vector3, touchOnly: boolean, take: (d: number) => void) {
    this.root.localToWorld(this.p.copy(local));
    take(this.distance(h, this.p, GRAB_NEAR, touchOnly ? 0 : GRAB_RAY));
  }

  /** What a pointer would pinch: the top, a tray part, a drawer tab or the quench slot (nearest wins). */
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
    for (const slot of this.slots) if (slot.drawer === this.drawer) consider(slot.model, { kind: 'slot', slot });
    DRAWERS.forEach(([d], i) =>
      this.consider(h, this.tabPlates.spots[i].at, touchOnly, (dist) => {
        if (dist < bestD) {
          bestD = dist;
          best = { kind: 'tab', drawer: d };
        }
      }),
    );
    consider(this.quench, { kind: 'quench' });
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

  /** A passing line (the part pointed at) shown instead of the last message; null puts it back. */
  private hint(text: string | null) {
    this.hinted = text;
  }

  private hinted: string | null = null;

  private say(text: string) {
    this.message = text;
    this.cardKey = '';
    this.showCard(null);
    if (import.meta.env.DEV) console.log(`[FORGE] ${text} | ${buildName(this.build)} ${weightOf(this.build)} g spin ${this.build.spin}`);
  }

  /** The tray: every part on its pedestal around the anvil; only the open drawer's parts show. */
  private buildTray() {
    const pads: Vector3[] = [];
    for (const [drawer, , row] of DRAWERS) {
      const items = ROWS[row][1];
      items.forEach((item, i) => {
        // A half circle on the anvil's near side, evenly spread.
        // An arc on the anvil's near side, opening wider for a fuller drawer.
        const at = traySpot(i, items.length);
        const home = new Vector3(at.x, at.y, at.z);
        const model = new Group();
        const inner = itemModel(item);
        // Rings show their top face; tips and cores their profile; pots their paint.
        inner.rotation.x = item.kind === 'tip' || item.kind === 'core' ? 0.35 : item.kind === 'color' ? 0.9 : 0.8;
        model.add(inner);
        model.position.copy(home);
        model.visible = false;
        // Its name over it, tipped toward the player (parts, paints and tokens alike).
        const name = tag(item.name.toUpperCase(), 0.05, 44);
        name.position.set(home.x, home.y + 0.028, home.z);
        name.rotation.x = -0.35;
        name.visible = false;
        this.tray.add(name);
        const size = item.kind === 'ring' ? 0.62 : item.kind === 'core' ? 0.7 : item.kind === 'tip' ? 0.8 : 1;
        this.tray.add(model);
        const key = itemKey(item);
        this.slots.push({ item, drawer, model, name, home, pad: pads.length, flash: 0, size, key, hint: key ? unlockHint(key) : null });
        pads.push(home);
      });
    }
    // The pedestals: one instanced mesh for all, recolored per state; hidden ones sink away.
    const graphite = new CylinderGeometry(0.017, 0.019, 0.003, 24);
    this.pads = new InstancedMesh(graphite, new MeshMatcapMaterial({ matcap: makeMatcap('metal', 0xffffff) }), pads.length);
    pads.forEach((p, i) => {
      this.pads.setMatrixAt(i, this.m.makeTranslation(p.x, p.y - 0.016, p.z));
      this.pads.setColorAt(i, PAD_IDLE);
    });
    this.tray.add(this.pads);
  }

  /** The quench slot, set into the right rim: drop your top in to save it and go home. */
  private buildQuench() {
    this.quench.position.copy(QUENCH_AT);
    this.quench.add(rimSlot());
    const name = tag('QUENCH TO SAVE', 0.07, 40);
    name.position.set(0, 0.03, 0);
    name.rotation.x = -0.4;
    this.quench.add(name);
  }

  /** Dev: world positions of the top, the tabs, the open drawer's parts and the quench slot. */
  debugPositions(): string {
    this.root.updateWorldMatrix(true, true);
    const fmt = (v: Vector3) => v.toArray().map((x) => x.toFixed(3)).join(',');
    const at = (o: Object3D) => fmt(o.getWorldPosition(new Vector3()));
    return [
      `top@${at(this.displayHolder)}`,
      ...DRAWERS.map(([d], i) => `tab_${d}@${fmt(this.root.localToWorld(this.tabPlates.spots[i].at.clone()))}`),
      ...this.slots.filter((s) => s.drawer === this.drawer).map((s) => `${s.item.name.replace(/ /g, '_')}${s.item.kind === 'color' ? this.slots.indexOf(s) : ''}@${fmt(this.root.localToWorld(s.home.clone()))}`),
      `quench@${at(this.quench)}`,
    ].join(' ');
  }
}

/** The model of a shelf item, sized to be easy to grab. */
/** A struck coin with the seal's mark: a hammer head (anvil), an arrow (rush), a horseshoe (magnet). */
export function sealModel(seal: Seal): Object3D {
  const g = new Group();
  const coin = new Mesh(new CylinderGeometry(0.016, 0.016, 0.004, 24), new MeshMatcapMaterial({ matcap: makeMatcap('metal', 0x8a6a3a) }));
  g.add(coin);
  const mat = new MeshBasicMaterial({ color: 0xffb04a });
  if (seal === 'anvil') {
    const head = new Mesh(new BoxGeometry(0.016, 0.004, 0.007), mat);
    const handle = new Mesh(new BoxGeometry(0.003, 0.003, 0.014), mat);
    head.position.set(0, 0.003, -0.004);
    handle.position.set(0, 0.003, 0.005);
    g.add(head, handle);
  } else if (seal === 'rush') {
    const shaft = new Mesh(new BoxGeometry(0.003, 0.003, 0.014), mat);
    const tip = new Mesh(new ConeGeometry(0.005, 0.008, 3).rotateX(-Math.PI / 2), mat);
    shaft.position.set(0, 0.003, 0.003);
    tip.position.set(0, 0.003, -0.007);
    g.add(shaft, tip);
  } else if (seal === 'tilt') {
    // A tipped bar on a pivot.
    const bar = new Mesh(new BoxGeometry(0.018, 0.002, 0.004), mat);
    bar.position.y = 0.006;
    bar.rotation.z = 0.35;
    const pivot = new Mesh(new ConeGeometry(0.004, 0.005, 3), mat);
    pivot.position.y = 0.003;
    g.add(bar, pivot);
  } else if (seal === 'hammer') {
    // A sledge: a heavy head across a long handle.
    const head = new Mesh(new BoxGeometry(0.008, 0.005, 0.012), mat);
    const handle = new Mesh(new BoxGeometry(0.003, 0.003, 0.016), mat);
    head.position.set(0, 0.003, -0.006);
    handle.position.set(0, 0.003, 0.004);
    g.add(head, handle);
  } else if (seal === 'ward') {
    // A ring wall.
    const wall = new Mesh(new TorusGeometry(0.008, 0.0025, 6, 24).rotateX(-Math.PI / 2), mat);
    wall.position.y = 0.003;
    g.add(wall);
  } else {
    const shoe = new Mesh(new TorusGeometry(0.007, 0.0022, 6, 20, Math.PI).rotateX(-Math.PI / 2), mat);
    shoe.position.y = 0.003;
    g.add(shoe);
  }
  return g;
}

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
  } else if (item.kind === 'emblem') {
    // A coin with a ring of glows: the emblem's color.
    const coin = new Mesh(new CylinderGeometry(0.016, 0.016, 0.004, 24), new MeshMatcapMaterial({ matcap: makeMatcap('metal', 0x5d6068) }));
    g.add(coin);
    EMBLEM_COLORS.slice(0, 4).forEach((c, i) => {
      const a = (i / 4) * Math.PI * 2;
      const dot = new Mesh(new CylinderGeometry(0.0045, 0.0045, 0.002, 12), new MeshBasicMaterial({ color: c }));
      dot.position.set(Math.cos(a) * 0.009, 0.003, Math.sin(a) * 0.009);
      g.add(dot);
    });
  } else if (item.kind === 'seal') {
    g.add(sealModel('anvil'));
  } else if (item.kind === 'preset') {
    const view = new TopView(item.build, item.build.color);
    g.add(view.root);
    g.scale.setScalar(0.9);
  }
  return g;
}
