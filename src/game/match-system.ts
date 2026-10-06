import { AdditiveBlending, CircleGeometry, createSystem, CylinderGeometry, Group, Matrix4, ConeGeometry, Mesh, MeshBasicMaterial, MeshMatcapMaterial, Object3D, Quaternion, RingGeometry, TorusGeometry, Vector3, VisibilityState, XRPlane } from '@iwsdk/core';
import { CordTone, playCrunch, playLocked, playPick, playPlace, playThock, setAudioPaused, playLevelUp, playUnlock, playXp, playBurst, playClash, playDash, playLaunch, playOver, playPocket, playResult, playTopple, SpinHum } from './audio.js';
import { HandInput, HandState, Side } from './hands.js';
import { ARENAS } from './arenas.js';
import { Builder, Button, loadArenas } from './builder.js';
import { normRadius, spawnDistance } from './layout.js';
import type { ArenaLayout } from './layout.js';
import { Arena, ATTACK, DEFENSE, finishPoints, MATCH_HEAT, LAUNCH_SPEED, LAUNCH_TILT, step, STEP, Top, TopSpec, TUNING, verdict } from './sim.js';
import type { FloorShape, ShapeKind } from './sim.js';
import { Forge, FORGE_SINK, itemKey, itemModel, loadBuild, ROWS, saveBuild } from './forge.js';
import { GUIDE_ORDER, MARK, Progress } from './progress.js';
import { dailyOrder, localDate, orderMet } from './orders.js';
import { SAVE_KEYS } from './demo-save.js';
import type { Order } from './orders.js';
import { anvilModel, Hub, miniArena, standModel } from './hub.js';
import { MatchBar } from './match-bar.js';
import { allBuilds, buildName, CORES, EMBLEM_COLORS, EMBLEM_NAMES, PRESETS, RINGS, RIVALS, roleOf, specFromBuild, TIPS } from './parts.js';
import type { Rival } from './parts.js';
import type { TopBuild } from './parts.js';
import { ArenaView, ChargePips, Cord, Impacts, Label, makeMatcap, OPPONENT_COLOR, ShapeMarks, Sparks, TopView } from './visuals.js';
import type { ShapeMarkSpec } from './visuals.js';
import { SHAPE_SIZE, ShapingCharges } from './shaping.js';
import { PEDESTAL, pickTable, placeArena } from './placement.js';
import { TUNE } from './tuning.js';
import type { Point } from './placement.js';

/** The arena (and everything on the table) is drawn this much larger than its simulation size. */
const ARENA_SCALE = TUNE.scale;
/** Placing waits at least this long for planes, and places on the tray after SETTLE_MAX without a table (s). */
const SETTLE_MIN = 0.5;
const SETTLE_MAX = 5;
/** A table found within this long after placing on the tray still gets the arena (s). */
const LATE_TABLE = 30;
/** The move handle: grabbed within this distance (world m); the arena moves at most this far up or down. */
const HANDLE_GRAB = 0.06;
const HANDLE_LIFT = 0.1;
/** Cord pull that counts as a full-power rip (m) and full-power pull speed (m/s). */
const FULL_PULL = TUNE.fullPull;
const FULL_SPEED = TUNE.fullSpeed;
/** Pulls shorter than this count as no pull (hand jitter). */
const MIN_PULL = 0.05;
/** Below this power nothing launches (a quick tap). */
const MIN_POWER = 0.15;
/** Pinches farther than this from the arena are ignored (a hand outside the play space). */
const LAUNCH_REACH = 1.0;
/** Pulling farther than this releases automatically. */
const MAX_PULL = 0.32;
/** Launch direction is clamped to this many radians off straight-at-center. */
const MAX_AIM = 0.6;
/** Pinches this close to the floor (vertically) grab it to start a ramp. */
const SHAPE_GRAB = 0.05;
const RESULT_TIME = 4;
/** A finish this soon (s) after the player's shape is credited to it. */
const CAUSE_WINDOW = 1.5;
const FINISH_WORD: Record<string, string> = { pocket: 'SLAG', over: 'THROWN', burst: 'SHATTER', spin: 'OUTLAST' };
/** Seconds the rival and arena intro shows before the first session's rip hint. */
const INTRO_TIME = 2.5;
/** A hand lost this long (s) cancels what it was doing, instead of acting as a release. */
const HAND_LOSS_GRACE = 0.1;
/** Where round messages hang: small, over the arena's far rim (arena-local). */
const LABEL_AT = new Vector3(0, 0.115, -0.21);
/** A clash this strong (0..1) is a hard hit: big feedback and a 45 ms simulation-only hit stop. */
/** Rivals from level 6 set a ramp at most this often (s). */
const RIVAL_SHAPE_GAP = 3;
/** A finish your shape caused plays its visuals at SLOW_MO speed for this long (real s). */
const SLOW_MO_TIME = 0.6;
const SLOW_MO = 0.3;
const HARD_HIT = 0.6;
/** Hard hits closer together than this (s) do not stop the simulation again. */
const HIT_STOP_GAP = 0.3;
const HIT_STOP = 0.045;
/** A pointing ray this close to a button's center (m) presses it. */
const BUTTON_REACH = 0.035;
/** Points needed to win a match (pocket and over finishes score 2, spin finishes 1). */
/** Launch power at or above this is a perfect rip: extra starting spin. */
const PERFECT = TUNE.perfect;
const PERFECT_SPIN = 1.1;
/** Far ramps (and the dev key's) grow at this rate (m/s) while the pinch is held. */
const RAY_BUMP_RATE = 0.05;


type Phase = 'placing' | 'hub' | 'ready' | 'pulling' | 'fight' | 'result' | 'build' | 'forge';

type RawPlane = { orientation?: string; semanticLabel?: string };

/**
 * One match loop on the table: place the arena, rip-cord launch against an AI top,
 * steer the fight by pulling bumps up and pressing dents into the floor, show the result.
 */
