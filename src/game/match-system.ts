import { AdditiveBlending, NormalBlending, BufferGeometry, CircleGeometry, DoubleSide, Shape, ShapeGeometry, Vector2, Float32BufferAttribute, createSystem, CylinderGeometry, Group, Matrix4, ConeGeometry, Mesh, MeshBasicMaterial, MeshMatcapMaterial, Object3D, PlaneGeometry, Quaternion, RingGeometry, TorusGeometry, Vector3, VisibilityState, XRPlane } from '@iwsdk/core';
import { CordTone, duck, setAudioFrame, ForgeLoop, playGong, playLand, playQuench, playTell, playBarFull, playCrunch, playLocked, playMachine, playStrike, playPick, playPlace, playThock, setAudioPaused, applySound, playLevelUp, playUnlock, playXp, playBurst, playClash, playDash, playLaunch, playOver, playPocket, playResult, playStamp, playTopple, SpinHum, playTouchdown, playScrape, playMatch } from './audio.js';
import { COMFORT, COMFORT_MODES, comfortMode, nextComfort } from './comfort.js';
import { HandInput, HandState, Side } from './hands.js';
import { ARENAS } from './arenas.js';
import { Builder, Button, loadArenas } from './builder.js';
import { GUIDE, SIGN_TILT, titleMesh } from './ui.js';
import { RIP_RELEASE, RipMeter, ripPower } from './rip.js';
import { decodeBuild } from './challenge.js';
import { DISPLAY_RIM, maxRim, normRadius, rimRadius, spawnDistance } from './layout.js';
import type { ArenaLayout } from './layout.js';
import { rivalMove, sealStrike, TELL_TIME, Arena, ATTACK, CUP_DEPTH, CUP_SIGMA, DEFENSE, finishPoints, MATCH_HEAT, RIVAL_RAMP_SIGMA, LAUNCH_SPEED, LAUNCH_TILT, launchSpin, step, STEP, Top, TopSpec, TUNING, verdict } from './sim.js';
import type { FloorShape, Seal, ShapeKind } from './sim.js';
import { Forge, FORGE_SINK, itemKey, itemModel, loadBuild, ROWS, saveBuild, sealModel } from './forge.js';
import { FEATS, GUIDE_ORDER, MARK, Progress } from './progress.js';
import { dailyOrder, localDate, orderMet } from './orders.js';
import { nextArena } from './rotation.js';
import { SAVE_KEYS } from './demo-save.js';
import type { Order } from './orders.js';
import { anvilModel, Hub, standModel } from './hub.js';
import { MatchBar } from './match-bar.js';
import { HandOccluder } from './hand-occluder.js';
import { RoomLight } from './room-light.js';
import { edgeDistance, fitToTable, insidePoly, RIM_MARGIN } from './room.js';
import { TableTouch } from './table-touch.js';
import type { XZ } from './room.js';
import { allBuilds, buildName, circuitOf, CIRCUITS, CORES, statsOf, EMBLEM_COLORS, EMBLEM_NAMES, PRESETS, RINGS, RIVALS, SEAL_BLURBS, SEAL_NAMES, ringOf, roleOf, specFromBuild, TIPS } from './parts.js';
import type { Rival } from './parts.js';
import type { TopBuild } from './parts.js';
import { ArenaView, ChargePips, Cord, Impacts, Label, makeMatcap, miniArena, OPPONENT_COLOR, ROOM, PALM, GhostHand, ShapeMarks, SOFT_SHADOW, Sparks, Pillar, Stamp, TEAM_MINE, Trails, TEAM_RIVAL, TopView, WALL_HEIGHT } from './visuals.js';
import type { ShapeMarkSpec } from './visuals.js';
import { behindOn, SHAPE_SIZE, ShapingCharges, StrikeBar } from './shaping.js';
import { PEDESTAL, pickTable, placeArena, TABLE_MAX_H, TABLE_MIN_H } from './placement.js';
import { TUNE } from './tuning.js';
import type { Point } from './placement.js';

/** The arena (and everything on the table) is drawn this much larger than its simulation size. */
const ARENA_SCALE = TUNE.scale;
/** Placing waits at least this long for planes, and places on the tray after SETTLE_MAX without a table (s). */
const SETTLE_MIN = 0.5;
const SETTLE_MAX = 5;
/** With hands in view, placing waits this long for a palm pressed on the table, then places anyway (s). */
const PRESS_WAIT = 8;
/** A press moves the arena at most this far from its comfortable spot toward the hand (m). */
const PRESS_PULL = 0.15;
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
/** A launch spot is kept this far inside the rim (fraction of the radius) and this far from the rival (arena-local). */
const LAUNCH_MAX_N = 0.8;
const LAUNCH_GAP = 0.05;
/** A pinch this high above the floor still picks the launch spot under it (arena-local). */
const LAUNCH_HOVER = 0.12;
/** A straight-up pull launches this much slower and with this much more spin than a flat one. */
const STEEP_SLOW = 0.6;
const STEEP_SPIN = 0.12;
/** Pinches this close to the floor (vertically) grab it to start a ramp. */
const SHAPE_GRAB = 0.05;
const RESULT_TIME = 4;
/** A knockout replay: this many sim steps (2 s) recorded, played back at this speed. */
const REPLAY_STEPS = 240;
const REPLAY_SPEED = 0.4;
/** A finish this soon (s) after the player's shape is credited to it. */
const CAUSE_WINDOW = 1.5;
const FINISH_WORD: Record<string, string> = { pocket: 'SLAG', over: 'THROWN', burst: 'SHATTER', spin: 'OUTLAST' };
/** Seconds the rival and arena intro shows before the first session's rip hint. */
const INTRO_TIME = 2.5;
/** A hand lost this long (s) cancels what it was doing, instead of acting as a release. */
const HAND_LOSS_GRACE = 0.1;
/** Where round messages hang: small, over the arena's far rim (arena-local). */
const LABEL_AT = new Vector3(0, 0.14, -0.21);
/** At home after the first session the Smith's board fills the card's slot: notes hang just above it. */
const HOME_NOTE_Y = 0.2;
/** The match bar sits right under the card, its top edge on the card's lower edge (the two read as one display). */
const BAR_Y = 0.063;
const BAR_BACK = 0.021;
/** The MENU plate's height over the arena floor (arena-local), at the rim's height like the tabs. */
const MENU_Y = 0.012;
/** The workshop shows the arena a little smaller, so its near rim stays behind the piece rail. */
const WORKSHOP_RIM = 0.13;
/** A match arena's near rim stays this far out (arena-local, as the 0.17 arenas): a bigger one slides back. */
const NEAR_RIM = 0.17;
const MOVE_WORD = { charge: 'charges', quake: 'quakes the floor', pull: 'pulls you to the pits' } as const;
/** The forge bar's color by seal, so the chosen strike shows on the wrist. */
const SEAL_COLOR: Record<Seal, number> = { anvil: 0xff8a2a, rush: 0xff4a3a, magnet: 0x5ab8ff, tilt: 0x7de07d, hammer: 0xffe066, ward: 0xd9d4ff };
/** A clash this strong (0..1) is a hard hit: big feedback and a 45 ms simulation-only hit stop. */
/** Rivals from level 6 set a ramp at most this often (s). */
const RIVAL_SHAPE_GAP = 3;
/** A finish your shape caused plays its visuals at SLOW_MO speed for this long (real s). */
const SLOW_MO_TIME = 0.9;
/** Seconds the placed arena takes to forge up out of the table. */
const RISE_TIME = 1.1;
/** The first match's opening grace (s): no knockout before the ramp hint has shown. */
const FIRST_GRACE = 6;
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
/** White hot: the most spin a rip gives; its real reward is a head start on the strike bar. */
const PERFECT_SPIN = 1.0;
const PERFECT_BAR = 0.25;
/** How long a rival holds its ready move while your strike is ready (s). */
const RIVAL_HOLD = 4;
/** Far ramps (and the dev key's) grow at this rate (m/s) while the pinch is held. */
const RAY_BUMP_RATE = 0.05;
/** A near ramp is set after the pinch is held this long (s); a brush of the fingers sets nothing. */
const RAMP_NEAR_HOLD = 0.12;
/** Sling: grab within this of the caught top, fire past SLING_MIN of pull, full cord at SLING_FULL (arena-local). */
const SLING_GRAB = 0.025;
const SLING_MIN = 0.01;
const SLING_FULL = 0.05;
/** A sling aimed within this of a slag pit's mouth goes straight in (rad). */
const SLING_SNAP = (20 * Math.PI) / 180;
/** A drag shorter than this (arena-local, about 1.2 cm in the world) does not turn the ramp. */
const RAMP_AIM_DEADZONE = 0.005;


type Phase = 'placing' | 'hub' | 'ready' | 'pulling' | 'fight' | 'result' | 'build' | 'forge';

/** Depth only, drawn first: the real table hides what is behind or below it. */
const TABLE_MASK = new MeshBasicMaterial({ colorWrite: false, side: DoubleSide });

type RawPlane = { orientation?: string; semanticLabel?: string; polygon?: DOMPointReadOnly[] };

/**
 * One match loop on the table: place the arena, rip-cord launch against an AI top,
 * steer the fight by pulling bumps up and pressing dents into the floor, show the result.
 */
