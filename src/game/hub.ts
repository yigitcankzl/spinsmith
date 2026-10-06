/**
 * The home screen as a smithy around the arena, with no buttons: things to pick up.
 * - Your top waits on a stand in front of the arena: carry it into the arena (or tap it) to play.
 * - An arena rack on the left turns slowly with a miniature of every arena: carry one onto the
 *   arena (or tap it) to switch; the rolled-up blueprint on the rack opens the arena workshop.
 * - An anvil on the right holds your top: pinch it to forge your top.
 * Everything is arena-local (arena center at the origin, +Z toward the player).
 */
import {
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshMatcapMaterial,
  Object3D,
  TorusGeometry,
  Vector3,
} from '@iwsdk/core';
import { playPick, playRemove } from './audio.js';
import { tag } from './builder.js';
import type { HandState } from './hands.js';
import type { ArenaLayout, Theme } from './layout.js';
import type { TopBuild } from './parts.js';
import { makeMatcap, TopView } from './visuals.js';

export type HubAction = { kind: 'play' } | { kind: 'arena'; index: number } | { kind: 'forge' } | { kind: 'workshop' };

/** Station spots (arena-local): left rack, right anvil, the stand at the near rim. */
export const RACK_AT = new Vector3(-0.31, 0, 0.1);
export const ANVIL_AT = new Vector3(0.31, 0, 0.1);
const STAND_AT = new Vector3(0.17, 0, 0.2);
/** The rack's turntable radius and turn speed (rad/s). */
const RACK_RADIUS = 0.085;
const RACK_SPIN = 0.25;
/** A miniature arena's radius (m). */
const MINI_R = 0.03;
/** Pinch reach: touching an object, and a pointing ray passing this close to it. */
const GRAB_NEAR = 0.06;
const GRAB_RAY = 0.04;
/** A carried thing dropped within this distance of the arena center (horizontally) lands in it. */
const DROP_R = 0.2;
/** Let go where it was picked up: a tap. */
const TAP_MOVE = 0.03;

const THEME_COLOR: Record<Theme, number> = { forge: 0xff6a2a, stone: 0x8fb7c9, clockwork: 0xe2b866, ice: 0x9fe8ff };
const FLOOR_COLOR: Record<Theme, number> = { forge: 0xe8dcc4, stone: 0xb9b3a8, clockwork: 0xd9c9a3, ice: 0xdff1fa };
const IRON = makeMatcap('metal', 0x5d6068);
const DARK = makeMatcap('clay', 0x3a2f28);
const WOOD = makeMatcap('clay', 0x8a5a36);
const BRASS = makeMatcap('metal', 0xe2b866);

interface Pickable {
  /** What happens when it is carried into the arena or tapped. */
  action: HubAction;
  /** Carried items move with the pointer; fixed ones (the anvil, the blueprint) only react to a pinch. */
  carry: boolean;
  /** The thing itself, and its spot to return to (both in its parent's space). */
  model: Object3D;
  home: Vector3;
}

export class Hub {
  readonly root = new Group();
  private rack = new Group();
  private turntable = new Group();
  private anvil = new Group();
  private stand = new Group();
  /** Holds the stand's top; it is what gets carried into the arena. */
  private standHolder = new Group();
  private items: Pickable[] = [];
  private labels: Mesh[] = [];
  private standTop: TopView | null = null;
  private anvilTop: TopView | null = null;
  private topKey = '';
  private arenasKey = '';
  private held: { item: Pickable; hand: HandState; startAt: Vector3 } | null = null;
  private time = 0;
  private readonly p = new Vector3();
  private readonly q = new Vector3();
  private readonly hit = new Vector3();
  private readonly at = new Vector3();
  private readonly center = new Vector3();

  constructor() {
    this.root.name = 'smithy';
    this.buildRack();
    this.buildAnvil();
    this.buildStand();
    this.root.add(this.rack, this.anvil, this.stand);
    this.root.visible = false;
  }