export class MatchSystem extends createSystem({
  planes: { required: [XRPlane] },
}) {
  private phase: Phase = 'placing';
  private settle = 0;
  /** The floor mesh needs one more sync (the arena was reset or a shape just ended). */
  private arenaDirty = true;
  /** The XR session the arena was placed in; a new one (or a recenter) places it again. */
  private xrSession: XRSession | null = null;
  private needPlace = false;
  /** When the arena was placed, whether on a table, and the table height it eases to if one turns up late. */
  private placedAt = 0;
  private onTable = false;
  private tableY: number | null = null;
  private tableCheck = 0;
  /** The brass handle on the pedestal's near face, and the hand dragging the arena by it. */
  private handle = new Group();
  private dragging: { hand: HandState; from: Vector3; start: Vector3 } | null = null;
  private hands = new HandInput();
  private root = new Group();
  private arena = new Arena();
  private arenaView = new ArenaView(PEDESTAL / ARENA_SCALE);
  /** Everything that tilts with a rocking dish: the arena and what is on it. */
  private stage = new Group();
  /** Arenas in rotation (built-ins plus the player's own) and the one in play. */
  private arenas: ArenaLayout[] = [...ARENAS, ...loadArenas()];
  private arenaIndex = 0;
  /** The arena builder and the button that opens it. */
  private builder = new Builder({
    preview: (layout) => this.showLayout(layout),
    tryIt: (layout) => this.tryArena(layout),
    play: (layout) => this.playBuilt(layout),
    exit: () => this.leaveBuilder(),
    arenaPoint: (h) => this.arenaPoint(h),
    toLocal: (world, out) => this.root.worldToLocal(out.copy(world)),
    floorHeight: (n) => this.arena.floorHeight(n),
  });
  /** Smith level, XP and unlocks, saved in the browser. */
  private progress = new Progress(typeof localStorage === 'undefined' ? null : localStorage);
  /** The match bar on the far rim. */
  private bar = new MatchBar();
  /** The forge: build your own top from parts. */
  private forge = new Forge({
    done: (build) => this.leaveForge(build),
    fitted: () => this.progress.advance('rematch'),
  }, this.progress);
  /** A demo round from the workshop's Try it: AI launches, no score, then back to the workshop. */
  private demo = false;
  private hubLogPending = false;
  /** The word in the middle of the match bar. */
  private barMessage = '';
  /** This match's rival: its build and spin stay for every round. */
  private rival: Rival = RIVALS[0];
  /** Points the match bar shows (kept after a match is decided), XP just earned, the last rip. */
  private barPoints: [number, number] = [0, 0];
  private xpGained = 0;
  private lastPerfect = false;
  /** Today's Smith Order, whether this match plays it, and what the order needs to know. */
  private order: Order | null = null;
  private orderMatch = false;
  private wellInRound = false;
  private perfectInMatch = false;
  private levelUpText = '';
  private perfTimer = 0;
  private paused = false;
  /** Seconds the pulling hand has been untracked. */
  private lostFor = 0;
  /** When the current ready phase began (for the intro before the first rip hint). */
  private readySince = 0;
  /** Seconds left of the simulation-only pause after a hard hit. */
  private hitStop = 0;
  private lastHardHit = -1;
  private impacts = new Impacts();
  private showcase = new Group();
  /** First-session hints: arrows teaching the rip, and a marker where a bump would pay off. */
  private ripArrows = new Group();
  private bumpMark = new Mesh(new RingGeometry(0.012, 0.016, 32).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0xffd28a, transparent: true, depthWrite: false }));
  private bumpHintShown = false;
  /** Unlocks waiting to be shown over the arena, and the one showing. */
  private reveals: string[] = [];
  private reveal: { obj: Object3D; t: number } | null = null;
  private rewardHold = 0;
  /** Home screen buttons, in front of the arena; and the small Menu button during a match. */
  /** Home: the smithy stations around the arena (top stand, arena rack, anvil). */
  private hub = new Hub();
  private menuButton = new Button('menu', 0.07, 0.026);
  /** Everything that can point and pinch at buttons and the arena: both hands, plus the gaze in dev. */
  private pointers: HandState[] = [];
  private gazePointer: HandState = {
    tracked: false,
    pinching: false,
    justPinched: false,
    justReleased: false,
    pinch: new Vector3(),
    index: new Vector3(),
    wrist: new Vector3(),
    rayOrigin: new Vector3(),
    rayDir: new Vector3(),
    rayQuat: new Quaternion(),
    hasRay: false,
  };
  /** The player's top and the opponent's; their type (spec) changes between rounds. */
  private mine = new Top(ATTACK);
  private theirs = new Top(DEFENSE);
  private tops = [this.mine, this.theirs];
  private hums = [new SpinHum(230), new SpinHum(190)];
  private cordTone = new CordTone();
  /** Seconds since the last clash sound, to keep grinding contacts from machine-gunning. */
  private sinceClashSound = 1;
  /** Builds for the coming round are chosen once per round, not on every reset. */
  private typesPicked = false;
  /** A match just ended: the next ready screen moves on to the next arena. */
  private matchOver = false;
  /** Your build (from the forge) and the opponent's; each side's view is rebuilt when its build changes. */
  private myBuild: TopBuild = loadBuild();
  private theirBuild: TopBuild = { ...PRESETS[1].build, spin: -1 };
  private myView!: TopView;
  private theirView!: TopView;
  private viewKeys = ['', ''];
  private cord = new Cord();
  private sparks = new Sparks();
  private label = new Label();
  private round = 0;
  /** Match score in heat: first to MATCH_HEAT wins the match. */
  private myPoints = 0;
  private theirPoints = 0;
  private elapsed = 0;
  private accumulator = 0;
  private resultTimer = 0;
  private time = 0;
  private frameDt = 0;
  /** Which hand holds the cord, and pull bookkeeping. */
  private puller: Side | null = null;
  private maxPull = 0;
  private peakSpeed = 0;
  private lastPull = 0;
  /** Per-hand bump being held: arena-local anchor and the pinch height when grabbed. */
  /**
   * A ramp being made by each hand: locked start point, pinch height and position at the start,
   * time held, near or far (ray), and its current height and push direction (the ghost).
   */
  private shaping: Record<Side, { x: number; z: number; y0: number; sx: number; sz: number; t: number; far: boolean; amp: number; dx: number; dz: number } | null> = { left: null, right: null };
  /** A fingertip pressed into the floor already made its well (until it lifts out). */
  private pressing: Record<Side, boolean> = { left: false, right: false };
  /** Each hand's fingertip height last frame (arena-local), and when it last set a ramp. */
  private tipY: Record<Side, number> = { left: 0, right: 0 };
  private tipDown: Record<Side, number> = { left: 0, right: 0 };
  private rampAt: Record<Side, number> = { left: -9, right: -9 };
  /** The shaping economy, the marks for shapes and ghosts, the charge embers at the near rim. */
  private charges = new ShapingCharges();
  /** Rivals from level 6 shape too: their own charges, their last ramp, and its cyan marks. */
  private rivalCharges = new ShapingCharges();
  private rivalShapeAt = -9;
  private rivalMarks = new ShapeMarks(0x4fd1ff);
  /** After a finish your shape caused, the visuals play slowly for a moment (real seconds left). */
  private slowMo = 0;
  private marks = new ShapeMarks(0xff8a2a);
  private pips = new ChargePips();
  /** The player's last shape (fight time and kind), to name it when it decides a round. */
  private lastShape: { t: number; kind: ShapeKind } | null = null;
  /** Which tops already ran into which shape (one crunch each). */
  private crunched = new WeakMap<FloorShape, Set<Top>>();
  /** Dev: the time B was pressed (a ramp at the gaze grows while it is held). */
  private devRampSince = -1;
  private devWellHeld = false;
  private clashes = 0;
  private head = new Vector3();
  private fwd = new Vector3();
  private p = new Vector3();
  private local = new Vector3();
  private pullStart = new Vector3();
  private cordStart = new Vector3();
  /** Seconds left before a transient fight message clears. */
  private labelTimer = 0;
  private pullEnd = new Vector3();
  private handleWorld = new Vector3();
  /** Dev-only keyboard + gaze controls so the prototype can be played in the emulator without pinching. */
  private keys = new Set<string>();
  private charge = 0;
  private gazeHit = { ok: false, x: 0, z: 0 };
  private gazeDir = new Vector3();
  private rootInverse = new Matrix4();
  private rayHit = { ok: false, x: 0, z: 0 };
  private rayLocalO = new Vector3();
  private rayLocalD = new Vector3();
  private chargeRing = new Mesh(
    new TorusGeometry(0.036, 0.003, 8, 48).rotateX(Math.PI / 2),
    new MeshBasicMaterial({ color: 0xff8a2a, transparent: true, blending: AdditiveBlending, depthWrite: false }),
  );
  private reticle = new Mesh(
    new CircleGeometry(0.006, 20).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0x3fd0ff, transparent: true, opacity: 0.85, depthTest: false }),
  );

  init() {
    this.root.name = 'spinsmith-arena';
    this.reticle.visible = false;
    this.root.visible = false;
    // Messages hang small over the arena's far rim, never between the eyes and the tops.
    this.label.mesh.position.copy(LABEL_AT);
    this.label.mesh.scale.setScalar(1.25);
    this.reticle.renderOrder = 10;
    this.chargeRing.visible = false;
    this.stage.add(
      this.chargeRing,
      this.reticle,
      this.arenaView.root,
      this.sparks.points,
      this.impacts.root,
      this.ripArrows,
      this.bumpMark,
      this.marks.root,
      this.rivalMarks.root,
      this.pips.root,
    );
    this.myBuild = this.forge.allowed(this.myBuild);
    this.setBuilds(this.myBuild, this.theirBuild);
    this.buildHandle();
    this.root.add(this.handle, this.stage, this.label.mesh, this.builder.root, this.forge.root, this.hub.root, this.menuButton.mesh);
    this.menuButton.mesh.position.set(-0.2, 0.05, 0.14);
    this.menuButton.mesh.rotation.y = 0.4;
    this.menuButton.set('Menu');
    this.menuButton.mesh.visible = false;
    this.pointers = import.meta.env.DEV ? [this.gazePointer, this.hands.right, this.hands.left] : [this.hands.right, this.hands.left];
    if (import.meta.env.DEV) {
      // A crosshair in the middle of the view shows where the gaze pointer aims.
      const crosshair = new Mesh(new RingGeometry(0.003, 0.0055, 24), new MeshBasicMaterial({ color: 0xff6a1a, depthTest: false, transparent: true }));
      crosshair.position.z = -0.4;
      crosshair.renderOrder = 999;
      this.player.head.add(crosshair);
    }
    this.setArena(this.arenas[this.arenaIndex]);
    this.world.createTransformEntity(this.root);
    // The cord spans from the launcher to the hand in world space, so it is not parented to the arena.
    this.world.createTransformEntity(this.cord.line);
    // The match bar: a metal strip set into the far rim, tipped back toward the player, under the
    // round messages, so score and fight share one view.
    this.bar.mesh.position.set(0, 0.03, -0.205);
    this.bar.mesh.rotation.x = -0.55;
    this.bar.mesh.scale.setScalar(0.17);
    this.root.add(this.bar.mesh);

    if (import.meta.env.DEV) {
      const onKey = (e: KeyboardEvent) => {
        if (e.repeat) return;
        this.keys.add(e.code);
        if (e.code === 'KeyR') {
          if (this.phase === 'hub' || this.phase === 'forge' || this.phase === 'build') this.startMatch();
          else this.toReady();
        }
        // Asset review: the three classic tops side by side over the arena, turning slowly.
        if (e.code === 'KeyV') {
          if (this.showcase.children.length === 0) {
            PRESETS.forEach((p, i) => {
              const v = new TopView(p.build, p.build.color);
              v.root.position.set((i - 1) * 0.15, 0.05, 0.02);
              v.root.scale.setScalar(1.6);
              this.showcase.add(v.root);
            });
            // The props too, on the table level beside them.
            const anvil = anvilModel();
            anvil.position.set(0.3, -0.04, 0.02);
            const stand = standModel();
            stand.position.set(-0.3, -0.04, 0.02);
            this.showcase.add(anvil, stand);
            this.stage.add(this.showcase);
            this.showcase.visible = false;
          }
          this.showcase.visible = !this.showcase.visible;
        }
        // Start over as a new player: progress and the saved top are cleared.
        if (e.code === 'Backquote') {
          localStorage.removeItem('spinsmith.progress.v1');
          localStorage.removeItem('spinsmith.top.v1');
          location.reload();
        }
        if (e.code === 'KeyP') this.phase = 'placing';
        if (e.code === 'KeyL' && (this.phase === 'ready' || this.phase === 'result')) this.launch(0.8, 0);
        if (e.code === 'KeyK' && this.phase === 'fight') {
          // Burst the opponent now, to see the burst finish.
          this.theirs.state = 'out';
          this.theirs.finish = 'burst';
        }
        if (e.code === 'KeyH' && (this.phase === 'hub' || this.phase === 'result' || this.phase === 'ready')) {
          // A match against Hookjaw, the first rival that uses the arena too.
          this.startMatch(RIVALS.find((r) => r.name === 'Hookjaw'));
        }
        if (e.code === 'KeyO' && this.phase === 'fight') {
          // Throw the opponent over the wall now, outward from the center, to see it land on the table.
          const t = this.theirs;
          const r = Math.hypot(t.x, t.z) || 1;
          t.vx = (t.x / r) * 0.8;
          t.vz = (t.z / r) * 0.8;
          t.state = 'out';
          t.finish = 'over';
        }
      };
      const onKeyUp = (e: KeyboardEvent) => {
        this.keys.delete(e.code);
        if (e.code === 'Space' && this.charge > 0 && (this.phase === 'ready' || this.phase === 'result')) {
          // Aim toward where the player is looking, like the slingshot aim.
          const aim = this.gazeHit.ok ? Math.max(-MAX_AIM, Math.min(MAX_AIM, Math.atan2(this.gazeHit.x, this.SPAWN - this.gazeHit.z))) : 0;
          this.launch(this.charge, aim);
        }
        if (e.code === 'Space') this.charge = 0;
      };
      window.addEventListener('keydown', onKey);
      window.addEventListener('keyup', onKeyUp);
      this.cleanupFuncs.push(
        () => window.removeEventListener('keydown', onKey),
        () => window.removeEventListener('keyup', onKeyUp),
      );

    }
  }

  update(delta: number) {
    const xr = this.world.renderer.xr;
    const frame = xr.getFrame();
    const ref = xr.getReferenceSpace();
    const session = xr.getSession();
    if (!frame || !ref || !session || this.world.visibilityState.peek() === VisibilityState.NonImmersive) return;
    // The headset menu (or anything that hides or blurs the session) pauses the game: the fight
    // and every sound stop until the player is back, and the paused time is not simulated.
    const paused = this.world.visibilityState.peek() !== VisibilityState.Visible;
    if (paused !== this.paused) {
      this.paused = paused;
      setAudioPaused(paused);
    }
    if (paused) return;
    // A new XR session (leaving and coming back) or a recenter puts the arena in front again.
    if (session !== this.xrSession) {
      if (this.xrSession) this.needPlace = true;
      this.xrSession = session;
      ref.addEventListener('reset', () => (this.needPlace = true));
    }
    const dt = Math.min(delta, 0.05);
    this.frameDt = dt;
    this.time += dt;
    this.hands.update(frame, ref, session, this.player);
    if (import.meta.env.DEV) {
      // In the emulator the gaze crosshair is the only far pointer: the hands' own rays would aim
      // somewhere else at the same time. Hands still work by touch. On a headset, hands do both.
      this.hands.left.hasRay = false;
      this.hands.right.hasRay = false;
      this.updateGazePointer();
    }

    if (this.needPlace && this.phase !== 'placing') {
      this.needPlace = false;
      if (this.phase === 'pulling' || this.phase === 'fight' || this.phase === 'result') this.toReady();
      this.placeRoot();
    }
    this.easeToTable(dt);
    this.handle.visible = this.phase === 'hub';
    switch (this.phase) {
      case 'placing':
        // Wait for a table to be detected, but never long: without one the arena floats on a tray.
        this.settle += dt;
        this.player.head.getWorldPosition(this.head);
        if ((this.settle >= SETTLE_MIN && pickTable(this.head, this.tables()) !== null) || this.settle >= SETTLE_MAX) this.place();
        return;
      case 'hub':
        this.updateHub(dt);
        break;
      case 'build':
        this.updateBuilder(dt);
        break;
      case 'forge':
        this.forge.update(this.pointers, dt);
        // The arena floor sinks as the forge rises out of it.
        this.stage.position.y = -FORGE_SINK * this.forge.opened;
        break;
      case 'ready':
      case 'result':
        if (this.phase === 'result') {
          this.resultTimer -= dt;
          if (this.resultTimer <= 0) {
            if (this.demo) this.endDemo();
            else if (this.matchOver) this.toHub();
            else this.toReady();
            break;
          }
          if (this.demo) break;
        }
        if (this.pickButton([this.menuButton]) === 'menu') {
          this.toHub();
          break;
        }
        this.updateReadyPinch();
        break;
      case 'pulling':
        this.updatePull(dt);
        break;
      case 'fight':
        if (this.labelTimer > 0 && (this.labelTimer -= dt) <= 0) this.label.set('');
        this.updateShaping();
        this.updateFight(dt);
        break;
    }
    if (import.meta.env.DEV) {
      this.devControls(dt);
      // Draw calls and triangles of the last frame, every few seconds, to keep an eye on the budget.
      if ((this.perfTimer += dt) > 3) {
        this.perfTimer = 0;
        const r = this.world.renderer.info.render;
        console.log(`[PERF] ${this.phase} calls ${r.calls} tris ${r.triangles}`);
      }
    }
    this.updateReticle();
    // The floor mesh follows the simulation only while it changes: live shapes or embers, plus one
    // frame after they end, and after any reset of the arena.
    const moving = this.arena.shapes.length > 0 || this.arena.safe < 1;
    if (moving || this.arenaDirty) this.arenaView.sync(this.arena);
    this.arenaDirty = moving;
    const live = this.phase === 'fight';
    this.tops.forEach((t, i) => this.hums[i].update(live && t.alive ? Math.max(0, t.spin) : 0, Math.hypot(t.vx, t.vz), t.wobble, this.time));
    this.sinceClashSound += dt;
    if (this.phase === 'ready' || this.phase === 'pulling' || this.phase === 'fight' || this.phase === 'result') {
      const p = this.progress;
      this.bar.bar(this.mine.spin, this.theirs.spin, this.barPoints[0], this.barPoints[1], MATCH_HEAT, ['YOU', this.rival.name.toUpperCase()], this.phase === 'fight' && this.barMessage === 'READY' ? 'FIGHT' : this.barMessage, {
        level: p.level,
        rank: p.rank,
        fraction: p.fraction,
        gained: this.phase === 'result' ? this.xpGained : 0,
        show: this.phase === 'result',
      });
    }
    // Visuals only: after a finish your shape caused they slow down for a moment.
    const vdt = this.slowMo > 0 ? dt * SLOW_MO : dt;
    this.slowMo = Math.max(0, this.slowMo - dt);
    this.myView.sync(this.mine, this.arena, this.time, vdt);
    this.theirView.sync(this.theirs, this.arena, this.time, vdt);
    this.sparks.update(vdt);
    this.impacts.update(vdt);
    this.updateGuide();
    for (const c of this.showcase.children) c.rotation.y += dt * 0.4;
    this.updateRewards(dt);
    this.updateShapes();
    this.arenaView.update(dt, this.arena);
    this.stage.rotation.set(this.arena.tiltX, 0, this.arena.tiltZ);
  }

  /** Player's top this round (alternates so both shapes get played). */
  /** Where the tops start in this arena (on the launch axis). */
  private get SPAWN() {
    return spawnDistance(this.arena.layout);
  }

  /** Switches to another arena layout (rebuilds the visuals). */
  setArena(layout: ArenaLayout) {
    this.arena.reset(layout);
    this.arenaDirty = true;
    this.arenaView.build(layout);
    console.log(`[MATCH] arena ${layout.name}`);
  }

  /** Shows a layout in the arena without changing the rotation (builder preview). */
  private showLayout(layout: ArenaLayout) {
    this.arena.reset(layout);
    this.arenaDirty = true;
    this.arenaView.build(layout);
  }

  /**
   * Hover and press for a set of buttons, near (pinch) or far (pointing ray, or the gaze in dev).
   * Returns the id of a button pinched this frame, else null. Only one press per frame.
   */
  private pickButton(buttons: Button[]): string | null {
    let hovered: Button | null = null;
    let pressed: string | null = null;
    for (const h of this.pointers) {
      if (!h.tracked) continue;
      for (const b of buttons) {
        if (!b.mesh.visible) continue;
        b.mesh.getWorldPosition(this.p);
        const near = h.pinch.distanceTo(this.p) < 0.05;
        const t = this.local.copy(this.p).sub(h.rayOrigin).dot(h.rayDir);
        const far = h.hasRay && t > 0 && this.local.copy(h.rayDir).multiplyScalar(t).add(h.rayOrigin).distanceTo(this.p) < Math.max(BUTTON_REACH, b.height * 0.8);
        if (!near && !far) continue;
        hovered ??= b;
        if (h.justPinched && !pressed) pressed = b.id;
      }
    }
    for (const b of buttons) b.highlight(b === hovered);
    return pressed;
  }

  /** Home: the arena waits with both tops; Play, Workshop, or switch arena. Pinching never launches here. */
  private toHub() {
    this.phase = 'hub';
    this.matchOver = false;
    this.arena.reset(this.arenas[this.arenaIndex]);
    this.arenaDirty = true;
    this.arenaView.build(this.arena.layout);
    this.setBuilds(this.myBuild, this.theirBuild);
    this.mine.launch(0, this.SPAWN, 0, 0, 1, this.myBuild.spin);
    this.theirs.launch(0, -this.SPAWN, 0, 0, 1, this.theirBuild.spin);
    this.cord.set(null);
    this.menuButton.mesh.visible = false;
    // Your top waits on its stand, not in the arena.
    this.mine.state = 'out';
    // Today's order, from the local date and what the player can meet and play now.
    this.orderMatch = false;
    const now = new Date();
    const today = localDate(now);
    const ctx = {
      rivals: RIVALS.filter((r) => r.level <= this.progress.level).map((r) => r.name),
      arenas: ARENAS.filter((a) => this.progress.isUnlocked(`arena:${a.name}`)),
      built: this.arenas.filter((a) => !ARENAS.includes(a)),
    };
    this.order = this.progress.orderFor(today, () => dailyOrder(today, ctx));
    // A teaser of tomorrow's order once today's is done (as things stand now).
    const tomorrow = this.progress.hasOrder(today) ? dailyOrder(localDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)), ctx) : null;
    this.hub.show(this.arenas, this.arenaIndex, this.myBuild, this.progress, this.order, tomorrow);
    if (import.meta.env.DEV) console.log(`[ORDER] today ${this.order.date}: ${this.order.text} in ${this.order.arena}${this.progress.hasOrder(this.order.date) ? ' (done)' : ''} · ${this.progress.stamps} stamps`);
    this.label.set('');
    // A message still timing out must not wipe the note set below.
    this.labelTimer = 0;
    this.bar.mesh.visible = false;
    // The first session says where to reach next.
    const guide = this.progress.guide;
    if (guide === 'launch') this.label.set('Your top waits in its dock\nPut it in the arena to play');
    else if (guide === 'bump' || guide === 'match') this.label.set('Finish your first match\nPut your top in the arena');
    else if (guide === 'forge' || guide === 'fit') this.label.set('New part: Spur tip!\nPinch the small anvil to forge');
    else if (guide === 'rematch') this.label.set('Your top is ready\nPut it in the arena for a rematch');
    // Notes hang over the far rim, left of the arena shelf; the beacon marks the dock or the anvil.
    this.label.mesh.position.set(-0.16, LABEL_AT.y, LABEL_AT.z);
    this.label.mesh.scale.setScalar(1.25);
    if (import.meta.env.DEV) this.hubLogPending = true;
  }

  private updateHub(dt: number) {
    if (this.moveArena()) return;
    if (this.labelTimer > 0 && (this.labelTimer -= dt) <= 0) this.label.set('');
    this.player.head.getWorldPosition(this.p);
    if (import.meta.env.DEV && this.hubLogPending) {
      this.hubLogPending = false;
      console.log(`[HUB] ${this.hub.debugPositions()}`);
    }
    const action = this.hub.update(this.pointers, dt, this.p);
    if (!action) return;
    if (action.kind === 'play') {
      if (this.progress.guide === 'rematch') this.progress.advance('done');
      this.startMatch();
    } else if (action.kind === 'forge') {
      this.hub.hide();
      this.openForge();
    } else if (action.kind === 'workshop') {
      this.hub.hide();
      this.openWorkshop();
    } else if (action.kind === 'order') {
      const o = this.order;
      if (!o || this.progress.hasOrder(o.date)) {
        this.label.set("Today's order is done\nA new one comes tomorrow");
        this.labelTimer = 2.5;
        return;
      }
      // The order's arena and rival, then a normal match.
      const index = this.arenas.findIndex((a) => a.name === o.arena);
      if (index >= 0) {
        this.arenaIndex = index;
        this.setArena(this.arenas[index]);
      }
      this.startMatch(RIVALS.find((r) => r.name === o.rival));
      this.orderMatch = true;
    } else if (action.kind === 'champion') {
      const c = this.progress.champions[action.index];
      if (!c) return;
      this.myBuild = this.forge.allowed({ ...c.build });
      saveBuild(this.myBuild);
      playPlace();
      this.toHub();
      this.label.set(`Your top: ${buildName(this.myBuild)}\n${c.wins} match win${c.wins === 1 ? '' : 's'}`);
      this.labelTimer = 2.5;
    } else if (action.kind === 'reset') {
      return;
    } else if (action.kind === 'armReset') {
      this.label.set('Start over as a new smith?\nPinch the level plate again');
      this.labelTimer = 3;
    } else if (action.kind === 'newSmith') {
      // A new player on a shared headset: progress, the saved top and built arenas are forgotten.
      this.progress.reset();
      for (const k of SAVE_KEYS) if (k !== 'spinsmith.progress.v1') localStorage.removeItem(k);
      this.myBuild = this.forge.allowed({ ...PRESETS[0].build });
      this.arenas = [...ARENAS];
      this.arenaIndex = 0;
      this.setArena(this.arenas[0]);
      playLevelUp();
      console.log('[HUB] new smith');
      this.toHub();
    } else if (action.kind === 'locked') {
      this.label.set(action.text);
      this.labelTimer = 2;
    } else {
      this.arenaIndex = action.index;
      this.setArena(this.arenas[this.arenaIndex]);
      this.toHub();
    }
  }

  private openForge() {
    this.phase = 'forge';
    this.label.set('');
    for (const top of this.tops) top.state = 'out';
    // The forge is the arena transformed: the floor sinks, the anvil and the drawers rise.
    this.bar.mesh.visible = false;
    // The first session's forge visit is about one part: the one just earned.
    const focus = this.progress.guide === 'forge' || this.progress.guide === 'fit' ? 'tip:rush' : null;
    this.progress.advance('fit');
    this.forge.open(focus);
  }

  /** Back home from the forge; a saved build becomes your top. */
  private leaveForge(build: TopBuild | null) {
    this.forge.close();
    this.stage.position.y = 0;
    if (build) this.myBuild = { ...build };
    this.toHub();
  }

  /** Builds both sides' fight stats and views (views only rebuild when a build changed). */
  private setBuilds(mine: TopBuild, theirs: TopBuild) {
    this.mine.spec = specFromBuild(mine);
    this.theirs.spec = specFromBuild(theirs);
    this.mine.hand = mine.spin;
    this.theirs.hand = theirs.spin;
    this.theirBuild = theirs;
    const sides: [TopBuild, number, 0 | 1][] = [
      [mine, mine.color, 0],
      [theirs, OPPONENT_COLOR, 1],
    ];
    for (const [build, color, i] of sides) {
      const key = JSON.stringify([build.ring, build.core, build.tip, color]);
      if (key === this.viewKeys[i]) continue;
      this.viewKeys[i] = key;
      const old = i === 0 ? this.myView : this.theirView;
      old?.dispose();
      const view = new TopView(build, color);
      view.root.name = i === 0 ? 'my-top' : 'their-top';
      this.stage.add(view.root, view.shadowMesh, view.debris);
      if (i === 0) this.myView = view;
      else this.theirView = view;
    }
  }

  /** An opponent: a classic top half the time, otherwise any legal build; either spin. */
  /** A rival for a new match, from the archetypes your level has reached; the same all match. */
  private pickRival(): Rival {
    const pool = RIVALS.filter((r) => r.level <= this.progress.level);
    // Newly reached archetypes come up more often.
    const weights = pool.map((r) => 1 + r.level / 4);
    let x = Math.random() * weights.reduce((t, w) => t + w, 0);
    for (let i = 0; i < pool.length; i++) if ((x -= weights[i]) <= 0) return pool[i];
    return pool[0];
  }

  /** Any build, for the workshop's demo rounds. */
  private randomBuild(): TopBuild {
    const pool = allBuilds();
    const b = pool[Math.floor(Math.random() * pool.length)];
    return { ...b, spin: Math.random() < 0.7 ? -1 : 1, color: OPPONENT_COLOR };
  }

  private openWorkshop() {
    this.phase = 'build';
    this.label.set('');
    for (const top of this.tops) top.state = 'out';
    this.bar.mesh.visible = false;
    this.builder.open(this.arena.layout);
  }

  /** Workshop: the rail, the plates and the rim, all handled by the builder. */
  private updateBuilder(dt: number) {
    this.builder.update(this.pointers, dt);
  }

  /** Try it: two AI tops fight in the draft arena; the workshop comes back after the round. */
  private tryArena(layout: ArenaLayout) {
    this.menuButton.mesh.visible = false;
    this.arena.reset(layout);
    this.arenaDirty = true;
    this.demo = true;
    this.setBuilds(this.randomBuild(), this.randomBuild());
    this.launch(0.6 + Math.random() * 0.35, (Math.random() - 0.5) * 0.6);
  }

  /** Back to the workshop or the forge after a demo round. */
  private endDemo() {
    this.demo = false;
    this.typesPicked = false;
    this.phase = 'build';
    this.label.set('');
    for (const top of this.tops) top.state = 'out';
    this.arena.reset();
    this.arenaDirty = true;
    this.builder.fold('out');
  }

  /**
   * Dev builds add the head's gaze as a pointer that pinches whenever a hand pinches: in the
   * emulator's mouse-look mode the hands hang below the view, so you aim with the view instead.
   */
  private updateGazePointer() {
    const g = this.gazePointer;
    const head = this.player.head;
    head.getWorldPosition(g.rayOrigin);
    head.getWorldDirection(g.rayDir).negate();
    head.getWorldQuaternion(g.rayQuat);
    g.hasRay = true;
    g.tracked = true;
    g.pinch.set(0, -100, 0);
    const was = g.pinching;
    g.pinching = this.hands.left.pinching || this.hands.right.pinching;
    g.justPinched = g.pinching && !was;
    g.justReleased = !g.pinching && was;
  }

  /** Where a hand points at the arena (near pinch first, else its ray), including just past the rim. */
  private arenaPoint(h: HandState): { x: number; z: number } | null {
    const l = this.toLocal(h.pinch);
    const L = this.arena.layout;
    if (normRadius(L, l.x, l.z) < 1.3 && Math.abs(l.y - this.arena.floorHeight(Math.min(1, normRadius(L, l.x, l.z)))) < 0.04) return { x: l.x, z: l.z };
    if (!h.hasRay) return null;
    const o = this.root.worldToLocal(this.rayLocalO.copy(h.rayOrigin));
    const d = this.rayLocalD.copy(h.rayDir).transformDirection(this.rootInverse.copy(this.root.matrixWorld).invert());
    for (let t = 0.02; t < 2; t += 0.004) {
      const x = o.x + d.x * t;
      const z = o.z + d.z * t;
      const n = normRadius(L, x, z);
      if (o.y + d.y * t <= this.arena.floorHeight(Math.min(1, n))) return n < 1.3 ? { x, z } : null;
    }
    return null;
  }

  private playBuilt(layout: ArenaLayout) {
    this.arenas.push(layout);
    this.arenaIndex = this.arenas.length - 1;
    this.setArena(layout);
    this.startMatch();
  }

  /**
   * A new match from anywhere (home, the workshop's Save & play, the dev key): every other
   * place closes, a rival is picked, the score and this round's builds are fresh.
   */
  private startMatch(rival?: Rival) {
    this.hub.hide();
    this.builder.close();
    this.forge.close();
    this.stage.visible = true;
    this.demo = false;
    this.rival = rival ?? this.pickRival();
    this.perfectInMatch = false;
    this.myPoints = 0;
    this.theirPoints = 0;
    // A workshop demo leaves its random builds in place; the match picks yours and the rival's.
    this.typesPicked = false;
    this.phase = 'ready';
    this.toReady();
  }

  private leaveBuilder() {
    this.builder.close();
    this.setArena(this.arenas[this.arenaIndex]);
    this.toHub();
  }

  /** This round: your build against a fresh opponent. */
  private pickBuilds() {
    this.setBuilds(this.myBuild, { ...this.rival.build, color: OPPONENT_COLOR });
    console.log(`[MATCH] rival ${this.rival.name}: ${this.theirs.spec.name}, spin ${this.theirs.hand}`);
  }

  private describe(t: TopSpec) {
    return `${t.name} (${roleOf(t)})`;
  }

  /** The first placement: the arena in front, then home. */
  private place() {
    this.placeRoot();
    this.toHub();
  }

  /** Puts the arena a comfortable reach ahead, on a table if there is one, facing the head. */
  private placeRoot() {
    const head = this.player.head;
    head.getWorldPosition(this.head);
    head.getWorldDirection(this.fwd);
    // getWorldDirection returns +Z of the object; the camera looks down -Z.
    this.fwd.negate();
    const at = placeArena(this.head, this.fwd.x, this.fwd.z, this.tables(), TUNE.reach);
    this.root.position.set(at.x, at.y, at.z);
    this.root.scale.setScalar(ARENA_SCALE);
    // Local +Z points back at the player.
    this.root.rotation.set(0, at.yaw, 0);
    this.root.visible = true;
    this.onTable = at.onTable;
    this.tableY = null;
    this.placedAt = this.time;
    console.log(`[MATCH] arena on ${at.onTable ? 'table' : 'tray'} at ${[at.x, at.y, at.z].map((v) => v.toFixed(2)).join(',')}`);
    if (import.meta.env.DEV) this.hubLogPending = true;
  }

  /** The move handle: a brass grip on a short post, out from the pedestal's near face. */
  private buildHandle() {
    const brass = new MeshMatcapMaterial({ matcap: makeMatcap('metal', 0xe2b866) });
    const post = new Mesh(new CylinderGeometry(0.003, 0.003, 0.02, 10).rotateX(Math.PI / 2), brass);
    post.position.z = -0.01;
    const grip = new Mesh(new TorusGeometry(0.009, 0.003, 8, 20), brass);
    this.handle.add(post, grip);
    this.handle.position.set(0, -0.026, 0.215);
    this.handle.visible = false;
  }

  /** Centers of the detected horizontal table and desk planes (world). */
  private tables(): Point[] {
    const out: Point[] = [];
    for (const e of this.queries.planes.entities) {
      const plane = e.getValue(XRPlane, '_plane') as RawPlane | undefined;
      if (plane?.orientation !== 'horizontal' || !/table|desk/.test(plane.semanticLabel ?? '')) continue;
      const p = e.object3D!.getWorldPosition(new Vector3());
      out.push({ x: p.x, y: p.y, z: p.z });
    }
    return out;
  }

  /** A table detected after the arena went on the tray: the arena eases down onto it. */
  private easeToTable(dt: number) {
    if (this.phase !== 'placing' && !this.onTable && !this.dragging && this.time - this.placedAt < LATE_TABLE && (this.tableCheck -= dt) <= 0) {
      this.tableCheck = 0.5;
      this.player.head.getWorldPosition(this.head);
      const table = pickTable(this.head, this.tables());
      if (table !== null) {
        this.onTable = true;
        this.tableY = table + PEDESTAL;
        console.log(`[MATCH] snapped to table at ${this.tableY.toFixed(2)}`);
      }
    }
    if (this.tableY !== null) {
      const p = this.root.position;
      p.y += (this.tableY - p.y) * Math.min(1, dt * 6);
      if (Math.abs(this.tableY - p.y) < 1e-4) this.tableY = null;
    }
  }

  /**
   * Home only: pinch the brass handle on the pedestal and carry the arena (up or down a little;
   * it snaps onto a table within 3 cm); on release it turns to face you. True while it handles the hand.
   */
  private moveArena(): boolean {
    const d = this.dragging;
    if (!d) {
      for (const h of [this.hands.right, this.hands.left]) {
        if (!h.tracked || !h.justPinched) continue;
        this.handle.getWorldPosition(this.p);
        if (h.pinch.distanceTo(this.p) > HANDLE_GRAB) continue;
        this.dragging = { hand: h, from: h.pinch.clone(), start: this.root.position.clone() };
        playPick();
        return true;
      }
      return false;
    }
    const h = d.hand;
    const p = this.root.position;
    if (h.pinching && h.tracked) {
      p.set(d.start.x + h.pinch.x - d.from.x, d.start.y + Math.max(-HANDLE_LIFT, Math.min(HANDLE_LIFT, h.pinch.y - d.from.y)), d.start.z + h.pinch.z - d.from.z);
      for (const t of this.tables()) if (Math.abs(p.y - (t.y + PEDESTAL)) < 0.03) p.y = t.y + PEDESTAL;
      return true;
    }
    this.dragging = null;
    this.player.head.getWorldPosition(this.head);
    this.root.rotation.set(0, Math.atan2(this.head.x - p.x, this.head.z - p.z), 0);
    this.onTable = this.tables().some((t) => Math.abs(p.y - (t.y + PEDESTAL)) < 1e-3);
    this.placedAt = this.time;
    playPlace();
    console.log(`[MATCH] arena moved to ${[p.x, p.y, p.z].map((v) => v.toFixed(2)).join(',')}`);
    if (import.meta.env.DEV) this.hubLogPending = true;
    return true;
  }

  private toReady() {
    if (this.phase === 'placing') return;
    this.readySince = this.time;
    this.matchOver = false;
    this.phase = 'ready';
    this.menuButton.mesh.visible = true;
    this.arena.reset();
    this.arenaDirty = true;
    // Both tops wait upright at their spawn points.
    if (!this.typesPicked) this.pickBuilds();
    this.typesPicked = true;
    this.mine.launch(0, this.SPAWN, 0, 0, 1, this.mine.hand);
    this.theirs.launch(0, -this.SPAWN, 0, 0, 1, this.theirs.hand);
    this.puller = null;
    this.cord.set(null);
    this.label.mesh.position.copy(LABEL_AT);
    this.label.mesh.scale.setScalar(1.25);
    // The bar on the far rim shows the match; the card over it only the round's messages,
    // and at a match's start, who the rival is and how it plays.
    if (this.myPoints === 0 && this.theirPoints === 0) this.label.set(`Rival: ${this.rival.name} · ${this.rival.style}\n${this.arena.layout.rule ?? this.arena.layout.name}`);
    else this.label.set('');
    this.bar.mesh.visible = true;
    this.barMessage = 'READY';
    this.barPoints = [this.myPoints, this.theirPoints];
  }

  private toLocal(world: Vector3) {
    return this.root.worldToLocal(this.local.copy(world));
  }

  /**
   * In ready/result: a pinch anywhere starts the pull. No target to hit. If both hands pinch in
   * the same frame (the emulator's click does), the hand closer to the arena wins.
   */
  private updateReadyPinch() {
    // After the deciding round the result card leads back home, not into another round.
    if (this.matchOver) return;
    let pick: Side | null = null;
    let best = Infinity;
    for (const side of ['left', 'right'] as const) {
      const h = this.hands[side];
      if (!h.tracked || !h.justPinched) continue;
      const d = h.pinch.distanceTo(this.root.position);
      if (d < best && d < LAUNCH_REACH) {
        best = d;
        pick = side;
      }
    }
    if (!pick) return;
    const h = this.hands[pick];
    if (this.phase === 'result') this.toReady();
    this.phase = 'pulling';
    this.puller = pick;
    this.pullStart.copy(h.pinch);
    this.maxPull = 0;
    this.peakSpeed = 0;
    this.lastPull = 0;
  }

  /**
   * The cord runs from your top to your pinch; rip it back and let go. Power comes only from the
   * motion: how far the hand travelled and how fast it was still moving at release, so a rip that
   * stops before letting go loses power. A sideways rip aims like a slingshot, otherwise the launch
   * goes where the hand points on the floor.
   */
  private updatePull(dt: number) {
    const h = this.hands[this.puller!];
    // Measure only while the pinch holds: opening the fingers moves the pinch point and would fake a pull.
    if (h.pinching && h.tracked) {
      const dist = h.pinch.distanceTo(this.pullStart);
      this.maxPull = Math.max(this.maxPull, dist);
      // Decays within ~0.1 s, so only a rip that is still moving at release keeps its speed.
      const speed = (dist - this.lastPull) / Math.max(dt, 1e-3);
      this.peakSpeed = Math.max(this.peakSpeed * 0.9, speed);
      this.lastPull = dist;
      this.pullEnd.copy(h.pinch);
      const power = this.pullPower();
      this.showCharge(power, dt);
      // In 5% steps, so the card is not redrawn every frame of the pull.
      const pct = Math.round(power * 20) * 5;
      this.label.set(power >= PERFECT ? `WHITE HOT ${pct}%` : power > 0 ? `${pct}%` : 'Pull back and let go');
      this.lostFor = 0;
      if (dist < MAX_PULL) return;
    } else if (!h.tracked) {
      // Tracking lost mid-pull. A fast rip often loses the hand right at release, so a clear rip
      // still launches; anything else waits briefly for the hand, then cancels without a launch.
      const ripping = this.peakSpeed > 0.6 * FULL_SPEED && this.maxPull >= MIN_PULL;
      if (!ripping) {
        if ((this.lostFor += dt) < HAND_LOSS_GRACE) return;
        this.lostFor = 0;
        this.cord.set(null);
        this.cordTone.update(null);
        this.chargeRing.visible = false;
        this.toReady();
        return;
      }
    }

    this.cord.set(null);
    this.cordTone.update(null);
    this.chargeRing.visible = false;
    const power = this.pullPower();
    if (power < MIN_POWER) {
      // A tap or a hold without a pull does nothing; the top is ready again.
      this.toReady();
      return;
    }
    const end = this.p.copy(this.toLocal(this.pullEnd));
    const pull = end.sub(this.toLocal(this.pullStart));
    let aim = 0;
    if (Math.hypot(pull.x, pull.z) >= 0.03) aim = Math.atan2(-pull.x, pull.z);
    else if (this.rayFloor(h)) aim = Math.atan2(this.rayHit.x, this.SPAWN - this.rayHit.z);
    this.launch(power, Math.max(-MAX_AIM, Math.min(MAX_AIM, aim)));
  }

  /** Rip power from the motion alone: distance travelled and speed at the moment of release. */
  private pullPower() {
    if (this.maxPull < MIN_PULL) return 0;
    return Math.min(1, 0.4 * Math.min(1, this.maxPull / FULL_PULL) + 0.6 * Math.min(1, this.peakSpeed / FULL_SPEED));
  }

  /** While ripping: the top spins up, the cord heats from white to orange, a glow ring grows under it. */
  private showCharge(power: number, dt: number) {
    const y = this.arena.height(this.mine.x, this.mine.z);
    this.root.localToWorld(this.cordStart.set(this.mine.x, y + 0.03, this.mine.z));
    this.cord.set(this.cordStart, this.hands[this.puller!].pinch, power, dt);
    this.cordTone.update(power);
    this.mine.angle += (6 + 70 * power) * dt;
    this.chargeRing.visible = power > 0;
    this.chargeRing.position.set(this.mine.x, y + 0.001, this.mine.z);
    this.chargeRing.scale.setScalar(0.7 + 0.9 * power);
    (this.chargeRing.material as MeshBasicMaterial).opacity = 0.25 + 0.75 * power;
  }

  /** Launches both tops. aim: radians off straight-at-center for the player's top. */
  private launch(power: number, aim: number) {
    if (this.phase === 'result') this.toReady();
    const speed = LAUNCH_SPEED * (0.5 + 0.5 * power);
    const perfect = power >= PERFECT;
    this.lastPerfect = perfect;
    this.charges.reset();
    this.rivalCharges.reset();
    this.rivalShapeAt = -9;
    this.lastShape = null;
    this.wellInRound = false;
    this.rampAt.left = this.rampAt.right = -9;
    if (perfect && !this.demo) this.perfectInMatch = true;
    if (!this.demo && this.progress.guide === 'launch') this.progress.advance('bump');
    playLaunch(power, perfect);
    const mh = this.mine.hand;
    const th = this.theirs.hand;
    // The launch angles into each top's own orbit direction (mirrored for left spin); aim stays as pulled.
    const dir = aim + LAUNCH_TILT * mh;
    this.mine.launch(0, this.SPAWN, Math.sin(dir) * speed, -Math.cos(dir) * speed, perfect ? PERFECT_SPIN : 0.55 + 0.45 * power, mh);
    this.sparks.burst(0, this.arena.height(0, this.SPAWN), this.SPAWN, perfect ? 1 : power * 0.6);
    // The rival rips harder as you level up.
    // Difficulty is launch quality: the rival rips harder and aims steadier as you level up.
    const skill = Math.min(1, (this.progress.level - 1) / 15);
    const aiMin = 0.5 + 0.25 * skill;
    // The very first match is steadier, so its lesson (the ramp) is not lost to a wild rip.
    const first = this.progress.matches === 0 && !this.demo;
    const aiPower = first ? 0.7 + Math.random() * 0.1 : aiMin + Math.random() * (0.98 - aiMin);
    const aiAim = first ? (Math.random() - 0.5) * 0.3 : (Math.random() - 0.5) * (1.0 - 0.6 * skill);
    const aiSpeed = LAUNCH_SPEED * (0.5 + 0.5 * aiPower);
    const aiDir = aiAim + LAUNCH_TILT;
    this.theirs.launch(0, -this.SPAWN, Math.sin(aiDir) * aiSpeed * th, Math.cos(aiDir) * aiSpeed, 0.55 + 0.45 * aiPower, th);
    this.phase = 'fight';
    this.elapsed = 0;
    this.lastHardHit = -1;
    this.accumulator = 0;
    this.clashes = 0;
    this.label.set(perfect ? 'White hot!\nExtra spin' : '');
    this.labelTimer = perfect ? 1.5 : 0;
    console.log(`[MATCH] launch power ${power.toFixed(2)}${perfect ? ' PERFECT' : ''} aim ${aim.toFixed(2)} vs AI ${aiPower.toFixed(2)}`);
  }

  /** Pinch near the floor and lift to raise a bump; press a fingertip into the floor to dent it. */
  /**
   * Ramps and wells by hand. A ramp: pinch the floor (or point the ray at it and pinch); the start
   * point is locked, lifting raises it (far: it grows while held), pulling sideways aims it. Its
   * ghost shows until release, which sets it if a charge is left. A well: press a fingertip into
   * the floor. Nothing during the opening grace; a lost hand cancels.
   */
  private updateShaping() {
    const open = this.elapsed >= TUNING.grace;
    for (const side of ['left', 'right'] as const) {
      const h = this.hands[side];
      if (!h.tracked) {
        this.shaping[side] = null;
        this.pressing[side] = false;
        continue;
      }
      const l = this.toLocal(h.pinch);
      if (h.pinching) {
        let d = this.shaping[side];
        if (!d && h.justPinched && open) {
          if (this.arena.inside(l.x, l.z) && Math.abs(l.y - this.arena.height(l.x, l.z)) < SHAPE_GRAB) {
            d = this.shaping[side] = { x: l.x, z: l.z, y0: l.y, sx: l.x, sz: l.z, t: 0, far: false, amp: SHAPE_SIZE.rampMin, dx: 0, dz: 0 };
          } else if (this.rayFloor(h)) {
            d = this.shaping[side] = { x: this.rayHit.x, z: this.rayHit.z, y0: l.y, sx: l.x, sz: l.z, t: 0, far: true, amp: SHAPE_SIZE.rampMin, dx: 0, dz: 0 };
          }
        }
        if (d) {
          d.t += this.frameDt;
          const lift = d.far ? d.t * RAY_BUMP_RATE : (l.y - d.y0) * 1.2;
          d.amp = Math.min(SHAPE_SIZE.ramp, Math.max(SHAPE_SIZE.rampMin, SHAPE_SIZE.rampMin + lift));
          // Aim: the sideways pull since the pinch began (the far hand's own motion counts double);
          // too small a pull aims straight out from the middle.
          const k = d.far ? 2 : 1;
          let px = (l.x - d.sx) * k;
          let pz = (l.z - d.sz) * k;
          if (Math.hypot(px, pz) < 0.012) {
            px = d.x;
            pz = d.z;
          }
          const n = Math.hypot(px, pz) || 1;
          d.dx = px / n;
          d.dz = pz / n;
        }
        continue;
      }
      const d = this.shaping[side];
      if (d) {
        // Released: the ramp is set, if a charge is left (a far pinch must be held a moment).
        this.shaping[side] = null;
        if (!d.far || d.t >= TUNE.farHold) {
          this.makeShape('ramp', d.x, d.z, d.amp, side, d.dx, d.dz);
          this.rampAt[side] = this.elapsed;
        }
      }
      // A fingertip pressed into the floor makes a well, once per press, if it came down with
      // intent (a hand resting or drifting down does not) and not just as a ramp was let go.
      const tip = this.toLocal(h.index);
      const depth = this.arena.inside(tip.x, tip.z) ? this.arena.height(tip.x, tip.z) - tip.y : -1;
      // Downward speed (m/s), smoothed over about 80 ms so tracking jitter is not a press.
      const raw = ((this.tipY[side] - tip.y) * ARENA_SCALE) / Math.max(1e-3, this.frameDt);
      this.tipY[side] = tip.y;
      const down = (this.tipDown[side] += (raw - this.tipDown[side]) * (1 - Math.exp(-this.frameDt / 0.08)));
      if (depth > 0.004 && !this.pressing[side] && open) {
        this.pressing[side] = true;
        if (down >= TUNE.wellSpeed && this.elapsed - this.rampAt[side] > TUNE.wellAfterRamp) this.makeShape('well', tip.x, tip.z, SHAPE_SIZE.well, side);
        else if (import.meta.env.DEV) console.log(`[SHAPE] well ignored: ${down.toFixed(2)} m/s down`);
      } else if (depth < 0) this.pressing[side] = false;
    }
  }

  /** Spends a charge and sets a shape (one live shape per hand); without a charge, a dull clunk. */
  private makeShape(kind: ShapeKind, x: number, z: number, amp: number, owner: string, dx = 0, dz = 0) {
    const f = this.charges.spend(this.elapsed, TUNING.grace);
    if (import.meta.env.DEV) console.log(`[SHAPE] ${kind} at ${x.toFixed(3)},${z.toFixed(3)} amp ${amp.toFixed(3)} factor ${f} charges ${this.charges.charges} t ${this.elapsed.toFixed(1)}`);
    if (!f) {
      playLocked();
      return;
    }
    this.arena.addShape(kind, x, z, amp * f, owner, dx, dz);
    this.lastShape = { t: this.elapsed, kind };
    if (kind === 'well') this.wellInRound = true;
    this.progress.advance('match');
    playThock();
  }

  /**
   * Rivals from level 6 use the arena too, as a player would but slower: when your top is out in
   * the outer band, a ramp just inside it pushing it outward, at most every RIVAL_SHAPE_GAP, under
   * the same charges. Seeing it done teaches the move.
   */
  private rivalShaping() {
    if (this.demo || this.rival.level < 6) return;
    this.rivalCharges.update(STEP);
    const me = this.mine;
    const r = Math.hypot(me.x, me.z);
    if (!me.alive || r < this.arena.radius * 0.6 || r < 1e-3 || this.elapsed - this.rivalShapeAt < RIVAL_SHAPE_GAP) return;
    const f = this.rivalCharges.spend(this.elapsed, TUNING.grace);
    if (!f) return;
    this.arena.addShape('ramp', me.x - (me.x / r) * 0.012, me.z - (me.z / r) * 0.012, SHAPE_SIZE.ramp * f * 0.85, 'rival', me.x / r, me.z / r);
    this.rivalShapeAt = this.elapsed;
    playThock();
    if (import.meta.env.DEV) console.log(`[SHAPE] rival ramp at ${me.x.toFixed(3)},${me.z.toFixed(3)} t ${this.elapsed.toFixed(1)}`);
  }

  /** Marks for live shapes and ghosts, the charge embers, and a crunch when a top runs into a shape. */
  private updateShapes() {
    const mark = (s: FloorShape): ShapeMarkSpec => ({ kind: s.kind, x: s.x, z: s.z, dx: s.dx, dz: s.dz, strength: Arena.strength(s), ghost: false });
    const specs = this.arena.shapes.filter((s) => s.owner !== 'rival').map(mark);
    this.rivalMarks.show(this.phase === 'fight' ? this.arena.shapes.filter((s) => s.owner === 'rival').map(mark) : [], (x, z) => this.arena.height(x, z), this.time);
    for (const side of ['left', 'right'] as const) {
      const d = this.shaping[side];
      if (d) specs.push({ kind: 'ramp', x: d.x, z: d.z, dx: d.dx, dz: d.dz, strength: d.amp / SHAPE_SIZE.ramp, ghost: true });
    }
    if (this.devRampSince >= 0 && this.gazeHit.ok) {
      const r = Math.hypot(this.gazeHit.x, this.gazeHit.z) || 1;
      specs.push({ kind: 'ramp', x: this.gazeHit.x, z: this.gazeHit.z, dx: this.gazeHit.x / r, dz: this.gazeHit.z / r, strength: this.devRampAmp() / SHAPE_SIZE.ramp, ghost: true });
    }
    this.marks.show(this.phase === 'fight' ? specs : [], (x, z) => this.arena.height(x, z), this.time);
    this.pips.root.visible = this.phase === 'fight' || this.phase === 'ready' || this.phase === 'pulling';
    this.pips.set(this.charges.charges, this.charges.refilling);
    for (const s of this.arena.shapes) {
      if (Arena.strength(s) < 0.3) continue;
      for (const t of this.tops) {
        if (!t.alive || Math.hypot(t.x - s.x, t.z - s.z) > (s.kind === 'ramp' ? 0.036 : 0.026)) continue;
        let hit = this.crunched.get(s);
        if (!hit) this.crunched.set(s, (hit = new Set()));
        if (hit.has(t)) continue;
        hit.add(t);
        playCrunch();
      }
    }
  }

  /** Dev: the height of the ramp B is growing at the gaze. */
  private devRampAmp() {
    return Math.min(SHAPE_SIZE.ramp, SHAPE_SIZE.rampMin + (this.time - this.devRampSince) * RAY_BUMP_RATE);
  }

  private updateFight(dt: number) {
    // Hit stop: the simulation alone pauses for a moment after a hard hit; head tracking and
    // rendering never do.
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      return;
    }
    this.accumulator += dt;
    let steps = 0;
    while (this.accumulator >= STEP && steps < 8) {
      this.accumulator -= STEP;
      steps++;
      this.elapsed += STEP;
      const clash = step(this.arena, this.mine, this.theirs);
      this.charges.update(STEP);
      this.rivalShaping();
      if (clash) {
        this.clashes++;
        this.charges.clash(clash.strength, this.elapsed);
        this.rivalCharges.clash(clash.strength, this.elapsed);
        const y = this.arena.height(clash.x, clash.z);
        this.sparks.burst(clash.x, y, clash.z, clash.strength);
        if (clash.strength > HARD_HIT && this.elapsed - this.lastHardHit > HIT_STOP_GAP) {
          this.lastHardHit = this.elapsed;
          // A hard hit: more sparks, a ring of light, both tops flash, and a brief hit stop.
          this.sparks.burst(clash.x, y, clash.z, 1);
          this.impacts.hit(clash.x, y, clash.z, clash.strength);
          this.myView.flash();
          this.theirView.flash();
          this.hitStop = HIT_STOP;
          this.accumulator = 0;
        }
        if (this.sinceClashSound > 0.06) {
          playClash(clash.strength);
          this.sinceClashSound = 0;
        }
      }
      for (const t of this.tops) {
        if (t.sinceBump === 0) {
          this.arenaView.flashBumper(t.x, t.z);
          playClash(0.5);
          this.sparks.burst(t.x, this.arena.height(t.x, t.z), t.z, 0.5);
        }
        if (t.sinceDash !== 0) continue;
        this.arenaView.flashRail(t.x, t.z);
        this.impacts.dash(t.x, this.arena.height(t.x, t.z), t.z, t.vx, t.vz);
        playDash();
        this.sparks.burst(t.x, this.arena.height(t.x, t.z), t.z, 0.8);
      }
      const v = verdict(this.mine, this.theirs, this.elapsed);
      if (v !== 0) {
        for (const t of this.tops) if (t.finish === 'burst') this.sparks.burst(t.x, this.arena.height(t.x, t.z), t.z, 1);
        this.finish(v);
        return;
      }
    }
  }

  private finish(v: -1 | 1 | 2) {
    this.phase = 'result';
    this.resultTimer = RESULT_TIME;
    if (this.demo) {
      // Workshop demo: say how it ended, no points.
      const loser = v === 1 ? this.theirs : this.mine;
      const winner = v === 1 ? this.mine : this.theirs;
      this.label.set(v === 2 ? 'Draw' : `${winner.spec.name} won\n${FINISH_WORD[loser.finish ?? 'spin'].toLowerCase()} after ${this.elapsed.toFixed(0)} s`);
      this.resultTimer = 3;
      return;
    }
    const name = (t: Top) =>
      FINISH_WORD[t.finish ?? 'spin'];
    for (const t of this.tops) {
      if (t.finish === 'pocket') playPocket();
      else if (t.finish === 'over') playOver();
      else if (t.finish === 'burst') playBurst();
      else if (t.finish === 'spin') playTopple();
    }
    if (v !== 2) playResult(v === 1);
    let text: string;
    if (v === 2) {
      text = 'Draw\nReplay the round';
    } else {
      const loser = v === 1 ? this.theirs : this.mine;
      const points = finishPoints(loser);
      if (v === 1) this.myPoints += points;
      else this.theirPoints += points;
      this.barPoints = [this.myPoints, this.theirPoints];
      const score = `Heat ${this.myPoints} - ${this.theirPoints}`;
      const decided = this.myPoints >= MATCH_HEAT || this.theirPoints >= MATCH_HEAT;
      this.earn(v === 1, loser, decided, decided && this.myPoints > this.theirPoints);
      if (decided) {
        text = `${this.myPoints > this.theirPoints ? 'You win the match!' : 'You lose the match'}\n${score}`;
        this.myPoints = 0;
        this.theirPoints = 0;
        this.matchOver = true;
      } else {
        text = `${name(loser)}! ${v === 1 ? 'You' : 'They'} +${points} heat\n${score}`;
      }
      // A finish within 1.5 s of the player's shape names it as the cause.
      const recent = this.lastShape && this.elapsed - this.lastShape.t < CAUSE_WINDOW ? this.lastShape.kind.toUpperCase() : null;
      const theirs = this.elapsed - this.rivalShapeAt < CAUSE_WINDOW;
      if (recent && v === 1) {
        text = `YOUR ${recent} → ${FINISH_WORD[loser.finish ?? 'spin']}\n${text}`;
        // The decisive move plays out slowly for a moment.
        if (loser.finish !== 'spin') this.slowMo = SLOW_MO_TIME;
      } else if (recent && v === -1 && loser.finish !== 'spin') text = `YOUR ${recent} BACKFIRED\n${text}`;
      else if (theirs && v === -1 && loser.finish !== 'spin') text = `THEIR RAMP → ${FINISH_WORD[loser.finish ?? 'spin']}\n${text}`;
    }
    this.label.set(text);
    this.barMessage = text.split('\n')[0].replace(/!.*$/, '!');
    console.log(`[MATCH] ${text.replace('\n', ' - ')} after ${this.elapsed.toFixed(1)} s, ${this.clashes} clash steps`);
    if (v !== 2) {
      this.round++;
      this.typesPicked = false;
    }
  }

  /**
   * The first session's hints. Ready: arrows run from your top toward you (pull the cord this
   * way). Fight: a ring breathes on the floor just inside the rival, where lifting the floor pushes
   * it toward the rim, until you make your first move.
   */
  private updateGuide() {
    const g = this.progress.guide;
    const ready = g === 'launch' && this.phase === 'ready' && !this.demo;
    this.ripArrows.visible = ready;
    if (ready) {
      if (this.ripArrows.children.length === 0) {
        for (let i = 0; i < 3; i++) {
          this.ripArrows.add(new Mesh(new ConeGeometry(0.008, 0.012, 3).rotateX(Math.PI / 2), new MeshBasicMaterial({ color: 0xffb04a, transparent: true, depthWrite: false })));
        }
      }
      const y = this.arena.height(0, this.SPAWN) + 0.006;
      this.ripArrows.children.forEach((c, i) => {
        const k = (this.time * 0.8 + i / 3) % 1;
        c.position.set(0, y, this.SPAWN + 0.03 + k * 0.08);
        ((c as Mesh).material as MeshBasicMaterial).opacity = Math.sin(k * Math.PI);
      });
      // The rival and arena intro shows first; the rip hint follows.
      if (this.time - this.readySince > INTRO_TIME) this.label.set('Pinch near your top and pull back toward you\nthen let go');
    }
    const bump = g === 'bump' && this.phase === 'fight' && !this.demo && this.elapsed > 3 && this.theirs.alive;
    this.bumpMark.visible = bump;
    if (bump) {
      const r = Math.hypot(this.theirs.x, this.theirs.z) || 1;
      const x = this.theirs.x - (this.theirs.x / r) * 0.035;
      const z = this.theirs.z - (this.theirs.z / r) * 0.035;
      this.bumpMark.position.set(x, this.arena.height(x, z) + 0.002, z);
      this.bumpMark.scale.setScalar(1 + 0.3 * Math.sin(this.time * 6));
      this.label.set('Pinch the floor at the ring, lift and pull outward\nlet go: the ramp pushes the rival');
      this.bumpHintShown = true;
    } else if (this.bumpHintShown && g !== 'bump') {
      // The first move is made: the hint goes.
      this.bumpHintShown = false;
      this.label.set('');
    }
  }

  /** XP for the round just played; level-ups flare and ring, unlocks queue to be shown. */
  private earn(won: boolean, loser: Top, matchOver: boolean, matchWon: boolean) {
    const before = this.progress.level;
    const award = this.progress.award({ won, finish: loser.finish, pocketPoints: loser.pocketPoints, perfect: this.lastPerfect && won, matchOver, matchWon });
    this.xpGained = award.gained;
    playXp();
    console.log(`[XP] +${award.gained} -> Lv ${this.progress.level} (${(this.progress.fraction * 100).toFixed(0)}%)${award.unlocked.length ? ` unlocked ${award.unlocked.join(', ')}` : ''}`);
    if (award.levels.length) {
      playLevelUp();
      for (let i = 0; i < 3; i++) this.sparks.burst((Math.random() - 0.5) * 0.1, 0.02, (Math.random() - 0.5) * 0.1, 1);
      this.levelUpText = `LEVEL ${this.progress.level}!\n${this.progress.rank}${this.progress.level > before + 1 ? ` (+${this.progress.level - before})` : ''}`;
    }
    this.reveals.push(...award.unlocked);
    if (!this.demo) this.trackComeBack(won, loser, matchOver, matchWon);
    // The first match is over: the anvil appears and calls for the new part.
    if (matchOver && GUIDE_ORDER.indexOf(this.progress.guide) < GUIDE_ORDER.indexOf('forge')) this.progress.advance('forge');
  }

  /**
   * What outlives the match: marks against this rival, a champion for a won match, and today's
   * order when this match plays it and the round or match fulfils it.
   */
  private trackComeBack(won: boolean, loser: Top, matchOver: boolean, matchWon: boolean) {
    const cause = this.lastShape && this.elapsed - this.lastShape.t < CAUSE_WINDOW ? this.lastShape.kind : null;
    const ko = loser.finish === 'pocket' || loser.finish === 'over' || loser.finish === 'burst';
    if (won) this.progress.mark(this.rival.name, (matchWon ? MARK.beaten : 0) | (ko ? MARK.knockout : 0) | (cause ? MARK.shape : 0));
    if (matchWon) this.progress.recordChampion(this.myBuild);
    const o = this.order;
    if (!this.orderMatch || !o || this.progress.hasOrder(o.date)) return;
    const met = orderMet(o, {
      rival: this.rival.name,
      arena: this.arena.layout.name,
      wonRound: won,
      finish: loser.finish,
      cause,
      wellInRound: this.wellInRound,
      matchWon,
      shutout: matchWon && this.theirPoints === 0,
      role: roleOf(specFromBuild(this.myBuild)),
      perfectInMatch: this.perfectInMatch,
    });
    if (!met) return;
    const before = this.progress.level;
    const a = this.progress.completeOrder(o.date);
    console.log(`[ORDER] done: ${o.text} -> ${this.progress.stamps} stamps${a.unlocked.length ? `, unlocked ${a.unlocked.join(', ')}` : ''}`);
    this.reveals.unshift(`stamp:${this.progress.stamps}`);
    this.reveals.push(...a.unlocked);
    if (a.levels.length && !this.levelUpText) {
      playLevelUp();
      this.levelUpText = `LEVEL ${this.progress.level}!\n${this.progress.rank}${this.progress.level > before + 1 ? ` (+${this.progress.level - before})` : ''}`;
    }
  }

  /** Shows a level-up, then each new unlock spinning over the arena before it flies off. */
  private updateRewards(dt: number) {
    if (this.levelUpText && this.phase === 'result' && this.resultTimer < RESULT_TIME - 1.4) {
      this.label.set(this.levelUpText);
      this.levelUpText = '';
      // The level-up reads before the first unlock replaces it.
      this.rewardHold = 1.4;
      this.resultTimer = Math.max(this.resultTimer, 1.4 + 2.8);
    }
    if (this.rewardHold > 0) this.rewardHold -= dt;
    else if (!this.reveal && this.reveals.length && this.phase === 'result' && this.resultTimer < RESULT_TIME - 1.4) {
      const key = this.reveals.shift()!;
      const obj = unlockModel(key, this.arenas);
      this.stage.add(obj);
      this.reveal = { obj, t: 0 };
      playUnlock();
      this.label.set(revealText(key));
      // Keep the result up while it shows.
      this.resultTimer = Math.max(this.resultTimer, 2.8);
    }
    const r = this.reveal;
    if (!r) return;
    r.t += dt;
    const grow = Math.min(1, r.t / 0.3);
    const leave = Math.max(0, (r.t - 2) / 0.6);
    r.obj.position.set(0, 0.1 + 0.01 * Math.sin(r.t * 3) + leave * 0.3, 0);
    r.obj.rotation.y += dt * 2.5;
    r.obj.scale.setScalar(1.6 * grow * (1 - leave));
    if (leave >= 1) {
      r.obj.removeFromParent();
      // Its own geometry and materials (shared textures stay).
      r.obj.traverse((o) => {
        const m = o as Mesh;
        if (!m.isMesh) return;
        m.geometry.dispose();
        (m.material as MeshBasicMaterial).dispose();
      });
      this.reveal = null;
      // The result waits for every queued unlock.
      if (this.reveals.length) this.resultTimer = Math.max(this.resultTimer, 0.2);
    }
  }

  /** A small dot where the pointing hand's ray (or, in dev, the gaze) meets the floor. */
  private updateReticle() {
    const h = this.hands.right.hasRay ? this.hands.right : this.hands.left;
    const hit = this.rayFloor(h) ? this.rayHit : this.gazeHit;
    this.reticle.visible = hit.ok;
    if (hit.ok) this.reticle.position.set(hit.x, this.arena.height(hit.x, hit.z) + 0.002, hit.z);
  }

  /**
   * Dev only: Space charges and launches toward the gaze, B raises a bump and N presses a dent
   * where the head is looking. Lets the prototype be played in the emulator's mouse-look mode.
   */
  private devControls(dt: number) {
    this.gaze();
    if (this.keys.has('Space') && (this.phase === 'ready' || this.phase === 'result')) {
      this.charge = Math.min(1, this.charge + dt / 1.2);
      this.label.set(`Power ${Math.round(this.charge * 100)}%\nRelease Space to launch`);
    }
    if (this.phase !== 'fight' || !this.gazeHit.ok) return;
    const { x, z } = this.gazeHit;
    // B: hold to grow a ramp at the gaze aimed outward, release to set it. N: a well at the gaze.
    if (this.keys.has('KeyB') && this.devRampSince < 0 && this.elapsed >= TUNING.grace) this.devRampSince = this.time;
    if (!this.keys.has('KeyB') && this.devRampSince >= 0) {
      const r = Math.hypot(x, z) || 1;
      this.makeShape('ramp', x, z, this.devRampAmp(), 'dev', x / r, z / r);
      this.devRampSince = -1;
    }
    if (this.keys.has('KeyN') && !this.devWellHeld) this.makeShape('well', x, z, SHAPE_SIZE.well, 'dev-well');
    this.devWellHeld = this.keys.has('KeyN');
  }

  /** Intersects the head's view ray with the arena floor (arena-local). */
  private gaze() {
    const head = this.player.head;
    head.getWorldPosition(this.p);
    head.getWorldDirection(this.gazeDir).negate();
    this.floorHit(this.p, this.gazeDir, this.gazeHit);
  }

  /** Where the hand's pointing ray meets the arena floor (into this.rayHit). */
  private rayFloor(h: HandState): boolean {
    if (!h.hasRay) return (this.rayHit.ok = false);
    return this.floorHit(h.rayOrigin, h.rayDir, this.rayHit);
  }

  /** Marches a world-space ray to the arena floor; writes an arena-local hit inside the rim. */
  private floorHit(origin: Vector3, dir: Vector3, out: { ok: boolean; x: number; z: number }): boolean {
    out.ok = false;
    const o = this.root.worldToLocal(this.rayLocalO.copy(origin));
    const d = this.rayLocalD.copy(dir).transformDirection(this.rootInverse.copy(this.root.matrixWorld).invert());
    for (let t = 0.02; t < 2; t += 0.004) {
      const x = o.x + d.x * t;
      const y = o.y + d.y * t;
      const z = o.z + d.z * t;
      if (y <= this.arena.height(x, z)) {
        if (this.arena.inside(x, z)) Object.assign(out, { ok: true, x, z });
        return out.ok;
      }
    }
    return false;
  }
}

