/**
 * The home screen as one machine, with no buttons: things to pick up on the arena's near rim.
 * - Your top waits in its dock on the arena's near rim: carry it into the arena (or tap it) to play.
 * - A small anvil on the near rim's right opens the forge: the arena itself turns into it.
 * - A blueprint on the near rim opens the arena workshop: the arena turns into a drafting table.
 * - A row of arena miniatures floats behind the arena: point at one and pinch, it flies to your
 *   hand; drop it on the arena (or tap it) to switch.
 * - Once the first session is over: the Smith's board over the far rim's left (today's order, the
 *   rivals' medallions, the ledger; pinch it to take the order) and your champions, the last three
 *   tops that won a match, on small stands along the left rim (pinch one to make it your top).
 * Table things are arena-local (arena center at the origin, +Z toward the player).
 */
import {
  BoxGeometry,
  BufferGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  Vector2,
  CanvasTexture,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshMatcapMaterial,
  Object3D,
  PlaneGeometry,
  RingGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
} from '@iwsdk/core';
import { playLocked, playPick, playRemove } from './audio.js';
import type { Progress } from './progress.js';
import { FONT, glass, ORANGE, STEEL as UI_STEEL, TEXT } from './ui.js';
import { tag } from './builder.js';
import type { HandState } from './hands.js';
import type { TopBuild } from './parts.js';
import { RIVALS } from './parts.js';
import { SmithBoard } from './board.js';
import { BLUEPRINT_AT as REACH_BLUEPRINT, DOCK_AT as REACH_DOCK, FORGE_AT as REACH_FORGE, TABLE_Y as REACH_TABLE_Y } from './reach.js';
import type { Order } from './orders.js';
import { MAX_LEVEL, STAMP_UNLOCKS } from './progress.js';
import { makeMatcap, mergeByMaterial, SOFT_SHADOW, TopView } from './visuals.js';

export type HubAction =
  | { kind: 'play' }
  | { kind: 'forge' }
  | { kind: 'workshop' }
  | { kind: 'order' }
  | { kind: 'champion'; index: number }
  | { kind: 'reset' }
  | { kind: 'armReset' }
  | { kind: 'newSmith' }
  | { kind: 'locked'; text: string };

/** A hand lost this long (s) cancels a carry instead of dropping (same as the match's rip). */
const HAND_LOSS_GRACE = 0.1;

/** Near-rim stations (arena-local): your top's dock at the left, the forge's anvil at the right. */
export const FORGE_AT = new Vector3(REACH_FORGE.x, REACH_FORGE.y, REACH_FORGE.z);
const DOCK_AT = new Vector3(REACH_DOCK.x, REACH_DOCK.y, REACH_DOCK.z);
const BLUEPRINT_AT = new Vector3(REACH_BLUEPRINT.x, REACH_BLUEPRINT.y, REACH_BLUEPRINT.z);
/** The Smith's board (where the first session's notes hang) and the champions' stands on the left rim. */
const BOARD_AT = new Vector3(-0.17, 0.12, -0.25);
const CHAMPION_AT = [new Vector3(-0.215, 0, 0.07), new Vector3(-0.23, 0, -0.01), new Vector3(-0.215, 0, -0.09)];
/** The anvil and the dock on the rim are small models of the full ones. */
const RIM_SCALE = 0.42;
/** Starting over: hold the level plate this long (s), then pinch it again within this long. */
const RESET_HOLD = 2;
const RESET_CONFIRM = 3;
/** Pinch reach (world m): touching an object, and a pointing ray passing this close to it. */
const GRAB_NEAR = 0.08;
const GRAB_RAY = 0.06;
/** A carried thing dropped within this distance of the arena center (arena-local) lands in it. */
const DROP_R = 0.2;
/** A thing picked from afar flies to the hand in this many seconds. */
export const FLY_TIME = 0.3;
/** Let go where it was picked up: a tap. */
const TAP_MOVE = 0.03;