export class MatchSystem extends createSystem({
  planes: { required: [XRPlane] },
}) {
  private phase: Phase = 'placing';
  private settle = 0;
  /** A big arena: how much it shows shrunk (1 = full size) and how far it has slid back for a match (m). */
  private viewK = 1;
  private pushed = 0;
  /** A match arena's own scale (shrunk to fit a small table) and its slide, worked out once per arena and placement. */
  private rootK = 1;
  /** How far a shrunk match arena has been lowered so its smaller pedestal still stands on the table (m). */
  private lowered = 0;
  private matchScale = 1;
  private matchPush = 0;
  private fitLayout: ArenaLayout | null = null;
  private fitRadius = 0;
  private fitPlaced = 0;
  /** The arena is not opening, sliding or shrinking: a pull may start. */
  private sizeSettled = true;
  /** Press to place: a glowing print on the table where the arena will rise, and each hand's press detector. */
  private print = new Group();
  /** The ring round the print that runs down over PRESS_WAIT (then the arena places itself). */
  private printWait = new Mesh(new RingGeometry(0.08, 0.09, 64, 1, Math.PI / 2, Math.PI * 2).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.9, depthWrite: false, blending: AdditiveBlending }));
  private printLabel = new Label(0.2, 1.25, 0.6);
  private touches: Record<Side, TableTouch> = { left: new TableTouch(TUNE.press), right: new TableTouch(TUNE.press) };
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
    arenas: () =>
      this.arenas.map((layout, i) => ({ layout, lock: this.progress.lockText(`arena:${layout.name}`), own: !ARENAS.includes(layout), current: this.progress.arenaPin !== null && i === this.arenaIndex })),
    pinned: () => this.progress.arenaPin !== null,
    // The arena is set for real when the workshop closes (leaveBuilder).
    selectArena: (i) => {
      // -1: back to the rotation; otherwise this arena for every match until changed.
      this.progress.pinArena(i < 0 ? null : this.arenas[i].name);
      if (i >= 0) this.arenaIndex = i;
    },
    removedArena: (name) => {
      const current = this.arenas[this.arenaIndex];
      this.arenas = this.arenas.filter((a) => a.name !== name);
      this.arenaIndex = Math.max(0, this.arenas.indexOf(current));
    },
  });
  /** Smith level, XP and unlocks, saved in the browser. */
  private progress = new Progress(typeof localStorage === 'undefined' ? null : localStorage);
  /** The match bar on the far rim. */
  private bar = new MatchBar();
  /** The forge: build your own top from parts. */
  private forge = new Forge({
    done: (build) => this.leaveForge(build),
    // The first session's part counts once the top is quenched (saved), not just fitted.
    fitted: () => undefined,
    // The forge's words, big on the card, with what the next bout asks of your top.
    said: (text) => {
      if (this.phase !== 'forge') return;
      this.label.set(this.forgeNext ? `${text}\n${this.forgeNext}` : text);
    },
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
  private trails = new Trails();
  private pillar = new Pillar();
  private trailT = 0;
  private showcase = new Group();
  /** First-session hints: arrows teaching the rip, and a marker where a bump would pay off. */
  private ripArrows = new Group();
  private bumpMark = new Mesh(new RingGeometry(0.012, 0.016, 32).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: GUIDE, transparent: true, depthWrite: false }));
  private bumpHintShown = false;
  /** Unlocks waiting to be shown over the arena, and the one showing. */
  private reveals: string[] = [];
  private reveal: { obj: Object3D; t: number } | null = null;
  /** One unlock shown per result card (the first session's part first); the rest wait for the next ones. */
  private revealedHere = false;
  private rewardHold = 0;
  /** Home screen buttons, in front of the arena; and the small MENU plate during a match. */
  /** Home: the smithy stations around the arena (top stand, arena rack, anvil). */
  private hub = new Hub();
  private menuButton = new Button('menu', 0.07, 0.026);
  /** Everything that can point and pinch at buttons and the arena: both hands, plus the gaze in dev. */
  private pointers: HandState[] = [];
  /** Dev: the hand driver holds the hands, so the gaze is not a pointer. */
  gazeOff = false;
  private gazePointer: HandState = {
    tracked: false,
    pinching: false,
    justPinched: false,
    justReleased: false,
    gap: Infinity,
    pinch: new Vector3(),
    index: new Vector3(),
    low: 0,
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
  /** The ghost hand that shows the first moves. */
  private ghost = new GhostHand();
  /** Big stamped words over the arena: rounds, finishes, the rip. */
  private stamp = new Stamp(0.2);
  /** The arena forging up out of the table after placing (0..1), and the title over it. */
  private rise = 1;
  /** The strike's seal coin, rising off your top as it lands. */
  private sealPop = Object.assign(new Group(), { visible: false });
  /** A rival's tell drawn on the floor: the lane of a charge, the line of a pull toward its pit. */
  private lane = new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, -0.5), new MeshBasicMaterial({ color: 0x4fd1ff, transparent: true, opacity: 0.5, blending: AdditiveBlending, depthWrite: false }));
  /** Seconds left of a won match's celebration (sparks round the rim). */
  private celebrate = 0;
  /** This match you were match point down at some time (a win is a comeback). */
  private wasDown = false;
  /** Shape marks, pooled for updateShapes, and the floor height lookup they use. */
  private specPool: ShapeMarkSpec[] = [];
  private specsMine: ShapeMarkSpec[] = [];
  private specsTheirs: ShapeMarkSpec[] = [];
  private heightAt = (x: number, z: number) => this.arena.height(x, z);
  /** This round's rip power (for the OUTLAST reason). */
  private lastRip = 1;
  /** In the forge: the next bout in a line (the rival's style and the arena), under the forge's words. */
  private forgeNext = '';
  /** Dev: photo mode for store art (see update). */
  photo = false;
  /** A quench in progress (a breath of steam before the forge closes). */
  private quenching: { t: number; build: TopBuild } | null = null;
  /** This match's rival intro (portal, VS) has played: a drawn 0-0 round does not repeat it. */
  private introDone = false;
  /** The frame-rate guard: average frame time, how long it has been slow, and whether it lightened. */
  private fpsAvg = 1 / 72;
  private slowFor = 0;
  private lite = false;
  /** The last finish's cause, for the log ("YOUR RAMP → SLAG"). */
  private lastCause = '';
  /** When Menu was pinched once during a match (a second pinch within 3 s leaves). */
  private menuArmed = -10;
  /** The rival's entrance at a match's start (s into it), and the VS words it lands with. */
  private entrance: { t: number; vs: string; sub: string; champion: boolean; from?: Vector3 } | null = null;
  private portal = Object.assign(new Mesh(new RingGeometry(0.7, 1, 48), new MeshBasicMaterial({ color: 0x4fd1ff, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide })), { visible: false });
  private portalCore = Object.assign(new Mesh(new CircleGeometry(0.7, 48), new MeshBasicMaterial({ color: 0x0a1a24, transparent: true, opacity: 0.85, depthWrite: false, side: DoubleSide })), { visible: false });
  /** Each hand's mark on the arena floor under it: a soft shadow, or a warm glow when the strike is ready. */
  private handAt = new Vector3();
  /** The pinch ring between each thumb and index: it closes as the fingers do, and lights when they meet. */
  private pinchRings = (['left', 'right'] as const).map(() => {
    const m = new Mesh(new RingGeometry(0.8, 1, 32), new MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, depthTest: false }));
    m.renderOrder = 40;
    m.visible = false;
    return m;
  });
  private handMarks = (['left', 'right'] as const).map(() =>
    Object.assign(new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0x000000, map: SOFT_SHADOW, transparent: true, depthWrite: false })), { visible: false }),
  );
  /** Molten handprints left on the desk by strikes (a small pool). */
  private palmPrints = [0, 1, 2].map(() => Object.assign(new Mesh(new PlaneGeometry(0.075, 0.075), new MeshBasicMaterial({ map: PALM, transparent: true, depthWrite: false, blending: AdditiveBlending })), { visible: false }));
  private nextPrint = 0;
  /** Scorches on the desk where thrown tops landed (a small pool). */
  private scorches = [0, 1, 2, 3].map(() => Object.assign(new Mesh(new PlaneGeometry(0.045, 0.045), new MeshBasicMaterial({ map: SOFT_SHADOW, color: 0xff6a1a, transparent: true, depthWrite: false, blending: AdditiveBlending })), { visible: false }));
  private nextScorch = 0;
  /** This round's off-the-desk moment has been shown. */
  private offDeskShown = false;
  /** The last REPLAY_STEPS sim steps of both tops (x, z, angle, wobble, damage each), a ring buffer. */
  private replayBuf = new Float32Array(REPLAY_STEPS * 10);
  private replayAt = 0;
  private replayCount = 0;
  /** A knockout replay playing (in recorded steps, at REPLAY_SPEED), with stand-in tops to draw. */
  private replay: { t: number; frames: Float32Array; n: number; out: [Top, Top] } | null = null;
  private ghosts: [Top, Top] = [new Top(ATTACK), new Top(DEFENSE)];
  /** The turntable's turn during a replay (radians). */
  private turn = 0;
  /** This match so far, for the report at home: each round's finish (- = the rival's), best rip, XP. */
  private matchLog = { rounds: [] as string[], rip: 0, xp: 0, won: false, score: '' };
  private title = titleMesh('SPINSMITH', 0.26, 0.06);
  private titleShown = false;
  private titleT = 0;
  /** What waits for the title to go (the no-table notice). */
  private afterTitle: (() => void) | null = null;
  /** A ring around your top while a Hammer is armed (gold) or a Ward holds (pale violet). */
  private aura = new Mesh(new TorusGeometry(0.016, 0.0016, 8, 40).rotateX(Math.PI / 2), new MeshBasicMaterial({ color: 0xffe066, transparent: true, depthWrite: false, blending: AdditiveBlending }));
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
  /** Each hand's ramp in the making: where, since when, and the live shape once it is set. */
  private shaping: Record<Side, { x: number; z: number; sx: number; sz: number; t: number; far: boolean; amp: number; dx: number; dz: number; shape: FloorShape | null } | null> = { left: null, right: null };
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
  /** Real hands drawn in front of the game (a depth-only copy of each tracked hand). */
  private handOccluder = new HandOccluder();
  /** The real room dims around the arena, more in a fight; the desk around the arena stays lit. */
  private roomLight = new RoomLight();
  /** The real table as a depth-only shape: hides what falls behind or below the desk. */
  private tableMask = new Group();
  /** The quiet forge loop: up at home and in the workshops, ducked under a fight. */
  private loop = new ForgeLoop();
  private rivalShapeAt = -9;
  private rivalMarks = new ShapeMarks(0x4fd1ff);
  /** After a finish your shape caused, the visuals play slowly for a moment (real seconds left). */
  private slowMo = 0;
  private marks = new ShapeMarks(0xff8a2a);
  private pips = new ChargePips();
  /** The player's last shape (fight time and kind), to name it when it decides a round. */
  private lastShape: { t: number; kind: ShapeKind | 'sling' | 'strike' } | null = null;
  /** The forge bar (docs/DUEL-DESIGN.md): full, a palm pressed on the table beside the arena is the Anvil Strike. */
  private forgeBar = new StrikeBar();
  private parried = false;
  private tipFresh = { left: true, right: true };
  private slapAt = new Vector3();
  private rip = new RipMeter();
  private openFor = 0;
  private replayedOnce = false;
  private rivalHeld = 0;
  private holdSaid = false;
  private strikeTouch: Record<Side, TableTouch> = { left: new TableTouch(TUNE.strikePress), right: new TableTouch(TUNE.strikePress) };
  /** When the bar last became full: the strike arms half a second later (a hand already resting there is not a strike). */
  private fullSince = -1;
  /** A strike has landed this session: the hint stops. */
  private struckOnce = false;
  /** A cup made this session (its first-time hint goes then). */
  private cuppedOnce = false;
  /** Where the shockwave starts (arena-local, on the rim beside the palm). */
  private shockAt = { x: 0, z: 0 };
  /** The bar on the back of each hand: ten segments around a ring that faces the eyes. */
  private barRings: Record<Side, Group> = { left: new Group(), right: new Group() };
  private barSegs: MeshBasicMaterial[] = [];
  /** The shockwave ring running out from the middle (arena-local), and how far it has gone (0..1, 1 = done). */
  private shock = new Mesh(new RingGeometry(0.93, 1, 64).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0xffb04a, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }));
  private shockT = 1;
  /** Where to slap: a glowing print on the table beside the near rim, while the strike is armed. */
  private slapMark = new Group();
  /** The shockwave is clipped to the arena: its world center and rim radius. */
  private shockClip = { uC: { value: new Vector3() }, uR: { value: 1 } };
  /** The strike's hint shows once a session, the first time the bar is full. */
  private strikeTaught = false;
  private barWasFull = false;
  /** The rival's own bar and its telegraphed move: when it lands, and whether its hint was shown this session. */
  private rivalBar = new StrikeBar();
  private tellAt = -1;
  private tellTaught = false;
  /** What the rival last did to the floor or to you (for THEIR … → SLAG). */
  private rivalShapeKind = 'RAMP';
  /** Each hand's live cup (a held well that catches the first top to roll in), and when it was set. */
  private cups: Record<Side, { shape: FloorShape; at: number; caught: boolean } | null> = { left: null, right: null };
  /** A hand pulling a caught top back to sling it: the cup and where the pinch began (arena-local). */
  private slings: Record<Side, { cup: FloorShape; sx: number; sz: number; px: number; pz: number } | null> = { left: null, right: null };
  private readonly slingFrom = new Vector3();
  /** The sling has been used this session (its hint stops). */
  private slungOnce = false;
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
  /** Where your top launches from this round (arena-local), chosen by where you pinch over the arena. */
  private launchFrom: { x: number; z: number } | null = null;
  /** The rival's spot this round: an angle around the arena's far half. */
  private rivalAngle = -Math.PI / 2;
  /** The next match's rival, picked at home and shown there with its arena. */
  private nextRival: Rival | null = null;
  /** While ready: a faint line on the floor around where you can launch from. */
  private launchZone = new Mesh(new BufferGeometry(), new MeshBasicMaterial({ color: GUIDE, transparent: true, opacity: 0.5, depthWrite: false, side: 2 }));
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
    new MeshBasicMaterial({ color: 0x3fd0ff, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
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
      this.ghost.root,
      this.portal,
      this.portalCore,
      ...this.palmPrints,
      ...this.scorches,
      ...this.handMarks,
      this.lane,
      this.sealPop,
      this.reticle,
      this.aura,
      this.arenaView.root,
      this.sparks.points,
      this.impacts.root,
      this.trails.mesh,
      this.pillar.mesh,
      this.ripArrows,
      this.bumpMark,
      this.marks.root,
      this.rivalMarks.root,
      this.launchZone,
      this.pips.root,
      this.shock,
    );
    this.shock.visible = false;
    {
      const glow = (o: number) => new MeshBasicMaterial({ color: 0xffb04a, transparent: true, opacity: o, depthWrite: false, blending: AdditiveBlending });
      const palm = new MeshBasicMaterial({ color: 0xff8a2a, map: PALM, transparent: true, opacity: 0.9, depthWrite: false, blending: AdditiveBlending });
      this.slapMark.add(new Mesh(new RingGeometry(0.028, 0.033, 40).rotateX(-Math.PI / 2), glow(0.6)), new Mesh(new PlaneGeometry(0.05, 0.05).rotateX(-Math.PI / 2), palm));
      this.slapMark.visible = false;
      this.root.add(this.slapMark);
    }
    // Only the part over the arena floor draws (the ring starts on the rim, half of it would hang in the air).
    (this.shock.material as MeshBasicMaterial).onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.shockClip);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vShockWorld;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvShockWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vShockWorld;\nuniform vec3 uC;\nuniform float uR;')
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (distance(vShockWorld.xz, uC.xz) > uR) discard;');
    };
    this.myBuild = this.forge.allowed(this.myBuild);
    this.setBuilds(this.myBuild, this.theirBuild);
    this.buildHandle();
    this.title.visible = false;
    this.title.renderOrder = 5;
    this.root.add(this.title);
    // Low over the arena's middle, in front of the far card and the match bar.
    this.stamp.mesh.position.set(0, 0.045, 0.03);
    this.root.add(this.stamp.mesh);
    this.root.add(this.handle, this.stage, this.label.mesh, this.builder.root, this.forge.root, this.hub.root, this.menuButton.mesh);
    this.hub.setComfort(comfortMode(), COMFORT_MODES.length);
    // The hand driver (src/dev-drive.ts) reads the game through this.
    if (import.meta.env.DEV) (window as unknown as { __game: unknown }).__game = this;
    // A plate laid on the left of the near rim at the touch band's one pitch, like every sign you pinch.
    this.menuButton.mesh.position.set(-0.2, MENU_Y, 0.14);
    this.menuButton.mesh.rotation.set(-SIGN_TILT, 0, 0);
    this.menuButton.set('MENU');
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
    for (const m of this.pinchRings) this.world.createTransformEntity(m);
    this.world.createTransformEntity(this.handOccluder.joints);
    this.world.createTransformEntity(this.handOccluder.bones);
    this.world.createTransformEntity(this.roomLight.mesh);
    for (const side of ['left', 'right'] as const) {
      const g = this.barRings[side];
      for (let i = 0; i < 10; i++) {
        const mat = new MeshBasicMaterial({ color: 0x8a8f99, transparent: true, opacity: 0.18, depthWrite: false, side: DoubleSide });
        this.barSegs.push(mat);
        g.add(new Mesh(new RingGeometry(0.014, 0.019, 6, 1, Math.PI / 2 - (i + 1) * ((Math.PI * 2) / 10) + 0.04, (Math.PI * 2) / 10 - 0.08), mat));
      }
      g.visible = false;
      this.world.createTransformEntity(g);
    }
    {
      // A glowing palm print inside a ring; the ring empties as the wait for a table runs out.
      const glow = (o: number) => new MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: o, depthWrite: false, blending: AdditiveBlending });
      const palm = new MeshBasicMaterial({ color: 0xff8a2a, map: PALM, transparent: true, opacity: 0.85, depthWrite: false, blending: AdditiveBlending });
      this.print.add(new Mesh(new RingGeometry(0.075, 0.08, 48).rotateX(-Math.PI / 2), glow(0.4)), new Mesh(new PlaneGeometry(0.13, 0.13).rotateX(-Math.PI / 2), palm), this.printWait);
      this.printLabel.mesh.position.set(0, 0.12, 0);
      this.printLabel.mesh.scale.setScalar(1.25);
      this.printLabel.set('Rest your palm here\npress it on the table: the arena rises');
      this.print.add(this.printLabel.mesh);
      this.print.visible = false;
      this.world.createTransformEntity(this.print);
    }
    this.world.createTransformEntity(this.tableMask);
    // The match bar: a metal strip set into the far rim, tipped back toward the player, under the
    // round messages, so score and fight share one view.
    this.bar.mesh.position.set(0, BAR_Y, LABEL_AT.z + BAR_BACK);
    this.bar.mesh.rotation.x = -0.55;
    this.bar.mesh.scale.setScalar(0.21);
    this.root.add(this.bar.mesh);

    if (import.meta.env.DEV) {
      const onKey = (e: KeyboardEvent) => {
        if (e.repeat) return;
        this.keys.add(e.code);
        // C: a cup right under the rival, to try the sling.
        if (e.code === 'KeyC' && this.phase === 'fight') this.makeCup('right', this.theirs.x, this.theirs.z);
        // T: fill the rival's bar (its move's tell starts).
        if (e.code === 'KeyT' && this.phase === 'fight') this.rivalBar.value = 1;
        // J: fill the forge bar (then a palm press, or Shift+J, strikes).
        if (e.code === 'KeyJ' && this.phase === 'fight') {
          this.forgeBar.value = 1;
          if (e.shiftKey) {
            // As a player would: the palm on the near rim, across from the rival.
            let a = Math.atan2(-this.theirs.z, -this.theirs.x);
            if (a < 0) a = Math.abs(a) < Math.PI / 2 ? 0 : Math.PI;
            const r = rimRadius(this.arena.layout, a);
            this.doStrike(Math.cos(a) * r, Math.sin(a) * r);
          }
        }
        // A: the next arena, locked or not (to look at every arena).
        if (e.code === 'KeyA' && this.phase === 'hub') {
          this.arenaIndex = (this.arenaIndex + 1) % this.arenas.length;
          this.setArena(this.arenas[this.arenaIndex]);
        }
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
        if (e.code === 'KeyP') {
          this.phase = 'placing';
          this.settle = 0;
          this.root.visible = false;
        }
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
    if (paused) {
      // The system menu is up: nothing stays stuck to where the hands were.
      this.barRings.left.visible = this.barRings.right.visible = this.reticle.visible = this.slapMark.visible = false;
      this.cord.set(null);
      for (const m of this.pinchRings) m.visible = false;
      return;
    }
    // On the result card and at home, the card steps back while a stamp holds the far rim (one
    // thing there at a time); in a fight its instructions (a tell, strike now) stay at full strength.
    // On the result the stamp takes the card's place, so the card steps away entirely.
    this.label.update(Math.min(delta, 0.1), this.stamp.mesh.visible && (this.phase === 'result' || this.phase === 'hub' || this.phase === 'ready' || this.phase === 'fight'), this.phase === 'result' || this.phase === 'fight' || this.phase === 'ready' ? 0 : 0.2);
    this.printLabel.update(Math.min(delta, 0.1));
    // Dev photo mode (store art): only the arena, the tops and the room; every card and button hidden.
    if (this.photo) {
      for (const o of [this.label.mesh, this.printLabel.mesh, this.bar.mesh, this.menuButton.mesh, this.stamp.mesh, this.slapMark, this.reticle, ...this.pinchRings, ...this.handMarks]) o.visible = false;
      this.hub.photo();
    }
    this.guardFrameRate(delta);
    this.stamp.update(Math.min(delta, 0.1));
    this.updatePrints(Math.min(delta, 0.1));
    this.updateHandMarks();
    this.updatePinchRings();
    if (this.sealPop.visible) {
      const t = (this.sealPop.userData.t += Math.min(delta, 0.1));
      const me = this.mine;
      this.sealPop.position.set(me.x, this.arena.height(me.x, me.z) + 0.018 + t * 0.012, me.z);
      this.sealPop.rotation.set(1.2, t * 8, 0);
      this.sealPop.scale.setScalar(1.5 * Math.min(1, t / 0.12) * Math.max(0, 1 - Math.max(0, t - 0.5) / 0.3));
      if (t > 0.8) this.sealPop.visible = false;
    }
    if (this.celebrate > 0) {
      const before = this.celebrate;
      this.celebrate -= Math.min(delta, 0.1);
      // A burst every 0.1 s, chasing round the rim.
      if (Math.floor(before * 10) !== Math.floor(this.celebrate * 10)) {
        const a = this.celebrate * 9;
        const r = rimRadius(this.arena.layout, a);
        this.sparks.burst(Math.cos(a) * r, this.arena.floorHeight(1), Math.sin(a) * r, 0.7);
      }
      this.arenaView.charge = 0.6 + 0.4 * Math.sin(this.time * 14);
    }
    // A new XR session (leaving and coming back) or a recenter puts the arena in front again.
    if (session !== this.xrSession) {
      // Back at home, the print asks for a press again; mid-match, the arena just comes along.
      if (this.xrSession && this.phase === 'hub') {
        this.phase = 'placing';
        this.settle = 0;
        this.root.visible = false;
      } else if (this.xrSession) this.needPlace = true;
      this.xrSession = session;
      ref.addEventListener('reset', () => (this.needPlace = true));
    }
    const dt = Math.min(delta, 0.05);
    this.frameDt = dt;
    this.time += dt;
    this.hands.update(frame, ref, session, this.player);
    this.handOccluder.update(frame, ref, session, this.player);
    if (import.meta.env.DEV) {
      // In the emulator the gaze crosshair is the only far pointer: the hands' own rays would aim
      // somewhere else at the same time. Hands still work by touch. On a headset, hands do both.
      this.hands.left.hasRay = false;
      this.hands.right.hasRay = false;
      this.updateGazePointer();
    }

    if (this.needPlace && this.phase !== 'placing') {
      this.needPlace = false;
      if (this.demo) this.endDemo();
      if (this.phase === 'pulling' || this.phase === 'fight' || this.phase === 'result') this.toReady();
      this.placeRoot();
    }
    this.easeToTable(dt);
    this.updateSize(dt);
    // The music follows the game; tension when a bar is full, a top is nearly out of spin, or a rival winds up.
    const ph = this.phase;
    const tense = ph === 'fight' && (this.forgeBar.full || this.tellAt >= 0 || (this.mine.alive && this.mine.spin < 0.3) || (this.theirs.alive && this.theirs.spin < 0.3));
    this.loop.update(ph === 'hub' || ph === 'forge' || ph === 'build' ? 'home' : ph === 'ready' || ph === 'pulling' ? 'ready' : ph === 'fight' ? 'fight' : 'quiet', tense ? 1 : 0);
    this.handle.visible = this.phase === 'hub';
    {
      // Home is bright, a fight dark around the lit arena, the forge and workshop warm.
      const p = this.phase;
      const dim = this.lite ? 0 : p === 'fight' || p === 'pulling' ? 0.45 : p === 'ready' || p === 'result' ? 0.25 : p === 'forge' || p === 'build' ? 0.35 : p === 'hub' ? 0.1 : 0;
      this.player.head.getWorldPosition(this.head);
      this.roomLight.update(this.head, this.root.position, this.root.position.y - PEDESTAL, dim, p === 'forge' || p === 'build', dt);
    }
    this.launchZone.visible = (this.phase === 'ready' || this.phase === 'pulling') && !this.demo;
    if (this.phase !== 'fight') {
      this.barRings.left.visible = this.barRings.right.visible = this.shock.visible = this.slapMark.visible = this.lane.visible = false;
      this.arenaView.charge = 0;
    }
    switch (this.phase) {
      case 'placing':
        // Wait for a table to be detected, but never long: without one the arena floats on a tray.
        this.settle += dt;
        this.player.head.getWorldPosition(this.head);
        if (this.settle >= SETTLE_MIN && (this.hands.left.tracked || this.hands.right.tracked)) {
          if (this.updatePress(dt) || this.settle >= PRESS_WAIT) {
            this.print.visible = false;
            if (this.phase === 'placing') this.place();
          }
          return;
        }
        this.print.visible = false;
        if ((this.settle >= SETTLE_MIN && pickTable(this.head, this.tables()) !== null) || this.settle >= SETTLE_MAX) this.place();
        return;
      case 'hub':
        this.updateHub(dt);
        break;
      case 'build':
        this.updateBuilder(dt);
        break;
      case 'forge':
        if (this.quenching) {
          // Steam rising off the quench slot, then the forge folds away.
          const q = this.quenching;
          q.t += dt;
          if (Math.floor(q.t * 12) !== Math.floor((q.t - dt) * 12)) this.steam();
          if (q.t > 0.9) this.leaveForge(q.build);
          break;
        }
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
            else if (this.matchOver) {
              const report = this.matchReport();
              this.toHub();
              // Home after a match: what happened in it, for a few seconds.
              this.label.set(report);
              this.labelTimer = 9;
            }
            else this.toReady();
            break;
          }
          if (this.demo) break;
        }
        // Leaving a match takes two pinches on Menu within 3 s (a stray pinch never ends it).
        if (this.pickButton([this.menuButton]) === 'menu') {
          if (this.time - this.menuArmed < 3) {
            this.menuArmed = -10;
            this.menuButton.set('MENU', undefined, false);
            this.toHub();
            break;
          }
          this.menuArmed = this.time;
          this.menuButton.set('LEAVE?', undefined, true);
          this.label.set('Leave this match?\nPinch MENU again to go home');
          this.labelTimer = 3;
          // The pinch was for Menu: it does not also grab the rip cord.
          break;
        }
        if (this.menuArmed > -10 && this.time - this.menuArmed >= 3) {
          this.menuArmed = -10;
          this.menuButton.set('MENU', undefined, false);
        }
        this.updateReadyPinch();
        break;
      case 'pulling':
        this.updatePull(dt);
        break;
      case 'fight':
        if (this.labelTimer > 0 && (this.labelTimer -= dt) <= 0) this.label.set('');
        this.updateShaping();
        this.updateStrike(dt);
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
    // Sounds come from where they happen in the room: the arena's place and the head, every frame.
    this.player.head.getWorldPosition(this.head);
    this.player.head.getWorldDirection(this.fwd).negate();
    setAudioFrame(this.root.matrixWorld.elements, this.head, this.fwd);
    this.tops.forEach((t, i) => this.hums[i].update(live && t.alive ? Math.max(0, t.spin) : 0, Math.hypot(t.vx, t.vz), t.wobble, this.time, t.x, t.z));
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
      this.bar.animate(this.mine.spin, this.theirs.spin, dt);
    }
    // Visuals only: after a finish your shape caused they slow down for a moment.
    const vdt = this.slowMo > 0 ? dt * SLOW_MO : dt;
    this.slowMo = Math.max(0, this.slowMo - dt);
    if (this.replay) this.playReplay(dt);
    const [ga, gb] = this.replay ? this.ghosts : [this.mine, this.theirs];
    this.myView.sync(ga, this.arena, this.time, vdt);
    this.theirView.sync(gb, this.arena, this.time, vdt);
    this.updateEntrance(dt);
    // A thrown rival that skated off the real table's edge: its own moment (cosmetic, never heat).
    if (this.theirView.offDesk && !this.offDeskShown && !this.replay) {
      this.offDeskShown = true;
      this.stamp.later('OFF THE DESK!', 'onto your floor', 'mine', 1.2);
      this.featDone('offDesk');
      if (import.meta.env.DEV) console.log('[OUT] off the desk');
    }
    this.sparks.rim = maxRim(this.arena.layout) + 0.01;
    this.sparks.update(vdt);
    this.impacts.update(vdt);
    // Trails behind both tops while they fight.
    this.trailT += vdt;
    if (this.trailT >= 1 / 30) {
      this.trailT = 0;
      if (this.phase === 'fight') {
        this.tops.forEach((t, side) => {
          if (t.state === 'spinning') this.trails.drop(side as 0 | 1, t.x, this.arena.height(t.x, t.z), t.z, Math.hypot(t.vx, t.vz));
        });
      }
    }
    this.trails.update(vdt);
    this.pillar.update(Math.min(delta, 0.1));
    this.updateGuide();
    for (const c of this.showcase.children) c.rotation.y += dt * 0.4;
    this.updateRewards(dt);
    this.updateShapes();
    this.arenaView.idleOrbit = this.phase !== 'build';
    // In the workshop the pillars stand where they are picked up.
    if (this.phase === 'build') this.arena.orbitT = 0;
    this.arenaView.update(dt, this.arena);
    // During a replay the arena turns slowly (a turntable, at most 25°/s) to show the knockout from
    // the rival's side, then turns back; the view never moves.
    const r = this.replay;
    const total = r ? r.n / 120 / REPLAY_SPEED : 0;
    const want = r && r.t > 0 ? Math.sin(Math.min(1, r.t / total) * Math.PI) * (2 * Math.PI) / 3 : 0;
    const rate = r ? 0.45 : 1.6;
    this.turn += Math.max(-rate * dt, Math.min(rate * dt, want - this.turn));
    // Play never starts on a turned arena.
    if (this.phase === 'ready' || this.phase === 'fight' || this.phase === 'pulling') this.turn = 0;
    this.stage.rotation.set(this.arena.tiltX, this.turn, this.arena.tiltZ);
    const me = this.mine;
    const armed = this.phase === 'fight' && me.alive && (me.hammer > 0 || me.guard > 0);
    this.aura.visible = armed;
    if (armed) {
      const guard = me.guard > 0;
      (this.aura.material as MeshBasicMaterial).color.setHex(guard ? 0xd9d4ff : 0xffe066);
      (this.aura.material as MeshBasicMaterial).opacity = guard ? 0.55 + 0.3 * Math.sin(this.time * 10) : 0.8;
      this.aura.position.set(me.x, this.arena.height(me.x, me.z) + (guard ? 0.012 : 0.02), me.z);
      this.aura.scale.set(guard ? 1.25 : 0.9, guard ? 4 : 1, guard ? 1.25 : 0.9);
      this.aura.rotation.y += dt * (guard ? 1 : 6);
    }
  }

  /** The rival's launch spot this round (arena-local), at the spawn distance on its far half. */
  private rivalSpot(): [number, number] {
    return [Math.cos(this.rivalAngle) * this.SPAWN, Math.sin(this.rivalAngle) * this.SPAWN];
  }

  /** Player's top this round (alternates so both shapes get played). */
  /** Where the tops start in this arena (on the launch axis). */
  private get SPAWN() {
    return spawnDistance(this.arena.layout);
  }

  /**
   * Picks the next match once (it stays until played): the rival, then its arena, the pinned one
   * or the rotation's (rotation.ts). The first session stays in its first arena.
   */
  private prepareNext() {
    if (this.progress.guide !== 'done') {
      this.nextRival = null;
      return;
    }
    this.nextRival ??= this.pickRival();
    const pin = this.progress.arenaPin;
    let index = pin ? this.arenas.findIndex((a) => a.name === pin) : -1;
    if (pin && index < 0) this.progress.pinArena(null);
    if (index < 0) {
      const open = this.arenas.filter((a) => ARENAS.includes(a) && this.progress.isUnlocked(`arena:${a.name}`)).map((a) => a.name);
      const name = nextArena(open, this.progress.recentArenas, this.progress.playedArenas, this.nextRival.name);
      index = Math.max(0, this.arenas.findIndex((a) => a.name === name));
    }
    this.arenaIndex = index;
    if (import.meta.env.DEV) console.log(`[MATCH] next: ${this.nextRival.name} in ${this.arenas[index].name}${pin ? ' (pinned)' : ''}`);
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
    this.prepareNext();
    this.arena.reset(this.arenas[this.arenaIndex]);
    this.arenaDirty = true;
    this.arenaView.build(this.arena.layout);
    // The next rival's top already waits in the next arena.
    this.setBuilds(this.myBuild, this.nextRival ? { ...this.nextRival.build, color: OPPONENT_COLOR } : this.theirBuild);
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
    this.hub.show(this.myBuild, this.progress, this.order, tomorrow, this.nextRival ? `${this.nextRival.name} in ${this.arenas[this.arenaIndex].name}${this.boutText(this.nextRival.name)}` : null);
    if (import.meta.env.DEV) console.log(`[ORDER] today ${this.order.date}: ${this.order.text} in ${this.order.arena}${this.progress.hasOrder(this.order.date) ? ' (done)' : ''} · ${this.progress.stamps} stamps`);
    this.label.set('');
    // A message still timing out must not wipe the note set below.
    this.labelTimer = 0;
    this.bar.mesh.visible = false;
    // The first session says where to reach next.
    this.label.set(this.guideNote());
    // Notes hang over the far rim; the beacon marks the dock or the anvil. Once the Smith's board
    // hangs there, they move up over it.
    this.label.mesh.position.set(LABEL_AT.x, this.progress.guide === 'done' ? HOME_NOTE_Y : LABEL_AT.y, LABEL_AT.z);
    this.label.mesh.scale.setScalar(1.25);
    if (import.meta.env.DEV) this.hubLogPending = true;
  }

  /** The first session's note at home: where to reach next ('' once the guide is done). */
  private guideNote() {
    const guide = this.progress.guide;
    if (guide === 'launch') return 'Your top waits in its dock\nPut it in the arena to play';
    if (guide === 'bump' || guide === 'match') return 'Finish your first match\nPut your top in the arena';
    if (guide === 'forge' || guide === 'fit') return 'New part: Spur tip!\nPinch the small anvil to forge';
    if (guide === 'rematch') return 'Your top is ready\nPut it in the arena for a rematch';
    return '';
  }

  private updateHub(dt: number) {
    if (this.moveArena()) return;
    if (this.labelTimer > 0 && (this.labelTimer -= dt) <= 0) this.label.set(this.guideNote());
    this.player.head.getWorldPosition(this.p);
    if (import.meta.env.DEV && this.hubLogPending) {
      this.hubLogPending = false;
      console.log(`[HUB] ${this.hub.debugPositions()}`);
    }
    const action = this.hub.update(this.pointers, dt, this.p);
    if (!action) return;
    if (action.kind === 'play') {
      // The first session's rematch is against the same rival.
      const rematch = this.progress.guide === 'rematch';
      if (rematch) this.progress.advance('done');
      this.startMatch(rematch ? this.rival : undefined);
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
    } else if (action.kind === 'comfort') {
      const name = nextComfort();
      applySound();
      this.hub.setComfort(comfortMode(), COMFORT_MODES.length);
      this.label.set(`Comfort: ${name}\nPinch the dial again for the next`);
      this.labelTimer = 3;
      if (import.meta.env.DEV) console.log(`[HUB] comfort ${name}`);
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
      // The session's lessons start over too: the new smith gets every first-time card and replay.
      this.tellTaught = this.holdSaid = this.replayedOnce = this.struckOnce = this.strikeTaught = this.cuppedOnce = false;
      playLevelUp();
      console.log('[HUB] new smith');
      this.toHub();
    } else if (action.kind === 'locked') {
      this.label.set(action.text);
      this.labelTimer = 2;
    }
  }

  private openForge() {
    this.phase = 'forge';
    this.label.set('');
    for (const top of this.tops) top.state = 'out';
    // The forge is the arena transformed: the floor sinks, the anvil and the drawers rise.
    this.bar.mesh.visible = false;
    // The first session's forge visit is about one part: the one just earned.
    const focus = this.progress.guide === 'forge' || this.progress.guide === 'fit' ? 'tip:spur' : null;
    this.progress.advance('fit');
    // The card rides higher in the forge (the stats plate sits on the far rim).
    this.label.mesh.position.set(LABEL_AT.x, LABEL_AT.y + 0.12, LABEL_AT.z);
    const r = this.nextRival;
    let friend = false;
    try {
      // As challenger() decides: a code that decodes, after the first session.
      friend = this.progress.guide === 'done' && !!decodeBuild(sessionStorage.getItem('spinsmith.vs') ?? '');
    } catch {
      // No storage: no challenge waits.
    }
    this.forgeNext = friend ? "Next: a friend's top (challenge code)" : r ? `Next: ${r.name}, ${r.style}, in ${this.arenas[this.arenaIndex].name}` : '';
    this.forge.open(focus);
  }

  /** Back home from the forge; a saved build becomes your top. */
  private leaveForge(build: TopBuild | null) {
    // A quench takes a breath in the forge first: the hiss, the cold wash and steam, then home.
    if (build && !this.quenching) {
      this.quenching = { t: 0, build };
      this.roomLight.quench();
      playQuench();
      return;
    }
    this.quenching = null;
    this.forge.close();
    this.stage.position.y = 0;
    if (build) this.myBuild = { ...build };
    if (build) this.progress.advance('rematch');
    this.toHub();
    // A quenched top is a moment: steam off the rim, and its name.
    if (build) {
      this.stamp.show('FORGED!', buildName(build).toUpperCase(), 'mine', 1.1);
      for (let i = 0; i < 3; i++) this.sparks.burst((Math.random() - 0.5) * 0.08, 0.02, 0.1, 0.8);
      playStamp();
    }
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
      view.team(i === 0 ? TEAM_MINE : TEAM_RIVAL, ringOf(build).radius);
      // A top that lands on the desk scorches it.
      view.onLand = (x, y, z) => this.scorch(x, y, z);
      view.root.name = i === 0 ? 'my-top' : 'their-top';
      this.stage.add(view.root, view.shadowMesh, view.debris);
      if (i === 0) this.myView = view;
      else this.theirView = view;
    }
  }

  /** An opponent: a classic top half the time, otherwise any legal build; either spin. */
  /** A rival for a new match, from the archetypes your level has reached; the same all match. */
  /** Keeps the last 2 s of both tops for a replay. */
  private record() {
    const b = this.replayBuf;
    const o = this.replayAt * 10;
    const m = this.mine;
    const t = this.theirs;
    b[o] = m.x; b[o + 1] = m.z; b[o + 2] = m.angle; b[o + 3] = m.wobble; b[o + 4] = m.damage;
    b[o + 5] = t.x; b[o + 6] = t.z; b[o + 7] = t.angle; b[o + 8] = t.wobble; b[o + 9] = t.damage;
    this.replayAt = (this.replayAt + 1) % REPLAY_STEPS;
    this.replayCount = Math.min(REPLAY_STEPS, this.replayCount + 1);
  }

  /** A knockout your move caused plays again on the table, slowly (a pinch skips it). */
  private startReplay() {
    const n = this.replayCount;
    if (n < 30) return;
    const frames = new Float32Array(n * 10);
    for (let i = 0; i < n; i++) {
      const src = ((this.replayAt - n + i + REPLAY_STEPS) % REPLAY_STEPS) * 10;
      frames.set(this.replayBuf.subarray(src, src + 10), i * 10);
    }
    this.ghosts[0].spec = this.mine.spec;
    this.ghosts[1].spec = this.theirs.spec;
    this.ghosts[0].hand = this.mine.hand;
    this.ghosts[1].hand = this.theirs.hand;
    // Starts after the slow-motion moment; the result card waits for it.
    this.replay = { t: -SLOW_MO_TIME - 0.4, frames, n, out: [this.mine, this.theirs] };
    this.resultTimer = Math.max(this.resultTimer, RESULT_TIME + n / 120 / REPLAY_SPEED + 1.3);
    this.replayCount = 0;
  }

  private playReplay(dt: number) {
    const r = this.replay!;
    const was = r.t;
    r.t += dt;
    // A pinch skips it, even before it starts (its plate goes with it).
    if (this.hands.left.justPinched || this.hands.right.justPinched) {
      this.replay = null;
      // Only the REPLAY plate goes (not the finish stamp before it, nor rewards queued behind).
      if (was >= 0) this.stamp.cut();
      // The result card does not wait out the skipped replay.
      this.resultTimer = Math.min(this.resultTimer, 1.5);
      return;
    }
    if (r.t < 0) {
      // Not yet: the real tops are still showing the finish.
      this.ghosts[0].state = this.mine.state;
      Object.assign(this.ghosts[0], { x: this.mine.x, z: this.mine.z, angle: this.mine.angle, finish: this.mine.finish });
      Object.assign(this.ghosts[1], { x: this.theirs.x, z: this.theirs.z, angle: this.theirs.angle, finish: this.theirs.finish });
      this.ghosts[1].state = this.theirs.state;
      return;
    }
    // The REPLAY plate stays up for the whole replay (rewards queue behind it).
    if (was < 0) this.stamp.show('REPLAY', 'pinch to skip', 'neutral', r.n / 120 / REPLAY_SPEED);
    const i = Math.floor(r.t * 120 * REPLAY_SPEED);
    if (i >= r.n + 100) {
      // The end: the real tops (out as they went) are drawn again.
      this.replay = null;
      return;
    }
    if (i >= r.n) {
      // The knockout again: the stand-ins go out as the real tops did (sinking, flying, shattering).
      this.ghosts.forEach((g, k) => {
        const real = r.out[k];
        if (g.state !== real.state) Object.assign(g, { state: real.state, finish: real.finish, vx: real.vx, vz: real.vz });
      });
      return;
    }
    const f = r.frames;
    this.ghosts.forEach((g, k) => {
      const o = i * 10 + k * 5;
      g.state = 'spinning';
      g.finish = null;
      g.x = f[o];
      g.z = f[o + 1];
      g.angle = f[o + 2];
      g.wobble = f[o + 3];
      g.damage = f[o + 4];
      g.spin = 1;
    });
  }

  /**
   * The rival's entrance: a cyan portal opens in the dark behind the far rim (0.4 s), the rival's top
   * flies out of it in an arc trailing embers (0.9 s), slams down on its spot with a ring of sparks
   * and the VS stamp, and the portal closes. The fight waits for nothing: pinching starts as usual.
   */
  private updateEntrance(dt: number) {
    const e = this.entrance;
    const show = !!e && (this.phase === 'ready' || this.phase === 'pulling');
    this.portal.visible = this.portalCore.visible = show;
    if (!e || !show) {
      if (e) this.theirView.root.scale.setScalar(1);
      this.entrance = null;
      return;
    }
    e.t += dt;
    // The card and the match bar wait for the landing, so nothing stands in front of the portal.
    const landed = e.t >= 1.3;
    this.label.mesh.visible = landed && !!this.label.current;
    this.bar.mesh.visible = landed;
    // On a real wall behind the arena when there is one; else in the dark beyond the far rim.
    if (e.t === 0 || !e.from) e.from = this.portalWall(new Vector3()) ?? new Vector3(0, 0.1, -(maxRim(this.arena.layout) + 0.3));
    const far = e.from.z;
    const open = Math.min(1, e.t / 0.4) * (e.t > 1.6 ? Math.max(0, 1 - (e.t - 1.6) / 0.4) : 1);
    // Off to the far right, clear of the card and the match bar over the far rim.
    const px = e.from.x;
    const py = e.from.y;
    this.portal.position.set(px, py, far);
    this.portalCore.position.set(px, py, far - 0.001);
    // Facing the arena (a wall portal stands on the wall).
    this.portal.lookAt(this.handAt.set(0, py, 0));
    this.portalCore.quaternion.copy(this.portal.quaternion);
    // Bigger the farther it is, so a portal on the wall reads from the chair.
    const size = 0.09 * Math.max(1, Math.hypot(px, far) / 0.4);
    this.portal.scale.setScalar(0.001 + size * open);
    this.portalCore.scale.setScalar(0.001 + size * open);
    (this.portal.material as MeshBasicMaterial).opacity = 0.6 + 0.4 * Math.sin(e.t * 20) * 0.5;
    const them = this.theirs;
    const u = (e.t - 0.4) / 0.9;
    const view = this.theirView.root;
    if (u < 0) {
      view.visible = false;
      this.theirView.shadowMesh.visible = false;
    }
    else if (u < 1) {
      // From the portal to its spot: a high arc.
      const y = this.arena.height(them.x, them.z);
      view.visible = true;
      view.position.set(px + (them.x - px) * u, py + (y - py) * u + 0.12 * Math.sin(u * Math.PI), far + (them.z - far) * u);
      view.rotation.set(0.6 * (1 - u), 0, 0);
      // A circuit's champion comes through huge, and shrinks to fight size as it lands.
      view.scale.setScalar(e.champion ? 1 + 1.5 * (1 - u) * (1 - u) : 1);
      this.theirView.shadowMesh.visible = false;
      if (Math.floor(e.t * 30) !== Math.floor((e.t - dt) * 30)) this.sparks.burst(view.position.x, view.position.y - 0.01, view.position.z, 0.1);
    } else if (u - dt / 0.9 < 1) {
      // Touchdown.
      view.scale.setScalar(1);
      this.sparks.burst(them.x, this.arena.height(them.x, them.z), them.z, 1);
      this.impacts.hit(them.x, this.arena.height(them.x, them.z), them.z, 1);
      playLand('table', them.x, 1);
      duck(0.4, 0.3);
      this.stamp.show(e.vs, e.sub, 'rival', 1.6);
    }
    if (e.t > 2.1) {
      this.theirView.root.scale.setScalar(1);
      this.entrance = null;
    }
  }

  /**
   * A ring at each pinch point, facing you: it closes as thumb and index come together and turns
   * orange the moment they count as a pinch, so the hands always show what the game sees.
   */
  private updatePinchRings() {
    this.player.head.getWorldPosition(this.head);
    (['left', 'right'] as const).forEach((side, i) => {
      const m = this.pinchRings[i];
      const h = this.hands[side];
      m.visible = h.tracked && h.gap < 0.07 && this.phase !== 'placing';
      if (!m.visible) return;
      m.position.copy(h.pinch);
      m.lookAt(this.head);
      const r = h.pinching ? 0.007 : 0.007 + 0.25 * Math.max(0, h.gap - TUNE.pinchOn);
      m.scale.setScalar(r);
      const mat = m.material as MeshBasicMaterial;
      mat.color.setHex(h.pinching ? 0xff8a2a : 0xffffff);
      mat.opacity = h.pinching ? 0.95 : 0.35 + 0.5 * Math.max(0, 1 - (h.gap - TUNE.pinchOn) / 0.05);
    });
  }

  /**
   * Your hands in the arena's light: over the arena each casts a soft shadow on the floor (darker and
   * tighter as it comes down); with the strike ready, the palm glows orange on the floor instead.
   */
  private updateHandMarks() {
    const play = this.phase === 'ready' || this.phase === 'pulling' || this.phase === 'fight';
    const hot = this.phase === 'fight' && this.forgeBar.full && this.taught('strike');
    (['left', 'right'] as const).forEach((side, i) => {
      const m = this.handMarks[i];
      const h = this.hands[side];
      m.visible = false;
      if (!play || !h.tracked) return;
      // Between the wrist and the fingertip (toLocal reuses one vector, so copy first).
      const w = this.handAt.copy(this.toLocal(h.wrist));
      const l = w.lerp(this.toLocal(h.index), 0.5);
      const n = normRadius(this.arena.layout, l.x, l.z);
      if (n > 1.15) return;
      const floor = this.arena.height(l.x, l.z);
      const up = l.y - floor;
      if (up < 0 || up > 0.12) return;
      m.visible = true;
      // Light from above and behind you: the shadow falls a little ahead of the hand.
      m.position.set(l.x, floor + 0.0015, l.z - up * 0.5);
      const k = 1 - up / 0.12;
      m.scale.setScalar(0.05 + 0.04 * (1 - k));
      const mat = m.material as MeshBasicMaterial;
      if (hot) {
        mat.color.setHex(0xff8a2a);
        mat.blending = AdditiveBlending;
        mat.opacity = 0.5 + 0.5 * k;
      } else {
        mat.color.setHex(0x000000);
        mat.blending = NormalBlending;
        mat.opacity = 0.45 * k;
      }
    });
  }

  /** A scorch where a thrown top hit the desk: ember-bright, cooling to a faint mark for the match. */
  private scorch(x: number, y: number, z: number) {
    const m = this.scorches[this.nextScorch];
    this.nextScorch = (this.nextScorch + 1) % this.scorches.length;
    m.position.set(x, y + 0.0012, z);
    m.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI);
    m.userData.t = 0;
    m.visible = true;
  }

  /**
   * Your top, thrown out and resting on the desk, can be picked up: a pinch on it takes it back
   * (it goes from the desk; the next round starts it in the arena as always).
   */
  private pickOffDesk() {
    const at = this.myView.restingAt;
    if (!at || this.myView.picked) return;
    this.stage.localToWorld(this.handAt.copy(at));
    for (const side of ['left', 'right'] as const) {
      const h = this.hands[side];
      if (!h.justPinched || h.pinch.distanceTo(this.handAt) > 0.07) continue;
      this.myView.picked = true;
      playPick();
      this.stamp.show('BACK IN HAND', '', 'mine', 0.4);
      return;
    }
  }

  /**
   * A molten handprint where the palm hit the desk: white-hot, cooling through orange to a dark
   * scorch that stays until the match ends (three at most).
   */
  private printPalm(x: number, z: number, angle: number) {
    const m = this.palmPrints[this.nextPrint];
    this.nextPrint = (this.nextPrint + 1) % this.palmPrints.length;
    m.position.set(x, -PEDESTAL / ARENA_SCALE + 0.0015, z);
    // Fingers pointing away from the player's side of the arena, roughly as a palm lands.
    m.rotation.set(-Math.PI / 2, 0, angle + Math.PI / 2);
    m.userData.t = 0;
    m.visible = true;
  }

  private updatePrints(dt: number) {
    if (this.phase === 'result') this.pickOffDesk();
    for (const m of this.scorches) {
      if (!m.visible) continue;
      const t = (m.userData.t += dt);
      const mat = m.material as MeshBasicMaterial;
      mat.opacity = t < 1.5 ? 1 - t * 0.4 : 0.35;
      mat.color.setRGB(1, Math.max(0.15, 0.5 - t * 0.2), 0.05);
    }
    for (const m of this.palmPrints) {
      if (!m.visible) continue;
      const t = (m.userData.t += dt);
      const mat = m.material as MeshBasicMaterial;
      // White-hot (0 s), orange (1 s), dull red (3 s), then a dark scorch on the wood.
      if (t < 3) {
        const k = t / 3;
        mat.blending = AdditiveBlending;
        mat.color.setRGB(1, Math.max(0.12, 0.95 - k * 0.85), Math.max(0.02, 0.8 - k * 1.6));
        mat.opacity = 1;
      } else {
        mat.blending = NormalBlending;
        mat.color.setHex(0x1a0f0a);
        mat.opacity = Math.min(0.6, (t - 3) * 0.6);
      }
    }
  }

  /**
   * A frame-rate guard: if the headset averages under 62 fps for 3 s, the game lightens itself
   * once (stronger foveation, no room dimming shell, which covers the whole view), and says so in
   * the log. Hands, the fight and the visuals that matter stay.
   */
  private guardFrameRate(dt: number) {
    // Not in the emulator (a desktop browser's frame rate says nothing about the headset).
    if (this.lite || dt <= 0 || dt > 0.25 || 'IWER_DEVICE' in window) return;
    this.fpsAvg += (dt - this.fpsAvg) * 0.02;
    this.slowFor = this.fpsAvg > 1 / 62 ? this.slowFor + dt : 0;
    if (this.slowFor < 3) return;
    this.lite = true;
    this.world.renderer.xr.setFoveation?.(1);
    console.warn(`[PERF] averaging ${(1 / this.fpsAvg).toFixed(0)} fps: lighter rendering (foveation 1, no room dimming)`);
  }

  /** A puff of steam off the forge's quench slot (pale sparks rising). */
  private steam() {
    const q = this.forge.quenchSpot(this.handAt);
    this.stage.worldToLocal(q);
    this.sparks.burst(q.x + (Math.random() - 0.5) * 0.02, q.y, q.z + (Math.random() - 0.5) * 0.02, 0.25);
  }

  /**
   * Why an OUTLAST went the way it did, from what is already known: the tips' endurance (when it
   * differs enough), else a weak rip, else the clashes.
   */
  private outlastReason(won: boolean): string {
    // Endurance stats only span about 20-33 across all builds, so a 5-point gap is a real edge. It
    // is named by the part that makes it: the ring when the rings' drain differs, else the tip.
    const mine = statsOf(this.mine.spec).stamina;
    const theirs = statsOf(this.theirs.spec).stamina;
    const myRing = RINGS.find((r) => r.id === this.myBuild.ring);
    const theirRing = RINGS.find((r) => r.id === this.theirBuild.ring);
    const byRing = !!myRing && !!theirRing && myRing.drain !== theirRing.drain;
    const part = (b: TopBuild, ring: (typeof RINGS)[number] | undefined) => (byRing ? `${ring?.name ?? ''} ring` : `${TIPS.find((t) => t.id === b.tip)?.name ?? ''} tip`);
    if (won && mine - theirs >= 5) return `Your ${part(this.myBuild, myRing)} outspun its ${part(this.theirBuild, theirRing)}`;
    if (!won && theirs - mine >= 5) return `Its ${part(this.theirBuild, theirRing)} spins longer than your ${part(this.myBuild, myRing)}`;
    if (!won && this.lastRip < 0.6) return `Weak rip: ${Math.round(this.lastRip * 100)}%`;
    return won ? 'Your spin lasted through the clashes' : 'Your spin ran out in the clashes';
  }

  /** The match in two lines: the result and score, then each round's finish, the best rip and the XP. */
  private matchReport() {
    const m = this.matchLog;
    // Each round: who took it and how ("you SLAG", "they OUTLAST").
    const rounds = m.rounds.map((r) => (r.startsWith('-') ? `they ${r.slice(1)}` : `you ${r}`)).join(' · ');
    // After a loss the report keeps the rival's tip: something to forge or try next.
    if (!m.won) return `Lost ${m.score} vs ${this.rival.name}\nTry: ${this.rival.tip}`;
    return `Won ${m.score} vs ${this.rival.name}\n${rounds} · best rip ${Math.round(m.rip * 100)}% · +${m.xp} XP`;
  }

  /** A feat earned for the first time: stamped after what shows now. */
  private featDone(id: string) {
    if (this.demo || !this.progress.feat(id)) return;
    this.stamp.later('FEAT!', FEATS[id], 'mine', 1.3);
    playStamp();
    if (import.meta.env.DEV) console.log(`[FEAT] ${id}`);
  }

  /** ' · Cinder Circuit champion' or ' · Cinder Circuit 2/3' for a rival not beaten yet; '' otherwise. */
  private boutText(name: string) {
    const c = circuitOf(name);
    if (!c || this.progress.marksOf(name) & MARK.beaten) return '';
    return ` · ${c.circuit} ${c.champion ? 'champion' : `${c.bout}/${c.of}`}`;
  }

  /** A friend's top from a challenge code (?vs=CODE), as a rival for one match; null when none waits. */
  private challenger(): Rival | null {
    let code = '';
    try {
      code = sessionStorage.getItem('spinsmith.vs') ?? '';
      sessionStorage.removeItem('spinsmith.vs');
    } catch {
      return null;
    }
    const build = code ? decodeBuild(code) : null;
    if (!build) return null;
    return { name: 'Challenger', move: 'charge', style: 'a friend\'s top', title: `code ${code.toUpperCase()}`, intro: 'Your friend forged me. Beat me.', win: 'Tell them I won.', lose: 'Tell them you won.', tip: 'Read its parts in the intro: a heavy ring holds, a light one hits', build: { ...build, color: OPPONENT_COLOR }, level: 1 };
  }

  private pickRival(): Rival {
    const pool = RIVALS.filter((r) => r.level <= this.progress.level);
    // The ladder: the next rival in the circuits you can face and have not beaten.
    for (const c of CIRCUITS)
      for (const name of c.rivals) {
        const r = pool.find((x) => x.name === name);
        if (r && !(this.progress.marksOf(name) & MARK.beaten)) return r;
      }
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
    // Off while the hand driver (src/dev-drive.ts) steers the hands: it pinches where it means to.
    g.tracked = !this.gazeOff;
    g.pinch.set(0, -100, 0);
    const was = g.pinching;
    g.pinching = this.hands.left.pinching || this.hands.right.pinching;
    g.justPinched = g.pinching && !was;
    g.justReleased = !g.pinching && was;
  }

  /** Where a hand points at the arena (near pinch first, else its ray), including just past the rim. */
  private arenaPoint(h: HandState): { x: number; z: number } | null {
    // A shrunk arena: what the hand touches, in the arena's true units.
    const k = this.viewK;
    const l = this.toLocal(h.pinch).divideScalar(k);
    const L = this.arena.layout;
    if (normRadius(L, l.x, l.z) < 1.3 && Math.abs(l.y - this.arena.floorHeight(Math.min(1, normRadius(L, l.x, l.z)))) < 0.04) return { x: l.x, z: l.z };
    if (!h.hasRay) return null;
    const o = this.root.worldToLocal(this.rayLocalO.copy(h.rayOrigin)).divideScalar(k);
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
    // A friend's challenge goes first (after the first session).
    const friend = !rival && this.progress.guide === 'done' ? this.challenger() : null;
    this.rival = rival ?? friend ?? this.nextRival ?? this.pickRival();
    this.nextRival = null;
    this.progress.playedArena(this.arena.layout.name);
    this.perfectInMatch = false;
    this.myPoints = 0;
    this.theirPoints = 0;
    this.wasDown = false;
    this.introDone = false;
    this.matchLog = { rounds: [], rip: 0, xp: 0, won: false, score: '' };
    for (const m of [...this.palmPrints, ...this.scorches]) m.visible = false;
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

  /**
   * Placing with hands in view: a print glows where the arena will stand (on the table, else at a
   * guessed desk height); a palm pressed on the table there raises it at the hand's true height,
   * a pinch on the print places it at once. True once placed.
   */
  private updatePress(dt: number): boolean {
    this.player.head.getWorldDirection(this.fwd).negate();
    const table = pickTable(this.head, this.tables());
    const at = placeArena(this.head, this.fwd.x, this.fwd.z, this.tables(), TUNE.reach);
    const y = at.y - PEDESTAL;
    this.print.visible = true;
    this.print.position.set(at.x, y + 0.002, at.z);
    this.print.rotation.y = at.yaw;
    this.print.scale.setScalar(1 + 0.06 * Math.sin(this.time * 5));
    const left = Math.max(0, 1 - this.settle / PRESS_WAIT);
    this.printWait.geometry.setDrawRange(0, Math.ceil(left * 64) * 6);
    // With a known table, a press counts within 4 cm of it; without, anywhere a desk could be.
    const lo = table !== null ? table - 0.04 : TABLE_MIN_H;
    const hi = table !== null ? table + 0.04 : Math.min(TABLE_MAX_H, this.head.y - 0.25);
    if (import.meta.env.DEV && Math.floor(this.settle) !== Math.floor(this.settle - dt)) console.log(`[PRESS] band ${lo.toFixed(3)}..${hi.toFixed(3)} print ${at.x.toFixed(2)},${y.toFixed(3)},${at.z.toFixed(2)} low ${this.hands.right.low.toFixed(3)} at ${this.hands.right.index.x.toFixed(2)},${this.hands.right.index.z.toFixed(2)}`);
    for (const side of ['left', 'right'] as const) {
      const h = this.hands[side];
      if (h.justPinched && Math.hypot(h.pinch.x - at.x, h.pinch.z - at.z) < 0.1) {
        console.log('[MATCH] placed by a pinch on the print');
        this.place();
        return true;
      }
      const hit = this.touches[side].update(h.tracked ? h.low : null, dt, lo, hi);
      if (hit === null) continue;
      this.placeRoot();
      // Toward the hand a little, standing on the height the palm found.
      const p = this.root.position;
      const dx = h.index.x - p.x;
      const dz = h.index.z - p.z;
      const k = Math.min(1, PRESS_PULL / (Math.hypot(dx, dz) || 1));
      p.set(p.x + dx * k, hit + PEDESTAL, p.z + dz * k);
      const table2 = this.tableShape();
      if (table2) {
        const fit = fitToTable(p, table2.poly, this.arena.radius * ARENA_SCALE + 0.03);
        p.x = fit.x;
        p.z = fit.z;
      }
      this.root.rotation.y = Math.atan2(this.head.x - p.x, this.head.z - p.z);
      this.onTable = true;
      this.setRoom();
      playPlace();
      for (let i = 0; i < 3; i++) this.sparks.burst((Math.random() - 0.5) * 0.1, 0.02, (Math.random() - 0.5) * 0.1, 1);
      console.log(`[MATCH] forged by press at y=${hit.toFixed(3)}${table !== null ? ` (table plane ${table.toFixed(3)})` : ''}`);
      this.toHub();
      return true;
    }
    return false;
  }

  /** The first placement: the arena in front, then home. */
  private place() {
    this.placeRoot();
    this.toHub();

    if (!this.onTable) {
      // No table found (or none labelled one): say so once the title is gone, then the first
      // session's note returns.
      const notice = () => {
        this.label.set('No table found: the arena floats here\nMove it by its brass handle');
        this.labelTimer = 5;
      };
      if (this.title.visible) this.afterTitle = notice;
      else notice();
    }
  }

  /**
   * A big arena opens out to full size and slides back for a match, so its near rim stays where a
   * small one's is; at home, in the forge and the workshop it shows shrunk to home size. The round
   * card, the match bar, the menu and the light pool follow its rim.
   */
  private updateSize(dt: number) {
    const L = this.arena.layout;
    const p = this.phase;
    const match = p === 'ready' || p === 'pulling' || p === 'fight' || p === 'result';
    const rim = maxRim(L);
    // Worked out once per arena, size and placement (no per-frame allocation).
    if (match) {
      if (L !== this.fitLayout || L.radius !== this.fitRadius || this.placedAt !== this.fitPlaced) {
        this.fitLayout = L;
        this.fitRadius = L.radius;
        this.fitPlaced = this.placedAt;
        this.fitMatch(L, rim);
      }
    } else this.fitLayout = null;
    // While the workshop resizes, the shown size holds still so the rim follows the hand.
    const k = match ? 1 : this.builder.resizing ? this.viewK : Math.min(1, (p === 'build' ? WORKSHOP_RIM : DISPLAY_RIM) / rim);
    const scale = match ? this.matchScale : 1;
    const push = match ? this.matchPush : 0;
    const e = Math.min(1, dt * 3);
    const ease = (v: number, to: number, eps: number) => (Math.abs(to - v) < eps ? to : v + (to - v) * e);
    const was = this.sizeSettled;
    this.viewK = ease(this.viewK, k, 1e-4);
    this.rootK = ease(this.rootK, scale, 1e-4);
    const next = ease(this.pushed, push, 1e-4);
    if (next !== this.pushed) {
      // Away from the player: the arena's local -Z.
      const d = next - this.pushed;
      const yaw = this.root.rotation.y;
      this.root.position.x -= Math.sin(yaw) * d;
      this.root.position.z -= Math.cos(yaw) * d;
      this.pushed = next;
      if (next === push) this.setRoom();
    }
    this.sizeSettled = this.viewK === k && this.rootK === scale && this.pushed === push;
    // The arena opening out for a match is a moment: a machine sound as it moves, a thud as it lands.
    if (was && !this.sizeSettled) playMachine();
    else if (!was && this.sizeSettled && match) playPlace();
    // A placed arena forges up out of the table: it grows from a glowing point with a little overshoot.
    const rising = this.rise < 1;
    this.rise = Math.min(1, this.rise + dt / RISE_TIME);
    if (rising && this.rise >= 1) playPlace();
    const u = this.rise - 1;
    const up = 1 + 2.2 * u * u * u + 1.2 * u * u;
    this.root.scale.setScalar(ARENA_SCALE * this.rootK * Math.max(0.001, up));
    this.updateTitle(dt);
    // A shrunk arena's pedestal is shorter: lower it so it still stands on the table.
    const drop = PEDESTAL * (1 - this.rootK);
    this.root.position.y -= drop - this.lowered;
    this.lowered = drop;
    this.stage.scale.setScalar(this.viewK);
    this.builder.viewScale = this.viewK;
    const far = rimRadius(L, -Math.PI / 2) * this.viewK;
    // In the forge the card stands back behind the stats plate.
    this.label.mesh.position.z = Math.min(LABEL_AT.z - (p === 'forge' ? 0.03 : 0), -(far + 0.04));
    // Further away, the card and the bar grow so they read the same.
    const reach = TUNE.reach / ARENA_SCALE;
    const grow = Math.max(1, (reach + this.pushed / ARENA_SCALE + far) / (reach + 0.17));
    this.label.mesh.scale.setScalar(1.25 * grow);
    this.bar.mesh.scale.setScalar(0.21 * grow);
    // The bar's top edge under the card's lower edge (it leans back, the card stands upright).
    this.bar.mesh.position.z = this.label.mesh.position.z + BAR_BACK * grow;
    // Their heights grow with them, so the card stays clear above the bar.
    // A wall higher than the standard one lifts them clear of it.
    const lift = Math.max(0, WALL_HEIGHT[L.wall] - WALL_HEIGHT.standard);
    this.bar.mesh.position.y = (BAR_Y + lift) * grow;
    if (this.phase === 'ready' || this.phase === 'fight' || this.phase === 'result') this.label.mesh.position.y = (LABEL_AT.y + lift) * grow;
    // The result's stamp stands in the card's slot above the bar, leaving the arena and the winner in view.
    // In a bout every stamp stands in the card's slot above the bar, never over the tops in play.
    if (this.phase === 'ready' || this.phase === 'fight' || this.phase === 'result') this.stamp.mesh.position.set(this.label.mesh.position.x, this.label.mesh.position.y, this.label.mesh.position.z + 0.01);
    else this.stamp.mesh.position.set(0, 0.045, 0.03);
    // The menu stays where the hand finds it, however far the arena slid.
    this.menuButton.mesh.position.set(-0.2, MENU_Y, 0.14 + this.pushed / (ARENA_SCALE * this.rootK));
    this.roomLight.setPool(rim * this.viewK * this.rootK * ARENA_SCALE);
  }

  /**
   * How a match arena fits: full size, slid back so its near rim stays at NEAR_RIM; on a known
   * table, shrunk in steps (to 70% at most) until it stays on the wood.
   */
  private fitMatch(L: ArenaLayout, rim: number) {
    const yaw = this.root.rotation.y;
    const bx = this.root.position.x + Math.sin(yaw) * this.pushed;
    const bz = this.root.position.z + Math.cos(yaw) * this.pushed;
    const near = rimRadius(L, Math.PI / 2);
    const table = this.onTable ? this.tableShape() : null;
    for (let k = 1; ; k -= 0.05) {
      this.matchScale = k;
      this.matchPush = Math.max(0, near * k - NEAR_RIM) * ARENA_SCALE;
      if (!table || k <= 0.7) break;
      const cx = bx - Math.sin(yaw) * this.matchPush;
      const cz = bz - Math.cos(yaw) * this.matchPush;
      if (insidePoly(table.poly, cx, cz) && edgeDistance(table.poly, cx, cz) >= rim * k * ARENA_SCALE + RIM_MARGIN) break;
    }
    if (import.meta.env.DEV) console.log(`[MATCH] fit ${L.name}: scale ${this.matchScale.toFixed(2)}, slide ${this.matchPush.toFixed(3)} m${table ? '' : ' (no table)'}`);
  }

  /** Puts the arena a comfortable reach ahead, on a table if there is one, facing the head. */
  private placeRoot() {
    const head = this.player.head;
    head.getWorldPosition(this.head);
    head.getWorldDirection(this.fwd);
    // getWorldDirection returns +Z of the object; the camera looks down -Z.
    this.fwd.negate();
    const at = placeArena(this.head, this.fwd.x, this.fwd.z, this.tables(), TUNE.reach);
    // On a table, its rim stays on the wood: moved in from the edge if it would hang over.
    if (at.onTable) {
      const table = this.tableShape();
      if (table) {
        const fit = fitToTable(at, table.poly, this.arena.radius * ARENA_SCALE + 0.03);
        at.x = fit.x;
        at.z = fit.z;
        at.yaw = Math.atan2(this.head.x - at.x, this.head.z - at.z);
      }
    }
    this.root.position.set(at.x, at.y, at.z);
    this.rise = 0;
    playMachine();
    // Once a session the name stands over the far rim as the arena rises.
    if (!this.titleShown) {
      this.titleShown = true;
      this.titleT = 0;
      this.title.visible = true;
      playLevelUp();
    }
    this.pushed = 0;
    this.lowered = 0;
    this.root.scale.setScalar(ARENA_SCALE);
    // Local +Z points back at the player.
    this.root.rotation.set(0, at.yaw, 0);
    this.root.visible = true;
    this.onTable = at.onTable;
    this.tableY = null;
    this.placedAt = this.time;
    this.setRoom();
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
    this.handle.position.set(0, -0.026, 0.245);
    this.handle.visible = false;
  }

  /** The usable table's outline nearest the head (world x/z) and its height, or null. */
  private tableShape(): { y: number; poly: XZ[] } | null {
    this.player.head.getWorldPosition(this.head);
    const y = pickTable(this.head, this.tables());
    if (y === null) return null;
    let best: { y: number; poly: XZ[] } | null = null;
    let bestD = Infinity;
    for (const e of this.queries.planes.entities) {
      const plane = e.getValue(XRPlane, '_plane') as RawPlane | undefined;
      if (plane?.orientation !== 'horizontal' || !/table|desk/.test(plane.semanticLabel ?? '') || !plane.polygon?.length) continue;
      const o = e.object3D!;
      o.updateWorldMatrix(true, false);
      const c = o.getWorldPosition(this.local);
      if (Math.abs(c.y - y) > 1e-3) continue;
      const d = Math.hypot(c.x - this.head.x, c.z - this.head.z);
      if (d >= bestD) continue;
      bestD = d;
      // The polygon is in the plane's own space; its world outline is what the arena sits inside.
      const poly = plane.polygon.map((p) => {
        const w = this.p.set(p.x, p.y, p.z).applyMatrix4(o.matrixWorld);
        return { x: w.x, z: w.z };
      });
      best = { y, poly };
    }
    return best;
  }

  /** The lowest horizontal plane labelled floor, else the floor of the local-floor space (0). */
  private floorY(): number {
    let y = 0;
    let found = false;
    for (const e of this.queries.planes.entities) {
      const plane = e.getValue(XRPlane, '_plane') as RawPlane | undefined;
      if (plane?.orientation !== 'horizontal' || !/floor/.test(plane.semanticLabel ?? '')) continue;
      const py = e.object3D!.getWorldPosition(this.local).y;
      if (!found || py < y) y = py;
      found = true;
    }
    return y;
  }

  /**
   * Tells the views where the real table and floor are (arena-local), and fits the depth-only
   * table that hides anything falling behind or below the real desk.
   */
  private setRoom() {
    const table = this.onTable ? this.tableShape() : null;
    if (!table) {
      ROOM.poly = null;
      ROOM.floor = null;
      this.tableMask.visible = false;
      return;
    }
    this.root.updateWorldMatrix(true, false);
    ROOM.poly = table.poly.map((p) => {
      const l = this.root.worldToLocal(this.p.set(p.x, table.y, p.z));
      return { x: l.x, z: l.z };
    });
    ROOM.floor = this.root.worldToLocal(this.p.set(this.root.position.x, this.floorY(), this.root.position.z)).y;
    // The mask: the table top 2 mm below the surface plus a 5 cm skirt down its edges.
    const top = new Shape(table.poly.map((p) => new Vector2(p.x, p.z)));
    const pos: number[] = [];
    const n = table.poly.length;
    for (let i = 0; i < n; i++) {
      const a = table.poly[i];
      const b = table.poly[(i + 1) % n];
      const y0 = table.y - 0.002;
      const y1 = table.y - 0.05;
      pos.push(a.x, y0, a.z, b.x, y0, b.z, b.x, y1, b.z, a.x, y0, a.z, b.x, y1, b.z, a.x, y1, a.z);
    }
    const skirt = new BufferGeometry();
    skirt.setAttribute('position', new Float32BufferAttribute(pos, 3));
    skirt.computeVertexNormals();
    const plate = new ShapeGeometry(top).rotateX(Math.PI / 2).translate(0, table.y - 0.002, 0);
    const old = this.tableMask.children as Mesh[];
    for (const m of [...old]) {
      m.geometry.dispose();
      m.removeFromParent();
    }
    for (const g of [plate, skirt]) {
      const m = new Mesh(g, TABLE_MASK);
      m.renderOrder = -10;
      m.frustumCulled = false;
      this.tableMask.add(m);
    }
    this.tableMask.visible = true;
    console.log(`[MATCH] table polygon n=${n} at ${table.y.toFixed(2)}, floor ${this.floorY().toFixed(2)}`);
  }

  /** Centers of the detected horizontal table and desk planes (world). */
  /** The title fades in over the far rim, holds, then rises away (about 3.5 s). */
  private updateTitle(dt: number) {
    if (!this.title.visible) return;
    this.titleT += dt;
    const t = this.titleT;
    const m = this.title.material as MeshBasicMaterial;
    m.opacity = Math.min(1, Math.max(0, (t - 0.6) / 0.4)) * Math.min(1, Math.max(0, (3.6 - t) / 0.6));
    this.title.position.set(0, 0.27 + Math.max(0, t - 3) * 0.05, -0.22);
    if (t > 3.6) {
      this.title.visible = false;
      this.afterTitle?.();
      this.afterTitle = null;
    }
  }

  private warnedPlane = false;
  private tables(): Point[] {
    const out: Point[] = [];
    for (const e of this.queries.planes.entities) {
      const plane = e.getValue(XRPlane, '_plane') as RawPlane | undefined;
      // ponytail: '_plane' is IWSDK-internal (pinned 1.0.1); an update that renames it shows up here.
      if (!plane && !this.warnedPlane) {
        this.warnedPlane = true;
        console.warn('[MATCH] XRPlane has no _plane: table detection is off (IWSDK changed?)');
      }
      if (plane?.orientation !== 'horizontal' || !/table|desk/.test(plane.semanticLabel ?? '')) continue;
      const p = e.object3D!.getWorldPosition(new Vector3());
      out.push({ x: p.x, y: p.y, z: p.z });
    }
    return out;
  }

  /**
   * The wall the rival's portal should open on: a detected vertical plane labelled a wall, behind
   * the arena as seen from the head and within 3.5 m, as a point in the stage's space (or null).
   */
  private portalWall(out: Vector3): Vector3 | null {
    const center = this.root.position;
    this.player.head.getWorldPosition(this.head);
    const awayX = center.x - this.head.x;
    const awayZ = center.z - this.head.z;
    const len = Math.hypot(awayX, awayZ) || 1;
    let best = Infinity;
    let found = false;
    for (const e of this.queries.planes.entities) {
      const plane = e.getValue(XRPlane, '_plane') as RawPlane | undefined;
      if (plane?.orientation !== 'vertical' || !/wall/.test(plane.semanticLabel ?? '')) continue;
      const p = e.object3D!.getWorldPosition(this.handAt);
      const dx = p.x - center.x;
      const dz = p.z - center.z;
      const ahead = (dx * awayX + dz * awayZ) / len;
      const dist = Math.hypot(dx, dz);
      // Behind the arena, not off to the side.
      if (ahead < 0.3 || dist > 3.5 || ahead < dist * 0.6) continue;
      if (dist < best) {
        best = dist;
        // On the wall, at the arena's height plus a little, along the line from the arena.
        out.set(center.x + (awayX / len) * ahead, center.y + 0.3, center.z + (awayZ / len) * ahead);
        found = true;
      }
    }
    return found ? this.stage.worldToLocal(out) : null;
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
        this.setRoom();
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
    // Not while a big arena eases back home (the slide would be left in its position).
    if (!d && this.pushed > 1e-4) return false;
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
    this.setRoom();
    playPlace();
    console.log(`[MATCH] arena moved to ${[p.x, p.y, p.z].map((v) => v.toFixed(2)).join(',')}`);
    if (import.meta.env.DEV) this.hubLogPending = true;
    return true;
  }

  private toReady() {
    this.trails.clear();
    if (this.phase === 'placing') return;
    this.readySince = this.time;
    this.matchOver = false;
    this.phase = 'ready';
    // A pull cut short (a recenter) leaves no drone and no lit ring.
    this.cordTone.update(null);
    this.chargeRing.visible = false;
    this.menuButton.mesh.visible = true;
    this.arena.reset();
    this.arenaDirty = true;
    // Both tops wait upright at their spawn points.
    if (!this.typesPicked) this.pickBuilds();
    this.typesPicked = true;
    // The launch zone follows this arena's rim.
    // A thin ribbon (2 mm in arena units), dashed, just above the floor.
    const zone: number[] = [];
    const y = this.arena.floorHeight(LAUNCH_MAX_N) + 0.004;
    for (let i = 0; i < 72; i += 2) {
      for (const [k, j] of [[0, i], [1, i], [0, i + 1], [1, i], [1, i + 1], [0, i + 1]]) {
        const a = (j / 72) * Math.PI * 2;
        const r = rimRadius(this.arena.layout, a) * LAUNCH_MAX_N + (k ? 0.002 : -0.002);
        zone.push(Math.cos(a) * r, y, Math.sin(a) * r);
      }
    }
    this.launchZone.geometry.dispose();
    this.launchZone.geometry = new BufferGeometry();
    this.launchZone.geometry.setAttribute('position', new Float32BufferAttribute(zone, 3));
    // The rival takes a new spot on the far half each round.
    this.rivalAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
    const [rx, rz] = this.rivalSpot();
    this.mine.launch(0, this.SPAWN, 0, 0, 1, this.mine.hand);
    this.theirs.launch(rx, rz, 0, 0, 1, this.theirs.hand);
    this.puller = null;
    this.cord.set(null);
    this.label.mesh.position.copy(LABEL_AT);
    this.label.mesh.scale.setScalar(1.25);
    // The bar on the far rim shows the match; the card over it only the round's messages,
    // and at a match's start, who the rival is and how it plays.
    if (this.myPoints === 0 && this.theirPoints === 0) {
      // The bout: who, from which circuit, what it says, and how it plays.
      const c = circuitOf(this.rival.name);
      // The rival arrives: a portal burns open beyond the far rim and its top arcs in; VS as it lands.
      const vs = `VS ${this.rival.name.toUpperCase()}`;
      const sub = c ? `${c.circuit} · ${c.champion ? 'CHAMPION' : `bout ${c.bout} of ${c.of}`}` : this.rival.title;
      if (this.demo) this.stamp.show(vs, sub, 'rival', 1.6);
      else if (!this.introDone) this.entrance = { t: 0, vs, sub, champion: !!c?.champion };
      this.introDone = true;
      // The first rematch says what the new part changes (the same rival: a clean comparison).
      const watch = this.progress.matches === 1 && this.myBuild.tip === 'spur' ? `Watch your Spur: it turns on ${this.rival.name} sooner` : `"${this.rival.intro}"`;
      this.label.set(`${this.rival.name}, ${this.rival.title}\n${watch}${COMFORT.assist ? ' · Assist: 80% speed' : ''}`);
    }
    else {
      this.label.set('');
      // Later rounds are framed: the round, or what is at stake.
      const point = MATCH_HEAT - 1;
      const word = this.myPoints >= point && this.theirPoints >= point ? 'FINAL ROUND' : this.myPoints >= point || this.theirPoints >= point ? 'MATCH POINT' : `ROUND ${this.round + 1}`;
      this.stamp.show(word, `${this.myPoints} - ${this.theirPoints}`, 'neutral', 0.9);
      playGong();
    }
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
    // Not while the arena is still opening out under the hand.
    if (!this.sizeSettled) return;
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
    // On the result card a pinch only moves on (to the next round's ready); it never also grabs the
    // rip cord, and while a replay plays it only skips the replay.
    if (this.phase === 'result') {
      if (!this.replay) this.toReady();
      return;
    }
    // Pinched over the arena: your top goes to that spot and launches from there; elsewhere it
    // launches from its usual spot near you.
    const l = this.toLocal(h.pinch);
    const L = this.arena.layout;
    const n = normRadius(L, l.x, l.z);
    this.launchFrom = null;
    if (n <= 1.05 && l.y - this.arena.floorHeight(Math.min(1, n)) < LAUNCH_HOVER) {
      const k = n > LAUNCH_MAX_N ? LAUNCH_MAX_N / n : 1;
      let x = l.x * k;
      let z = l.z * k;
      // Never right on top of the rival.
      const dx = x - this.theirs.x;
      const dz = z - this.theirs.z;
      const d = Math.hypot(dx, dz);
      if (d < LAUNCH_GAP) {
        x = this.theirs.x + ((d > 1e-6 ? dx / d : 0) * LAUNCH_GAP);
        z = this.theirs.z + ((d > 1e-6 ? dz / d : 1) * LAUNCH_GAP);
      }
      this.launchFrom = { x, z };
      this.mine.x = x;
      this.mine.z = z;
    }
    this.phase = 'pulling';
    this.puller = pick;
    this.pullStart.copy(h.pinch);
    this.maxPull = 0;
    this.peakSpeed = 0;
    this.lastPull = 0;
    this.rip.reset();
    this.openFor = 0;
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
      // Speed over a 40 ms window, fading within ~0.1 s: only a rip still moving at release keeps it,
      // and neither tracking jitter nor the refresh rate makes it white hot (src/game/rip.ts).
      this.peakSpeed = this.rip.push(dt, dist);
      this.lastPull = dist;
      this.openFor = 0;
      this.pullEnd.copy(h.pinch);
      const power = this.pullPower();
      this.showCharge(power, dt);
      // In 5% steps, so the card is not redrawn every frame of the pull.
      const pct = Math.round(power * 20) * 5;
      this.label.set(power >= PERFECT ? `WHITE HOT ${pct}%` : power > 0 ? `${pct}%` : 'Pull back and let go');
      this.lostFor = 0;
      if (dist < MAX_PULL) return;
    } else if (h.tracked && (this.openFor += dt) < RIP_RELEASE) {
      // Open for a single blurred frame (a fast hand): not a release yet; the pull goes on if it closes again.
      return;
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
        this.failSay('Lost your hand\nKeep it in view while you pull');
        return;
      }
    }

    this.cord.set(null);
    this.cordTone.update(null);
    this.chargeRing.visible = false;
    const power = this.pullPower();
    if (power < MIN_POWER) {
      // A tap or a hold without a pull does nothing; the top is ready again, and the card says why.
      this.toReady();
      if (this.maxPull > 0.01) this.failSay('Too soft\nPull farther, let go while moving');
      return;
    }
    const end = this.p.copy(this.toLocal(this.pullEnd));
    const pull = end.sub(this.toLocal(this.pullStart));
    const flat = Math.hypot(pull.x, pull.z);
    // How steeply up you pulled: a flat pull dashes, a pull straight up spins in place.
    const steep = Math.max(0, Math.min(1, pull.y / Math.max(1e-6, Math.hypot(flat, pull.y))));
    if (this.launchFrom) {
      // From your chosen spot: away from the pull, like a slingshot (a pull straight up goes toward the middle).
      const from = this.launchFrom;
      const r = Math.hypot(from.x, from.z) || 1;
      const dir = flat >= 0.015 ? { x: -pull.x / flat, z: -pull.z / flat } : { x: -from.x / r, z: -from.z / r };
      this.launch(power, 0, from, dir, steep);
      return;
    }
    let aim = 0;
    if (flat >= 0.03) aim = Math.atan2(-pull.x, pull.z);
    else if (this.rayFloor(h)) aim = Math.atan2(this.rayHit.x, this.SPAWN - this.rayHit.z);
    this.launch(power, Math.max(-MAX_AIM, Math.min(MAX_AIM, aim)), null, null, steep);
  }

  /** Rip power from the motion alone: distance travelled and speed at the moment of release. */
  private pullPower() {
    return ripPower(this.maxPull, this.peakSpeed, MIN_PULL, FULL_PULL, FULL_SPEED);
  }

  /** Why a gesture did nothing, on the card for 2 s (once the first session is over, so its own hints stay). */
  private failSay(text: string) {
    // Not over a match's opening card (the rival's intro), and not in the first session.
    if (this.progress.guide !== 'done' || this.demo || this.myPoints + this.theirPoints === 0) return;
    this.label.set(text);
    this.labelTimer = 2;
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
  /**
   * Launches both tops. Yours from `from` (or its usual spot) along `dir` (or `aim` off straight
   * ahead, angled into its orbit); `steep` 0..1 trades launch speed for spin.
   */
  private launch(power: number, aim: number, from: { x: number; z: number } | null = null, dir: { x: number; z: number } | null = null, steep = 0) {
    if (this.phase === 'result') this.toReady();
    const speed = LAUNCH_SPEED * (0.5 + 0.5 * power);
    const perfect = power >= PERFECT;
    this.lastPerfect = perfect;
    this.charges.reset();
    this.forgeBar.reset();
    // The strike's first match: later rounds start nearly full, so it shows in the first few minutes.
    if (this.progress.matches === 1 && this.myPoints + this.theirPoints > 0 && !this.demo) this.forgeBar.value = 0.8;
    this.barWasFull = false;
    this.rivalBar.reset();
    this.tellAt = -1;
    this.rivalCharges.reset();
    this.rivalShapeAt = -9;
    this.lastShape = null;
    this.wellInRound = false;
    this.rampAt.left = this.rampAt.right = -9;
    this.cups.left = this.cups.right = null;
    this.slings.left = this.slings.right = null;
    if (perfect && !this.demo) this.perfectInMatch = true;
    if (!this.demo && this.progress.guide === 'launch') this.progress.advance('bump');
    playLaunch(power, perfect);
    this.stamp.show(perfect ? 'WHITE HOT!' : 'RIP!', '', 'mine', 0.35);
    if (perfect) this.featDone('whiteHot');
    this.matchLog.rip = Math.max(this.matchLog.rip, power);
    this.lastRip = power;
    this.replayCount = 0;
    this.replay = null;
    this.offDeskShown = false;
    this.lastCause = '';
    // Personal bests are their own small moment (the first record is just kept).
    if (!this.demo && this.progress.guide === 'done' && this.progress.best('rip', Math.round(power * 100) / 100)) this.stamp.later('NEW BEST RIP!', `${Math.round(power * 100)}%`, 'mine', 0.8);
    const mh = this.mine.hand;
    const th = this.theirs.hand;
    // The launch angles into each top's own orbit direction (mirrored for left spin); aim stays as pulled.
    const mySpeed = speed * (1 - STEEP_SLOW * steep);
    const mySpin = (perfect ? PERFECT_SPIN : launchSpin(power)) * (1 + STEEP_SPIN * steep);
    if (perfect) this.forgeBar.value = Math.min(1, this.forgeBar.value + PERFECT_BAR);
    const sx = from ? from.x : 0;
    const sz = from ? from.z : this.SPAWN;
    if (dir) this.mine.launch(sx, sz, dir.x * mySpeed, dir.z * mySpeed, mySpin, mh);
    else {
      const a = aim + LAUNCH_TILT * mh;
      this.mine.launch(sx, sz, Math.sin(a) * mySpeed, -Math.cos(a) * mySpeed, mySpin, mh);
    }
    this.sparks.burst(sx, this.arena.height(sx, sz), sz, perfect ? 1 : power * 0.6);
    playTouchdown(sx, sz, 0.6 + 0.4 * power);
    // The rival rips harder as you level up.
    // Difficulty is launch quality: the rival rips harder and aims steadier as you level up.
    const skill = Math.min(1, (this.progress.level - 1) / 15);
    const aiMin = 0.5 + 0.25 * skill;
    // The very first match is steadier, so its lesson (the ramp) is not lost to a wild rip.
    const first = this.progress.matches === 0 && !this.demo;
    // The very first match holds both tops in a little longer, so its one lesson (the ramp) has time.
    this.arena.grace = first ? FIRST_GRACE : TUNING.grace;
    // Stronger rivals sometimes rip white hot too.
    const aiPower = first ? 0.7 + Math.random() * 0.1 : Math.random() < 0.5 * skill ? 1 : aiMin + Math.random() * (0.98 - aiMin);
    this.rivalHeld = 0;
    const aiAim = first ? (Math.random() - 0.5) * 0.3 : (Math.random() - 0.5) * (1.0 - 0.6 * skill);
    const aiSpeed = LAUNCH_SPEED * (0.5 + 0.5 * aiPower);
    // From its spot this round, toward the middle, angled into its orbit.
    const aiDir = aiAim + LAUNCH_TILT * th;
    const [rx, rz] = this.rivalSpot();
    const inward = Math.atan2(-rx, -rz);
    this.theirs.launch(rx, rz, Math.sin(inward + aiDir) * aiSpeed, Math.cos(inward + aiDir) * aiSpeed, launchSpin(aiPower), th);
    playTouchdown(rx, rz, 0.6 + 0.4 * aiPower);
    this.phase = 'fight';
    this.elapsed = 0;
    this.lastHardHit = -1;
    this.accumulator = 0;
    this.clashes = 0;
    // Say how it launched: white hot, or the kind of launch the pull's angle gave.
    const kind = steep > 0.6 ? 'Spin launch: slow, long spin' : steep < 0.25 && power > 0.5 && (from || dir) ? 'Dash launch' : '';
    this.label.set(perfect ? 'White hot!\nA head start on the strike' : kind);
    this.labelTimer = perfect || kind ? 1.5 : 0;
    this.launchFrom = null;
    console.log(`[MATCH] launch power ${power.toFixed(2)}${perfect ? ' PERFECT' : ''} from ${sx.toFixed(3)},${sz.toFixed(3)} steep ${steep.toFixed(2)} aim ${aim.toFixed(2)} vs AI ${aiPower.toFixed(2)} from ${rx.toFixed(3)},${rz.toFixed(3)}`);
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
      this.updateCup(side);
      if (!h.tracked) {
        this.shaping[side] = null;
        this.pressing[side] = false;
        this.endSling(side, false);
        // The fingertip's speed starts over when the hand comes back (a hand regained lower is not a press).
        this.tipFresh[side] = true;
        continue;
      }
      const l = this.toLocal(h.pinch);
      if (h.pinching) {
        // Keep the fingertip's height current while pinching, so letting go is not read as a fast press.
        // Its own vector: toLocal() reuses one, and `l` (the pinch) is still in use below.
        this.tipY[side] = this.root.worldToLocal(this.handAt.copy(h.index)).y;
        this.tipDown[side] = 0;
        let d = this.shaping[side];
        // Pinching a cup that holds a top grabs it to sling, before any ramp.
        if (!d && h.justPinched && open && this.startSling(side, l.x, l.z)) continue;
        const sl = this.slings[side];
        if (sl) {
          sl.px = l.x - sl.sx;
          sl.pz = l.z - sl.sz;
          const t = sl.cup.caught;
          if (t) {
            // The cord runs from the top back to the hand: let go and it flies the other way.
            this.root.localToWorld(this.slingFrom.set(t.x, this.arena.height(t.x, t.z) + 0.03, t.z));
            this.cord.set(this.slingFrom, h.pinch, Math.min(1, Math.hypot(sl.px, sl.pz) / SLING_FULL), this.frameDt);
          }
          continue;
        }
        if (!d && h.justPinched && open) {
          // Pointing out from the middle until the hand drags it round.
          if (this.arena.inside(l.x, l.z) && Math.abs(l.y - this.arena.height(l.x, l.z)) < SHAPE_GRAB) {
            d = this.shaping[side] = { x: l.x, z: l.z, sx: l.x, sz: l.z, t: 0, far: false, amp: SHAPE_SIZE.ramp, dx: l.x, dz: l.z, shape: null };
          } else if (this.rayFloor(h)) {
            d = this.shaping[side] = { x: this.rayHit.x, z: this.rayHit.z, sx: l.x, sz: l.z, t: 0, far: true, amp: SHAPE_SIZE.ramp, dx: this.rayHit.x, dz: this.rayHit.z, shape: null };
          }
        }
        if (d) {
          d.t += this.frameDt;
          // Aim: the drag since the pinch began (the far hand's own motion counts double), once it is
          // past a small dead zone, so tracking jitter never swings it.
          const k = d.far ? 2 : 1;
          const px = (l.x - d.sx) * k;
          const pz = (l.z - d.sz) * k;
          if (Math.hypot(px, pz) >= RAMP_AIM_DEADZONE) {
            d.dx = px;
            d.dz = pz;
            if (d.shape) this.arena.aimShape(d.shape, px, pz);
          }
          // The ramp is set at the pinch, full size, after a short hold (a brush is not a pinch).
          if (!d.shape && d.t >= (d.far ? TUNE.farHold : RAMP_NEAR_HOLD)) {
            d.shape = this.makeShape('ramp', d.x, d.z, SHAPE_SIZE.ramp, side, d.dx, d.dz);
            this.rampAt[side] = this.elapsed;
            if (!d.shape) this.shaping[side] = null;
          }
        }
        continue;
      }
      // Let go: the ramp, if set, keeps working on its own; a pulled sling fires.
      this.shaping[side] = null;
      this.endSling(side, true);
      // A fingertip pressed into the floor makes a well, once per press, if it came down with
      // intent (a hand resting or drifting down does not) and not just as a ramp was let go.
      const tip = this.toLocal(h.index);
      if (this.tipFresh[side]) {
        this.tipFresh[side] = false;
        this.tipY[side] = tip.y;
        this.tipDown[side] = 0;
        continue;
      }
      const depth = this.arena.inside(tip.x, tip.z) ? this.arena.height(tip.x, tip.z) - tip.y : -1;
      // Downward speed (m/s), smoothed over about 80 ms so tracking jitter is not a press.
      const raw = ((this.tipY[side] - tip.y) * ARENA_SCALE) / Math.max(1e-3, this.frameDt);
      this.tipY[side] = tip.y;
      const down = (this.tipDown[side] += (raw - this.tipDown[side]) * (1 - Math.exp(-this.frameDt / 0.08)));
      if (depth > 0.004 && !this.pressing[side] && open) {
        this.pressing[side] = true;
        // With the strike armed, a palm coming down outside the rim is a slap, not a cup at the edge.
        // (Not toLocal(): it would overwrite `tip`, which shares its vector.) Only a hand down at the
        // table counts as a slap, so cups reached in over the rim still work with the bar full.
        const palm = this.root.worldToLocal(this.handAt.copy(h.wrist)).lerp(tip, 0.5);
        const atTable = h.low < this.root.position.y - PEDESTAL * this.rootK + 0.05;
        const slapping = this.forgeBar.full && this.taught('strike') && atTable && normRadius(this.arena.layout, palm.x, palm.z) > 1.0;
        if (slapping) {
          if (import.meta.env.DEV) console.log('[SHAPE] well ignored: a slap outside the rim');
        } else if (down >= TUNE.wellSpeed && this.elapsed - this.rampAt[side] > TUNE.wellAfterRamp && this.taught('cup')) this.makeCup(side, tip.x, tip.z);
        else if (import.meta.env.DEV) console.log(`[SHAPE] well ignored: ${down.toFixed(2)} m/s down`);
      } else if (depth < 0) this.pressing[side] = false;
    }
  }

  /**
   * One new verb per match in the first session: the ramp in the first, the strike in the second,
   * the cup and sling in the third; rival tells after that (sooner once a strike has landed).
   */
  private taught(verb: 'strike' | 'cup' | 'tells') {
    const m = this.progress.matches;
    if (verb === 'strike') return m >= 1;
    if (verb === 'cup') return m >= 2;
    return m >= 3 || (m >= 2 && this.struckOnce);
  }

  /**
   * The Anvil Strike: with the forge bar full, a palm pressed on the table (or the tray's level)
   * outside the arena's rim. Also keeps the bar on the back of each hand and the shockwave going.
   */
  private updateStrike(dt: number) {
    // No strike in a workshop try-out, nor before its match in the first session.
    if (!this.taught('strike')) {
      this.barRings.left.visible = this.barRings.right.visible = this.slapMark.visible = false;
      this.arenaView.charge = 0;
      return;
    }
    const full = this.forgeBar.full && this.elapsed >= TUNING.grace && !this.demo;
    if (full && !this.barWasFull) {
      playBarFull();
      this.fullSince = this.elapsed;
    }
    this.barWasFull = full;
    // The hint stays until the first strike lands (the first session's ramp hint goes first).
    if (full && !this.struckOnce && !this.demo && this.progress.guide !== 'bump' && this.labelTimer <= 0) {
      this.strikeTaught = true;
      this.label.set(`Forge bar full: ${SEAL_NAMES[this.myBuild.seal ?? 'anvil']}!\n${COMFORT.gentle ? 'Press your palm flat beside the arena and hold' : 'Slap your palm down beside the arena'}`);
    }
    const armed = full && this.elapsed - this.fullSince > 0.5;
    // The print sits on the table off the near-right rim (any spot beside the arena works).
    this.slapMark.visible = armed && !this.photo;
    if (armed) {
      const a = Math.PI / 3;
      const r = rimRadius(this.arena.layout, a) + 0.05;
      this.slapMark.position.set(Math.cos(a) * r, -PEDESTAL / ARENA_SCALE + 0.001, Math.sin(a) * r);
      this.slapMark.scale.setScalar(1 + 0.12 * Math.sin(this.time * 8));
    }
    // The table under the pedestal: a press counts within 5 cm of it.
    const tableY = this.root.position.y - PEDESTAL * this.rootK;
    for (const side of ['left', 'right'] as const) {
      const h = this.hands[side];
      // Outside is judged at the palm (between the wrist and the fingertip): a palm on the print with
      // its fingers toward the arena put the fingertip right on the old 1.05 line and missed.
      const l = h.tracked ? this.slapAt.copy(this.toLocal(h.wrist)).lerp(this.toLocal(h.index), 0.5) : null;
      const outside = l !== null && normRadius(this.arena.layout, l.x, l.z) > 1.0;
      const hit = (COMFORT.gentle ? this.touches : this.strikeTouch)[side].update(outside ? h.low : null, dt, tableY - 0.05, tableY + 0.05);
      if (hit === null) continue;
      if (!armed) {
        if (import.meta.env.DEV) console.log(`[STRIKE] pressed with the bar at ${Math.round(this.forgeBar.value * 100)}%`);
        // Not full yet: a dull clunk says so (once the strike is taught).
        if (this.taught('strike')) playLocked();
        continue;
      }
      // The shockwave starts on the rim beside the palm; the palm leaves a molten print on the desk.
      const a = Math.atan2(l!.z, l!.x);
      const r = rimRadius(this.arena.layout, a);
      this.doStrike(Math.cos(a) * r, Math.sin(a) * r);
      // Under the palm itself (between the wrist and the fingertip).
      const palm = this.handAt.copy(this.toLocal(h.wrist)).lerp(this.toLocal(h.index), 0.5);
      this.printPalm(palm.x, palm.z, a);
      break;
    }
    // The arena's rails warm as the bar fills, and glow when it is full: the tops are what the eyes follow.
    this.arenaView.charge = full ? 0.7 + 0.3 * Math.sin(this.time * 8) : this.forgeBar.value * 0.5;
    // The bar: on the back of each tracked hand, lit by how full it is, pulsing when ready.
    const lit = Math.round(this.forgeBar.value * 10);
    this.barSegs.forEach((m, i) => {
      const on = i % 10 < lit;
      m.opacity = on ? (full ? 0.75 + 0.25 * Math.sin(this.time * 10) : 0.85) : 0.18;
      m.color.setHex(full ? 0xffe0a0 : on ? SEAL_COLOR[this.myBuild.seal ?? 'anvil'] : 0x8a8f99);
    });
    this.player.head.getWorldPosition(this.head);
    for (const side of ['left', 'right'] as const) {
      const g = this.barRings[side];
      const h = this.hands[side];
      g.visible = h.tracked && !this.demo && this.forgeBar.value > 0.05;
      if (!g.visible) continue;
      g.position.copy(h.wrist).y += 0.05;
      g.lookAt(this.head);
    }
    // The shockwave runs across the arena from where it started in 0.18 s, fading.
    if (this.shockT < 1) {
      this.shockT = Math.min(1, this.shockT + dt / 0.18);
      const r = Math.max(0.01, this.shockT * maxRim(this.arena.layout) * 2);
      this.shock.scale.setScalar(r);
      this.shock.position.set(this.shockAt.x, this.arena.floorHeight(0.5) + 0.003, this.shockAt.z);
      this.shockClip.uC.value.copy(this.root.position);
      this.shockClip.uR.value = maxRim(this.arena.layout) * ARENA_SCALE * this.rootK * this.viewK;
      (this.shock.material as MeshBasicMaterial).opacity = 0.9 * (1 - this.shockT);
    }
    this.shock.visible = this.shockT < 1;
  }

  /**
   * Rivals' big moves (after the first match): the rival's own bar fills like yours; when full it
   * telegraphs its move for TELL_TIME (it flashes, rings spread under it, a rising whine), then the
   * move lands, unless your Anvil Strike cut it short.
   */
  private rivalTell(clash: number) {
    if (this.demo || !this.taught('tells')) return;
    this.rivalBar.update(STEP, false);
    if (clash) this.rivalBar.clash(clash, this.elapsed, false);
    const them = this.theirs;
    if (this.tellAt < 0) {
      if (!them.alive || !this.mine.alive) return;
      // A mind game: once you know the tells, a rival with its move ready waits while your strike is
      // ready too (up to RIVAL_HOLD s), so striking early wastes the answer and holding it is a choice.
      if (this.tellTaught && this.rivalBar.full && this.forgeBar.full && this.rivalHeld < RIVAL_HOLD) {
        if (this.rivalHeld === 0 && !this.holdSaid) {
          this.holdSaid = true;
          this.label.set(`${this.rival.name} is waiting for your strike\nHold it to answer its move`);
          this.labelTimer = 2.5;
        }
        this.rivalHeld += STEP;
        return;
      }
      if (!this.rivalBar.spend(this.elapsed, TUNING.grace + 2)) return;
      this.rivalHeld = 0;
      this.tellAt = this.elapsed + TELL_TIME;
      them.tell = TELL_TIME;
      playTell();
      this.stamp.show(`${this.rival.move.toUpperCase()}!`, `${this.rival.name} winds up`, 'rival', 0.7);
      const what = { charge: 'a charge', quake: 'a quake', pull: 'a pull' }[this.rival.move];
      if (!this.tellTaught) {
        this.tellTaught = true;
        this.label.set(`${this.rival.name} winds up ${what}!\n${this.forgeBar.full ? ((this.myBuild.seal ?? 'anvil') === 'ward' ? 'Ward up: let it hit you' : 'Strike now to stop it') : 'Brace: cup your own top'}`);
        this.labelTimer = 2.5;
      }
      if (import.meta.env.DEV) console.log(`[TELL] ${this.rival.name} ${this.rival.move} at t ${this.elapsed.toFixed(1)}`);
      return;
    }
    if (them.tell <= 0) {
      // Cut short by the strike (doStrike says so).
      this.tellAt = -1;
      this.lane.visible = false;
      return;
    }
    them.tell = this.tellAt - this.elapsed;
    this.drawLane(1 - them.tell / TELL_TIME);
    // The tell: the rival flashes and rings spread under it.
    // Three flashes a second at most (WCAG 2.3.1), none with flashes off.
    if (Math.floor(this.elapsed * 3) !== Math.floor((this.elapsed - STEP) * 3)) this.theirView.flash();
    if (Math.floor(this.elapsed * 4) !== Math.floor((this.elapsed - STEP) * 4)) this.impacts.hit(them.x, this.arena.height(them.x, them.z), them.z, 0.5);
    if (them.tell > 0) return;
    them.tell = 0;
    this.tellAt = -1;
    this.lane.visible = false;
    if (!them.alive) return;
    if (!rivalMove(this.arena, them, this.mine, this.rival.move)) {
      // Held in your cup: the move fizzles.
      this.label.set('HELD!');
      this.labelTimer = 1.2;
      return;
    }
    this.rivalShapeAt = this.elapsed;
    this.rivalShapeKind = this.rival.move.toUpperCase();
    if (this.rival.move === 'quake') {
      this.shockAt.x = this.shockAt.z = 0;
      this.shockT = 0;
      playStrike();
      this.roomLight.hit();
    } else playDash(them.x);
    this.label.set(`${this.rival.name.toUpperCase()}: ${this.rival.move.toUpperCase()}!`);
    this.labelTimer = 1.2;
    if (import.meta.env.DEV) console.log(`[TELL] ${this.rival.move} landed`);
  }

  /**
   * The tell on the floor, filling as it winds up (k 0..1): a charge's lane from the rival to your
   * top, a pull's line from your top to the pit it drags you toward. A quake has its rings.
   */
  private drawLane(k: number) {
    const them = this.theirs;
    const me = this.mine;
    const move = this.rival.move;
    this.lane.visible = move !== 'quake' && me.alive;
    if (!this.lane.visible) return;
    let fx = them.x;
    let fz = them.z;
    let tx = me.x;
    let tz = me.z;
    if (move === 'pull') {
      // From your top toward the nearest pit mouth (as rivalMove pulls).
      const a0 = Math.atan2(me.z, me.x);
      let a = a0;
      let gap = Infinity;
      for (const p of this.arena.layout.pockets) {
        const g = Math.abs(Math.atan2(Math.sin(p.angle - a0), Math.cos(p.angle - a0)));
        if (g < gap) {
          gap = g;
          a = p.angle;
        }
      }
      fx = me.x;
      fz = me.z;
      tx = Math.cos(a) * this.arena.radius;
      tz = Math.sin(a) * this.arena.radius;
    }
    const len = Math.hypot(tx - fx, tz - fz) * Math.max(0.15, k);
    this.lane.position.set(fx, this.arena.height(fx, fz) + 0.002, fz);
    this.lane.rotation.y = Math.atan2(-(tx - fx), -(tz - fz));
    this.lane.scale.set(0.012, 1, Math.max(0.001, len));
    (this.lane.material as MeshBasicMaterial).opacity = 0.35 + 0.35 * k;
  }

  /** Spends the full bar: the shockwave, both tops thrown out, the room flashes, a hammer on an anvil. */
  private doStrike(ox = 0, oz = 0) {
    if (!this.forgeBar.spend(this.elapsed, TUNING.grace)) return;
    const seal = this.myBuild.seal ?? 'anvil';
    // The Ward is a parry, not an interrupt: the move still comes, and a charge rebounds off it.
    const cut = this.tellAt >= 0 && this.theirs.tell > 0 && seal !== 'ward';
    // Cups and slings let go first, so none is left holding forever.
    for (const s of ['left', 'right'] as const) {
      this.endSling(s, false);
      const c = this.cups[s];
      if (c && this.arena.shapes.includes(c.shape)) this.arena.free(c.shape);
    }
    sealStrike(this.arena, this.mine, this.theirs, seal, ox, oz);
    this.shockAt.x = ox;
    this.shockAt.z = oz;
    this.struckOnce = true;
    if (cut) {
      this.tellAt = -1;
      this.label.set('INTERRUPTED!');
      this.stamp.show('INTERRUPTED!', '', 'mine', 0.6);
      this.featDone('interrupt');
      this.labelTimer = 1.2;
      if (import.meta.env.DEV) console.log('[TELL] interrupted');
    }
    for (const s of ['left', 'right'] as const) {
      this.cups[s] = null;
      this.slings[s] = null;
    }
    this.lastShape = { t: this.elapsed, kind: 'strike' };
    // Each seal reads its own way: the anvil's shockwave from the middle, the rush's sparks trailing
    // your top, the magnet's rings closing on the rival.
    const me = this.mine;
    const them = this.theirs;
    if (seal === 'anvil') {
      this.shockT = 0;
      this.impacts.hit(ox, this.arena.floorHeight(1), oz, 1);
      for (const t of [me, them]) if (t.alive) this.sparks.burst(t.x, this.arena.height(t.x, t.z), t.z, 1);
      playStrike();
    } else if (seal === 'rush') {
      this.sparks.burst(me.x, this.arena.height(me.x, me.z), me.z, 1);
      this.myView.flash();
      playDash(me.x);
      playStrike();
    } else if (seal === 'tilt') {
      // The arena tips toward the palm (the stage follows the sim's tilt); a thud where the hand hit.
      this.impacts.hit(ox, this.arena.floorHeight(1), oz, 1);
      playStrike();
      playMachine();
    } else if (seal === 'hammer' || seal === 'ward') {
      this.sparks.burst(me.x, this.arena.height(me.x, me.z), me.z, 0.7);
      this.myView.flash();
      playStrike();
    } else {
      this.impacts.hit(them.x, this.arena.height(them.x, them.z), them.z, 1);
      this.theirView.flash();
      playTell();
    }
    this.roomLight.hit();
    duck(0.3, 0.4);
    // The super freeze: the fight holds for a beat while the seal rises off your top.
    this.hitStop = 0.25;
    this.accumulator = 0;
    this.sealPop.clear();
    this.sealPop.add(sealModel(seal));
    this.sealPop.userData.t = 0;
    this.sealPop.visible = true;
    this.stamp.show(SEAL_NAMES[seal].toUpperCase() + '!', '', 'mine', 0.5);
    if (!cut && this.label.current.startsWith('Forge bar full')) this.label.set('');
    if (import.meta.env.DEV) console.log(`[STRIKE] ${seal} at t ${this.elapsed.toFixed(1)}: rival heat ${this.theirs.damage.toFixed(2)}, yours ${this.mine.damage.toFixed(2)}`);
  }

  /** A fingertip press: a cup that holds the first top to roll in, until it is slung or TUNE.cupHold passes. */
  private makeCup(side: Side, x: number, z: number) {
    const shape = this.makeShape('well', x, z, CUP_DEPTH, `${side}-cup`, 0, 0, CUP_SIGMA);
    if (!shape) return;
    if (!this.cuppedOnce && this.label.current.startsWith('New: jab')) this.label.set('');
    this.cuppedOnce = true;
    shape.trap = shape.held = true;
    this.cups[side] = { shape, at: this.elapsed, caught: false };
  }

  /** Drops a cup that is gone (round over); one that caught nothing, or held a top unslung, lets go after TUNE.cupHold. */
  private updateCup(side: Side) {
    const c = this.cups[side];
    if (!c) return;
    if (!this.arena.shapes.includes(c.shape)) {
      this.cups[side] = null;
      return;
    }
    if (c.shape.caught && !c.caught) {
      // The hold clock restarts at the catch: sling it soon or it rolls on.
      c.caught = true;
      c.at = this.elapsed;
      playThock();
      if (!this.slungOnce) this.label.set('Caught! Pinch it, pull back, let go:\nit flies the other way. Aim at a slag pit');
      if (import.meta.env.DEV) {
        const t = c.shape.caught;
        const w = this.root.localToWorld(this.slingFrom.set(t.x, this.arena.height(t.x, t.z), t.z));
        console.log(`[SHAPE] cup caught ${t === this.mine ? 'mine' : 'rival'} at ${w.x.toFixed(3)},${w.y.toFixed(3)},${w.z.toFixed(3)}`);
      }
    }
    const slung = this.slings.left?.cup === c.shape || this.slings.right?.cup === c.shape;
    if (!slung && this.elapsed - c.at > TUNE.cupHold) {
      this.arena.free(c.shape);
      this.cups[side] = null;
    }
  }

  /** A pinch near a cup holding a top takes hold of it (either hand, either cup). */
  private startSling(side: Side, x: number, z: number): boolean {
    for (const s of ['left', 'right'] as const) {
      const cup = this.cups[s]?.shape;
      const t = cup?.caught;
      if (!cup || !t || Math.hypot(t.x - x, t.z - z) > SLING_GRAB) continue;
      this.slings[side] = { cup, sx: x, sz: z, px: 0, pz: 0 };
      return true;
    }
    return false;
  }

  /**
   * Lets go of a sling: pulled far enough (and `fire`), the top flies opposite the pull, snapped to
   * a slag-pit mouth within SLING_SNAP; otherwise the cup just lets it roll on.
   */
  private endSling(side: Side, fire: boolean) {
    const sl = this.slings[side];
    if (!sl) return;
    this.slings[side] = null;
    this.cord.set(null);
    const t = sl.cup.caught;
    if (!t || !this.arena.shapes.includes(sl.cup)) return;
    for (const s of ['left', 'right'] as const) if (this.cups[s]?.shape === sl.cup) this.cups[s] = null;
    if (!fire || Math.hypot(sl.px, sl.pz) < SLING_MIN) {
      this.arena.free(sl.cup);
      return;
    }
    let a = Math.atan2(-sl.pz, -sl.px);
    let gap = SLING_SNAP;
    for (const p of this.arena.layout.pockets) {
      const b = Math.atan2(Math.sin(p.angle) * this.arena.radius - t.z, Math.cos(p.angle) * this.arena.radius - t.x);
      const d = Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)));
      if (d < gap) {
        gap = d;
        a = b;
      }
    }
    this.arena.sling(sl.cup, Math.cos(a), Math.sin(a));
    if (!this.slungOnce) this.label.set('');
    this.slungOnce = true;
    this.lastShape = { t: this.elapsed, kind: 'sling' };
    playDash(t.x);
    // The release has a payoff: a stamp and a trail of sparks off the cup.
    this.stamp.show('SLUNG!', '', 'mine', 0.3);
    this.sparks.burst(t.x, this.arena.height(t.x, t.z), t.z, 0.8);
    if (import.meta.env.DEV) console.log(`[SHAPE] sling ${t === this.mine ? 'mine' : 'rival'} angle ${a.toFixed(2)}${gap < SLING_SNAP ? ' to a pit' : ''}`);
  }

  /** Spends a charge and sets a shape (one live shape per hand); without a charge, a dull clunk. */
  private makeShape(kind: ShapeKind, x: number, z: number, amp: number, owner: string, dx = 0, dz = 0, sigma?: number): FloorShape | null {
    const f = this.charges.spend(this.elapsed, TUNING.grace);
    if (import.meta.env.DEV) console.log(`[SHAPE] ${kind} at ${x.toFixed(3)},${z.toFixed(3)} amp ${amp.toFixed(3)} factor ${f} charges ${this.charges.charges} t ${this.elapsed.toFixed(1)}`);
    if (!f) {
      playLocked();
      return null;
    }
    const shape = this.arena.addShape(kind, x, z, amp * f, owner, dx, dz, sigma);
    this.lastShape = { t: this.elapsed, kind };
    if (kind === 'well') this.wellInRound = true;
    this.progress.advance('match');
    playThock();
    return shape;
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
    if (!me.alive || normRadius(this.arena.layout, me.x, me.z) < 0.6 || r < 1e-3 || this.elapsed - this.rivalShapeAt < RIVAL_SHAPE_GAP) return;
    const f = this.rivalCharges.spend(this.elapsed, TUNING.grace);
    if (!f) return;
    this.rivalShapeKind = 'RAMP';
    this.arena.addShape('ramp', me.x - (me.x / r) * 0.012 * (this.arena.radius / 0.17), me.z - (me.z / r) * 0.012 * (this.arena.radius / 0.17), SHAPE_SIZE.ramp * f * 0.85, 'rival', me.x / r, me.z / r, RIVAL_RAMP_SIGMA);
    this.rivalShapeAt = this.elapsed;
    playThock();
    if (import.meta.env.DEV) console.log(`[SHAPE] rival ramp at ${me.x.toFixed(3)},${me.z.toFixed(3)} t ${this.elapsed.toFixed(1)}`);
  }

  /** Marks for live shapes and ghosts, the charge embers, and a crunch when a top runs into a shape. */
  /** A pooled shape mark (the marks are rebuilt every frame without allocating). */
  private specAt(i: number): ShapeMarkSpec {
    return (this.specPool[i] ??= { kind: 'ramp', x: 0, z: 0, dx: 0, dz: 0, strength: 0, ghost: false });
  }

  private updateShapes() {
    const fight = this.phase === 'fight';
    const mine = this.specsMine;
    const theirs = this.specsTheirs;
    mine.length = theirs.length = 0;
    let n = 0;
    if (fight) {
      for (const s of this.arena.shapes) {
        const m = this.specAt(n++);
        Object.assign(m, { kind: s.kind, x: s.x, z: s.z, dx: s.dx, dz: s.dz, strength: Arena.strength(s), ghost: false, sigma: s.sigma });
        (s.owner === 'rival' ? theirs : mine).push(m);
      }
      for (const side of ['left', 'right'] as const) {
        const d = this.shaping[side];
        if (d && !d.shape) mine.push(Object.assign(this.specAt(n++), { kind: 'ramp', x: d.x, z: d.z, dx: d.dx, dz: d.dz, strength: 1, ghost: true, sigma: undefined }));
      }
      if (this.devRampSince >= 0 && this.gazeHit.ok) {
        const r = Math.hypot(this.gazeHit.x, this.gazeHit.z) || 1;
        mine.push(Object.assign(this.specAt(n++), { kind: 'ramp', x: this.gazeHit.x, z: this.gazeHit.z, dx: this.gazeHit.x / r, dz: this.gazeHit.z / r, strength: this.devRampAmp() / SHAPE_SIZE.ramp, ghost: true, sigma: undefined }));
      }
    }
    this.rivalMarks.show(theirs, this.heightAt, this.time);
    this.marks.show(mine, this.heightAt, this.time);
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
    // Assist (the comfort dial) runs the fight at 80% speed.
    this.accumulator += COMFORT.assist ? dt * 0.8 : dt;
    let steps = 0;
    while (this.accumulator >= STEP && steps < 8) {
      this.accumulator -= STEP;
      steps++;
      this.elapsed += STEP;
      const clash = step(this.arena, this.mine, this.theirs);
      this.record();
      // A charge rebounding off your Ward: said once per Ward, and it counts as stopping the move.
      if (this.mine.guard <= 0) this.parried = false;
      if (clash?.parry && !this.parried) {
        this.parried = true;
        this.stamp.show('PARRIED!', 'it bounced off your Ward', 'mine', 0.6);
        this.impacts.hit(clash.x, this.arena.height(clash.x, clash.z), clash.z, 1);
        playClash(1, clash.x);
        this.featDone('interrupt');
        if (import.meta.env.DEV) console.log('[STRIKE] ward parried a charge');
      }
      if (clash?.hammer) {
        this.stamp.show('CRACKED!', '', this.mine.hammer === 0 ? 'mine' : 'rival', 0.5);
        // The Hammer lands: a heavy ring and a shower of sparks where the rims met.
        this.sparks.burst(clash.x, this.arena.height(clash.x, clash.z), clash.z, 1);
        this.impacts.hit(clash.x, this.arena.height(clash.x, clash.z), clash.z, 1);
        playBurst(clash.x);
        if (import.meta.env.DEV) console.log(`[STRIKE] hammer landed: rival damage ${this.theirs.damage.toFixed(2)}`);
      }
      // Behind counts once the opening grace is over (a weaker launch is not a comeback).
      const behind = this.elapsed >= TUNING.grace && behindOn(this.mine, this.theirs);
      this.forgeBar.update(STEP, behind);
      if (clash) this.forgeBar.clash(clash.strength, this.elapsed, behind);
      this.rivalTell(clash ? clash.strength : 0);
      for (const t of [this.mine, this.theirs]) {
        if (t.sincePad !== 0) continue;
        // A boost pad fired: it flashes, sparks fly along it, a whoosh.
        this.arenaView.flashPad(t.x, t.z);
        this.sparks.burst(t.x, this.arena.height(t.x, t.z), t.z, 0.5);
        playDash(t.x);
      }
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
          // Harder hits freeze longer (70-110 ms) and shake both tops (never the view).
          this.hitStop = clash.strength > 0.85 ? 0.11 : 0.07;
          this.myView.shake(clash.strength);
          this.theirView.shake(clash.strength);
          this.bar.hit(0);
          this.bar.hit(1);
          this.roomLight.hit();
          this.accumulator = 0;
          duck(0.5, 0.15);
        }
        if (this.sinceClashSound > 0.06) {
          playClash(clash.strength, clash.x, this.myBuild.ring, this.theirBuild.ring, clash.z);
          this.sinceClashSound = 0;
        }
      }
      for (const t of this.tops) {
        // Hot metal sheds embers: the more damage, the more often (a cracked top is a target).
        if (t.alive && t.damage > 0.45 && Math.random() < (t.damage - 0.35) * 3 * STEP) this.sparks.burst(t.x, this.arena.height(t.x, t.z) + 0.01, t.z, 0.05);
        if (t.sinceWall === 0) {
          // A near miss: the top slams the wall and sparks scrape off it.
          this.sparks.burst(t.x, this.arena.height(t.x, t.z), t.z, Math.min(1, t.wallHit * 1.5));
          if (this.sinceClashSound > 0.06) playScrape(Math.min(1, t.wallHit * 2), t.x, t.z);
        }
        if (t.sinceBump === 0) {
          this.arenaView.flashBumper(t.x, t.z);
          playClash(0.5, t.x);
          this.sparks.burst(t.x, this.arena.height(t.x, t.z), t.z, 0.5);
        }
        if (t.sinceDash !== 0) continue;
        this.arenaView.flashRail(t.x, t.z);
        this.impacts.dash(t.x, this.arena.height(t.x, t.z), t.z, t.vx, t.vz);
        playDash(t.x);
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
    // One unlock per result card; the rest wait for the next ones.
    this.revealedHere = false;
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
      if (t.finish === 'pocket') playPocket(t.x);
      else if (t.finish === 'over') playOver(t.x);
      else if (t.finish === 'burst') playBurst(t.x);
      else if (t.finish === 'spin') playTopple(t.x, t.z);
    }
    if (v !== 2) {
      duck(0.25, 1.2);
      playResult(v === 1);
    }
    let text: string;
    if (v === 2) {
      text = 'Draw\nReplay the round';
    } else {
      const loser = v === 1 ? this.theirs : this.mine;
      const points = finishPoints(loser);
      if (v === 1) this.myPoints += points;
      else this.theirPoints += points;
      // Match point down: a win from here is a comeback.
      if (this.theirPoints >= MATCH_HEAT - 1 && this.myPoints < this.theirPoints) this.wasDown = true;
      this.barPoints = [this.myPoints, this.theirPoints];
      const score = `Heat ${this.myPoints} - ${this.theirPoints}`;
      const decided = this.myPoints >= MATCH_HEAT || this.theirPoints >= MATCH_HEAT;
      this.earn(v === 1, loser, decided, decided && this.myPoints > this.theirPoints);
      if (decided) {
        const youWon = this.myPoints > this.theirPoints;
        playMatch(youWon);
        this.matchLog.won = youWon;
        this.matchLog.score = `${this.myPoints} - ${this.theirPoints}`;
        if (youWon && this.theirPoints === 0) this.featDone('flawless');
        if (youWon && this.wasDown) this.featDone('comeback');
        if (youWon && !this.demo && this.progress.wonMatchIn(this.arena.layout.name)) this.featDone('everyArena');
        // A won match: sparks run round the rim for a moment.
        if (youWon) {
          this.celebrate = 1.6;
          if (COMFORT.flashes) this.pillar.play(this.arena.layout, maxRim(this.arena.layout) + 0.01, this.arena.floorHeight(1), TEAM_MINE);
          // The win leaves the machine: a warm ring rolls out across your room.
          if (COMFORT.flashes) this.roomLight.wave();
        } else if (COMFORT.flashes) {
          // A loss has its own beat: a cold ring rolls out instead.
          this.roomLight.wave(true);
        }
        // A loss leaves something to try next time.
        text = youWon ? `You win the match!\n${this.rival.name}: "${this.rival.lose}"` : `You lose the match\nTip: ${this.rival.tip}`;
        this.myPoints = 0;
        this.theirPoints = 0;
        this.matchOver = true;
      } else {
        // A spin finish says why (the most common finish otherwise reads as luck).
        const why = loser.finish === 'spin' ? this.outlastReason(v === 1) : '';
        text = `${name(loser)}! ${v === 1 ? 'You' : 'They'} +${points} heat\n${why ? `${why} · ` : ''}${score}`;
      }
      // A finish within 1.5 s of the player's shape names it as the cause.
      const recent = this.lastShape && this.elapsed - this.lastShape.t < CAUSE_WINDOW ? (this.lastShape.kind === 'strike' ? SEAL_NAMES[this.myBuild.seal ?? 'anvil'] : this.lastShape.kind).toUpperCase() : null;
      const theirs = this.elapsed - this.rivalShapeAt < CAUSE_WINDOW;
      if (!this.demo && this.progress.guide === 'done' && v === 1 && loser.finish !== 'spin' && this.progress.best('fastestKo', Math.round(this.elapsed * 10) / 10)) this.stamp.later('NEW BEST!', `Fastest knockout: ${this.elapsed.toFixed(1)} s`, 'mine', 1);
      if (v === 1 && loser.finish !== 'spin' && recent && this.lastShape) {
        const k = this.lastShape.kind;
        this.featDone(k === 'ramp' ? 'ramp' : k === 'sling' ? 'sling' : k === 'strike' ? 'strike' : '');
        if (k === 'strike' && loser.finish === 'burst' && this.myBuild.seal === 'hammer') this.featDone('hammer');
      }
      // Every knockout, yours or theirs, slows for a moment.
      if (loser.finish !== 'spin') this.slowMo = SLOW_MO_TIME * 0.5;
      const won = this.myPoints > this.theirPoints || (decided && v === 1);
      const cause = recent && v === 1 ? `YOUR ${recent}` : theirs && v === -1 && loser.finish !== 'spin' ? `THEIR ${this.rivalShapeKind}`.toUpperCase() : '';
      this.lastCause = cause ? `${cause} → ${FINISH_WORD[loser.finish ?? 'spin']}` : '';
      this.stamp.show(`${FINISH_WORD[loser.finish ?? 'spin']}!`, decided ? (won ? 'MATCH WON' : `MATCH LOST · "${this.rival.win}"`) : cause, v === 1 ? 'mine' : 'rival', 1.1, decided ? 1.5 : 1);
      if (recent && v === 1) {
        // The stamp names the cause (SLAG! / YOUR RAMP); the card keeps to the score.
        // The decisive move plays out slowly for a moment, in a shower of sparks, then again as a replay.
        // The replay means the finishing blow: the knockout that wins the match, and the session's first
        // knockout of your making (so the move is seen once); the rest go straight on (~4 s a match saved).
        if (loser.finish !== 'spin' && !this.demo && (decided || !this.replayedOnce)) {
          this.replayedOnce = true;
          this.startReplay();
        }
        if (loser.finish !== 'spin') {
          this.slowMo = SLOW_MO_TIME;
          this.sparks.burst(loser.x, this.arena.height(loser.x, loser.z), loser.z, 1);
        }
      } else if (recent && v === -1 && loser.finish !== 'spin' && !(theirs && this.rivalShapeAt > this.lastShape!.t)) text = `YOUR ${recent} BACKFIRED\n${text.split('\n').pop()}`;
      else if (theirs && v === -1 && loser.finish !== 'spin') text = `THEIR ${this.rivalShapeKind} → ${FINISH_WORD[loser.finish ?? 'spin']}\n${text.split('\n').pop()}`;
    }
    this.label.set(text);
    this.barMessage = text.split('\n')[0].replace(/!.*$/, '!');
    console.log(`[MATCH] ${this.lastCause ? `${this.lastCause} - ` : ''}${text.replace('\n', ' - ')} after ${this.elapsed.toFixed(1)} s, ${this.clashes} clash steps`);
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
    // A ghost hand shows the move: the rip at the first launch, the ramp in the first fight.
    let ghost = false;
    // The first hub: the ghost hand picks your top off its stand and carries it into the arena.
    const dock = this.phase === 'hub' && g === 'launch' && !this.demo ? this.hub.ghostFrom() : null;
    if (dock) {
      // The beacon is in the hub's space; the ghost lives in the stage's (scaled in the hub).
      const from = this.ghost.root.parent!.worldToLocal(this.hub.root.localToWorld(this.p.copy(dock)));
      const top = from.y + 0.03;
      const h = this.arena.height(0, 0);
      this.ghost.play([[0, from.x, top + 0.04, from.z, 0], [0.5, from.x, top, from.z, 0], [0.75, from.x, top, from.z, 1], [1.8, 0, h + 0.04, 0, 1], [2.1, 0, h + 0.012, 0, 1], [2.3, 0, h + 0.012, 0, 0], [3, 0, h + 0.05, 0, 0]], this.frameDt);
      ghost = true;
    }
    if (ready) {
      const x = this.mine.x;
      const z = this.mine.z;
      const h = this.arena.height(x, z);
      this.ghost.play([[0, x, h + 0.05, z, 0], [0.5, x, h + 0.015, z, 0], [0.75, x, h + 0.015, z, 1], [1.5, x, h + 0.04, z + 0.09, 1], [1.6, x, h + 0.045, z + 0.1, 0], [2.4, x, h + 0.06, z + 0.11, 0]], this.frameDt);
      ghost = true;
    }
    this.ripArrows.visible = ready;
    if (ready) {
      if (this.ripArrows.children.length === 0) {
        for (let i = 0; i < 3; i++) {
          this.ripArrows.add(new Mesh(new ConeGeometry(0.008, 0.012, 3).rotateX(Math.PI / 2), new MeshBasicMaterial({ color: GUIDE, transparent: true, depthWrite: false })));
        }
      }
      const y = this.arena.height(0, this.SPAWN) + 0.006;
      this.ripArrows.children.forEach((c, i) => {
        const k = (this.time * 0.8 + i / 3) % 1;
        c.position.set(0, y, this.SPAWN + 0.03 + k * 0.08);
        ((c as Mesh).material as MeshBasicMaterial).opacity = Math.sin(k * Math.PI);
      });
      // The rival and arena intro shows first; the rip hint follows.
      if (this.time - this.readySince > INTRO_TIME) this.label.set('Pinch over the arena where you want to launch\npull back and let go');
    }
    // Outside the first launch: after the intro, the card says what this bout is about (the arena's
    // rule and how the rival plays), and later rounds say to rip again; it is never blank while waiting.
    if (!ready && this.phase === 'ready' && !this.demo && this.time - this.readySince > INTRO_TIME && !this.label.current) {
      const first = this.myPoints === 0 && this.theirPoints === 0;
      this.label.set(first ? `${this.arena.layout.name}: ${this.arena.layout.rule ?? ''}\n${this.rival.name}: ${this.rival.style}` : `Rip again\n${this.rival.name}: ${this.rival.style}`);
    }
    // As soon as ramps work (the opening grace), so even a short round shows it.
    const bump = g === 'bump' && this.phase === 'fight' && !this.demo && this.elapsed > TUNING.grace && this.theirs.alive;
    this.bumpMark.visible = bump;
    if (bump) {
      const r = Math.hypot(this.theirs.x, this.theirs.z) || 1;
      const x = this.theirs.x - (this.theirs.x / r) * 0.035;
      const z = this.theirs.z - (this.theirs.z / r) * 0.035;
      this.bumpMark.position.set(x, this.arena.height(x, z) + 0.002, z);
      this.bumpMark.scale.setScalar(1 + 0.3 * Math.sin(this.time * 6));
      this.label.set('Pinch the floor at the ring: a ramp rises at once\ndrag to aim it at the rival');
      this.bumpHintShown = true;
      // The ghost hand: down to the ring, pinch, drag outward past the rival, let go.
      const ox = x / (Math.hypot(x, z) || 1);
      const oz = z / (Math.hypot(x, z) || 1);
      const fy = this.arena.height(x, z);
      this.ghost.play([[0, x, fy + 0.05, z, 0], [0.4, x, fy + 0.006, z, 0], [0.6, x, fy + 0.006, z, 1], [1.2, x + ox * 0.05, fy + 0.006, z + oz * 0.05, 1], [1.35, x + ox * 0.05, fy + 0.03, z + oz * 0.05, 0], [2.2, x + ox * 0.05, fy + 0.05, z + oz * 0.05, 0]], this.frameDt);
      ghost = true;
    } else if (this.phase === 'fight' && !this.demo && !this.cuppedOnce && this.progress.matches === 2 && this.elapsed > 4 && this.labelTimer <= 0 && !this.label.current) {
      this.label.set('New: jab a fingertip down into the floor\na cup opens and catches the top that rolls in');
    } else if (this.bumpHintShown && g !== 'bump') {
      // The first move is made: the hint goes.
      this.bumpHintShown = false;
      this.label.set('');
    }
    if (!ghost) this.ghost.hide();
  }

  /** XP for the round just played; level-ups flare and ring, unlocks queue to be shown. */
  private earn(won: boolean, loser: Top, matchOver: boolean, matchWon: boolean) {
    const before = this.progress.level;
    const award = this.progress.award({ won, finish: loser.finish, pocketPoints: loser.pocketPoints, perfect: this.lastPerfect && won, matchOver, matchWon, rival: this.rival.name });
    this.xpGained = award.gained;
    this.matchLog.xp += award.gained;
    this.matchLog.rounds.push(`${won ? '' : '-'}${FINISH_WORD[loser.finish ?? 'spin']}`);
    playXp();
    console.log(`[XP] +${award.gained} -> Lv ${this.progress.level} (${(this.progress.fraction * 100).toFixed(0)}%)${award.unlocked.length ? ` unlocked ${award.unlocked.join(', ')}` : ''}`);
    if (award.levels.length) {
      playLevelUp();
      for (let i = 0; i < 3; i++) this.sparks.burst((Math.random() - 0.5) * 0.1, 0.02, (Math.random() - 0.5) * 0.1, 1);
      if (COMFORT.flashes) this.pillar.play(this.arena.layout, maxRim(this.arena.layout) + 0.01, this.arena.floorHeight(1), 0xffd34a);
      this.levelUpText = `LEVEL ${this.progress.level}!\n${this.progress.rank}${this.progress.level > before + 1 ? ` (+${this.progress.level - before})` : ''}`;
      this.stamp.later(`LEVEL ${this.progress.level}!`, this.progress.rank.toUpperCase(), 'mine', 1.2, 1.5);
    }
    this.reveals.push(...award.unlocked);
    // The first session's own part goes first: the forge calls for it next.
    this.reveals.sort((a, b) => Number(b === 'tip:spur') - Number(a === 'tip:spur'));
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
    const fresh = won ? this.progress.mark(this.rival.name, (matchWon ? MARK.beaten : 0) | (ko ? MARK.knockout : 0) | (cause ? MARK.shape : 0)) : 0;
    // Beating a circuit's champion for the first time clears the circuit: a moment of its own.
    const c = circuitOf(this.rival.name);
    if (fresh & MARK.beaten && c?.champion) {
      this.stamp.later(`${c.circuit.toUpperCase()} CLEARED!`, `${this.rival.name} is beaten`, 'mine', 2.2, 1.5);
      playLevelUp();
      this.featDone(c.circuit.startsWith('Cinder') ? 'cinder' : c.circuit.startsWith('Iron') ? 'iron' : 'crown');
    }
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
    // Unlocks wait for the match's end (never between rounds), then show one after another.
    else if (!this.reveal && !this.replay && this.matchOver && this.reveals.length && this.phase === 'result' && this.resultTimer < RESULT_TIME - 1.4) {
      this.revealedHere = true;
      const key = this.reveals.shift()!;
      const obj = unlockModel(key, this.arenas);
      this.stage.add(obj);
      this.reveal = { obj, t: 0 };
      if (key.startsWith('stamp:')) playStamp();
      else playUnlock();
      this.label.set(revealText(key));
      // Keep the result up while it shows.
      this.resultTimer = Math.max(this.resultTimer, 2.8);
    }
    const r = this.reveal;
    if (!r) return;
    r.t += dt;
    // A pinch moves on to the next one.
    if ((this.hands.left.justPinched || this.hands.right.justPinched) && r.t > 0.4 && r.t < 2) r.t = 2;
    const grow = Math.min(1, r.t / 0.3);
    const leave = Math.max(0, (r.t - 2) / 0.6);
    // Low over the arena's middle, clear of the card and the match bar behind it.
    r.obj.position.set(0, 0.055 + 0.008 * Math.sin(r.t * 3) + leave * 0.3, 0.03);
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
    if (this.keys.has('KeyN') && !this.devWellHeld) this.makeCup('left', x, z);
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
  return `NEW: ${unlockName(key)}\n${unlockBlurb(key)}`;
}