/** A readable name for an unlock key. */
/** The card shown while an unlock (or an order stamp) spins over the arena. */
function revealText(key: string): string {
  const [kind, id] = key.split(':');
  if (kind === 'rival') return `NEW RIVAL!\n${id} · ${RIVALS.find((r) => r.name === id)?.style ?? ''}`;
  if (kind === 'stamp') return `ORDER DONE!\nStamp ${id} in your ledger`;
  return `NEW!\n${unlockName(key)}`;
}

function unlockName(key: string): string {
  const [kind, id] = key.split(':');
  if (kind === 'paint') return 'New paint';
  if (kind === 'emblem') return `${EMBLEM_NAMES[Number(id)]} emblem glow`;
  if (kind === 'ledger') return 'Gilded ledger';
  if (kind === 'rival') return `${id} rival`;
  if (kind === 'arena') return `${id} arena`;
  const name = kind === 'ring' ? RINGS.find((r) => r.id === id)?.name : kind === 'tip' ? TIPS.find((t) => t.id === id)?.name : kind === 'core' ? CORES.find((c) => c.id === id)?.name : id;
  return `${name} ${kind}`;
}

/** The model shown when something is unlocked: the part, a paint pot, or the arena's miniature. */
function unlockModel(key: string, arenas: ArenaLayout[]): Object3D {
  const [kind, id] = key.split(':');
  if (kind === 'arena') return miniArena(arenas.find((a) => a.name === id) ?? arenas[0], true);
  if (kind === 'rival') {
    const r = RIVALS.find((x) => x.name === id);
    if (r) return new TopView(r.build, OPPONENT_COLOR).root;
  }
  if (kind === 'emblem' || kind === 'stamp' || kind === 'ledger') {
    // A struck medallion: the glow's color, the stamp's orange, or the ledger's gold.
    const color = kind === 'emblem' ? EMBLEM_COLORS[Number(id)] : kind === 'stamp' ? 0xff8a2a : 0xffd34a;
    const g = new Group();
    const coin = new Mesh(new CylinderGeometry(0.02, 0.02, 0.004, 32), new MeshBasicMaterial({ color }));
    coin.rotation.x = Math.PI / 2;
    g.add(coin);
    return g;
  }
  for (const [, items] of ROWS) for (const item of items) if (itemKey(item) === key) return itemModel(item);
  return new Group();
}
