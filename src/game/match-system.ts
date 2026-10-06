import { AdditiveBlending, CircleGeometry, createSystem, Group, Matrix4, ConeGeometry, Mesh, MeshBasicMaterial, Object3D, Quaternion, RingGeometry, TorusGeometry, Vector3, VisibilityState, XRPlane } from '@iwsdk/core';
import { CordTone, playLevelUp, playUnlock, playXp, playBurst, playClash, playDash, playLaunch, playOver, playPocket, playResult, playTopple, SpinHum } from './audio.js';
import { HandInput, HandState, Side } from './hands.js';
import { ARENAS } from './arenas.js';
import { Builder, Button, loadArenas } from './builder.js';
import { normRadius, spawnDistance } from './layout.js';
import type { ArenaLayout } from './layout.js';
import { Arena, ATTACK, DEFENSE, finishPoints, LAUNCH_SPEED, LAUNCH_TILT, step, STEP, Top, TopSpec, verdict } from './sim.js';
import { Forge, itemKey, itemModel, loadBuild, ROWS } from './forge.js';
import { GUIDE_ORDER, Progress } from './progress.js';
import { Hub, miniArena } from './hub.js';
import { Wall } from './wall.js';
import type { WallPlane } from './wall.js';
import { allBuilds, PRESETS, RINGS, RIVALS, roleOf, specFromBuild, TIPS } from './parts.js';
import type { Rival } from './parts.js';
import type { TopBuild } from './parts.js';
import { ArenaView, Cord, Impacts, Label, OPPONENT_COLOR, Sparks, TopView } from './visuals.js';

