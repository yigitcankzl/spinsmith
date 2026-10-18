/**
 * The home screen as one machine, with no buttons: things to pick up on the arena's near rim.
 * - Your top waits in its dock on the arena's near rim: carry it into the arena (or tap it) to play.
 * - A small anvil on the near rim's right opens the forge: the arena itself turns into it.
 * - A blueprint on the near rim opens the arena workshop: the arena turns into a drafting table.
 * - A row of arena miniatures floats behind the arena: point at one and pinch, it flies to your
 *   hand; drop it on the arena (or tap it) to switch.
 * - Once the first session is over: the Smith's board centred over the far rim (today's order and
 *   the ledger; point at it and pinch to take the order; a quick pinch on the level plate turns it
 *   round to the rivals and the full ledger) and your champions, the last three tops that won a
 *   match, on small stands along the left rim (pinch one to make it your top).
 * - Every station's name is a metal plate laid on the near rim at one pitch (SIGN_TILT).
 * Table things are arena-local (arena center at the origin, +Z toward the player).
 */
import {
  AdditiveBlending,
  InstancedMesh,
  Matrix4,
  SphereGeometry,
  BoxGeometry,
  BufferAttribute,
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
  Object3D,
  PlaneGeometry,
  RingGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
} from '@iwsdk/core';
import { playHover, playLocked, playPick, playRemove } from './audio.js';
import type { Progress } from './progress.js';
import { addSlab, engrave, GUIDE, metalPlate, Nameplate, ORANGE, PLATE_DEPTH, pxPerM, setType, SIGN_TILT, signTexture, STEEL as UI_STEEL, tag, TEXT, TEXT_DIM } from './ui.js';
import type { HandState } from './hands.js';
import type { TopBuild } from './parts.js';
import { buildName } from './parts.js';
import { BOUTS, boutOpen, CHAPTERS, medalCount, nextBout, nextGate } from './campaign.js';
import type { BoutRecord } from './campaign.js';
import type { BoardMap } from './board.js';
import { SmithBoard } from './board.js';
import { encodeBuild } from './challenge.js';
import { ECHO_KEY } from './echo.js';
import { popIn } from './rim.js';
import { ARENA_SCALE, BRAWL_AT, COMFORT_AT, BLUEPRINT_AT as REACH_BLUEPRINT, DOCK_AT as REACH_DOCK, FORGE_AT as REACH_FORGE, TABLE_Y as REACH_TABLE_Y } from './reach.js';
import type { Order } from './orders.js';
import { FEATS, MAX_LEVEL, STAMP_UNLOCKS } from './progress.js';
import { mergeByMaterial, SOFT_SHADOW, TopView } from './visuals.js';
import { bevelBox, BRASS, FORGED, GRAPHITE, GRAPHITE_AO, plastic, STEEL } from './materials.js';

/** Your top's code, with your last match's echo when it was played with this same top. */
function echoCode(build: string): string {
  try {
    const saved = localStorage.getItem(ECHO_KEY) ?? '';
    return saved.startsWith(`${build}.`) ? saved : build;
  } catch {
    return build;
  }
}

export type HubAction =
  | { kind: 'play' }
  | { kind: 'forge' }
  | { kind: 'workshop' }
  | { kind: 'order' }
  | { kind: 'champion'; index: number }
  | { kind: 'reset' }
  | { kind: 'comfort' }
  | { kind: 'brawl' }
  | { kind: 'armReset' }
  | { kind: 'newSmith' }
  | { kind: 'locked'; text: string };

/** Brawl pegs: unlit, lit for a bot, and the player's own peg. */
const BRAWL_OFF = new MeshBasicMaterial({ color: 0x2c3138 });
const BRAWL_ON = new MeshBasicMaterial({ color: 0x4fd1ff });
const BRAWL_MINE = new MeshBasicMaterial({ color: 0xff8a2a });
/** Every peg white-hot: an online room is open and waiting. */
const BRAWL_ONLINE = new MeshBasicMaterial({ color: 0xfff1d6 });

/** A hand lost this long (s) cancels a carry instead of dropping (same as the match's rip). */
const HAND_LOSS_GRACE = 0.28;