/** What a new thing does, in one line (so the card says why it matters and where to try it). */
function unlockBlurb(key: string): string {
  const [kind, id] = key.split(':');
  if (kind === 'ring') return RINGS.find((r) => r.id === id)?.blurb ?? '';
  if (kind === 'core') return CORES.find((c) => c.id === id)?.blurb ?? '';
  if (kind === 'tip') return TIPS.find((t) => t.id === id)?.blurb ?? '';
  if (kind === 'seal') return `${SEAL_BLURBS[id as Seal]} · set it in the forge's Style drawer`;
  if (kind === 'arena') return ARENAS.find((a) => a.name === id)?.rule ?? 'A new arena in the rotation';
  if (kind === 'paint') return 'Try it in the forge';
  if (kind === 'emblem') return 'Pick it in the forge, Style drawer';
  return '';
}

function unlockName(key: string): string {
  const [kind, id] = key.split(':');
  if (kind === 'paint') return 'New paint';
  if (kind === 'emblem') return `${EMBLEM_NAMES[Number(id)]} emblem glow`;
  if (kind === 'ledger') return 'Gilded ledger';
  if (kind === 'rival') return `${id} rival`;
  if (kind === 'arena') return `${id} arena`;
  if (kind === 'seal') return `${SEAL_NAMES[id as Seal]} strike`;
  const name = kind === 'ring' ? RINGS.find((r) => r.id === id)?.name : kind === 'tip' ? TIPS.find((t) => t.id === id)?.name : kind === 'core' ? CORES.find((c) => c.id === id)?.name : id;
  return `${name} ${kind}`;
}

/** The model shown when something is unlocked: the part, a paint pot, or the arena's miniature. */
function unlockModel(key: string, arenas: ArenaLayout[]): Object3D {
  const [kind, id] = key.split(':');
  if (kind === 'arena') return miniArena(arenas.find((a) => a.name === id) ?? arenas[0], true);
  if (kind === 'seal') return sealModel(id as Seal);
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