/** The arena floor sits this far above the real table, leaving room to press dents. */
const PEDESTAL = 0.08;
/** The arena (and everything on the table) is drawn this much larger than its simulation size. */
const ARENA_SCALE = 2;
/** How far in front of the seated player's head the arena goes (m, horizontal). */
const REACH = 0.6;
/** Without a table the arena floats on a tray this far below the head. */
const TRAY_DROP = 0.35;
const TABLE_MIN_H = 0.45;
const TABLE_MAX_H = 1.15;
const TABLE_MAX_DIST = 1.6;
/** A table more than this far below the eyes is not used (m). Seated at a desk it is about 0.4-0.6. */
const TABLE_MAX_BELOW_EYES = 0.75;
/** Wait for planes to arrive before placing. */
const SETTLE = 2;
/** Cord pull that counts as a full-power rip (m) and full-power pull speed (m/s). */
const FULL_PULL = 0.22;
const FULL_SPEED = 1.0;
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
/** Pinches this close to the floor (vertically) grab it to raise a bump. */
const SHAPE_GRAB = 0.05;
const BUMP_MIN = 0.008;
const BUMP_MAX = 0.04;
const DENT_MAX = 0.03;
const RESULT_TIME = 4;
/** A clash this strong (0..1) is a hard hit: big feedback and a 45 ms simulation-only hit stop. */
const HARD_HIT = 0.6;
/** Hard hits closer together than this (s) do not stop the simulation again. */
const HIT_STOP_GAP = 0.3;
const HIT_STOP = 0.045;
/** A pointing ray this close to a button's center (m) presses it. */
const BUTTON_REACH = 0.035;
/** Points needed to win a match (pocket and over finishes score 2, spin finishes 1). */
const MATCH_POINTS = 4;
/** Launch power at or above this is a perfect rip: extra starting spin. */
const PERFECT = 0.92;
const PERFECT_SPIN = 1.1;
/** Far bumps grow at this rate (m/s) while the pinch is held. */
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
  /** The smithy wall on the real wall ahead: tool panel, scoreboard, arena shelf. */
  private wall = new Wall();
  /** The forge: build your own top from parts. */
  private forge = new Forge({
    done: (build) => this.leaveForge(build),
    fitted: () => this.progress.advance('rematch'),
  }, this.wall, this.progress);
  /** A demo round from the workshop's Try it: AI launches, no score, then back to the workshop. */
  private demo = false;
  private hubLogPending = false;
  /** The word in the middle of the wall's match bar. */
  private barMessage = '';
  /** This match's rival: its build and spin stay for every round. */
  private rival: Rival = RIVALS[0];
  /** Points the match bar shows (kept after a match is decided), XP just earned, the last rip. */
  private barPoints: [number, number] = [0, 0];
  private xpGained = 0;
  private lastPerfect = false;
  private levelUpText = '';
  private perfTimer = 0;
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
  /** Match score: first to MATCH_POINTS wins the match. */
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
  private shaping: Record<Side, { x: number; z: number; y0: number; t: number; far: boolean } | null> = { left: null, right: null };
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
    this.label.mesh.position.set(0, 0.1, -0.2);
    this.label.mesh.scale.setScalar(0.8);
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
    );
    this.myBuild = this.forge.allowed(this.myBuild);
    this.setBuilds(this.myBuild, this.theirBuild);
    this.root.add(this.stage, this.label.mesh, this.builder.root, this.forge.root, this.hub.root, this.menuButton.mesh);
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
    this.world.createTransformEntity(this.wall.root);
    this.builder.hangOn(this.wall.tools);

    if (import.meta.env.DEV) {
      const onKey = (e: KeyboardEvent) => {
        if (e.repeat) return;
        this.keys.add(e.code);
        if (e.code === 'KeyR') this.toReady();
        // Asset review: the three classic tops side by side over the arena, turning slowly.
        if (e.code === 'KeyV') {
          if (this.showcase.children.length === 0) {
            PRESETS.forEach((p, i) => {
              const v = new TopView(p.build, p.build.color);
              v.root.position.set((i - 1) * 0.15, 0.05, 0.02);
              v.root.scale.setScalar(1.6);
              this.showcase.add(v.root);
            });
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

    switch (this.phase) {
      case 'placing':
        this.settle += dt;
        if (this.settle >= SETTLE) this.place();
        return;
      case 'hub':
        this.updateHub(dt);
        break;
      case 'build':
        this.updateBuilder(dt);
        break;
      case 'forge':
        this.player.head.getWorldPosition(this.p);
        this.forge.place(this.root.worldToLocal(this.p));
        this.forge.update(this.pointers, dt);
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
    this.arenaView.sync(this.arena);
    const live = this.phase === 'fight';
    this.tops.forEach((t, i) => this.hums[i].update(live && t.alive ? Math.max(0, t.spin) : 0, Math.hypot(t.vx, t.vz), t.wobble, this.time));
    this.sinceClashSound += dt;
    if (this.phase === 'ready' || this.phase === 'pulling' || this.phase === 'fight' || this.phase === 'result') {
      const p = this.progress;
      this.wall.bar(this.mine.spin, this.theirs.spin, this.barPoints[0], this.barPoints[1], MATCH_POINTS, ['YOU', this.rival.name.toUpperCase()], this.phase === 'fight' && this.barMessage === 'READY' ? 'FIGHT' : this.barMessage, {
        level: p.level,
        rank: p.rank,
        fraction: p.fraction,
        gained: this.phase === 'result' ? this.xpGained : 0,
      });
    }
    this.myView.sync(this.mine, this.arena, this.time, dt);
    this.theirView.sync(this.theirs, this.arena, this.time, dt);
    this.sparks.update(dt);
    this.impacts.update(dt);
    this.updateGuide();
    for (const c of this.showcase.children) c.rotation.y += dt * 0.6;
    this.updateRewards(dt);
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
    this.arenaView.build(layout);
    console.log(`[MATCH] arena ${layout.name}`);
  }

  /** Shows a layout in the arena without changing the rotation (builder preview). */
  private showLayout(layout: ArenaLayout) {
    this.arena.reset(layout);
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
    this.arenaView.build(this.arena.layout);
    this.setBuilds(this.myBuild, this.theirBuild);
    this.mine.launch(0, this.SPAWN, 0, 0, 1, this.myBuild.spin);
    this.theirs.launch(0, -this.SPAWN, 0, 0, 1, this.theirBuild.spin);
    this.cord.set(null);
    this.menuButton.mesh.visible = false;
    // Your top waits on its stand, not in the arena.
    this.mine.state = 'out';
    this.hub.show(this.arenas, this.arenaIndex, this.myBuild, this.progress);
    this.label.set('');
    this.wall.setMode('home');
    // The first session says where to reach next.
    const guide = this.progress.guide;
    if (guide === 'launch') this.label.set('Your top is on the stand\nPut it in the arena to play');
    else if (guide === 'forge') this.label.set('New part: Rush tip!\nPinch the anvil to fit it');
    else if (guide === 'rematch') this.label.set('Your top is ready\nPut it in the arena for a rematch');
    if (import.meta.env.DEV) this.hubLogPending = true;
  }

  private updateHub(dt: number) {
    if (this.labelTimer > 0 && (this.labelTimer -= dt) <= 0) this.label.set('');
    this.player.head.getWorldPosition(this.p);
    if (import.meta.env.DEV && this.hubLogPending) {
      this.hubLogPending = false;
      console.log(`[HUB] ${this.hub.debugPositions()}`);
    }
    const action = this.hub.update(this.pointers, dt, this.p);
    if (!action) return;
    if (action.kind === 'play') {
      this.hub.hide();
      if (this.progress.guide === 'rematch') this.progress.advance('done');
      this.rival = this.pickRival();
      this.myPoints = 0;
      this.theirPoints = 0;
      this.typesPicked = false;
      this.toReady();
    } else if (action.kind === 'forge') {
      this.hub.hide();
      this.openForge();
    } else if (action.kind === 'workshop') {
      this.hub.hide();
      this.openWorkshop();
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
    // The forge is its own place: the arena hides while you build.
    this.stage.visible = false;
    this.wall.setMode('forge');
    // The first session's forge visit is about one part: the one just earned.
    const focus = this.progress.guide === 'forge' || this.progress.guide === 'fit' ? 'tip:rush' : null;
    this.progress.advance('fit');
    this.forge.open(focus);
  }

  /** Back home from the forge; a saved build becomes your top. */
  private leaveForge(build: TopBuild | null) {
    this.forge.close();
    this.stage.visible = true;
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
    this.forge.showShelf(false);
    this.wall.setMode('workshop');
    this.wall.score(['Arena workshop', 'Pinch a piece on the wall and drop it on the arena', 'Try it, Save & play or Back on the board']);
    this.builder.open(this.arena.layout);
  }

  /** Workshop: pieces, the tray and the rim, all handled by the builder. */
  private updateBuilder(dt: number) {
    // The menu board stands across the arena, facing the head; positions are arena-local.
    this.player.head.getWorldPosition(this.p);
    this.builder.placeMenu();
    this.builder.update(this.pointers, dt);
  }

  /** Try it: two AI tops fight in the draft arena; the workshop comes back after the round. */
  private tryArena(layout: ArenaLayout) {
    this.menuButton.mesh.visible = false;
    this.arena.reset(layout);
    this.demo = true;
    this.setBuilds(this.randomBuild(), this.randomBuild());
    this.launch(0.6 + Math.random() * 0.35, (Math.random() - 0.5) * 0.6);
  }

  /** Back to the workshop or the forge after a demo round. */
  private endDemo() {
    this.demo = false;
    this.phase = 'build';
    this.label.set('');
    for (const top of this.tops) top.state = 'out';
    this.arena.reset();
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
    this.builder.close();
    this.forge.showShelf(true);
    this.rival = this.pickRival();
    this.setArena(layout);
    this.myPoints = 0;
    this.theirPoints = 0;
    this.phase = 'ready';
    this.toReady();
  }

  private leaveBuilder() {
    this.builder.close();
    this.forge.showShelf(true);
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

  private place() {
    const head = this.player.head;
    head.getWorldPosition(this.head);
    head.getWorldDirection(this.fwd);
    // getWorldDirection returns +Z of the object; the camera looks down -Z.
    this.fwd.negate().setY(0);
    if (this.fwd.lengthSq() < 1e-6) this.fwd.set(0, 0, -1);
    this.fwd.normalize();
    const center = this.p.copy(this.head).addScaledVector(this.fwd, REACH);
    const table = this.findTable();
    center.y = table !== null ? table + PEDESTAL : this.head.y - TRAY_DROP;
    this.root.position.copy(center);
    this.root.scale.setScalar(ARENA_SCALE);
    this.wall.place(this.head, this.fwd, this.findWalls());
    // Local +Z points back at the player.
    this.root.rotation.set(0, Math.atan2(this.head.x - center.x, this.head.z - center.z), 0);
    this.root.visible = true;
    console.log(`[MATCH] arena on ${table !== null ? 'table' : 'tray'} at ${center.toArray().map((v) => v.toFixed(2)).join(',')}`);
    this.toHub();
  }

  /** Detected wall planes (center and normal, world space). */
  private findWalls(): WallPlane[] {
    const out: WallPlane[] = [];
    for (const e of this.queries.planes.entities) {
      const plane = e.getValue(XRPlane, '_plane') as RawPlane | undefined;
      if (plane?.orientation !== 'vertical' || !/wall/.test(plane.semanticLabel ?? 'wall')) continue;
      const o = e.object3D!;
      const center = o.getWorldPosition(new Vector3());
      // A plane's surface lies in its local x-z, so its normal is the local +y.
      const normal = new Vector3(0, 1, 0).applyQuaternion(o.getWorldQuaternion(new Quaternion()));
      out.push({ center, normal });
    }
    return out;
  }

  /** Height of the nearest table/desk plane within reach, or null. */
  private findTable(): number | null {
    let best: number | null = null;
    let bestDist = TABLE_MAX_DIST;
    for (const e of this.queries.planes.entities) {
      const plane = e.getValue(XRPlane, '_plane') as RawPlane | undefined;
      if (plane?.orientation !== 'horizontal' || !/table|desk/.test(plane.semanticLabel ?? '')) continue;
      e.object3D!.getWorldPosition(this.local);
      if (this.local.y < TABLE_MIN_H || this.local.y > TABLE_MAX_H) continue;
      // A table far below the eyes (standing over a coffee table) would mean bending over it:
      // use the floating tray at a comfortable height instead.
      if (this.head.y - this.local.y > TABLE_MAX_BELOW_EYES) continue;
      const d = Math.hypot(this.local.x - this.head.x, this.local.z - this.head.z);
      if (d < bestDist) {
        bestDist = d;
        best = this.local.y;
      }
    }
    return best;
  }

  private toReady() {
    if (this.phase === 'placing') return;
    this.matchOver = false;
    this.phase = 'ready';
    this.menuButton.mesh.visible = true;
    this.arena.reset();
    // Both tops wait upright at their spawn points.
    if (!this.typesPicked) this.pickBuilds();
    this.typesPicked = true;
    this.mine.launch(0, this.SPAWN, 0, 0, 1, this.mine.hand);
    this.theirs.launch(0, -this.SPAWN, 0, 0, 1, this.theirs.hand);
    this.puller = null;
    this.cord.set(null);
    // The scoreboard on the wall shows the match; the card over the arena only the round's messages,
    // and at a match's start, who the rival is and how it plays.
    if (this.myPoints === 0 && this.theirPoints === 0) this.label.set(`Rival: ${this.rival.name} · ${this.rival.style}\n${this.arena.layout.rule ?? this.arena.layout.name}`);
    else this.label.set('');
    this.wall.setMode('match');
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
      this.label.set(power >= PERFECT ? `RIP IT! ${Math.round(power * 100)}%` : power > 0 ? `${Math.round(power * 100)}%` : 'Pull back and let go');
      if (dist < MAX_PULL) return;
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
    const aiPower = aiMin + Math.random() * (0.98 - aiMin);
    const aiAim = (Math.random() - 0.5) * (1.0 - 0.6 * skill);
    const aiSpeed = LAUNCH_SPEED * (0.5 + 0.5 * aiPower);
    const aiDir = aiAim + LAUNCH_TILT;
    this.theirs.launch(0, -this.SPAWN, Math.sin(aiDir) * aiSpeed * th, Math.cos(aiDir) * aiSpeed, 0.55 + 0.45 * aiPower, th);
    this.phase = 'fight';
    this.elapsed = 0;
    this.lastHardHit = -1;
    this.accumulator = 0;
    this.clashes = 0;
    this.label.set(perfect ? 'Perfect rip!\nExtra spin' : '');
    this.labelTimer = perfect ? 1.5 : 0;
    console.log(`[MATCH] launch power ${power.toFixed(2)}${perfect ? ' PERFECT' : ''} aim ${aim.toFixed(2)} vs AI ${aiPower.toFixed(2)}`);
  }

  /** Pinch near the floor and lift to raise a bump; press a fingertip into the floor to dent it. */
  private updateShaping() {
    for (const side of ['left', 'right'] as const) {
      const h = this.hands[side];
      if (!h.tracked) {
        this.shaping[side] = null;
        continue;
      }
      if (h.pinching) {
        const l = this.toLocal(h.pinch);
        let held = this.shaping[side];
        if (!held && h.justPinched) {
          if (this.arena.inside(l.x, l.z) && Math.abs(l.y - this.arena.height(l.x, l.z)) < SHAPE_GRAB) {
            held = this.shaping[side] = { x: l.x, z: l.z, y0: l.y, t: 0, far: false };
            this.progress.advance('match');
          } else if (this.rayFloor(h)) {
            // Far bump: point at the floor and pinch; it rises while the pinch is held.
            held = this.shaping[side] = { x: this.rayHit.x, z: this.rayHit.z, y0: l.y, t: 0, far: true };
            this.progress.advance('match');
          }
        }
        if (held) {
          held.t += this.frameDt;
          const lift = held.far ? held.t * RAY_BUMP_RATE : l.y - held.y0;
          const amplitude = Math.min(BUMP_MAX, Math.max(BUMP_MIN, 0.012 + lift));
          this.arena.stamp(held.x, held.z, amplitude);
        }
        continue;
      }
      this.shaping[side] = null;
      this.pressDent(h);
    }
  }

  private pressDent(h: HandState) {
    const l = this.toLocal(h.index);
    if (!this.arena.inside(l.x, l.z)) return;
    const depth = this.arena.height(l.x, l.z) - l.y;
    if (depth > 0.004) this.arena.stamp(l.x, l.z, -Math.min(DENT_MAX, depth));
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
      if (clash) {
        this.clashes++;
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
      this.label.set(v === 2 ? 'Draw' : `${winner.spec.name} won\n${loser.finish === 'spin' ? 'outspun' : loser.finish} after ${this.elapsed.toFixed(0)} s`);
      this.resultTimer = 3;
      return;
    }
    const name = (t: Top) =>
      t.finish === 'pocket' ? 'Pocket finish' : t.finish === 'over' ? 'Over finish' : t.finish === 'burst' ? 'BURST' : 'Spin finish';
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
      const score = `You ${this.myPoints} - ${this.theirPoints}`;
      const decided = this.myPoints >= MATCH_POINTS || this.theirPoints >= MATCH_POINTS;
      this.earn(v === 1, loser, decided, decided && this.myPoints > this.theirPoints);
      if (decided) {
        text = `${this.myPoints > this.theirPoints ? 'You win the match!' : 'You lose the match'}\n${score}`;
        this.myPoints = 0;
        this.theirPoints = 0;
        this.matchOver = true;
      } else {
        text = `${name(loser)}! ${v === 1 ? 'You' : 'They'} +${points}\n${score}`;
      }
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
      this.label.set('Pinch near your top and pull back toward you\nthen let go');
    }
    const bump = g === 'bump' && this.phase === 'fight' && !this.demo && this.elapsed > 3 && this.theirs.alive;
    this.bumpMark.visible = bump;
    if (bump) {
      const r = Math.hypot(this.theirs.x, this.theirs.z) || 1;
      const x = this.theirs.x - (this.theirs.x / r) * 0.035;
      const z = this.theirs.z - (this.theirs.z / r) * 0.035;
      this.bumpMark.position.set(x, this.arena.height(x, z) + 0.002, z);
      this.bumpMark.scale.setScalar(1 + 0.3 * Math.sin(this.time * 6));
      this.label.set('Pinch the floor at the ring and lift\nthe slope pushes the rival');
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
    // The first match is over: the anvil appears and calls for the new part.
    if (matchOver && GUIDE_ORDER.indexOf(this.progress.guide) < GUIDE_ORDER.indexOf('forge')) this.progress.advance('forge');
  }

  /** Shows a level-up, then each new unlock spinning over the arena before it flies off. */
  private updateRewards(dt: number) {
    if (this.levelUpText && this.phase === 'result' && this.resultTimer < RESULT_TIME - 1.4) {
      this.label.set(this.levelUpText);
      this.levelUpText = '';
    }
    if (!this.reveal && this.reveals.length && this.phase === 'result' && this.resultTimer < RESULT_TIME - 1.4) {
      const key = this.reveals.shift()!;
      const obj = unlockModel(key, this.arenas);
      this.stage.add(obj);
      this.reveal = { obj, t: 0 };
      playUnlock();
      this.label.set(`NEW!\n${unlockName(key)}`);
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
      this.reveal = null;
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
    if (this.keys.has('KeyB')) {
      this.arena.stamp(x, z, 0.03);
      this.progress.advance('match');
    }
    if (this.keys.has('KeyN')) this.arena.stamp(x, z, -0.025);
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
function unlockName(key: string): string {
  const [kind, id] = key.split(':');
  if (kind === 'paint') return 'New paint';
  if (kind === 'arena') return `${id} arena`;
  const name = kind === 'ring' ? RINGS.find((r) => r.id === id)?.name : kind === 'tip' ? TIPS.find((t) => t.id === id)?.name : id;
  return `${name} ${kind}`;
}

/** The model shown when something is unlocked: the part, a paint pot, or the arena's miniature. */
function unlockModel(key: string, arenas: ArenaLayout[]): Object3D {
  const [kind, id] = key.split(':');
  if (kind === 'arena') return miniArena(arenas.find((a) => a.name === id) ?? arenas[0], true);
  for (const [, items] of ROWS) for (const item of items) if (itemKey(item) === key) return itemModel(item);
  return new Group();
}