  /** Refreshes what the stations show: your top, and one miniature per arena. */
  show(arenas: ArenaLayout[], current: number, build: TopBuild) {
    this.root.visible = true;
    const topKey = JSON.stringify(build);
    if (topKey !== this.topKey) {
      this.topKey = topKey;
      this.standTop?.dispose();
      this.anvilTop?.dispose();
      this.standTop = new TopView(build, build.color);
      this.standTop.root.scale.setScalar(1.1);
      this.standTop.root.position.y = 0.06;
      this.standHolder.add(this.standTop.root);
      this.anvilTop = new TopView(build, build.color);
      this.anvilTop.root.scale.setScalar(1.3);
      this.anvilTop.root.position.set(0, ANVIL_FACE, 0);
      this.anvil.add(this.anvilTop.root);
    }
    const arenasKey = JSON.stringify([arenas.map((a) => a.name), current]);
    if (arenasKey !== this.arenasKey) {
      this.arenasKey = arenasKey;
      this.fillRack(arenas, current);
    }
  }

  hide() {
    this.root.visible = false;
    if (this.held) this.returnHome(this.held.item);
    this.held = null;
  }

  /** One frame: hover, pinch, carry, drop. Returns what the player chose, if anything. */
  update(pointers: HandState[], dt: number, head: Vector3): HubAction | null {
    this.time += dt;
    this.turntable.rotation.y += dt * RACK_SPIN;
    if (this.standTop) this.standTop.root.rotation.y += dt * 0.8;
    if (this.anvilTop) this.anvilTop.root.rotation.y -= dt * 0.4;
    // Station names turn to face the player.
    for (const l of this.labels) {
      l.getWorldPosition(this.p);
      l.lookAt(this.q.copy(head).setY(this.p.y));
    }
    if (this.held) return this.updateHeld();

    let hovered: Pickable | null = null;
    for (const h of pointers) if (h.tracked) hovered ??= this.under(h);
    for (const it of this.items) {
      const on = it === hovered;
      const k = on ? 1.15 + 0.03 * Math.sin(this.time * 8) : 1;
      it.model.scale.setScalar(k);
      if (it.carry) it.model.position.set(it.home.x, it.home.y + (on ? 0.01 : 0), it.home.z);
    }
    for (const h of pointers) {
      if (!h.tracked || !h.justPinched) continue;
      const it = this.under(h);
      if (!it) continue;
      playPick();
      if (!it.carry) return it.action;
      this.held = { item: it, hand: h, startAt: this.pointAt(h, new Vector3()) };
      return null;
    }
    return null;
  }

  private updateHeld(): HubAction | null {
    const { item, hand, startAt } = this.held!;
    const at = this.pointAt(hand, this.at);
    item.model.parent!.worldToLocal(item.model.position.copy(at));
    item.model.rotation.y += 0.05;
    if (hand.pinching && hand.tracked) return null;
    this.held = null;
    this.root.localToWorld(this.center.set(0, 0, 0));
    const over = Math.hypot(at.x - this.center.x, at.z - this.center.z) < DROP_R;
    const tap = at.distanceTo(startAt) < TAP_MOVE;
    this.returnHome(item);
    if (over || tap) return item.action;
    playRemove();
    return null;
  }

  private returnHome(it: Pickable) {
    it.model.position.copy(it.home);
    it.model.rotation.set(0, 0, 0);
  }

  /** The pinch itself when the hand is near the stations, else along its ray as far as the arena. */
  private pointAt(h: HandState, out: Vector3): Vector3 {
    this.root.localToWorld(this.center.set(0, 0, 0));
    if (h.pinch.distanceTo(this.center) < 0.7 || !h.hasRay) return out.copy(h.pinch);
    const d = this.center.distanceTo(h.rayOrigin);
    return out.copy(h.rayDir).multiplyScalar(d).add(h.rayOrigin);
  }

  private under(h: HandState): Pickable | null {
    let best: Pickable | null = null;
    let bestD = Infinity;
    for (const it of this.items) {
      it.model.getWorldPosition(this.p);
      const d = this.distance(h, this.p);
      if (d < bestD) {
        bestD = d;
        best = it;
      }
    }
    return best;
  }

  /** Near pinch distance, or ray distance (+ a small bias), or Infinity when out of reach. */
  private distance(h: HandState, point: Vector3) {
    const d = h.pinch.distanceTo(point);
    if (d < GRAB_NEAR) return d;
    if (!h.hasRay) return Infinity;
    const t = this.q.copy(point).sub(h.rayOrigin).dot(h.rayDir);
    if (t <= 0) return Infinity;
    const off = this.hit.copy(h.rayDir).multiplyScalar(t).add(h.rayOrigin).distanceTo(point);
    return off < GRAB_RAY ? off + 0.05 : Infinity;
  }