const IRON = makeMatcap('metal', 0x9aa1ad);
/** The forged-tech set: graphite bodies, light steel, brass trim, orange heat. */
const GRAPHITE = makeMatcap('metal', 0x4a4e57);
const STEEL = makeMatcap('chrome', 0xd6dce6);
/** The table is this far below the arena floor (arena-local): props stand on the table itself. */
const TABLE_Y = REACH_TABLE_Y;
const BRASS = makeMatcap('metal', 0xe2b866);

interface Pickable {
  /** What happens when it is carried into the arena or tapped. */
  action: HubAction;
  /** Carried items move with the pointer; fixed ones (the anvil, the blueprint) only react to a pinch. */
  carry: boolean;
  /** Carried things live in the arena's space while held (wall things are reparented). */
  homeParent?: Object3D;
  /** How a locked thing is earned; locked things cannot be picked up. */
  locked?: string;
  /** Its name over it: shown during the first session, afterwards only while pointed at. */
  name?: Mesh;
  /** The thing itself, and its spot to return to (both in its parent's space). */
  model: Object3D;
  home: Vector3;
}

export class Hub {
  readonly root = new Group();
  private anvil = new Group();
  private stand = new Group();
  /** Holds the stand's top; it is what gets carried into the arena. */
  private standHolder = new Group();
  private items: Pickable[] = [];
  private labels: Mesh[] = [];
  /** A breathing ring of light that shows where to reach next during the first session. */
  private beacon = new Mesh(new RingGeometry(0.028, 0.034, 40), new MeshBasicMaterial({ color: ORANGE, transparent: true, depthWrite: false }));
  private rankCanvas = document.createElement('canvas');
  private rankTex!: CanvasTexture;
  private rankKey = '';
  private standTop: TopView | null = null;
  private topKey = '';
  private held: { item: Pickable; hand: HandState; startAt: Vector3; from: Vector3; fly: number; lost: number } | null = null;
  private time = 0;
  /** The first session: every station shows its name. */
  private teaching = true;
  /** The blueprint, its cradle and name: the workshop comes after the first match. */
  private blueprint = new Group();
  /** Starting over: the hand holding the level plate and for how long, then a short window to confirm. */
  private hold: { hand: HandState; t: number } | null = null;
  private armed = 0;
  private holdBar = new Mesh(new PlaneGeometry(0.08, 0.004).translate(0.04, 0, 0), new MeshBasicMaterial({ color: ORANGE, transparent: true, depthWrite: false }));
  private board = new SmithBoard();
  private champions = new Group();
  private championViews: TopView[] = [];
  private championsKey = '';
  private readonly p = new Vector3();
  private readonly q = new Vector3();
  private readonly hit = new Vector3();
  private readonly at = new Vector3();
  private readonly center = new Vector3();

  constructor() {
    this.root.name = 'smithy';
    this.buildAnvil();
    this.buildStand();
    this.buildBlueprint();
    this.beacon.rotation.x = -Math.PI / 2;
    this.board.mesh.position.copy(BOARD_AT);
    this.board.mesh.rotation.x = -0.25;
    this.items.push({ action: { kind: 'order' }, carry: false, model: this.board.mesh, home: BOARD_AT.clone() });
    this.root.add(this.anvil, this.stand, this.beacon, this.board.mesh, this.champions);
    this.root.visible = false;
  }