/** Near-rim stations (arena-local): your top's dock at the left, the forge's anvil at the right. */
// Home is a showcase, not a storage shelf: pull the side stations into the seated binocular view.
// The interaction distances only get easier; the full forge/workshop retain their wider layouts.
export const FORGE_AT = new Vector3(REACH_FORGE.x * 0.88, REACH_FORGE.y, REACH_FORGE.z);
const DOCK_AT = new Vector3(REACH_DOCK.x * 0.88, REACH_DOCK.y, REACH_DOCK.z);
const BLUEPRINT_AT = new Vector3(REACH_BLUEPRINT.x * 0.86, REACH_BLUEPRINT.y, REACH_BLUEPRINT.z);
/**
 * The Smith's board, centred just over the far rim in the read band (about 1.2 m from the eyes), and
 * the champions' stands on the left rim.
 */
const BOARD_AT = new Vector3(0, 0.085, -0.215);
/** How long the board shows its back (the rivals) after a pinch on the level plate (s). */
const BOARD_BACK_TIME = 12;
/** Station names lie on the table this far in front of their station (arena-local), at one pitch. */
const SIGN_AHEAD = 0.05;
const SIGN_Y = 0.012;
/** The level plate's canvas (px) and size (arena-local; shown at 0.8). */
const RANK_W = 1024;
const RANK_H = 280;
const RANK_SIZE = 0.1;
const CHAMPION_AT = [new Vector3(-0.2, 0, 0.065), new Vector3(-0.21, 0, -0.01), new Vector3(-0.2, 0, -0.085)];
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