  private label(text: string, parent: Object3D, y: number) {
    const l = tag(text, 0.16, 46);
    l.position.y = y;
    parent.add(l);
    this.labels.push(l);
  }

  /** A wooden post with a turntable on top; miniatures stand around its edge. */
  private buildRack() {
    this.rack.position.copy(RACK_AT);
    const post = new Mesh(new CylinderGeometry(0.012, 0.018, 0.06, 16), new MeshMatcapMaterial({ matcap: WOOD }));
    post.position.y = 0.03;
    const plate = new Mesh(new CylinderGeometry(RACK_RADIUS + 0.035, RACK_RADIUS + 0.035, 0.008, 40), new MeshMatcapMaterial({ matcap: IRON }));
    plate.position.y = 0.064;
    const rim = new Mesh(new TorusGeometry(RACK_RADIUS + 0.035, 0.003, 8, 48).rotateX(Math.PI / 2), new MeshMatcapMaterial({ matcap: BRASS }));
    rim.position.y = 0.068;
    this.turntable.position.y = 0.068;
    this.rack.add(post, plate, rim, this.turntable);
    this.label('ARENAS', this.rack, 0.17);
    // The blueprint: a rolled-up plan in the middle of the rack opens the workshop.
    const blueprint = new Group();
    const roll = new Mesh(new CylinderGeometry(0.009, 0.009, 0.07, 16).rotateZ(Math.PI / 2), new MeshMatcapMaterial({ matcap: makeMatcap('clay', 0x5f8fc9) }));
    const band = new Mesh(new CylinderGeometry(0.0095, 0.0095, 0.006, 16).rotateZ(Math.PI / 2), new MeshMatcapMaterial({ matcap: BRASS }));
    blueprint.add(roll, band);
    const home = new Vector3(0, 0.083, 0);
    blueprint.position.copy(home);
    this.rack.add(blueprint);
    const build = tag('Build arena', 0.09, 40);
    build.position.set(0, 0.11, 0.01);
    this.rack.add(build);
    this.labels.push(build);
    this.items.push({ action: { kind: 'workshop' }, carry: false, model: blueprint, home });
  }

  private fillRack(arenas: ArenaLayout[], current: number) {
    this.items = this.items.filter((it) => it.action.kind !== 'arena');
    for (const c of [...this.turntable.children]) this.turntable.remove(c);
    arenas.forEach((layout, i) => {
      const a = (i / arenas.length) * Math.PI * 2;
      const slot = new Group();
      slot.position.set(Math.cos(a) * RACK_RADIUS, 0, Math.sin(a) * RACK_RADIUS);
      const model = miniArena(layout, i === current);
      const home = new Vector3(0, 0.002, 0);
      model.position.copy(home);
      const name = tag(layout.name, 0.07, 40);
      name.position.set(0, 0.045, 0);
      slot.add(model, name);
      this.labels.push(name);
      this.turntable.add(slot);
      this.items.push({ action: { kind: 'arena', index: i }, carry: true, model, home });
    });
  }

  /** The anvil; your top turns on its face. */
  private buildAnvil() {
    this.anvil.position.copy(ANVIL_AT);
    const body = anvilModel();
    this.anvil.add(body);
    this.label('FORGE', this.anvil, 0.2);
    this.items.push({ action: { kind: 'forge' }, carry: false, model: body, home: new Vector3() });
  }

  /** A short brass stand at the near rim holding your top: carry it into the arena to play. */
  private buildStand() {
    this.stand.position.copy(STAND_AT);
    const stem = new Mesh(new CylinderGeometry(0.008, 0.016, 0.05, 16), new MeshMatcapMaterial({ matcap: DARK }));
    stem.position.y = 0.025;
    const cup = new Mesh(new TorusGeometry(0.016, 0.003, 8, 32).rotateX(Math.PI / 2), new MeshMatcapMaterial({ matcap: BRASS }));
    cup.position.y = 0.052;
    this.stand.add(stem, cup);
    this.label('PLAY', this.stand, 0.12);
    // The top's view is rebuilt in show(), so the holder is what gets carried.
    this.stand.add(this.standHolder);
    this.items.push({ action: { kind: 'play' }, carry: true, model: this.standHolder, home: new Vector3() });
  }