  /** Refreshes what the stations show: your top, and one miniature per arena. */
  show(build: TopBuild, progress: Progress, order: Order | null, tomorrow: Order | null = null) {
    this.drawRank(progress);
    this.root.visible = true;
    // Before the first match the smithy is just your top and the arena: the anvil, the arena
    // shelf and the workshop come once the player knows a fight.
    const first = progress.matches === 0;
    this.anvil.visible = !first;
    this.blueprint.visible = !first;
    // Every unfinished guide step points somewhere: the dock to play, the anvil for the new part.
    this.beacon.visible = progress.guide !== 'done';
    this.teaching = progress.guide !== 'done';
    // The board and the champions come once the first session is over.
    this.board.mesh.visible = !this.teaching;
    this.champions.visible = !this.teaching;
    if (!this.teaching) {
      const next = Object.keys(STAMP_UNLOCKS).map(Number).find((n) => n > progress.stamps) ?? null;
      this.board.draw({
        order,
        done: order ? progress.hasOrder(order.date) : false,
        tomorrow,
        stamps: progress.stamps,
        nextGlow: next,
        rivals: RIVALS.map((r) => ({ name: r.name, level: r.level, met: r.level <= progress.level, marks: progress.marksOf(r.name) })),
        gilded: progress.isUnlocked('ledger:gold') || progress.level >= MAX_LEVEL,
      });
      this.fillChampions(progress);
    }
    const onAnvil = progress.guide === 'forge' || progress.guide === 'fit';
    const at = onAnvil ? FORGE_AT : DOCK_AT;
    this.beacon.position.set(at.x, TABLE_Y + DOCK_TOP + 0.003, at.z);
    const topKey = JSON.stringify(build);
    if (topKey !== this.topKey) {
      this.topKey = topKey;
      this.standTop?.dispose();
      this.standTop = new TopView(build, build.color);
      this.standTop.root.position.y = DOCK_TOP;
      this.standHolder.add(this.standTop.root);
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
    // The beacon breathes.
    const k = 0.5 + 0.5 * Math.sin(this.time * 4);
    this.beacon.scale.setScalar(1 + 0.35 * k);
    (this.beacon.material as MeshBasicMaterial).opacity = 0.35 + 0.5 * (1 - k);
    if (this.standTop) this.standTop.root.rotation.y += dt * 0.8;
    // Station names turn to face the player.
    for (const l of this.labels) {
      l.getWorldPosition(this.p);
      l.lookAt(this.q.copy(head).setY(this.p.y));
    }
    if (this.held) return this.updateHeld(dt);
    // Holding the level plate fills its bar; at 2 s a second pinch within 3 s confirms.
    this.armed = Math.max(0, this.armed - dt);
    if (this.hold) {
      if (this.hold.hand.pinching && this.hold.hand.tracked) {
        this.hold.t += dt;
        this.holdBar.scale.x = Math.min(1, this.hold.t / RESET_HOLD);
        if (this.hold.t < RESET_HOLD) return null;
        this.hold = null;
        this.armed = RESET_CONFIRM;
        playLocked();
        return { kind: 'armReset' };
      }
      this.hold = null;
    }
    this.holdBar.visible = this.hold !== null || this.armed > 0;
    if (this.armed > 0) this.holdBar.scale.x = 1;

    let hovered: Pickable | null = null;
    for (const h of pointers) if (h.tracked) hovered ??= this.under(h);
    for (const it of this.items) {
      const on = it === hovered;
      if (it.name) it.name.visible = this.teaching || on;
      const k = on ? 1.15 + 0.03 * Math.sin(this.time * 8) : 1;
      it.model.scale.setScalar(k);
      if (it.carry) it.model.position.set(it.home.x, it.home.y + (on ? 0.01 : 0), it.home.z);
    }
    for (const h of pointers) {
      if (!h.tracked || !h.justPinched) continue;
      const it = this.under(h);
      if (!it) continue;
      if (it.locked) {
        playLocked();
        return { kind: 'locked', text: `Locked: ${it.locked}` };
      }
      playPick();
      if (it.action.kind === 'reset') {
        if (this.armed > 0) {
          this.armed = 0;
          return { kind: 'newSmith' };
        }
        this.hold = { hand: h, t: 0 };
        this.holdBar.scale.x = 0.001;
        return null;
      }
      if (!it.carry) return it.action;
      // Carried things move into the arena's space; from afar they fly to the hand first.
      const from = it.model.getWorldPosition(new Vector3());
      this.held = { item: it, hand: h, startAt: this.pointAt(h, new Vector3()), from, fly: h.pinch.distanceTo(from) > 0.3 ? 0 : 1, lost: 0 };
      return null;
    }
    return null;
  }

  private updateHeld(dt: number): HubAction | null {
    const held = this.held!;
    const { item, hand, startAt } = held;
    const at = this.pointAt(hand, this.at);
    held.fly = Math.min(1, held.fly + dt / FLY_TIME);
    const k = 1 - (1 - held.fly) ** 3;
    item.model.parent!.worldToLocal(item.model.position.copy(held.from).lerp(at, k));
    item.model.rotation.y += 0.05;
    if (hand.pinching && hand.tracked) {
      held.lost = 0;
      return null;
    }
    // A lost hand is not a release: after a moment the thing goes back where it was, nothing happens.
    if (!hand.tracked) {
      if ((held.lost += dt) < HAND_LOSS_GRACE) return null;
      this.held = null;
      this.returnHome(item);
      return null;
    }
    this.held = null;
    const local = this.root.worldToLocal(this.center.copy(at));
    const over = Math.hypot(local.x, local.z) < DROP_R;
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
    if (h.pinch.distanceTo(this.center) < 0.9 || !h.hasRay) return out.copy(h.pinch);
    const d = this.center.distanceTo(h.rayOrigin);
    return out.copy(h.rayDir).multiplyScalar(d).add(h.rayOrigin);
  }

  private under(h: HandState): Pickable | null {
    let best: Pickable | null = null;
    let bestD = Infinity;
    for (const it of this.items) {
      if (!shown(it.model)) continue;
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

  private label(text: string, parent: Object3D, y: number): Mesh {
    const l = tag(text, 0.08, 46);
    l.position.y = y;
    parent.add(l);
    this.labels.push(l);
    return l;
  }

  /** The blueprint: a rolled-up plan on the near rim, between the level plate and the anvil. */
  private buildBlueprint() {
    const blueprint = new Group();
    const roll = new Mesh(new CylinderGeometry(0.007, 0.007, 0.055, 16).rotateZ(Math.PI / 2), new MeshMatcapMaterial({ matcap: makeMatcap('clay', 0x5f8fc9) }));
    const band = new Mesh(new CylinderGeometry(0.0076, 0.0076, 0.007, 16).rotateZ(Math.PI / 2), new MeshMatcapMaterial({ matcap: BRASS }));
    blueprint.add(roll, band);
    const holder = new Group();
    holder.add(blueprint);
    blueprint.rotation.y = -0.5;
    const home = new Vector3(BLUEPRINT_AT.x, TABLE_Y + 0.0075 + 0.012, BLUEPRINT_AT.z);
    holder.position.copy(home);
    const cradle = new Mesh(new BoxGeometry(0.04, 0.012, 0.016).translate(0, 0.006, 0), new MeshMatcapMaterial({ matcap: GRAPHITE }));
    cradle.position.set(BLUEPRINT_AT.x, TABLE_Y, BLUEPRINT_AT.z);
    cradle.rotation.y = -0.5;
    const build = tag('BUILD', 0.07, 46);
    build.position.set(home.x, home.y + 0.035, home.z);
    this.labels.push(build);
    this.blueprint.add(cradle, holder, build);
    this.root.add(this.blueprint);
    this.items.push({ action: { kind: 'workshop' }, carry: false, model: holder, home, name: build });
  }

  /** The small anvil on the near rim: pinch it to turn the arena into the forge. */
  private buildAnvil() {
    this.anvil.position.set(FORGE_AT.x, TABLE_Y, FORGE_AT.z);
    // The picked thing is a holder (hover rescales it), the model inside is at rim scale.
    const body = new Group();
    const model = anvilModel();
    model.scale.setScalar(RIM_SCALE);
    model.rotation.y = -0.6;
    body.add(model);
    this.anvil.add(body);
    const name = this.label('FORGE', this.anvil, ANVIL_FACE * RIM_SCALE + 0.035);
    this.items.push({ action: { kind: 'forge' }, carry: false, model: body, home: new Vector3(), name });
  }

  /** A short brass stand at the near rim holding your top: carry it into the arena to play. */
  /** Your smith level beside the stand: level, rank and the bar toward the next level. */
  private drawRank(progress: Progress) {
    const next = progress.next;
    const key = `${progress.level}|${progress.rank}|${progress.fraction.toFixed(3)}|${next?.key}`;
    if (key === this.rankKey) return;
    this.rankKey = key;
    const g = this.rankCanvas.getContext('2d')!;
    glass(g, 512, 200, ORANGE);
    g.fillStyle = TEXT;
    g.textBaseline = 'middle';
    g.font = `700 54px ${FONT}`;
    g.fillText(`Lv ${progress.level}`, 28, 52);
    g.fillStyle = ORANGE;
    g.font = `700 34px ${FONT}`;
    g.fillText(progress.rank.toUpperCase(), 190, 54);
    g.fillStyle = 'rgba(255,255,255,0.1)';
    g.fillRect(28, 100, 456, 20);
    g.fillStyle = UI_STEEL;
    g.fillRect(28, 100, 456 * progress.fraction, 20);
    // Where progress leads next.
    g.fillStyle = TEXT;
    g.font = `600 28px ${FONT}`;
    g.fillText(next ? `Next: ${unlockLabel(next.key)} at Lv ${next.level}` : 'Every part is yours', 28, 160);
    this.rankTex.needsUpdate = true;
  }

  /** Your top's dock on the near rim, with your smith level on a plate between it and the anvil. */
  private buildStand() {
    this.stand.position.set(DOCK_AT.x, TABLE_Y, DOCK_AT.z);
    this.rankCanvas.width = 512;
    this.rankCanvas.height = 200;
    this.rankTex = new CanvasTexture(this.rankCanvas);
    this.rankTex.colorSpace = SRGBColorSpace;
    const rank = new Mesh(new PlaneGeometry(0.1, 0.039), new MeshBasicMaterial({ map: this.rankTex, transparent: true, depthWrite: false }));
    rank.rotation.x = -1;
    rank.scale.setScalar(0.8);
    // Held for 2 s, then pinched again, the level plate starts over as a new smith (shared headsets).
    const plate = new Group();
    plate.position.set(0, TABLE_Y + 0.045, DOCK_AT.z + 0.04);
    this.holdBar.position.set(-0.04, -0.022, 0.012);
    this.holdBar.rotation.x = -1;
    plate.add(rank, this.holdBar);
    this.root.add(plate);
    this.items.push({ action: { kind: 'reset' }, carry: false, model: plate, home: plate.position.clone() });
    const dock = standModel();
    dock.scale.setScalar(RIM_SCALE);
    this.stand.add(dock);
    const name = this.label('PLAY', this.stand, DOCK_TOP + 0.06);
    // The top's view is rebuilt in show(), so the holder is what gets carried.
    this.stand.add(this.standHolder);
    this.items.push({ action: { kind: 'play' }, carry: true, model: this.standHolder, home: new Vector3(), name });
  }

  /** Your champions on small stands along the left rim, rebuilt when the list changes. */
  private fillChampions(progress: Progress) {
    const key = JSON.stringify(progress.champions);
    if (key === this.championsKey) return;
    this.championsKey = key;
    for (const v of this.championViews) v.dispose();
    this.championViews = [];
    for (const c of [...this.champions.children]) c.removeFromParent();
    this.labels = this.labels.filter((l) => !this.items.some((it) => it.action.kind === 'champion' && it.name === l));
    this.items = this.items.filter((it) => it.action.kind !== 'champion');
    progress.champions.forEach((c, i) => {
      const holder = new Group();
      holder.position.set(CHAMPION_AT[i].x, TABLE_Y, CHAMPION_AT[i].z);
      const stand = standModel();
      stand.scale.setScalar(RIM_SCALE * 0.8);
      const view = new TopView(c.build, c.build.color);
      view.root.scale.setScalar(0.8);
      view.root.position.y = DOCK_TOP * 0.8;
      this.championViews.push(view);
      holder.add(stand, view.root);
      const name = tag(`${c.wins} win${c.wins === 1 ? '' : 's'}`, 0.07, 44);
      name.position.set(holder.position.x, TABLE_Y + DOCK_TOP + 0.045, holder.position.z);
      this.labels.push(name);
      this.champions.add(holder, name);
      this.items.push({ action: { kind: 'champion', index: i }, carry: false, model: holder, home: holder.position.clone(), name });
    });
  }

  /** Dev: world positions of the things to pick, for driving the hub from the emulator CLI. */
  debugPositions(): string {
    this.root.updateWorldMatrix(true, true);
    const at = (o: Object3D) => o.getWorldPosition(new Vector3()).toArray().map((v) => v.toFixed(3)).join(',');
    return this.items.map((it) => `${it.action.kind}@${at(it.model)}`).join(' ');
  }
}

/** Height of the anvil's face (m): a top set on the anvil stands here. */
export const ANVIL_FACE = 0.1435;
/** Height of the dock's cup above the table (the stand's cup, at rim scale). */
const DOCK_TOP = 0.097 * RIM_SCALE;

/**
 * The anvil, standing on the table: a forged steel anvil drawn from its side profile (a horn that
 * tapers to a point, a polished face with a hardy hole, a stepped heel, a narrow waist and splayed
 * feet) on an octagonal graphite plinth with a brass band and a glowing seam, a hammer against it.
 */
export function anvilModel(): Group {
  const iron = new MeshMatcapMaterial({ matcap: IRON });
  const steel = new MeshMatcapMaterial({ matcap: STEEL });
  const graphite = new MeshMatcapMaterial({ matcap: GRAPHITE });
  const plinth = new Mesh(new CylinderGeometry(0.048, 0.056, 0.07, 8), graphite);
  plinth.position.y = 0.035;
  const cap = new Mesh(new CylinderGeometry(0.052, 0.05, 0.006, 8), graphite);
  cap.position.y = 0.072;
  const band = new Mesh(new TorusGeometry(0.049, 0.003, 6, 8).rotateX(Math.PI / 2).rotateY(Math.PI / 8), new MeshMatcapMaterial({ matcap: BRASS }));
  band.position.y = 0.064;
  const seam = new Mesh(new TorusGeometry(0.053, 0.0015, 6, 8).rotateX(Math.PI / 2).rotateY(Math.PI / 8), new MeshBasicMaterial({ color: ORANGE }));
  seam.position.y = 0.012;
  const body = new Mesh(anvilBody(), iron);
  // The face: a polished steel plate with the square hardy hole near the heel.
  const face = new Mesh(new BoxGeometry(0.1, 0.004, 0.046), steel);
  face.position.set(0.004, ANVIL_FACE - 0.002, 0);
  const hardy = new Mesh(new BoxGeometry(0.008, 0.0045, 0.008), new MeshBasicMaterial({ color: 0x15161a }));
  hardy.position.set(0.04, ANVIL_FACE - 0.0015, 0);
  const glow = new Mesh(new CircleGeometry(0.03, 24).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.5 }));
  glow.position.y = ANVIL_FACE + 0.0003;
  // The hammer: a tapered graphite handle with a brass ferrule, an octagonal steel head and a peen.
  const hammer = new Group();
  const handle = new Mesh(new CylinderGeometry(0.0035, 0.0052, 0.095, 8), graphite);
  handle.position.y = 0.0475;
  const ferrule = new Mesh(new CylinderGeometry(0.0058, 0.0058, 0.008, 8), new MeshMatcapMaterial({ matcap: BRASS }));
  ferrule.position.y = 0.088;
  const head = new Mesh(new CylinderGeometry(0.0085, 0.0085, 0.026, 8).rotateZ(Math.PI / 2), steel);
  head.position.set(0.004, 0.096, 0);
  const peen = new Mesh(new ConeGeometry(0.0085, 0.014, 8).rotateZ(Math.PI / 2), steel);
  peen.position.set(-0.016, 0.096, 0);
  hammer.add(handle, ferrule, head, peen);
  hammer.position.set(0.075, 0, 0.045);
  hammer.rotation.z = 0.3;
  const g = new Group();
  g.add(plinth, cap, band, seam, body, face, hardy, glow, hammer, softShadow(0.16));
  return mergeByMaterial(g);
}

/**
 * The anvil's body from its side profile, extruded through its width; the horn narrows to a
 * point toward its tip. Sits on the plinth (y 0.075) with its face at ANVIL_FACE.
 */
function anvilBody(): BufferGeometry {
  const top = ANVIL_FACE - 0.003;
  const sh = new Shape();
  sh.moveTo(-0.088, top - 0.012); // horn tip
  sh.quadraticCurveTo(-0.07, top - 0.001, -0.046, top);
  sh.lineTo(0.05, top); // face
  sh.lineTo(0.056, top - 0.004);
  sh.lineTo(0.056, top - 0.014); // heel
  sh.quadraticCurveTo(0.032, top - 0.016, 0.024, top - 0.03); // under the heel into the waist
  sh.lineTo(0.022, 0.092);
  sh.quadraticCurveTo(0.026, 0.08, 0.046, 0.078); // flaring foot
  sh.lineTo(0.046, 0.075);
  sh.lineTo(-0.046, 0.075);
  sh.lineTo(-0.046, 0.078);
  sh.quadraticCurveTo(-0.026, 0.08, -0.022, 0.092);
  sh.lineTo(-0.024, top - 0.03);
  sh.quadraticCurveTo(-0.04, top - 0.022, -0.088, top - 0.012); // under the horn
  const depth = 0.044;
  const geo = new ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.0015, bevelSegments: 2, curveSegments: 10 }).translate(0, 0, -depth / 2);
  // The horn narrows in width toward its tip; the waist is a little narrower than face and feet.
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    let k = 1;
    if (x < -0.04) k = 1 - 0.75 * Math.min(1, (-0.04 - x) / 0.048);
    else if (y > 0.088 && y < top - 0.02) k = 0.8;
    pos.setZ(i, pos.getZ(i) * k);
  }
  geo.computeVertexNormals();
  return geo;
}