/** The forged-tech set (materials.ts): graphite bodies, light steel, brass trim, orange heat. */
/** The table is this far below the arena floor (arena-local): props stand on the table itself. */
const TABLE_Y = REACH_TABLE_Y;

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
  /** A side control (the comfort dial): its name only while pointed at, even in the first session. */
  quiet?: boolean;
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
  /** PLAY's plate: its second line names the next match. */
  private playSign = new Nameplate(0.08, 0.026);
  private boardState: Parameters<SmithBoard['draw']>[0] | null = null;
  /** Seconds the board still shows its back. */
  private boardBack = 0;
  /** A breathing ring of light that shows where to reach next during the first session. */
  /** The first move shown, not written: ember dots running in an arc from the dock into the arena. */
  private path = new InstancedMesh(new SphereGeometry(0.004, 8, 6), new MeshBasicMaterial({ color: GUIDE, transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false }), 9);
  private pathOn = false;
  private beacon = new Mesh(new RingGeometry(0.028, 0.034, 40), new MeshBasicMaterial({ color: GUIDE, transparent: true, depthWrite: false }));
  private rankCanvas = document.createElement('canvas');
  private rankTex!: CanvasTexture;
  private rankKey = '';
  private standTop: TopView | null = null;
  private topKey = '';
  private held: { item: Pickable; hand: HandState; startAt: Vector3; from: Vector3; fly: number; lost: number } | null = null;
  private time = 0;
  /** What was pointed at last frame (pointing at a new one ticks). */
  private hoverWas: Pickable | null = null;
  /** When home last appeared (for the stations' pop-in). */
  private shownAt = -10;
  /** The first session: every station shows its name. */
  private teaching = true;
  /** The blueprint, its cradle and name: the workshop comes after the first match. */
  private blueprint = new Group();
  private comfortKnob = new Group();
  private brawlPegs = new Group();
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
  private readonly mat = new Matrix4();
  private readonly center = new Vector3();

  constructor() {
    this.root.name = 'smithy';
    this.buildAnvil();
    this.buildStand();
    this.buildBlueprint();
    this.buildComfort();
    this.buildBrawl();
    this.beacon.rotation.x = -Math.PI / 2;
    this.board.mesh.position.copy(BOARD_AT);
    this.board.mesh.rotation.x = -0.15;
    this.items.push({ action: { kind: 'order' }, carry: false, model: this.board.mesh, home: BOARD_AT.clone() });
    this.root.add(this.anvil, this.stand, this.beacon, this.board.mesh, this.champions, this.path);
    this.path.visible = false;
    this.path.frustumCulled = false;
    this.root.visible = false;
  }

  /** Refreshes what the stations show: your top, and one miniature per arena. */
  show(build: TopBuild, progress: Progress, order: Order | null, tomorrow: Order | null = null, nextMatch: string | null = null) {
    this.drawRank(progress, nextMatch);
    // Coming home, the stations pop up one after another.
    if (!this.root.visible) this.shownAt = this.time;
    this.root.visible = true;
    // Before the first match the smithy is just your top and the arena: the anvil, the arena
    // shelf and the workshop come once the player knows a fight.
    const first = progress.matches === 0;
    this.anvil.visible = !first;
    this.blueprint.visible = !first;
    // Every unfinished guide step points somewhere: the dock to play, the anvil for the new part.
    this.beacon.visible = progress.guide !== 'done';
    this.pathOn = progress.guide === 'launch' || progress.guide === 'bump' || progress.guide === 'match';
    this.teaching = progress.guide !== 'done';
    // The brawl pegs wait until the first session is over: one top and one verb first.
    this.brawlPegs.visible = !this.teaching;
    // The board and the champions come once the first session is over.
    this.board.mesh.visible = !this.teaching;
    this.champions.visible = !this.teaching;
    if (!this.teaching) {
      const next = Object.keys(STAMP_UNLOCKS).map(Number).find((n) => n > progress.stamps) ?? null;
      const champion = progress.champions[0];
      this.boardState = {
        order,
        done: order ? progress.hasOrder(order.date) : false,
        tomorrow,
        stamps: progress.stamps,
        nextGlow: next,
        map: boardMap(progress.bouts, progress.matches),
        gilded: progress.isUnlocked('ledger:gold') || progress.level >= MAX_LEVEL,
        code: echoCode(encodeBuild(build)),
        history: [
          (() => {
            // A pinned arena is free play: say so, or PLAY and the map disagree.
            if (progress.arenaPin) return `free play in ${progress.arenaPin} (pinned)`;
            const next = nextBout(progress.bouts, progress.matches % 2 === 0, progress.matches);
            return next ? `next bout ${next.id}: ${next.rival}` : 'every bout won';
          })(),
          `${medalCount(progress.bouts)}/${BOUTS.length * 3} medals`,
          champion ? `champion: ${buildName(champion.build)} ×${champion.wins}` : 'first champion awaits',
        ].join(' · '),
        feats: progress.feats.size,
        featsOf: Object.keys(FEATS).length,
      };
      this.board.draw(this.boardState, this.boardBack > 0);
      this.fillChampions(progress);
    }
    const onAnvil = progress.guide === 'forge' || progress.guide === 'fit';
    const at = onAnvil ? FORGE_AT : DOCK_AT;
    this.beacon.position.set(at.x, TABLE_Y + DOCK_TOP + 0.003, at.z);
    const topScars = progress.scarsFor(build);
    const topKey = JSON.stringify([build, topScars]);
    if (topKey !== this.topKey) {
      this.topKey = topKey;
      this.standTop?.dispose();
      this.standTop = new TopView(build, build.color);
      this.standTop.scars(topScars);
      this.standTop.root.position.y = DOCK_TOP;
      this.standHolder.add(this.standTop.root);
    }
  }

  /** Where the first session's ghost hand picks your top up: the beacon over the dock, while nothing is carried (else null). */
  ghostFrom(): Vector3 | null {
    return this.beacon.visible && !this.held && this.pathOn ? this.beacon.position : null;
  }

  /** Dev photo mode: the station names, the level plate's card and the board stay hidden. */
  photo() {
    this.photoMode = true;
    this.board.mesh.visible = false;
    for (const it of this.items) if (it.action.kind === 'reset' || it.action.kind === 'comfort' || it.action.kind === 'brawl') it.model.visible = false;
    this.beacon.visible = this.path.visible = false;
  }
  private photoMode = false;

  hide() {
    this.root.visible = false;
    if (this.held) this.returnHome(this.held.item);
    this.held = null;
  }

  /** One frame: hover, pinch, carry, drop. Returns what the player chose, if anything. (The signs no longer turn to the head.) */
  update(pointers: HandState[], dt: number, _head?: Vector3): HubAction | null {
    this.time += dt;
    // Before the first match, ember dots show the way from the dock into the arena.
    this.path.visible = this.pathOn && !this.held;
    if (this.path.visible) {
      for (let i = 0; i < 9; i++) {
        const u = (this.time * 0.6 + i / 9) % 1;
        const x = DOCK_AT.x * (1 - u);
        const z = DOCK_AT.z * (1 - u) + 0.04 * u;
        // From the top in its dock, up and over the rim, down onto the arena floor.
        const y = (TABLE_Y + DOCK_TOP + 0.01) * (1 - u) + 0.012 * u + 0.09 * Math.sin(u * Math.PI);
        this.mat.makeScale(1, 1, 1).setPosition(x, y, z);
        this.mat.elements[0] = this.mat.elements[5] = this.mat.elements[10] = Math.sin(u * Math.PI) * 1.2 + 0.2;
        this.path.setMatrixAt(i, this.mat);
      }
      this.path.instanceMatrix.needsUpdate = true;
    }
    // The beacon breathes.
    const k = 0.5 + 0.5 * Math.sin(this.time * 4);
    this.beacon.scale.setScalar(1 + 0.35 * k);
    (this.beacon.material as MeshBasicMaterial).opacity = 0.35 + 0.5 * (1 - k);
    if (this.standTop) this.standTop.root.rotation.y += dt * 0.8;
    // The board turns back to today's order a while after it was asked for the rivals.
    if (this.boardBack > 0 && (this.boardBack -= dt) <= 0 && this.boardState) this.board.draw(this.boardState, false);
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
      // A quick pinch (let go before the hold counts) turns the board round to the rivals, or back.
      if (!this.teaching && this.boardState) {
        this.boardBack = this.boardBack > 0 ? 0 : BOARD_BACK_TIME;
        this.board.draw(this.boardState, this.boardBack > 0);
      }
      this.hold = null;
    }
    this.holdBar.visible = this.hold !== null || this.armed > 0;
    if (this.armed > 0) this.holdBar.scale.x = 1;

    let hovered: Pickable | null = null;
    for (const h of pointers) if (h.tracked) hovered ??= this.under(h);
    if (hovered && hovered !== this.hoverWas) playHover();
    this.hoverWas = hovered;
    this.items.forEach((it, i) => {
      const on = it === hovered;
      // The three stations always say what they are; the rest only in the first session or when pointed at.
      const station = it.action.kind === 'play' || it.action.kind === 'forge' || it.action.kind === 'workshop';
      if (it.name) it.name.visible = !this.photoMode && ((!it.quiet && (this.teaching || station)) || on);
      const p = popIn(this.time - this.shownAt, i);
      const k = (on ? 1.15 + 0.03 * Math.sin(this.time * 8) : 1) * Math.max(0.001, p);
      it.model.scale.setScalar(k);
      if (it.carry) it.model.position.set(it.home.x, it.home.y + (on ? 0.01 : 0), it.home.z);
    });
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

  /**
   * A station's name: a plate lying on the table just in front of it (at `x, z` in `parent`'s space,
   * which stands on the table), leaning back at the touch band's one pitch, never turning.
   */
  private label(text: string, parent: Object3D, x: number, z: number, plate?: Nameplate): Mesh {
    const l = plate?.mesh ?? tag(text, 0.06, 0.55);
    plate?.set(text);
    l.position.set(x, SIGN_Y, z);
    l.rotation.x = -SIGN_TILT;
    parent.add(l);
    this.labels.push(l);
    return l;
  }

  /** The blueprint: a rolled-up plan on the near rim, between the level plate and the anvil. */
  private buildBlueprint() {
    const blueprint = new Group();
    const roll = new Mesh(new CylinderGeometry(0.007, 0.007, 0.055, 16).rotateZ(Math.PI / 2), plastic(0x5f8fc9));
    const band = new Mesh(new CylinderGeometry(0.0076, 0.0076, 0.007, 16).rotateZ(Math.PI / 2), BRASS);
    blueprint.add(roll, band);
    const holder = new Group();
    holder.add(blueprint);
    blueprint.rotation.y = -0.5;
    const home = new Vector3(BLUEPRINT_AT.x, TABLE_Y + 0.0075 + 0.012, BLUEPRINT_AT.z);
    holder.position.copy(home);
    const cradle = new Mesh(bevelBox(0.04, 0.012, 0.016, 0.0015).translate(0, 0.006, 0), GRAPHITE);
    cradle.position.set(BLUEPRINT_AT.x, TABLE_Y, BLUEPRINT_AT.z);
    cradle.rotation.y = -0.5;
    this.blueprint.add(cradle, holder);
    this.root.add(this.blueprint);
    // On the table in front of the roll, between the level plate and the anvil's name.
    const build = this.label('WORKSHOP', this.blueprint, BLUEPRINT_AT.x - 0.008, BLUEPRINT_AT.z + SIGN_AHEAD - 0.01);
    build.position.y += TABLE_Y;
    this.items.push({ action: { kind: 'workshop' }, carry: false, model: holder, home, name: build });
  }

  /** The comfort dial: a brass knob; each pinch turns it to the next mode (sound, flashes, the strike's gesture). */
  private buildComfort() {
    const knob = new Group();
    const brass = BRASS;
    knob.add(new Mesh(new CylinderGeometry(0.011, 0.012, 0.008, 20).translate(0, 0.004, 0), brass));
    // The pointer notch shows the mode the dial is on.
    const notch = new Mesh(new BoxGeometry(0.003, 0.002, 0.009).translate(0, 0.009, 0.005), new MeshBasicMaterial({ color: ORANGE }));
    knob.add(notch);
    const home = new Vector3(COMFORT_AT.x, TABLE_Y, COMFORT_AT.z);
    knob.position.copy(home);
    this.comfortKnob = knob;
    this.root.add(knob);
    // Its name lies beside it, not on the knob (the knob turns).
    const name = this.label('COMFORT', this.root, COMFORT_AT.x, COMFORT_AT.z + 0.03);
    name.position.y += TABLE_Y;
    this.items.push({ action: { kind: 'comfort' }, carry: false, model: knob, home, name, quiet: true });
  }

  /**
   * The brawl pegs: four brass pegs in a row, one lit per top in the next match (two: a duel; three
   * or four: a brawl where the last top spinning takes the heat). Each pinch adds a top, then wraps.
   */
  private buildBrawl() {
    const pegs = new Group();
    for (let i = 0; i < 4; i++) {
      const peg = new Mesh(new CylinderGeometry(0.004, 0.005, 0.012, 12).translate(0, 0.006, 0), BRAWL_OFF);
      peg.position.x = (i - 1.5) * 0.011;
      pegs.add(peg);
    }
    pegs.add(new Mesh(new BoxGeometry(0.05, 0.003, 0.014).translate(0, 0.0015, 0), BRASS));
    const home = new Vector3(BRAWL_AT.x, TABLE_Y, BRAWL_AT.z);
    pegs.position.copy(home);
    // A short column running away from you between the comfort dial and the level plate; your peg is nearest.
    pegs.rotation.y = Math.PI / 2;
    this.brawlPegs = pegs;
    this.root.add(pegs);
    const name = this.label('BRAWL', this.root, BRAWL_AT.x, BRAWL_AT.z + 0.035);
    name.position.y += TABLE_Y;
    this.items.push({ action: { kind: 'brawl' }, carry: false, model: pegs, home, name, quiet: true });
  }

  /** Lights one peg per top in the next match. */
  setBrawl(tops: number, online = false) {
    this.brawlPegs.children.forEach((peg, i) => {
      if (i < 4) (peg as Mesh).material = online ? BRAWL_ONLINE : i < tops ? (i === 0 ? BRAWL_MINE : BRAWL_ON) : BRAWL_OFF;
    });
  }

  /** Turns the dial's notch to mode i of n. */
  setComfort(i: number, n: number) {
    this.comfortKnob.rotation.y = -(i / n) * Math.PI * 1.5;
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
    const name = this.label('FORGE', this.anvil, 0, SIGN_AHEAD);
    this.items.push({ action: { kind: 'forge' }, carry: false, model: body, home: new Vector3(), name });
  }

  /**
   * Your smith level on the plate beside the dock: level and rank, the bar toward the next level,
   * where the level road leads next, and (after the first session) how the rivals' circuit stands.
   * The next match itself is PLAY's second line.
   */
  private drawRank(progress: Progress, nextMatch: string | null) {
    const next = progress.next;
    const [match, bout] = nextMatch ? nextMatch.split(' · ') : ['', ''];
    this.playSign.set('PLAY', match.toUpperCase());
    const key = `${progress.level}|${progress.rank}|${progress.fraction.toFixed(3)}|${next?.key}|${bout}|${progress.guide}`;
    if (key === this.rankKey) return;
    this.rankKey = key;
    const g = this.rankCanvas.getContext('2d')!;
    // Seen from about 0.45 m, shown at 0.8 of its size.
    const k = pxPerM(RANK_W, RANK_SIZE * 0.8 * ARENA_SCALE);
    const D = 0.45;
    metalPlate(g, RANK_W, RANK_H);
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    setType(g, 'title', k, D);
    const lv = `LV ${progress.level}`;
    engrave(g, lv, 48, 60, TEXT);
    const lvW = g.measureText(lv).width;
    setType(g, 'caption', k, D);
    engrave(g, progress.rank.toUpperCase(), 48 + lvW + 36, 64, UI_STEEL, RANK_W - 140 - lvW);
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillRect(48, 112, RANK_W - 96, 18);
    g.fillStyle = UI_STEEL;
    g.fillRect(48, 112, (RANK_W - 96) * progress.fraction, 18);
    // The first session has one goal (its match); the level road shows after it.
    if (progress.guide === 'done') {
      setType(g, 'caption', k, D);
      engrave(g, (next ? `NEXT: ${unlockLabel(next.key)} at LV ${next.level}` : 'EVERY PART IS YOURS').toUpperCase(), 48, 176, UI_STEEL, RANK_W - 96);
      engrave(g, `${bout ? `${bout.toUpperCase()} · ` : ''}PINCH FOR THE MAP`, 48, 230, TEXT_DIM, RANK_W - 96);
    }
    this.rankTex.needsUpdate = true;
  }

  /** Your top's dock on the near rim, with your smith level on a plate between it and the anvil. */
  private buildStand() {
    this.stand.position.set(DOCK_AT.x, TABLE_Y, DOCK_AT.z);
    this.rankCanvas.width = RANK_W;
    this.rankCanvas.height = RANK_H;
    this.rankTex = signTexture(this.rankCanvas);
    const h = (RANK_SIZE * RANK_H) / RANK_W;
    const rank = new Mesh(new PlaneGeometry(RANK_SIZE, h), new MeshBasicMaterial({ map: this.rankTex, transparent: true, depthWrite: false }));
    // Laid back at the touch band's pitch, below the arena's front edge.
    rank.rotation.x = -SIGN_TILT;
    addSlab(rank, RANK_SIZE, h, 0.06, PLATE_DEPTH / (ARENA_SCALE * 0.8));
    rank.scale.setScalar(0.8);
    // Held for 2 s, then pinched again, the level plate starts over as a new smith (shared headsets).
    const plate = new Group();
    plate.position.set(0, TABLE_Y + 0.03, DOCK_AT.z + 0.04);
    this.holdBar.position.set(-0.04, -0.016, 0.012);
    this.holdBar.rotation.x = -SIGN_TILT;
    plate.add(rank, this.holdBar);
    this.root.add(plate);
    this.items.push({ action: { kind: 'reset' }, carry: false, model: plate, home: plate.position.clone() });
    const dock = standModel();
    dock.scale.setScalar(RIM_SCALE);
    this.stand.add(dock);
    const name = this.label('PLAY', this.stand, 0, SIGN_AHEAD, this.playSign);
    // The top's view is rebuilt in show(), so the holder is what gets carried.
    this.stand.add(this.standHolder);
    this.items.push({ action: { kind: 'play' }, carry: true, model: this.standHolder, home: new Vector3(), name });
  }

  /** Your champions on small stands along the left rim, rebuilt when the list changes. */
  private fillChampions(progress: Progress) {
    const key = JSON.stringify(progress.champions.map((c) => [c, progress.scarsFor(c.build)]));
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
      view.scars(progress.scarsFor(c.build));
      view.root.scale.setScalar(0.8);
      view.root.position.y = DOCK_TOP * 0.8;
      this.championViews.push(view);
      holder.add(stand, view.root);
      const name = tag(`${c.wins} WIN${c.wins === 1 ? '' : 'S'}`, 0.05, 0.6);
      // Lying on the table toward the arena's middle, at the touch band's pitch.
      name.position.set(holder.position.x + 0.035, TABLE_Y + SIGN_Y, holder.position.z);
      name.rotation.x = -SIGN_TILT;
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
/** Without the hammer in the forge, where it would lie among the tray's parts. */
export function anvilModel(withHammer = true): Group {
  const iron = FORGED;
  const steel = STEEL;
  const graphite = GRAPHITE;
  const plinth = new Mesh(faceted(new CylinderGeometry(0.048, 0.056, 0.07, 8)), graphite);
  plinth.position.y = 0.035;
  const cap = new Mesh(faceted(new CylinderGeometry(0.052, 0.05, 0.006, 8)), graphite);
  cap.position.y = 0.072;
  const band = new Mesh(new TorusGeometry(0.049, 0.003, 6, 8).rotateX(Math.PI / 2).rotateY(Math.PI / 8), BRASS);
  band.position.y = 0.064;
  const seam = new Mesh(new TorusGeometry(0.053, 0.0015, 6, 8).rotateX(Math.PI / 2).rotateY(Math.PI / 8), new MeshBasicMaterial({ color: ORANGE }));
  seam.position.y = 0.012;
  const body = new Mesh(anvilBody(), iron);
  // The face: a polished steel plate with the square hardy hole near the heel.
  const face = new Mesh(bevelBox(0.1, 0.004, 0.046, 0.0012), steel);
  face.position.set(0.004, ANVIL_FACE - 0.002, 0);
  const hardy = new Mesh(new BoxGeometry(0.008, 0.0045, 0.008), new MeshBasicMaterial({ color: 0x15161a }));
  hardy.position.set(0.04, ANVIL_FACE - 0.0015, 0);
  // Heat in the face, not a sticker on it: a soft additive glow.
  const glow = new Mesh(new CircleGeometry(0.03, 24).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0xff5a1a, map: SOFT_SHADOW, transparent: true, opacity: 0.35, blending: AdditiveBlending, depthWrite: false }));
  glow.position.y = ANVIL_FACE + 0.0003;
  // The hammer: a tapered graphite handle with a brass ferrule, an octagonal steel head and a peen.
  const hammer = new Group();
  const handle = new Mesh(new CylinderGeometry(0.0035, 0.0052, 0.095, 8), graphite);
  handle.position.y = 0.0475;
  const ferrule = new Mesh(new CylinderGeometry(0.0058, 0.0058, 0.008, 8), BRASS);
  ferrule.position.y = 0.088;
  const head = new Mesh(faceted(new CylinderGeometry(0.0085, 0.0085, 0.026, 8)).rotateZ(Math.PI / 2), steel);
  head.position.set(0.004, 0.096, 0);
  const peen = new Mesh(new ConeGeometry(0.0085, 0.014, 8).rotateZ(Math.PI / 2), steel);
  peen.position.set(-0.016, 0.096, 0);
  hammer.add(handle, ferrule, head, peen);
  hammer.position.set(0.075, 0, 0.045);
  hammer.rotation.z = 0.3;
  const g = new Group();
  g.add(plinth, cap, band, seam, body, face, hardy, glow, softShadow(0.16));
  if (withHammer) g.add(hammer);
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
  // Contact shading per profile point: dark at the foot on the table and under the collar and cup.
  const occlusion = [0.55, 0.7, 0.85, 0.75, 1, 0.8, 0.65, 1, 0.7, 0.75, 1, 1, 1];
  const lathe = new LatheGeometry(profile, 32);
  const color = new Float32Array(lathe.getAttribute('position').count * 3);
  for (let i = 0; i < color.length / 3; i++) color.fill(occlusion[i % profile.length], i * 3, i * 3 + 3);
  lathe.setAttribute('color', new BufferAttribute(color, 3));
  const pedestal = new Mesh(lathe, GRAPHITE_AO);
  const seam = new Mesh(new TorusGeometry(0.0115, 0.0012, 6, 24).rotateX(Math.PI / 2), new MeshBasicMaterial({ color: ORANGE }));
  seam.position.y = 0.079;
  const brass = BRASS;
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

/** Flat-shaded facets (an octagon reads machined, not soft). */
function faceted(geo: BufferGeometry): BufferGeometry {
  const flat = geo.toNonIndexed();
  flat.computeVertexNormals();
  return flat;
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

/** The Circuit Map's chapter in play (the next bout's, or the last one when all are won), for the board. */
function boardMap(rec: BoutRecord, matches: number): BoardMap {
  // The same pick the match makes (medal bouts take turns by matches played).
  const next = nextBout(rec, matches % 2 === 0, matches);
  const chapter = next?.chapter ?? CHAPTERS.length;
  return {
    chapter: CHAPTERS[chapter - 1].name,
    bouts: BOUTS.filter((b) => b.chapter === chapter).map((b) => ({ id: b.id, rival: b.rival, medals: rec[b.id] ?? 0, open: boutOpen(b, rec), boss: b.boss, next: b === next })),
    medals: medalCount(rec),
    of: BOUTS.length * 3,
    gate: nextGate(rec),
  };
}