  /** Dev: world positions of the things to pick, for driving the hub from the emulator CLI. */
  debugPositions(): string {
    this.root.updateWorldMatrix(true, true);
    const at = (o: Object3D) => o.getWorldPosition(new Vector3()).toArray().map((v) => v.toFixed(3)).join(',');
    return this.items.map((it) => `${it.action.kind}${it.action.kind === 'arena' ? it.action.index : ''}@${at(it.model)}`).join(' ');
  }
}

/** A miniature of an arena: its floor, rim in the theme color, and its pockets. */
function miniArena(layout: ArenaLayout, current: boolean): Group {
  const g = new Group();
  const square = layout.shape === 'square';
  const base = new Mesh(new CylinderGeometry(MINI_R + 0.004, MINI_R + 0.006, 0.014, square ? 4 : 32, 1), new MeshMatcapMaterial({ matcap: DARK }));
  base.position.y = 0.007;
  const floor = new Mesh(new CircleGeometry(MINI_R, square ? 4 : 32).rotateX(-Math.PI / 2), new MeshMatcapMaterial({ matcap: makeMatcap('clay', FLOOR_COLOR[layout.theme]) }));
  floor.position.y = 0.0142;
  const rim = new Mesh(new TorusGeometry(MINI_R, current ? 0.003 : 0.002, 8, square ? 4 : 40).rotateX(Math.PI / 2), new MeshBasicMaterial({ color: THEME_COLOR[layout.theme] }));
  rim.position.y = 0.015;
  if (square) {
    base.rotation.y = floor.rotation.y = rim.rotation.y = Math.PI / 4;
  }
  g.add(base, floor, rim);
  for (const p of layout.pockets) {
    const pocket = new Mesh(new BoxGeometry(0.008, 0.004, 0.008), new MeshBasicMaterial({ color: 0x120c08 }));
    pocket.position.set(Math.cos(p.angle) * MINI_R * 0.85, 0.0145, Math.sin(p.angle) * MINI_R * 0.85);
    g.add(pocket);
  }
  if (layout.shape === 'oval') g.scale.set(1, 1, 0.78);
  return g;
}

/** Height of the anvil's face (m): a top set on the anvil stands here. */
export const ANVIL_FACE = 0.1035;

/** An iron anvil with a horn on a wooden block, a glow on its face and a hammer leaning on it. */
export function anvilModel(): Group {
  const iron = new MeshMatcapMaterial({ matcap: IRON });
  const block = new Mesh(new CylinderGeometry(0.05, 0.055, 0.035, 20), new MeshMatcapMaterial({ matcap: WOOD }));
  block.position.y = 0.0175;
  const foot = new Mesh(new BoxGeometry(0.09, 0.016, 0.06), iron);
  foot.position.y = 0.043;
  const waist = new Mesh(new BoxGeometry(0.05, 0.03, 0.035), iron);
  waist.position.y = 0.066;
  const face = new Mesh(new BoxGeometry(0.11, 0.022, 0.05), iron);
  face.position.y = 0.092;
  const horn = new Mesh(new ConeGeometry(0.02, 0.06, 16).rotateZ(Math.PI / 2), iron);
  horn.position.set(-0.084, 0.092, 0);
  const glow = new Mesh(new CircleGeometry(0.03, 24).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.5 }));
  glow.position.y = ANVIL_FACE;
  const hammer = new Group();
  const handle = new Mesh(new CylinderGeometry(0.004, 0.005, 0.09, 10), new MeshMatcapMaterial({ matcap: WOOD }));
  handle.position.y = 0.045;
  const head = new Mesh(new BoxGeometry(0.034, 0.016, 0.016), iron);
  head.position.y = 0.09;
  hammer.add(handle, head);
  hammer.position.set(0.06, 0, 0.04);
  hammer.rotation.z = 0.35;
  const g = new Group();
  g.add(block, foot, waist, face, horn, glow, hammer);
  return g;
}