/** The stand your top waits on: a turned graphite pedestal with a glowing seam and three brass prongs. */
export function standModel(): Group {
  // A flared foot, a slim stem with a collar, a glowing seam and a shallow cup whose three brass
  // prongs cradle the top.
  const profile = [
    [0.026, 0],
    [0.026, 0.004],
    [0.02, 0.008],
    [0.009, 0.02],
    [0.0065, 0.05],
    [0.0065, 0.074],
    [0.011, 0.077],
    [0.011, 0.081],
    [0.007, 0.084],
    [0.008, 0.088],
    [0.018, 0.094],
    [0.019, 0.097],
    [0, 0.097],
  ].map(([r, y]) => new Vector2(r, y));
  const pedestal = new Mesh(new LatheGeometry(profile, 32), new MeshMatcapMaterial({ matcap: GRAPHITE }));
  const seam = new Mesh(new TorusGeometry(0.0115, 0.0012, 6, 24).rotateX(Math.PI / 2), new MeshBasicMaterial({ color: ORANGE }));
  seam.position.y = 0.079;
  const brass = new MeshMatcapMaterial({ matcap: BRASS });
  const g = new Group();
  g.add(pedestal, seam, softShadow(0.07));
  for (let i = 0; i < 3; i++) {
    const prong = new Mesh(new BoxGeometry(0.003, 0.012, 0.004), brass);
    const a = (i / 3) * Math.PI * 2;
    prong.position.set(Math.cos(a) * 0.019, 0.1, Math.sin(a) * 0.019);
    prong.rotation.set(0, -a, 0.35);
    g.add(prong);
  }
  return mergeByMaterial(g);
}

/** A soft round shadow on the table under a prop (size in m, arena-local). */
function softShadow(size: number): Mesh {
  const m = new Mesh(new PlaneGeometry(size, size).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0x000000, map: SOFT_SHADOW, transparent: true, opacity: 0.55, depthWrite: false }));
  m.position.y = 0.0005;
  return m;
}

/** 'ring:saw' -> 'Saw ring', 'arena:Frost Oval' -> 'Frost Oval', 'paint:2' -> 'a new paint'. */
export function unlockLabel(key: string): string {
  const [kind, id] = key.split(':');
  if (kind === 'paint') return 'a new paint';
  if (kind === 'arena') return id;
  return `${id.charAt(0).toUpperCase()}${id.slice(1)} ${kind}`;
}

/** True when the object and all its parents are visible. */
function shown(o: Object3D): boolean {
  for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}
