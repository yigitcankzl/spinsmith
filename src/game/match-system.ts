import { AdditiveBlending, NormalBlending, BoxGeometry, BufferGeometry, CircleGeometry, DepthOccludable, DoubleSide, EnvironmentRaycastTarget, Shape, ShapeGeometry, Vector2, Float32BufferAttribute, createSystem, CylinderGeometry, Group, Matrix4, ConeGeometry, Mesh, MeshBasicMaterial, Object3D, OcclusionShadersMode, OctahedronGeometry, PlaneGeometry, Quaternion, RaycastSpace, RingGeometry, TorusGeometry, Vector3, VisibilityState, XRAnchor, XRPlane } from '@iwsdk/core';
import type { Entity } from '@iwsdk/core';
import { CordTone, duck, setAudioFrame, ForgeLoop, playGong, playHover, playLand, playQuench, playTell, playBarFull, playCupCatch, playLocked, playMachine, playStrike, playPick, playPlace, playShapeHit, playSling, playThock, playUltimateSignature, setAudioPaused, applySound, playLevelUp, playUnlock, playXp, playBurst, playClash, playDash, playLaunch, playOver, playPocket, playResult, playStamp, playTick, playTopple, SpinHum, playTouchdown, playScrape, playMatch, playSwish, playRub } from './audio.js';
import { COMFORT, comfortSummary, nextComfort, SAFE_COLORS, toggleComfort, warnColor } from './comfort.js';
import { HandInput, HandState, Side } from './hands.js';
import { ARENAS } from './arenas.js';
import { Builder, Button, loadArenas } from './builder.js';
import { FONT, glass, GUIDE, SIGN_TILT, signTexture, TEXT, titleMesh } from './ui.js';
import { FpsBook, fpsPhase, QUALITY_LEVELS, QualityGuard } from './quality.js';
import { RIP_RELEASE, RipMeter, ripPower } from './rip.js';
import { decodeBuild, encodeBuild } from './challenge.js';
import { cloneLayout, DISPLAY_RIM, maxRim, normRadius, pocketAt, railAt, rimRadius, spawnDistance, validate } from './layout.js';
import { FORGE_GRIP_MAX_COS, forgeGripIntent, forgeGrips, HUD, hudCardZ, hudGrow } from './reach.js';
import { ECHO_KEY, encodeEcho, splitCode } from './echo.js';
import type { Echo } from './echo.js';
import type { ArenaLayout } from './layout.js';
import { CROSSGUARD_LIVE, crossguardSling, movingOut, RUB_MIN, RUB_SLACK, RUB_WINDOW_MAX, spinRub, controlSeal, crossguard, crossguardCrosses, emberBumper, EMBER_POST_TIME, EMBER_RIVAL_KICK, fingerContact, fingerTouches, FINGER_RADIUS, FLICK_HARD, palmGust, palmGustCrosses, rivalMove, sealStrike, sealTarget, SEALS, springRim, stableHeading, TELL_TIME, Arena, ATTACK, CUP_DEPTH, CUP_SIGMA, DEFENSE, finishPoints, DESK_DROP_HALF_MAX, HAMMER_TIME, MATCH_HEAT, RIVAL_RAMP_SIGMA, LAUNCH_SPEED, LAUNCH_TILT, launchSpeed, launchSpin, rankingN, roundOverN, step, stepN, STEP, TILT, Top, TopSpec, TUNING, verdict, WARD_HALF, WARD_TIME } from './sim.js';
import type { Clash, DropSide, FloorShape, RivalMove, Seal, ShapeKind } from './sim.js';
import { Forge, FORGE_SINK, itemKey, itemModel, loadBuild, ROWS, saveBuild, sealModel } from './forge.js';
import { FEATS, GUIDE_ORDER, MARK, Progress, VERB_CARD, VERB_RELEASE, verbReleasedAt } from './progress.js';
import { CLAIM, LESSON, lessonText } from './lessons.js';
import { HUB_NOTE } from './hub-copy.js';
import type { OpeningZone, ReleasedVerb } from './progress.js';
import { rematchAdvice } from './mastery.js';
import { dailyOrder, localDate, orderMet } from './orders.js';
import { addDays, comeBackCard } from './come-back.js';
import { nextArena } from './rotation.js';
import { SAVE_KEYS } from './demo-save.js';
import type { Order } from './orders.js';
import { anvilModel, Hub, standModel } from './hub.js';
import { MatchBar } from './match-bar.js';
import type { BrawlField } from './match-bar.js';
import { HandOccluder } from './hand-occluder.js';
import { handOcclusionOn } from './hand-proxy.js';
import { RoomLight } from './room-light.js';
import { edgeDistance, fitToTable, insidePoly, RIM_MARGIN } from './room.js';
import { deskSectors, deskWrenchAngle, deskWrenchSteer, inSector, rayExit } from './desk-edge.js';
import type { DeskSector } from './desk-edge.js';
import { TableTouch } from './table-touch.js';
import type { XZ } from './room.js';
import { allBuilds, buildName, edgeOf, NAMED_BUILDS, circuitOf, CIRCUITS, CORES, statsOf, EMBLEM_COLORS, EMBLEM_NAMES, PRESETS, RINGS, RIVALS, SEAL_BLURBS, SEAL_NAMES, ringOf, roleOf, specFromBuild, TIPS } from './parts.js';
import type { Rival } from './parts.js';
import type { TopBuild } from './parts.js';
import { ArenaView, ChargePips, Cord, Impacts, Label, mergeByMaterial, miniArena, OPPONENT_COLOR, ROOM, PALM, GhostHand, ShapeMarks, SOFT_SHADOW, Sparks, Pillar, Stamp, TEAM_MINE, Trails, FingerStreak, TEAM_RIVAL, TopView, WALL_HEIGHT } from './visuals.js';
import { BRASS } from './materials.js';
import type { ShapeMarkSpec } from './visuals.js';
import { behindOn, SHAPE_SIZE, SHAPING, ShapingCharges, StrikeBar } from './shaping.js';
import { CALL, callAllowed } from './calls.js';
import { PEDESTAL, pickTable, pickTablePlane, placeArena, reachSpot, TABLE_MAX_H, TABLE_MIN_H, tableRank } from './placement.js';
import type { TablePlane } from './placement.js';
import { TUNE } from './tuning.js';
import type { Placement, Point } from './placement.js';
import { applySpatialPose, loadSpatialPose, saveSpatialPose } from './spatial-state.js';
import { RoomImprints } from './room-imprints.js';
import { FirstFiveState } from '../components.js';
import { ARENA_FORGE_SHIELD, arenaForgeAim, arenaForgeDanger, arenaForgeImpulse, arenaForgeRivalAction, classifyArenaForge, deskWrenchImpulse } from './arena-forge.js';
import type { ArenaForgeAction, ArenaForgeGesture } from './arena-forge.js';
import { clampGuestSpot, guestPointsBefore, linkFromAddress, sanitizeGuestEvent } from './online.js';
import type { OnlineLink } from './online.js';
import type { GuestEvent, PackedShape, Vec3 } from './net.js';
import { BOUTS, boutSkill, CHAPTERS, MEDAL_TEXT, medalCount, medalOrder, medalsFrom, nextBout, nextGate, nightBout } from './campaign.js';
import type { Bout } from './campaign.js';
import { PERFECT_INTERRUPT_WINDOW, SUDDEN_DEATH_AT } from './gameplay-rules.js';
import { clampedGrooveX, clampedGrooveZ, grooveLength, hasGrooveIntent, GROOVE_MIN_LENGTH, PALM_CATCH_RADIUS } from './hand-tools.js';
import { brawlModeName, targetWinner } from './brawl.js';
import { clearSnapshot, loadSnapshot, RESUME_VERSION, saveSnapshot } from './match-resume.js';
import type { MatchSnapshot } from './match-resume.js';
import type { BrawlMode } from './brawl.js';
import { commitBlocker, FLICK_AFTER_RELEASE, FLICK_FOLLOW_THROUGH, GROOVE_COMMIT_DELAY, heldElsewhere, mayCommit, mayListen, RELEASE_LOCK, SHAPING_RELEASE_LOCK } from './gesture-owner.js';
import type { HandFacts, HeldTool } from './gesture-owner.js';
import forgeWheelModel from '../scene-assets/forge-wheel.scene-asset.js';

/** The arena (and everything on the table) is drawn this much larger than its simulation size. */
const ARENA_SCALE = TUNE.scale;
/** Seconds one shaping charge keeps a Spin Rub open, and the pause before rubbing can spend another. */
const RUB_WINDOW = 1.2;
const RUB_REOPEN = 0.4;
/** Fingertip distance from a live top that claims the magnetic catch gesture (arena-local m). */
const MAGNET_CATCH = 0.052;
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
/** Keep near-rim floor pinches available for ramps; only the physical outer lip claims a rim grip. */
const RIM_GRAB_MIN = 0.9;

const RESULT_TIME = 4;
/** A knockout replay: this many sim steps (2 s) recorded, played back at this speed. */
const REPLAY_STEPS = 240;
const REPLAY_SPEED = 0.4;
/** A replay step: per top x, z, angle, wobble, damage, spin, vx, vz, kick, kickX, kickZ; then the step's clash (strength, x, z). */
const REC_TOP = 11;
const REC = 2 * REC_TOP + 3;
/** A finish this soon (s) after the player's shape is credited to it. */
const CAUSE_WINDOW = 1.5;
const RIVAL_TELL_CODE: Record<RivalMove, number> = { charge: 1, quake: 2, pull: 3 };
const FINISH_WORD: Record<string, string> = { pocket: 'SLAG', over: 'THROWN', burst: 'SHATTER', spin: 'OUTLAST' };
/** Seconds the rival and arena intro shows before the first session's rip hint. */
const INTRO_TIME = 2.5;
/** A hand lost this long (s) cancels what it was doing, instead of acting as a release. */
const HAND_LOSS_GRACE = 0.28;
/** A one-hand rim pull waits this long for the other hand before it can become a spring. */
const RIM_SPRING_INTENT = 0.25;
/** An open palm must sweep this fast above the bowl before it becomes a deliberate forge gust. */
const PALM_GUST_SPEED = 0.34;
/** A palm must settle in the bowl before its next motion can count as a deliberate gust. */
const PALM_GUST_ARM_TIME = 0.12;
const PALM_GUST_ARM_SPEED = 0.16;
/** A gust is a committed move, not a free per-frame force; this keeps it tactical and readable. */
const PALM_GUST_COOLDOWN = 1.8;
/** Long enough to survive a slow emulator frame and still leave the hand's direction readable. */
const PALM_GUST_FX_TIME = 0.65;
/** The table slap lives clearly outside every rim-grab zone, so one contact can never mean both. */
const SLAP_MIN_N = 1.18;
/** Where round messages hang: small, over the arena's far rim (arena-local). */
const LABEL_AT = new Vector3(HUD.card.x, HUD.card.y, HUD.card.z);
/** At home after the first session the Smith's board fills the card's slot: notes hang just above it. */
const HOME_NOTE_Y = HUD.homeNoteY;
/** The match bar sits right under the card, its top edge on the card's lower edge (the two read as one display). */
const BAR_Y = HUD.barY;
const BAR_BACK = HUD.barBack;
/** The MENU plate's height over the arena floor (arena-local), at the rim's height like the tabs. */
const MENU_Y = 0.012;
/** The workshop shows the arena a little smaller, so its near rim stays behind the piece rail. */
const WORKSHOP_RIM = 0.13;
/** A match arena's near rim stays this far out (arena-local, as the 0.17 arenas): a bigger one slides back. */
const NEAR_RIM = 0.17;
const MOVE_WORD = { charge: 'charges', quake: 'quakes the floor', pull: 'pulls you to the pits' } as const;
/** The forge bar's color by seal, so the chosen strike shows on the wrist. */
const SEAL_COLOR: Record<Seal, number> = { anvil: 0xff8a2a, rush: 0xff4a3a, magnet: 0xc85cff, tilt: 0x7de07d, hammer: 0xffe066, ward: 0xd9d4ff };
/** The immediate tactical promise under the ultimate's name. */
const SEAL_CALL: Record<Seal, string> = {
  anvil: 'ULTIMATE · SHOCKWAVE + FORGED RIDGE',
  rush: 'ULTIMATE · FORGED CHARGE LANE',
  magnet: 'ULTIMATE · CHOSEN GRAVITY WELL',
  tilt: 'ULTIMATE · TILT THE ARENA',
  hammer: 'ULTIMATE · FORGE CRATER ×3',
  ward: 'ULTIMATE · GUARD RIDGE',
};
/** The temporary arena rule that remains after the activation burst. */
const SEAL_STATE: Record<Seal, string> = {
  anvil: 'FORGED RIDGES ACTIVE',
  rush: 'CHARGE LANE ACTIVE',
  magnet: 'GRAVITY WELL ACTIVE',
  tilt: 'ARENA TILTED',
  hammer: 'CRATER + NEXT HIT ARMED',
  ward: 'GUARDED SECTOR ACTIVE',
};
/** Rivals from level 6 set a ramp at most this often (s). */
const RIVAL_SHAPE_GAP = 3;
/** A finish your shape caused plays its visuals at SLOW_MO speed for this long (real s). */
const SLOW_MO_TIME = 0.9;
/** Seconds the placed arena takes to forge up out of the table. */
const RISE_TIME = 1.1;
/** Early lesson rounds stay alive long enough for the newly unlocked hand move. */
const LESSON_GRACE = 6;
const ARENA_FORGE_CODE: Record<ArenaForgeAction, number> = { squeeze: 1, stretch: 2, twist: 3, tilt: 4 };
const ARENA_FORGE_TITLE: Record<ArenaForgeAction, string> = {
  squeeze: 'SQUEEZE!',
  stretch: 'STRETCH!',
  twist: 'TWIST!',
  tilt: 'TILT!',
};
const ARENA_FORGE_EFFECT: Record<ArenaForgeAction, string> = {
  squeeze: 'FORCE A CLASH',
  stretch: 'RING-OUT PRESSURE',
  twist: 'SHIFT BOTH ORBITS',
  tilt: 'SEND TOPS DOWNHILL',
};
const SLOW_MO = 0.3;
/** A clash this strong (0..1) is a hard hit: big feedback and a 70-110 ms simulation-only hit stop. */
const HARD_HIT = 0.6;
/** Hard hits closer together than this (s) do not stop the simulation again. */
const HIT_STOP_GAP = 0.3;
/** A knockout's frame holds still this long (real s) before its slow motion (visuals only). */
const KO_FREEZE = 0.12;
/** Seconds between the countdown's beats (3, 2, 1, RIP!). */
const COUNT_BEAT = 0.6;
/** A pointing ray this close to a button's center (m) presses it. */
const BUTTON_REACH = 0.035;
/** Head-ray assist (Quest has no gaze source): a button held under the head ray this long lights up, and a pinch anywhere presses it. */
/** How far (arena units, about 3 cm real) a fingertip must rise off the floor before its Finger Groove commits. */
const GROOVE_LIFT = 0.012;
/** Seconds after a flick in which the swinging hand cannot leave a Finger Groove. */
const FLICK_GROOVE_QUIET = 0.8;
const HEAD_DWELL = 0.4;
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
/** How close a pinch must be to the floating seal, and how low it must be pressed to stamp. */
const SEAL_GRAB = 0.065;
const SEAL_STAMP_H = 0.026;
/** One desk rescue per round: catch the still-spinning top and draw it back to the rim. */
const OUTER_RING_TIME = 5;
const OUTER_RAIL_POINTS = 48;
const OUTER_RAIL_STEP = 0.008;
const OUTER_RAIL_WIDTH = 0.0045;
/** A rival crossing the detected real table edge adds this much heat after a normal ring-out. */
const DESK_KO_BONUS = 1;
/** Maximum real seconds to wait for a thrown rival to settle on, or leave, the detected table. */
const DESK_VERDICT_TIME = 3.5;


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
  private rootEntity?: Entity;
  /** Session-only judge/tester evidence: placement → match → rip → intervention → result → forge. */
  private firstFiveStep = 0;
  /** Coarse information layer mirrored to ECS; avoids several panels competing in one phase. */
  private uiLayerCode = -1;
  /** One readable hand verb at a time: idle, aim, pinch, pull, impact or recover. */
  private handPresentationCode = -1;
  private handEmphasisValue = -1;
  private handRecoverUntil = -1;
  private interventionCount = 0;
  private failedGestures = 0;
  private arenaForgeCancels = 0;
  private arenaForgeAction: ArenaForgeAction | 'none' = 'none';
  private arenaForgeSwing = 0;
  /** Open-palm horizontal sweep: short state for readable feedback and a per-hand motion sample. */
  private palmGustTime = 0;
  private palmGustCooldown = 0;
  private palmGustSide: Side | null = null;
  /** Fingertip collider: last arena-local tip and its smoothed velocity, per hand. */
  private flickPrev: Record<Side, Vector3 | null> = { left: null, right: null };
  private flickVel: Record<Side, Vector3> = { left: new Vector3(), right: new Vector3() };
  private flickTip = new Vector3();
  private flickRaw = new Vector3();
  private flickCount = 0;
  /** The strongest power reached during the current pull (for the LET GO WHILE MOVING cue). */
  private pullPeakPower = 0;
  /** A drawn groove waits a beat after the lift: a pinch in that beat means the finger was reaching for a ramp. */
  private pendingGroove: Record<Side, { sx: number; sz: number; ex: number; ez: number; at: number } | null> = { left: null, right: null };
  /** The last flick, for the emulator probes: speed handed over and its direction. */
  private lastFlick = { gain: 0, dx: 0, dz: 0, rival: false };
  /** One swing is one flick: the follow-through cannot catch the same top again. */
  private flickReadyAt: Record<Side, number> = { left: -9, right: -9 };
  /** When each hand last flicked (this.time). */
  private flickAt: Record<Side, number> = { left: -9, right: -9 };
  /** Spin Rub: the paid window's end and when the next charge may open one (this.time). */
  private rubUntil = -9;
  private rubReadyAt = -9;
  /** Spin this window has rubbed in (negative when braking) and the charge's force. */
  private rubGain = 0;
  private rubPower = 0;
  private rubStamped = false;
  private rubFlashAt = -9;
  private rubSoundAt = -9;
  /** Guest only: rubbed spin not yet sent to the host, and when it last went. */
  private rubPending = 0;
  private rubSentAt = -9;
  /** Host only: the guest's current rub window and the spin it has rubbed in it. */
  private guestRubUntil = -9;
  private guestRubSum = 0;
  private guestRubSaidAt = -9;
  private palmGustDirection = new Vector2();
  private palmGustLength = 0;
  private palmGustHits = 0;
  private palmGustLast: Record<Side, Vector3> = { left: new Vector3(), right: new Vector3() };
  private palmGustOrigin: Record<Side, Vector3> = { left: new Vector3(), right: new Vector3() };
  private palmGustAge: Record<Side, number> = { left: 0, right: 0 };
  private palmGustSampled: Record<Side, boolean> = { left: false, right: false };
  /** A released pinch owns the hand briefly, so withdrawing it cannot become a second gesture. */
  private palmGustBlockedUntil: Record<Side, number> = { left: -9, right: -9 };
  /** A released held tool owns its fingertip follow-through, so it cannot draw a Cup or Groove. */
  private shapingBlockedUntil: Record<Side, number> = { left: -9, right: -9 };
  /** Release ownership lasts until the fingertip visibly leaves the surface, not just for a timer. */
  private shapingNeedsClearance: Record<Side, boolean> = { left: false, right: false };
  private palmGustCount = 0;
  private lowestFps = 0;
  private fpsWindowTime = 0;
  private fpsWindowFrames = 0;
  private arena = new Arena();
  private arenaView = new ArenaView(PEDESTAL / ARENA_SCALE);
  /** Everything that tilts with a rocking dish: the arena and what is on it. */
  private stage = new Group();
  private stageEntity?: Entity;
  /** A viewer hit-test probe. IWSDK moves it to the real surface under the player's gaze. */
  private placementProbe = Object.assign(new Group(), { visible: false });
  private placementUp = new Vector3();
  private placementQ = new Quaternion();
  private anchorPoseApplied = false;
  private anchorRequestedAt = 0;
  private anchorConfirmed = false;
  private spatialDirty = false;
  /** Ultimates leave a compact, persistent history on the player's real table. */
  private roomImprints = new RoomImprints((-PEDESTAL + 0.003) / ARENA_SCALE);
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
  /** The last three rivals thrown across the physical desk edge, batched into a small trophy row. */
  private deskMemory = new Group();
  /**
   * Real-edge cue: up to two warm arcs on the rim facing where the real table edge is close, so a
   * DESK KO can be aimed. Sectors are in the arena root's local frame (see updateDeskEdge).
   */
  private deskArcs = [0, 1].map(() => {
    const m = new Mesh(new RingGeometry(0.1, 0.11, 8), new MeshBasicMaterial({ color: 0xff5a1e, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }));
    m.name = 'desk-edge-arc';
    m.visible = false;
    m.renderOrder = 3;
    return m;
  });
  private deskEdgeSectors: DeskSector[] = [];
  /** The sim's drop sides (Arena.drops), one per red arc, reused every frame. */
  private deskDrops: DropSide[] = [{ angle: 0, half: 0 }, { angle: 0, half: 0 }];
  /** The detected desk's outline in arena-local space (dev throws aim at the most desk). */
  private deskEdgePoly: XZ[] | null = null;
  private deskEdgeKey = '';
  /**
   * The first match's staged DESK KO: armed for the forge-lesson round, the rival is steered to
   * the rim facing the nearest real edge and the first forge throws it straight across that edge.
   * `fired` lengthens that DESK KO's slow motion.
   */
  private deskWrench = { armed: false, fired: false };
  /** progress.matches value of the match whose REAL EDGE hint has been shown. */
  private deskEdgeHintMatch = -1;
  private deskMemoryBatch: Group | null = null;
  private deskMemoryViews: TopView[] = [];
  private deskMemoryKey = '';
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
  /** Read-only dev evidence mirrored from Forge's held-top state. */
  private palmForgeActive = false;
  /** A demo round from the workshop's Try it: AI launches, no score, then back to the workshop. */
  private demo = false;
  /** Emulator probes: every released verb without changing the match count (shields, tells). */
  private everyVerb = false;
  private hubLogPending = false;
  /** The word in the middle of the match bar. */
  private barMessage = '';
  /** This match's rival: its build and spin stay for every round. */
  private rival: Rival = RIVALS[0];
  /** Points the match bar shows (kept after a match is decided), XP just earned, the last rip. */
  private barPoints: [number, number] = [0, 0];
  /** First-match lesson: one new arena verb per round (ramp, two-hand forge, ultimate). */
  private tutorialRound = 0;
  /** This match is the first one (kept through its verdict, when progress already counts it): see quietFirst. */
  private quietMatch = false;
  /** The signature two-hand arena move has happened at least once this session. */
  private morphedOnce = false;
  private xpGained = 0;
  private lastPerfect = false;
  /** Today's Smith Order, whether this match plays it, and what the order needs to know. */
  private order: Order | null = null;
  private orderMatch = false;
  private cupCaughtInRound = false;
  private perfectInMatch = false;
  private levelUpText = '';
  private perfTimer = 0;
  private paused = false;
  /** Seconds the pulling hand has been untracked. */
  private lostFor = 0;
  /** Brief tracking holes must not erase an arena gesture that is visibly still being held. */
  private shapeLost: Record<Side, number> = { left: 0, right: 0 };
  private arenaMorphLost = 0;
  private overforgeLost = 0;
  private outerRailLost = 0;
  /** When the current ready phase began (for the intro before the first rip hint). */
  private readySince = 0;
  /** Seconds left of the simulation-only pause after a hard hit. */
  private hitStop = 0;
  private lastHardHit = -1;
  private impacts = new Impacts();
  private trails = new Trails();
  private fingerStreak = new FingerStreak();
  /** Per hand: the swing is above flick speed (for one whoosh per swing). */
  private swinging: Record<Side, boolean> = { left: false, right: false };
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
  /** The come-back card (streak, tomorrow) still to show on this match's result. */
  private comeBackPending = false;
  private rewardHold = 0;
  /** Home screen buttons, in front of the arena; and the small MENU plate during a match. */
  /** Home: the smithy stations around the arena (top stand, arena rack, anvil). */
  private hub = new Hub();
  private menuButton = new Button('menu', 0.07, 0.026);
  private rematchButton = new Button('rematch', 0.105, 0.026);
  /** Pass and play: the next smith on this headset fights the top and the hands of the match just played. */
  private passButton = new Button('pass', 0.085, 0.026);
  /** Online/pass play: three choices whose exact parts stay hidden until the rip. */
  private deckButtons = [0, 1, 2].map((i) => new Button(`deck${i}`, 0.096, 0.024));
  private deckBuilds: TopBuild[] = [];
  private deckChoice = -1;
  private deckPrompted = false;
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
    pinchSmooth: new Vector3(),
    index: new Vector3(),
    indexSmooth: new Vector3(),
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
  /** One spin hum per top: yours, the rival's, and a brawl's two extra seats (silent otherwise). */
  private hums = [new SpinHum(230), new SpinHum(190), new SpinHum(260), new SpinHum(165)];
  private humLive = [false, false, false, false];
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
  /** A second orange guide exists only for the first two-hand arena-forge lesson. */
  private forgeGhost = new GhostHand();
  /** The rival's cyan projection: it authors the telegraphed launch and arena moves. */
  private rivalGhost = new GhostHand(0x9cecff, 0x4fd1ff);
  /** Online: the other smith's second hand (the rival ghost shows the first). */
  private netGhost = new GhostHand(0x9cecff, 0x4fd1ff);
  private rivalGhostKeys: number[][] = [[0, 0, 0, 0, 0], [1, 0, 0, 0, 0]];
  private rivalGhostFor = 0;
  /** Big stamped words over the arena: rounds, finishes, the rip. */
  private stamp = new Stamp(0.2);
  /** The arena forging up out of the table after placing (0..1), and the title over it. */
  private rise = 1;
  /** The strike's seal coin, rising off your top as it lands. */
  private sealPop = Object.assign(new Group(), { visible: false });
  /** Seal coins are built once; an activation only reparents one cached model. */
  private sealPopModels = Object.fromEntries(SEALS.map((seal) => [seal, sealModel(seal)])) as Record<Seal, Object3D>;
  /** A full forge bar lifts a physical seal that can be pinched and stamped onto the arena. */
  private overforgeSeal = Object.assign(new Group(), { visible: false });
  private overforgeModels = Object.fromEntries(SEALS.map((seal) => [seal, sealModel(seal)])) as Record<Seal, Object3D>;
  private overforgeRing = new Mesh(
    new RingGeometry(0.023, 0.03, 40).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.82, blending: AdditiveBlending, depthWrite: false }),
  );
  private overforgeHeld: Side | null = null;
  private overforgeControl: { side: Side; seal: Seal; t: number } | null = null;
  /** Public dev evidence: idle, ready, held, or the seal currently being steered. */
  private overforgeMode = 'idle';
  /** Where each low, flat open hand rests on the rim (radians); two of them make a Crossguard. */
  private palmRailAngles: Record<Side, number | null> = { left: null, right: null };
  private palmRailGrace: Record<Side, number> = { left: 0, right: 0 };
  /** Two flat palms on the rim join into one finite, one-hit rail across the bowl. */
  private crossguardActive = false;
  private crossguardConsumed = false;
  /** A paid rail stays live until then (arena time); the rival can be slung across it once. */
  private crossguardLiveUntil = -9;
  private crossguardSlung = false;
  private crossguardHits = 0;
  private crossguardBreak = 0;
  private crossguardA = new Vector3();
  private crossguardB = new Vector3();
  private crossguardBeam = Object.assign(
    new Mesh(new BoxGeometry(1, 0.008, 0.006), new MeshBasicMaterial({ color: 0xffa12d, transparent: true, opacity: 0.82, blending: AdditiveBlending, depthWrite: false, toneMapped: false })),
    { visible: false },
  );
  private crossguardGlow = Object.assign(
    new Mesh(new BoxGeometry(1, 0.016, 0.014), new MeshBasicMaterial({ color: 0xff5a0a, transparent: true, opacity: 0.22, blending: AdditiveBlending, depthWrite: false, toneMapped: false })),
    { visible: false },
  );
  private crossguardPosts = (['left', 'right'] as const).map(() => Object.assign(
    new Mesh(new CylinderGeometry(0.01, 0.014, 0.032, 12), new MeshBasicMaterial({ color: 0xffc267, transparent: true, opacity: 0.86, blending: AdditiveBlending, depthWrite: false, toneMapped: false })),
    { visible: false },
  ));
  /** A literal wheel outside the near rim turns the arena current; it cannot collide with floor pinches. */
  private forgeWheel = Object.assign(forgeWheelModel.clone(true), { visible: false });
  private forgeWheelHandle = this.forgeWheel.getObjectByName('ForgeWheelHandle')!;
  private forgeWheelHeld: Side | null = null;
  private forgeWheelLastAngle = 0;
  private forgeWheelTurn = 0;
  private forgeWheelStartRotation = 0;
  private forgeWheelCooldown = 0;
  private forgeWheelCurrentTime = 0;
  private forgeWheelDirection = 0;
  private forgeWheelHandLocal = new Vector3();
  private forgeWheelHandleWorld = new Vector3();
  /** Last real pinch-to-handle gap, retained for emulator/device usability evidence. */
  private forgeWheelGrabGap = -1;
  private forgeWheelCurrent = (() => {
    const group = Object.assign(new Group(), { visible: false });
    for (let i = 0; i < 3; i++) {
      const arc = new Mesh(
        new TorusGeometry(0.055 + i * 0.032, 0.0028, 6, 36, Math.PI * 1.35).rotateX(Math.PI / 2),
        new MeshBasicMaterial({ color: i === 1 ? 0xffd08a : 0xff7a1a, transparent: true, opacity: 0.62 - i * 0.12, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
      );
      arc.rotation.y = i * 0.75;
      arc.renderOrder = 8;
      group.add(arc);
    }
    return group;
  })();
  /** A hard clash throws one catchable rivet toward the player; carrying it back authors a bumper. */
  private emberState: 0 | 1 | 2 | 3 = 0;
  private emberSpawned = false;
  private emberHeld: Side | null = null;
  private emberFlight = 0;
  private emberLost = 0;
  private emberFrom = new Vector3();
  private emberHome = new Vector3();
  private emberHandLocal = new Vector3();
  private emberWorld = new Vector3();
  private emberBumperAt = new Vector3();
  private emberPostUntil = 0;
  private emberGrabGap = -1;
  private emberPickup = (() => {
    const group = Object.assign(new Group(), { visible: false });
    const core = new Mesh(new OctahedronGeometry(0.01, 0), new MeshBasicMaterial({ color: 0xffd38a, toneMapped: false }));
    const halo = new Mesh(new TorusGeometry(0.017, 0.0025, 6, 24), new MeshBasicMaterial({ color: 0xff5a0a, transparent: true, opacity: 0.75, blending: AdditiveBlending, depthWrite: false, toneMapped: false }));
    halo.name = 'EmberCatchHalo';
    core.renderOrder = halo.renderOrder = 10;
    group.add(core, halo);
    return group;
  })();
  private emberBumperFx = (() => {
    const group = Object.assign(new Group(), { visible: false });
    const rivet = new Mesh(new CylinderGeometry(0.012, 0.017, 0.024, 12), new MeshBasicMaterial({ color: 0xb96822, toneMapped: false }));
    const ring = new Mesh(new RingGeometry(0.018, 0.025, 28).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.72, blending: AdditiveBlending, depthWrite: false, toneMapped: false }));
    ring.position.y = -0.01;
    rivet.renderOrder = ring.renderOrder = 9;
    group.add(rivet, ring);
    return group;
  })();
  /** One draw call: two true-width rails plus three chevrons show the exact gust corridor. */
  private palmGustFx = (() => {
    const vertices: number[] = [];
    const bar = (ax: number, az: number, bx: number, bz: number, half: number) => {
      const dx = bx - ax;
      const dz = bz - az;
      const d = Math.hypot(dx, dz) || 1;
      const nx = (-dz / d) * half;
      const nz = (dx / d) * half;
      vertices.push(
        ax + nx, 0, az + nz, ax - nx, 0, az - nz, bx + nx, 0, bz + nz,
        bx + nx, 0, bz + nz, ax - nx, 0, az - nz, bx - nx, 0, bz - nz,
      );
    };
    bar(0, -0.065, 1, -0.065, 0.003);
    bar(0, 0.065, 1, 0.065, 0.003);
    for (const x of [0.28, 0.52, 0.76]) {
      bar(x - 0.035, -0.026, x + 0.018, 0, 0.004);
      bar(x - 0.035, 0.026, x + 0.018, 0, 0.004);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    return Object.assign(
      new Mesh(geometry, new MeshBasicMaterial({ color: 0xffad42, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false })),
      { visible: false },
    );
  })();
  /** A short rim pulse shows where the hand-authored force leaves the bowl. */
  private palmGustRim = Object.assign(
    new Mesh(
      new RingGeometry(0.164, 0.172, 32, 1, -0.32, 0.64).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ color: 0xff7a20, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false }),
    ),
    { visible: false },
  );
  /** A short-lived, arena-sized cause → target cue; unlike the seal coin it never covers the tops. */
  private ultimateCue = { t: 0, age: 0, seal: 'anvil' as Seal, ox: 0, oz: 0, fx: 0, fz: 0, tx: 0, tz: 0 };
  private ultimatePath = Object.assign(
    new Mesh(
      new PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, -0.5),
      new MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.7, blending: AdditiveBlending, depthWrite: false }),
    ),
    { visible: false },
  );
  private ultimateTarget = Object.assign(
    new Mesh(
      new RingGeometry(0.04, 0.052, 40).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false }),
    ),
    { visible: false },
  );
  private ultimateArrow = (() => {
    const shape = new Shape().moveTo(0, 0.034).lineTo(-0.024, -0.018).lineTo(0.024, -0.018).closePath();
    return Object.assign(
      new Mesh(new ShapeGeometry(shape).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false })),
      { visible: false },
    );
  })();
  /** Arena-wide ultimate feedback: three floor pulses, eight radial seams, and one vertical field wall. */
  private ultimateArenaFx = Object.assign(new Group(), { visible: false });
  private ultimateArenaRings = [0, 1, 2].map(() => new Mesh(
    new RingGeometry(0.055, 0.062, 64).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }),
  ));
  private ultimateArenaSeams = Array.from({ length: 8 }, (_, i) => {
    const seam = new Mesh(
      new PlaneGeometry(0.004, 0.14).rotateX(-Math.PI / 2).translate(0, 0, -0.07),
      new MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }),
    );
    seam.rotation.y = (i / 8) * Math.PI * 2;
    return seam;
  });
  private ultimateArenaWall = new Mesh(
    new CylinderGeometry(0.15, 0.15, 0.035, 64, 1, true),
    new MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }),
  );
  private ultimateRushChevrons = [0, 1, 2].map(() => {
    const shape = new Shape().moveTo(0, 0.018).lineTo(-0.012, -0.012).lineTo(0, -0.005).lineTo(0.012, -0.012).closePath();
    return new Mesh(new ShapeGeometry(shape).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: SEAL_COLOR.rush, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }));
  });
  private ultimateHammerArcs = [0, 1, 2].map((_, i) => {
    const arc = new Mesh(new TorusGeometry(0.035, 0.0022, 6, 24, Math.PI * 0.55).rotateX(Math.PI / 2), new MeshBasicMaterial({ color: SEAL_COLOR.hammer, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }));
    arc.rotation.y = (i / 3) * Math.PI * 2;
    return arc;
  });
  private ultimateWardSector = new Mesh(
    new RingGeometry(0.14, 0.15, 48, 1, -WARD_HALF, WARD_HALF * 2).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: SEAL_COLOR.ward, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }),
  );
  private ultimateWardCage = (() => {
    const g = new Group();
    const mat = new MeshBasicMaterial({ color: SEAL_COLOR.ward, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
    const geo = new TorusGeometry(0.027, 0.0018, 6, 36);
    const horizontal = new Mesh(geo, mat);
    horizontal.rotation.x = Math.PI / 2;
    const verticalA = new Mesh(geo, mat);
    const verticalB = new Mesh(geo, mat);
    verticalB.rotation.y = Math.PI / 2;
    g.add(horizontal, verticalA, verticalB);
    return g;
  })();
  /** A rival's tell drawn on the floor: the lane of a charge, the line of a pull toward its pit. */
  private lane = new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, -0.5), new MeshBasicMaterial({ color: 0x4fd1ff, transparent: true, opacity: 0.5, blending: AdditiveBlending, depthWrite: false }));
  /** Cyan says where the rival's move travels; orange says where the player's hands can answer. */
  private rivalTellFx = Object.assign(new Group(), { visible: false });
  private rivalTellTarget = new Mesh(
    new RingGeometry(0.026, 0.034, 40).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0x4fd1ff, transparent: true, opacity: 0.82, blending: AdditiveBlending, depthWrite: false }),
  );
  private rivalTellGuard = new Mesh(
    new RingGeometry(0.032, 0.04, 40).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0xff9a32, transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false }),
  );
  private rivalTellChevrons = [0, 1, 2].map(() => {
    const arrow = new Shape().moveTo(0, 0.014).lineTo(-0.009, -0.009).lineTo(0, -0.004).lineTo(0.009, -0.009).closePath();
    return new Mesh(
      new ShapeGeometry(arrow).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ color: 0x4fd1ff, transparent: true, opacity: 0.88, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }),
    );
  });
  private rivalTellQuake = [0, 1, 2].map(() => new Mesh(
    new RingGeometry(0.035, 0.041, 48).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0x4fd1ff, transparent: true, opacity: 0.7, blending: AdditiveBlending, depthWrite: false }),
  ));
  private rivalTellCode = 0;

  /** The hand-authored floor, its impact, and the finish stay joined by one warm trace. */
  private causeFx = Object.assign(new Group(), { visible: false });
  private causePath = new Mesh(
    new PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, -0.5),
    new MeshBasicMaterial({ color: 0xff9a32, transparent: true, opacity: 0.72, blending: AdditiveBlending, depthWrite: false }),
  );
  private causeOrigin = new Mesh(
    new RingGeometry(0.018, 0.025, 36).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0xff9a32, transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false }),
  );
  private causeTarget = new Mesh(
    new RingGeometry(0.025, 0.034, 40).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0xffc466, transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false }),
  );
  private causeCue = { t: 0, stage: 0 as 0 | 1 | 2 | 3, kind: '', sx: 0, sz: 0, tx: 0, tz: 0 };
  private firstHeroRamp = false;
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
  /** The frame-rate guard (src/game/quality.ts): steps rendering down and back up; never the sim. */
  private quality = new QualityGuard();
  private qualityLog: string[] = [];
  private fpsBook = new FpsBook();
  private lastFps = 0;
  /** `?fps`: a world-locked readout beside MENU (fps, lowest, draw calls, quality level). */
  private fpsOverlay: { mesh: Mesh; canvas: HTMLCanvasElement; tex: ReturnType<typeof signTexture> } | null = null;
  private get lite() {
    return this.quality.level >= 1;
  }
  /** The last finish's cause, for the log ("YOUR RAMP → SLAG"). */
  private lastCause = '';
  /** When Menu was pinched once during a match (a second pinch within 3 s leaves). */
  private menuArmed = -10;
  /** The rival's entrance at a match's start (s into it), and the VS words it lands with. */
  private entrance: { t: number; vs: string; sub: string; champion: boolean; from?: Vector3 } | null = null;
  private portal = Object.assign(new Mesh(new RingGeometry(0.7, 1, 48), new MeshBasicMaterial({ color: 0x4fd1ff, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide })), { visible: false });
  private portalCore = Object.assign(new Mesh(new CircleGeometry(0.7, 48), new MeshBasicMaterial({ color: 0x0a1a24, transparent: true, opacity: 0.85, depthWrite: false, side: DoubleSide })), { visible: false });
  /** The exact pinch point projected onto the arena, so the preview and the eventual action agree. */
  private handAt = new Vector3();
  /** The fingertip has its own target: an open-hand press catches beside a top while pinch shapes. */
  private handTipAt = new Vector3();
  /** handFacts() scratch: never shared with a caller's vectors. */
  private factTip = new Vector3();
  private factTipSmooth = new Vector3();
  /** The One-Euro pinch in arena space, where a shaping pinch lands and aims (toLocal reuses its vector). */
  private pinchAim = new Vector3();
  private factWrist = new Vector3();
  private factPalm = new Vector3();
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
  /** The armed fingertip: hot while a charge can pay for a flick, cold grey when only a nudge is left. */
  private flickGlows = (['left', 'right'] as const).map(() => {
    // depthTest off: it sits at the real fingertip, so the hand occluder would hide it.
    const m = new Mesh(new OctahedronGeometry(1, 2), new MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false, depthTest: false }));
    m.renderOrder = 14;
    m.visible = false;
    return m;
  });
  private flickHintShown = false;
  /** Until when the ghost fingertip swings through the rival after the flick hint (stage time). */
  private flickGhostUntil = -9;
  /** A small surface response under an engaged hand. It confirms contact without decorating idle hands. */
  private handContactRings = (['left', 'right'] as const).map(() => {
    const mesh = new Mesh(
      new RingGeometry(0.68, 1, 40).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({
        color: 0xff9a32,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
      }),
    );
    mesh.renderOrder = 12;
    mesh.visible = false;
    return mesh;
  });
  /** One hand-sized hidden shard per campaign bout; pinch it to keep it between sessions. */
  private secretRelic = (() => {
    const g = new Group();
    const glow = new MeshBasicMaterial({ color: 0xb875ff, transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false });
    const core = new Mesh(new OctahedronGeometry(0.011, 0), glow);
    const halo = new Mesh(new TorusGeometry(0.018, 0.0015, 6, 28), glow);
    halo.rotation.x = Math.PI / 2;
    g.add(core, halo);
    g.visible = false;
    return g;
  })();
  /** Plays one quiet tick when a hand first enters the arena's actionable near-surface band. */
  private handHover: Record<Side, boolean> = { left: false, right: false };
  private handHoverClaim: Record<Side, '' | 'RAMP' | 'RIM' | 'FORGE' | 'CATCH' | 'SLING'> = { left: '', right: '' };
  /** Molten handprints left on the desk by strikes (a small pool). */
  private palmPrints = [0, 1, 2].map(() => Object.assign(new Mesh(new PlaneGeometry(0.075, 0.075), new MeshBasicMaterial({ map: PALM, transparent: true, depthWrite: false, blending: AdditiveBlending })), { visible: false }));
  private nextPrint = 0;
  /** Scorches on the desk where thrown tops landed (a small pool). */
  private scorches = [0, 1, 2, 3].map(() => Object.assign(new Mesh(new PlaneGeometry(0.045, 0.045), new MeshBasicMaterial({ map: SOFT_SHADOW, color: 0xff6a1a, transparent: true, depthWrite: false, blending: AdditiveBlending })), { visible: false }));
  private nextScorch = 0;
  /** This round's off-the-desk moment has been shown. */
  private offDeskShown = false;
  /** A rival ring-out whose final score waits for the real table to accept or reject the top. */
  private deskVerdict: { v: 1; left: number; edge?: boolean } | null = null;
  /** Observable after the result: this round really earned the extra desk-edge heat. */
  private deskKoScored = false;
  /** 0 idle, 1 rim hit, 2 crossing the desk, 3 real edge crossed. */
  private deskKoStage = 0;
  private deskKoTrailT = 0;
  /** Heat awarded by the last resolved round, kept visible after a match resets its running score. */
  private lastRoundHeat = 0;
  /** Reused output of the rival's table-edge prediction; avoids allocating in the fight loop. */
  private deskAvoidX = 0;
  private deskAvoidZ = 0;
  /** The last REPLAY_STEPS sim steps of both tops and their clashes (REC floats a step), a ring buffer. */
  private replayBuf = new Float32Array(REPLAY_STEPS * REC);
  private replayAt = 0;
  private replayCount = 0;
  /** A knockout replay playing (in recorded steps, at REPLAY_SPEED), with stand-in tops to draw. */
  private replay: { t: number; frames: Float32Array; n: number; out: [Top, Top]; at: number } | null = null;
  /** A knockout's still frame (s left), and the last light hit's punch on the tops (sim s). */
  private koFreeze = 0;
  private lastPop = -1;
  /** The countdown before a round (3, 2, 1, RIP!): time and the next beat, or null. */
  private count: { t: number; beat: number } | null = null;
  private ghosts: [Top, Top] = [new Top(ATTACK), new Top(DEFENSE)];
  /** The turntable's turn during a replay (radians). */
  private turn = 0;
  /** This match so far, for the report at home: each round's finish (- = the rival's), best rip, XP. */
  private matchLog = { rounds: [] as string[], rip: 0, xp: 0, won: false, score: '' };
  /** Where this match's current round started (match-resume.ts): written on pause, session end and page hide. */
  private resumeSnap: MatchSnapshot | null = null;
  private title = titleMesh('SPINSMITH', 0.26, 0.06);
  private titleShown = false;
  private titleT = 0;
  /** What waits for the title to go (the no-table notice). */
  private afterTitle: (() => void) | null = null;
  /** A ring around your top while a Hammer is armed (gold) or a Ward holds (pale violet). */
  private aura = new Mesh(new TorusGeometry(0.024, 0.0025, 8, 48).rotateX(Math.PI / 2), new MeshBasicMaterial({ color: 0xffe066, transparent: true, depthWrite: false, blending: AdditiveBlending }));
  private label = new Label();
  private round = 0;
  /** Match score in heat: first to MATCH_HEAT wins the match. */
  private myPoints = 0;
  private theirPoints = 0;
  private elapsed = 0;
  private pressureShown = false;
  private strikeWindowShown = false;
  private accumulator = 0;
  private resultTimer = 0;
  private time = 0;
  private frameDt = 0;
  /** Which hand holds the cord, and pull bookkeeping. */
  private puller: Side | null = null;
  private maxPull = 0;
  private peakSpeed = 0;
  private lastPull = 0;
  /** The free hand may hold the launcher steady while the other hand rips. */
  private bracedLaunch = false;
  /** Open palm currently carrying the launch cradle; the opposite hand owns the rip cord. */
  private palmLauncherSide: Side | null = null;
  /** Dev-driver reason string for a missed palm-launch probe. */
  private palmLauncherDebug = 'idle';
  private launcherBrace = (() => {
    const g = new Group();
    const metal = new MeshBasicMaterial({ color: 0xffa23f, transparent: true, opacity: 0.72, blending: AdditiveBlending, depthWrite: false });
    const cradle = new Mesh(new TorusGeometry(0.032, 0.003, 7, 32).rotateX(Math.PI / 2), metal);
    const body = new Mesh(new CylinderGeometry(0.019, 0.024, 0.035, 12), metal);
    body.position.y = 0.016;
    g.add(cradle, body);
    g.visible = false;
    return g;
  })();
  /** Per-hand bump being held: arena-local anchor and the pinch height when grabbed. */
  /**
   * A ramp being made by each hand: locked start point, pinch height and position at the start,
   * time held, near or far (ray), and its current height and push direction (the ghost).
   */
  /** Each hand's ramp in the making: where, since when, and the live shape once it is set. */
  private shaping: Record<Side, { x: number; z: number; sx: number; sz: number; t: number; far: boolean; amp: number; dx: number; dz: number; shape: FloorShape | null } | null> = { left: null, right: null };
  /** The rim is pulled inward and released as a defensive spring rail. */
  private rimPulls: Record<Side, { x: number; z: number; sx: number; sz: number; started: number } | null> = { left: null, right: null };
  /** Kept public for old capture scripts; the Spring Rail is now a normal arena verb. */
  private readonly rimExperiment = true;
  private rimSpringGuides = (['left', 'right'] as const).map(() => Object.assign(
    new Mesh(
      new PlaneGeometry(0.058, 0.014).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ color: 0xff9a32, transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }),
    ),
    { visible: false },
  ));
  /** Real-table second chance: a rail drawn from a thrown top back into the arena. */
  private outerRingState: 'idle' | 'rescue' | 'palm' | 'returned' | 'failed' = 'idle';
  private outerRingUsed = false;
  private outerRingCompleted = false;
  private outerRingLeft = 0;
  private outerRingSpin = 0;
  private outerRailSide: Side | null = null;
  private outerRailCount = 0;
  private outerRailLength = 0;
  private outerRailPath = new Float32Array(OUTER_RAIL_POINTS * 2);
  private outerRailPositions = new Float32Array((OUTER_RAIL_POINTS - 1) * 6 * 3);
  private outerRailGeometry = new BufferGeometry();
  private outerRail = Object.assign(new Group(), { visible: false });
  private outerRailMesh = new Mesh(
    this.outerRailGeometry,
    new MeshBasicMaterial({ color: 0xff5a10, transparent: true, opacity: 0.86, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }),
  );
  private outerRailHead = new Mesh(
    new RingGeometry(0.012, 0.017, 32).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0xffd090, transparent: true, opacity: 0.95, blending: AdditiveBlending, depthWrite: false }),
  );
  /** Root-local rescue target and rim goal, exposed to the emulator driver without allocating. */
  private outerRingAt = new Vector3();
  private outerRingGoal = new Vector3();
  /** Observable competition-feature states for captures and regression probes. */
  private anchorState: 'unsupported' | 'restoring' | 'anchored' = 'restoring';
  private arenaMorph = { scaleX: 1, scaleZ: 1, tilt: 0 };
  private arenaMorphing = false;
  /** Holds the visible deformation for one readable beat after release. */
  private arenaMorphHold = 0;
  /** Released deformation used by the damped visual spring; combat already received its impulse. */
  private arenaMorphRelease = { scaleX: 1, scaleZ: 1, tilt: 0, twist: 0 };
  private arenaMorphStart = { distance: 1, angle: 0 };
  private arenaMorphPull = 0;
  private arenaMorphTwist = 0;
  private arenaMorphA = new Vector3();
  private arenaMorphB = new Vector3();
  /** One-hand forge (comfort mode): the real hand's side and its grip height; the mirrored partner's point. */
  private oneHand: { side: Side; y: number } | null = null;
  private oneHandPinch = new Vector3();
  private oneHandAt = -1;
  private lockedSaidAt = -9;
  private lockedAt = -9;
  private passHinted = false;
  private arenaMorphShove = { x: 0, z: 0, t: 0 };
  private gazeAssist = { active: false, target: '' };
  /** The button under the head ray, since when, and when it was last seen there (pickButton runs per button set). */
  private headDwell = { id: '', since: 0, seen: -1 };
  /** A fingertip pressed into the floor already made its well (until it lifts out). */
  private pressing: Record<Side, boolean> = { left: false, right: false };
  /** An open fingertip touching and sliding across the floor; it becomes a one-use groove on lift. */
  private grooving: Record<Side, { sx: number; sz: number; x: number; z: number; active: boolean } | null> = { left: null, right: null };
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
  private rivalMarks = new ShapeMarks(0x4fd1ff, 6, 6);
  /** After a finish your shape caused, the visuals play slowly for a moment (real seconds left). */
  private slowMo = 0;
  private marks = new ShapeMarks(0xff8a2a, 10);
  private pips = new ChargePips(SHAPING.charges);
  /** The player's last shape (fight time and kind), to name it when it decides a round. */
  private lastShape: { t: number; kind: ShapeKind | 'sling' | 'strike' | 'parry' | 'flick' | ArenaForgeAction } | null = null;
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
  private rivalFeinting = false;
  private rivalFeintUsed = false;
  private rivalTellDuration = TELL_TIME;
  private rivalBraceShown = false;
  private strikeTouch: Record<Side, TableTouch> = { left: new TableTouch(TUNE.strikePress), right: new TableTouch(TUNE.strikePress) };
  private knuckleTouch: Record<Side, TableTouch> = { left: new TableTouch(TUNE.press), right: new TableTouch(TUNE.press) };
  private knuckleTapAt: Record<Side, number> = { left: -9, right: -9 };
  private knuckleUsed = false;
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
  // A thin activation front leaves the changed terrain readable instead of washing the whole
  // arena in the same orange disc for every seal.
  private shock = new Mesh(new RingGeometry(0.965, 1, 64).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0xffb04a, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }));
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
  /** Which player-authored shapes already paid their one arena-combo reward. */
  private rewardedShapes = new WeakSet<FloorShape>();
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
  /** The open hand currently previewing that launch point. */
  private launchPreviewSide: Side | null = null;
  /** Floor feedback shared by launch-point, aim and tactical-zone previews. */
  private launchGuide = new Group();
  private launchGhost = new Group();
  private launchGhostMaterial = new MeshBasicMaterial({ color: 0xff9a32, transparent: true, opacity: 0.28, depthWrite: false, blending: NormalBlending });
  private launchMarkerMaterial = new MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.8, depthWrite: false, blending: AdditiveBlending });
  private launchMarker = new Mesh(new RingGeometry(0.026, 0.032, 40).rotateX(-Math.PI / 2), this.launchMarkerMaterial);
  private launchAimMaterial = new MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.8, depthWrite: false, blending: AdditiveBlending, side: DoubleSide });
  private launchAim = new Group();
  private launchAimShaft = new Mesh(new PlaneGeometry(0.009, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5), this.launchAimMaterial);
  private launchAimHead = new Mesh(new ConeGeometry(0.015, 0.035, 3).rotateX(Math.PI / 2), this.launchAimMaterial);
  /** The previous attempt stays faint for the next ready phase, so a rematch invites one correction. */
  private openingEchoMaterial = new MeshBasicMaterial({ color: 0xc47a43, transparent: true, opacity: 0.28, depthWrite: false, side: DoubleSide });
  private openingEcho = new Group();
  private openingEchoShaft = new Mesh(new PlaneGeometry(0.007, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5), this.openingEchoMaterial);
  private openingEchoHead = new Mesh(new ConeGeometry(0.012, 0.028, 3).rotateX(Math.PI / 2), this.openingEchoMaterial);
  private lastOpeningTrace: { x: number; z: number; angle: number; length: number; zone: OpeningZone; outcome: string; rival: string; arena: string } | null = null;
  /** The rival's opening lane, shown before the rip so launch placement is a readable choice. */
  private rivalIntent = new Group();
  private rivalIntentMaterial = new MeshBasicMaterial({ color: 0x4fd1ff, transparent: true, opacity: 0.72, depthWrite: false, blending: AdditiveBlending, side: DoubleSide });
  private rivalIntentDashes = Array.from({ length: 6 }, () => new Mesh(new PlaneGeometry(0.01, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5), this.rivalIntentMaterial));
  private rivalIntentHead = new Mesh(new ConeGeometry(0.016, 0.036, 3).rotateX(Math.PI / 2), this.rivalIntentMaterial);
  private launchZoneKind: 'center' | 'edge' | 'ambush' | 'neutral' = 'neutral';
  private launchArenaKind: 'rail' | 'pit' | 'boost' | 'zero-g' | 'ramp' | 'standard' = 'standard';
  private launchTwist = 0;
  private launchTiming = 1;
  private firstClashPending = false;
  private openingOutcome = '';
  private rivalRead = '';
  private rematchTip = '';
  private rivalLaunchPower = 0.7;
  private rivalLaunchAim = 0;
  private ripBeatAt = -1;
  private pullStartQuat = new Quaternion();
  private twistQuat = new Quaternion();
  /** Dev-driver fallback because IWER translates hands but cannot reliably author wrist roll. */
  private devLaunchTwist = 0;
  private launchSafeZone = new Mesh(
    new RingGeometry(0.042, 0.047, 48).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0x49d8ff, transparent: true, opacity: 0.18, depthWrite: false, blending: AdditiveBlending }),
  );
  private launchDangerZone = new Mesh(
    new RingGeometry(0.057, 0.062, 48).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0xff3b24, transparent: true, opacity: 0.2, depthWrite: false, blending: AdditiveBlending }),
  );
  /** The rival's spot this round: an angle around the arena's far half. */
  private rivalAngle = -Math.PI / 2;
  /** The next match's rival, picked at home and shown there with its arena. */
  private nextRival: Rival | null = null;
  /** The Circuit Map bout picked for the next match, and the one being played (campaign.ts), with its medal bits so far. */
  private nextBoutPick: Bout | null = null;
  /** Tops in the next match: 2 is a duel; 3 or 4 a brawl (bots fill the extra seats; the last top spinning takes the heat). */
  private seats = loadSeats();
  private brawlMode: BrawlMode = loadBrawlMode();
  private activeBrawlMode: BrawlMode = 'last';
  /** A brawl's extra tops and their views, and the foe that went out last in a won round. */
  private extras: Top[] = [];
  private extraViews: TopView[] = [];
  private brawlLoser: Top | null = null;
  private brawlNames: string[] = [];
  /** Bots already called out this round. */
  private brawlOut = new Set<Top>();
  /** The match bar's view of a brawl (one object, updated in place: nothing allocated per frame). */
  private barField: BrawlField & { names: string[]; live: boolean } = { names: [], tops: this.tops, colors: [TEAM_MINE, TEAM_RIVAL, ...BRAWL_COLORS], live: false };
  /** For pocket-target brawls: victim index -> most recent top that hit it. */
  private brawlLastHit = new Int8Array(4).fill(-1);
  /** When each brawl bot next raises a ramp (fight time). */
  private botShapeAt = [0, 0];
  /** The online duel (online.ts): the link, the guest's rip the host waits for, a launch held for the other side, and the guest's copy of the floor. */
  private online: OnlineLink | null = null;
  private netRip: { power: number; aim: number; build?: string; at?: [number, number]; dir?: [number, number] } | null = null;
  private netPending: Parameters<MatchSystem['launch']> | null = null;
  private netGo = false;
  private netShapes = new Map<number, FloorShape>();
  /** Host: the online guest's cup, held here until slung or its hold runs out. */
  private netCup: { shape: FloorShape; at: number; caught?: boolean } | null = null;
  /** Something that must wait for the arena to be placed (an online match starting). */
  private afterPlace: (() => void) | null = null;
  /** Something that waits until the player is home (an online duel while they forge or build). */
  private afterHome: (() => void) | null = null;
  /** The address's online room was opened (it waits for the first session to end). */
  private onlineTried = false;
  private bout: Bout | null = null;
  private boutEarned = 0;
  /** This match as an echo for a friend's game: each rip and each two-hand forge (echo.ts). */
  private echoRec: Echo = { rips: [], forges: [] };
  /** A friend's recorded match the Challenger replays (rips and forges), or null. */
  private rivalEcho: Echo | null = null;
  /** The echo's forges already played this round. */
  private echoPlayed = 0;
  /** The next echo forge whose physical hand tell has already begun. */
  private echoWarned = 0;
  /** While ready: a faint line on the floor around where you can launch from. */
  private launchZone = new Mesh(new BufferGeometry(), new MeshBasicMaterial({ color: GUIDE, transparent: true, opacity: 0.5, depthWrite: false, side: 2 }));
  /** Seconds left before a transient fight message clears. */
  private labelTimer = 0;
  /** The fight call on the card (see call()): its key, text, priority and when it stops being fresh. */
  private callKey = '';
  private callText = '';
  private callPriority = 0;
  private callUntil = 0;
  /** When each call key was last on the card, so the same call does not flash back. */
  private callSeen = new Map<string, number>();
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
    this.outerRailGeometry.setAttribute('position', new Float32BufferAttribute(this.outerRailPositions, 3));
    this.outerRailGeometry.setDrawRange(0, 0);
    this.outerRailHead.visible = false;
    this.outerRailMesh.renderOrder = this.outerRailHead.renderOrder = 8;
    this.outerRail.add(this.outerRailMesh, this.outerRailHead);
    this.launchAim.add(this.launchAimShaft, this.launchAimHead);
    this.openingEcho.add(this.openingEchoShaft, this.openingEchoHead);
    this.rivalIntent.add(...this.rivalIntentDashes, this.rivalIntentHead);
    this.launchGuide.add(this.launchSafeZone, this.launchDangerZone, this.launchMarker, this.launchAim, this.launchGhost, this.openingEcho, this.rivalIntent);
    this.rivalTellFx.add(this.rivalTellTarget, this.rivalTellGuard, ...this.rivalTellChevrons, ...this.rivalTellQuake);
    this.causeFx.add(this.causePath, this.causeOrigin, this.causeTarget);
    this.launchGuide.visible = false;
    this.launchMarker.visible = this.launchAim.visible = this.launchGhost.visible = this.openingEcho.visible = this.rivalIntent.visible = false;
    this.stage.add(...this.deskArcs);
    this.stage.add(
      this.chargeRing,
      this.ghost.root,
      this.forgeGhost.root,
      this.rivalGhost.root,
      this.netGhost.root,
      this.portal,
      this.portalCore,
      ...this.palmPrints,
      ...this.scorches,
      ...this.handMarks,
      ...this.handContactRings,
      ...this.flickGlows,
      this.secretRelic,
      this.lane,
      this.rivalTellFx,
      this.causeFx,
      this.ultimateArenaFx,
      this.ultimatePath,
      this.ultimateTarget,
      this.ultimateArrow,
      this.sealPop,
      this.overforgeSeal,
      this.crossguardGlow,
      this.crossguardBeam,
      ...this.crossguardPosts,
      this.forgeWheel,
      this.forgeWheelCurrent,
      this.emberPickup,
      this.emberBumperFx,
      this.palmGustFx,
      this.palmGustRim,
      ...this.rimSpringGuides,
      this.launcherBrace,
      this.reticle,
      this.aura,
      this.arenaView.root,
      this.sparks.points,
      this.impacts.root,
      this.trails.mesh,
      this.fingerStreak.mesh,
      this.pillar.mesh,
      this.ripArrows,
      this.bumpMark,
      this.marks.root,
      this.rivalMarks.root,
      this.launchZone,
      this.launchGuide,
      this.pips.root,
      this.shock,
    );
    this.ultimateArenaFx.add(
      ...this.ultimateArenaRings,
      ...this.ultimateArenaSeams,
      this.ultimateArenaWall,
      ...this.ultimateRushChevrons,
      ...this.ultimateHammerArcs,
      this.ultimateWardSector,
      this.ultimateWardCage,
    );
    this.overforgeSeal.add(this.overforgeRing);
    this.overforgeRing.position.y = -0.003;
    this.overforgeRing.renderOrder = 9;
    this.crossguardGlow.renderOrder = this.crossguardBeam.renderOrder = 9;
    for (const post of this.crossguardPosts) post.renderOrder = 9;
    this.palmGustFx.renderOrder = this.palmGustRim.renderOrder = 8;
    this.lane.renderOrder = this.rivalTellTarget.renderOrder = this.rivalTellGuard.renderOrder = this.causePath.renderOrder = this.causeOrigin.renderOrder = this.causeTarget.renderOrder = 8;
    for (const mesh of [...this.rivalTellChevrons, ...this.rivalTellQuake]) mesh.renderOrder = 8;
    for (const guide of this.rimSpringGuides) guide.renderOrder = 8;
    this.launcherBrace.traverse((o) => { if ((o as Mesh).isMesh) (o as Mesh).renderOrder = 8; });
    this.setOverforgeModel(this.myBuild.seal ?? 'anvil');
    for (const mesh of [...this.ultimateArenaRings, ...this.ultimateArenaSeams, this.ultimateArenaWall, ...this.ultimateRushChevrons, ...this.ultimateHammerArcs, this.ultimateWardSector]) mesh.renderOrder = 7;
    this.shock.visible = false;
    this.ultimatePath.renderOrder = this.ultimateTarget.renderOrder = this.ultimateArrow.renderOrder = 8;
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
    this.root.add(this.handle, this.stage, this.outerRail, this.label.mesh, this.builder.root, this.forge.root, this.hub.root, this.menuButton.mesh, this.rematchButton.mesh, this.passButton.mesh, ...this.deckButtons.map((b) => b.mesh));
    this.hub.setComfort();
    // The hand driver (src/dev-drive.ts) reads the game through this.
    if (import.meta.env.DEV) (window as unknown as { __game: unknown }).__game = this;
    this.openOnline();
    // A plate laid on the left of the near rim at the touch band's one pitch, like every sign you pinch.
    this.menuButton.mesh.position.set(-0.2, MENU_Y, 0.14);
    this.menuButton.mesh.rotation.set(-SIGN_TILT, 0, 0);
    this.menuButton.set('MENU');
    this.menuButton.mesh.visible = false;
    if (new URLSearchParams(location.search).has('fps')) {
      // One plane, redrawn once a second: next to MENU, on the arena (world-locked, never on the head).
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 160;
      const tex = signTexture(canvas);
      const mesh = new Mesh(new PlaneGeometry(0.1, 0.03125), new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      mesh.rotation.set(-SIGN_TILT, 0, 0);
      mesh.renderOrder = 6;
      this.fpsOverlay = { mesh, canvas, tex };
      this.root.add(mesh);
      this.drawFpsOverlay();
    }
    this.rematchButton.mesh.position.set(0.2, MENU_Y, 0.14);
    this.rematchButton.mesh.rotation.set(-SIGN_TILT, 0, 0);
    this.rematchButton.set('REMATCH', true, true);
    this.passButton.mesh.rotation.set(-SIGN_TILT, 0, 0);
    this.passButton.set('PASS');
    this.rematchButton.mesh.visible = false;
    this.passButton.mesh.visible = false;
    for (const b of this.deckButtons) {
      b.mesh.rotation.set(-SIGN_TILT, 0, 0);
      b.mesh.visible = false;
    }
    // The gaze pointer stays dormant on Quest unless the runtime exposes a gaze input source (there
    // its head ray only feeds the button dwell assist). On Meta VR Glasses it combines that gaze ray
    // with either hand's pinch; the hand path is unchanged.
    this.pointers = [this.gazePointer, this.hands.right, this.hands.left];
    if (import.meta.env.DEV) {
      // A crosshair in the middle of the view shows where the gaze pointer aims.
      const crosshair = new Mesh(new RingGeometry(0.003, 0.0055, 24), new MeshBasicMaterial({ color: 0xff6a1a, depthTest: false, transparent: true }));
      crosshair.position.z = -0.4;
      crosshair.renderOrder = 999;
      this.player.head.add(crosshair);
    }
    this.setArena(this.arenas[this.arenaIndex]);
    this.rootEntity = this.world.createTransformEntity(this.root);
    this.rootEntity.addComponent(XRAnchor);
    this.rootEntity.addComponent(FirstFiveState);
    (window as unknown as { spinsmithDiagnostics?: () => Record<string, string | number | boolean> }).spinsmithDiagnostics = () => ({
      device: 'IWER_DEVICE' in window ? 'IWER emulator' : 'physical XR device',
      phase: this.phase,
      guide: this.progress.guide,
      firstFiveStep: this.firstFiveStep,
      interventions: this.interventionCount,
      failedGestures: this.failedGestures,
      arenaForgeCancels: this.arenaForgeCancels,
      arenaForgeAction: this.arenaForgeAction,
      arenaForgeSwing: Math.round(this.arenaForgeSwing * 100) / 100,
      lowestFps: Math.round(this.lowestFps),
      liteMode: this.lite,
      qualityLevel: QUALITY_LEVELS[this.quality.level],
      qualitySteps: this.qualityLog.join(' | ') || 'none',
      xrFrameRate: (this.world.renderer.xr.getSession() as (XRSession & { frameRate?: number }) | null)?.frameRate ?? 'not reported',
      drawCalls: this.world.renderer.info.render.calls,
      fpsHub: this.fpsBook.summary('hub'),
      fpsFight: this.fpsBook.summary('fight'),
      fpsForge: this.fpsBook.summary('forge'),
      matches: this.progress.matches,
      deskVerdict: !!this.deskVerdict,
      deskKoScored: this.deskKoScored,
      deskKoStage: this.deskKoStage,
      lastRoundHeat: this.lastRoundHeat,
      crossguardActive: this.crossguardActive,
      crossguardHits: this.crossguardHits,
      forgeWheelTurn: Math.round(this.forgeWheelTurn * 100) / 100,
      forgeWheelGrabGap: Math.round(this.forgeWheelGrabGap * 1000) / 1000,
      emberState: this.emberState,
      emberGrabGap: Math.round(this.emberGrabGap * 1000) / 1000,
      rivalTell: this.rivalTellCode,
      causeChain: this.causeCue.stage,
      uiLayer: this.uiLayerCode,
      handPresentation: this.handPresentationCode,
      handEmphasis: Math.round(this.handEmphasisValue * 100) / 100,
    });
    // Only the physical fight layer receives real-world depth. Cards and guidance remain readable.
    this.stage.name = 'arena-depth-layer';
    this.stageEntity = this.world.createTransformEntity(this.stage, this.rootEntity);
    this.stageEntity.addComponent(DepthOccludable, { mode: OcclusionShadersMode.MinMaxSoftOcclusion });
    const outerRailEntity = this.world.createTransformEntity(this.outerRail, this.rootEntity);
    outerRailEntity.addComponent(DepthOccludable, { mode: OcclusionShadersMode.MinMaxSoftOcclusion });
    const imprintsEntity = this.world.createTransformEntity(this.roomImprints.root, this.rootEntity);
    imprintsEntity.addComponent(DepthOccludable, { mode: OcclusionShadersMode.MinMaxSoftOcclusion });
    this.deskMemory.name = 'desk-ko-trophies';
    this.deskMemory.position.y = (-PEDESTAL + 0.004) / ARENA_SCALE;
    const deskMemoryEntity = this.world.createTransformEntity(this.deskMemory, this.rootEntity);
    deskMemoryEntity.addComponent(DepthOccludable, { mode: OcclusionShadersMode.MinMaxSoftOcclusion });
    this.placementProbe.name = 'table-hit-probe';
    const placementProbeEntity = this.world.createTransformEntity(this.placementProbe);
    placementProbeEntity.addComponent(EnvironmentRaycastTarget, {
      space: RaycastSpace.Viewer,
      maxDistance: 2,
    });
    // The cord spans from the launcher to the hand in world space, so it is not parented to the arena.
    this.world.createTransformEntity(this.cord.line);
    for (const m of this.pinchRings) this.world.createTransformEntity(m);
    this.world.createTransformEntity(this.handOccluder.joints);
    this.world.createTransformEntity(this.handOccluder.bones);
    this.world.createTransformEntity(this.roomLight.mesh);
    for (const side of ['left', 'right'] as const) {
      const g = this.barRings[side];
      for (let i = 0; i < 10; i++) {
        // The wrist bar floats over the real hand: depthTest off so the hand occluder never cuts it.
        const mat = new MeshBasicMaterial({ color: 0x8a8f99, transparent: true, opacity: 0.18, depthWrite: false, depthTest: false, side: DoubleSide });
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
      this.printLabel.set(LESSON.palmPrint);
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
        // 1-6: choose an ultimate during a dev fight, so every effect can be captured without
        // rewriting progression or the saved player's forged top.
        const sealIndex = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].indexOf(e.code);
        if (sealIndex >= 0 && this.phase === 'fight') {
          const seal = SEALS[sealIndex];
          this.myBuild = { ...this.myBuild, seal };
          console.log(`[STRIKE] dev ultimate ${seal}`);
        }
        // G: make the current rival's next big move a charge, used to capture Hammer and Ward's
        // delayed payoff without replacing the stable long-running capture opponent. It also ends
        // the normal full-bar stare-down so a capture can show the tell before the answering Ward.
        if (e.code === 'KeyG' && this.phase === 'fight') {
          this.rival = { ...this.rival, move: 'charge' };
          this.rivalHeld = RIVAL_HOLD;
          console.log('[TELL] dev rival move charge');
        }
        // U: keep a capture round alive long enough to perform a real hand gesture. Dev-only; the
        // normal simulation and its balance tests never receive this grace extension.
        if (e.code === 'KeyU' && this.phase === 'fight') {
          this.arena.grace = this.elapsed + 30;
          for (const top of this.tops) {
            top.spin = Math.max(top.spin, 1.2);
            top.damage = 0;
          }
          console.log('[MATCH] dev capture grace');
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
          // Throw a top over the wall now, outward from the center, to see it land on the table.
          // Shift+O throws yours and arms the Outer Ring rescue path.
          const t = e.shiftKey ? this.mine : this.theirs;
          // The rescue probe must land on the table; the faster rival shot remains the off-desk
          // showcase. Normal ring-outs always keep their real simulation velocity.
          const speed = e.shiftKey ? 0.3 : 0.8;
          // The rescue probe throws away from any real table edge in reach, so the top lands on wood.
          let a = Math.atan2(t.z, t.x);
          if (e.shiftKey && this.deskEdgePoly) {
            // The direction with the most desk beyond the rim (16 candidates).
            let room = -1;
            for (let k = 0; k < 16; k++) {
              const c = (k / 16) * Math.PI * 2;
              const d = rayExit(this.deskEdgePoly, Math.cos(c), Math.sin(c));
              if (d > room) [room, a] = [d, c];
            }
          }
          t.vx = Math.cos(a) * speed;
          t.vz = Math.sin(a) * speed;
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
      if (paused) {
        this.cancelActiveGestures();
        this.writeResume();
      }
      this.paused = paused;
      setAudioPaused(paused);
    }
    if (paused) {
      // The system menu is up: nothing stays stuck to where the hands were.
      this.barRings.left.visible = this.barRings.right.visible = this.reticle.visible = this.slapMark.visible = false;
      this.crossguardBeam.visible = this.crossguardGlow.visible = false;
      for (const post of this.crossguardPosts) post.visible = false;
      this.forgeWheel.visible = this.forgeWheelCurrent.visible = false;
      this.emberPickup.visible = this.emberBumperFx.visible = false;
      this.palmGustFx.visible = false;
      this.palmGustRim.visible = false;
      this.palmGustSampled.left = this.palmGustSampled.right = false;
      this.palmGustAge.left = this.palmGustAge.right = 0;
      this.cord.set(null);
      for (const m of this.pinchRings) m.visible = false;
      for (const m of this.handContactRings) m.visible = false;
      return;
    }
    // On the result card and at home, the card steps back while a stamp holds the far rim (one
    // thing there at a time); in a fight its instructions (a tell, strike now) stay at full strength.
    // On the result the stamp takes the card's place, so the card steps away entirely.
    this.label.update(Math.min(delta, 0.1), this.stamp.mesh.visible && (this.phase === 'result' || this.phase === 'hub' || this.phase === 'ready' || this.phase === 'fight'), this.phase === 'result' || this.phase === 'fight' || this.phase === 'ready' ? 0 : 0.2);
    this.printLabel.update(Math.min(delta, 0.1));
    // Dev photo mode (store art): only the arena, the tops and the room; every card and button hidden.
    if (this.photo) {
      for (const o of [this.label.mesh, this.printLabel.mesh, this.bar.mesh, this.menuButton.mesh, this.rematchButton.mesh, this.passButton.mesh, this.stamp.mesh, this.slapMark, this.reticle, ...this.pinchRings, ...this.handMarks, ...this.handContactRings]) o.visible = false;
      for (const button of this.deckButtons) button.mesh.visible = false;
      this.hub.photo();
    }
    this.updateFirstFiveFps(delta);
    if (this.fpsOverlay) this.fpsOverlay.mesh.position.set(this.menuButton.mesh.position.x, MENU_Y, this.menuButton.mesh.position.z + 0.045);
    this.stamp.update(Math.min(delta, 0.1));
    this.updateCountdown(Math.min(delta, 0.1));
    this.updatePrints(Math.min(delta, 0.1));
    this.updateHandMarks();
    this.updateSecretRelic(Math.min(delta, 0.1));
    this.updatePinchRings();
    if (this.sealPop.visible) {
      const t = (this.sealPop.userData.t += Math.min(delta, 0.1));
      const me = this.mine;
      this.sealPop.position.set(me.x, this.arena.height(me.x, me.z) + 0.018 + t * 0.012, me.z);
      this.sealPop.rotation.set(1.2, t * 8, 0);
      // The coin identifies the move, then gets out of the way before the action starts moving.
      this.sealPop.scale.setScalar(1.8 * Math.min(1, t / 0.12) * Math.max(0, 1 - Math.max(0, t - 0.28) / 0.2));
      if (t > 0.48) this.sealPop.visible = false;
    }
    this.updateUltimateCue(Math.min(delta, 0.1));
    if (this.celebrate > 0) {
      const before = this.celebrate;
      this.celebrate -= Math.min(delta, 0.1);
      // A burst every 0.1 s, chasing round the rim.
      if (Math.floor(before * 10) !== Math.floor(this.celebrate * 10)) {
        const a = this.celebrate * 9;
        const r = rimRadius(this.arena.layout, a);
        this.sparks.burst(Math.cos(a) * r, this.arena.floorHeight(1), Math.sin(a) * r, 0.7);
        // A fountain of gold embers off your top (or the middle), steady: it suits the Calm modes too.
        const me = this.mine;
        const at = me.state === 'spinning' ? me : null;
        this.sparks.embers(at ? at.x : 0, this.arena.height(at ? at.x : 0, at ? at.z : 0) + 0.01, at ? at.z : 0, 4, 0.45, 0.07, 1);
      }
      // The arena pulses with the win; steady in the Calm modes.
      this.arenaView.charge = COMFORT.flashes ? 0.6 + 0.4 * Math.sin(this.time * 14) : 0.8;
    }
    // A new XR session (leaving and coming back) or a recenter puts the arena in front again.
    if (session !== this.xrSession) {
      // The proxy hands (hand-occluder.ts) cover for missing depth: only over passthrough, not
      // where Quest's depth occlusion runs (it is never registered under IWER, see index.ts).
      this.handOccluder.enabled = handOcclusionOn({
        blend: session.environmentBlendMode,
        depthOcclusion: !('IWER_DEVICE' in window) && !!session.enabledFeatures?.includes('depth-sensing'),
        optOut: new URLSearchParams(location.search).has('nohandocclude'),
        knob: TUNE.occluder,
      });
      this.handOccluder.scale = TUNE.occluderScale;
      this.handOccluder.joints.visible = this.handOccluder.bones.visible = this.handOccluder.enabled;
      console.log(`[MATCH] hand occluder ${this.handOccluder.enabled ? 'on' : 'off'} (blend ${session.environmentBlendMode}, depth ${session.enabledFeatures?.includes('depth-sensing') ? 'granted' : 'none'})`);
      this.anchorPoseApplied = false;
      this.anchorRequestedAt = this.time;
      this.anchorState = 'restoring';
      this.anchorConfirmed = false;
      // Back at home, the print asks for a press again; mid-match, the arena just comes along.
      if (this.xrSession && this.phase === 'hub') {
        this.phase = 'placing';
        this.settle = 0;
        this.root.visible = false;
      } else if (this.xrSession) this.needPlace = true;
      // A reload or a closed session keeps the match: the next entry resumes its round.
      if (!this.xrSession) window.addEventListener('pagehide', () => this.writeResume());
      session.addEventListener('end', () => this.writeResume());
      this.xrSession = session;
      ref.addEventListener('reset', () => (this.needPlace = true));
    }
    const dt = Math.min(delta, 0.05);
    this.frameDt = dt;
    this.time += dt;
    this.hands.update(frame, ref, session, this.player, delta);
    this.handOccluder.update(frame, ref, session, this.player);
    this.updateGazePointer(frame, ref, session);
    if (import.meta.env.DEV) {
      // In the emulator the gaze crosshair is the only far pointer: the hands' own rays would aim
      // somewhere else at the same time. Hands still work by touch. On a headset, hands do both.
      this.hands.left.hasRay = false;
      this.hands.right.hasRay = false;
    }
    this.updateSpatialAnchor();

    if (this.needPlace && this.phase !== 'placing') {
      this.needPlace = false;
      if (this.demo) this.endDemo();
      // Recentring keeps a finished match's screen (REMATCH, MENU) as it is.
      if (this.phase === 'pulling' || this.phase === 'fight' || (this.phase === 'result' && !this.matchOver)) this.toReady();
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
    const launchPhase = this.phase === 'ready' || this.phase === 'pulling';
    if (this.phase !== 'forge') this.palmForgeActive = false;
    if (this.phase !== 'pulling') {
      this.bracedLaunch = false;
      this.launcherBrace.visible = false;
    }
    const openingFight = this.phase === 'fight' && this.firstClashPending;
    this.launchZone.visible = launchPhase && !this.demo;
    this.launchGuide.visible = (launchPhase || openingFight) && !this.demo;
    this.launchSafeZone.visible = this.launchDangerZone.visible = this.phase === 'ready' && !this.demo;
    this.openingEcho.visible = launchPhase && !!this.lastOpeningTrace && this.lastOpeningTrace.rival === this.rival.name && this.lastOpeningTrace.arena === this.arena.layout.name && !this.demo;
    // Large near-rim actions only appear when play has stopped; during a fight the arena is the UI.
    // MENU also waits while you aim (ready, after the first session keeps one thing to look at): a
    // match can always be left, never only in a 4 s window.
    this.menuButton.mesh.visible = (this.phase === 'result' || (this.phase === 'ready' && this.progress.guide === 'done')) && !this.demo;
    this.rematchButton.mesh.visible = this.phase === 'result' && this.matchOver && !this.demo && !(this.online?.role === 'guest' && this.online.peer);
    this.passButton.mesh.visible = this.rematchButton.mesh.visible && this.canPass();
    if (this.phase !== 'ready') for (const b of this.deckButtons) b.mesh.visible = false;
    if (this.passButton.mesh.visible && !this.passHinted && once('pass')) this.stamp.later('PASS', 'A FRIEND FIGHTS YOUR TOP AND HANDS', 'neutral', 1.6, 1);
    this.passHinted ||= this.passButton.mesh.visible;
    if (this.phase !== 'fight') {
      this.barRings.left.visible = this.barRings.right.visible = this.shock.visible = this.slapMark.visible = this.lane.visible = false;
      this.rivalTellFx.visible = false;
      this.setRivalTellState(null);
      this.overforgeSeal.visible = false;
      this.overforgeHeld = null;
      this.overforgeControl = null;
      this.overforgeMode = 'idle';
      this.palmRailAngles.left = this.palmRailAngles.right = null;
      this.palmGustFx.visible = false;
      this.palmGustRim.visible = false;
      this.palmGustTime = 0;
      this.palmGustCooldown = 0;
      this.palmGustSampled.left = this.palmGustSampled.right = false;
      this.palmGustAge.left = this.palmGustAge.right = 0;
      this.outerRail.visible = false;
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
        this.player.head.getWorldDirection(this.fwd).negate();
        if ((this.settle >= SETTLE_MIN && pickTable(this.head, this.tables(), reachSpot(this.head, this.fwd.x, this.fwd.z, TUNE.reach)) !== null) || this.settle >= SETTLE_MAX) this.place();
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
        this.palmForgeActive = this.forge.palmActive;
        // The arena floor sinks as the forge rises out of it.
        this.stage.position.y = -FORGE_SINK * this.forge.opened;
        break;
      case 'ready':
      case 'result':
        if (this.phase === 'result') {
          // Asked to leave? The result holds while the second pinch comes.
          if (this.time - this.menuArmed >= 3) this.resultTimer -= dt;
          if (this.resultTimer <= 0) {
            if (this.demo) {
              this.endDemo();
              break;
            }
            else if (this.matchOver) {
              // A match result is a decision screen, not a toast. Stay here while the player reads
              // unlocks and chooses REMATCH or MENU; otherwise the new button can expire mid-reach.
              this.resultTimer = 0;
            }
            else {
              this.toReady();
              break;
            }
          }
          if (this.demo) break;
        }
        // Leaving a match takes two pinches on Menu within 3 s (a stray pinch never ends it).
        const resultAction = this.pickButton(this.matchOver ? [this.menuButton, this.rematchButton, ...(this.canPass() ? [this.passButton] : [])] : [this.menuButton]);
        if (resultAction === 'rematch') {
          this.startMatch(this.rival, true);
          break;
        }
        if (resultAction === 'pass') {
          this.passHeadset();
          break;
        }
        if (resultAction === 'menu') {
          // A finished match has nothing left to lose: MENU goes straight home.
          if (this.matchOver || this.time - this.menuArmed < 3) {
            this.menuArmed = -10;
            this.menuButton.set('MENU', undefined, false);
            // Going home ends an online duel for both tables (the other side hears 'bye').
            if (this.online?.peer) this.endOnline();
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
        if (this.updateSecretDeck()) break;
        if (this.secretDeckPending()) break;
        this.updateReadyPinch();
        break;
      case 'pulling':
        this.updatePull(dt);
        break;
      case 'fight':
        if (this.labelTimer > 0 && (this.labelTimer -= dt) <= 0) this.label.set('');
        this.updateEmber(dt);
        this.updateForgeWheel(dt);
        if (!this.deskVerdict && this.outerRingState !== 'rescue' && this.outerRingState !== 'palm') {
          this.updateStrike(dt);
          this.updateKnuckleKnock(dt);
          if (!this.updateArenaMorph(dt)) {
            this.updateShaping();
            this.updateCrossguard();
          }
          this.updatePalmGust(dt);
          this.updateFlick(dt);
        }
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
    this.hums.forEach((h, i) => {
      const t = this.tops[i];
      if (t) h.update(live && t.alive ? Math.max(0, t.spin) : 0, Math.hypot(t.vx, t.vz), t.wobble, this.time, t.x, t.z);
      // A brawl seat that emptied gets one silent update (its sound stops); unused seats never start.
      else if (this.humLive[i]) h.update(0, 0, 0, this.time, 0, 0);
      this.humLive[i] = !!t;
    });
    this.sinceClashSound += dt;
    if (this.phase === 'ready' || this.phase === 'pulling' || this.phase === 'fight' || this.phase === 'result') {
      const p = this.progress;
      this.bar.bar(this.mine.spin, this.theirs.spin, this.barPoints[0], this.barPoints[1], MATCH_HEAT, ['YOU', this.rival.name.toUpperCase()], this.phase === 'fight' && this.barMessage === 'READY' ? (this.extras.length ? `${this.tops.filter((t) => t.alive).length} LEFT` : 'FIGHT') : this.barMessage, {
        level: p.level,
        rank: p.rank,
        fraction: p.fraction,
        gained: this.phase === 'result' ? this.xpGained : 0,
        show: this.phase === 'result',
      }, this.extras.length ? this.brawlBarField() : null);
      this.bar.animate(this.mine.spin, this.theirs.spin, dt);
    }
    // Visuals only: after a finish your shape caused they slow down for a moment.
    // A knockout holds still for a beat first (visuals only: the simulation has already stopped).
    const vdt = this.koFreeze > 0 ? 0 : this.slowMo > 0 ? dt * SLOW_MO : dt;
    if (this.koFreeze > 0) this.koFreeze = Math.max(0, this.koFreeze - dt);
    else this.slowMo = Math.max(0, this.slowMo - dt);
    if (this.replay) this.playReplay(dt);
    const [ga, gb] = this.replay ? this.ghosts : [this.mine, this.theirs];
    // The drawn spin holds through a hit-stop, and a top still up spins on once a round has ended.
    this.myView.frozen = this.theirView.frozen = this.phase === 'fight' && this.hitStop > 0;
    this.myView.coast = this.theirView.coast = this.phase === 'result' && !this.replay;
    this.myView.sync(ga, this.arena, this.time, vdt);
    this.theirView.sync(gb, this.arena, this.time, vdt);
    this.extraViews.forEach((v, i) => {
      v.frozen = this.myView.frozen;
      v.coast = this.myView.coast;
      v.sync(this.extras[i], this.arena, this.time, vdt);
    });
    this.updateEntrance(dt);
    this.sparks.rim = maxRim(this.arena.layout) + 0.01;
    this.sparks.update(vdt);
    this.impacts.rim = this.sparks.rim;
    this.impacts.update(vdt);
    // Trails behind both tops while they fight.
    this.trailT += vdt;
    if (this.trailT >= 1 / 30) {
      this.trailT = 0;
      if (this.phase === 'fight') {
        this.tops.forEach((t, side) => {
          if (side < 4 && t.state === 'spinning') this.trails.drop(side, t.x, this.arena.height(t.x, t.z), t.z, Math.hypot(t.vx, t.vz));
        });
      }
    }
    this.trails.update(vdt);
    this.fingerStreak.update(vdt);
    this.pillar.update(Math.min(delta, 0.1));
    this.updateGuide();
    this.updateRivalGhost(dt);
    for (const c of this.showcase.children) c.rotation.y += dt * 0.4;
    this.updateRewards(dt);
    this.updateShapes();
    this.updateCauseCue(dt);
    this.syncUiHierarchy();
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
    // An online guest sees the host's arena turned half round (tilts stay in the arena's own frame).
    const guestTurn = this.online?.role === 'guest' && this.online.peer ? Math.PI : 0;
    this.stage.rotation.order = guestTurn ? 'YXZ' : 'XYZ';
    this.stage.rotation.set(this.arena.tiltX, this.turn + this.arenaMorphTwist + guestTurn, this.arena.tiltZ + this.arenaMorph.tilt);
    this.stage.scale.set(this.viewK * this.arenaMorph.scaleX, this.viewK, this.viewK * this.arenaMorph.scaleZ);
    this.updateDeskEdge(this.stage.rotation.y);
    // The bowl changes shape, not the physical tops. Their positions follow the forged floor but
    // their metal bodies counter-scale so they never become oval toy silhouettes.
    const invMorphX = 1 / Math.max(0.01, this.arenaMorph.scaleX);
    const invMorphZ = 1 / Math.max(0.01, this.arenaMorph.scaleZ);
    this.myView.root.scale.set(invMorphX, 1, invMorphZ);
    this.theirView.root.scale.set(invMorphX, 1, invMorphZ);
    const me = this.mine;
    const armed = this.phase === 'fight' && me.alive && me.hammer > 0;
    this.aura.visible = armed;
    if (armed) {
      (this.aura.material as MeshBasicMaterial).color.setHex(0xffe066);
      (this.aura.material as MeshBasicMaterial).opacity = 0.75;
      this.aura.position.set(me.x, this.arena.height(me.x, me.z) + 0.02, me.z);
      this.aura.scale.setScalar(0.9);
      this.aura.rotation.y += dt * 6;
    }
  }

  /**
   * Where the staged first DESK KO aims (stage frame), or null when it is not live: armed for the
   * forge-lesson round, on a real table with a desk edge in reach (no table: a plain ring-out).
   */
  private deskWrenchAt(): number | null {
    const sec = this.deskEdgeSectors[0];
    if (!this.deskWrench.armed || this.phase !== 'fight' || !ROOM.poly || !this.onTable || !sec || !this.theirs.alive) return null;
    // Sectors are root-local; the tops and pockets live on the stage, turned by its yaw.
    return deskWrenchAngle({ ...sec, angle: sec.angle + this.stage.rotation.y }, this.arena.layout.pockets);
  }

  /** Until the staged forge fires, the rival drifts to the rim facing the nearest real edge. */
  private steerToDeskEdge() {
    const angle = this.deskWrenchAt();
    if (angle === null) return;
    deskWrenchSteer(this.theirs, angle, rimRadius(this.arena.layout, angle), STEP);
  }

  /** The rival's launch spot this round (arena-local), at the spawn distance on its far half. */
  private rivalSpot(): [number, number] {
    return [Math.cos(this.rivalAngle) * this.SPAWN, Math.sin(this.rivalAngle) * this.SPAWN];
  }

  /** A campaign boss one round from defeat: rips at least 0.85 and shapes the floor twice as often. */
  private bossRage() {
    return !!this.bout?.boss && this.myPoints >= MATCH_HEAT - 1;
  }

  private shapeGap() {
    return this.bout?.night ? RIVAL_SHAPE_GAP * 0.55 : this.bossRage() ? RIVAL_SHAPE_GAP / 2 : RIVAL_SHAPE_GAP;
  }

  /** Fix the rival's rip before the player chooses a lane, then show that promise on the floor. */
  private planRivalLaunch() {
    // A bout sets the rival's skill by where it sits on the map; free play keeps the level-based one.
    const skill = this.bout ? boutSkill(this.bout, this.progress.boutLosses[this.bout.id] ?? 0) : Math.min(1, (this.progress.level - 1) / 15);
    const first = this.progress.matches === 0 && !this.demo;
    const min = 0.5 + 0.25 * skill;
    this.rivalLaunchPower = first ? 0.7 + Math.random() * 0.1 : Math.random() < 0.5 * skill ? 1 : min + Math.random() * (0.98 - min);
    this.rivalLaunchAim = first ? (Math.random() - 0.5) * 0.3 : (Math.random() - 0.5) * (1 - 0.6 * skill);
    // Normal launches express the same character as the rival's named move. Their parts already
    // change the physics; this changes the decision you can read before the rip as well.
    if (!first) {
      if (this.rival.move === 'charge') {
        // Rim fighters commit hard to a visible side lane instead of always firing at the middle.
        const side = this.rivalAngle < -Math.PI / 2 ? -1 : 1;
        this.rivalLaunchPower = Math.min(1, this.rivalLaunchPower + 0.1);
        this.rivalLaunchAim = Math.max(-MAX_AIM, Math.min(MAX_AIM, this.rivalLaunchAim * 0.55 + side * 0.16));
      } else if (this.rival.move === 'quake') {
        // Anchors take the shortest, strongest route to the middle.
        this.rivalLaunchPower = Math.max(0.84, this.rivalLaunchPower);
        this.rivalLaunchAim *= 0.22;
      } else {
        // Long-spinners avoid an all-in opening and settle before the first collision.
        this.rivalLaunchPower = Math.max(0.68, Math.min(0.84, this.rivalLaunchPower));
        this.rivalLaunchAim *= 0.45;
      }
    }
    const memory = this.progress.openingAgainst(this.rival.name);
    if (memory && memory.streak >= 2) {
      // The counter is deterministic and fully telegraphed by the cyan line; no hidden stat bonus.
      this.rivalLaunchPower = memory.zone === 'center' ? 0.96 : 0.88;
      this.rivalLaunchAim = memory.zone === 'ambush' ? -Math.sign(memory.x || 1) * 0.24 : memory.zone === 'edge' ? Math.sign(memory.x || 1) * 0.16 : 0;
    }
    // A friend's echo rips the way they did in that round (the next round still to be launched).
    if (this.bossRage()) this.rivalLaunchPower = Math.max(0.85, this.rivalLaunchPower);
    const echoRip = this.rivalEcho?.rips[this.echoRec.rips.length];
    if (echoRip) {
      this.rivalLaunchPower = echoRip.power;
      this.rivalLaunchAim = echoRip.aim;
    }
    const [x, z] = this.rivalSpot();
    const angle = Math.atan2(-x, -z) + this.rivalLaunchAim + LAUNCH_TILT * this.theirs.hand;
    const length = 0.07 + 0.07 * this.rivalLaunchPower;
    const gap = length / this.rivalIntentDashes.length;
    const vx = Math.sin(angle);
    const vz = Math.cos(angle);
    this.rivalIntent.position.set(0, 0, 0);
    this.rivalIntent.rotation.set(0, 0, 0);
    this.rivalIntentDashes.forEach((dash, i) => {
      const along = i * gap;
      const px = x + vx * along;
      const pz = z + vz * along;
      dash.position.set(px, this.arena.height(px, pz) + 0.008, pz);
      dash.rotation.y = angle;
      dash.scale.z = gap * 0.58;
    });
    const hx = x + vx * length;
    const hz = z + vz * length;
    this.rivalIntentHead.position.set(hx, this.arena.height(hx, hz) + 0.008, hz);
    this.rivalIntentHead.rotation.y = angle;
    this.rivalIntent.visible = !this.demo;
    // The projection pulls the rival's cord; its trail is the cyan blueprint.
    this.rivalGhostKeys = [
      [0, x, this.arena.height(x, z) + 0.055, z, 0],
      [0.35, x, this.arena.height(x, z) + 0.015, z, 0],
      [0.55, x, this.arena.height(x, z) + 0.015, z, 1],
      [1.2, x - vx * 0.085, this.arena.height(x, z) + 0.045, z - vz * 0.085, 1],
      [1.3, x - vx * 0.095, this.arena.height(x, z) + 0.05, z - vz * 0.095, 0],
      [2.1, x - vx * 0.1, this.arena.height(x, z) + 0.065, z - vz * 0.1, 0],
    ];
  }

  private updateRivalGhost(dt: number) {
    if (this.online?.peer) {
      this.updateNetHands(dt);
      return;
    }
    this.netGhost.hide();
    const opening = (this.phase === 'ready' || this.phase === 'pulling') && !this.demo;
    if (opening || this.rivalGhostFor > 0) {
      this.rivalGhost.play(this.rivalGhostKeys, dt);
      if (!opening) this.rivalGhostFor = Math.max(0, this.rivalGhostFor - dt);
    } else this.rivalGhost.hide();
  }

  /**
   * Online: your hands go to the other table and theirs come here, live, as the two ghost hands on
   * the far side (turned half round: their near side is your far side). Stale hands fade out.
   */
  private updateNetHands(dt: number) {
    const link = this.online!;
    link.tick();
    const mine = (h: HandState): Vec3 | null => {
      if (!h.tracked) return null;
      const v = this.stage.worldToLocal(this.handAt.copy(h.pinch));
      return [v.x, v.y, v.z];
    };
    link.sendHands(mine(this.hands.left), mine(this.hands.right), this.hands.left.pinching, this.hands.right.pinching);
    const m = link.hands.latest;
    const fresh = !!m && performance.now() - link.handsAt < 500;
    const show = (g: GhostHand, v: Vec3 | null | undefined, pinch: boolean | undefined) => {
      if (!fresh || !v) return g.hide();
      // Both stages share the host's arena frame (the guest's is turned half round), so no mirroring.
      const key = [0, v[0], v[1], v[2], pinch ? 1 : 0];
      g.play([key, [1, key[1], key[2], key[3], key[4]]], dt);
    };
    show(this.rivalGhost, m?.l, m?.lp);
    show(this.netGhost, m?.r, m?.rp);
  }

  /** Shows the rival physically authoring a move instead of explaining it with another card. */
  private rivalHandMove(x: number, z: number, dx: number, dz: number) {
    const y = this.arena.height(x, z);
    this.rivalGhostKeys = [
      [0, x, y + 0.06, z, 0],
      [0.25, x, y + 0.008, z, 0],
      [0.4, x, y + 0.008, z, 1],
      [0.9, x + dx * 0.045, y + 0.015, z + dz * 0.045, 1],
      [1.05, x + dx * 0.05, y + 0.045, z + dz * 0.05, 0],
      [1.35, x + dx * 0.05, y + 0.06, z + dz * 0.05, 0],
    ];
    this.rivalGhostFor = 1.35;
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
      this.nextBoutPick = null;
      return;
    }
    // A pinned arena is free play: a bout queued before the pin gives way.
    if (this.progress.arenaPin && this.nextBoutPick) {
      this.nextBoutPick = null;
      this.nextRival = null;
    }
    // The Circuit Map picks rival and arena, unless an arena is pinned (free play) or it is all won.
    const pin = this.progress.arenaPin;
    if (!this.nextRival) {
      // With every bout won, the map offers a missing medal every other match; the rotation gets the rest.
      let bout = pin ? null : nextBout(this.progress.bouts, this.progress.matches % 2 === 0, this.progress.matches);
      if (!bout && !pin && this.progress.nightUnlocked) {
        const baseIndex = this.progress.matches % BOUTS.length;
        const base = BOUTS[baseIndex];
        // Every pass moves the same rival to another chapter's arena, so Night is a remix rather
        // than the campaign with larger numbers.
        const arena = BOUTS[(baseIndex + 5 + Math.floor(this.progress.matches / BOUTS.length)) % BOUTS.length].arena;
        bout = nightBout(base, arena);
      }
      const rival = bout && RIVALS.find((r) => r.name === bout.rival);
      const index = bout ? this.arenas.findIndex((a) => a.name === bout.arena) : -1;
      if (bout && rival && index >= 0) {
        this.nextBoutPick = bout;
        this.nextRival = rival;
        this.arenaIndex = index;
        if (import.meta.env.DEV) console.log(`[MATCH] next: ${bout.night ? 'night ' : ''}bout ${bout.id} ${rival.name} in ${bout.arena}`);
        return;
      }
      this.nextBoutPick = null;
    } else if (this.nextBoutPick) {
      const index = this.arenas.findIndex((a) => a.name === this.nextBoutPick!.arena);
      if (index >= 0) {
        this.arenaIndex = index;
        return;
      }
    }
    this.nextRival ??= this.pickRival();
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
        const near = h.pinchSmooth.distanceTo(this.p) < 0.05;
        const t = this.local.copy(this.p).sub(h.rayOrigin).dot(h.rayDir);
        const far = h.hasRay && t > 0 && this.local.copy(h.rayDir).multiplyScalar(t).add(h.rayOrigin).distanceTo(this.p) < Math.max(BUTTON_REACH, b.height * 0.8);
        if (!near && !far) continue;
        hovered ??= b;
        if (h === this.gazePointer) this.gazeAssist.target = b.id;
        if (h.justPinched && !pressed) pressed = b.id;
      }
    }
    // Head-ray assist where no gaze pointer runs (Quest): look at a far button for a moment and it
    // lights up; then a pinch of either hand, wherever it is, presses it. Hands still win.
    const g = this.gazePointer;
    if (!hovered && !g.tracked && g.hasRay && !this.gazeOff) {
      for (const b of buttons) {
        if (!b.mesh.visible) continue;
        b.mesh.getWorldPosition(this.p);
        const t = this.local.copy(this.p).sub(g.rayOrigin).dot(g.rayDir);
        if (t <= 0 || this.local.copy(g.rayDir).multiplyScalar(t).add(g.rayOrigin).distanceTo(this.p) >= Math.max(BUTTON_REACH, b.height * 0.8)) continue;
        const d = this.headDwell;
        if (d.id !== b.id || this.time - d.seen > 0.15) Object.assign(d, { id: b.id, since: this.time });
        d.seen = this.time;
        if (this.time - d.since < HEAD_DWELL) break;
        hovered = b;
        this.gazeAssist.target = b.id;
        // Only a pinch made away from the bowl presses it: a pinch over the arena (a ramp, a grip,
        // skipping a replay) belongs to the fight, not to the button you happen to be looking at.
        const by = (['left', 'right'] as const).find((side) => this.hands[side].justPinched);
        const local = by && this.root.worldToLocal(this.handAt.copy(this.hands[by].pinchSmooth));
        const clear = !!local && normRadius(this.arena.layout, local.x, local.z) > 1.35;
        if (g.justPinched && clear && !pressed) pressed = b.id;
        break;
      }
    }
    for (const b of buttons) b.highlight(b === hovered);
    return pressed;
  }

  /** Home: the arena waits with both tops; Play, Workshop, or switch arena. Pinching never launches here. */
  private toHub() {
    this.clearBrawl();
    // A rivet thrown by the last clash of a fight must not linger over the hub.
    this.resetEmber();
    this.bout = null;
    // Home ends the match: nothing to resume.
    this.resumeSnap = null;
    clearSnapshot(localStorage);
    // ?online=… on a new headset waits for the first session; once it is over the room opens.
    if (!this.online && !this.onlineTried && this.progress.guide === 'done' && new URLSearchParams(location.search).has('online')) queueMicrotask(() => this.openOnline());
    // Whatever waited for placement or for home (an online duel) starts now, on any path home.
    const home = this.afterHome ?? this.afterPlace;
    this.afterHome = this.afterPlace = null;
    if (home && this.online?.peer) queueMicrotask(home);
    this.hub.setBrawl(this.seats, this.online?.role === 'host' && !this.online.peer);
    this.phase = 'hub';
    this.markFirstFive(1);
    this.matchOver = false;
    this.quietMatch = false;
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
    this.rematchButton.mesh.visible = false;
    this.passButton.mesh.visible = false;
    // Your top waits on its stand, not in the arena.
    this.mine.state = 'out';
    // Today's order, from the local date and what the player can meet and play now.
    this.orderMatch = false;
    const today = localDate(new Date());
    const ctx = this.orderContext();
    this.order = this.progress.orderFor(today, () => dailyOrder(today, ctx));
    // A teaser of tomorrow's order once today's is done (as things stand now).
    const tomorrow = this.progress.hasOrder(today) ? dailyOrder(addDays(today, 1), ctx) : null;
    this.hub.show(this.myBuild, this.progress, this.order, tomorrow, this.nextRival ? `${this.nextRival.name} in ${this.arenas[this.arenaIndex].name}${this.boutText(this.nextRival.name)}` : null);
    this.rebuildDeskMemory();
    if (import.meta.env.DEV) console.log(`[ORDER] today ${this.order.date}: ${this.order.text} in ${this.order.arena}${this.progress.hasOrder(this.order.date) ? ' (done)' : ''} · ${this.progress.stamps} stamps`);
    this.label.set('');
    // A message still timing out must not wipe the note set below.
    this.labelTimer = 0;
    this.bar.mesh.visible = false;
    // The first session says where to reach next.
    this.label.set(this.guideNote());
    // Modes introduce themselves once, after three matches, so the first session stays one verb.
    if (this.progress.guide === 'done' && this.progress.matches >= 3 && !this.demo && once('brawl')) {
      this.label.set(HUB_NOTE.brawl);
      this.labelTimer = 6;
    }
    // Notes hang over the far rim; the beacon marks the dock or the anvil. Once the Smith's board
    // hangs there, they move up over it.
    this.label.mesh.position.set(LABEL_AT.x, this.progress.guide === 'done' ? HOME_NOTE_Y : LABEL_AT.y, LABEL_AT.z);
    this.label.mesh.scale.setScalar(1.25);
    if (import.meta.env.DEV) this.hubLogPending = true;
  }

  /** What a Smith Order can ask of this player now (orders.ts OrderContext). */
  private orderContext() {
    return {
      rivals: RIVALS.filter((r) => r.level <= this.progress.level).map((r) => r.name),
      arenas: ARENAS.filter((a) => this.progress.isUnlocked(`arena:${a.name}`)),
      built: this.arenas.filter((a) => !ARENAS.includes(a)),
      cup: this.taught('cup'),
      table: !!ROOM.poly,
      medal: medalOrder(this.progress.bouts, !!ROOM.poly) ?? undefined,
    };
  }

  /** The match result's last card: the day streak, tomorrow's Smith Order and the next bout. */
  private comeBackText() {
    const today = localDate(new Date());
    const p = this.progress;
    return comeBackCard(p.streak(today), dailyOrder(addDays(today, 1), this.orderContext()), nextBout(p.bouts, p.matches % 2 === 0, p.matches));
  }

  /** A ray from the arena centre to the known table polygon, pulled inward to keep the trophy on wood. */
  private deskEdgePoint(angle: number, inward = 0.04, tangent = 0): Vector2 | null {
    const poly = ROOM.poly;
    if (!poly || poly.length < 3) return null;
    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    let best = Infinity;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const ex = b.x - a.x;
      const ez = b.z - a.z;
      const den = dx * ez - dz * ex;
      if (Math.abs(den) < 1e-6) continue;
      const t = (a.x * ez - a.z * ex) / den;
      const u = (a.x * dz - a.z * dx) / den;
      if (t > 0 && u >= 0 && u <= 1) best = Math.min(best, t);
    }
    if (!Number.isFinite(best)) return null;
    const r = Math.max(0.18, best - inward);
    return new Vector2(dx * r - dz * tangent, dz * r + dx * tangent);
  }

  /** Rebuilds the visible desk history only when the saved trophies or table outline change. */
  private rebuildDeskMemory() {
    const polyKey = ROOM.poly?.map((p) => `${p.x.toFixed(2)},${p.z.toFixed(2)}`).join(';') ?? '';
    const key = `${polyKey}|${JSON.stringify(this.progress.deskTrophies)}`;
    if (key === this.deskMemoryKey) return;
    this.deskMemoryKey = key;
    if (this.deskMemoryBatch) {
      this.deskMemoryBatch.traverse((object) => { if (object instanceof Mesh) object.geometry.dispose(); });
      this.deskMemoryBatch.removeFromParent();
      this.deskMemoryBatch = null;
    }
    for (const view of this.deskMemoryViews) view.dispose();
    this.deskMemoryViews = [];
    if (!ROOM.poly || this.progress.deskTrophies.length === 0) return;
    const source = new Group();
    const count = this.progress.deskTrophies.length;
    this.progress.deskTrophies.forEach((trophy, i) => {
      const point = this.deskEdgePoint(trophy.angle, 0.04, (i - (count - 1) / 2) * 0.052);
      if (!point) return;
      const view = new TopView({ ...trophy.build, color: OPPONENT_COLOR }, OPPONENT_COLOR);
      view.root.position.set(point.x, 0.006, point.y);
      view.root.rotation.set(0, -trophy.angle, i % 2 ? -1.05 : 1.05);
      view.root.scale.setScalar(0.72);
      this.deskMemoryViews.push(view);
      source.add(view.root);
    });
    if (source.children.length === 0) return;
    this.deskMemoryBatch = mergeByMaterial(source);
    this.deskMemoryBatch.name = 'batched-defeated-rivals';
    this.deskMemory.add(this.deskMemoryBatch);
  }

  /** The first session's note at home: where to reach next ('' once the guide is done). */
  private guideNote() {
    const guide = this.progress.guide;
    if (guide === 'launch') return LESSON.hubLaunch;
    if (guide === 'bump') return this.progress.matches > 0
      ? HUB_NOTE.ramp
      : LESSON.hubMatch;
    if (guide === 'match') return LESSON.hubMatch;
    if (guide === 'forge' || guide === 'fit') return HUB_NOTE.forge;
    if (guide === 'rematch') return HUB_NOTE.rematch;
    return '';
  }

  /**
   * A fight call to action on the instruction card. It shows only if nothing of higher (or equal,
   * while still fresh) priority holds the card, and not again within CALL_REPEAT s of the same key
   * last being on screen. Timed text set straight on the label counts as lesson priority.
   * `seconds` 0 keeps the card up (never fresh: any call may replace it).
   */
  private call(text: string, priority: number, seconds: number, key = text) {
    const ours = this.callText !== '' && this.label.current === this.callText;
    if (ours) this.callSeen.set(this.callKey, this.time);
    const slot = ours
      ? { key: this.callKey, priority: this.callPriority, until: this.callUntil, onScreen: true }
      : { key: '', priority: CALL.lesson, until: this.time + this.labelTimer, onScreen: this.labelTimer > 0 && this.label.current !== '' };
    if (!callAllowed(slot, this.time, key, priority, this.callSeen.get(key))) return;
    this.label.set(text);
    this.labelTimer = seconds;
    this.callKey = key;
    this.callText = text;
    this.callPriority = priority;
    this.callUntil = this.time + seconds;
    this.callSeen.set(key, this.time + seconds);
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
      this.startMatch(rematch ? this.rival : undefined, rematch);
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
      // An order chasing a map medal plays that bout too: its medals and win count on the map.
      const bout = o.bout ? BOUTS.find((b) => b.id === o.bout) : null;
      if (bout && !this.online && bout.arena === this.arena.layout.name && bout.rival === this.rival.name) {
        this.bout = bout;
        this.boutEarned = 0;
        // The bout as it is: a crowded one brings its crowd (and a pegs' brawl gives way to it).
        this.clearBrawl();
        if (bout.crowd?.length) this.setupBrawl(bout.crowd.length, bout.crowd);
      }
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
    } else if (action.kind === 'brawl') {
      // The pegs step through three genuinely different crowded rules before the online room.
      if (this.online?.peer) {
        this.label.set('In an online duel\nMENU ends it');
        this.labelTimer = 2.5;
        return;
      }
      const online = this.online?.role === 'host';
      if (online) {
        this.endOnline();
        this.seats = 2;
        this.brawlMode = 'last';
        this.toHub();
      } else if (this.brawlMode === 'crucible' && !this.online) {
        this.seats = 2;
        this.openOnline('host');
        this.hub.setBrawl(4, true);
        playTick();
        return;
      } else if (this.seats === 2) {
        this.seats = 3;
        this.brawlMode = 'last';
      } else if (this.brawlMode === 'last' && this.seats === 3) this.seats = 4;
      else if (this.brawlMode === 'last') {
        this.seats = 3;
        this.brawlMode = 'pocket';
      } else {
        this.seats = 4;
        this.brawlMode = 'crucible';
      }
      saveBrawlSettings(this.seats, this.brawlMode);
      this.hub.setBrawl(this.seats);
      this.label.set(this.seats === 2 ? 'Duel: you and one rival\nPinch the pegs for a brawl' : `${brawlModeName(this.brawlMode)} · ${this.seats} TOPS\n${this.brawlMode === 'pocket' ? 'First credited pocket wins' : this.brawlMode === 'crucible' ? 'First credited 3-heat pocket wins' : 'Last top spinning takes the heat'}`);
      this.labelTimer = 3;
      playTick();
    } else if (action.kind === 'comfort') {
      // The dial only picks a setting; its plate shows ON/OFF and a pinch there toggles it.
      const name = nextComfort();
      this.hub.setComfort(5);
      this.label.set(`Comfort: ${name}\nPinch the plate to toggle · the dial for the next`);
      this.labelTimer = 3;
      if (import.meta.env.DEV) console.log(`[HUB] comfort dial ${name}`);
    } else if (action.kind === 'comfortToggle') {
      const lefty = COMFORT.lefty;
      const name = toggleComfort();
      applySound();
      if (COMFORT.lefty !== lefty) {
        // The stations swap sides: home is built again on the other hand's side.
        const old = this.hub;
        this.root.remove(old.root);
        this.hub = new Hub();
        this.hub.roomCode = old.roomCode;
        this.root.add(this.hub.root);
        this.toHub();
      }
      this.hub.setComfort(5);
      this.label.set(`Comfort: ${name}\nOn: ${comfortSummary()}`);
      this.labelTimer = 3;
      playTick();
      if (import.meta.env.DEV) console.log(`[HUB] comfort toggle ${name} · on: ${comfortSummary()}`);
    } else if (action.kind === 'armReset') {
      this.label.set('Start over as a new smith?\nPinch the level plate again');
      this.labelTimer = 3;
    } else if (action.kind === 'newSmith') {
      // A new player on a shared headset: progress, the saved top and built arenas are forgotten.
      this.progress.reset();
      this.seats = 2;
      this.brawlMode = 'last';
      saveBrawlSettings(2, 'last');
      // A new smith gets every lesson again, and an open online room closes.
      this.morphedOnce = false;
      this.slungOnce = false;
      this.flickHintShown = false;
      this.flickGhostUntil = -9;
      this.endOnline();
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
      this.label.set('New smith\nProgress reset: the first match starts here');
      this.labelTimer = 3;
    } else if (action.kind === 'locked') {
      this.label.set(action.text);
      this.labelTimer = 2;
    }
  }

  private openForge() {
    this.phase = 'forge';
    this.markFirstFive(6);
    this.label.set('');
    for (const top of this.tops) top.state = 'out';
    // The forge is the arena transformed: the floor sinks, the anvil and the drawers rise.
    this.bar.mesh.visible = false;
    // The first session's forge visit is about one part: the one just earned.
    const focus = this.progress.guide === 'forge' || this.progress.guide === 'fit' ? 'tip:spur' : null;
    this.progress.advance('fit');
    // The card rides a little higher in the forge, over the raised drawers.
    this.label.mesh.position.set(LABEL_AT.x, LABEL_AT.y + HUD.forgeLift, LABEL_AT.z);
    const r = this.nextRival;
    let friend = false;
    try {
      // As challenger() decides: a code that decodes, after the first session.
      friend = this.progress.guide === 'done' && !!decodeBuild(splitCode(sessionStorage.getItem('spinsmith.vs') ?? '').build);
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
    if (build) {
      this.myBuild = { ...build };
      this.markFirstFive(7);
    }
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
      const scars = i === 0 ? this.progress.scarsFor(build) : { wins: 0, shapes: 0, orders: 0 };
      const key = JSON.stringify([build.ring, build.core, build.tip, build.spin, color, scars]);
      if (key === this.viewKeys[i]) continue;
      this.viewKeys[i] = key;
      const old = i === 0 ? this.myView : this.theirView;
      old?.dispose();
      const view = new TopView(build, color);
      if (i === 0) view.scars(scars);
      view.team(i === 0 ? TEAM_MINE : TEAM_RIVAL, ringOf(build).radius, true, i === 0 ? 40 : 6);
      // A top that lands on the desk scorches it.
      view.onLand = (x, y, z) => this.scorch(x, y, z);
      // A spun-out top clatters onto its side in a spray of sparks.
      view.onTopple = (x, y, z) => {
        this.sparks.burst(x, y, z, 0.55);
        this.impacts.shock(x, y, z, 0.3);
      };
      view.root.name = i === 0 ? 'my-top' : 'their-top';
      this.stage.add(view.root, view.shadowMesh, view.debris);
      if (i === 0) {
        this.myView = view;
        // The launch preview reuses the player's exact silhouette with one translucent material.
        this.launchGhost.clear();
        const ghost = view.root.clone(true);
        ghost.traverse((o) => {
          const mesh = o as Mesh;
          if (!mesh.isMesh) return;
          const source = mesh.material as MeshBasicMaterial;
          if (source.transparent && source.opacity < 0.95) mesh.visible = false;
          mesh.material = this.launchGhostMaterial;
        });
        this.launchGhost.add(ghost);
        this.launchGhost.visible = false;
      } else this.theirView = view;
    }
    this.refreshDepthOcclusion();
  }

  /** An opponent: a classic top half the time, otherwise any legal build; either spin. */
  /** A rival for a new match, from the archetypes your level has reached; the same all match. */
  /** Keeps the last 2 s of both tops (and their clashes) for a replay. */
  private record(clash: Clash | null) {
    const b = this.replayBuf;
    const o = this.replayAt * REC;
    for (let k = 0; k < 2; k++) {
      const t = this.tops[k];
      const p = o + k * REC_TOP;
      b[p] = t.x; b[p + 1] = t.z; b[p + 2] = t.angle; b[p + 3] = t.wobble; b[p + 4] = t.damage;
      b[p + 5] = t.spin; b[p + 6] = t.vx; b[p + 7] = t.vz; b[p + 8] = t.kick; b[p + 9] = t.kickX; b[p + 10] = t.kickZ;
    }
    // The clash in this step, if any (strength 0: none), to strike its sparks again in the replay.
    const c = o + 2 * REC_TOP;
    b[c] = clash ? clash.strength : 0;
    b[c + 1] = clash ? clash.x : 0;
    b[c + 2] = clash ? clash.z : 0;
    this.replayAt = (this.replayAt + 1) % REPLAY_STEPS;
    this.replayCount = Math.min(REPLAY_STEPS, this.replayCount + 1);
  }

  /** A knockout your move caused plays again on the table, slowly (a pinch skips it). */
  private startReplay() {
    // The replay buffer holds the duel's two tops; a brawl knockout would replay the wrong pair.
    if (this.extras.length) return;
    const n = this.replayCount;
    if (n < 30) return;
    const frames = new Float32Array(n * REC);
    for (let i = 0; i < n; i++) {
      const src = ((this.replayAt - n + i + REPLAY_STEPS) % REPLAY_STEPS) * REC;
      frames.set(this.replayBuf.subarray(src, src + REC), i * REC);
    }
    this.ghosts[0].spec = this.mine.spec;
    this.ghosts[1].spec = this.theirs.spec;
    this.ghosts[0].hand = this.mine.hand;
    this.ghosts[1].hand = this.theirs.hand;
    // Starts after the slow-motion moment; the result card waits for it.
    this.replay = { t: -SLOW_MO_TIME - 0.4, frames, n, out: [this.mine, this.theirs], at: -1 };
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
    if (was < 0) this.stamp.show('REPLAY', 'PINCH TO SKIP', 'neutral', r.n / 120 / REPLAY_SPEED);
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
    for (let k = 0; k < 2; k++) {
      const g = this.ghosts[k];
      const o = i * REC + k * REC_TOP;
      g.state = 'spinning';
      g.finish = null;
      g.x = f[o];
      g.z = f[o + 1];
      g.angle = f[o + 2];
      g.wobble = f[o + 3];
      g.damage = f[o + 4];
      // As it was: its spin, its travel and the kick of the last hit (so it leans as it did).
      g.spin = f[o + 5];
      g.vx = f[o + 6];
      g.vz = f[o + 7];
      g.kick = f[o + 8];
      g.kickX = f[o + 9];
      g.kickZ = f[o + 10];
    }
    // The clashes again, as they happened: sparks, a ring, the tops punched, and their sound.
    for (let s = Math.max(0, r.at + 1); s <= i; s++) {
      const c = s * REC + 2 * REC_TOP;
      const strength = f[c];
      if (strength <= 0) continue;
      const x = f[c + 1];
      const z = f[c + 2];
      const y = this.arena.height(x, z);
      this.sparks.burst(x, y, z, strength);
      if (strength > HARD_HIT) {
        this.impacts.shock(x, y, z, strength);
        this.myView.hit(strength, x - f[s * REC], z - f[s * REC + 1], 0.1);
        this.theirView.hit(strength, x - f[s * REC + REC_TOP], z - f[s * REC + REC_TOP + 1], 0.1);
      }
      if (strength > 0.3 && this.sinceClashSound > 0.08) {
        playClash(strength * 0.8, x, this.myBuild.ring, this.theirBuild.ring, z);
        this.sinceClashSound = 0;
      }
    }
    r.at = Math.max(r.at, i);
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
      this.stamp.show(e.vs, this.quietFirst ? '' : e.sub, 'rival', 1.6);
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
      const engaged = h.pinching
        || this.phase === 'pulling'
        || this.handHover[side]
        || !!this.shaping[side]
        || !!this.slings[side]
        || !!this.rimPulls[side]
        || this.overforgeHeld === side
        || this.forgeWheelHeld === side
        || this.emberHeld === side;
      // An idle tracked hand is already visible in passthrough. Do not decorate it with a large
      // floating reticle until the player is actually aiming at or manipulating the arena.
      m.visible = h.tracked && engaged && h.gap < 0.065 && this.phase !== 'placing';
      if (!m.visible) return;
      m.position.copy(h.pinchSmooth);
      m.lookAt(this.head);
      const r = h.pinching ? 0.006 : 0.006 + 0.16 * Math.max(0, h.gap - TUNE.pinchOn);
      m.scale.setScalar(r);
      const mat = m.material as MeshBasicMaterial;
      mat.color.setHex(this.phase === 'pulling' ? 0xffe0a3 : h.pinching ? 0xff8a2a : 0xffc06a);
      mat.opacity = h.pinching ? 0.9 : 0.22 + 0.42 * Math.max(0, 1 - (h.gap - TUNE.pinchOn) / 0.045);
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
      const contact = this.handContactRings[i];
      const h = this.hands[side];
      const wasHovering = this.handHover[side];
      this.handHover[side] = false;
      m.visible = false;
      contact.visible = false;
      if (!play || !h.tracked) return;
      // Preview the same pinch point that updateShaping consumes. The fingertip is kept separately
      // because a press beside a top claims Catch without changing the pinch target underneath it.
      // Both smoothed (hands.ts One-Euro), so the rings and the claim do not shimmer at rest.
      const l = this.handAt.copy(this.toLocal(h.pinchSmooth));
      const tip = this.root.worldToLocal(this.handTipAt.copy(h.indexSmooth));
      const rimGrip = this.rimPulls[side];
      // Once a rim grip is claimed, its authored surface point remains the contact. The hand may
      // deliberately rise or move outside the bowl while squeezing/tilting; hiding feedback then
      // made a real two-hand Forge look like only one hand affected the arena.
      if (rimGrip && (this.arenaMorphing || (!!this.rimPulls.left && !!this.rimPulls.right))) {
        l.x = rimGrip.x;
        l.z = rimGrip.z;
      }
      const n = normRadius(this.arena.layout, l.x, l.z);
      if (n > 1.15) return;
      const floor = this.arena.height(l.x, l.z);
      const up = rimGrip && (this.arenaMorphing || (!!this.rimPulls.left && !!this.rimPulls.right)) ? 0.006 : l.y - floor;
      if (up < 0 || up > 0.12) return;
      const hovering = this.phase === 'fight' && this.elapsed >= TUNING.grace && !h.pinching && up <= 0.05;
      this.handHover[side] = hovering;
      if (hovering && !wasHovering) playHover();
      m.visible = true;
      // Light from above and behind you: the shadow falls a little ahead of the hand.
      m.position.set(l.x, floor + 0.0015, l.z - up * 0.5);
      const k = 1 - up / 0.12;
      m.scale.setScalar(0.05 + 0.04 * (1 - k));
      const mat = m.material as MeshBasicMaterial;
      let claim: '' | 'RAMP' | 'RIM' | 'FORGE' | 'CATCH' | 'SLING' = '';
      if (hovering) {
        let caught = false;
        let nearTop = false;
        for (const shape of this.arena.shapes) {
          if (shape.trap && shape.caught && Math.hypot(shape.caught.x - l.x, shape.caught.z - l.z) <= MAGNET_CATCH) {
            caught = true;
            break;
          }
        }
        for (const top of this.tops) {
          if (top.alive && Math.hypot(top.x - tip.x, top.z - tip.z) <= MAGNET_CATCH) {
            nearTop = true;
            break;
          }
        }
        const forgeReady = this.taught('forge');
        const forgeGrip = forgeReady && forgeGripIntent(n, Math.atan2(l.z, l.x));
        claim = caught ? 'SLING' : forgeGrip ? 'FORGE' : forgeReady && n >= RIM_GRAB_MIN ? 'RIM' : nearTop && this.taught('cup') ? 'CATCH' : 'RAMP';
      }
      if (claim !== this.handHoverClaim[side]) {
        this.handHoverClaim[side] = claim;
        if (claim && this.labelTimer <= 0 && this.progress.guide !== 'done' && (claim !== 'RIM' || this.taught('spring'))) {
          this.label.set(CLAIM[claim]);
          this.labelTimer = 0.65;
        }
      }
      const shaping = this.phase === 'fight' && (hovering || h.pinching || !!this.shaping[side] || !!this.slings[side] || this.pressing[side]);
      if (hot || shaping) {
        const color = claim === 'CATCH' || claim === 'SLING' ? 0xffd060 : claim === 'FORGE' ? 0xffc14a : claim === 'RIM' ? 0xff9a32 : 0xff8a2a;
        mat.color.setHex(color);
        mat.blending = AdditiveBlending;
        mat.opacity = (hot ? 0.5 : 0.25) + (hot ? 0.5 : 0.45) * k;
        // The surface—not a floating HUD—answers the hand. Both rings light together while the
        // whole bowl is being forged, making the two-hand cause immediately legible in a still.
        const forging = this.arenaMorphing || (!!this.rimPulls.left && !!this.rimPulls.right);
        const committed = h.pinching || !!this.shaping[side] || !!this.slings[side] || !!this.rimPulls[side] || this.pressing[side];
        contact.visible = committed || hovering;
        contact.position.set(l.x, floor + 0.003, l.z);
        const pulse = 1 + 0.08 * Math.sin(this.time * 9 + i * Math.PI);
        contact.scale.setScalar((forging ? 0.054 : committed ? 0.04 : 0.032) * pulse);
        const contactMat = contact.material as MeshBasicMaterial;
        contactMat.color.setHex(forging ? 0xffe0a3 : color);
        contactMat.opacity = forging ? 0.92 : committed ? 0.72 : 0.32;
      } else {
        this.handHoverClaim[side] = '';
        mat.color.setHex(0x000000);
        mat.blending = NormalBlending;
        mat.opacity = 0.45 * k;
      }
    });
  }

  /** Keeps the current bout's one hidden shard inside reach and lets either pinch claim it. */
  private updateSecretRelic(dt: number) {
    const bout = this.bout;
    const canFind = !!bout && !bout.night && !this.progress.hasSecret(bout.id) && !this.demo && !this.quietFirst && !this.photo && (this.phase === 'ready' || this.phase === 'pulling' || this.phase === 'fight');
    this.secretRelic.visible = canFind;
    if (!canFind || !bout) return;
    const index = Math.max(0, BOUTS.findIndex((b) => b.id === bout.id));
    // The irrational turn keeps each shard in a different corner while staying inside the 60 cm
    // seated play radius. It floats above the authored floor, never inside a wall or pocket.
    const angle = index * 2.399963 + 0.42;
    const r = rimRadius(this.arena.layout, angle) * (0.48 + (index % 3) * 0.055);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    this.secretRelic.position.set(x, this.arena.height(x, z) + 0.025 + Math.sin(this.time * 2.8) * 0.003, z);
    this.secretRelic.rotation.y += dt * 2.2;
    this.secretRelic.rotation.z += dt * 0.8;
    const pulse = 0.9 + 0.12 * Math.sin(this.time * 5);
    this.secretRelic.scale.setScalar(pulse);
    for (const side of ['left', 'right'] as const) {
      const hand = this.hands[side];
      if (!hand.tracked || !hand.justPinched) continue;
      const at = this.root.worldToLocal(this.handAt.copy(hand.pinchSmooth));
      if (at.distanceTo(this.secretRelic.position) > 0.05) continue;
      if (!this.progress.collectSecret(bout.id)) return;
      this.secretRelic.visible = false;
      this.sparks.embers(x, this.arena.height(x, z) + 0.02, z, 18, 0.75, 0.08, 1);
      if (this.progress.nightUnlocked) {
        this.stamp.show('NIGHT CIRCUIT OPEN!', '15/15 SHARDS · HARD REMIXES UNLOCKED', 'mine', 2, 1.45);
        this.label.set('The Crown is dark again.\nNight rivals reshape every arena.');
        this.labelTimer = 3;
        playLevelUp();
      } else {
        this.stamp.show('HIDDEN SHARD!', `${this.progress.secretCount}/${BOUTS.length} FOUND`, 'mine', 1.15, 1.15);
        playUnlock();
      }
      return;
    }
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
      if (!h.justPinched || h.pinchSmooth.distanceTo(this.handAt) > 0.07) continue;
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
   * Feeds one 1 s fps window to the quality guard. Not in the emulator (a desktop browser's frame
   * rate says nothing about the headset) unless `?fpsguard` asks for it, to test the steps there.
   */
  private guardFrameRate(fps: number, seconds: number) {
    if ('IWER_DEVICE' in window && !new URLSearchParams(location.search).has('fpsguard')) return;
    const session = this.world.renderer.xr.getSession() as (XRSession & { frameRate?: number }) | null;
    const step = this.quality.sample(fps, seconds, session?.frameRate);
    if (!step) return;
    // Level 2 adds full fixed foveation (WebXR allows changing it mid-session); level 1 and up
    // drop the room dimming. The framebuffer scale stays: WebXR fixes it at session start.
    this.world.renderer.xr.setFoveation?.(step.to >= 2 ? 1 : 0.5);
    const line = `${Math.round(performance.now() / 1000)}s ${this.phase} ${fps.toFixed(0)}fps ${QUALITY_LEVELS[step.from]}->${QUALITY_LEVELS[step.to]}`;
    this.qualityLog.push(line);
    if (this.qualityLog.length > 12) this.qualityLog.shift();
    console.warn(`[PERF] quality ${step.reason === 'slow' ? 'down' : 'up'}: ${line} (target ${session?.frameRate ?? 72} Hz)`);
  }

  /** Redraws the `?fps` readout (once a second, after each fps window). */
  private drawFpsOverlay() {
    const o = this.fpsOverlay;
    if (!o) return;
    const g = o.canvas.getContext('2d')!;
    const { width: W, height: H } = o.canvas;
    glass(g, W, H);
    const calls = this.world.renderer.info.render.calls;
    g.fillStyle = TEXT;
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.font = `700 ${Math.round(H * 0.34)}px ${FONT}`;
    g.fillText(`${Math.round(this.lastFps)} FPS  low ${Math.round(this.lowestFps)}`, W * 0.05, H * 0.3);
    g.font = `600 ${Math.round(H * 0.26)}px ${FONT}`;
    g.fillText(`draws ${calls}  ${QUALITY_LEVELS[this.quality.level]}`, W * 0.05, H * 0.72);
    o.tex.needsUpdate = true;
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
    // Match 1's feats are kept (the board lists them); only its verdict's are stamped.
    if (this.quietFirst && !this.matchOver) return;
    this.stamp.later('FEAT!', FEATS[id], 'mine', 1.3);
    playStamp();
    if (import.meta.env.DEV) console.log(`[FEAT] ${id}`);
  }

  /** The level plate's second word: ' · bout 2-1 (1/3 medals)', ' · 1-5 boss (…)', ' · brawl' or ' · free play'. */
  private boutText(name: string) {
    const b = this.nextBoutPick;
    // The pegs' brawl replaces a plain bout, but a crowded bout keeps its own crowd.
    if (this.seats > 2 && !b?.crowd?.length) return ' · brawl';
    if (b && b.rival === name) {
      const medals = [1, 2, 4].filter((m) => (this.progress.bouts[b.id] ?? 0) & m).length;
      return ` · ${b.boss ? `${b.id} boss` : `bout ${b.id}`} (${medals}/3 medals)`;
    }
    // Outside the map (a pinned arena, the map won) the match is free play; the old circuit count no longer applies.
    return this.progress.guide === 'done' ? ' · free play' : '';
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
    const { build: buildCode, echo } = splitCode(code);
    const build = buildCode ? decodeBuild(buildCode) : null;
    if (!build) return null;
    this.rivalEcho = echo;
    return { name: 'Challenger', move: 'charge', style: echo ? 'a friend\'s top and hands' : 'a friend\'s top', title: `code ${buildCode}`, intro: echo ? 'Your friend forged me and played this match. Their hands are in it.' : 'Your friend forged me. Beat me.', win: 'Tell them I won.', lose: 'Tell them you won.', tip: 'Read its parts in the intro: a heavy ring holds, a light one hits', build: { ...build, color: OPPONENT_COLOR }, level: 1 };
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
   * Meta VR Glasses expose gaze as a target ray and either hand supplies the pinch. In desktop
   * IWER the head ray is the equivalent; on a Quest without gaze tracking this pointer sleeps and
   * its head ray only drives the dwell-then-pinch button assist in pickButton.
   */
  private updateGazePointer(frame: XRFrame, ref: XRReferenceSpace, session: XRSession) {
    const g = this.gazePointer;
    let source: XRInputSource | null = null;
    for (let i = 0; i < session.inputSources.length; i++) {
      if (session.inputSources[i].targetRayMode === 'gaze') {
        source = session.inputSources[i];
        break;
      }
    }
    const pose = source ? frame.getPose(source.targetRaySpace, ref) : null;
    if (pose) {
      g.rayOrigin.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
      g.rayQuat.set(pose.transform.orientation.x, pose.transform.orientation.y, pose.transform.orientation.z, pose.transform.orientation.w);
      g.rayDir.set(0, 0, -1).applyQuaternion(g.rayQuat);
    } else {
      const head = this.player.head;
      head.getWorldPosition(g.rayOrigin);
      head.getWorldDirection(g.rayDir).negate();
      head.getWorldQuaternion(g.rayQuat);
    }
    g.hasRay = true;
    // Off while the hand driver (src/dev-drive.ts) steers the hands: it pinches where it means to.
    g.tracked = !this.gazeOff && (!!pose || import.meta.env.DEV);
    g.pinch.set(0, -100, 0);
    g.pinchSmooth.set(0, -100, 0);
    const was = g.pinching;
    g.pinching = this.hands.left.pinching || this.hands.right.pinching;
    g.justPinched = g.pinching && !was;
    g.justReleased = !g.pinching && was;
    this.gazeAssist.active = g.tracked;
    if (g.tracked && this.root.visible && this.floorHit(g.rayOrigin, g.rayDir, this.gazeHit)) this.gazeAssist.target = 'arena';
    else {
      this.gazeHit.ok = false;
      this.gazeAssist.target = '';
    }
  }

  /** A persistent anchor owns the smithy's local pose; unsupported runtimes keep normal placement. */
  private updateSpatialAnchor() {
    const entity = this.rootEntity;
    if (!entity?.active) {
      this.anchorState = 'unsupported';
      return;
    }
    if (!entity.getValue(XRAnchor, 'attached')) {
      this.anchorState = this.time - this.anchorRequestedAt > 3 ? 'unsupported' : 'restoring';
      return;
    }
    this.anchorState = 'anchored';
    if (!this.anchorPoseApplied) {
      this.anchorPoseApplied = true;
      const saved = loadSpatialPose();
      if (saved && this.phase === 'placing') {
        applySpatialPose(this.root, saved);
        this.root.scale.setScalar(ARENA_SCALE);
        this.root.visible = true;
        this.onTable = saved.onTable;
        this.tableY = null;
        this.pushed = 0;
        this.lowered = 0;
        this.rise = 1;
        this.placedAt = this.time;
        this.root.updateWorldMatrix(true, true);
        this.setRoom();
        const snap = loadSnapshot(localStorage);
        this.toHub();
        this.stamp.show('SMITHY RESTORED', 'BACK ON YOUR TABLE', 'mine', 1.1, 1.2);
        console.log('[SPATIAL] restored persistent smithy pose');
        if (snap) this.tryResume(snap);
      }
    }
    if (this.spatialDirty && this.phase === 'hub' && this.sizeSettled && !this.dragging && this.pushed < 1e-4) {
      saveSpatialPose(this.root, this.onTable);
      this.spatialDirty = false;
      console.log('[SPATIAL] saved smithy pose');
    }
    if (!this.anchorConfirmed && this.phase === 'hub' && this.root.visible) {
      this.anchorConfirmed = true;
      this.stamp.later('SMITHY ANCHORED', 'RETURNS TO THIS TABLE', 'mine', 1.2, 1.1);
    }
  }

  /** Writes a comfortable horizontal viewer hit into an existing placement object. */
  private useRaycastPlacement(at: Placement): boolean {
    if (!this.placementProbe.visible) return false;
    this.placementProbe.getWorldPosition(this.p);
    this.placementProbe.getWorldQuaternion(this.placementQ);
    this.placementUp.set(0, 1, 0).applyQuaternion(this.placementQ);
    const horizontal = Math.abs(this.placementUp.y) > 0.75;
    const distance = Math.hypot(this.p.x - this.head.x, this.p.z - this.head.z);
    if (!horizontal || distance < 0.25 || distance > 1.25 || this.p.y < TABLE_MIN_H || this.p.y > TABLE_MAX_H || this.head.y - this.p.y > 0.8) return false;
    at.x = this.p.x;
    at.y = this.p.y + PEDESTAL;
    at.z = this.p.z;
    at.yaw = Math.atan2(this.head.x - at.x, this.head.z - at.z);
    at.onTable = true;
    return true;
  }

  /** Re-runs depth material discovery after a forged top replaced its meshes. */
  private refreshDepthOcclusion() {
    const entity = this.stageEntity;
    if (!entity?.active || !entity.hasComponent(DepthOccludable)) return;
    entity.removeComponent(DepthOccludable);
    entity.addComponent(DepthOccludable, { mode: OcclusionShadersMode.MinMaxSoftOcclusion });
  }

  /** Where a hand points at the arena (near pinch first, else its ray), including just past the rim. */
  private arenaPoint(h: HandState): { x: number; z: number } | null {
    // A shrunk arena: what the hand touches, in the arena's true units.
    const k = this.viewK;
    const l = this.toLocal(h.pinchSmooth).divideScalar(k);
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

  /** The round now starting, as a snapshot (duels against the AI only). */
  private snapRound() {
    const resumable = !this.demo && !this.photo && !this.online && !this.extras.length && !this.rivalEcho && this.rival.name !== 'Challenger';
    if (!resumable) {
      if (this.resumeSnap) clearSnapshot(localStorage);
      this.resumeSnap = null;
      return;
    }
    const bout = this.bout ? (this.bout.night ? `night:${this.bout.id}` : this.bout.id) : null;
    this.resumeSnap = {
      v: RESUME_VERSION, at: Date.now(), mine: this.myPoints, theirs: this.theirPoints, round: this.round, tutorialRound: this.tutorialRound,
      bout, rival: this.rival.name, arena: this.arena.layout.name, myBuild: encodeBuild(this.myBuild), theirBuild: encodeBuild({ ...this.rival.build }),
      perfect: this.perfectInMatch, wasDown: this.wasDown, heroRamp: this.firstHeroRamp, rounds: this.matchLog.rounds.slice(0, 16),
    };
    this.writeResume();
  }

  private writeResume() {
    if (this.resumeSnap) saveSnapshot({ ...this.resumeSnap, at: Date.now() }, localStorage);
  }

  /** On entry: an interrupted match goes straight back to ready for the round it stopped in. */
  private tryResume(snap: MatchSnapshot) {
    if (this.phase !== 'hub' || this.online) return;
    // The first match is the lessons in order: it restarts rather than resuming past one. (This
    // also drops a snapshot a fresh save's reload wrote on its way out.)
    if (this.progress.matches === 0) return clearSnapshot(localStorage);
    const rival = RIVALS.find((r) => r.name === snap.rival);
    const layout = this.arenas.find((a) => a.name === snap.arena);
    if (!rival || !layout) return clearSnapshot(localStorage);
    const night = snap.bout?.startsWith('night:');
    const base = snap.bout ? BOUTS.find((b) => b.id === (night ? snap.bout!.slice(6) : snap.bout)) : undefined;
    this.arenaIndex = this.arenas.indexOf(layout);
    this.setArena(layout);
    const mine = decodeBuild(snap.myBuild);
    if (mine) this.myBuild = mine;
    this.rivalEcho = null;
    this.bout = base ? (night ? nightBout(base, layout.name) : base) : null;
    this.startMatch(rival, true, snap);
    this.label.set(`Match resumed\nRound ${snap.round + 1} · ${snap.mine} - ${snap.theirs}`);
    this.labelTimer = 4;
    console.log(`[MATCH] resumed vs ${rival.name} in ${layout.name}, round ${snap.round + 1}, heat ${snap.mine}-${snap.theirs}`);
  }

  /**
   * A new match from anywhere (home, the workshop's Save & play, the dev key): every other
   * place closes, a rival is picked, the score and this round's builds are fresh.
   */
  /** `again`: a rematch, which keeps the bout (or the brawl) it repeats. */
  private startMatch(rival?: Rival, again = false, resume?: MatchSnapshot) {
    // With a peer connected every match is against the other smith (never a bout, order or AI).
    if (this.online?.peer) {
      rival = this.remoteRival();
      again = false;
    }
    this.netRip = null;
    this.netPending = null;
    const last = again ? this.bout : null;
    const lastSeats = again ? this.tops.length : 2;
    this.hub.hide();
    this.builder.close();
    this.forge.close();
    this.stage.visible = true;
    this.demo = false;
    // A friend's challenge goes first (after the first session); a rematch keeps the echo it fought.
    if (!again) this.rivalEcho = null;
    this.echoRec = { rips: [], forges: [] };
    const friend = !rival && this.progress.guide === 'done' ? this.challenger() : null;
    this.rival = rival ?? friend ?? this.nextRival ?? this.pickRival();
    this.prepareSecretDeck();
    // A campaign bout: the planned one, or the first match (the first bout's rival in its arena).
    // The first session's guided rematch is still the first bout.
    const planned = last ?? this.nextBoutPick ?? (this.progress.guide !== 'done' || (again && this.progress.matches <= 1) ? BOUTS[0] : null);
    this.bout = !friend && (again || !rival) && planned && planned.rival === this.rival.name && planned.arena === this.arena.layout.name ? planned : null;
    this.boutEarned = 0;
    this.nextRival = null;
    this.nextBoutPick = null;
    // A brawl is free play: no bout, no order; a friend's challenge and the first session stay duels.
    this.clearBrawl();
    const seats = again ? lastSeats : this.seats;
    const crowd = this.bout?.crowd;
    this.activeBrawlMode = crowd?.length ? 'last' : this.brawlMode;
    // A crowded bout brings its own tops; otherwise the pegs' brawl is free play (no bout).
    if (crowd?.length && this.online) this.bout = null;
    else if (crowd?.length) this.setupBrawl(crowd.length, crowd);
    else if (seats > 2 && (again || !rival) && !friend && !this.online && this.progress.guide === 'done') {
      this.bout = null;
      if (this.brawlMode === 'crucible' && !this.arena.layout.pockets.some((p) => (p.points ?? 2) >= 3)) {
        const target = this.arenas.find((a) => a.pockets.some((p) => (p.points ?? 2) >= 3) && this.progress.isUnlocked(`arena:${a.name}`));
        if (target) {
          this.arenaIndex = this.arenas.indexOf(target);
          this.setArena(target);
        }
      }
      this.setupBrawl(seats - 2);
    }
    this.progress.playedArena(this.arena.layout.name);
    // A built-in arena goes by name; a workshop arena goes whole (the guest does not have it).
    if (this.online?.role === 'host' && this.online.peer) this.online.launched(-1, this.arena.layout.name, ARENAS.some((a) => a.name === this.arena.layout.name) ? undefined : this.arena.layout);
    this.perfectInMatch = false;
    this.myPoints = 0;
    this.theirPoints = 0;
    this.tutorialRound = 0;
    this.quietMatch = this.progress.matches === 0;
    this.firstHeroRamp = false;
    this.wasDown = false;
    this.introDone = false;
    this.rematchTip = '';
    this.matchLog = { rounds: [], rip: 0, xp: 0, won: false, score: '' };
    // Rounds count within a match ('ROUND 2', the bout's twist), not across the session.
    this.round = 0;
    if (resume) {
      this.myPoints = resume.mine;
      this.theirPoints = resume.theirs;
      this.round = resume.round;
      this.tutorialRound = resume.tutorialRound;
      this.perfectInMatch = resume.perfect;
      this.wasDown = resume.wasDown;
      this.firstHeroRamp = resume.heroRamp;
      this.matchLog.rounds = [...resume.rounds];
      this.barPoints = [this.myPoints, this.theirPoints];
    }
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

  private secretDeckActive() {
    return !!this.online?.peer || this.rival.name === 'Challenger';
  }

  /** Builds a stable three-top hand from the equipped top, champions, then legal presets. */
  private prepareSecretDeck() {
    this.deckBuilds = [];
    this.deckChoice = -1;
    this.deckPrompted = false;
    if (!this.secretDeckActive()) return;
    const seen = new Set<string>();
    const add = (candidate: TopBuild) => {
      if (this.deckBuilds.length >= 3) return;
      const build = this.forge.allowed({ ...candidate });
      const key = `${build.ring}|${build.core}|${build.tip}|${build.spin}|${build.seal ?? 'anvil'}`;
      if (seen.has(key)) return;
      seen.add(key);
      this.deckBuilds.push(build);
    };
    add(this.myBuild);
    for (const champion of this.progress.champions) add(champion.build);
    for (const preset of PRESETS) add(preset.build);
    while (this.deckBuilds.length < 3) this.deckBuilds.push({ ...this.myBuild });
    const numeral = ['I', 'II', 'III'];
    for (let i = 0; i < this.deckButtons.length; i++) {
      const role = roleOf(specFromBuild(this.deckBuilds[i])).toUpperCase();
      this.deckButtons[i].set(`${numeral[i]} · ${role}`);
    }
  }

  private secretDeckPending() {
    return this.phase === 'ready' && this.secretDeckActive() && this.deckBuilds.length === 3 && this.deckChoice < 0;
  }

  /** Picks locally; the network only receives the exact build inside the rip event. */
  private updateSecretDeck(): boolean {
    const pending = this.secretDeckPending();
    for (const button of this.deckButtons) button.mesh.visible = pending && !this.photo;
    if (!pending) return false;
    this.count = null;
    if (!this.deckPrompted) {
      this.deckPrompted = true;
      this.label.set('SECRET DECK\nPick I, II or III · parts reveal on RIP');
      this.labelTimer = 0;
    }
    const picked = this.pickButton(this.deckButtons);
    if (!picked) return false;
    const index = Number(picked.slice(4));
    if (!Number.isInteger(index) || !this.deckBuilds[index]) return false;
    this.deckChoice = index;
    this.myBuild = { ...this.deckBuilds[index] };
    this.setBuilds(this.myBuild, this.theirBuild);
    for (const button of this.deckButtons) button.mesh.visible = false;
    this.stamp.show('DECK LOCKED', `TOP ${index + 1} · ${roleOf(specFromBuild(this.myBuild)).toUpperCase()}`, 'mine', 0.7);
    this.label.set(`${buildName(this.myBuild)} locked\nYour opponent sees it when you rip`);
    this.labelTimer = 1.4;
    this.count = { t: -0.4, beat: 0 };
    playPlace();
    return true;
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
    const tables = this.tables();
    const at = placeArena(this.head, this.fwd.x, this.fwd.z, tables, TUNE.reach);
    const table = pickTable(this.head, tables, at);
    const raycastTable = this.useRaycastPlacement(at);
    const y = at.y - PEDESTAL;
    this.print.visible = true;
    this.print.position.set(at.x, y + 0.002, at.z);
    this.print.rotation.y = at.yaw;
    this.print.scale.setScalar(1 + 0.06 * Math.sin(this.time * 5));
    const left = Math.max(0, 1 - this.settle / PRESS_WAIT);
    this.printWait.geometry.setDrawRange(0, Math.ceil(left * 64) * 6);
    // With a known table, a press counts within 4 cm of it; without, anywhere a desk could be.
    const surfaceY = raycastTable ? y : table;
    const lo = surfaceY !== null ? surfaceY - 0.04 : TABLE_MIN_H;
    const hi = surfaceY !== null ? surfaceY + 0.04 : Math.min(TABLE_MAX_H, this.head.y - 0.25);
    if (import.meta.env.DEV && Math.floor(this.settle) !== Math.floor(this.settle - dt)) console.log(`[PRESS] band ${lo.toFixed(3)}..${hi.toFixed(3)} print ${at.x.toFixed(2)},${y.toFixed(3)},${at.z.toFixed(2)} low ${this.hands.right.low.toFixed(3)} at ${this.hands.right.index.x.toFixed(2)},${this.hands.right.index.z.toFixed(2)}`);
    for (const side of ['left', 'right'] as const) {
      const h = this.hands[side];
      if (h.justPinched && (raycastTable || Math.hypot(h.pinchSmooth.x - at.x, h.pinchSmooth.z - at.z) < 0.1)) {
        console.log(`[MATCH] placed by ${raycastTable ? 'gaze + pinch' : 'a pinch on the print'}`);
        this.placeRoot(at);
        this.toHub();
        return true;
      }
      const hit = this.touches[side].update(h.tracked ? h.low : null, dt, lo, hi);
      if (hit === null) continue;
      this.placeRoot(raycastTable ? at : undefined);
      // Toward the hand a little, standing on the height the palm found.
      const p = this.root.position;
      const dx = h.indexSmooth.x - p.x;
      const dz = h.indexSmooth.z - p.z;
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
      this.spatialDirty = true;
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
    const snap = loadSnapshot(localStorage);
    this.toHub();
    if (snap) this.tryResume(snap);

    if (!this.onTable) {
      // No table found (or none labelled one): say so once the title is gone, then the first
      // session's note returns.
      const notice = () => {
        this.label.set(LESSON.noTable);
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
    // In the forge the card stands a little farther back.
    this.label.mesh.position.z = hudCardZ(far, p === 'forge');
    // Further away, the card and the bar grow so they read the same.
    const grow = hudGrow(far, this.pushed, TUNE.reach);
    // fitMatch may shrink the whole root to 70% to stay on a real table. Read surfaces cancel that
    // parent scale so type never becomes 30% smaller on the very tables that need it most.
    const readScale = 1 / Math.max(0.7, this.rootK);
    this.label.mesh.scale.setScalar(1.25 * grow * readScale);
    this.bar.mesh.scale.setScalar(0.21 * grow * readScale);
    this.stamp.worldScale = readScale;
    // The bar's top edge under the card's lower edge (it leans back, the card stands upright).
    this.bar.mesh.position.z = this.label.mesh.position.z + BAR_BACK * grow;
    // Their heights grow with them, so the card stays clear above the bar.
    // A wall higher than the standard one lifts them clear of it.
    const lift = Math.max(0, WALL_HEIGHT[L.wall] - WALL_HEIGHT.standard);
    this.bar.mesh.position.y = (BAR_Y + lift) * grow;
    if (this.phase === 'ready' || this.phase === 'fight' || this.phase === 'result') this.label.mesh.position.y = (LABEL_AT.y + lift) * grow;
    // In a bout every stamp stands just above the card (the card can still be speaking), never over the tops in play.
    if (this.phase === 'ready' || this.phase === 'fight' || this.phase === 'result') {
      this.stamp.mesh.position.set(this.label.mesh.position.x, this.label.mesh.position.y + HUD.stampLift, this.label.mesh.position.z + 0.01);
    }
    else this.stamp.mesh.position.set(0, 0.045, 0.03);
    // The menu stays where the hand finds it, however far the arena slid.
    this.menuButton.mesh.scale.setScalar(readScale);
    this.rematchButton.mesh.scale.setScalar(readScale);
    this.passButton.mesh.scale.setScalar(readScale);
    for (let i = 0; i < this.deckButtons.length; i++) {
      const button = this.deckButtons[i];
      button.mesh.scale.setScalar(readScale);
      button.mesh.position.set((i - 1) * 0.105 * readScale, MENU_Y, 0.225 + this.pushed / (ARENA_SCALE * this.rootK));
    }
    this.passButton.mesh.position.set(0, MENU_Y, 0.15 + this.pushed / (ARENA_SCALE * this.rootK));
    const resultButtonX = 0.15 * readScale;
    this.menuButton.mesh.position.set(-resultButtonX, MENU_Y, 0.14 + this.pushed / (ARENA_SCALE * this.rootK));
    this.rematchButton.mesh.position.set(resultButtonX, MENU_Y, 0.14 + this.pushed / (ARENA_SCALE * this.rootK));
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
  private placeRoot(forced?: Placement) {
    const head = this.player.head;
    head.getWorldPosition(this.head);
    head.getWorldDirection(this.fwd);
    // getWorldDirection returns +Z of the object; the camera looks down -Z.
    this.fwd.negate();
    const at = forced ?? placeArena(this.head, this.fwd.x, this.fwd.z, this.tables(), TUNE.reach);
    if (!forced) this.useRaycastPlacement(at);
    // On a table, its rim stays on the wood: moved in from the edge if it would hang over.
    if (at.onTable) {
      const table = this.tableShape(at);
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
    this.spatialDirty = true;
    this.tableY = null;
    this.placedAt = this.time;
    this.setRoom();
    console.log(`[MATCH] arena on ${at.onTable ? 'table' : 'tray'} at ${[at.x, at.y, at.z].map((v) => v.toFixed(2)).join(',')}`);
    if (import.meta.env.DEV) this.hubLogPending = true;
  }

  /** The move handle: a brass grip on a short post, out from the pedestal's near face. */
  private buildHandle() {
    const brass = BRASS;
    const post = new Mesh(new CylinderGeometry(0.003, 0.003, 0.02, 10).rotateX(Math.PI / 2), brass);
    post.position.z = -0.01;
    const grip = new Mesh(new TorusGeometry(0.009, 0.003, 8, 20), brass);
    this.handle.add(post, grip);
    this.handle.position.set(0, -0.026, 0.245);
    this.handle.visible = false;
  }

  /**
   * The usable table's outline (world x/z) and height, or null: the plane pickTablePlane chooses
   * for an arena standing at `spot` (default: where the arena stands now).
   */
  private tableShape(spot: XZ = { x: this.root.position.x, z: this.root.position.z }): { y: number; poly: XZ[] } | null {
    this.player.head.getWorldPosition(this.head);
    const t = pickTablePlane(this.head, this.tables(), spot);
    return t?.poly && t.poly.length >= 3 ? { y: t.y, poly: t.poly } : null;
  }

  /**
   * The real-edge cue. The danger sectors are computed in the arena ROOT's local frame (the frame
   * ROOM.poly and the tops share before the stage's own turn): each table corner goes world ->
   * root-local through root.worldToLocal, exactly like setRoom, and only when the table outline or
   * the root's pose/scale changes. The arcs live on the stage, so each one counter-rotates by the
   * stage's yaw (replay turn, forge twist, an online guest's half turn) to stay on the real edge.
   */
  private updateDeskEdge(stageYaw: number) {
    const arcs = this.deskArcs;
    const show = this.phase === 'fight' && this.onTable && !!ROOM.poly && !this.photo && !this.extras.length && !this.demo;
    // The drop side (sim.ts DESK_DROP_ESCAPE) plays only where both tops share one real desk: off
    // on the tray, online (each peer has its own desk; the host's sim is the only one) and in brawls.
    this.arena.drops.length = 0;
    if (!show) {
      arcs[0].visible = arcs[1].visible = false;
      return;
    }
    const L = this.arena.layout;
    const root = this.root;
    // Only a settled root (risen, at match size) has the pose the fight is played in.
    if (this.rise >= 1 && this.sizeSettled) {
      const s = root.scale.x;
      const key = `${root.position.x.toFixed(3)},${root.position.z.toFixed(3)},${root.rotation.y.toFixed(3)},${s.toFixed(4)},${L.name},${ROOM.poly!.length},${ROOM.poly![0].x.toFixed(3)},${ROOM.poly![0].z.toFixed(3)}`;
      if (key !== this.deskEdgeKey) {
        this.deskEdgeKey = key;
        const table = this.tableShape();
        let poly: XZ[];
        if (table) {
          root.updateWorldMatrix(true, false);
          poly = table.poly.map((p) => {
            const l = root.worldToLocal(this.p.set(p.x, table.y, p.z));
            return { x: l.x, z: l.z };
          });
        } else poly = ROOM.poly!; // DEV stand-in desk: already arena-local.
        // 25 cm of real desk beyond the rim still counts as "soon off the edge".
        this.deskEdgePoly = poly;
        this.deskEdgeSectors = deskSectors(poly, maxRim(L), 0.25 / s, arcs.length);
        this.deskEdgeSectors.forEach((sec, i) => {
          // RingGeometry turned flat (rotateX(-PI/2)) maps its theta to atan2 angle -theta.
          // rimRadius/height read the stage's own frame: root angle + stage yaw.
          const sa = sec.angle + stageYaw;
          const r = rimRadius(L, sa);
          const half = Math.min(sec.halfWidth, DESK_DROP_HALF_MAX);
          arcs[i].geometry.dispose();
          arcs[i].geometry = new RingGeometry(r * 1.02, r * 1.1, 24, 1, -sec.angle - half, half * 2).rotateX(-Math.PI / 2);
          arcs[i].position.y = this.arena.height(Math.cos(sa) * r * 0.97, Math.sin(sa) * r * 0.97) + WALL_HEIGHT[L.wall] + 0.002;
        });
        if (import.meta.env.DEV) console.log(`[DESK EDGE] ${this.deskEdgeSectors.map((d) => `${((d.angle * 180) / Math.PI).toFixed(0)}deg +-${((d.halfWidth * 180) / Math.PI).toFixed(0)} at ${(d.distance * s).toFixed(2)} m`).join('; ') || 'none'}`);
      }
    }
    const sectors = this.deskEdgeSectors;
    const top = this.theirs;
    // The rival's direction in the root frame: the stage turns its local angles by -stageYaw.
    const rivalAngle = Math.atan2(top.z, top.x) - stageYaw;
    const rivalNear = top.alive && normRadius(L, top.x, top.z) > 0.75;
    for (let i = 0; i < arcs.length; i++) {
      const sec = sectors[i];
      const arc = arcs[i];
      arc.visible = !!sec;
      if (!sec) continue;
      arc.rotation.y = -stageYaw;
      // The red arc IS the drop side: same middle, same capped width, in the sim (stage) frame.
      // Not in the first match: its lessons (and the staged wrench, which throws on its own) teach
      // the moves before the room starts changing the rim.
      if (!this.online?.peer && this.progress.matches > 0) {
        const d = this.deskDrops[i];
        d.angle = sec.angle + stageYaw;
        d.half = Math.min(sec.halfWidth, DESK_DROP_HALF_MAX);
        this.arena.drops.push(d);
      }
      const now = (rivalNear && inSector(sec, rivalAngle)) || (i === 0 && this.deskWrenchAt() !== null);
      const m = arc.material;
      m.opacity = now ? 0.55 + 0.2 * Math.sin(this.time * 9) : 0.3 + 0.08 * Math.sin(this.time * 1.8 + i);
      // Red, not the bowl's orange: the warning must not melt into the rim it sits on.
      m.color.setHex(now ? 0xfff0c8 : warnColor(0xff2a3a, SAFE_COLORS.edge));
    }
    if (sectors.length && this.progress.matches > 0 && this.deskEdgeHintMatch !== this.progress.matches && this.labelTimer <= 0) {
      this.deskEdgeHintMatch = this.progress.matches;
      this.call(this.arena.drops.length ? 'REAL EDGE: LOW RIM\nTHROW THEM OFF YOUR DESK' : 'REAL EDGE\nTHROW THEM OFF YOUR DESK', CALL.tactic, 2);
    }
  }

  /** The lowest horizontal plane labelled floor, else the floor of the local-floor space (0). */
  private floorY(): number {
    return this.floorPlaneY() ?? 0;
  }

  /** The lowest horizontal plane labelled floor, or null when the room has none. */
  private floorPlaneY(): number | null {
    let y = 0;
    let found = false;
    for (const e of this.queries.planes.entities) {
      const plane = e.getValue(XRPlane, '_plane') as RawPlane | undefined;
      if (plane?.orientation !== 'horizontal' || !/floor/.test(plane.semanticLabel ?? '')) continue;
      const py = e.object3D!.getWorldPosition(this.local).y;
      if (!found || py < y) y = py;
      found = true;
    }
    return found ? y : null;
  }

  /**
   * Tells the views where the real table and floor are (arena-local), and fits the depth-only
   * table that hides anything falling behind or below the real desk.
   */
  private setRoom() {
    const table = this.onTable ? this.tableShape() : null;
    if (!table) {
      // IWER occasionally fails to load its living-room plane set. Keep production conservative
      // (no known table means no desk rescue), but give the emulator a repeatable 78 x 62 cm desk
      // so Outer Ring and the real-edge KO remain testable without a Quest.
      ROOM.poly = import.meta.env.DEV
        ? [{ x: -0.325, z: -0.26 }, { x: 0.325, z: -0.26 }, { x: 0.325, z: 0.26 }, { x: -0.325, z: 0.26 }]
        : null;
      ROOM.floor = import.meta.env.DEV ? -PEDESTAL / ARENA_SCALE - 0.3 : null;
      this.tableMask.visible = false;
      return;
    }
    this.root.updateWorldMatrix(true, false);
    ROOM.poly = table.poly.map((p) => {
      const l = this.root.worldToLocal(this.p.set(p.x, table.y, p.z));
      return { x: l.x, z: l.z };
    });
    ROOM.floor = this.root.worldToLocal(this.p.set(this.root.position.x, this.floorY(), this.root.position.z)).y;
    // This depth-only table is for real Quest passthrough. IWER has no camera compositor behind
    // it, so its invisible pixels become a large white cut-out in emulator recordings.
    if ('IWER_DEVICE' in window) {
      this.tableMask.visible = false;
      return;
    }
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
  private planeW = new Vector3();
  private planeQ = new Quaternion();
  /**
   * The detected planes that could hold the arena (world centers and outlines): labelled tables
   * and desks (rank 0), and unlabelled flat surfaces at desk height (rank 1, see tableRank).
   */
  private tables(): TablePlane[] {
    const out: TablePlane[] = [];
    const floor = this.floorPlaneY();
    const headY = this.player.head.getWorldPosition(this.planeW).y;
    for (const e of this.queries.planes.entities) {
      const plane = e.getValue(XRPlane, '_plane') as RawPlane | undefined;
      // ponytail: '_plane' is IWSDK-internal (pinned 1.0.1); an update that renames it shows up here.
      if (!plane && !this.warnedPlane) {
        this.warnedPlane = true;
        console.warn('[MATCH] XRPlane has no _plane: table detection is off (IWSDK changed?)');
      }
      // WebXR may leave orientation unset (IWER derives it from the label only, so an unlabelled
      // plane has none); tableRank then judges it by its normal.
      if (!plane || plane.orientation === 'vertical') continue;
      const o = e.object3D!;
      o.updateWorldMatrix(true, false);
      const c = o.getWorldPosition(new Vector3());
      // The polygon is in the plane's own space; its world outline is what the arena sits inside.
      const poly = (plane.polygon ?? []).map((p) => {
        const w = this.planeW.set(p.x, p.y, p.z).applyMatrix4(o.matrixWorld);
        return { x: w.x, z: w.z };
      });
      const upY = this.planeW.set(0, 1, 0).applyQuaternion(o.getWorldQuaternion(this.planeQ)).y;
      const rank = tableRank({ orientation: plane.orientation, semanticLabel: plane.semanticLabel, upY, y: c.y, poly }, floor, headY);
      if (rank === null) continue;
      out.push({ x: c.x, y: c.y, z: c.z, rank, poly: poly.length >= 3 ? poly : undefined });
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
      const table = pickTable(this.head, this.tables(), { x: this.root.position.x, z: this.root.position.z });
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
        if (h.pinchSmooth.distanceTo(this.p) > HANDLE_GRAB) continue;
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
      this.spatialDirty = true;
      return true;
    }
    this.dragging = null;
    this.player.head.getWorldPosition(this.head);
    this.root.rotation.set(0, Math.atan2(this.head.x - p.x, this.head.z - p.z), 0);
    this.onTable = this.tables().some((t) => Math.abs(p.y - (t.y + PEDESTAL)) < 1e-3);
    this.spatialDirty = true;
    this.placedAt = this.time;
    this.setRoom();
    playPlace();
    console.log(`[MATCH] arena moved to ${[p.x, p.y, p.z].map((v) => v.toFixed(2)).join(',')}`);
    if (import.meta.env.DEV) this.hubLogPending = true;
    return true;
  }

  private toReady() {
    this.cancelActiveGestures();
    this.resetEmber();
    for (const t of this.extras) {
      t.state = 'out';
      t.finish = null;
    }
    this.brawlOut.clear();
    this.brawlLastHit.fill(-1);
    this.botShapeAt = [TUNING.grace + 1 + Math.random() * 2, TUNING.grace + 2 + Math.random() * 2];
    this.oneHandAt = -1;
    this.trails.clear();
    this.impacts.clear();
    if (this.phase === 'placing') return;
    this.readySince = this.time;
    this.matchOver = false;
    this.phase = 'ready';
    this.snapRound();
    this.markFirstFive(2);
    this.outerRingState = 'idle';
    this.outerRingCompleted = false;
    this.deskVerdict = null;
    this.deskKoScored = false;
    this.setDeskKoStage(0);
    this.lastRoundHeat = 0;
    this.outerRingUsed = false;
    this.outerRingLeft = 0;
    this.outerRailSide = null;
    this.outerRailCount = 0;
    this.outerRailLength = 0;
    this.outerRail.visible = false;
    this.outerRailHead.visible = false;
    this.outerRailGeometry.setDrawRange(0, 0);
    this.arenaMorphing = false;
    this.arenaMorphHold = 0;
    this.arenaMorph.scaleX = this.arenaMorph.scaleZ = 1;
    this.arenaMorph.tilt = 0;
    this.arenaMorphPull = this.arenaMorphTwist = 0;
    this.arenaView.setForgeDents(0, 0, 0, 0, 0);
    this.publishArenaMorph();
    // A pull cut short (a recenter) leaves no drone and no lit ring.
    this.cordTone.update(null);
    this.chargeRing.visible = false;
    this.menuButton.mesh.visible = false;
    this.rematchButton.mesh.visible = false;
    this.passButton.mesh.visible = false;
    this.arena.reset();
    this.arenaDirty = true;
    // Both tops wait upright at their spawn points.
    if (!this.typesPicked && this.secretDeckActive()) {
      this.deckChoice = -1;
      this.deckPrompted = false;
    }
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
    // The rival takes a new spot on the far half each round. After two repeated starts it openly
    // lines up a counter through that side; changing zones breaks the read.
    const memory = this.progress.openingAgainst(this.rival.name);
    const read = memory && memory.streak >= 2 && memory.zone !== 'neutral' ? memory : null;
    this.rivalRead = read ? `${this.rival.name} read your ${read.zone} start` : '';
    this.rivalAngle = read ? -Math.PI / 2 + Math.max(-0.7, Math.min(0.7, -read.x * 0.9)) : -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
    const [rx, rz] = this.rivalSpot();
    this.launchFrom = null;
    this.launchPreviewSide = null;
    this.palmLauncherSide = null;
    this.launchZoneKind = 'neutral';
    this.launchArenaKind = 'standard';
    this.launchTwist = this.devLaunchTwist = 0;
    this.launchTiming = 1;
    this.ripBeatAt = -1;
    this.firstClashPending = false;
    this.openingOutcome = '';
    this.launchMarker.visible = this.launchAim.visible = this.launchGhost.visible = false;
    const echo = this.lastOpeningTrace;
    this.openingEcho.visible = !!echo && echo.rival === this.rival.name && echo.arena === this.arena.layout.name && !this.demo;
    if (this.openingEcho.visible && echo) {
      this.openingEcho.position.set(echo.x, this.arena.height(echo.x, echo.z) + 0.004, echo.z);
      this.openingEcho.rotation.y = echo.angle;
      this.openingEchoShaft.scale.z = echo.length;
      this.openingEchoHead.position.z = echo.length;
      this.openingEchoMaterial.color.setHex(echo.outcome.includes('COUNTER') ? 0x8b4650 : 0xc47a43);
    }
    this.mine.launch(0, this.SPAWN, 0, 0, 1, this.mine.hand);
    this.theirs.launch(rx, rz, 0, 0, 1, this.theirs.hand);
    this.planRivalLaunch();
    this.launchSafeZone.position.set(0, this.arena.height(0, 0) + 0.002, 0);
    this.launchSafeZone.material.color.setHex(warnColor(0x49d8ff, SAFE_COLORS.safe));
    this.launchDangerZone.material.color.setHex(warnColor(0xff3b24, SAFE_COLORS.danger));
    this.launchDangerZone.position.set(rx, this.arena.height(rx, rz) + 0.002, rz);
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
      const bout = this.bout;
      const sub = bout ? bout.night ? `NIGHT CIRCUIT · REMIX ${bout.id}` : `${CHAPTERS[bout.chapter - 1].name} · ${bout.boss ? 'BOSS' : `BOUT ${bout.id}`}` : this.rival.title;
      if (this.demo) this.stamp.show(vs, sub, 'rival', 1.6);
      else if (!this.introDone) this.entrance = { t: 0, vs, sub, champion: bout ? bout.boss : !!c?.champion };
      this.introDone = true;
      // The first rematch says what the new part changes (the same rival: a clean comparison).
      const watch = this.progress.matches === 1 && this.myBuild.tip === 'spur' ? `Watch your Spur: it turns on ${this.rival.name} sooner` : `"${this.rival.intro}"`;
      const brawlRule = this.activeBrawlMode === 'pocket' ? 'First credited pocket wins' : this.activeBrawlMode === 'crucible' ? 'First credited 3-heat pocket wins' : 'Last top spinning takes the heat';
      const focus = this.extras.length
        ? `${brawlModeName(this.activeBrawlMode)} · ${brawlRule}`
        : bout && this.progress.guide === 'done' && !this.rivalRead
          ? bout.lesson
          : this.rivalRead || watch;
      // The type loop, read before the rip: whose top counters whose.
      const edge = this.progress.guide === 'done' ? edgeOf(roleOf(specFromBuild(this.myBuild)), roleOf(specFromBuild(this.rival.build))) : 0;
      const read = edge > 0 ? ' · you counter it' : edge < 0 ? ' · it counters you' : '';
      // The first match's card is just who it is: the ghost hand teaches, the quote can wait.
      this.label.set(this.progress.matches === 0 && !this.demo && !this.extras.length ? lessonText.rival(this.rival.name, this.rival.title) : `${this.rival.name.toUpperCase()} · ${this.rival.title.toUpperCase()}${read}\n${focus}`);
    }
    else {
      this.label.set('');
      // Later rounds are framed: the round, or what is at stake.
      const point = MATCH_HEAT - 1;
      const word = this.quietFirst ? `ROUND ${this.round + 1}` : this.myPoints >= point && this.theirPoints >= point ? 'FINAL ROUND' : this.myPoints >= point || this.theirPoints >= point ? 'MATCH POINT' : `ROUND ${this.round + 1}`;
      this.stamp.show(word, `${this.myPoints} - ${this.theirPoints}`, 'neutral', 0.9);
      // A boss one round from defeat finds its second wind: it says so, then fights harder.
      // A bout's twist is said once, as its second round starts (the intro card names its lesson).
      if (this.bout && this.round === 1 && !this.rivalRead && this.progress.guide === 'done') {
        this.label.set(this.bout.twist);
        this.labelTimer = 2.4;
      }
      if (this.bossRage()) this.stamp.later('SECOND WIND', `${this.rival.name.toUpperCase()} WON'T GO QUIETLY`, 'rival', 1.1, 1.2);
      playGong();
      if (this.rivalRead) {
        this.label.set(`${this.rivalRead}\nIts cyan line has changed`);
        this.labelTimer = 2.2;
      }
    }
    // The countdown to the rip, after the first session's lessons (not over its hints).
    this.count = !this.demo && this.progress.guide === 'done' ? { t: -0.4, beat: 0 } : null;
    this.bar.mesh.visible = true;
    this.barMessage = 'READY';
    this.barPoints = [this.myPoints, this.theirPoints];
  }

  private toLocal(world: Vector3) {
    return this.root.worldToLocal(this.local.copy(world));
  }

  private classifyLaunch(x: number, z: number) {
    const n = normRadius(this.arena.layout, x, z);
    const nearRival = Math.hypot(x - this.theirs.x, z - this.theirs.z) < LAUNCH_GAP * 1.35;
    this.launchZoneKind = nearRival ? 'ambush' : n < 0.32 ? 'center' : n > 0.68 ? 'edge' : 'neutral';
    const angle = Math.atan2(z, x);
    const layout = this.arena.layout;
    if (n > 0.55 && railAt(layout, angle)) this.launchArenaKind = 'rail';
    else if (n > 0.55 && pocketAt(layout, angle)) this.launchArenaKind = 'pit';
    else if (layout.pads?.some((p) => Math.hypot(x - p.x * layout.radius, z - p.z * layout.radius) < layout.radius * 0.2)) this.launchArenaKind = 'boost';
    else if (layout.tilt > 0) this.launchArenaKind = 'zero-g';
    else if (n > 0.42 && (layout.floor === 'ridge' || layout.floor === 'waves' || layout.floor === 'hill' || layout.floor === 'tiers')) this.launchArenaKind = 'ramp';
    else this.launchArenaKind = 'standard';
  }

  private launchReadout() {
    const zone = this.launchZoneKind === 'center' ? 'CENTER · +SPIN' : this.launchZoneKind === 'edge' ? 'EDGE · +DASH' : this.launchZoneKind === 'ambush' ? 'AMBUSH · FIRST HIT' : '';
    const arena = this.launchArenaKind === 'rail' ? 'RAIL START' : this.launchArenaKind === 'pit' ? 'PIT LINE · HIGH RISK' : this.launchArenaKind === 'boost' ? 'BOOST START' : this.launchArenaKind === 'zero-g' ? 'ZERO-G · +CURVE' : this.launchArenaKind === 'ramp' ? 'RAMP START' : '';
    return [zone, arena].filter(Boolean).join(' · ');
  }

  /** Moves the waiting top under an open fingertip and remembers the legal launch point. */
  private previewLaunch(world: Vector3) {
    const l = this.toLocal(world);
    const n = normRadius(this.arena.layout, l.x, l.z);
    if (n > 1.05 || Math.abs(l.y - this.arena.height(l.x, l.z)) >= LAUNCH_HOVER) return false;
    // The outer band is magnetic: shaky fingertips settle onto one clean tactical launch ring.
    const k = n > LAUNCH_MAX_N - 0.12 ? LAUNCH_MAX_N / Math.max(1e-6, n) : 1;
    let x = l.x * k;
    let z = l.z * k;
    // Never right on top of the rival.
    const dx = x - this.theirs.x;
    const dz = z - this.theirs.z;
    const d = Math.hypot(dx, dz);
    if (d < LAUNCH_GAP) {
      x = this.theirs.x + (d > 1e-6 ? dx / d : 0) * LAUNCH_GAP;
      z = this.theirs.z + (d > 1e-6 ? dz / d : 1) * LAUNCH_GAP;
    }
    if (!this.launchFrom) this.launchFrom = { x: this.mine.x, z: this.mine.z };
    const smooth = 1 - Math.exp(-this.frameDt * 18);
    this.launchFrom.x += (x - this.launchFrom.x) * smooth;
    this.launchFrom.z += (z - this.launchFrom.z) * smooth;
    const from = this.launchFrom;
    const y = this.arena.height(from.x, from.z);
    this.launchGhost.visible = this.launchMarker.visible = true;
    this.launchGhost.position.set(from.x, y, from.z);
    this.launchGhost.rotation.y += this.frameDt * 1.8;
    this.launchMarker.position.set(from.x, y + 0.002, from.z);
    this.launchMarker.scale.setScalar(1 + 0.08 * Math.sin(this.time * 8));
    this.launchMarkerMaterial.opacity = 0.8;
    const previousZone = this.launchZoneKind;
    const previousArena = this.launchArenaKind;
    this.classifyLaunch(from.x, from.z);
    const zone = this.launchZoneKind;
    // The zone is also named on the card (launchReadout), so colour is never the only signal.
    this.launchMarkerMaterial.color.setHex(COMFORT.colorSafe ? (zone === 'ambush' ? SAFE_COLORS.danger : zone === 'edge' ? SAFE_COLORS.edge : zone === 'center' ? SAFE_COLORS.safe : SAFE_COLORS.neutral) : zone === 'ambush' ? 0xff3b24 : zone === 'edge' ? 0xffd34d : zone === 'center' ? 0x49d8ff : 0xff8a2a);
    if ((previousZone !== this.launchZoneKind || previousArena !== this.launchArenaKind) && this.progress.guide === 'done' && !this.entrance && !this.stamp.mesh.visible) this.label.set(this.launchReadout());
    return true;
  }

  /**
   * In ready/result: a pinch anywhere starts the pull. No target to hit. If both hands pinch in
   * the same frame (the emulator's click does), the hand closer to the arena wins.
   */
  private updateReadyPinch() {
    this.palmLauncherDebug = 'entered';
    // After the deciding round the result card leads back home, not into another round.
    if (this.matchOver) {
      this.palmLauncherDebug = 'match-over';
      return;
    }
    // Not while the arena is still opening out under the hand.
    if (!this.sizeSettled) {
      this.palmLauncherDebug = 'size-moving';
      return;
    }
    let pick: Side | null = null;
    let best = Infinity;
    for (const side of ['left', 'right'] as const) {
      const h = this.hands[side];
      if (!h.tracked || !h.justPinched) continue;
      // A single tracked hand must still be able to launch. If the hand that was previewing as the
      // open-palm support pinches, release that role and treat the same gesture as the normal cord
      // grab; with two hands, the untouched palm remains the natural support path.
      if (this.palmLauncherSide === side) {
        this.palmLauncherSide = null;
        this.launcherBrace.visible = false;
      }
      const d = h.pinchSmooth.distanceTo(this.root.position);
      if (d < best && d < LAUNCH_REACH) {
        best = d;
        pick = side;
      }
    }
    if (!pick) {
      if (this.phase === 'ready') {
        this.palmLauncherDebug = 'scanning';
        this.launchPreviewSide = null;
        let hover: Side | null = null;
        let hoverDistance = Infinity;
        // Once an open palm has accepted the cradle, keep it while the other hand approaches the
        // cord. Without this latch, whichever hand got one centimetre closer would steal the top.
        const latched = this.palmLauncherSide;
        if (latched) {
          const h = this.hands[latched];
          const palm = this.p.copy(h.wrist).lerp(h.index, 0.5);
          if (h.tracked && !h.pinching && palm.distanceTo(this.root.position) < LAUNCH_REACH && this.previewLaunch(palm)) hover = latched;
          else this.palmLauncherSide = null;
        }
        for (const side of ['left', 'right'] as const) {
          if (hover) break;
          const h = this.hands[side];
          if (!h.tracked || h.pinching) continue;
          const palm = this.p.copy(h.wrist).lerp(h.index, 0.5);
          const d = palm.distanceTo(this.root.position);
          if (h.tracked && !h.pinching && d < hoverDistance && d < LAUNCH_REACH) {
            hover = side;
            hoverDistance = d;
          }
        }
        let palmShown = false;
        if (hover) {
          const h = this.hands[hover];
          const palm = this.p.copy(h.wrist).lerp(h.index, 0.5);
          if (this.previewLaunch(palm)) {
            this.launchPreviewSide = hover;
            this.palmLauncherSide = hover;
            this.launcherBrace.visible = !this.photo;
            this.launcherBrace.position.set(this.launchFrom!.x, this.arena.height(this.launchFrom!.x, this.launchFrom!.z) + 0.004, this.launchFrom!.z);
            palmShown = true;
            this.palmLauncherDebug = hover === 'left' ? 'active-left' : 'active-right';
            if (this.progress.guide === 'done' && !this.entrance && !this.stamp.mesh.visible) this.label.set('PALM LAUNCHER READY\nOTHER HAND: PINCH + PULL');
          }
        }
        if (!palmShown) {
          this.palmLauncherDebug = hover ? 'preview-rejected' : 'no-open-hand';
          this.launchGhost.visible = this.launchMarker.visible = false;
          this.launcherBrace.visible = false;
        }
      }
      return;
    }
    const h = this.hands[pick];
    // On the result card a pinch only moves on (to the next round's ready); it never also grabs the
    // rip cord, and while a replay plays it only skips the replay.
    if (this.phase === 'result') {
      if (!this.replay) this.toReady();
      return;
    }
    // Lock the point shown before the pinch; if this hand never previewed one, try its index now.
    if (!this.palmLauncherSide && this.launchPreviewSide !== pick && !this.previewLaunch(h.indexSmooth)) {
      this.launchFrom = null;
      this.mine.x = 0;
      this.mine.z = this.SPAWN;
    }
    if (this.launchFrom) {
      this.mine.x = this.launchFrom.x;
      this.mine.z = this.launchFrom.z;
      this.launchGhost.visible = false;
      this.launchMarkerMaterial.opacity = 1;
      const y = this.arena.height(this.mine.x, this.mine.z);
      this.sparks.burst(this.mine.x, y, this.mine.z, 0.22);
      playTick();
    } else this.launchMarker.visible = false;
    this.phase = 'pulling';
    this.puller = pick;
    this.pullStart.copy(h.pinch);
    this.pullStartQuat.copy(h.rayQuat);
    this.launchTwist = 0;
    this.maxPull = 0;
    this.pullPeakPower = 0;
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
  private updateLaunchBrace() {
    if (this.puller === null) {
      this.bracedLaunch = false;
      this.launcherBrace.visible = false;
      return;
    }
    const supportSide: Side = this.palmLauncherSide ?? (this.puller === 'left' ? 'right' : 'left');
    const h = this.hands[supportSide];
    this.root.localToWorld(this.p.set(this.mine.x, this.arena.height(this.mine.x, this.mine.z) + 0.025, this.mine.z));
    const palm = this.handAt.copy(h.wrist).lerp(h.index, 0.5);
    this.bracedLaunch = h.tracked && !h.pinching && palm.distanceTo(this.p) <= 0.115;
    this.launcherBrace.visible = this.bracedLaunch && !this.photo;
    if (!this.bracedLaunch) return;
    this.launcherBrace.position.set(this.mine.x, this.arena.height(this.mine.x, this.mine.z) + 0.004, this.mine.z);
    this.launcherBrace.rotation.y = this.time * 0.8;
    this.launcherBrace.scale.setScalar(1 + 0.08 * Math.sin(this.time * 9));
  }

  private updatePull(dt: number) {
    const h = this.hands[this.puller!];
    this.updateLaunchBrace();
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
      // Power is the speed at release and fades once the hand stops: say so the moment it drops.
      this.pullPeakPower = Math.max(this.pullPeakPower, power);
      const fading = this.pullPeakPower >= 0.5 && power < this.pullPeakPower - 0.12 ? '\nLET GO WHILE MOVING' : '';
      // In 5% steps, so the card is not redrawn every frame of the pull.
      const pct = Math.round(power * 20) * 5;
      const curve = Math.abs(this.launchTwist) > 0.2 ? ` · CURVE ${this.launchTwist > 0 ? 'RIGHT' : 'LEFT'}` : '';
      const brace = this.bracedLaunch ? ' · BRACED' : '';
      if (!this.quietFirst) this.label.set(power >= PERFECT ? `WHITE HOT ${pct}%${curve}${brace}` : power > 0 ? `${pct}%${curve}${brace}${fading}` : `${LESSON.ripPull}${brace}`);
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

  /** Why a gesture did nothing, on the card for 2 s; the active lesson resumes afterwards. */
  private failSay(text: string) {
    this.failedGestures++;
    this.rootEntity?.setValue(FirstFiveState, 'failedGestures', this.failedGestures);
    // During normal play, preserve the first-round rival intro. During the first lesson the failed
    // rip is more important: silence makes the top resetting look broken to a new player.
    if (this.demo || (this.progress.guide === 'done' && this.myPoints + this.theirPoints === 0)) return;
    this.label.set(text);
    this.labelTimer = 2;
  }

  /** Advances coarse first-session evidence without ever moving it backwards. */
  private markFirstFive(step: number) {
    if (step <= this.firstFiveStep) return;
    this.firstFiveStep = step;
    this.rootEntity?.setValue(FirstFiveState, 'step', step);
  }

  /** Mirrors the readable DESK KO sequence into ECS for emulator and remote-device proof. */
  private setDeskKoStage(stage: 0 | 1 | 2 | 3) {
    if (this.deskKoStage === stage) return;
    this.deskKoStage = stage;
    this.rootEntity?.setValue(FirstFiveState, 'deskKoStage', stage);
  }

  /** Counts a player-authored arena change and marks the signature loop as reached. */
  private recordIntervention() {
    this.theirs.shieldUntil = 0;
    this.interventionCount++;
    this.rootEntity?.setValue(FirstFiveState, 'interventions', this.interventionCount);
    this.markFirstFive(4);
  }

  /** Records which whole-arena hand move fired and whether it improved the player's rim safety. */
  private recordArenaForge(action: ArenaForgeAction, swing: number) {
    this.arenaForgeAction = action;
    this.arenaForgeSwing = swing;
    this.rootEntity?.setValue(FirstFiveState, 'lastArenaForge', ARENA_FORGE_CODE[action]);
    this.rootEntity?.setValue(FirstFiveState, 'arenaForgeSwing', swing);
  }

  /** Publishes the live deformation for deterministic emulator and remote-device proof. */
  private publishArenaMorph() {
    this.rootEntity?.setValue(FirstFiveState, 'arenaMorphTwist', this.arenaMorphTwist);
    this.rootEntity?.setValue(FirstFiveState, 'arenaMorphTilt', this.arenaMorph.tilt);
  }

  /** A released or lost two-hand grab below the intent threshold changes neither combat nor economy. */
  private cancelArenaForge(message: string) {
    this.arenaForgeCancels++;
    this.arenaForgeAction = 'none';
    this.arenaForgeSwing = 0;
    this.rootEntity?.setValue(FirstFiveState, 'arenaForgeCancels', this.arenaForgeCancels);
    this.rootEntity?.setValue(FirstFiveState, 'lastArenaForge', 0);
    this.rootEntity?.setValue(FirstFiveState, 'arenaForgeSwing', 0);
    this.arenaMorphHold = 0;
    this.arenaMorphTwist = 0;
    this.arenaView.setForgeDents(0, 0, 0, 0, 0);
    this.arenaDirty = true;
    this.publishArenaMorph();
    this.label.set(message);
    this.labelTimer = 1.35;
    if (import.meta.env.DEV) console.log(`[MORPH] cancelled: ${message.replace('\n', ' ')}`);
  }

  /** One-second samples are stable enough for a remote headset tester to report honestly. */
  private updateFirstFiveFps(dt: number) {
    if (dt <= 0 || dt > 0.25) return;
    this.fpsWindowTime += dt;
    this.fpsWindowFrames++;
    if (this.fpsWindowTime < 1) return;
    const fps = this.fpsWindowFrames / this.fpsWindowTime;
    this.lowestFps = this.lowestFps === 0 ? fps : Math.min(this.lowestFps, fps);
    this.rootEntity?.setValue(FirstFiveState, 'lowestFps', this.lowestFps);
    this.lastFps = fps;
    const bucket = fpsPhase(this.phase);
    if (bucket) this.fpsBook.add(bucket, fps);
    this.guardFrameRate(fps, this.fpsWindowTime);
    this.drawFpsOverlay();
    this.fpsWindowTime = 0;
    this.fpsWindowFrames = 0;
  }

  /** While ripping: the top spins up, the cord heats from white to orange, a glow ring grows under it. */
  private showCharge(power: number, dt: number) {
    // shortcut: target-ray roll stands in for wrist roll until a real Quest can calibrate hand joints.
    this.twistQuat.copy(this.pullStartQuat).invert().multiply(this.hands[this.puller!].rayQuat);
    let roll = 2 * Math.atan2(this.twistQuat.z, this.twistQuat.w);
    if (roll > Math.PI) roll -= Math.PI * 2;
    if (roll < -Math.PI) roll += Math.PI * 2;
    const handTwist = Math.sign(roll) * Math.max(0, Math.abs(roll) - 0.12) / 0.55;
    const wanted = Math.max(-1, Math.min(1, handTwist + (import.meta.env.DEV ? this.devLaunchTwist : 0)));
    this.launchTwist += (wanted - this.launchTwist) * (1 - Math.exp(-dt * 14));
    const y = this.arena.height(this.mine.x, this.mine.z);
    this.root.localToWorld(this.cordStart.set(this.mine.x, y + 0.03, this.mine.z));
    this.cord.set(this.cordStart, this.hands[this.puller!].pinch, power, dt);
    this.cordTone.update(power);
    this.mine.angle += (6 + 70 * power) * dt;
    this.chargeRing.visible = power > 0;
    this.chargeRing.position.set(this.mine.x, y + 0.001, this.mine.z);
    this.chargeRing.scale.setScalar(0.7 + 0.9 * power);
    (this.chargeRing.material as MeshBasicMaterial).opacity = 0.25 + 0.75 * power;
    // The arrow is the launch result, not the hand motion: it points opposite the pull.
    const now = this.p.copy(this.toLocal(this.hands[this.puller!].pinch));
    const start = this.handleWorld.copy(this.toLocal(this.pullStart));
    const dx = start.x - now.x;
    const dz = start.z - now.z;
    const flat = Math.hypot(dx, dz);
    this.launchAim.visible = flat > 0.004;
    if (this.launchAim.visible) {
      const length = 0.035 + 0.1 * power;
      this.launchAim.position.set(this.mine.x, y + 0.003, this.mine.z);
      this.launchAim.rotation.y = Math.atan2(dx, dz) + this.launchTwist * (this.arena.layout.tilt > 0 ? 0.32 : 0.24);
      this.launchAimShaft.scale.z = length;
      this.launchAimHead.position.z = length;
      this.launchAimMaterial.color.setHex(power >= PERFECT ? 0xffffff : power > 0.65 ? 0xffd34d : 0xff8a2a);
      this.launchAimMaterial.opacity = 0.45 + 0.55 * power;
    }
  }

  /**
   * "3, 2, 1, RIP!" before each round. Releasing close to RIP gives a small opening bonus; the
   * countdown waits for the arena, rival entrance and any previous stamp.
   */
  private updateCountdown(dt: number) {
    const c = this.count;
    if (!c) return;
    if (this.phase !== 'ready' && this.phase !== 'pulling') {
      this.count = null;
      return;
    }
    if (c.beat === 0 && (this.entrance || !this.sizeSettled || this.stamp.mesh.visible)) return;
    c.t += dt;
    if (this.ripBeatAt < 0) this.ripBeatAt = this.time + Math.max(0, 3 * COUNT_BEAT - c.t);
    if (c.t < 0) return;
    while (c.beat < 4 && c.beat * COUNT_BEAT <= c.t) {
      const rip = c.beat === 3;
      this.stamp.show(rip ? 'RIP!' : String(3 - c.beat), '', rip ? 'mine' : 'neutral', rip ? 0.45 : COUNT_BEAT - 0.3, rip ? 1.3 : 1.1);
      if (rip) playStamp();
      else playTick();
      c.beat++;
    }
    if (c.beat >= 4) this.count = null;
  }

  /**
   * Launches both tops. Yours from `from` (or its usual spot) along `dir` (or `aim` off straight
   * ahead, angled into its orbit); `steep` 0..1 trades launch speed for spin.
   */
  private launch(power: number, aim: number, from: { x: number; z: number } | null = null, dir: { x: number; z: number } | null = null, steep = 0) {
    if (this.secretDeckPending()) {
      this.locked('Pick one secret-deck top before you rip');
      return;
    }
    // Online: the guest only sends its rip and waits for the host's launch; the host waits for the guest's rip.
    const net = this.online?.peer ? this.online : null;
    if (net && !this.netGo) {
      if (net.role === 'guest') {
        // The spot the guest picked (its own arena-local frame) goes in the host's frame: turned half round.
        net.sendEvent({ kind: 'rip', power, aim, steep, twist: this.launchTwist, build: encodeBuild(this.myBuild), ...(from ? { at: [-from.x, -from.z] as [number, number] } : {}), ...(dir ? { dir: [-dir.x, -dir.z] as [number, number] } : {}) });
        this.netPending = [power, aim, from, dir, steep];
        this.waitForPeer();
        this.label.set(`Ripped\nWaiting for ${net.peerName || 'the host'}`);
        this.labelTimer = 0;
        return;
      }
      if (!this.netRip) {
        this.netPending = [power, aim, from, dir, steep];
        this.waitForPeer();
        this.label.set(`Ripped\nWaiting for ${net.peerName || 'your guest'} to rip`);
        this.labelTimer = 0;
        return;
      }
    }
    if (net?.role === 'host' && this.netRip) {
      this.rivalLaunchPower = this.netRip.power;
      this.rivalLaunchAim = this.netRip.aim;
      const picked = this.netRip.build ? decodeBuild(this.netRip.build) : null;
      if (picked) {
        this.setBuilds(this.myBuild, { ...picked, color: OPPONENT_COLOR });
        this.stamp.show('DECKS REVEALED', `${roleOf(this.mine.spec).toUpperCase()} VS ${roleOf(this.theirs.spec).toUpperCase()}`, 'neutral', 0.65);
      }
    }
    if (this.phase === 'result') this.toReady();
    const braced = this.bracedLaunch;
    const speed = launchSpeed(power);
    const perfect = power >= PERFECT;
    const beatError = this.ripBeatAt < 0 ? Infinity : Math.abs(this.time - this.ripBeatAt);
    const timingHelp = braced ? 1.25 : 1;
    this.launchTiming = beatError <= 0.12 * timingHelp ? 1.08 : beatError <= 0.28 * timingHelp ? 1.04 : 1;
    this.lastPerfect = perfect;
    this.charges.reset();
    this.forgeBar.reset();
    this.resetEmber();
    if (this.progress.matches === 0 && !this.demo) this.tutorialRound++;
    this.deskWrench.armed = this.progress.matches === 0 && !this.demo && this.tutorialRound === 2 && !this.extras.length && !this.online;
    this.deskWrench.fired = false;
    // Round three teaches the ultimate; start it nearly full so the lesson arrives before the fight ends.
    if (this.progress.matches === 0 && this.tutorialRound >= 3 && !this.demo) this.forgeBar.value = 0.8;
    this.barWasFull = false;
    this.rivalBar.reset();
    this.tellAt = -1;
    this.setRivalTellState(null);
    this.clearCauseCue();
    this.rivalCharges.reset();
    this.rivalShapeAt = -9;
    this.lastShape = null;
    this.cupCaughtInRound = false;
    this.rampAt.left = this.rampAt.right = -9;
    this.cups.left = this.cups.right = null;
    this.slings.left = this.slings.right = null;
    this.rimPulls.left = this.rimPulls.right = null;
    if (perfect && !this.demo) this.perfectInMatch = true;
    if (!this.demo && this.progress.guide === 'launch') this.progress.advance('bump');
    playLaunch(power, perfect);
    this.count = null;
    if (this.quietFirst) this.stamp.show('RIP!', '', 'mine', 0.35);
    else this.stamp.show(perfect ? 'WHITE HOT!' : braced ? 'BRACED RIP!' : this.launchTiming > 1.04 ? 'PERFECT RIP!' : this.launchTiming > 1 ? 'ON BEAT!' : 'RIP!', braced ? 'two hands · stable launch' : '', 'mine', 0.35);
    if (perfect) this.featDone('whiteHot');
    this.matchLog.rip = Math.max(this.matchLog.rip, power);
    this.lastRip = power;
    this.replayCount = 0;
    this.replay = null;
    this.offDeskShown = false;
    this.deskVerdict = null;
    this.deskKoScored = false;
    this.setDeskKoStage(0);
    this.lastRoundHeat = 0;
    this.lastCause = '';
    // Personal bests are their own small moment (the first record is just kept).
    if (!this.demo && this.progress.guide === 'done' && this.progress.best('rip', Math.round(power * 100) / 100)) this.stamp.later('NEW BEST RIP!', `${Math.round(power * 100)}%`, 'mine', 0.8);
    const mh = this.mine.hand;
    const th = this.theirs.hand;
    // The launch angles into each top's own orbit direction (mirrored for left spin); aim stays as pulled.
    let speedBonus = this.launchTiming;
    let spinBonus = this.launchTiming;
    if (braced) {
      speedBonus *= 1.03;
      spinBonus *= 1.04;
    }
    if (this.launchZoneKind === 'center') {
      speedBonus *= 0.88;
      spinBonus *= 1.1;
    } else if (this.launchZoneKind === 'edge') {
      speedBonus *= 1.12;
      spinBonus *= 0.94;
    } else if (this.launchZoneKind === 'ambush') {
      speedBonus *= 1.08;
      spinBonus *= 0.92;
    }
    if (this.launchArenaKind === 'rail') speedBonus *= 1.08;
    else if (this.launchArenaKind === 'pit') {
      speedBonus *= 1.08;
      spinBonus *= 0.94;
    } else if (this.launchArenaKind === 'boost') speedBonus *= 1.1;
    else if (this.launchArenaKind === 'zero-g') spinBonus *= 1.07;
    else if (this.launchArenaKind === 'ramp') speedBonus *= 1.05;
    const mySpeed = speed * (1 - STEEP_SLOW * steep) * speedBonus;
    const mySpin = Math.min(1.08, (perfect ? PERFECT_SPIN : launchSpin(power)) * (1 + STEEP_SPIN * steep) * spinBonus);
    if (perfect) this.forgeBar.value = Math.min(1, this.forgeBar.value + PERFECT_BAR);
    const sx = from ? from.x : 0;
    const sz = from ? from.z : this.SPAWN;
    const twist = this.launchTwist * (this.arena.layout.tilt > 0 ? 0.32 : 0.24);
    if (dir) {
      const c = Math.cos(twist);
      const s = Math.sin(twist);
      const vx = dir.x * c - dir.z * s;
      const vz = dir.x * s + dir.z * c;
      const heading = stableHeading(Math.atan2(vx, vz));
      this.mine.launch(sx, sz, Math.sin(heading) * mySpeed, Math.cos(heading) * mySpeed, mySpin, mh);
    }
    else {
      const a = stableHeading(aim + LAUNCH_TILT * mh + twist);
      this.mine.launch(sx, sz, Math.sin(a) * mySpeed, -Math.cos(a) * mySpeed, mySpin, mh);
    }
    // Lock the blueprint to the actual post-bonus velocity, not the raw hand motion.
    const traceAngle = Math.atan2(this.mine.vx, this.mine.vz);
    // The echo keeps the rip as an intent: power, and aim off straight in past the orbit angle
    // the game adds. Your launch heads (sin a, -cos a) and the rival's (sin a, cos a), so the same
    // veer from each side's own view is the negated aim.
    const off = Math.PI - traceAngle - Math.atan2(-sx, sz) - LAUNCH_TILT * mh;
    this.echoRec.rips.push({ power, aim: Math.max(-MAX_AIM, Math.min(MAX_AIM, -Math.atan2(Math.sin(off), Math.cos(off)))) });
    this.echoPlayed = this.echoWarned = 0;
    const traceLength = 0.07 + 0.07 * Math.min(1, Math.hypot(this.mine.vx, this.mine.vz) / Math.max(0.001, LAUNCH_SPEED));
    this.launchAim.visible = true;
    this.launchAim.position.set(sx, this.arena.height(sx, sz) + 0.003, sz);
    this.launchAim.rotation.y = traceAngle;
    this.launchAimShaft.scale.z = traceLength;
    this.launchAimHead.position.z = traceLength;
    this.lastOpeningTrace = { x: sx, z: sz, angle: traceAngle, length: traceLength, zone: this.launchZoneKind, outcome: '', rival: this.rival.name, arena: this.arena.layout.name };
    if (!this.demo && this.progress.guide === 'done' && this.rival.name !== 'Challenger' && this.launchZoneKind !== 'neutral') {
      this.progress.rememberOpening(this.rival.name, this.launchZoneKind, sx / Math.max(0.001, this.arena.radius), sz / Math.max(0.001, this.arena.radius));
    }
    this.sparks.burst(sx, this.arena.height(sx, sz), sz, perfect ? 1 : power * 0.6);
    playTouchdown(sx, sz, 0.6 + 0.4 * power);
    // The rival rips harder as you level up.
    // Difficulty is launch quality: the rival rips harder and aims steadier as you level up.
    // The very first match is steadier, so its lesson (the ramp) is not lost to a wild rip.
    // The first three matches each teach one hand move; none should end before it can be tried.
    // The second round is the two-hand lesson. Its longer opening keeps the tops in view while the
    // mirrored hands demonstrate Squeeze; the third still leaves room to charge the ultimate.
    // Lesson rounds: the rim holds your top so no round is lost before the move can be tried, and
    // holds the rival only until you act (recordIntervention), so the lesson's own ramp, forge or
    // strike is what may win the round, never a stray opening clash.
    this.arena.grace = TUNING.grace;
    this.mine.shieldUntil = !this.demo && this.progress.matches === 0 && this.tutorialRound === 2
      ? 10
      : !this.demo && this.progress.matches < 3 ? LESSON_GRACE : 0;
    const aiPower = this.rivalLaunchPower;
    this.rivalHeld = 0;
    this.rivalFeinting = false;
    this.rivalFeintUsed = false;
    this.rivalTellDuration = TELL_TIME;
    this.rivalBraceShown = false;
    const aiAim = this.rivalLaunchAim;
    const aiSpeed = launchSpeed(aiPower);
    // From its spot this round, toward the middle, angled into its orbit.
    const aiDir = aiAim + LAUNCH_TILT * th;
    // Online: the guest's own launch spot and pull direction, when it picked them (checked: inside
    // the launch ring, never on top of your spot).
    const [rx, rz] = net?.role === 'host' && this.netRip?.at ? this.guestSpot(this.netRip.at, sx, sz) : this.rivalSpot();
    const inward = Math.atan2(-rx, -rz);
    const gd = net?.role === 'host' ? this.netRip?.dir : undefined;
    const heading = stableHeading(gd && Number.isFinite(gd[0]) && Number.isFinite(gd[1]) && Math.hypot(gd[0], gd[1]) > 1e-6 ? Math.atan2(gd[0], gd[1]) + LAUNCH_TILT * th : inward + aiDir);
    this.theirs.launch(rx, rz, Math.sin(heading) * aiSpeed, Math.cos(heading) * aiSpeed, launchSpin(aiPower), th);
    this.theirs.shieldUntil = this.mine.shieldUntil;
    this.pendingGroove.left = this.pendingGroove.right = null;
    this.launchExtras();
    if (net?.role === 'host') {
      // Keep the guest's own paint in the reveal packet; the host renders that same build with the
      // opponent tint, but should not send the tint back as if the guest had chosen it.
      const guestCode = this.netRip?.build && decodeBuild(this.netRip.build) ? this.netRip.build : encodeBuild(this.theirBuild);
      net.launched(this.round, this.arena.layout.name, undefined, [encodeBuild(this.myBuild), guestCode]);
      this.netRip = null;
    }
    this.netPending = null;
    playTouchdown(rx, rz, 0.6 + 0.4 * aiPower);
    this.phase = 'fight';
    this.markFirstFive(3);
    this.elapsed = 0;
    this.pressureShown = false;
    this.strikeWindowShown = false;
    this.knuckleTapAt.left = this.knuckleTapAt.right = -9;
    this.knuckleUsed = false;
    this.clearCrossguard();
    this.palmGustBlockedUntil.left = this.palmGustBlockedUntil.right = -9;
    this.shapingBlockedUntil.left = this.shapingBlockedUntil.right = -9;
    this.shapingNeedsClearance.left = this.shapingNeedsClearance.right = false;
    this.palmGustSampled.left = this.palmGustSampled.right = false;
    this.palmGustAge.left = this.palmGustAge.right = 0;
    this.lastHardHit = -1;
    this.accumulator = 0;
    this.clashes = 0;
    this.firstClashPending = true;
    // Say how it launched: white hot, or the kind of launch the pull's angle gave.
    const kind = steep > 0.6 ? 'Spin launch: slow, long spin' : steep < 0.25 && power > 0.5 && (from || dir) ? 'Dash launch' : '';
    const curve = Math.abs(this.launchTwist) > 0.2 ? `Curve ${this.launchTwist > 0 ? 'right' : 'left'}` : '';
    const opening = [this.launchTiming > 1.04 ? 'Perfect timing' : this.launchTiming > 1 ? 'On beat' : '', this.launchReadout(), curve, kind].filter(Boolean).join(' · ');
    this.label.set(this.quietFirst ? '' : perfect ? `White hot!\n${opening || 'A head start on the strike'}` : opening);
    this.labelTimer = !this.quietFirst && (perfect || opening) ? 1.5 : 0;
    this.launchFrom = null;
    this.devLaunchTwist = 0;
    this.bracedLaunch = false;
    this.launcherBrace.visible = false;
    console.log(`[MATCH] launch power ${power.toFixed(2)}${perfect ? ' PERFECT' : ''}${braced ? ' BRACED' : ''} from ${sx.toFixed(3)},${sz.toFixed(3)} ${this.launchZoneKind}/${this.launchArenaKind} timing ${this.launchTiming.toFixed(2)} twist ${this.launchTwist.toFixed(2)} steep ${steep.toFixed(2)} aim ${aim.toFixed(2)} vs AI ${aiPower.toFixed(2)} from ${rx.toFixed(3)},${rz.toFixed(3)}`);
  }

  /**
   * Grab opposing rim sectors with both hands to forge the whole bowl. Moving the hands together
   * squeezes it, apart stretches it, a twist winds the release, and uneven hand heights tilt it.
   * The arena springs back after release, but the tops keep the directional impulse.
   */
  private updateArenaMorph(dt: number): boolean {
    let left = this.hands.left;
    let right = this.hands.right;
    // One-hand comfort mode: a held rim grip gets a mirrored partner on the far rim.
    const one = this.oneHandForge(left, right);
    if (one) [left, right] = one;
    if (!this.arenaMorphing) {
      if (this.arenaMorphHold > 0) {
        const duration = 0.55;
        this.arenaMorphHold = Math.max(0, this.arenaMorphHold - dt);
        const t = 1 - this.arenaMorphHold / duration;
        const spring = Math.cos(t * Math.PI * 2.4) * (1 - t) * (1 - t);
        this.arenaMorph.scaleX = 1 + (this.arenaMorphRelease.scaleX - 1) * spring;
        this.arenaMorph.scaleZ = 1 + (this.arenaMorphRelease.scaleZ - 1) * spring;
        this.arenaMorph.tilt = this.arenaMorphRelease.tilt * spring;
        this.arenaMorphTwist = this.arenaMorphRelease.twist * spring;
        this.arenaView.setForgeDents(this.arenaMorphA.x, this.arenaMorphA.z, this.arenaMorphB.x, this.arenaMorphB.z, Math.abs(spring));
        this.arenaDirty = true;
        this.publishArenaMorph();
        this.arenaView.charge = Math.max(this.arenaView.charge, 0.9);
        if (this.arenaMorphHold <= 0) {
          this.arenaMorph.scaleX = this.arenaMorph.scaleZ = 1;
          this.arenaMorph.tilt = this.arenaMorphTwist = 0;
          this.arenaView.setForgeDents(0, 0, 0, 0, 0);
          this.arenaDirty = true;
          this.publishArenaMorph();
        }
        return false;
      }
      const ease = 1 - Math.exp(-dt * 8);
      this.arenaMorph.scaleX += (1 - this.arenaMorph.scaleX) * ease;
      this.arenaMorph.scaleZ += (1 - this.arenaMorph.scaleZ) * ease;
      this.arenaMorph.tilt += (0 - this.arenaMorph.tilt) * ease;
      this.arenaMorphTwist += (0 - this.arenaMorphTwist) * ease;

      const a = this.rimPulls.left;
      const b = this.rimPulls.right;
      if (!a || !b || !left.tracked || !right.tracked || !left.pinching || !right.pinching) return false;
      const ar = Math.hypot(a.sx, a.sz) || 1;
      const br = Math.hypot(b.sx, b.sz) || 1;
      // The grips sit 50 degrees apart on the near half (reach.ts FORGE_GRIP); anything wider than
      // about 25 degrees counts, so a sloppy grip still forges but two pinches side by side do not.
      if ((a.sx * b.sx + a.sz * b.sz) / (ar * br) > FORGE_GRIP_MAX_COS) return false;
      // Starting the grab is free. The charge is committed only after a deliberate release.
      if (this.charges.charges < 1) {
        this.locked(LESSON.noCharge);
        return false;
      }

      this.root.worldToLocal(this.arenaMorphA.copy(left.pinch));
      this.root.worldToLocal(this.arenaMorphB.copy(right.pinch));
      const dx = this.arenaMorphB.x - this.arenaMorphA.x;
      const dz = this.arenaMorphB.z - this.arenaMorphA.z;
      this.arenaMorphStart.distance = Math.max(0.04, Math.hypot(dx, dz));
      this.arenaMorphStart.angle = Math.atan2(dz, dx);
      this.arenaMorphPull = this.arenaMorphTwist = 0;
      this.arenaMorphing = true;
      this.clearCrossguard();
      this.arenaMorphHold = 0;
      this.arenaView.charge = 1;
      // Match 1's card and ghost hands teach the squeeze; later matches name all four actions.
      if (!this.quietFirst) this.stamp.show('TWO-HAND FORGE', 'SQUEEZE · STRETCH · TILT · TWIST', 'mine', 0.7);
      playTick();
    }

    const trackingLost = !left.tracked || !right.tracked;
    if (trackingLost && (this.arenaMorphLost += dt) < HAND_LOSS_GRACE) return true;
    if (!trackingLost) this.arenaMorphLost = 0;
    if (trackingLost || !left.pinching || !right.pinching) {
      this.arenaMorphLost = 0;
      this.arenaMorphing = false;
      this.rimPulls.left = this.rimPulls.right = null;
      // Arena Forge owns both hands through release. `updateShaping()` is intentionally skipped on
      // this frame, so set the shared open-palm guard here; otherwise the same release can become
      // Forge Gust or Crossguard and spend a second charge.
      for (const side of ['left', 'right'] as const) {
        this.palmGustBlockedUntil[side] = this.elapsed + RELEASE_LOCK;
        this.palmGustSampled[side] = false;
        this.palmGustAge[side] = 0;
      }
      this.clearCrossguard();
      this.rimSpringGuides[0].visible = false;
      this.rimSpringGuides[1].visible = false;

      const gesture: ArenaForgeGesture = { pull: this.arenaMorphPull, twist: this.arenaMorphTwist, tilt: this.arenaMorph.tilt };
      const action = trackingLost ? null : classifyArenaForge(gesture);
      if (!action) {
        this.cancelArenaForge(trackingLost ? LESSON.forgeLost : LESSON.forgeStill);
        return true;
      }
      const force = this.charges.spend(this.elapsed, TUNING.grace);
      if (!force) {
        playLocked();
        this.cancelArenaForge('FORGE NOT READY\nWAIT FOR A CHARGE');
        return true;
      }

      const before = arenaForgeDanger(this.theirs.x, this.theirs.z, this.theirs.vx, this.theirs.vz, this.arena.radius)
        - arenaForgeDanger(this.mine.x, this.mine.z, this.mine.vx, this.mine.vz, this.arena.radius);
      const guest = this.online?.role === 'guest' && this.online.peer ? this.online : null;
      if (guest) {
        const sign = action === 'twist' ? Math.sign(this.arenaMorphTwist) : action === 'tilt' ? Math.sign(this.arenaMorphShove.x) : 1;
        guest.sendEvent({ kind: 'forge', action, pull: gesture.pull, twist: gesture.twist, tilt: gesture.tilt, sign: sign < 0 ? -1 : 1, sx: -this.arenaMorphShove.x, sz: -this.arenaMorphShove.z, force });
      }
      const aim = arenaForgeAim(this.theirs.x, this.theirs.z, this.theirs.vx, this.theirs.vz, this.arena.radius);
      // Inside the opening grace the rim still holds every top, so the staged throw waits for it.
      const wrench = guest || this.arena.elapsed < this.arena.grace ? null : this.deskWrenchAt();
      if (wrench !== null) {
        this.deskWrench.armed = false;
        this.deskWrench.fired = true;
      }
      if (!guest && this.mine.alive) this.mine.shieldUntil = Math.max(this.mine.shieldUntil, this.arena.elapsed + ARENA_FORGE_SHIELD);
      for (const top of guest ? [] : this.tops) {
        if (!top.alive) continue;
        const own = top === this.mine;
        const plain = arenaForgeImpulse(own ? action : arenaForgeRivalAction(action), gesture, top.x, top.z, this.arena.radius, this.arenaMorphShove.x, this.arenaMorphShove.z, force * (own ? 0.4 : aim));
        // The staged first DESK KO: whatever the forge, the rival runs out across the real edge.
        const impulse = wrench !== null && top === this.theirs ? deskWrenchImpulse(top, plain, wrench, rimRadius(this.arena.layout, wrench)) : plain;
        const ix = impulse.x;
        const iz = impulse.z;
        top.vx += ix;
        top.vz += iz;
        top.kick = Math.max(top.kick, 0.55);
        top.kickX = ix;
        top.kickZ = iz;
      }
      if (action === 'tilt') {
        this.arenaMorphShove.t = 1.35;
        this.arena.shove = this.arenaMorphShove;
      }
      const swing = arenaForgeDanger(this.theirs.x, this.theirs.z, this.theirs.vx, this.theirs.vz, this.arena.radius)
        - arenaForgeDanger(this.mine.x, this.mine.z, this.mine.vx, this.mine.vz, this.arena.radius) - before;
      this.lastShape = { t: this.elapsed, kind: action };
      this.morphedOnce = true;
      Object.assign(this.arenaMorphRelease, {
        scaleX: this.arenaMorph.scaleX,
        scaleZ: this.arenaMorph.scaleZ,
        tilt: this.arenaMorph.tilt,
        twist: this.arenaMorphTwist,
      });
      this.arenaMorphHold = 0.55;
      this.slowMo = Math.max(this.slowMo, 0.4);
      this.recordIntervention();
      this.recordArenaForge(action, swing);
      // Twist keeps its turn; tilt keeps which side went low (the echo mirrors it to the far side).
      const sign = action === 'twist' ? Math.sign(this.arenaMorphTwist) : action === 'tilt' ? Math.sign(this.arenaMorphShove.x) : 1;
      this.echoRec.forges.push({ round: this.echoRec.rips.length - 1, t: this.elapsed, action, sign: sign < 0 ? -1 : 1 });
      if (!this.quietFirst) this.stamp.show(ARENA_FORGE_TITLE[action], ARENA_FORGE_EFFECT[action], 'mine', 1.05, 1.15);
      // The stamp names the action and its effect; the card only points at the result.
      this.label.set(LESSON.forgeDone);
      this.labelTimer = 1.65;
      this.sparks.burst(0, this.arena.height(0, 0), 0, 0.9);
      this.impacts.shock(0, this.arena.height(0, 0), 0, 0.75);
      this.hitStop = Math.max(this.hitStop, 0.12);
      this.roomLight.hit();
      playThock();
      if (import.meta.env.DEV) console.log(`[MORPH] ${action} swing ${swing.toFixed(3)} pull ${this.arenaMorphPull.toFixed(3)} twist ${this.arenaMorphTwist.toFixed(3)} tilt ${this.arenaMorph.tilt.toFixed(3)}`);
      return true;
    }

    this.root.worldToLocal(this.arenaMorphA.copy(left.pinch));
    this.root.worldToLocal(this.arenaMorphB.copy(right.pinch));
    const dx = this.arenaMorphB.x - this.arenaMorphA.x;
    const dz = this.arenaMorphB.z - this.arenaMorphA.z;
    const distance = Math.hypot(dx, dz);
    this.arenaMorphPull = Math.max(-0.26, Math.min(0.26, distance / this.arenaMorphStart.distance - 1));
    let twist = Math.atan2(dz, dx) - this.arenaMorphStart.angle;
    if (twist > Math.PI) twist -= Math.PI * 2;
    else if (twist < -Math.PI) twist += Math.PI * 2;
    this.arenaMorphTwist = Math.max(-0.35, Math.min(0.35, twist));

    const c = Math.cos(this.arenaMorphStart.angle);
    const s = Math.sin(this.arenaMorphStart.angle);
    this.arenaMorph.scaleX = 1 + this.arenaMorphPull * (1.1 * c * c - 0.4 * s * s);
    this.arenaMorph.scaleZ = 1 + this.arenaMorphPull * (1.1 * s * s - 0.4 * c * c);
    this.arenaMorph.tilt = Math.max(-0.1, Math.min(0.1, this.arenaMorphB.y - this.arenaMorphA.y));
    const liveAction = classifyArenaForge({ pull: this.arenaMorphPull, twist: this.arenaMorphTwist, tilt: this.arenaMorph.tilt });
    if ((liveAction ?? 'none') !== this.arenaForgeAction) {
      this.arenaForgeAction = liveAction ?? 'none';
      if (liveAction) {
        this.label.set(lessonText.forgeLive(ARENA_FORGE_TITLE[liveAction]));
        this.labelTimer = 0.45;
      }
    }
    this.arenaView.setForgeDents(this.arenaMorphA.x, this.arenaMorphA.z, this.arenaMorphB.x, this.arenaMorphB.z, 1);
    this.arenaDirty = true;
    this.publishArenaMorph();
    this.arenaView.charge = 1;
    if (Math.abs(this.arenaMorph.tilt) > 0.012) {
      const lowIsLeft = this.arenaMorphA.y < this.arenaMorphB.y;
      const low = lowIsLeft ? this.arenaMorphA : this.arenaMorphB;
      const d = Math.hypot(low.x, low.z) || 1;
      this.arenaMorphShove.x = low.x / d;
      this.arenaMorphShove.z = low.z / d;
    }

    const g0 = this.rimSpringGuides[0];
    const g1 = this.rimSpringGuides[1];
    g0.visible = g1.visible = !this.photo;
    g0.position.set(this.arenaMorphA.x, this.arena.height(this.arenaMorphA.x, this.arenaMorphA.z) + 0.006, this.arenaMorphA.z);
    g1.position.set(this.arenaMorphB.x, this.arena.height(this.arenaMorphB.x, this.arenaMorphB.z) + 0.006, this.arenaMorphB.z);
    g0.rotation.y = g1.rotation.y = Math.PI / 2 - this.arenaMorphStart.angle;
    g0.scale.set(1.25, 1, 1.35);
    g1.scale.set(1.25, 1, 1.35);
    return true;
  }

  /**
   * Two quick pinched-hand taps on the real table send a small quake from that side. It is once per
   * round, weaker on your own top, and unavailable while the ultimate is ready so one contact can
   * never mean both a strike and a knock.
   */
  private updateKnuckleKnock(dt: number) {
    if (this.knuckleUsed || this.forgeBar.full || this.elapsed < TUNING.grace || this.demo) return;
    const tableY = this.root.position.y - PEDESTAL * this.rootK;
    for (const side of ['left', 'right'] as const) {
      const h = this.hands[side];
      const l = h.tracked ? this.root.worldToLocal(this.handAt.copy(h.index)) : null;
      const outside = l !== null && normRadius(this.arena.layout, l.x, l.z) > 1.02 && normRadius(this.arena.layout, l.x, l.z) < 1.8;
      const hit = this.knuckleTouch[side].update(outside && h.pinching ? h.low : null, dt, tableY - 0.05, tableY + 0.05);
      if (hit === null || !l) continue;
      if (this.time - this.knuckleTapAt[side] > 0.65) {
        this.knuckleTapAt[side] = this.time;
        this.stamp.show('KNOCK 1/2', 'TAP THE SAME SIDE AGAIN', 'neutral', 0.35);
        playTick();
        continue;
      }
      this.knuckleUsed = true;
      this.knuckleTapAt[side] = -9;
      for (const top of this.tops) {
        if (!top.alive) continue;
        const dx = top.x - l.x;
        const dz = top.z - l.z;
        const d = Math.hypot(dx, dz) || 1;
        const impulse = 0.24 * (top === this.mine ? 0.5 : 1);
        top.vx += (dx / d) * impulse;
        top.vz += (dz / d) * impulse;
        top.kick = Math.max(top.kick, 0.55);
        top.kickX = dx / d;
        top.kickZ = dz / d;
      }
      this.lastShape = { t: this.elapsed, kind: 'parry' };
      this.recordIntervention();
      this.impacts.shock(l.x, this.arena.floorHeight(1), l.z, 0.85, 0xffb347);
      this.sparks.burst(l.x, this.arena.floorHeight(1), l.z, 0.8);
      this.stamp.show('TABLE KNOCK!', 'PINCH + DOUBLE TAP → SHOCK', 'mine', 0.75, 1.05);
      this.label.set('THE REAL TABLE HIT THE ARENA');
      this.labelTimer = 1.2;
      this.roomLight.hit();
      playThock();
      return;
    }
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
      // A flick's follow-through skims the floor too: no Finger Groove from it.
      if (this.time - this.flickAt[side] < FLICK_GROOVE_QUIET) this.grooving[side] = this.pendingGroove[side] = null;
      const pending = this.pendingGroove[side];
      if (pending) {
        // "Slide, then lift": a fingertip still down in the bowl may be swinging on into a top (a
        // flick), so the stroke commits only once the finger has lifted clear of the floor.
        const tipLocal = this.root.worldToLocal(this.local.copy(h.index));
        const lifted = !this.arena.inside(tipLocal.x, tipLocal.z) || Math.abs(tipLocal.y - this.arena.height(tipLocal.x, tipLocal.z)) > GROOVE_LIFT;
        if (h.pinching || !h.tracked || this.elapsed - pending.at > 1.5) this.pendingGroove[side] = null;
        else if (this.elapsed - pending.at >= GROOVE_COMMIT_DELAY && lifted) {
          this.pendingGroove[side] = null;
          this.makeGroove(side, pending.sx, pending.sz, pending.ex, pending.ez);
        }
      }
      const rimGuide = this.rimSpringGuides[side === 'left' ? 0 : 1];
      rimGuide.visible = false;
      if (this.shapingNeedsClearance[side]) {
        if (!h.tracked) this.shapingNeedsClearance[side] = false;
        else {
          const tip = this.root.worldToLocal(this.handTipAt.copy(h.index));
          const clear = !this.arena.inside(tip.x, tip.z) || tip.y > this.arena.height(tip.x, tip.z) + 0.035;
          if (clear) {
            this.shapingNeedsClearance[side] = false;
            this.tipFresh[side] = true;
          } else {
            this.grooving[side] = null;
            this.pressing[side] = false;
            continue;
          }
        }
      }
      if (this.elapsed < this.shapingBlockedUntil[side]) {
        this.shaping[side] = null;
        this.grooving[side] = null;
        this.rimPulls[side] = null;
        this.pressing[side] = false;
        this.tipFresh[side] = true;
        continue;
      }
      // A hand holding a tool another system updates (seal, rivet, wheel) authors nothing underneath it.
      if (heldElsewhere(this.handFacts(side))) continue;
      this.updateCup(side);
      if (!h.tracked) {
        if ((this.shapeLost[side] += this.frameDt) < HAND_LOSS_GRACE) continue;
        this.shapeLost[side] = 0;
        this.shaping[side] = null;
        this.grooving[side] = null;
        this.rimPulls[side] = null;
        this.pressing[side] = false;
        this.endSling(side, false);
        // The fingertip's speed starts over when the hand comes back (a hand regained lower is not a press).
        this.tipFresh[side] = true;
        continue;
      }
      this.shapeLost[side] = 0;
      const l = this.toLocal(h.pinch);
      // Where a pinch lands and where a ramp aims are precision, not speed: the One-Euro point.
      const ls = this.root.worldToLocal(this.pinchAim.copy(h.pinchSmooth));
      if (h.justReleased) {
        this.palmGustBlockedUntil[side] = this.elapsed + RELEASE_LOCK;
        this.palmGustSampled[side] = false;
        this.palmGustAge[side] = 0;
      }
      if (h.pinching) {
        this.grooving[side] = null;
        // Keep the fingertip's height current while pinching, so letting go is not read as a fast press.
        // Its own vector: toLocal() reuses one, and `l` (the pinch) is still in use below.
        this.tipY[side] = this.root.worldToLocal(this.handAt.copy(h.index)).y;
        this.tipDown[side] = 0;
        let d = this.shaping[side];
        // A caught top is the most specific target and wins over the rail under it.
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
        if (!d && h.justPinched && open && this.online?.role !== 'guest') {
          let rail: FloorShape | null = null;
          let railGap = 0.048;
          for (const shape of this.arena.shapes) {
            if (shape.kind !== 'ramp' || shape.owner !== side) continue;
            const gap = Math.hypot(shape.x - ls.x, shape.z - ls.z);
            if (gap < railGap) {
              railGap = gap;
              rail = shape;
            }
          }
          if (rail) {
            const force = this.charges.spend(this.elapsed, TUNING.grace);
            if (!force) this.locked('No charge yet\nDash rail needs one charge');
            else {
              rail.boost = 1.4;
              this.recordIntervention();
              this.lastShape = { t: this.elapsed, kind: 'ramp' };
              this.arenaView.flashRail(rail.x, rail.z);
              if (!this.quietFirst) this.stamp.show('DASH RAIL!', 'FIRST TOP ACROSS GETS THE KICK', 'mine', 0.65);
              playDash(rail.x);
            }
            continue;
          }
        }
        let rim = this.rimPulls[side];
        // A rim grip is half of the two-hand forge (from its lesson on); alone it is a rim spring (later).
        if (!rim && h.justPinched && open && this.taught('forge')) {
          const n = normRadius(this.arena.layout, ls.x, ls.z);
          const grip = n >= RIM_GRAB_MIN || forgeGripIntent(n, Math.atan2(ls.z, ls.x));
          if (grip && n <= 1.12 && Math.abs(ls.y - this.arena.height(ls.x, ls.z)) < SHAPE_GRAB * 1.5) {
            rim = this.rimPulls[side] = { x: l.x, z: l.z, sx: ls.x, sz: ls.z, started: this.elapsed };
            playTick();
          }
        }
        if (rim) {
          rim.x = l.x;
          rim.z = l.z;
          const mx = (rim.sx + rim.x) * 0.5;
          const mz = (rim.sz + rim.z) * 0.5;
          rimGuide.visible = !this.photo && this.taught('spring');
          rimGuide.position.set(mx, this.arena.height(mx, mz) + 0.004, mz);
          rimGuide.rotation.y = Math.PI / 2 - Math.atan2(rim.sz, rim.sx);
          rimGuide.scale.set(1 + Math.min(1, Math.hypot(rim.x - rim.sx, rim.z - rim.sz) / 0.04) * 0.35, 1, 1);
          continue;
        }
        if (!d && h.justPinched && open) {
          // Pointing out from the middle until the hand drags it round.
          if (this.arena.inside(ls.x, ls.z) && Math.abs(ls.y - this.arena.height(ls.x, ls.z)) < SHAPE_GRAB) {
            d = this.shaping[side] = { x: ls.x, z: ls.z, sx: ls.x, sz: ls.z, t: 0, far: false, amp: SHAPE_SIZE.ramp, dx: ls.x, dz: ls.z, shape: null };
          } else if (this.rayFloor(h)) {
            d = this.shaping[side] = { x: this.rayHit.x, z: this.rayHit.z, sx: ls.x, sz: ls.z, t: 0, far: true, amp: SHAPE_SIZE.ramp, dx: this.rayHit.x, dz: this.rayHit.z, shape: null };
          }
        }
        if (d) {
          d.t += this.frameDt;
          // Aim: the drag since the pinch began (the far hand's own motion counts double), once it is
          // past a small dead zone, so tracking jitter never swings it.
          const k = d.far ? 2 : 1;
          const px = (ls.x - d.sx) * k;
          const pz = (ls.z - d.sz) * k;
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
      const rim = this.rimPulls[side];
      if (rim) {
        this.blockShapingRelease(side);
        // A brief hold gives the second hand time to join the arena forge. If it stays one-handed,
        // a deliberate inward pull visibly springs this sector instead of becoming a dead gesture.
        if (this.taught('spring') && this.elapsed - rim.started >= RIM_SPRING_INTENT) {
          this.doRimSpring(rim.sx, rim.sz, rim.x, rim.z);
        }
        continue;
      }
      const hadPinchTool = !!this.shaping[side] || !!this.slings[side];
      this.shaping[side] = null;
      this.endSling(side, true);
      if (hadPinchTool) {
        this.blockShapingRelease(side);
        continue;
      }
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
      // Direct touch has a second, deliberately different verb: slide the open index finger along
      // the floor, then lift. A stationary downward jab remains a Cup, so the gestures do not race.
      // Grooves arrive with the other defensive tools: in the first matches an open finger skimming
      // the floor on its way to pinch a ramp must not draw one and spend the lesson's charge.
      // A finger circling your own top's rim is a Spin Rub, never a groove drawn on the floor.
      // (gesture-owner.ts: an open Spin Rub window or a fingertip on the rub ring owns the hand.)
      const rubbing = !mayListen(this.handFacts(side), 'groove');
      if (rubbing) this.grooving[side] = null;
      const touching = open && !rubbing && this.taught('groove') && this.arena.inside(tip.x, tip.z) && depth > -0.012 && depth < 0.024;
      let groove = this.grooving[side];
      if (touching && !groove && !this.pressing[side]) {
        groove = this.grooving[side] = { sx: tip.x, sz: tip.z, x: tip.x, z: tip.z, active: false };
      }
      if (touching && groove) {
        groove.x = clampedGrooveX(groove.sx, groove.sz, tip.x, tip.z);
        groove.z = clampedGrooveZ(groove.sx, groove.sz, tip.x, tip.z);
        // Decide early enough that a deliberate draw cannot become a Cup while the finger is
        // already moving sideways. The threshold remains above normal tracked-hand jitter.
        if (hasGrooveIntent(groove.sx, groove.sz, groove.x, groove.z)) groove.active = true;
        if (groove.active) {
          this.pressing[side] = false;
          continue;
        }
      } else if (groove) {
        this.grooving[side] = null;
        if (groove.active && grooveLength(groove.sx, groove.sz, groove.x, groove.z) >= GROOVE_MIN_LENGTH) {
          this.pendingGroove[side] = { sx: groove.sx, sz: groove.sz, ex: groove.x, ez: groove.z, at: this.elapsed };
        }
      }
      if (depth > 0.004 && !this.pressing[side] && open) {
        this.pressing[side] = true;
        // With the strike armed, a palm coming down outside the rim is a slap, not a cup at the edge.
        // (Not toLocal(): it would overwrite `tip`, which shares its vector.) Only a hand down at the
        // table counts as a slap, so cups reached in over the rim still work with the bar full.
        // A hand that just let go of a pinch (a forge, ramp or spring) or just flicked, settling
        // onto the bowl, is not a cup either (gesture-owner.ts 'follow' and 'slap' claims).
        const cupBlocked = commitBlocker(this.handFacts(side), 'cup');
        if (cupBlocked) {
          if (import.meta.env.DEV) console.log(`[SHAPE] well ignored: ${cupBlocked === 'slap' ? 'a slap outside the rim' : 'just released a pinch'}`);
        } else if (down >= TUNE.wellSpeed && this.elapsed - this.rampAt[side] > TUNE.wellAfterRamp && this.taught('cup')) {
          let target: Top | null = null;
          let gap = MAGNET_CATCH;
          for (const top of this.tops) {
            if (!top.alive) continue;
            const d = Math.hypot(top.x - tip.x, top.z - tip.z);
            if (d < gap) {
              gap = d;
              target = top;
            }
          }
          if (target) {
            this.grooving[side] = null;
            this.makeCup(side, target.x, target.z);
          }
          else {
            this.stamp.show('NO CATCH', 'PRESS BESIDE A TOP', 'neutral', 0.4);
            playLocked();
          }
        }
        else if (import.meta.env.DEV) console.log(`[SHAPE] well ignored: ${down.toFixed(2)} m/s down`);
      } else if (depth < 0) this.pressing[side] = false;
    }
  }

  /**
   * Pull a rim section toward the middle and let go. It spends one normal shaping charge and
   * nudges nearby tops inward; it never deals damage or guarantees a knockout, so timing the save
   * is still the player's skill.
   */
  private doRimSpring(sx: number, sz: number, x: number, z: number) {
    const r = Math.hypot(sx, sz) || 1;
    const ix = -sx / r;
    const iz = -sz / r;
    const pull = (x - sx) * ix + (z - sz) * iz;
    const minimum = 0.012 * (this.arena.radius / 0.17);
    if (pull < minimum) {
      playLocked();
      if (!this.stamp.busy) this.stamp.show('NO SPRING', 'PULL THE RIM INWARD', 'neutral', 0.4);
      if (import.meta.env.DEV) console.log(`[RIM] ignored: inward pull ${pull.toFixed(3)}`);
      return;
    }
    const f = this.charges.spend(this.elapsed, TUNING.grace);
    if (!f) {
      this.locked(LESSON.noCharge);
      return;
    }
    this.recordIntervention();
    if (!this.cuppedOnce && this.label.current.startsWith('New: pinch')) this.label.set('');
    this.cuppedOnce = true;
    // Online guest: the host springs the rim (its frame, turned half round); the snapshot shows it.
    if (this.online?.role === 'guest' && this.online.peer) {
      this.online.sendEvent({ kind: 'rim', sx: -sx, sz: -sz, x: -x, z: -z, f });
      this.arenaView.flashRail(sx, sz);
      playThock();
      return;
    }
    const hits = springRim(this.arena, this.mine, [this.theirs], sx, sz, x, z, f);
    this.arenaView.flashRail(sx, sz);
    this.impacts.shock(sx, this.arena.height(sx, sz), sz, hits ? 0.75 : 0.35);
    this.sparks.burst(sx, this.arena.height(sx, sz), sz, hits ? 0.9 : 0.35);
    this.lastShape = hits ? { t: this.elapsed, kind: 'parry' } : this.lastShape;
    this.progress.advance('match');
    this.stamp.show(hits ? 'RIM SPRING!' : 'MISSED SPRING', hits ? `${hits} top${hits === 1 ? '' : 's'} sprung` : 'no top in that sector', hits ? 'mine' : 'neutral', 0.55);
    playThock();
    if (import.meta.env.DEV) console.log(`[RIM] spring at ${sx.toFixed(3)},${sz.toFixed(3)} pull ${pull.toFixed(3)} hits ${hits}`);
  }

  /**
   * One hand forges alone (comfort mode): after a rim grip has been held a moment with the other
   * hand free, a virtual hand mirrors it through the arena's middle at the grip's starting height.
   * Turning the hand round the rim twists, pushing in or out squeezes or stretches, lifting tilts.
   */
  private oneHandForge(left: HandState, right: HandState): [HandState, HandState] | null {
    if (!COMFORT.oneHand) return null;
    if (!this.arenaMorphing) {
      this.oneHand = null;
      const sides = (['left', 'right'] as const).filter((s) => this.rimPulls[s]);
      if (sides.length !== 1) {
        this.oneHandAt = -1;
        return null;
      }
      const side = sides[0];
      const pull = this.rimPulls[side]!;
      const free = side === 'left' ? right : left;
      // Held in wall-clock time: a hit-stop freezes the fight clock, not the hand.
      if (this.oneHandAt < 0) this.oneHandAt = this.time;
      if (free.pinching || this.time - this.oneHandAt < ONE_HAND_HOLD || this.charges.charges < 1) return null;
      this.oneHandAt = -1;
      const real = side === 'left' ? left : right;
      this.oneHand = { side, y: this.root.worldToLocal(this.handAt.copy(real.pinch)).y };
      this.rimPulls[side === 'left' ? 'right' : 'left'] = { x: -pull.x, z: -pull.z, sx: -pull.sx, sz: -pull.sz, started: pull.started };
    }
    if (!this.oneHand) return null;
    const real = this.oneHand.side === 'left' ? left : right;
    const l = this.root.worldToLocal(this.handAt.copy(real.pinch));
    const mirrored = this.root.localToWorld(this.oneHandPinch.set(-l.x, this.oneHand.y, -l.z));
    const ghost: HandState = { ...real, pinch: mirrored, pinchSmooth: mirrored, justPinched: false, justReleased: false };
    return this.oneHand.side === 'left' ? [real, ghost] : [ghost, real];
  }

  /**
   * The first fight teaches ramp, the signature two-hand arena forge, then an ultimate (Flick is
   * hinted there too and is never gated). Every later verb is released one per completed match
   * (VERB_RELEASE); online, brawl and the demo save have them all.
   */
  /**
   * The first match says only its lessons and results: no launch chatter, readouts, cause cards
   * or mid-match rewards (they wait for the verdict, or for match 2, which says them all again).
   */
  private get quietFirst() {
    return this.quietMatch && !this.demo;
  }

  private taught(verb: 'forge' | 'strike' | 'tells' | ReleasedVerb) {
    const m = this.progress.matches;
    // The two-hand forge is the first match's second lesson.
    if (verb === 'forge') return m >= 1 || (m === 0 && this.tutorialRound >= 2);
    if (verb === 'strike') return m >= 1 || (m === 0 && this.tutorialRound >= 3);
    if (verb === 'tells') return m >= 3;
    return !!this.online || this.extras.length > 0 || this.everyVerb || m >= VERB_RELEASE[verb];
  }

  private setOverforgeModel(seal: Seal) {
    if (this.overforgeSeal.userData.seal === seal) return;
    for (const model of Object.values(this.overforgeModels)) model.removeFromParent();
    const model = this.overforgeModels[seal];
    model.rotation.x = 0.78;
    model.scale.setScalar(1.3);
    this.overforgeSeal.add(model);
    this.overforgeSeal.userData.seal = seal;
    (this.overforgeRing.material as MeshBasicMaterial).color.setHex(SEAL_COLOR[seal]);
  }

  private clearCrossguard() {
    this.palmRailAngles.left = this.palmRailAngles.right = null;
    this.palmRailGrace.left = this.palmRailGrace.right = 0;
    this.crossguardActive = false;
    this.crossguardConsumed = false;
    this.crossguardLiveUntil = -9;
    this.crossguardSlung = false;
    this.crossguardBreak = 0;
    this.crossguardBeam.visible = this.crossguardGlow.visible = false;
    for (const post of this.crossguardPosts) post.visible = false;
    this.rootEntity?.setValue(FirstFiveState, 'crossguardActive', false);
  }

  /** The tool a hand holds this frame, for gesture ownership (Arena Forge holds both hands). */
  private sealWorld = new Vector3();
  private heldTool(side: Side): HeldTool | null {
    if (this.overforgeHeld === side || this.overforgeControl?.side === side) return 'overforge';
    // A pinch on the ready seal (it docks over the bowl floor) is the seal's, not a ramp.
    if (this.overforgeMode === 'ready' && this.overforgeSeal.visible
      && this.hands[side].pinchSmooth.distanceTo(this.overforgeSeal.getWorldPosition(this.sealWorld)) <= SEAL_GRAB) return 'overforge';
    if (this.emberHeld === side) return 'ember';
    if (this.forgeWheelHeld === side) return 'wheel';
    if (this.arenaMorphing) return 'forge';
    if (this.rimPulls[side]) return 'grip';
    if (this.slings[side]) return 'sling';
    if (this.shaping[side]) return 'ramp';
    return null;
  }

  /**
   * This frame's facts about one hand for gesture-owner.ts. Built fresh at each verb's entry point
   * (a verb earlier in the frame may just have set a claim) with its own scratch vectors.
   */
  private handFacts(side: Side): HandFacts {
    const h = this.hands[side];
    const tip = this.root.worldToLocal(this.factTip.copy(h.index));
    const wrist = this.root.worldToLocal(this.factWrist.copy(h.wrist));
    const mine = this.mine;
    // The Crossguard palm (wrist→fingertip 0.45) decides a reserved Forge grip, as the rail does.
    // Hand marks classify the pinch target while the rail uses the palm: either saying FORGE counts.
    const grip = this.factPalm.copy(wrist).lerp(this.root.worldToLocal(this.factTipSmooth.copy(h.indexSmooth)), 0.45);
    const gripN = normRadius(this.arena.layout, grip.x, grip.z);
    const onForgeGrip = this.handHoverClaim[side] === 'FORGE' || (this.taught('forge') && forgeGripIntent(gripN, Math.atan2(grip.z, grip.x)));
    // A palm (wrist→fingertip 0.5) down at the table outside the rim, with the strike ready, is a slap.
    const slap = this.factPalm.copy(wrist).lerp(tip, 0.5);
    const atTable = h.low < this.root.position.y - PEDESTAL * this.rootK + 0.05;
    const slapPose = this.forgeBar.full && this.taught('strike') && atTable && normRadius(this.arena.layout, slap.x, slap.z) > SLAP_MIN_N;
    return {
      tracked: h.tracked,
      pinching: h.pinching,
      held: this.heldTool(side),
      releaseLock: this.palmGustBlockedUntil[side] - this.elapsed,
      shapingLock: this.shapingBlockedUntil[side] - this.elapsed,
      needsClearance: this.shapingNeedsClearance[side],
      followLock: this.flickReadyAt[side] - this.time,
      railPost: this.palmRailAngles[side] !== null,
      crossguardUp: this.crossguardActive,
      pressing: this.pressing[side],
      gustSweep: this.palmGustTime > 0 && this.palmGustSide === side,
      rubWindow: this.time < this.rubUntil,
      tipToOwnTop: mine.alive ? Math.hypot(tip.x - mine.x, tip.z - mine.z) : Infinity,
      ownTopRing: mine.spec.radius + FINGER_RADIUS + RUB_SLACK,
      onForgeGrip,
      slapPose,
    };
  }

  /** One physical release may finish one tool; its opening fingers cannot author a second tool. */
  private blockShapingRelease(side: Side) {
    this.shapingBlockedUntil[side] = this.elapsed + SHAPING_RELEASE_LOCK;
    this.shapingNeedsClearance[side] = true;
    this.palmGustBlockedUntil[side] = this.elapsed + SHAPING_RELEASE_LOCK;
    this.pendingGroove[side] = null;
    this.shaping[side] = null;
    this.grooving[side] = null;
    this.rimPulls[side] = null;
    this.pressing[side] = false;
    this.tipFresh[side] = true;
    this.palmGustSampled[side] = false;
    this.palmGustAge[side] = 0;
  }

  /** A pause, rescue, round end, or committed slap can never be mistaken for releasing a gesture. */
  private cancelActiveGestures() {
    for (const side of ['left', 'right'] as const) {
      this.shaping[side] = null;
      this.grooving[side] = null;
      this.pressing[side] = false;
      this.slings[side] = null;
      this.rimPulls[side] = null;
      this.shapeLost[side] = 0;
      this.tipFresh[side] = true;
      this.palmGustSampled[side] = false;
      this.palmGustAge[side] = 0;
      this.palmGustBlockedUntil[side] = -9;
      this.shapingBlockedUntil[side] = -9;
      this.shapingNeedsClearance[side] = false;
    }
    this.cord.set(null);
    this.arenaMorphing = false;
    this.oneHand = null;
    this.oneHandAt = -1;
    this.arenaMorphHold = 0;
    this.arenaMorph.scaleX = this.arenaMorph.scaleZ = 1;
    this.arenaMorph.tilt = 0;
    this.arenaMorphPull = this.arenaMorphTwist = 0;
    this.arenaView.setForgeDents(0, 0, 0, 0, 0);
    this.arenaDirty = true;
    this.publishArenaMorph();
    this.overforgeHeld = null;
    this.overforgeControl = null;
    this.overforgeMode = 'idle';
    this.overforgeSeal.visible = false;
    this.rimSpringGuides[0].visible = this.rimSpringGuides[1].visible = false;
    this.palmGustTime = 0;
    this.palmGustFx.visible = this.palmGustRim.visible = false;
    this.forgeWheelHeld = null;
    this.forgeWheelTurn = 0;
    this.forgeWheelCurrentTime = 0;
    this.forgeWheelDirection = 0;
    this.forgeWheel.rotation.z = 0;
    this.forgeWheel.visible = this.forgeWheelCurrent.visible = false;
    this.rootEntity?.setValue(FirstFiveState, 'forgeWheelTurn', 0);
    if (this.emberHeld) {
      this.emberHeld = null;
      this.emberState = 1;
      this.emberPickup.position.copy(this.emberHome);
      this.rootEntity?.setValue(FirstFiveState, 'emberState', 1);
    }
    this.clearCrossguard();
  }

  private setEmberState(state: 0 | 1 | 2 | 3) {
    this.emberState = state;
    this.rootEntity?.setValue(FirstFiveState, 'emberState', state);
  }

  private resetEmber() {
    this.emberSpawned = false;
    this.emberHeld = null;
    this.emberFlight = 0;
    this.emberLost = 0;
    this.setEmberState(0);
    this.emberPickup.visible = this.emberBumperFx.visible = false;
  }

  /** The first hard clash throws a single earned rivet into reach instead of spawning random loot. */
  private spawnEmber(x: number, z: number) {
    if (this.emberSpawned || this.emberState !== 0 || !this.taught('ember')) return;
    this.emberSpawned = true;
    this.emberFlight = 0;
    this.emberFrom.set(x, this.arena.height(x, z) + 0.025, z);
    const radius = maxRim(this.arena.layout);
    this.emberHome.set(Math.max(-0.08, Math.min(0.08, x)), this.arena.floorHeight(1) + 0.035, radius + 0.025);
    this.emberPickup.position.copy(this.emberFrom);
    this.emberPickup.visible = !this.photo;
    this.setEmberState(1);
    this.call('HOT RIVET!\nPINCH IT · PLANT IT IN THE BOWL', CALL.tactic, 1.7);
  }

  /** Catch the hot rivet, carry it through space, and release against the floor to forge a bumper. */
  private updateEmber(dt: number) {
    if (this.emberState === 0) return;
    if (this.emberState === 1 && this.emberFlight < 0.65) {
      this.emberFlight = Math.min(0.65, this.emberFlight + dt);
      const t = this.emberFlight / 0.65;
      this.emberPickup.position.lerpVectors(this.emberFrom, this.emberHome, t);
      this.emberPickup.position.y += Math.sin(t * Math.PI) * 0.07;
      this.emberPickup.rotation.x += dt * 8;
      this.emberPickup.rotation.y += dt * 11;
      if (t < 1) return;
      playLand('table', this.emberHome.x, 0.45);
    }
    if (this.emberState === 1) {
      this.emberPickup.visible = !this.photo;
      this.emberPickup.rotation.z += dt * 2;
      const pulse = 1 + Math.sin(this.time * 8) * 0.12;
      this.emberPickup.scale.setScalar(pulse);
      this.emberPickup.updateWorldMatrix(true, true);
      this.emberPickup.getWorldPosition(this.emberWorld);
      for (const side of ['left', 'right'] as const) {
        const hand = this.hands[side];
        if (hand.tracked && hand.pinching) this.emberGrabGap = hand.pinchSmooth.distanceTo(this.emberWorld);
        // The waiting rivet is outside the bowl, so this Quest/IWER-tolerant catch volume cannot
        // steal a ramp or cup pinch. Contact while already pinching also works, so one low-fps
        // justPinched frame can never make the small airborne pickup feel intangible.
        if (!hand.tracked || !hand.pinching || hand.pinchSmooth.distanceTo(this.emberWorld) > 0.1) continue;
        this.emberHeld = side;
        this.emberLost = 0;
        this.setEmberState(2);
        this.label.set('RIVET CAUGHT\nPRESS IT INTO THE ARENA');
        this.labelTimer = 1.2;
        playPick();
        break;
      }
      return;
    }
    if (this.emberState === 2 && this.emberHeld) {
      const hand = this.hands[this.emberHeld];
      if (hand.tracked) {
        this.emberLost = 0;
        // Opening a tracked hand can move its reported pinch joint several centimetres in a
        // single frame. Keep the rivet at the last closed-hand sample for the release test;
        // otherwise a deliberate press into the bowl can jump above or outside it as the fingers
        // open and feel randomly rejected on both Quest and IWER.
        if (hand.pinching) {
          this.emberHandLocal.copy(hand.pinch);
          this.stage.worldToLocal(this.emberHandLocal);
          this.emberPickup.position.copy(this.emberHandLocal);
          return;
        }
        if (hand.justReleased) {
          const side = this.emberHeld;
          // Opening the hand after carrying the rivet moves IWER/Quest's reported index joint.
          // Keep that release owned by Ember, so its follow-through cannot also draw a free Groove.
          this.blockShapingRelease(side);
          this.emberHandLocal.copy(this.emberPickup.position);
          const floor = this.arena.height(this.emberHandLocal.x, this.emberHandLocal.z);
          if (this.arena.inside(this.emberHandLocal.x, this.emberHandLocal.z) && Math.abs(this.emberHandLocal.y - floor) <= 0.085) {
            this.emberBumperAt.set(this.emberHandLocal.x, floor, this.emberHandLocal.z);
            this.emberBumperFx.position.set(this.emberBumperAt.x, floor + 0.012, this.emberBumperAt.z);
            this.emberBumperFx.visible = !this.photo;
            this.emberPickup.visible = false;
            this.emberHeld = null;
            this.setEmberState(3);
            this.emberPostUntil = this.elapsed + EMBER_POST_TIME;
            this.recordIntervention();
            this.lastShape = { t: this.elapsed, kind: 'ramp' };
            this.stamp.show('RIVET PLANTED!', 'A HOT POST FOR 3 S: IT KICKS THEIRS OUT', 'mine', 0.72, 1.05);
            this.sparks.embers(this.emberBumperAt.x, floor, this.emberBumperAt.z, 8, 0.08, 0.08, 1);
            playThock();
            return;
          }
          this.emberHeld = null;
          this.setEmberState(1);
          this.emberPickup.position.copy(this.emberHome);
          this.label.set('PLANT IT LOW, INSIDE THE BOWL');
          this.labelTimer = 1.1;
          return;
        }
      } else if ((this.emberLost += dt) >= HAND_LOSS_GRACE) {
        this.emberHeld = null;
        this.setEmberState(1);
        this.emberPickup.position.copy(this.emberHome);
      }
      return;
    }
    if (this.emberState === 3) {
      this.emberBumperFx.visible = !this.photo;
      const pulse = 1 + 0.08 * Math.sin(this.time * 10);
      this.emberBumperFx.scale.setScalar(pulse);
    }
  }

  /** Pinch the near wheel's handle and turn it: the bowl receives the same signed rotation. */
  private updateForgeWheel(dt: number) {
    this.forgeWheelCooldown = Math.max(0, this.forgeWheelCooldown - dt);
    const radius = maxRim(this.arena.layout);
    this.forgeWheel.position.set(-radius * 0.68, this.arena.floorHeight(1) + 0.066, radius + 0.055);
    this.forgeWheel.scale.setScalar(0.62);
    this.forgeWheel.visible = !this.photo && this.taught('wheel') && !this.deskVerdict && this.outerRingState === 'idle';
    this.forgeWheelCurrent.position.set(0, this.arena.floorHeight(1) + 0.005, 0);
    if (this.forgeWheelCurrentTime > 0) {
      this.forgeWheelCurrentTime = Math.max(0, this.forgeWheelCurrentTime - dt);
      const life = this.forgeWheelCurrentTime / 1.25;
      this.forgeWheelCurrent.visible = !this.photo && life > 0;
      this.forgeWheelCurrent.rotation.y += this.forgeWheelDirection * dt * 3.4;
      for (const child of this.forgeWheelCurrent.children) {
        const material = (child as Mesh).material as MeshBasicMaterial | undefined;
        if (material) material.opacity = 0.18 + life * 0.48;
      }
    } else {
      this.forgeWheelCurrent.visible = false;
    }
    if (!this.forgeWheel.visible && !this.forgeWheelHeld) return;

    if (this.forgeWheelHeld) {
      const side = this.forgeWheelHeld;
      const hand = this.hands[side];
      if (hand.tracked && hand.pinching) {
        this.forgeWheelHandLocal.copy(hand.pinch);
        this.stage.worldToLocal(this.forgeWheelHandLocal);
        const angle = Math.atan2(this.forgeWheelHandLocal.y - this.forgeWheel.position.y, this.forgeWheelHandLocal.x - this.forgeWheel.position.x);
        const step = Math.max(-0.32, Math.min(0.32, Math.atan2(Math.sin(angle - this.forgeWheelLastAngle), Math.cos(angle - this.forgeWheelLastAngle))));
        this.forgeWheelTurn = Math.max(-1.75, Math.min(1.75, this.forgeWheelTurn + step));
        this.forgeWheelLastAngle = angle;
        this.forgeWheel.rotation.z = this.forgeWheelStartRotation + this.forgeWheelTurn;
        this.rootEntity?.setValue(FirstFiveState, 'forgeWheelTurn', this.forgeWheelTurn);
        return;
      }
      // IWER reports a visible 90° handle arc as roughly 0.41 rad at the tracked pinch joint.
      // A 0.35-rad commit remains deliberate (grab + directed turn + release) without dropping it.
      const committed = hand.tracked && hand.justReleased && Math.abs(this.forgeWheelTurn) >= 0.35;
      const signedTurn = this.forgeWheelTurn;
      this.forgeWheelHeld = null;
      if (!committed) {
        this.forgeWheel.rotation.z = this.forgeWheelStartRotation;
        this.forgeWheelTurn = 0;
        this.rootEntity?.setValue(FirstFiveState, 'forgeWheelTurn', 0);
        if (hand.justReleased) this.failSay('TURN THE WHEEL A QUARTER ARC');
        return;
      }
      const force = this.charges.spend(this.elapsed, TUNING.grace);
      if (!force) {
        this.forgeWheel.rotation.z = this.forgeWheelStartRotation;
        this.forgeWheelTurn = 0;
        this.rootEntity?.setValue(FirstFiveState, 'forgeWheelTurn', 0);
        this.locked('NO CHARGE YET\nTHE FORGE WHEEL NEEDS ONE');
        return;
      }
      const direction = Math.sign(signedTurn);
      const power = (0.17 + Math.min(0.09, Math.abs(signedTurn) * 0.055)) * force;
      for (const top of this.tops) {
        if (!top.alive) continue;
        const r = Math.hypot(top.x, top.z) || 1;
        const tx = (-top.z / r) * direction;
        const tz = (top.x / r) * direction;
        top.vx += tx * power;
        top.vz += tz * power;
        top.kick = Math.max(top.kick, 0.35);
        top.kickX = tx;
        top.kickZ = tz;
      }
      this.forgeWheelDirection = direction;
      this.forgeWheelCurrentTime = 1.25;
      this.forgeWheelCooldown = 1.2;
      this.recordIntervention();
      this.lastShape = { t: this.elapsed, kind: 'ramp' };
      this.rootEntity?.setValue(FirstFiveState, 'forgeWheelTurn', signedTurn);
      this.stamp.show(direction > 0 ? 'CURRENT: RIGHT!' : 'CURRENT: LEFT!', 'YOUR HAND TURNED THE WHOLE BOWL', 'mine', 0.75, 1.05);
      this.label.set('THE FLOOR CURRENT FOLLOWS YOUR WHEEL');
      this.labelTimer = 1.3;
      this.roomLight.hit();
      playMachine();
      return;
    }

    if (this.forgeWheelCooldown > 0) return;
    this.forgeWheel.updateWorldMatrix(true, true);
    this.forgeWheelHandle.getWorldPosition(this.forgeWheelHandleWorld);
    for (const side of ['left', 'right'] as const) {
      const hand = this.hands[side];
      if (hand.tracked && hand.justPinched) this.forgeWheelGrabGap = hand.pinchSmooth.distanceTo(this.forgeWheelHandleWorld);
      // The handle is deliberately outside the bowl, so a generous 10 cm pinch volume cannot
      // steal floor shaping. IWER measures 8.5 cm of closed-finger drift around this small grip;
      // the turn angle itself remains strict, so proximity alone never fires the current.
      if (!hand.tracked || !hand.justPinched || hand.pinchSmooth.distanceTo(this.forgeWheelHandleWorld) > 0.1) continue;
      this.forgeWheelHeld = side;
      this.forgeWheelHandLocal.copy(hand.pinch);
      this.stage.worldToLocal(this.forgeWheelHandLocal);
      this.forgeWheelLastAngle = Math.atan2(this.forgeWheelHandLocal.y - this.forgeWheel.position.y, this.forgeWheelHandLocal.x - this.forgeWheel.position.x);
      this.forgeWheelStartRotation = this.forgeWheel.rotation.z;
      this.forgeWheelTurn = 0;
      this.label.set('FORGE WHEEL\nTURN A QUARTER ARC · RELEASE');
      this.labelTimer = 1.2;
      playPick();
      break;
    }
  }

  /** Two low, flat open hands on the rim become the Crossguard rail between them. */
  private updateCrossguard() {
    const wasCrossguard = this.crossguardActive;
    this.crossguardActive = false;
    if (!this.taught('crossguard')) {
      this.palmRailAngles.left = this.palmRailAngles.right = null;
      this.crossguardBeam.visible = this.crossguardGlow.visible = false;
      for (const post of this.crossguardPosts) post.visible = false;
      this.rootEntity?.setValue(FirstFiveState, 'crossguardActive', false);
      return;
    }
    for (const side of ['left', 'right'] as const) {
      const h = this.hands[side];
      let accepted = false;
      // A hand that just released a pinch still looks like an open palm for a few frames. Without
      // this ownership window, releasing two-hand Arena Forge can accidentally build Crossguard
      // and spend a second charge on the same physical gesture.
      // A Spin Rub is one open hand low over the bowl too; while its window is open no rail is built.
      // The two glowing Forge grips are reserved for that verb (gesture-owner.ts 'grip'), so
      // approaching them cannot spend a charge as Crossguard first.
      if (mayListen(this.handFacts(side), 'crossguard')) {
        const wrist = this.handAt.copy(this.toLocal(h.wrist));
        const index = this.root.worldToLocal(this.local.copy(h.index));
        const palm = wrist.lerp(index, 0.45);
        const n = normRadius(this.arena.layout, palm.x, palm.z);
        const floor = this.arena.height(palm.x, palm.z);
        // A rail post needs a low, flat open hand; a relaxed upright hand near the rim does not count.
        accepted = n >= 0.78 && n <= 1.22 && palm.y >= floor - 0.025 && palm.y <= floor + 0.065 && Math.abs(wrist.y - index.y) <= 0.07;
        if (accepted) {
          this.palmRailAngles[side] = Math.atan2(palm.z, palm.x);
          this.palmRailGrace[side] = 0.22;
        }
      }
      if (!accepted) {
        this.palmRailGrace[side] = Math.max(0, this.palmRailGrace[side] - this.frameDt);
        if (this.palmRailGrace[side] <= 0) this.palmRailAngles[side] = null;
      }
    }

    const left = this.palmRailAngles.left;
    const right = this.palmRailAngles.right;
    if (left !== null && right !== null) {
      const ar = rimRadius(this.arena.layout, left) * 0.88;
      const br = rimRadius(this.arena.layout, right) * 0.88;
      this.crossguardA.set(Math.cos(left) * ar, this.arena.floorHeight(1) + 0.026, Math.sin(left) * ar);
      this.crossguardB.set(Math.cos(right) * br, this.arena.floorHeight(1) + 0.026, Math.sin(right) * br);
      const dx = this.crossguardB.x - this.crossguardA.x;
      const dz = this.crossguardB.z - this.crossguardA.z;
      const length = Math.hypot(dx, dz);
      if (length >= 0.08 && !this.crossguardConsumed) {
        this.crossguardActive = true;
        const mx = (this.crossguardA.x + this.crossguardB.x) * 0.5;
        const mz = (this.crossguardA.z + this.crossguardB.z) * 0.5;
        const angle = -Math.atan2(dz, dx);
        const pulse = 1 + 0.06 * Math.sin(this.time * 11);
        for (const beam of [this.crossguardGlow, this.crossguardBeam]) {
          beam.visible = !this.photo;
          beam.position.set(mx, this.crossguardA.y, mz);
          beam.rotation.set(0, angle, 0);
          beam.scale.set(length, pulse, pulse);
        }
        this.crossguardPosts.forEach((post, i) => {
          post.visible = !this.photo;
          post.position.copy(i ? this.crossguardB : this.crossguardA);
          post.scale.setScalar(pulse);
        });
        if (!wasCrossguard) {
          this.label.set('CROSSGUARD\nHOLD BOTH PALMS · ONE RETURN');
          this.labelTimer = 1.1;
          playTick();
        }
      }
    } else {
      this.crossguardConsumed = false;
    }
    if (!this.crossguardActive && this.crossguardBreak <= 0) {
      this.crossguardBeam.visible = this.crossguardGlow.visible = false;
      for (const post of this.crossguardPosts) post.visible = false;
    }
    if (this.crossguardBreak > 0) {
      this.crossguardBreak = Math.max(0, this.crossguardBreak - this.frameDt);
      const fade = this.crossguardBreak / 0.28;
      this.crossguardBeam.visible = this.crossguardGlow.visible = !this.photo && fade > 0;
      (this.crossguardBeam.material as MeshBasicMaterial).opacity = 0.82 * fade;
      (this.crossguardGlow.material as MeshBasicMaterial).opacity = 0.3 * fade;
      for (const post of this.crossguardPosts) post.visible = false;
    } else {
      (this.crossguardBeam.material as MeshBasicMaterial).opacity = 0.82;
      (this.crossguardGlow.material as MeshBasicMaterial).opacity = 0.22;
    }
    this.rootEntity?.setValue(FirstFiveState, 'crossguardActive', this.crossguardActive);
  }

  /**
   * Sweep a flat open palm across the inner bowl. A short path and speed threshold reject hovering;
   * the cooldown turns continuous hand motion into one readable, tactical impulse.
   */
  /**
   * The open fingertip is a body in the fight. A slow touch only nudges a top off the finger
   * (free, at most every half second per top, so herding goes nowhere); a real swing through a
   * top spends one shaping charge and hands it the finger's speed. Every other hand verb owns
   * its gesture first: pinches, presses, palm walls, gusts and two-hand forging never flick.
   */
  private updateFlick(dt: number) {
    // The first match teaches it too: once its forge lesson is done, a tired rival calls for a flick.
    if (!this.flickHintShown && this.flickCount === 0 && (this.progress.matches >= 1 || this.morphedOnce || this.tutorialRound >= 3) && this.theirs.alive && this.theirs.spin < 0.5 && this.charges.charges >= 1
      && this.elapsed > TUNING.grace && normRadius(this.arena.layout, this.theirs.x, this.theirs.z) > 0.6 && this.labelTimer <= 0) {
      this.flickHintShown = true;
      this.call(LESSON.flick, CALL.tactic, 2.2);
      this.flickGhostUntil = this.time + 2.6;
    }
    // A guest's rubbed spin goes to the host in small batches, and the rest when the window closes.
    if (this.rubPending !== 0 && this.online?.role === 'guest' && this.online.peer
      && (this.time >= this.rubUntil || this.time - this.rubSentAt >= 0.2)) {
      this.online.sendEvent({ kind: 'rub', gain: this.rubPending });
      this.rubPending = 0;
      this.rubSentAt = this.time;
    }
    for (const side of ['left', 'right'] as const) {
      const h = this.hands[side];
      const glow = this.flickGlows[side === 'left' ? 0 : 1];
      glow.visible = false;
      if (!h.tracked || h.pinching || dt <= 0) {
        this.flickPrev[side] = null;
        continue;
      }
      // A hand pulling back after a pinch tool (ramp, rim spring, sling, forge) is a release, not a swing.
      if (h.justReleased) this.flickReadyAt[side] = Math.max(this.flickReadyAt[side], this.time + FLICK_AFTER_RELEASE);
      const tip = this.root.worldToLocal(this.flickTip.copy(h.index));
      const prev = this.flickPrev[side];
      if (!prev) {
        this.flickPrev[side] = tip.clone();
        this.flickVel[side].set(0, 0, 0);
        continue;
      }
      // Two-frame smoothing: tracking jitter never reads as a swing, a real flick still does.
      const vel = this.flickVel[side];
      vel.lerp(this.flickRaw.set((tip.x - prev.x) / dt, (tip.y - prev.y) / dt, (tip.z - prev.z) / dt), 0.6);
      prev.copy(tip);
      // Rail posts, presses, a forge, a released pinch, a seal and this hand's own gust own it first.
      const facts = this.handFacts(side);
      const owned = !mayListen(facts, 'flick');
      const along = Math.hypot(vel.x, vel.z);
      // A fingertip coming down onto the table is a press (cup), not a swing.
      if (owned || -vel.y > along) continue;
      const floor = this.arena.height(tip.x, tip.z);
      // Only a fingertip down at the tops' own height (about 5 cm real) touches them; a hand passing over does not.
      if (tip.y < floor - 0.012 || tip.y > floor + 0.022) continue;
      if (!this.arena.inside(tip.x, tip.z)) continue;
      const ready = mayCommit(facts, 'flick');
      const armed = this.charges.charges >= 1 && ready;
      glow.visible = !this.photo;
      glow.position.copy(tip);
      glow.scale.setScalar(armed ? 0.0065 + Math.min(0.004, along * 0.008) : 0.005);
      (glow.material as MeshBasicMaterial).color.setHex(armed ? 0xff8a2a : 0x7d8a99);
      // The swing reads before it lands: a hot streak behind the fingertip and one whoosh per swing.
      if (along > 0.12) this.fingerStreak.drop(side === 'left' ? 0 : 1, tip.x, tip.y, tip.z, along, armed);
      const fast = along >= FLICK_HARD;
      if (fast && !this.swinging[side]) playSwish(along, tip.x);
      this.swinging[side] = fast;
      // A full hand of charges: the fingertip sheds embers, ready to strike.
      if (armed && this.charges.charges >= 3 && Math.random() < dt * 5) this.sparks.embers(tip.x, tip.y - 0.006, tip.z, 1, 0.05, 0.03, 1);
      // A slow fingertip running along your own top's rim is a Spin Rub, never a flick or a nudge.
      if (this.updateRub(tip, vel, along, dt)) continue;
      for (const top of this.tops) {
        const approach = fingerTouches(top, tip.x, tip.z, vel.x, vel.z);
        if (!approach) continue;
        if (!ready) break;
        // Only the finger's own swing makes a flick: a top running into a still finger just rebounds.
        const gap = Math.hypot(top.x - tip.x, top.z - tip.z) || 1;
        const swing = (vel.x * (top.x - tip.x) + vel.z * (top.z - tip.z)) / gap;
        let force = 0;
        if (swing >= FLICK_HARD) {
          force = this.charges.spend(this.elapsed, TUNING.grace);
          if (!force) this.locked('FLICK NEEDS A CHARGE\nA soft touch only nudges');
        }
        if (!force && top.sinceTouch < 0.5) continue;
        const d = Math.hypot(top.x - tip.x, top.z - tip.z) || 1;
        const dx = (top.x - tip.x) / d;
        const dz = (top.z - tip.z) / d;
        const y = this.arena.height(top.x, top.z);
        if (!force) {
          fingerContact(top, tip.x, tip.z, vel.x, vel.z, 0);
          this.sparks.burst(top.x, y, top.z, 0.18);
          playTick();
          continue;
        }
        this.blockShapingRelease(side);
        // The swing was a flick: the floor stroke it started is not also a Finger Groove.
        this.grooving[side] = null;
        this.pendingGroove[side] = null;
        this.flickAt[side] = this.time;
        this.flickReadyAt[side] = this.time + FLICK_FOLLOW_THROUGH;
        if (this.online?.role === 'guest' && this.online.peer) {
          const target = top === this.mine ? 'mine' : 'rival';
          this.online.sendEvent({ kind: 'flick', target, dx: -dx, dz: -dz, s: approach, f: force });
          top.sinceTouch = 0;
        } else {
          const gain = fingerContact(top, tip.x, tip.z, vel.x, vel.z, force);
          this.lastFlick = { gain, dx, dz, rival: top === this.theirs };
        }
        this.flickCount++;
        this.recordIntervention();
        const strength = Math.min(1, 0.45 + approach);
        const view = top === this.mine ? this.myView : top === this.theirs ? this.theirView : null;
        view?.flash();
        view?.hit(strength, dx, dz, 0.05);
        this.impacts.hit(top.x, y, top.z, strength);
        this.impacts.shock(top.x, y, top.z, 0.55 + strength * 0.35, top === this.theirs ? 0xffb04a : 0xffe2a8);
        this.sparks.burst(top.x, y, top.z, 0.5 + strength * 0.4);
        this.hitStop = Math.max(this.hitStop, 0.05 + strength * 0.03);
        // The blow itself: a streak of light along the flick, a scorch where it landed and, on a
        // tired rival, a breath of slow motion so the throw is seen.
        this.impacts.dash(top.x, y, top.z, dx, dz);
        this.sparks.embers(top.x, y, top.z, 8, 0.12, 0.1, 1);
        this.scorch(top.x, y, top.z);
        if (top === this.theirs && top.spin < 0.5) this.slowMo = Math.max(this.slowMo, 0.35);
        this.lastShape = { t: this.elapsed, kind: 'flick' };
        this.roomLight.hit();
        playClash(strength, top.x);
        playThock(top.x, top.z);
        const tired = top.spin < 0.5;
        this.stamp.show('FLICK!', top === this.theirs ? (tired ? 'TIRED RIVAL THROWN' : 'FRESH SPIN SHRUGS IT OFF') : 'YOUR TOP REDIRECTED', top === this.theirs ? 'mine' : 'neutral', 0.55, 0.9);
        if (import.meta.env.DEV) console.log(`[FLICK] ${side} ${top === this.mine ? 'mine' : 'rival'} swing ${swing.toFixed(2)} approach ${approach.toFixed(2)} force ${force.toFixed(2)} spin ${top.spin.toFixed(2)}`);
        break;
      }
    }
  }

  /**
   * Spin Rub: an open fingertip run along your own top's rim, mostly tangential and slower than a
   * flick, rubs spin back into it the way it turns (against it brakes a little). One shaping charge
   * opens a RUB_WINDOW; a window adds at most RUB_WINDOW_MAX spin. True when the finger is rubbing
   * (so the flick stands down this frame).
   */
  private updateRub(tip: Vector3, vel: Vector3, along: number, dt: number) {
    const top = this.mine;
    if (!this.taught('rub') || !top.alive || along >= FLICK_HARD) return false;
    const rx = tip.x - top.x;
    const rz = tip.z - top.z;
    const d = Math.hypot(rx, rz);
    if (d < 1e-6 || d > top.spec.radius + FINGER_RADIUS + RUB_SLACK) return false;
    const rvx = vel.x - top.vx;
    const rvz = vel.z - top.vz;
    const tangential = Math.abs(rvx * rz - rvz * rx) / d;
    const radial = Math.abs(rvx * rx + rvz * rz) / d;
    if (tangential <= radial || tangential < RUB_MIN) return false;
    if (this.time >= this.rubUntil) {
      if (this.time < this.rubReadyAt) return true;
      const force = this.charges.spend(this.elapsed, TUNING.grace);
      if (!force) {
        this.locked('SPIN RUB NEEDS A CHARGE');
        return true;
      }
      this.rubUntil = this.time + RUB_WINDOW;
      this.rubReadyAt = this.rubUntil + RUB_REOPEN;
      this.rubGain = 0;
      this.rubPower = force;
      this.rubStamped = false;
      this.recordIntervention();
    }
    if (this.rubGain >= RUB_WINDOW_MAX) return true;
    let gain = spinRub(top, tip.x, tip.z, vel.x, vel.z, this.rubPower, dt);
    const over = this.rubGain + gain - RUB_WINDOW_MAX;
    if (over > 0) {
      top.spin -= over;
      gain -= over;
    }
    this.rubGain += gain;
    if (this.online?.role === 'guest' && this.online.peer) this.rubPending += gain;
    if (gain === 0) return true;
    const nx = -rx / d;
    const nz = -rz / d;
    const cx = top.x - nx * top.spec.radius;
    const cz = top.z - nz * top.spec.radius;
    const y = this.arena.height(cx, cz);
    if (gain < 0) {
      if (this.time - this.rubSoundAt >= 0.3) {
        this.rubSoundAt = this.time;
        playTick();
        // The wrong-way tick has a twin: the rub is slowing your own top.
        if (!this.stamp.busy) this.stamp.show('WRONG WAY', 'RUB WITH YOUR SPIN', 'neutral', 0.4);
      }
      return true;
    }
    if (Math.random() < dt * 24) this.sparks.embers(cx, y + 0.004, cz, 1, 0.04, 0.02, 1);
    if (this.time - this.rubFlashAt >= 0.3) {
      this.rubFlashAt = this.time;
      this.myView.flash();
    }
    if (this.time - this.rubSoundAt >= 0.09) {
      this.rubSoundAt = this.time;
      playRub(this.rubGain / RUB_WINDOW_MAX, cx);
    }
    if (!this.rubStamped && this.rubGain >= 0.02) {
      this.rubStamped = true;
      this.stamp.show('SPIN RUB!', 'YOUR TOP SPINS UP', 'mine', 0.5, 0.9);
    }
    return true;
  }

  private updatePalmGust(dt: number) {
    this.palmGustCooldown = Math.max(0, this.palmGustCooldown - dt);
    if (this.palmGustTime > 0) {
      this.palmGustTime = Math.max(0, this.palmGustTime - dt);
      const life = this.palmGustTime / PALM_GUST_FX_TIME;
      const age = PALM_GUST_FX_TIME - this.palmGustTime;
      const open = Math.min(1, age / 0.12);
      const fade = age <= 0.12 ? 1 : Math.max(0, 1 - (age - 0.12) / (PALM_GUST_FX_TIME - 0.12));
      this.palmGustFx.visible = !this.photo && life > 0;
      this.palmGustFx.scale.set(this.palmGustLength * open, 1, 1);
      (this.palmGustFx.material as MeshBasicMaterial).opacity = fade * 0.82;
      const rimAge = age - 0.06;
      this.palmGustRim.visible = !this.photo && this.palmGustHits > 0 && rimAge >= 0 && rimAge < 0.24;
      if (this.palmGustRim.visible) {
        const t = rimAge / 0.24;
        const radius = maxRim(this.arena.layout) / 0.17;
        this.palmGustRim.scale.setScalar(radius * (0.96 + t * 0.07));
        (this.palmGustRim.material as MeshBasicMaterial).opacity = (1 - t) * 0.9;
      }
    } else {
      this.palmGustFx.visible = false;
      this.palmGustRim.visible = false;
    }

    for (const side of ['left', 'right'] as const) {
      const h = this.hands[side];
      const facts = this.handFacts(side);
      if (!this.taught('gust') || !mayListen(facts, 'gust')) {
        this.palmGustSampled[side] = false;
        this.palmGustAge[side] = 0;
        continue;
      }
      const wrist = this.handAt.copy(this.toLocal(h.wrist));
      const index = this.root.worldToLocal(this.local.copy(h.index));
      const palm = wrist.lerp(index, 0.48);
      const floor = this.arena.height(palm.x, palm.z);
      const n = normRadius(this.arena.layout, palm.x, palm.z);
      const valid = n < 0.74 && palm.y >= floor + 0.025 && palm.y <= floor + 0.12 && Math.abs(wrist.y - index.y) <= 0.075;
      if (!valid) {
        this.palmGustSampled[side] = false;
        this.palmGustAge[side] = 0;
        continue;
      }
      if (!this.palmGustSampled[side]) {
        this.palmGustSampled[side] = true;
        this.palmGustLast[side].copy(palm);
        this.palmGustOrigin[side].copy(palm);
        this.palmGustAge[side] = -PALM_GUST_ARM_TIME;
        continue;
      }
      const last = this.palmGustLast[side];
      const dx = palm.x - last.x;
      const dz = palm.z - last.z;
      const speed = (Math.hypot(dx, dz) * ARENA_SCALE) / Math.max(1e-3, dt);
      last.copy(palm);
      const origin = this.palmGustOrigin[side];
      const wasArming = this.palmGustAge[side] < 0;
      this.palmGustAge[side] += dt;
      if (wasArming) {
        // Reaching across the bowl keeps moving the origin and never arms. A brief settled palm,
        // followed by a new sweep, is both more intentional and easier to read on camera.
        if (speed > PALM_GUST_ARM_SPEED) this.palmGustAge[side] = -PALM_GUST_ARM_TIME;
        origin.copy(palm);
        if (this.palmGustAge[side] < 0) continue;
        this.palmGustAge[side] = 0;
        continue;
      }
      const pathX = palm.x - origin.x;
      const pathZ = palm.z - origin.z;
      const path = Math.hypot(pathX, pathZ);
      if (this.palmGustAge[side] > 0.5) {
        origin.copy(palm);
        this.palmGustAge[side] = 0;
        continue;
      }
      if (this.palmGustCooldown > 0 || speed < PALM_GUST_SPEED || path * ARENA_SCALE < 0.105) continue;
      // A fingertip arriving on your own top is a Spin Rub reaching in, not a sweep (a sweep that
      // crosses your top still fires once it is past it).
      if (!mayCommit(facts, 'gust')) continue;
      const strength = Math.max(0.65, Math.min(1.5, speed / 0.75));
      this.doPalmGust(side, origin.x, origin.z, palm.x, palm.z, strength);
      this.palmGustSampled[side] = false;
      this.palmGustAge[side] = 0;
    }
  }

  private doPalmGust(side: Side, sx: number, sz: number, ex: number, ez: number, strength: number) {
    const length = Math.hypot(ex - sx, ez - sz) || 1;
    const dirX = (ex - sx) / length;
    const dirZ = (ez - sz) / length;
    // The hand only needs a short, comfortable sweep to declare its direction. Project that
    // physical intent to the opposite rim so the player never has to reach across the whole table.
    const maxTravel = maxRim(this.arena.layout) * 2.5;
    let travel = maxTravel;
    for (let i = 1; i <= 24; i++) {
      const t = (maxTravel * i) / 24;
      if (normRadius(this.arena.layout, sx + dirX * t, sz + dirZ * t) >= 1.04) {
        travel = t;
        break;
      }
    }
    const gustEx = sx + dirX * travel;
    const gustEz = sz + dirZ * travel;
    const force = this.charges.spend(this.elapsed, TUNING.grace);
    if (!force) {
      this.palmGustCooldown = 0.35;
      this.locked('Forge Gust needs one charge\nCharges refill in a moment');
      return;
    }
    // The open index travels close to the bowl during the same physical sweep. Own that whole
    // stroke as a Gust; otherwise updateShaping can retain its fingertip trail and commit a paid
    // Finger Groove when the player lifts the hand after the sweep.
    this.blockShapingRelease(side);
    const power = Math.min(1.5, strength * force);
    const candidates = this.tops;
    // A gust steers around the player's own top.
    const own = this.mine;
    const struck = candidates.filter((top) => top !== own && palmGustCrosses(this.arena, top, sx, sz, gustEx, gustEz));
    this.palmGustDirection.set(dirX, dirZ);
    this.palmGustCooldown = PALM_GUST_COOLDOWN;
    this.palmGustTime = PALM_GUST_FX_TIME;
    this.palmGustLength = travel;
    this.palmGustHits = struck.length;
    this.palmGustSide = side;
    this.palmGustCount++;
    this.palmGustFx.visible = !this.photo;
    this.palmGustFx.position.set(sx, this.arena.height(sx, sz) + 0.006, sz);
    this.palmGustFx.rotation.y = -Math.atan2(this.palmGustDirection.y, this.palmGustDirection.x);
    this.palmGustFx.scale.set(0.001, 1, 1);
    (this.palmGustFx.material as MeshBasicMaterial).color.setHex(0xffad42);
    (this.palmGustFx.material as MeshBasicMaterial).opacity = 0.82;
    const exitAngle = Math.atan2(this.palmGustDirection.y, this.palmGustDirection.x);
    this.palmGustRim.position.set(0, this.arena.floorHeight(1) + 0.003, 0);
    this.palmGustRim.rotation.y = -exitAngle;
    (this.palmGustRim.material as MeshBasicMaterial).color.setHex(0xff7a20);
    if (this.online?.role === 'guest' && this.online.peer) {
      this.online.sendEvent({ kind: 'gust', sx: -sx, sz: -sz, ex: -gustEx, ez: -gustEz, f: power });
    } else palmGust(this.arena, candidates, sx, sz, gustEx, gustEz, power, own);
    for (const top of struck) {
      const y = this.arena.height(top.x, top.z);
      const view = top === this.mine ? this.myView : top === this.theirs ? this.theirView : null;
      view?.flash();
      view?.hit(Math.min(1, 0.55 + power * 0.25), this.palmGustDirection.x, this.palmGustDirection.y, 0.04);
      this.impacts.hit(top.x, y, top.z, Math.min(1, 0.5 + power * 0.25));
      this.sparks.burst(top.x, y, top.z, 0.45 + power * 0.2);
    }
    this.lastShape = { t: this.elapsed, kind: 'parry' };
    this.recordIntervention();
    if (struck.length) this.impacts.shock(struck[0].x, this.arena.height(struck[0].x, struck[0].z), struck[0].z, 0.5, 0xffb04a);
    this.stamp.show(struck.length ? 'FORGE GUST!' : 'GUST MISSED', struck.length ? `${struck.length} TOP${struck.length === 1 ? '' : 'S'} IN THE CORRIDOR` : 'SWEEP THROUGH A TOP', struck.length ? 'mine' : 'neutral', 0.6, 0.9);
    this.label.set(struck.length ? 'YOUR HAND MOVED THE FIGHT' : 'THE CORRIDOR MISSED');
    this.labelTimer = 1.1;
    playDash(gustEx);
    if (import.meta.env.DEV) console.log(`[GUST] ${side} ${sx.toFixed(3)},${sz.toFixed(3)} → ${gustEx.toFixed(3)},${gustEz.toFixed(3)} ×${power.toFixed(2)} hits ${struck.length}`);
  }

  /**
   * A ready ultimate is a physical forge seal: pinch it off the top, press it into the battlefield,
   * then keep the pinch held to steer Tilt, Magnet, or Ward for a short overforge window. The old
   * table slap stays as the one-handed/Gentle fallback.
   */
  private updateOverforge(armed: boolean, dt: number) {
    const active = this.overforgeControl;
    if (active) {
      const h = this.hands[active.side];
      active.t -= dt;
      if (!h.tracked && (this.overforgeLost += dt) < HAND_LOSS_GRACE) return;
      if (h.tracked) this.overforgeLost = 0;
      if (!h.tracked || !h.pinching || active.t <= 0 || this.phase !== 'fight') {
        this.overforgeLost = 0;
        this.rampAt[active.side] = this.elapsed;
        this.tipFresh[active.side] = true;
        this.pressing[active.side] = false;
        this.overforgeControl = null;
        this.overforgeHeld = null;
        this.overforgeMode = 'idle';
        return;
      }
      const l = this.toLocal(h.pinch);
      const r = Math.hypot(l.x, l.z);
      if (r > this.arena.radius * 1.2) {
        l.x *= (this.arena.radius * 1.2) / r;
        l.z *= (this.arena.radius * 1.2) / r;
      }
      controlSeal(this.arena, this.mine, this.theirs, active.seal, l.x, l.z, dt);
      const target = sealTarget(this.arena, this.mine, this.theirs, active.seal, l.x, l.z);
      this.ultimateCue.ox = l.x;
      this.ultimateCue.oz = l.z;
      this.ultimateCue.tx = target.x;
      this.ultimateCue.tz = target.z;
      this.ultimateCue.t = Math.max(this.ultimateCue.t, 0.25);
      this.overforgeMode = active.seal;
      return;
    }

    if (!armed || this.demo) {
      this.overforgeSeal.visible = false;
      this.overforgeHeld = null;
      this.overforgeMode = 'idle';
      return;
    }
    const seal = this.myBuild.seal ?? 'anvil';
    this.setOverforgeModel(seal);
    const heldSide = this.overforgeHeld;
    if (heldSide) {
      const h = this.hands[heldSide];
      if (!h.tracked && (this.overforgeLost += dt) < HAND_LOSS_GRACE) return;
      if (h.tracked) this.overforgeLost = 0;
      if (!h.tracked || !h.pinching) {
        this.overforgeLost = 0;
        this.overforgeHeld = null;
        this.overforgeMode = 'ready';
        return;
      }
      const l = this.toLocal(h.pinch);
      this.overforgeSeal.position.copy(l);
      this.overforgeSeal.rotation.y += dt * 3;
      this.overforgeMode = 'held';
      const n = normRadius(this.arena.layout, l.x, l.z);
      const floor = this.arena.height(l.x, l.z);
      if (n <= 1.02 && l.y <= floor + SEAL_STAMP_H && l.y >= floor - 0.04) {
        const side = heldSide;
        this.doStrike(l.x, l.z);
        // The stamping fingertip has just crossed the floor on purpose; do not reinterpret that
        // same downward motion as a Cup when the seal releases ownership of the hand.
        this.rampAt[side] = this.elapsed;
        this.tipFresh[side] = true;
        this.pressing[side] = false;
        this.overforgeSeal.visible = false;
        this.overforgeHeld = null;
        if (seal === 'tilt' || seal === 'magnet' || seal === 'ward') {
          this.overforgeControl = { side, seal, t: 2.8 };
          this.overforgeMode = seal;
          this.label.set(lessonText.overforge(SEAL_NAMES[seal]));
          this.labelTimer = 1.6;
        } else this.overforgeMode = 'idle';
        playStamp();
      }
      return;
    }

    this.overforgeSeal.visible = !this.photo;
    // The coin rises from the moving top, then settles into a stable near-rim dock. Requiring the
    // player to catch a token that keeps orbiting at top speed turned a clear ritual into a chase.
    const dockX = 0;
    const dockZ = this.arena.radius * 0.72;
    const settle = Math.min(1, Math.max(0, (this.elapsed - this.fullSince - 0.5) / 0.28));
    const x = this.mine.x + (dockX - this.mine.x) * settle;
    const z = this.mine.z + (dockZ - this.mine.z) * settle;
    const y = this.arena.height(x, z) + 0.046 + 0.004 * Math.sin(this.time * 5);
    this.overforgeSeal.position.set(x, y, z);
    this.overforgeSeal.rotation.y += dt * 1.6;
    this.overforgeSeal.scale.setScalar(1 + 0.08 * Math.sin(this.time * 6));
    this.overforgeMode = 'ready';
    this.overforgeSeal.getWorldPosition(this.p);
    for (const side of ['left', 'right'] as const) {
      const h = this.hands[side];
      if (!h.tracked || !h.justPinched || h.pinchSmooth.distanceTo(this.p) > SEAL_GRAB) continue;
      this.overforgeHeld = side;
      this.overforgeMode = 'held';
      playPick();
      if (!this.quietFirst) {
        this.label.set(`STAMP ${SEAL_NAMES[seal].toUpperCase()}\nPRESS THE SEAL INTO THE ARENA`);
        this.labelTimer = 1.6;
      }
      break;
    }
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
    if (!full) this.strikeWindowShown = false;
    if (full && !this.barWasFull) {
      playBarFull();
      this.fullSince = this.elapsed;
      if (!this.photo && !this.quietFirst) this.stamp.show('ULTIMATE READY', SEAL_NAMES[this.myBuild.seal ?? 'anvil'].toUpperCase(), 'mine', 0.8, 1.15);
    }
    this.barWasFull = full;
    const rivalAtRim = this.theirs.alive && normRadius(this.arena.layout, this.theirs.x, this.theirs.z) >= 0.68;
    if (full && rivalAtRim && !this.strikeWindowShown && this.labelTimer <= 0 && !this.quietFirst) {
      this.strikeWindowShown = true;
      this.call(LESSON.strikeWindow, CALL.tactic, 1.4);
      this.stamp.show('STRIKE WINDOW', 'RIVAL EXPOSED AT THE RIM', 'mine', 0.6);
      playTick();
    }
    // The hint stays until the first strike lands (the first session's ramp hint goes first).
    if (full && !this.struckOnce && !this.demo && this.progress.guide !== 'bump' && this.labelTimer <= 0) {
      this.strikeTaught = true;
      const seal = this.myBuild.seal ?? 'anvil';
      this.call(lessonText.strike(SEAL_NAMES[seal]), CALL.ultimate, 0, 'strike-ready');
    }
    const armed = full && this.elapsed - this.fullSince > 0.5;
    this.updateOverforge(armed, dt);
    // The print follows the tracked palm closest to table height. Both emulated/real hands remain
    // tracked, so taking the first one made a parked hand steal the aiming hint.
    const slapFallback = armed && (COMFORT.gentle || this.elapsed - this.fullSince > 4);
    this.slapMark.visible = slapFallback && !this.photo;
    if (slapFallback) {
      let a = Math.PI / 3;
      let best = Infinity;
      const tableLocalY = -PEDESTAL / ARENA_SCALE;
      for (const side of ['left', 'right'] as const) {
        const hand = this.hands[side];
        if (!hand.tracked) continue;
        const palm = this.slapAt.copy(this.toLocal(hand.wrist)).lerp(this.toLocal(hand.index), 0.5);
        const radius = Math.hypot(palm.x, palm.z);
        const score = Math.abs(palm.y - tableLocalY) + Math.abs(radius - this.arena.radius * 1.15) * 0.2;
        if (radius > this.arena.radius * 0.65 && score < best) {
          best = score;
          a = Math.atan2(palm.z, palm.x);
        }
      }
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
      const outside = l !== null && normRadius(this.arena.layout, l.x, l.z) > SLAP_MIN_N;
      const openPalm = h.tracked && !h.pinching && Math.abs(h.wrist.y - h.index.y) <= 0.08;
      // Any held tool, a Crossguard post or the beam owns the palm first (gesture-owner.ts).
      const ownsAnotherGesture = !mayListen(this.handFacts(side), 'slap');
      // The open-palm press is a delayed accessibility fallback for the seal stamp. Keeping its
      // detector live before the fallback appears made the two open hands approaching Arena Forge
      // count as a hidden ultimate slap.
      const hit = (COMFORT.gentle ? this.touches : this.strikeTouch)[side].update(slapFallback && outside && openPalm && !ownsAnotherGesture ? h.low : null, dt, tableY - 0.05, tableY + 0.05);
      if (hit === null) continue;
      if (!armed) {
        if (import.meta.env.DEV) console.log(`[STRIKE] pressed with the bar at ${Math.round(this.forgeBar.value * 100)}%`);
        // Not full yet: a dull clunk says so (once the strike is taught).
        if (this.taught('strike')) this.locked(lessonText.strikeNotReady(Math.round(this.forgeBar.value * 100)));
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
    const ultimateHeat = this.ultimateCue.t > 0 ? (this.ultimateCue.seal === 'hammer' || this.ultimateCue.seal === 'ward' ? 0.75 : Math.max(0, 1 - this.ultimateCue.age / 1.1)) : 0;
    this.arenaView.charge = Math.max(full ? 0.7 + 0.3 * Math.sin(this.time * 8) : this.forgeBar.value * 0.5, ultimateHeat);
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
    // The shockwave crosses slowly enough to read as the cause of the tops being thrown.
    if (this.shockT < 1) {
      this.shockT = Math.min(1, this.shockT + dt / 0.38);
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
  /**
   * A friend's echo forges the arena when they did, from the far side: the same move through the
   * same impulse as a player's (arena-forge.ts), at a firm standard strength, with their ghost hand.
   */
  private playEcho() {
    const echo = this.rivalEcho;
    if (!echo || this.demo || this.online?.peer) return;
    const round = this.echoRec.rips.length - 1;
    const due = echo.forges.filter((f) => f.round === round);
    const f = due[this.echoPlayed];
    if (!f) return;
    // Start the hand before the arena moves. The ghost takes about 1.3 s to pinch, pull and fade;
    // an 0.8 s lead makes the player's recorded gesture readable as the cause, not decoration.
    const [, g] = forgeGrips(this.arena.layout);
    const d = Math.hypot(g.x, g.z) || 1;
    if (this.echoWarned === this.echoPlayed && this.elapsed >= Math.max(TUNING.grace, f.t - 0.8)) {
      this.echoWarned++;
      this.rivalHandMove(-g.x, -g.z, g.x / d, g.z / d);
      this.stamp.show('ECHO FORGE INCOMING', ARENA_FORGE_TITLE[f.action], 'rival', 0.65);
      playTell();
    }
    if (this.elapsed < f.t) return;
    this.echoPlayed++;
    const gesture: ArenaForgeGesture = {
      pull: f.action === 'squeeze' ? -0.09 : f.action === 'stretch' ? 0.09 : 0,
      twist: f.action === 'twist' ? 0.24 * f.sign : 0,
      tilt: f.action === 'tilt' ? 0.05 : 0,
    };
    // Seen from the far side the friend's low hand is on the other side: downhill flips in x.
    const downhill = -f.sign;
    // The same forge rule as yours, with the rival as the forger: its own top is held and barely
    // moved, and your top is hit hard only if it is exposed at the rim.
    const aim = arenaForgeAim(this.mine.x, this.mine.z, this.mine.vx, this.mine.vz, this.arena.radius);
    if (this.theirs.alive) this.theirs.shieldUntil = Math.max(this.theirs.shieldUntil, this.arena.elapsed + ARENA_FORGE_SHIELD);
    for (const top of this.tops) {
      if (!top.alive) continue;
      const own = top === this.theirs;
      const impulse = arenaForgeImpulse(own ? f.action : arenaForgeRivalAction(f.action), gesture, top.x, top.z, this.arena.radius, downhill, 0, own ? 0.4 : aim);
      top.vx += impulse.x;
      top.vz += impulse.z;
      top.kick = Math.max(top.kick, 0.55);
      top.kickX = impulse.x;
      top.kickZ = impulse.z;
    }
    this.rivalShapeAt = this.elapsed;
    this.rivalShapeKind = `ECHO ${f.action.toUpperCase()}`;
    this.stamp.show(`ECHO ${ARENA_FORGE_TITLE[f.action]}`, 'your friend\'s hands', 'rival', 0.9);
    this.impacts.shock(0, this.arena.height(0, 0), 0, 0.6);
    playThock();
    if (import.meta.env.DEV) console.log(`[ECHO] ${f.action} ${f.sign} at t ${this.elapsed.toFixed(2)} round ${round}`);
  }

  /** Mirrors the active wind-up into ECS and keeps every threat overlay on one reset path. */
  private setRivalTellState(move: RivalMove | null) {
    const code = move ? RIVAL_TELL_CODE[move] : 0;
    if (code === this.rivalTellCode) return;
    this.rivalTellCode = code;
    this.rootEntity?.setValue(FirstFiveState, 'rivalTell', code);
    if (code) return;
    this.lane.visible = false;
    this.rivalTellFx.visible = false;
    this.rivalTellTarget.visible = this.rivalTellGuard.visible = false;
    for (const mesh of [...this.rivalTellChevrons, ...this.rivalTellQuake]) mesh.visible = false;
  }

  /** One phase owns one information layer: the live fight never carries a persistent prose card. */
  private syncUiHierarchy() {
    const code = this.phase === 'forge' || this.phase === 'build'
      ? 1
      : this.phase === 'ready' || this.phase === 'pulling'
        ? 2
        : this.phase === 'fight'
          ? 3
          : this.phase === 'result'
            ? 4
            : 0;
    if (code !== this.uiLayerCode) {
      this.uiLayerCode = code;
      this.rootEntity?.setValue(FirstFiveState, 'uiLayer', code);
    }
    if (this.hands.left.justReleased || this.hands.right.justReleased) this.handRecoverUntil = this.time + 0.22;
    const manipulating = !!this.shaping.left || !!this.shaping.right
      || !!this.slings.left || !!this.slings.right
      || !!this.rimPulls.left || !!this.rimPulls.right
      || !!this.overforgeHeld || !!this.forgeWheelHeld || !!this.emberHeld;
    const impacting = this.causeCue.stage >= 2 || this.palmGustTime > 0 || this.shockT < 1 || this.arenaMorphHold > 0;
    const pinching = this.hands.left.pinching || this.hands.right.pinching;
    const aiming = this.handHover.left || this.handHover.right || this.crossguardActive || this.palmLauncherSide !== null;
    const handCode = impacting ? 4
      : this.phase === 'pulling' || manipulating ? 3
        : pinching ? 2
          : this.time < this.handRecoverUntil ? 5
            : aiming ? 1
              : 0;
    if (handCode !== this.handPresentationCode) {
      this.handPresentationCode = handCode;
      this.rootEntity?.setValue(FirstFiveState, 'handPresentation', handCode);
    }
    const handEmphasis = impacting ? 1
      : this.phase === 'pulling' || manipulating ? 0.82
        : pinching ? 0.64
          : aiming ? 0.34
            : this.time < this.handRecoverUntil ? 0.2
              : 0;
    if (Math.abs(handEmphasis - this.handEmphasisValue) > 0.001) {
      this.handEmphasisValue = handEmphasis;
      this.rootEntity?.setValue(FirstFiveState, 'handEmphasis', handEmphasis);
    }
    if (this.phase !== 'fight') return;
    const teaching = this.progress.guide !== 'done';
    const arenaThreat = this.rivalTellCode !== 0;
    const sequentialNote = this.labelTimer > 0 && !this.stamp.busy && !arenaThreat;
    this.label.mesh.visible = !!this.label.current && !arenaThreat && (teaching || sequentialNote);
  }

  /** Starts or advances the warm trace from a hand-authored surface to the top it changed. */
  private showCauseCue(stage: 1 | 2 | 3, kind: string, sx: number, sz: number, tx = sx, tz = sz) {
    const cue = this.causeCue;
    cue.stage = stage;
    cue.kind = kind;
    cue.sx = sx;
    cue.sz = sz;
    cue.tx = tx;
    cue.tz = tz;
    cue.t = stage === 1 ? 1.1 : stage === 2 ? 1.7 : 2.4;
    this.causeFx.visible = true;
    this.rootEntity?.setValue(FirstFiveState, 'causeChain', stage);
  }

  private clearCauseCue() {
    if (!this.causeCue.stage && !this.causeFx.visible) return;
    this.causeCue.stage = 0;
    this.causeCue.t = 0;
    this.causeFx.visible = false;
    this.rootEntity?.setValue(FirstFiveState, 'causeChain', 0);
  }

  private recentPlayerCause(): string | null {
    if (!this.lastShape || this.elapsed - this.lastShape.t >= CAUSE_WINDOW) return null;
    return (this.lastShape.kind === 'strike'
      ? SEAL_NAMES[this.myBuild.seal ?? 'anvil']
      : this.lastShape.kind === 'well' ? 'CUP' : this.lastShape.kind).toUpperCase();
  }

  /** Keeps the cause readable during normal head motion without adding a screen-space panel. */
  private updateCauseCue(dt: number) {
    const cue = this.causeCue;
    if (cue.stage === 0) return;
    cue.t -= dt;
    if (cue.t <= 0) {
      this.clearCauseCue();
      return;
    }
    const decisive = cue.stage === 3;
    const pulse = 1 + (decisive ? 0.22 : 0.12) * Math.sin(this.time * (decisive ? 11 : 8));
    const sy = this.arena.height(cue.sx, cue.sz) + 0.0035;
    const ty = this.arena.height(cue.tx, cue.tz) + 0.004;
    this.causeOrigin.visible = true;
    this.causeOrigin.position.set(cue.sx, sy, cue.sz);
    this.causeOrigin.scale.setScalar(pulse);
    this.causeTarget.visible = cue.stage >= 2;
    this.causeTarget.position.set(cue.tx, ty, cue.tz);
    this.causeTarget.scale.setScalar(pulse * (decisive ? 1.25 : 1));
    const dx = cue.tx - cue.sx;
    const dz = cue.tz - cue.sz;
    const length = Math.hypot(dx, dz);
    this.causePath.visible = cue.stage >= 2 && length > 0.005;
    if (this.causePath.visible) {
      this.causePath.position.set(cue.sx, Math.max(sy, ty), cue.sz);
      this.causePath.rotation.y = Math.atan2(-dx, -dz);
      this.causePath.scale.set(decisive ? 0.012 : 0.007, 1, length);
    }
    const color = decisive ? 0xfff0c2 : cue.stage === 2 ? 0xffc466 : 0xff9a32;
    for (const mesh of [this.causePath, this.causeOrigin, this.causeTarget]) {
      const material = mesh.material as MeshBasicMaterial;
      material.color.setHex(color);
      material.opacity = decisive ? 0.95 : 0.68 + 0.18 * Math.sin(this.time * 8);
    }
  }

  private rivalTell(clash: number) {
    if (this.demo || !this.taught('tells') || this.online?.peer) return;
    this.rivalBar.update(STEP, false);
    if (clash) this.rivalBar.clash(clash, this.elapsed, false);
    const them = this.theirs;
    if (this.tellAt < 0) {
      if (!them.alive || !this.mine.alive) return;
      // A queued round/reward word owns the same read band. Let it finish before the arena itself
      // becomes the next instruction, rather than stacking two calls for attention.
      if (this.stamp.occupied) return;
      // Skilled rivals read a ready strike once per round and show a short fake wind-up. Spending
      // into it still lands the seal, but does not earn an interrupt/refund; holding reveals it.
      if (this.tellTaught && this.rivalBar.full && this.forgeBar.full && !this.rivalFeintUsed && this.rivalLaunchPower >= 0.62) {
        this.rivalFeintUsed = true;
        this.rivalFeinting = true;
        this.rivalTellDuration = 0.5;
        this.tellAt = this.elapsed + this.rivalTellDuration;
        them.tell = this.rivalTellDuration;
        this.setRivalTellState(this.rival.move);
        this.barMessage = `${this.rival.move.toUpperCase()}?`;
        playTell();
        return;
      }
      if (!this.rivalBar.spend(this.elapsed, TUNING.grace + 2)) return;
      this.rivalHeld = 0;
      this.rivalTellDuration = Math.max(0.88, TELL_TIME - Math.max(0, this.rivalLaunchPower - 0.55) * 0.7);
      this.tellAt = this.elapsed + this.rivalTellDuration;
      them.tell = this.rivalTellDuration;
      this.setRivalTellState(this.rival.move);
      this.barMessage = this.rival.move.toUpperCase();
      playTell();
      {
        const dx = this.mine.x - them.x;
        const dz = this.mine.z - them.z;
        const d = Math.hypot(dx, dz) || 1;
        this.rivalHandMove(them.x, them.z, dx / d, dz / d);
      }
      const what = { charge: 'a charge', quake: 'a quake', pull: 'a pull' }[this.rival.move];
      if (!this.tellTaught) {
        this.tellTaught = true;
        this.call(`${what.toUpperCase()} INCOMING\n${this.forgeBar.full ? ((this.myBuild.seal ?? 'anvil') === 'ward' ? 'WARD UP' : 'ULTIMATE NOW') : 'CUP YOUR TOP'}`, CALL.danger, 2.5, 'tell');
      }
      if (import.meta.env.DEV) console.log(`[TELL] ${this.rival.name} ${this.rival.move} at t ${this.elapsed.toFixed(1)}`);
      return;
    }
    if (them.tell <= 0) {
      // Cut short by the strike (doStrike says so).
      this.tellAt = -1;
      this.setRivalTellState(null);
      this.barMessage = 'READY';
      this.rivalFeinting = false;
      return;
    }
    them.tell = this.tellAt - this.elapsed;
    this.drawLane(1 - them.tell / this.rivalTellDuration);
    // The tell: the rival flashes and rings spread under it.
    // Three flashes a second at most (WCAG 2.3.1), none with flashes off.
    if (Math.floor(this.elapsed * 3) !== Math.floor((this.elapsed - STEP) * 3)) this.theirView.flash();
    if (Math.floor(this.elapsed * 4) !== Math.floor((this.elapsed - STEP) * 4)) this.impacts.hit(them.x, this.arena.height(them.x, them.z), them.z, 0.5);
    if (them.tell > 0) return;
    them.tell = 0;
    this.tellAt = -1;
    this.setRivalTellState(null);
    this.barMessage = 'READY';
    if (this.rivalFeinting) {
      this.rivalFeinting = false;
      this.call('FEINT!\nREAL MOVE STILL READY', CALL.danger, 0.9);
      return;
    }
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
    this.rivalTellFx.visible = me.alive && them.alive;
    this.rivalTellTarget.visible = false;
    this.rivalTellGuard.visible = me.alive;
    this.rivalTellGuard.position.set(me.x, this.arena.height(me.x, me.z) + 0.004, me.z);
    this.rivalTellGuard.scale.setScalar(0.92 + 0.18 * Math.sin(this.time * 9));
    (this.rivalTellGuard.material as MeshBasicMaterial).opacity = 0.62 + 0.25 * k;
    for (const mesh of this.rivalTellChevrons) mesh.visible = false;
    for (const mesh of this.rivalTellQuake) mesh.visible = false;
    this.lane.visible = move !== 'quake' && me.alive;
    if (move === 'quake') {
      for (let i = 0; i < this.rivalTellQuake.length; i++) {
        const mesh = this.rivalTellQuake[i];
        const phase = (k * 0.75 + i / this.rivalTellQuake.length) % 1;
        mesh.visible = true;
        mesh.position.set(them.x, this.arena.height(them.x, them.z) + 0.003, them.z);
        const scale = (0.35 + phase * 2.8) * (this.arena.radius / 0.17);
        mesh.scale.setScalar(scale);
        (mesh.material as MeshBasicMaterial).opacity = (0.25 + 0.55 * k) * (1 - phase);
      }
      return;
    }
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
    this.rivalTellTarget.visible = true;
    this.rivalTellTarget.position.set(tx, this.arena.height(tx, tz) + 0.004, tz);
    this.rivalTellTarget.scale.setScalar(0.9 + 0.2 * Math.sin(this.time * 10));
    (this.rivalTellTarget.material as MeshBasicMaterial).opacity = 0.55 + 0.35 * k;
    const dx = tx - fx;
    const dz = tz - fz;
    for (let i = 0; i < this.rivalTellChevrons.length; i++) {
      const mesh = this.rivalTellChevrons[i];
      const along = Math.min(0.94, Math.max(0.1, (i + 1) / 4 + k * 0.16));
      const x = fx + dx * along;
      const z = fz + dz * along;
      mesh.visible = true;
      mesh.position.set(x, this.arena.height(x, z) + 0.005, z);
      mesh.rotation.y = Math.atan2(-dx, -dz);
      mesh.scale.setScalar(0.75 + 0.35 * k);
      (mesh.material as MeshBasicMaterial).opacity = 0.45 + 0.45 * k;
    }
  }

  /** First-fight choreography: the cyan travel line crosses the orange place to raise the floor. */
  private drawTutorialLane(x: number, z: number) {
    const them = this.theirs;
    const d = Math.hypot(them.x, them.z) || 1;
    const tx = (them.x / d) * this.arena.radius;
    const tz = (them.z / d) * this.arena.radius;
    const dx = tx - them.x;
    const dz = tz - them.z;
    const len = Math.hypot(dx, dz);
    this.rivalTellFx.visible = this.lane.visible = them.alive;
    if (!them.alive) return;
    this.lane.position.set(them.x, this.arena.height(them.x, them.z) + 0.002, them.z);
    this.lane.rotation.y = Math.atan2(-dx, -dz);
    this.lane.scale.set(0.01, 1, Math.max(0.001, len));
    (this.lane.material as MeshBasicMaterial).opacity = 0.48;
    this.rivalTellGuard.visible = true;
    this.rivalTellGuard.position.set(x, this.arena.height(x, z) + 0.004, z);
    this.rivalTellGuard.scale.setScalar(0.9 + 0.2 * Math.sin(this.time * 8));
    this.rivalTellTarget.visible = true;
    this.rivalTellTarget.position.set(tx, this.arena.height(tx, tz) + 0.004, tz);
    this.rivalTellTarget.scale.setScalar(0.82 + 0.14 * Math.sin(this.time * 8));
    for (const mesh of this.rivalTellQuake) mesh.visible = false;
    for (let i = 0; i < this.rivalTellChevrons.length; i++) {
      const mesh = this.rivalTellChevrons[i];
      const along = (i + 1) / 4;
      const px = them.x + dx * along;
      const pz = them.z + dz * along;
      mesh.visible = true;
      mesh.position.set(px, this.arena.height(px, pz) + 0.005, pz);
      mesh.rotation.y = Math.atan2(-dx, -dz);
      mesh.scale.setScalar(0.82);
      (mesh.material as MeshBasicMaterial).opacity = 0.72;
    }
  }

  /**
   * Keeps the ultimate's cause and target visible after the title has landed. Rush points from your
   * top to theirs, Magnet from theirs to the pit, and Tilt from the middle toward the struck side.
   * Hammer and Ward ring your own top; Anvil leaves its expanding shockwave unobstructed.
   */
  private updateUltimateCue(dt: number) {
    const cue = this.ultimateCue;
    if (this.phase !== 'fight') {
      this.ultimatePath.visible = this.ultimateTarget.visible = this.ultimateArrow.visible = false;
      this.ultimateArenaFx.visible = false;
      return;
    }
    cue.age += dt;
    // Persistent presentation follows simulation time exactly, including hit stop and Assist mode.
    cue.t = cue.seal === 'hammer' ? this.mine.hammer : cue.seal === 'ward' ? this.mine.guard : Math.max(0, cue.t - dt);
    if (cue.t <= 0) {
      this.ultimatePath.visible = this.ultimateTarget.visible = this.ultimateArrow.visible = false;
      this.ultimateArenaFx.visible = false;
      return;
    }
    const seal = cue.seal;
    let fx = cue.fx;
    let fz = cue.fz;
    let tx = cue.tx;
    let tz = cue.tz;
    let path = false;
    if (seal === 'rush') {
      path = this.mine.alive;
    } else if (seal === 'magnet') {
      fx = this.theirs.x;
      fz = this.theirs.z;
      path = this.theirs.alive;
    } else if (seal === 'tilt') {
      fx = fz = 0;
      path = true;
    }
    const fade = Math.min(1, cue.t / 0.3);
    const pulse = COMFORT.flashes ? 1 + 0.16 * Math.sin(this.time * 12) : 1;
    this.ultimateTarget.visible = seal !== 'anvil' && seal !== 'tilt';
    this.ultimateTarget.position.set(tx, this.arena.height(tx, tz) + 0.004, tz);
    this.ultimateTarget.scale.setScalar((seal === 'hammer' ? 1 : seal === 'magnet' ? 0.7 : 0.85) * pulse);
    (this.ultimateTarget.material as MeshBasicMaterial).opacity = 0.85 * fade;
    this.ultimatePath.visible = path && cue.t > 0;
    this.ultimateArrow.visible = this.ultimatePath.visible;
    if (this.ultimatePath.visible) {
      const len = Math.max(0.05, Math.hypot(tx - fx, tz - fz));
      const yaw = Math.atan2(-(tx - fx), -(tz - fz));
      this.ultimatePath.position.set(fx, this.arena.height(fx, fz) + 0.003, fz);
      this.ultimatePath.rotation.y = yaw;
      this.ultimatePath.scale.set((seal === 'tilt' ? 0.018 : 0.028) * pulse, 1, len);
      (this.ultimatePath.material as MeshBasicMaterial).opacity = 0.8 * fade;
      this.ultimateArrow.position.set(fx + (tx - fx) * 0.65, this.arena.height(fx + (tx - fx) * 0.65, fz + (tz - fz) * 0.65) + 0.004, fz + (tz - fz) * 0.65);
      this.ultimateArrow.rotation.y = yaw;
      this.ultimateArrow.scale.setScalar(pulse);
      (this.ultimateArrow.material as MeshBasicMaterial).opacity = 0.95 * fade;
    }
    this.updateUltimateArenaFx(seal, fade);
  }

  /**
   * Makes an ultimate belong to the whole tabletop instead of reading as a sticker on one top.
   * The geometry is pooled: only transforms, visibility and material opacity change per frame.
   */
  private updateUltimateArenaFx(seal: Seal, fade: number) {
    const cue = this.ultimateCue;
    const radius = maxRim(this.arena.layout);
    const burst = Math.max(0, 1 - cue.age / 1.05);
    const pulse = COMFORT.flashes ? 0.82 + 0.18 * Math.sin(this.time * 7) : 0.9;
    this.ultimateArenaFx.visible = cue.t > 0;

    for (const mesh of [...this.ultimateArenaRings, ...this.ultimateArenaSeams, ...this.ultimateRushChevrons, ...this.ultimateHammerArcs]) mesh.visible = false;
    this.ultimateArenaWall.visible = this.ultimateWardSector.visible = this.ultimateWardCage.visible = false;

    // Magnet: a compact funnel at the player-selected pit/rim; the path carries the direction.
    for (let i = 0; i < this.ultimateArenaRings.length; i++) {
      const ring = this.ultimateArenaRings[i];
      const magnetPhase = (cue.age * 0.75 + i / this.ultimateArenaRings.length) % 1;
      const ringRadius = 0.01 + 0.05 * (1 - magnetPhase);
      const opacity = seal === 'magnet' ? (0.25 + 0.65 * magnetPhase) * fade : 0;
      ring.visible = seal === 'magnet';
      ring.position.set(cue.tx, this.arena.height(cue.tx, cue.tz) + 0.003 + i * 0.0003, cue.tz);
      ring.scale.set(ringRadius / 0.0585, 1, ringRadius / 0.0585);
      (ring.material as MeshBasicMaterial).opacity = opacity;
    }

    // Anvil cracks race inward from the actual slap. Tilt seams sweep downhill in sequence.
    for (let i = 0; i < this.ultimateArenaSeams.length; i++) {
      const seam = this.ultimateArenaSeams[i];
      if (seal === 'anvil' && i < 5) {
        const inward = Math.atan2(cue.ox, cue.oz);
        seam.visible = burst > 0.02;
        seam.position.set(cue.ox, this.arena.height(cue.ox, cue.oz) + 0.0025, cue.oz);
        seam.rotation.y = inward + (i - 2) * 0.14;
        seam.scale.set(1.4 + burst, 1, (radius * 1.9) / 0.14);
        (seam.material as MeshBasicMaterial).opacity = burst * 0.85 * fade;
      } else if (seal === 'tilt' && i < 5) {
        const downhill = Math.atan2(-cue.tx, -cue.tz);
        const sweep = Math.max(0, Math.min(1, cue.age * 2.2 - i * 0.09));
        seam.visible = sweep > 0 && cue.t > 0;
        seam.position.set(0, this.arena.floorHeight(0) + 0.0025, 0);
        seam.rotation.y = downhill + (i - 2) * 0.1;
        seam.scale.set(1.1, 1, (radius / 0.14) * (0.35 + 0.65 * sweep));
        (seam.material as MeshBasicMaterial).opacity = (1 - sweep * 0.35) * 0.55 * fade;
      }
    }

    // Anvil gets one brief rim flash, not a shield-like persistent cylinder.
    const wallOn = seal === 'anvil' && cue.age < 0.18;
    this.ultimateArenaWall.visible = wallOn;
    if (wallOn) {
      const shapeX = this.arena.layout.shape === 'square' ? 1.12 : 1;
      const shapeZ = this.arena.layout.shape === 'oval' ? 0.78 : shapeX;
      this.ultimateArenaWall.position.set(0, this.arena.floorHeight(0.97) + 0.019, 0);
      this.ultimateArenaWall.scale.set((radius / 0.15) * shapeX, 0.8 + burst, (radius / 0.15) * shapeZ);
      (this.ultimateArenaWall.material as MeshBasicMaterial).opacity = burst * 0.32 * fade;
    }

    if (seal === 'rush') {
      const dx = cue.tx - cue.fx;
      const dz = cue.tz - cue.fz;
      const yaw = Math.atan2(-dx, -dz);
      for (let i = 0; i < this.ultimateRushChevrons.length; i++) {
        const ch = this.ultimateRushChevrons[i];
        const along = ((cue.age * 1.4 + i / 3) % 1) * 0.8 + 0.08;
        const x = cue.fx + dx * along;
        const z = cue.fz + dz * along;
        ch.visible = true;
        ch.position.set(x, this.arena.height(x, z) + 0.004, z);
        ch.rotation.y = yaw;
        ch.scale.setScalar(0.8 + 0.25 * pulse);
        (ch.material as MeshBasicMaterial).opacity = (0.45 + 0.4 * along) * fade;
      }
    }

    if (seal === 'hammer') {
      for (let i = 0; i < this.ultimateHammerArcs.length; i++) {
        const arc = this.ultimateHammerArcs[i];
        arc.visible = true;
        arc.position.set(cue.tx, this.arena.height(cue.tx, cue.tz) + 0.004 + i * 0.0003, cue.tz);
        arc.rotation.y = (i / 3) * Math.PI * 2 - this.time * 0.7;
        arc.scale.setScalar(0.92 + i * 0.12 + 0.04 * pulse);
        (arc.material as MeshBasicMaterial).opacity = (0.55 + 0.18 * pulse) * fade;
      }
    }

    if (seal === 'ward') {
      const angle = Math.atan2(cue.tz, cue.tx);
      const shapeX = this.arena.layout.shape === 'square' ? 1.12 : 1;
      const shapeZ = this.arena.layout.shape === 'oval' ? 0.78 : shapeX;
      this.ultimateWardSector.visible = true;
      this.ultimateWardSector.position.set(0, this.arena.floorHeight(0.97) + 0.003, 0);
      this.ultimateWardSector.rotation.y = -angle;
      this.ultimateWardSector.scale.set((radius / 0.15) * shapeX, 1, (radius / 0.15) * shapeZ);
      (this.ultimateWardSector.material as MeshBasicMaterial).opacity = (0.55 + 0.18 * pulse) * fade;
      this.ultimateWardCage.visible = true;
      this.ultimateWardCage.position.set(this.mine.x, this.arena.height(this.mine.x, this.mine.z) + 0.022, this.mine.z);
      this.ultimateWardCage.rotation.y += this.frameDt * 0.8;
      this.ultimateWardCage.scale.setScalar(0.9 + 0.08 * pulse);
      for (const child of this.ultimateWardCage.children) {
        ((child as Mesh).material as MeshBasicMaterial).opacity = (0.5 + 0.18 * pulse) * fade;
      }
    }
  }

  /** Starts the arena cue before the simulation changes velocity, preserving the intended target. */
  private beginUltimateCue(seal: Seal, ox: number, oz: number) {
    const cue = this.ultimateCue;
    cue.t = seal === 'hammer' ? HAMMER_TIME : seal === 'ward' ? WARD_TIME : seal === 'tilt' ? TILT.time : 3.5;
    cue.age = 0;
    cue.seal = seal;
    cue.ox = ox;
    cue.oz = oz;
    cue.fx = this.mine.x;
    cue.fz = this.mine.z;
    const target = sealTarget(this.arena, this.mine, this.theirs, seal, ox, oz);
    cue.tx = target.x;
    cue.tz = target.z;
    const color = SEAL_COLOR[seal];
    (this.ultimatePath.material as MeshBasicMaterial).color.setHex(color);
    (this.ultimateTarget.material as MeshBasicMaterial).color.setHex(color);
    (this.ultimateArrow.material as MeshBasicMaterial).color.setHex(color);
    for (const mesh of [...this.ultimateArenaRings, ...this.ultimateArenaSeams, this.ultimateArenaWall]) (mesh.material as MeshBasicMaterial).color.setHex(color);
  }

  /** Spends the full bar: the shockwave, both tops thrown out, the room flashes, a hammer on an anvil. */
  private doStrike(ox = 0, oz = 0) {
    if (!this.forgeBar.spend(this.elapsed, TUNING.grace)) return;
    this.cancelActiveGestures();
    this.recordIntervention();
    this.overforgeSeal.visible = false;
    const seal = this.myBuild.seal ?? 'anvil';
    this.beginUltimateCue(seal, ox, oz);
    this.roomImprints.record(seal, Math.atan2(oz, ox));
    // The Ward is a parry, not an interrupt: the move still comes, and a charge rebounds off it.
    const cut = this.tellAt >= 0 && this.theirs.tell > 0 && seal !== 'ward' && !this.rivalFeinting;
    const perfectInterrupt = cut && this.theirs.tell <= PERFECT_INTERRUPT_WINDOW;
    // Cups and slings let go first, so none is left holding forever.
    for (const s of ['left', 'right'] as const) {
      this.endSling(s, false);
      const c = this.cups[s];
      if (c && this.arena.shapes.includes(c.shape)) this.arena.free(c.shape);
    }
    // Online guest: the host strikes for you (an Anvil Strike from your side); the snapshot shows it.
    if (this.online?.role === 'guest' && this.online.peer) this.online.sendEvent({ kind: 'strike', x: -ox, z: -oz, seal });
    else sealStrike(this.arena, this.mine, this.theirs, seal, ox, oz);
    this.shockAt.x = ox;
    this.shockAt.z = oz;
    this.struckOnce = true;
    if (cut) {
      this.tellAt = -1;
      this.setRivalTellState(null);
      this.barMessage = 'READY';
      if (perfectInterrupt) {
        this.forgeBar.value = Math.max(this.forgeBar.value, 0.5);
        this.theirs.vx *= 0.35;
        this.theirs.vz *= 0.35;
        this.theirs.kick = Math.max(this.theirs.kick, 0.8);
      }
      this.label.set(perfectInterrupt ? 'PERFECT INTERRUPT!\nHALF BAR REFUNDED' : 'INTERRUPTED!');
      this.stamp.show(perfectInterrupt ? 'PERFECT INTERRUPT!' : 'INTERRUPTED!', perfectInterrupt ? 'HALF BAR REFUNDED' : '', 'mine', 0.6);
      this.featDone('interrupt');
      this.labelTimer = 1.2;
      if (import.meta.env.DEV) console.log('[TELL] interrupted');
    }
    for (const s of ['left', 'right'] as const) {
      this.cups[s] = null;
      this.slings[s] = null;
    }
    this.lastShape = { t: this.elapsed, kind: 'strike' };
    // Anvil owns the arena-wide shock front. The other seals start directly with their distinctive
    // chevrons, funnel, downhill seams, hammer arcs or ward sector; a shared orange wash made six
    // different mechanics look like recolours of one ultimate.
    this.shockAt.x = ox;
    this.shockAt.z = oz;
    this.shockT = seal === 'anvil' ? 0 : 1;
    (this.shock.material as MeshBasicMaterial).color.setHex(SEAL_COLOR[seal]);
    if (seal === 'anvil') this.impacts.shock(ox, this.arena.floorHeight(1), oz, 1, SEAL_COLOR[seal]);
    // Each seal reads its own way: the anvil's shockwave from the middle, the rush's sparks trailing
    // your top, the magnet's rings closing on the rival.
    const me = this.mine;
    const them = this.theirs;
    if (seal === 'anvil') {
      this.impacts.hit(ox, this.arena.floorHeight(1), oz, 1);
      for (const t of [me, them]) if (t.alive) this.sparks.burst(t.x, this.arena.height(t.x, t.z), t.z, 1);
    } else if (seal === 'rush') {
      this.sparks.burst(me.x, this.arena.height(me.x, me.z), me.z, 1);
      this.myView.flash();
    } else if (seal === 'tilt') {
      // The arena tips toward the palm (the stage follows the sim's tilt); a thud where the hand hit.
      this.impacts.hit(ox, this.arena.floorHeight(1), oz, 1);
    } else if (seal === 'hammer' || seal === 'ward') {
      this.sparks.burst(me.x, this.arena.height(me.x, me.z), me.z, 0.7);
      this.myView.flash();
    } else {
      this.impacts.hit(them.x, this.arena.height(them.x, them.z), them.z, 1);
      this.theirView.flash();
    }
    playUltimateSignature(seal, ox, oz);
    this.roomLight.hit();
    duck(0.3, 0.4);
    // The super freeze: the fight holds for a beat while the seal rises off your top.
    this.hitStop = 0.4;
    this.accumulator = 0;
    this.sealPop.clear();
    this.sealPop.add(this.sealPopModels[seal]);
    this.sealPop.userData.t = 0;
    this.sealPop.visible = true;
    this.stamp.show(SEAL_NAMES[seal].toUpperCase() + '!', this.quietFirst ? '' : SEAL_CALL[seal], 'mine', 0.95, 1.35);
    if (this.quietFirst) this.label.set('');
    else if (!cut) {
      this.label.set(`ARENA CHANGED\n${SEAL_STATE[seal]}`);
      this.labelTimer = 2.2;
    }
    if (import.meta.env.DEV) console.log(`[STRIKE] ${seal} at t ${this.elapsed.toFixed(1)}: rival heat ${this.theirs.damage.toFixed(2)}, yours ${this.mine.damage.toFixed(2)}`);
  }

  /** A fingertip press: a cup that holds the first top to roll in, until it is slung or TUNE.cupHold passes. */
  private makeCup(side: Side, x: number, z: number) {
    const shape = this.makeShape('well', x, z, CUP_DEPTH, `${side}-cup`, 0, 0, CUP_SIGMA);
    if (!shape) return;
    if (!this.cuppedOnce && this.label.current.startsWith('New: jab')) this.label.set('');
    this.cuppedOnce = true;
    // First-fight teaching is one causal chain: shape the arena, make a cup, then immediately earn
    // the spectacular arena-changing spend. Later fights keep the normal clash/passive economy.
    if (this.progress.matches === 0 && this.progress.guide === 'match') this.forgeBar.value = 1;
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
      this.cupCaughtInRound = true;
      c.at = this.elapsed;
      const t = c.shape.caught;
      playCupCatch(t.x, t.z);
      this.impacts.shock(t.x, this.arena.height(t.x, t.z), t.z, 0.8, 0xff8a2a);
      this.sparks.burst(t.x, this.arena.height(t.x, t.z), t.z, 0.7);
      this.hitStop = Math.max(this.hitStop, 0.08);
      this.stamp.show('CUP → CAUGHT', t === this.theirs ? 'RIVAL LOCKED' : 'YOUR TOP LOCKED', t === this.theirs ? 'mine' : 'neutral', 0.5, 1.05);
      if (!this.slungOnce) this.label.set('CUP CAUGHT A TOP\nPINCH + PULL TO SLING');
      if (import.meta.env.DEV) {
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
    // Online guest: the host holds the cups; a pinch on one of this side's cups (from the snapshot,
    // turned half round into this frame) takes the sling, and the pull goes to the host on release.
    if (this.online?.role === 'guest' && this.online.peer) {
      for (const cup of this.netShapes.values()) {
        if (!cup.trap || !cup.caught || cup.owner !== 'left') continue;
        const other = side === 'left' ? 'right' : 'left';
        if (this.slings[other]?.cup === cup) continue;
        const cx = -cup.x;
        const cz = -cup.z;
        if (Math.hypot(cx - x, cz - z) > SLING_GRAB * 1.5) continue;
        this.slings[side] = { cup, sx: x, sz: z, px: 0, pz: 0 };
        return true;
      }
      return false;
    }
    for (const s of ['left', 'right'] as const) {
      const cup = this.cups[s]?.shape;
      const t = cup?.caught;
      if (!cup || !t || Math.hypot(t.x - x, t.z - z) > SLING_GRAB) continue;
      const other = side === 'left' ? 'right' : 'left';
      if (this.slings[other]?.cup === cup) continue;
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
    // Online guest: the pull (in the host's frame, turned half round) goes to the host, which slings.
    if (this.online?.role === 'guest' && this.online.peer) {
      if (fire && Math.hypot(sl.px, sl.pz) >= SLING_MIN) {
        this.online.sendEvent({ kind: 'sling', px: -sl.px, pz: -sl.pz });
        this.stamp.show('SLUNG!', '', 'mine', 0.3);
        playSling(-sl.cup.x, -sl.cup.z);
      }
      return;
    }
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
    this.recordIntervention();
    if (!this.slungOnce) this.label.set('');
    this.slungOnce = true;
    this.lastShape = { t: this.elapsed, kind: 'sling' };
    playSling(t.x, t.z);
    // The release has a payoff: a stamp and a trail of sparks off the cup.
    this.stamp.show('SLUNG!', '', 'mine', 0.3);
    this.sparks.burst(t.x, this.arena.height(t.x, t.z), t.z, 0.8);
    if (import.meta.env.DEV) console.log(`[SHAPE] sling ${t === this.mine ? 'mine' : 'rival'} angle ${a.toFixed(2)}${gap < SLING_SNAP ? ' to a pit' : ''}`);
  }

  /** Spends a charge and sets a shape (up to two live ramps per hand); without one, a dull clunk. */
  private makeShape(kind: ShapeKind, x: number, z: number, amp: number, owner: string, dx = 0, dz = 0, sigma?: number): FloorShape | null {
    // Online guest: the host makes the shape (in its own frame, turned half round); it comes back in a snapshot.
    const guest = this.online?.role === 'guest' && this.online.peer ? this.online : null;
    const cup = kind === 'well' && owner.endsWith('-cup');
    if (guest && kind !== 'ramp' && !cup) return null;
    const f = this.charges.spend(this.elapsed, TUNING.grace);
    if (guest) {
      if (!f) this.locked(LESSON.noCharge);
      else if (cup) guest.sendEvent({ kind: 'cup', x: -x, z: -z });
      else guest.sendEvent({ kind: 'ramp', x: -x, z: -z, dx: -dx, dz: -dz });
      return null;
    }
    if (import.meta.env.DEV) console.log(`[SHAPE] ${kind} at ${x.toFixed(3)},${z.toFixed(3)} amp ${amp.toFixed(3)} factor ${f} charges ${this.charges.charges} t ${this.elapsed.toFixed(1)}`);
    if (!f) {
      this.locked(LESSON.noCharge);
      return null;
    }
    const shape = this.arena.addShape(kind, x, z, amp * f, owner, dx, dz, sigma);
    this.recordIntervention();
    this.lastShape = { t: this.elapsed, kind };
    this.showCauseCue(1, kind === 'well' ? 'CUP' : kind.toUpperCase(), x, z);
    this.progress.advance('match');
    this.impacts.shock(x, this.arena.height(x, z), z, 0.45, 0xff8a2a);
    this.sparks.embers(x, this.arena.height(x, z) + 0.005, z, 5, 0.35, 0.035, 1);
    playThock(x, z);
    return shape;
  }

  /** Commits a direct-touch route. The first top to cross it takes the drawn direction. */
  private makeGroove(side: Side, sx: number, sz: number, ex: number, ez: number): FloorShape | null {
    const f = this.charges.spend(this.elapsed, TUNING.grace);
    if (!f) {
      this.locked('No charge yet\nA groove needs one charge');
      return null;
    }
    if (this.online?.role === 'guest' && this.online.peer) {
      this.online.sendEvent({ kind: 'groove', sx: -sx, sz: -sz, ex: -ex, ez: -ez });
      this.recordIntervention();
      this.lastShape = { t: this.elapsed, kind: 'groove' };
      return null;
    }
    const shape = this.arena.addGroove(sx, sz, ex, ez, side);
    if (!shape) return null;
    // Strain shortens the visual/physical channel rather than making its direction ambiguous.
    shape.amp *= f;
    this.recordIntervention();
    this.lastShape = { t: this.elapsed, kind: 'groove' };
    this.showCauseCue(1, 'GROOVE', sx, sz, ex, ez);
    this.progress.advance('match');
    this.impacts.shock(ex, this.arena.height(ex, ez), ez, 0.5, 0xffc066);
    this.sparks.embers(ex, this.arena.height(ex, ez) + 0.004, ez, 6, 0.4, 0.04, 1);
    this.stamp.show('GROOVE CUT!', 'FIRST TOP ACROSS RIDES IT', 'mine', 0.55);
    playThock(ex, ez);
    if (import.meta.env.DEV) console.log(`[GROOVE] ${side} ${sx.toFixed(3)},${sz.toFixed(3)} -> ${ex.toFixed(3)},${ez.toFixed(3)}`);
    return shape;
  }

  /**
   * Predicts whether the rival's present line is carrying it toward a dangerous part of the real
   * table. On success deskAvoidX/Z point back toward safe wood for the visible defensive ramp.
   */
  private rivalNeedsDeskGuard(): boolean {
    const poly = ROOM.poly;
    const top = this.theirs;
    if (!poly || poly.length < 3 || !top.alive || normRadius(this.arena.layout, top.x, top.z) < 0.68) return false;
    const speed = Math.hypot(top.vx, top.vz);
    if (speed < 0.025) return false;
    let cx = 0;
    let cz = 0;
    for (const p of poly) {
      cx += p.x / poly.length;
      cz += p.z / poly.length;
    }
    const safeX = cx - top.x;
    const safeZ = cz - top.z;
    const safeD = Math.hypot(safeX, safeZ) || 1;
    // Only react when it is moving away from the table's safe middle. Looking half a second ahead
    // makes the response early enough to read and late enough to be a real tactical tell.
    if ((top.vx * safeX + top.vz * safeZ) / (speed * safeD) > -0.12) return false;
    const px = top.x + top.vx * 0.5;
    const pz = top.z + top.vz * 0.5;
    // Heading for a drop side (the low rim facing the real edge) is reason enough on its own.
    const r = Math.hypot(top.x, top.z) || 1;
    const towardDrop = this.arena.dropAt(Math.atan2(pz, px)) && (top.vx * top.x + top.vz * top.z) / r > 0.05;
    if (!towardDrop && insidePoly(poly, px, pz) && edgeDistance(poly, px, pz) > 0.055) return false;
    this.deskAvoidX = safeX / safeD;
    this.deskAvoidZ = safeZ / safeD;
    return true;
  }

  /** Rivals from level 6 shape the floor too; each move family uses its normal tactic, not one AI. */
  private rivalShaping() {
    if (this.demo || this.online?.peer || !this.theirs.alive || !(this.bout ? this.bout.shapes : this.rival.level >= 6)) return;
    this.rivalCharges.update(STEP);
    if (this.elapsed - this.rivalShapeAt >= this.shapeGap() && this.rivalNeedsDeskGuard()) {
      const f = this.rivalCharges.spend(this.elapsed, TUNING.grace);
      if (f) {
        const offset = 0.012 * (this.arena.radius / 0.17);
        const x = this.theirs.x - this.deskAvoidX * offset;
        const z = this.theirs.z - this.deskAvoidZ * offset;
        this.rivalShapeKind = 'DESK GUARD';
        this.arena.addShape('ramp', x, z, SHAPE_SIZE.ramp * f * 0.85, 'rival', this.deskAvoidX, this.deskAvoidZ, RIVAL_RAMP_SIGMA);
        this.rivalHandMove(x, z, this.deskAvoidX, this.deskAvoidZ);
        this.rivalShapeAt = this.elapsed;
        this.stamp.show('RIVAL: DESK GUARD', 'AI READS THE REAL EDGE', 'rival', 0.45, 0.85);
        playThock();
        if (import.meta.env.DEV) console.log(`[SHAPE] rival desk guard away from table edge at ${this.theirs.x.toFixed(3)},${this.theirs.z.toFixed(3)} t ${this.elapsed.toFixed(1)}`);
        return;
      }
    }
    const me = this.mine;
    const r = Math.hypot(me.x, me.z);
    const nr = normRadius(this.arena.layout, me.x, me.z);
    const activeBand = this.rival.move === 'quake' ? 0.32 : this.rival.move === 'pull' ? 0.45 : 0.6;
    if (!me.alive || nr < activeBand || r < 1e-3 || this.elapsed - this.rivalShapeAt < this.shapeGap()) return;
    const f = this.rivalCharges.spend(this.elapsed, TUNING.grace);
    if (!f) return;
    let dx = me.x / r;
    let dz = me.z / r;
    this.rivalShapeKind = this.rival.move === 'charge' ? 'RIM RAMP' : this.rival.move === 'quake' ? 'CENTER GUARD' : 'PIT FEED';
    if (this.rival.move === 'pull' && this.arena.layout.pockets.length) {
      // Feed the player's path toward the nearest slag pit, matching the pull rival's threat.
      let best = Infinity;
      for (const pocket of this.arena.layout.pockets) {
        const pr = rimRadius(this.arena.layout, pocket.angle);
        const px = Math.cos(pocket.angle) * pr;
        const pz = Math.sin(pocket.angle) * pr;
        const gap = (px - me.x) ** 2 + (pz - me.z) ** 2;
        if (gap >= best) continue;
        best = gap;
        const d = Math.sqrt(gap) || 1;
        dx = (px - me.x) / d;
        dz = (pz - me.z) / d;
      }
    }
    const offset = 0.012 * (this.arena.radius / 0.17);
    const x = me.x - dx * offset;
    const z = me.z - dz * offset;
    this.arena.addShape('ramp', x, z, SHAPE_SIZE.ramp * f * 0.85, 'rival', dx, dz, RIVAL_RAMP_SIGMA);
    this.rivalHandMove(x, z, dx, dz);
    this.rivalShapeAt = this.elapsed;
    playThock();
    if (import.meta.env.DEV) console.log(`[SHAPE] rival ${this.rivalShapeKind.toLowerCase()} at ${me.x.toFixed(3)},${me.z.toFixed(3)} t ${this.elapsed.toFixed(1)}`);
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
        m.kind = s.kind;
        m.x = s.x;
        m.z = s.z;
        m.dx = s.dx;
        m.dz = s.dz;
        m.strength = Arena.strength(s);
        m.ghost = false;
        m.sigma = s.sigma;
        m.length = s.length;
        (s.owner.startsWith('rival') || s.owner.startsWith('bot') ? theirs : mine).push(m);
      }
      for (const side of ['left', 'right'] as const) {
        const d = this.shaping[side];
        if (d && !d.shape) mine.push(Object.assign(this.specAt(n++), { kind: 'ramp', x: d.x, z: d.z, dx: d.dx, dz: d.dz, strength: 1, ghost: true, sigma: undefined, length: undefined }));
        const g = this.grooving[side];
        if (g?.active) {
          const dx = g.x - g.sx;
          const dz = g.z - g.sz;
          const length = Math.hypot(dx, dz);
          const m = this.specAt(n++);
          m.kind = 'groove';
          m.x = (g.sx + g.x) * 0.5;
          m.z = (g.sz + g.z) * 0.5;
          m.dx = length > 1e-6 ? dx / length : 0;
          m.dz = length > 1e-6 ? dz / length : 1;
          m.strength = 1;
          m.ghost = true;
          m.sigma = undefined;
          m.length = length;
          mine.push(m);
        }
      }
      if (this.devRampSince >= 0 && this.gazeHit.ok) {
        const r = Math.hypot(this.gazeHit.x, this.gazeHit.z) || 1;
        mine.push(Object.assign(this.specAt(n++), { kind: 'ramp', x: this.gazeHit.x, z: this.gazeHit.z, dx: this.gazeHit.x / r, dz: this.gazeHit.z / r, strength: this.devRampAmp() / SHAPE_SIZE.ramp, ghost: true, sigma: undefined, length: undefined }));
      }
    }
    this.rivalMarks.show(theirs, this.heightAt, this.time);
    this.marks.show(mine, this.heightAt, this.time);
    this.pips.root.visible = this.phase === 'fight' || this.phase === 'ready' || this.phase === 'pulling';
    this.pips.set(this.charges.charges, this.charges.refilling);
    for (const s of this.arena.shapes) {
      if (Arena.strength(s) < 0.3) continue;
      for (const t of this.tops) {
        const rx = t.x - s.x;
        const rz = t.z - s.z;
        const grooveAlong = rx * s.dx + rz * s.dz;
        const grooveAcross = Math.abs(rx * -s.dz + rz * s.dx);
        const touching = s.kind === 'groove'
          ? Math.abs(grooveAlong) <= (s.length ?? 0) * 0.5 + 0.012 && grooveAcross <= (s.sigma ?? 0.018)
          : Math.hypot(rx, rz) <= (s.kind === 'ramp' ? 0.036 : 0.026);
        if (!t.alive || !touching) continue;
        let hit = this.crunched.get(s);
        if (!hit) this.crunched.set(s, (hit = new Set()));
        if (hit.has(t)) continue;
        hit.add(t);
        playShapeHit(s.kind, t.x, t.z);
        const authored = s.owner === 'left' || s.owner === 'right' || s.owner === 'left-cup' || s.owner === 'right-cup' || s.owner === 'left-groove' || s.owner === 'right-groove';
        this.impacts.hit(t.x, this.arena.height(t.x, t.z), t.z, authored ? 0.8 : 0.45);
        this.sparks.burst(t.x, this.arena.height(t.x, t.z), t.z, authored ? 0.7 : 0.35);
        if (authored && t === this.theirs && !this.rewardedShapes.has(s)) {
          this.rewardedShapes.add(s);
          this.lastShape = { t: this.elapsed, kind: s.kind };
          this.showCauseCue(2, s.kind === 'well' ? 'CUP' : s.kind.toUpperCase(), s.x, s.z, t.x, t.z);
          const heroRamp = !this.firstHeroRamp && this.progress.matches === 0 && this.tutorialRound === 1 && s.kind === 'ramp';
          if (heroRamp) {
            // The first taught ramp must visibly change the fight. It strengthens the authored
            // outward direction once, without manufacturing a knockout or changing later balance.
            this.firstHeroRamp = true;
            const r = Math.hypot(t.x, t.z) || 1;
            const ox = t.x / r;
            const oz = t.z / r;
            t.vx += ox * 0.16;
            t.vz += oz * 0.16;
            t.kick = Math.max(t.kick, 0.75);
            t.kickX = ox;
            t.kickZ = oz;
            this.impacts.shock(t.x, this.arena.height(t.x, t.z), t.z, 0.9, 0xffc466);
            this.sparks.burst(t.x, this.arena.height(t.x, t.z), t.z, 1);
          }
          this.hitStop = Math.max(this.hitStop, heroRamp ? 0.12 : 0.08);
          this.accumulator = 0;
          const charge = this.charges.reward();
          this.forgeBar.value = Math.min(1, this.forgeBar.value + 0.12);
          if (heroRamp || !this.quietFirst) this.stamp.show(
            heroRamp ? 'YOU CHANGED THE FIGHT' : `${s.kind === 'well' ? 'CUP' : s.kind === 'groove' ? 'GROOVE' : 'RAMP'} → ${s.kind === 'groove' ? 'DASH' : 'IMPACT'}`,
            heroRamp ? 'RAMP → IMPACT' : `${charge ? '+CHARGE · ' : ''}+ULTIMATE HEAT`,
            'mine',
            heroRamp ? 0.7 : 0.5,
            heroRamp ? 1.15 : 1.05,
          );
        }
      }
    }
  }

  /** Dev: the height of the ramp B is growing at the gaze. */
  private devRampAmp() {
    return Math.min(SHAPE_SIZE.ramp, SHAPE_SIZE.rampMin + (this.time - this.devRampSince) * RAY_BUMP_RATE);
  }

  private openingClash(clash: Clash, mineVx: number, mineVz: number, rivalVx: number, rivalVz: number, dx: number, dz: number) {
    if (!this.firstClashPending || clash.strength < 0.15) return;
    this.firstClashPending = false;
    const d = Math.hypot(dx, dz) || 1;
    const nx = dx / d;
    const nz = dz / d;
    const mineToward = mineVx * nx + mineVz * nz;
    const rivalToward = -(rivalVx * nx + rivalVz * nz);
    let word = 'GLANCING';
    let sub = 'NO EDGE';
    if (this.launchZoneKind === 'ambush') {
      word = 'AMBUSH';
      const countered = rivalToward > mineToward;
      sub = countered ? 'COUNTER-HIT' : 'FIRST HIT';
      const target = countered ? this.mine : this.theirs;
      const sign = countered ? -1 : 1;
      target.vx += nx * sign * 0.12 * clash.strength;
      target.vz += nz * sign * 0.12 * clash.strength;
      target.damage += 0.05 * clash.strength;
    } else if (mineToward > 0.08 && rivalToward > 0.08) {
      word = 'HEAD-ON';
      sub = 'POWER TEST';
    } else if (mineToward > rivalToward + 0.025) {
      word = 'SIDE HIT';
      sub = 'ANGLE WON';
    } else if (rivalToward > mineToward + 0.025) {
      word = 'SIDE HIT';
      sub = 'ANGLE LOST';
    }
    const outcome = `${word} · ${sub}`;
    this.finishOpening(outcome);
    if (this.quietFirst) return;
    this.stamp.show(word, sub, sub === 'COUNTER-HIT' || sub === 'ANGLE LOST' ? 'rival' : 'mine', 0.65);
    playStamp();
    if (import.meta.env.DEV) console.log(`[OPENING] ${word} ${sub} strength ${clash.strength.toFixed(2)}`);
  }

  /** Commits the visible opening verdict to both the next-round echo and this rival's memory. */
  private finishOpening(outcome: string) {
    this.openingOutcome = outcome;
    if (this.lastOpeningTrace) this.lastOpeningTrace.outcome = outcome;
    if (!this.demo && this.progress.guide === 'done' && this.rival.name !== 'Challenger' && this.lastOpeningTrace?.zone !== 'neutral') {
      this.progress.finishOpening(this.rival.name, outcome);
    }
  }

  /** Arms the one-per-round rescue only when the real table outline is known. */
  private beginOuterRing(): boolean {
    // Plane discovery may finish after the arena's initial placement, or a dev/HMR session may
    // restore a ready match without replaying placement. Refresh once at the moment the boundary
    // becomes gameplay-critical; production still refuses the rescue when no table is known.
    if (!ROOM.poly) this.setRoom();
    if (this.outerRingUsed || this.demo || !ROOM.poly || this.mine.finish !== 'over') return false;
    this.cancelActiveGestures();
    this.outerRingUsed = true;
    this.outerRingState = 'rescue';
    this.outerRingLeft = OUTER_RING_TIME;
    this.outerRingSpin = this.mine.spin;
    this.outerRailSide = null;
    this.outerRailCount = 0;
    this.outerRailLength = 0;
    this.outerRailGeometry.setDrawRange(0, 0);
    this.outerRail.visible = true;
    this.outerRailHead.visible = false;
    (this.outerRailMesh.material as MeshBasicMaterial).opacity = 0.86;
    this.stamp.show('PALM CATCH!', 'YOUR TABLE IS THE ARENA', 'mine', 0.9, 1.2);
    this.label.set(LESSON.palmCatch);
    this.labelTimer = OUTER_RING_TIME;
    this.accumulator = 0;
    if (import.meta.env.DEV) console.log('[OUTER] rescue armed');
    return true;
  }

  /** Writes one thick, molten ribbon segment without allocating in the frame loop. */
  private appendOuterRail(x: number, z: number) {
    if (this.outerRailCount >= OUTER_RAIL_POINTS) return;
    const count = this.outerRailCount;
    if (count > 0) {
      const px = this.outerRailPath[(count - 1) * 2];
      const pz = this.outerRailPath[(count - 1) * 2 + 1];
      const dx = x - px;
      const dz = z - pz;
      const len = Math.hypot(dx, dz);
      if (len < OUTER_RAIL_STEP) return;
      this.outerRailLength += len;
      const nx = (-dz / len) * OUTER_RAIL_WIDTH;
      const nz = (dx / len) * OUTER_RAIL_WIDTH;
      const y = -PEDESTAL / ARENA_SCALE + 0.0025;
      const o = (count - 1) * 18;
      const p = this.outerRailPositions;
      // Two triangles, slightly above the physical table. The depth layer still lets real hands
      // and the table edge cover it, so the rail reads as forged onto the room rather than UI.
      p.set([
        px - nx, y, pz - nz, px + nx, y, pz + nz, x + nx, y, z + nz,
        px - nx, y, pz - nz, x + nx, y, z + nz, x - nx, y, z - nz,
      ], o);
      this.outerRailGeometry.setDrawRange(0, count * 6);
      (this.outerRailGeometry.getAttribute('position') as Float32BufferAttribute).needsUpdate = true;
    }
    this.outerRailPath[count * 2] = x;
    this.outerRailPath[count * 2 + 1] = z;
    this.outerRailCount++;
    this.outerRailHead.position.set(x, -PEDESTAL / ARENA_SCALE + 0.0032, z);
    this.outerRailHead.visible = true;
  }

  /** Returns the caught top through the rail with less spin and more damage than before. */
  private completeOuterRing() {
    const a = Math.atan2(this.outerRingGoal.z, this.outerRingGoal.x);
    const r = rimRadius(this.arena.layout, a) * 0.78;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const speed = 0.3;
    const me = this.mine;
    me.x = c * r;
    me.z = s * r;
    me.vx = -c * speed - s * me.hand * 0.08;
    me.vz = -s * speed + c * me.hand * 0.08;
    me.spin = Math.max(0.24, Math.min(0.58, this.outerRingSpin * 0.62));
    me.damage = Math.min(0.94, me.damage + 0.12);
    me.wobble = Math.max(me.wobble, 0.2);
    me.lifted = 0;
    me.finish = null;
    me.state = 'spinning';
    // The same open hand is still crossing the bowl when the rescue completes. Reserve its lift as
    // the tail of Palm Return; otherwise the index fingertip can immediately start a Cup and flash
    // a contradictory "NO CATCH" message after a visibly successful return.
    if (this.outerRailSide) this.blockShapingRelease(this.outerRailSide);
    this.outerRingState = 'returned';
    this.outerRingCompleted = true;
    this.recordIntervention();
    this.outerRingLeft = 1.2;
    this.outerRailSide = null;
    this.outerRailHead.visible = false;
    this.lastShape = { t: this.elapsed, kind: 'parry' };
    this.sparks.burst(me.x, this.arena.height(me.x, me.z), me.z, 1);
    this.impacts.shock(me.x, this.arena.height(me.x, me.z), me.z, 0.9, 0xff7a20);
    this.stamp.show('PALM RETURN!', 'CAUGHT ON YOUR REAL TABLE', 'mine', 0.9, 1.2);
    this.label.set('');
    this.labelTimer = 0;
    playDash(me.x);
    if (import.meta.env.DEV) console.log('[OUTER] forged return');
  }

  /** Handles the rescue gesture. True means the normal arena simulation stays paused this frame. */
  private updateOuterRing(dt: number): boolean {
    if (this.outerRingState === 'returned') {
      this.outerRingLeft -= dt;
      (this.outerRailMesh.material as MeshBasicMaterial).opacity = 0.86 * Math.max(0, this.outerRingLeft / 1.2);
      if (this.outerRingLeft <= 0) {
        this.outerRingState = 'idle';
        this.outerRail.visible = false;
      }
      return false;
    }
    if (this.outerRingState !== 'rescue' && this.outerRingState !== 'palm') return false;
    this.outerRingLeft -= dt;
    this.myView.brakeForRescue(dt);
    const at = this.myView.rescueAt;
    // Before the catch, the real desk edge still decides the KO. Once the top is on a palm, that
    // palm is its physical surface; the old ballistic view may continue past the desk edge for one
    // frame, but it must no longer invalidate a successful catch.
    const waitingForPalm = this.outerRingState === 'rescue';
    if (this.outerRingLeft <= 0 || (waitingForPalm && (this.myView.offDesk || (!at && this.myView.restingAt !== null)))) {
      this.outerRingState = 'failed';
      this.outerRail.visible = false;
      this.label.set(LESSON.edgeKo);
      if (import.meta.env.DEV) console.log(`[OUTER] rescue failed: ${this.outerRingState} left ${this.outerRingLeft.toFixed(2)} offDesk ${this.myView.offDesk} resting ${this.myView.restingAt !== null} at ${!!at} rail ${this.outerRailLength.toFixed(3)}`);
      this.finish(-1);
      return true;
    }
    if (waitingForPalm) {
      // The top is still flying toward the table: keep the rescue clock visible, but wait for contact.
      if (!at) return true;
      this.stage.localToWorld(this.handAt.copy(at));
      this.root.worldToLocal(this.outerRingAt.copy(this.handAt));
      const angle = Math.atan2(this.outerRingAt.z, this.outerRingAt.x);
      const rim = rimRadius(this.arena.layout, angle) * 0.9;
      this.outerRingGoal.set(Math.cos(angle) * rim, -PEDESTAL / ARENA_SCALE + 0.003, Math.sin(angle) * rim);
      for (const side of ['left', 'right'] as const) {
        const h = this.hands[side];
        if (!h.tracked || h.pinching || Math.abs(h.wrist.y - h.index.y) > 0.08) continue;
        const palm = this.p.copy(h.wrist).lerp(h.index, 0.48);
        const catchDistance = palm.distanceTo(this.handAt);
        if (catchDistance > (import.meta.env.DEV ? PALM_CATCH_RADIUS * 1.8 : PALM_CATCH_RADIUS)) {
          if (import.meta.env.DEV) console.log(`[OUTER] ${side} catch missed by ${catchDistance.toFixed(3)} m`);
          continue;
        }
        this.outerRailSide = side;
        this.outerRingState = 'palm';
        this.outerRailCount = 0;
        this.outerRailLength = 0;
        this.outerRailGeometry.setDrawRange(0, 0);
        this.appendOuterRail(this.outerRingAt.x, this.outerRingAt.z);
        playTick();
        this.label.set(LESSON.palmCaught);
        if (import.meta.env.DEV) console.log(`[OUTER] ${side} open palm caught the top`);
        break;
      }
      return true;
    }
    // From here on the open palm, rather than the old off-arena flight, owns the top.
    if (this.outerRailSide === null) return true;
    const h = this.hands[this.outerRailSide];
    if (!h.tracked && (this.outerRailLost += dt) < HAND_LOSS_GRACE) return true;
    if (h.tracked) this.outerRailLost = 0;
    if (!h.tracked || h.pinching) {
      this.outerRailLost = 0;
      this.outerRailSide = null;
      this.outerRingState = 'rescue';
      this.outerRailCount = 0;
      this.outerRailLength = 0;
      this.outerRailHead.visible = false;
      this.outerRailGeometry.setDrawRange(0, 0);
      playLocked();
      this.label.set(LESSON.palmDropped);
      this.labelTimer = Math.max(1.6, this.outerRingLeft);
      return true;
    }
    const palmWorld = this.p.copy(h.wrist).lerp(h.index, 0.48);
    this.stage.worldToLocal(this.handAt.copy(palmWorld));
    this.myView.carryRescue(this.handAt);
    this.stage.localToWorld(this.handAt);
    const l = this.root.worldToLocal(this.local.copy(this.handAt));
    this.outerRingAt.copy(l);
    if (ROOM.poly && insidePoly(ROOM.poly, l.x, l.z)) this.appendOuterRail(l.x, l.z);
    if (this.outerRailLength > 0.055 && normRadius(this.arena.layout, l.x, l.z) <= 0.94) this.completeOuterRing();
    return true;
  }

  /**
   * A normal arena ring-out is provisional when a real table outline is known. The rendered top
   * gets one readable flight across the desk; the real edge, not a late text replacement, decides
   * whether the room-aware bonus was earned.
   */
  private beginDeskVerdict(): boolean {
    if (this.demo || !ROOM.poly || this.theirs.finish !== 'over') return false;
    const cause = this.recentPlayerCause();
    this.deskVerdict = { v: 1, left: DESK_VERDICT_TIME };
    this.deskKoTrailT = 0;
    this.setDeskKoStage(1);
    this.accumulator = 0;
    const y = this.arena.height(this.theirs.x, this.theirs.z);
    this.arenaView.flashRail(this.theirs.x, this.theirs.z);
    this.impacts.hit(this.theirs.x, y, this.theirs.z, 1);
    this.impacts.shock(this.theirs.x, y, this.theirs.z, 1, 0xff8a2a);
    this.sparks.burst(this.theirs.x, y, this.theirs.z, 1);
    this.theirView.flash();
    this.theirView.shake(1);
    this.theirView.hit(1, this.theirs.vx, this.theirs.vz, 0.09);
    this.koFreeze = Math.max(this.koFreeze, 0.09);
    this.roomLight.hit();
    if (cause && this.causeCue.stage) this.showCauseCue(3, cause, this.causeCue.sx, this.causeCue.sz, this.theirs.x, this.theirs.z);
    if (!this.quietFirst) this.stamp.show('EDGE RUN!', cause ? `YOUR ${cause} → REAL TABLE` : 'REAL TABLE DECIDES', 'mine', 0.65, 1.25);
    // The EDGE RUN stamp names the cause; the card says what crossing the edge is worth.
    this.label.set(this.quietFirst ? '' : LESSON.edgeRun);
    this.labelTimer = DESK_VERDICT_TIME;
    if (import.meta.env.DEV) console.log('[DESK_KO] table flight started; score is pending');
    return true;
  }

  /** True while a provisional rival ring-out owns the fight loop. */
  private updateDeskVerdict(dt: number): boolean {
    const pending = this.deskVerdict;
    if (!pending) return false;
    if (pending.edge) {
      pending.left -= dt;
      if (pending.left <= 0) {
        this.deskVerdict = null;
        this.finish(pending.v, true);
      }
      return true;
    }
    pending.left -= dt;
    if (this.deskKoStage === 1) this.setDeskKoStage(2);
    if ((this.deskKoTrailT -= dt) <= 0) {
      this.deskKoTrailT = 0.045;
      const p = this.theirView.root.position;
      this.sparks.flight(p.x, p.y, p.z);
    }
    if (this.theirView.offDesk) {
      pending.edge = true;
      // The staged first DESK KO holds its slow motion longer, and the verdict waits it out.
      const staged = this.deskWrench.fired;
      pending.left = staged ? 1.4 : 0.6;
      this.offDeskShown = true;
      this.setDeskKoStage(3);
      const p = this.theirView.root.position;
      const angle = Math.atan2(p.z, p.x);
      const edge = this.deskEdgePoint(angle, 0.006);
      this.progress.recordDeskKo(this.rival.name, this.rival.build, angle);
      this.roomImprints.record('desk', angle, new Date(), edge ? { x: edge.x, z: edge.y } : undefined);
      this.deskMemoryKey = '';
      this.rebuildDeskMemory();
      this.sparks.burst(p.x, p.y, p.z, 1);
      this.sparks.embers(p.x, p.y, p.z, 14, 0.26, 0.2, 1);
      this.impacts.hit(p.x, p.y, p.z, 1);
      this.impacts.shock(p.x, p.y, p.z, 1, 0xff8a2a);
      this.slowMo = Math.max(this.slowMo, staged ? 1.1 : 0.6);
      const cause = this.recentPlayerCause();
      this.stamp.show(staged ? 'DESK KO!' : 'OFF THE DESK!', cause ? `YOUR ${cause} → REAL EDGE +1` : 'REAL EDGE · +1', 'mine', staged ? 1.2 : 0.55, 1.25);
      this.featDone('offDesk');
      if (import.meta.env.DEV) console.log(`[DESK_KO] real edge crossed; +${DESK_KO_BONUS} bonus heat`);
      return true;
    }
    // Once it has stopped on the wood, or the bounded visual wait expires, the original arena
    // knockout stands. A missing/slow frame can never invent the bonus.
    if (this.theirView.restingAt || pending.left <= 0) {
      this.deskVerdict = null;
      if (import.meta.env.DEV) console.log(`[DESK_KO] ${this.theirView.restingAt ? 'top stayed on table' : 'visual timeout'}; normal heat`);
      this.finish(pending.v);
    }
    return true;
  }

  private updateFight(dt: number) {
    if (this.online?.role === 'guest' && this.online.peer) {
      this.guestFight(dt);
      return;
    }
    // The guest's cup lets go like yours: after the hold (restarting when it catches a top).
    const nc = this.netCup;
    // The hold clock restarts at the catch, as yours does.
    if (nc && nc.shape.caught && !nc.caught) {
      nc.caught = true;
      nc.at = this.elapsed;
    }
    if (nc && (!this.arena.shapes.includes(nc.shape) || this.elapsed - nc.at > TUNE.cupHold)) {
      if (this.arena.shapes.includes(nc.shape)) this.arena.free(nc.shape);
      this.netCup = null;
    }
    if (this.online?.role === 'host') this.online.snapshot(performance.now(), [this.mine, this.theirs], [this.arena.tiltX, this.arena.tiltZ], this.arena.shapes);
    if (this.updateDeskVerdict(dt)) return;
    if (this.updateOuterRing(dt)) return;
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
      if (!this.pressureShown && this.elapsed >= SUDDEN_DEATH_AT) {
        this.pressureShown = true;
        if (!this.quietFirst) {
          this.call('PRESSURE!\nPOCKETS OPEN · OUTER RIM HEATS', CALL.ambient, 1.8);
          this.stamp.show('PRESSURE!', 'POCKETS ARE OPENING', 'neutral', 0.75, 1.1);
          playTell();
        }
      }
      this.steerToDeskEdge();
      const mineVx = this.mine.vx;
      const mineVz = this.mine.vz;
      const rivalVx = this.theirs.vx;
      const rivalVz = this.theirs.vz;
      // Reading the player is an advanced rival skill: it arrives with rival tells, not in the lessons.
      const rivalReadsThreat = this.taught('tells') && this.rivalLaunchPower >= 0.7 && (this.forgeBar.full || this.arenaMorphing || !!this.rimPulls.left || !!this.rimPulls.right);
      if (rivalReadsThreat && this.theirs.alive) {
        this.theirs.rushing = Math.max(this.theirs.rushing, 0.14);
        if (!this.rivalBraceShown) {
          this.rivalBraceShown = true;
          this.stamp.show('RIVAL READ', 'BRACING FOR YOUR FORGE', 'rival', 0.5);
        }
      }
      const openingDx = this.theirs.x - this.mine.x;
      const openingDz = this.theirs.z - this.mine.z;
      if (this.elapsed < this.crossguardLiveUntil) {
        // A paid rail stays live a moment: every save of your top refunds its charge, and the
        // rival's first escape across it is sent on toward a pocket.
        for (const top of this.tops) {
          if (!crossguardCrosses(top, this.crossguardA.x, this.crossguardA.z, this.crossguardB.x, this.crossguardB.z)) continue;
          if (top === this.mine) {
            if (crossguard(top, this.crossguardA.x, this.crossguardA.z, this.crossguardB.x, this.crossguardB.z)) this.charges.reward();
          } else if (top === this.theirs && !this.crossguardSlung && movingOut(top)) {
            this.crossguardSlung = true;
            crossguardSling(this.arena, top);
            this.impacts.dash(top.x, this.arena.height(top.x, top.z), top.z, top.vx, top.vz);
          }
        }
      } else if (this.crossguardActive && !this.crossguardConsumed) {
        for (const top of this.tops) {
          if (!crossguardCrosses(top, this.crossguardA.x, this.crossguardA.z, this.crossguardB.x, this.crossguardB.z)) continue;
          // Only your top's save or the rival's escape counts; a rival heading inward passes.
          const rivalEscape = top === this.theirs && movingOut(top);
          if (top !== this.mine && !rivalEscape) continue;
          const force = this.charges.spend(this.elapsed, TUNING.grace);
          this.crossguardConsumed = true;
          this.crossguardActive = false;
          this.crossguardBreak = 0.28;
          if (!force) {
            this.locked('CROSSGUARD BROKE\nWAIT FOR ONE SHAPING CHARGE');
            break;
          }
          this.crossguardLiveUntil = this.elapsed + CROSSGUARD_LIVE;
          this.crossguardSlung = rivalEscape;
          if (rivalEscape) crossguardSling(this.arena, top);
          else if (crossguard(top, this.crossguardA.x, this.crossguardA.z, this.crossguardB.x, this.crossguardB.z, force)) this.charges.reward();
          this.crossguardHits++;
          this.rootEntity?.setValue(FirstFiveState, 'crossguardActive', false);
          this.rootEntity?.setValue(FirstFiveState, 'crossguardHits', this.crossguardHits);
          this.lastShape = { t: this.elapsed, kind: 'parry' };
          this.recordIntervention();
          const y = this.arena.height(top.x, top.z);
          this.impacts.shock(top.x, y, top.z, 0.95, 0xffa12d);
          this.sparks.burst(top.x, y, top.z, 1);
          this.stamp.show('CROSSGUARD!', rivalEscape ? 'THEIR ESCAPE → YOUR POCKET' : 'SAVED · CHARGE BACK', 'mine', 0.72, 1.05);
          this.label.set('RAIL SPENT — OPEN BOTH HANDS TO REARM');
          this.labelTimer = 1.25;
          this.roomLight.hit();
          playThock();
          break;
        }
      }
      let clash: Clash | null;
      if (this.extras.length) {
        // A brawl: every pair can meet. The duel's own effects follow you and the rival; other meetings spark on their own.
        const clashes = stepN(this.arena, this.tops);
        for (const meeting of clashes) {
          if (meeting.a === undefined || meeting.b === undefined) continue;
          this.brawlLastHit[meeting.a] = meeting.b;
          this.brawlLastHit[meeting.b] = meeting.a;
        }
        clash = clashes.find((c) => c.a === 0 && c.b === 1) ?? null;
        for (const c of clashes) if (c !== clash) this.brawlClash(c);
        this.tops.forEach((t, i) => {
          if (i === 0 || t.alive || this.brawlOut.has(t)) return;
          // A bot going out is its own beat: you need to know who is left.
          this.brawlOut.add(t);
          const left = this.tops.filter((x) => x.alive).length;
          this.stamp.show(`${(i === 1 ? this.rival.name : this.brawlNames[i - 2]).toUpperCase()} OUT`, `${left} TOP${left === 1 ? '' : 'S'} LEFT`, 'neutral', 0.6);
          this.sparks.burst(t.x, this.arena.height(t.x, t.z), t.z, 0.7);
          playStamp();
        });
      } else clash = step(this.arena, this.mine, this.theirs);
      if (this.emberState === 3 && this.elapsed > this.emberPostUntil) {
        // The post cools after EMBER_POST_TIME.
        this.setEmberState(0);
        this.emberBumperFx.visible = false;
      } else if (this.emberState === 3) {
        for (const top of this.tops) {
          const rivalTop = top === this.theirs;
          if (!emberBumper(top, this.emberBumperAt.x, this.emberBumperAt.z, 0.014, rivalTop ? EMBER_RIVAL_KICK : 0)) continue;
          const y = this.arena.height(top.x, top.z);
          this.impacts.hit(top.x, y, top.z, 0.9);
          this.impacts.shock(top.x, y, top.z, 0.78, 0xff7a1a);
          this.sparks.embers(top.x, y, top.z, 12, 0.16, 0.12, 1);
          if (rivalTop) this.stamp.show('RIVET KICK!', 'YOUR PLANTED METAL FIRED', 'mine', 0.62, 0.9);
          this.roomLight.hit();
          playThock();
        }
      }
      this.record(clash);
      if (clash) this.openingClash(clash, mineVx, mineVz, rivalVx, rivalVz, openingDx, openingDz);
      else if (this.firstClashPending && this.elapsed >= 1.4) {
        this.firstClashPending = false;
        this.finishOpening('NO CONTACT · LINES MISSED');
        if (!this.quietFirst) {
          this.stamp.show('NO CONTACT', 'LINES MISSED', 'neutral', 0.65);
          playStamp();
        }
        if (import.meta.env.DEV) console.log('[OPENING] NO CONTACT');
      }
      // A charge rebounding off your Ward: said once per Ward, and it counts as stopping the move.
      if (this.mine.guard <= 0) this.parried = false;
      if (clash?.parry && !this.parried) {
        this.parried = true;
        this.stamp.show('PARRIED!', 'it bounced off your Ward', 'mine', 0.6);
        this.impacts.hit(clash.x, this.arena.height(clash.x, clash.z), clash.z, 1);
        // The Ward's own look: a pale shockwave, sparks, your top barely moved, theirs thrown back.
        this.impacts.shock(clash.x, this.arena.height(clash.x, clash.z), clash.z, 0.9, SEAL_COLOR.ward);
        this.sparks.burst(clash.x, this.arena.height(clash.x, clash.z), clash.z, 0.7);
        this.myView.hit(0.3, clash.x - this.mine.x, clash.z - this.mine.z);
        this.theirView.hit(1, clash.x - this.theirs.x, clash.z - this.theirs.z);
        playClash(1, clash.x);
        this.featDone('interrupt');
        if (import.meta.env.DEV) console.log('[STRIKE] ward parried a charge');
      }
      if (clash?.hammer) {
        this.stamp.show('CRACKED!', '', this.mine.hammer === 0 ? 'mine' : 'rival', 0.5);
        // The Hammer lands: a heavy ring and a shower of sparks where the rims met.
        this.sparks.burst(clash.x, this.arena.height(clash.x, clash.z), clash.z, 1);
        this.impacts.hit(clash.x, this.arena.height(clash.x, clash.z), clash.z, 1);
        this.impacts.shock(clash.x, this.arena.height(clash.x, clash.z), clash.z, 1, SEAL_COLOR.hammer);
        this.myView.hit(1, clash.x - this.mine.x, clash.z - this.mine.z);
        this.theirView.hit(1, clash.x - this.theirs.x, clash.z - this.theirs.z);
        playBurst(clash.x);
        if (import.meta.env.DEV) console.log(`[STRIKE] hammer landed: rival damage ${this.theirs.damage.toFixed(2)}`);
      }
      // Behind counts once the opening grace is over (a weaker launch is not a comeback).
      const behind = this.elapsed >= TUNING.grace && behindOn(this.mine, this.theirs);
      this.forgeBar.update(STEP, behind);
      if (clash) this.forgeBar.clash(clash.strength, this.elapsed, behind);
      this.rivalTell(clash ? clash.strength : 0);
      this.playEcho();
      for (const t of [this.mine, this.theirs]) {
        if (t.sincePad !== 0) continue;
        // A boost pad fired: it flashes, sparks fly along it, a whoosh.
        this.arenaView.flashPad(t.x, t.z);
        this.sparks.burst(t.x, this.arena.height(t.x, t.z), t.z, 0.5);
        playDash(t.x);
      }
      this.charges.update(STEP);
      this.rivalShaping();
      this.botShaping();
      if (clash) {
        this.clashes++;
        const owner = clash.shapeOwner ?? '';
        if (owner === 'left' || owner === 'right' || owner === 'left-cup' || owner === 'right-cup') this.charges.clash(clash.strength, this.elapsed);
        if (owner.startsWith('rival') || owner.startsWith('bot')) this.rivalCharges.clash(clash.strength, this.elapsed);
        const y = this.arena.height(clash.x, clash.z);
        this.sparks.burst(clash.x, y, clash.z, clash.strength);
        if (clash.strength > HARD_HIT && this.elapsed - this.lastHardHit > HIT_STOP_GAP) {
          this.lastHardHit = this.elapsed;
          this.spawnEmber(clash.x, clash.z);
          // A hard hit: more sparks, a ring of light, both tops flash, and a brief hit stop.
          this.sparks.burst(clash.x, y, clash.z, 1);
          this.impacts.hit(clash.x, y, clash.z, clash.strength);
          this.myView.flash();
          this.theirView.flash();
          // Harder hits freeze longer (70-110 ms) and shake both tops (never the view).
          this.hitStop = clash.strength > 0.85 ? 0.11 : 0.07;
          this.myView.shake(clash.strength);
          this.theirView.shake(clash.strength);
          // The tops take the hit: they swell, recoil and flare, holding the pose through the stop;
          // a shockwave rolls over the floor and leaves a scorch.
          this.myView.hit(clash.strength, clash.x - this.mine.x, clash.z - this.mine.z, this.hitStop);
          this.theirView.hit(clash.strength, clash.x - this.theirs.x, clash.z - this.theirs.z, this.hitStop);
          this.impacts.shock(clash.x, y, clash.z, clash.strength);
          this.lastPop = this.elapsed;
          this.bar.hit(0);
          this.bar.hit(1);
          this.roomLight.hit();
          this.accumulator = 0;
          duck(0.5, 0.15);
        }
        else if (clash.strength > 0.3 && this.elapsed - this.lastPop > 0.15) {
          // A lighter hit: a smaller punch, no stop.
          this.lastPop = this.elapsed;
          this.myView.hit(clash.strength * 0.6, clash.x - this.mine.x, clash.z - this.mine.z);
          this.theirView.hit(clash.strength * 0.6, clash.x - this.theirs.x, clash.z - this.theirs.z);
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
      if (this.mine.state === 'out' && this.mine.finish === 'over' && this.beginOuterRing()) return;
      const v = this.extras.length ? this.brawlVerdict() : verdict(this.mine, this.theirs, this.elapsed);
      if (v !== 0) {
        for (const t of this.tops) if (t.finish === 'burst') this.sparks.burst(t.x, this.arena.height(t.x, t.z), t.z, 1);
        if (v === 1 && !this.extras.length && this.beginDeskVerdict()) return;
        this.finish(v);
        return;
      }
    }
  }

  private finish(v: -1 | 1 | 2, deskKo = false) {
    this.cancelActiveGestures();
    if (this.online?.role === 'host' && this.online.peer) {
      this.online.snapshot(performance.now(), [this.mine, this.theirs], [this.arena.tiltX, this.arena.tiltZ], this.arena.shapes, true);
      // The heat after this round, so the guest's score cannot drift (a DESK KO's extra point included).
      const heat: [number, number] = [this.myPoints, this.theirPoints];
      if (v !== 2) heat[v === 1 ? 0 : 1] += finishPoints(v === 1 ? this.theirs : this.mine, this.progress.matches === 0, deskKo && v === 1);
      this.online.result(v, heat);
    }
    this.phase = 'result';
    this.comeBackPending = false;
    this.deskKoScored = deskKo;
    if (deskKo) this.setDeskKoStage(3);
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
    const name = (t: Top) => deskKo && t === this.theirs ? 'DESK KO' : FINISH_WORD[t.finish ?? 'spin'];
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
      const loser = v === 1 ? this.brawlLoser ?? this.theirs : this.mine;
      // Tutorial finishes normally score one; the real desk edge remains an exceptional +1 rule.
      const points = finishPoints(loser, this.progress.matches === 0, deskKo && v === 1);
      this.lastRoundHeat = points;
      if (v === 1) this.myPoints += points;
      else this.theirPoints += points;
      // Match point down: a win from here is a comeback.
      if (this.theirPoints >= MATCH_HEAT - 1 && this.myPoints < this.theirPoints) this.wasDown = true;
      this.barPoints = [this.myPoints, this.theirPoints];
      const score = `Heat ${this.myPoints} - ${this.theirPoints}`;
      const decided = this.myPoints >= MATCH_HEAT || this.theirPoints >= MATCH_HEAT;
      if (!decided && loser.finish === 'spin') this.resultTimer = 1.15;
      this.earn(v === 1, loser, decided, decided && this.myPoints > this.theirPoints);
      if (deskKo) this.matchLog.rounds[this.matchLog.rounds.length - 1] = 'DESK KO';
      if (decided) {
        const youWon = this.myPoints > this.theirPoints;
        playMatch(youWon);
        this.matchLog.won = youWon;
        this.matchLog.score = `${this.myPoints} - ${this.theirPoints}`;
        this.comeBackPending = !this.online;
        if (youWon && this.theirPoints === 0) this.featDone('flawless');
        if (youWon && this.wasDown) this.featDone('comeback');
        if (youWon && !this.demo && this.progress.wonMatchIn(this.arena.layout.name)) this.featDone('everyArena');
        // A won match: sparks run round the rim for a moment.
        if (youWon) {
          this.celebrate = 2.2;
          // The pillar rises either way: in the Calm modes slowly and without its shimmer (no flash).
          this.pillar.play(this.arena.layout, maxRim(this.arena.layout) + 0.01, this.arena.floorHeight(1), TEAM_MINE, COMFORT.flashes ? 'win' : 'calm');
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
        this.resumeSnap = null;
        clearSnapshot(localStorage);
        this.markFirstFive(5);
        // A finished match keeps the day streak; its last card says what waits tomorrow.
        if (!this.demo && !this.online) this.progress.playedOn(localDate(new Date()));
        // The match becomes your echo: the board's challenge code carries it to a friend.
        if (!this.demo && !this.extras.length && !this.online && this.echoRec.rips.length) {
          try {
            localStorage.setItem(ECHO_KEY, `${encodeBuild(this.myBuild)}.${encodeEcho(this.echoRec)}`);
          } catch {
            // No storage: the board keeps the plain build code.
          }
        }
      } else {
        // A spin finish says why (the most common finish otherwise reads as luck).
        const why = loser.finish === 'spin' ? this.outlastReason(v === 1) : '';
        text = `${name(loser)}! ${v === 1 ? 'You' : 'They'} +${points} heat\n${why ? `${why} · ` : ''}${score}`;
      }
      // A finish within 1.5 s of the player's shape names it as the cause.
      const recent = this.recentPlayerCause();
      const theirs = this.elapsed - this.rivalShapeAt < CAUSE_WINDOW;
      // Your own move is blamed for your knockout only when nothing the rival did could have caused
      // it, and never a defensive one (a parry or palm wall cannot throw your top out).
      const ownBackfired = !!recent && v === -1 && loser.finish !== 'spin' && !theirs && this.lastShape?.kind !== 'parry';
      if (!this.demo && this.progress.guide === 'done' && v === 1 && loser.finish !== 'spin' && this.progress.best('fastestKo', Math.round(this.elapsed * 10) / 10)) this.stamp.later('NEW BEST!', `Fastest knockout: ${this.elapsed.toFixed(1)} s`, 'mine', 1);
      if (v === 1 && loser.finish !== 'spin' && recent && this.lastShape) {
        const k = this.lastShape.kind;
        this.featDone(k === 'ramp' ? 'ramp' : k === 'sling' ? 'sling' : k === 'strike' ? 'strike' : '');
        if (k === 'strike' && loser.finish === 'burst' && this.myBuild.seal === 'hammer') this.featDone('hammer');
      }
      // Every finish, yours or theirs (a spin-out too), holds still for a beat, then slows for a moment.
      this.slowMo = SLOW_MO_TIME * 0.5;
      this.koFreeze = KO_FREEZE;
      const won = this.myPoints > this.theirPoints || (decided && v === 1);
      const cause = recent && v === 1 ? `YOUR ${recent}` : theirs && v === -1 && loser.finish !== 'spin' ? `THEIR ${this.rivalShapeKind}`.toUpperCase() : '';
      const finishWord = name(loser);
      this.lastCause = cause ? `${cause} → ${finishWord}` : '';
      if (recent && v === 1 && loser.finish !== 'spin' && this.causeCue.stage) {
        this.showCauseCue(3, recent, this.causeCue.sx, this.causeCue.sz, loser.x, loser.z);
      }
      const finishSub = deskKo
        ? `${cause ? `${cause} → ` : ''}EDGE +${DESK_KO_BONUS}${decided ? ' · WIN' : ''}`
        : decided ? (won ? 'MATCH WON' : `MATCH LOST · "${this.rival.win}"`) : cause;
      // Match 1's DESK KO! stamp (updateDeskVerdict) already says this round; it is not said twice.
      if (!(deskKo && this.quietFirst && !decided)) this.stamp.show(`${finishWord}!`, finishSub, v === 1 ? 'mine' : 'rival', 1.1, decided ? 1.5 : 1);
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
      } else if (ownBackfired) text = `YOUR ${recent} BACKFIRED\n${text.split('\n').pop()}`;
      else if (theirs && v === -1 && loser.finish !== 'spin') text = `THEIR ${this.rivalShapeKind} → ${FINISH_WORD[loser.finish ?? 'spin']}\n${text.split('\n').pop()}`;
      if (decided && v === -1) {
        const rivalMove = theirs && loser.finish !== 'spin' ? this.rivalShapeKind : null;
        const ownBackfire = ownBackfired ? recent : null;
        this.rematchTip = rematchAdvice({
          openingOutcome: this.openingOutcome,
          zone: this.lastOpeningTrace?.zone ?? this.launchZoneKind,
          rip: this.lastRip,
          finish: loser.finish,
          ownBackfire,
          rivalMove,
          shaped: !!this.lastShape,
        });
        text = `You lose the match\nTry: ${this.rematchTip}`;
      }
    }
    // Match 1's rounds leave the finish to the stamp and the score to the bar; its verdict is carded.
    this.label.set(this.quietFirst && v !== 2 && !this.matchOver ? '' : text);
    // The card and stamp already name the finish. The bar uses its scarce centre slot for score.
    this.barMessage = v === 2 ? 'DRAW' : `${this.barPoints[0]} — ${this.barPoints[1]}`;
    console.log(`[MATCH] ${this.lastCause ? `${this.lastCause} - ` : ''}${text.replace('\n', ' - ')} after ${this.elapsed.toFixed(1)} s, ${this.clashes} clash steps`);
    if (v !== 2) {
      this.round++;
      this.typesPicked = false;
      // The score is in: an interruption now resumes at the next round.
      if (!this.matchOver) this.snapRound();
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
    let forgeGhost = false;
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
    if (ready && !this.launchPreviewSide) {
      // First launch only: the existing ghost hand now demonstrates choosing a point before ripping
      // (on the left-handed side when the dial says so).
      const x = COMFORT.lefty ? 0.045 : -0.045;
      const z = this.SPAWN - 0.025;
      const h = this.arena.height(x, z);
      this.launchGhost.visible = this.launchMarker.visible = true;
      this.launchGhost.position.set(x, h, z);
      this.launchGhost.rotation.y += this.frameDt * 1.8;
      this.launchMarker.position.set(x, h + 0.002, z);
      this.launchMarkerMaterial.color.setHex(0xff8a2a);
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
      if (this.time - this.readySince > INTRO_TIME) this.label.set(LESSON.rip);
    }
    // Outside the first launch: after the intro, the card says what this bout is about (the arena's
    // rule and how the rival plays), and later rounds say to rip again; it is never blank while waiting.
    if (!ready && this.phase === 'ready' && !this.demo && this.time - this.readySince > INTRO_TIME && !this.label.current) {
      const first = this.myPoints === 0 && this.theirPoints === 0;
      this.label.set(first ? `${this.arena.layout.name}: ${this.arena.layout.rule ?? ''}\n${this.rival.name}: ${this.rival.style}` : 'RIP AGAIN');
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
      this.drawTutorialLane(x, z);
      this.label.set(LESSON.ramp);
      this.bumpHintShown = true;
      // The ghost hand: down to the ring, pinch, drag outward past the rival, let go.
      const ox = x / (Math.hypot(x, z) || 1);
      const oz = z / (Math.hypot(x, z) || 1);
      const fy = this.arena.height(x, z);
      this.ghost.play([[0, x, fy + 0.05, z, 0], [0.4, x, fy + 0.006, z, 0], [0.6, x, fy + 0.006, z, 1], [1.2, x + ox * 0.05, fy + 0.006, z + oz * 0.05, 1], [1.35, x + ox * 0.05, fy + 0.03, z + oz * 0.05, 0], [2.2, x + ox * 0.05, fy + 0.05, z + oz * 0.05, 0]], this.frameDt);
      ghost = true;
    } else if (this.phase === 'fight' && !this.demo && this.progress.matches === 0 && this.tutorialRound === 2 && !this.morphedOnce && this.elapsed > TUNING.grace && this.labelTimer <= 0) {
      const desk = this.deskWrenchAt() !== null;
      this.label.set(desk ? LESSON.forgeDesk : COMFORT.oneHand ? LESSON.forgeOneHand : LESSON.forge);
      const grips = forgeGrips(this.arena.layout);
      const pulse = 1.15 + 0.15 * Math.sin(this.time * 6);
      for (let i = 0; i < this.rimSpringGuides.length; i++) {
        const side = (i === 0 ? 'left' : 'right') as Side;
        if (this.rimPulls[side]) continue;
        const guide = this.rimSpringGuides[i];
        const { x, z } = grips[i];
        guide.visible = !this.photo;
        guide.position.set(x, this.arena.height(x, z) + 0.005, z);
        guide.rotation.y = -Math.atan2(z, x);
        guide.scale.set(pulse, 1, pulse);
      }
      // Two mirrored hands make the new verb legible without a paragraph: grab opposite sides,
      // move together, let go. Later matches leave the other three actions to discovery cards.
      const [gl, gr] = grips;
      const y = Math.max(this.arena.height(gl.x, gl.z), this.arena.height(gr.x, gr.z));
      // Squeeze: the hands move toward each other, along the line between the grips.
      const inward = Math.min(0.045, gr.x * 0.3);
      this.ghost.play([[0, gl.x, y + 0.055, gl.z, 0], [0.45, gl.x, y + 0.01, gl.z, 0], [0.7, gl.x, y + 0.01, gl.z, 1], [1.35, gl.x + inward, y + 0.01, gl.z, 1], [1.55, gl.x + inward, y + 0.035, gl.z, 0], [2.35, gl.x, y + 0.055, gl.z, 0]], this.frameDt);
      this.forgeGhost.play([[0, gr.x, y + 0.055, gr.z, 0], [0.45, gr.x, y + 0.01, gr.z, 0], [0.7, gr.x, y + 0.01, gr.z, 1], [1.35, gr.x - inward, y + 0.01, gr.z, 1], [1.55, gr.x - inward, y + 0.035, gr.z, 0], [2.35, gr.x, y + 0.055, gr.z, 0]], this.frameDt);
      ghost = forgeGhost = true;
    } else if (this.phase === 'fight' && !this.demo && !this.online && !this.cuppedOnce && (this.progress.matches === VERB_RELEASE.spring || this.progress.matches === VERB_RELEASE.cup) && this.elapsed > 4 && this.labelTimer <= 0 && !this.label.current) {
      // The match right after a pinch verb's card repeats it once, in the fight.
      this.label.set(this.progress.matches === VERB_RELEASE.spring && this.rimExperiment
        ? 'New: pinch rim, pull inward'
        : 'New: jab floor → cup');
    } else if (this.bumpHintShown && g !== 'bump') {
      // The first move is made: the hint goes.
      this.bumpHintShown = false;
      this.label.set('');
    }
    if (!bump && this.tellAt < 0) {
      this.lane.visible = false;
      this.rivalTellFx.visible = false;
    }
    // The first match's ultimate: the ghost pinches the docked seal and stamps it into the floor;
    // once the palm-slap fallback mark is up, the second ghost slaps a flat palm onto it. Both go
    // with the first strike.
    if (!ghost && this.phase === 'fight' && !this.demo && this.progress.matches === 0 && !this.struckOnce && this.taught('strike')
      && this.overforgeSeal.visible && !this.overforgeHeld && !this.overforgeControl) {
      const { x: sx, y: sy, z: sz } = this.overforgeSeal.position;
      const h = this.arena.height(0, 0);
      this.ghost.play([[0, sx, sy + 0.04, sz, 0], [0.45, sx, sy, sz, 0], [0.65, sx, sy, sz, 1], [1.4, 0, h + 0.03, 0, 1], [1.7, 0, h + 0.002, 0, 1], [1.9, 0, h + 0.002, 0, 0], [2.6, 0, h + 0.05, 0, 0]], this.frameDt);
      ghost = true;
    }
    if (!forgeGhost && this.slapMark.visible && this.progress.matches === 0 && !this.struckOnce && !this.demo) {
      const { x, y, z } = this.stage.worldToLocal(this.slapMark.getWorldPosition(this.p));
      this.forgeGhost.play([[0, x, y + 0.06, z, 0], [0.5, x, y + 0.03, z, 0], [0.62, x, y, z, 1], [0.95, x, y, z, 1], [1.2, x, y + 0.05, z, 0], [1.9, x, y + 0.06, z, 0]], this.frameDt, 'palm');
      forgeGhost = true;
    }
    // The flick hint: one fingertip swings out through the tired rival, until the first flick.
    if (!forgeGhost && this.phase === 'fight' && this.time < this.flickGhostUntil && this.flickCount === 0 && this.theirs.alive) {
      const r = Math.hypot(this.theirs.x, this.theirs.z) || 1;
      const dx = this.theirs.x / r;
      const dz = this.theirs.z / r;
      const y = this.arena.height(this.theirs.x, this.theirs.z) + 0.012;
      const sx = this.theirs.x - dx * 0.05;
      const sz = this.theirs.z - dz * 0.05;
      const ex = this.theirs.x + dx * 0.04;
      const ez = this.theirs.z + dz * 0.04;
      this.forgeGhost.play([[0, sx, y + 0.02, sz, 0], [0.35, sx, y, sz, 0], [0.6, ex, y, ez, 1], [0.8, ex, y + 0.02, ez, 0], [1.3, ex, y + 0.03, ez, 0]], this.frameDt, 'tip');
      forgeGhost = true;
    }
    if (!ghost) this.ghost.hide();
    if (!forgeGhost) this.forgeGhost.hide();
  }

  /** XP for the round just played; level-ups flare and ring, unlocks queue to be shown. */
  private earn(won: boolean, loser: Top, matchOver: boolean, matchWon: boolean) {
    const before = this.progress.level;
    const award = this.progress.award({ won, finish: loser.finish, pocketPoints: loser.pocketPoints, perfect: this.lastPerfect && won, matchOver, matchWon, rival: loser === this.theirs || !won ? this.rival.name : undefined });
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
      if (!this.quietFirst || matchOver) this.stamp.later(`LEVEL ${this.progress.level}!`, this.progress.rank.toUpperCase(), 'mine', 1.2, 1.5);
    }
    // Match 1 reveals only its NEW MOVE: the Spur tip is the home note's next step, the rest wait on the board.
    this.reveals.push(...(this.quietFirst ? [] : award.unlocked));
    // The first session's own part goes first: the forge calls for it next.
    this.reveals.sort((a, b) => Number(b === 'tip:spur') - Number(a === 'tip:spur'));
    // One new hand verb per completed match: its card leads the reveals (after the first part).
    const verb = matchOver && !this.demo ? verbReleasedAt(this.progress.matches) : undefined;
    if (verb) this.reveals.splice(this.reveals[0] === 'tip:spur' ? 1 : 0, 0, `move:${verb}`);
    // Online matches give XP for your own result, but no marks, bouts, orders or champions.
    if (!this.demo && !this.online) this.trackComeBack(won, loser, matchOver, matchWon);
    // The forge is earned only after the player has actually raised a ramp. Finishing a match
    // without the hero verb repeats that one lesson instead of silently graduating it.
    if (matchOver && this.progress.guide === 'match') this.progress.advance('forge');
  }

  /**
   * What outlives the match: marks against this rival, a champion for a won match, and today's
   * order when this match plays it and the round or match fulfils it.
   */
  private trackComeBack(won: boolean, loser: Top, matchOver: boolean, matchWon: boolean) {
    const cause = this.lastShape && this.elapsed - this.lastShape.t < CAUSE_WINDOW ? this.lastShape.kind : null;
    let scarChanged = false;
    if (won && cause) {
      this.progress.recordScar(this.myBuild, 'shapes');
      scarChanged = true;
    }
    if (matchWon) {
      this.progress.recordScar(this.myBuild, 'wins');
      scarChanged = true;
    }
    if (scarChanged) this.myView.scars(this.progress.scarsFor(this.myBuild));
    const ko = loser.finish === 'pocket' || loser.finish === 'over' || loser.finish === 'burst';
    // In a brawl a bot's knockout is no mark against the rival (nor its circuit's clearing).
    const rivalOut = loser === this.theirs || !this.extras.length;
    const fresh = won && rivalOut ? this.progress.mark(this.rival.name, (matchWon ? MARK.beaten : 0) | (ko ? MARK.knockout : 0) | (cause ? MARK.shape : 0)) : 0;
    // Beating a circuit's champion for the first time clears the circuit: a moment of its own.
    const c = circuitOf(this.rival.name);
    if (fresh & MARK.beaten && c?.champion) {
      // In a campaign bout the map says it (BOSS DOWN, a chapter opening, the finale); free play keeps this stamp.
      if (!this.bout) {
        this.stamp.later(`${c.circuit.toUpperCase()} CLEARED!`, `${this.rival.name.toUpperCase()} IS BEATEN`, 'mine', 2.2, 1.5);
        playLevelUp();
      }
      const feat = c.circuit.startsWith('Cinder') ? 'cinder' : c.circuit.startsWith('Iron') ? 'iron' : 'crown';
      // In the campaign the chapter's boss bout earns it (trackBout); a rival met earlier in a bout does not.
      if (!this.bout) this.featDone(feat);
    }
    if (matchWon) this.progress.recordChampion(this.myBuild);
    const event = {
      rival: this.rival.name,
      arena: this.arena.layout.name,
      wonRound: won,
      finish: loser.finish,
      cause,
      cupCaughtInRound: this.cupCaughtInRound,
      matchWon,
      shutout: matchWon && this.theirPoints === 0,
      role: roleOf(specFromBuild(this.myBuild)),
      perfectInMatch: this.perfectInMatch,
      deskKo: this.deskKoScored,
    };
    if (this.bout && !this.demo) this.trackBout(this.bout, event, matchOver, matchWon);
    const o = this.order;
    if (!this.orderMatch || !o || this.progress.hasOrder(o.date)) return;
    const met = orderMet(o, event);
    if (!met) return;
    const before = this.progress.level;
    const a = this.progress.completeOrder(o.date);
    this.progress.recordScar(this.myBuild, 'orders');
    this.myView.scars(this.progress.scarsFor(this.myBuild));
    console.log(`[ORDER] done: ${o.text} -> ${this.progress.stamps} stamps${a.unlocked.length ? `, unlocked ${a.unlocked.join(', ')}` : ''}`);
    this.reveals.unshift(`stamp:${this.progress.stamps}`);
    this.reveals.push(...a.unlocked);
    if (a.levels.length && !this.levelUpText) {
      playLevelUp();
      this.levelUpText = `LEVEL ${this.progress.level}!\n${this.progress.rank}${this.progress.level > before + 1 ? ` (+${this.progress.level - before})` : ''}`;
    }
  }

  /** Opens the online duel the address asks for (after the first session), and wires its messages. */
  private openOnline(open?: 'host') {
    if (this.progress.guide !== 'done') return;
    if (!open) this.onlineTried = true;
    // The hello only proves protocol compatibility. Exact parts travel with the committed rip, so
    // neither table can counter-pick after seeing the other's deck choice.
    const link = linkFromAddress(open ? `?online=host${new URLSearchParams(location.search).get('net') === 'bc' ? '&net=bc' : ''}` : location.search, encodeBuild(PRESETS[0].build), this.progress.rank);
    if (!link) return;
    this.online = link;
    const say = (text: string, hold = 8) => {
      this.label.set(text);
      this.labelTimer = hold;
    };
    // The room code stays up until someone joins (on the card now, and on the board's front while home).
    this.hub.roomCode = link.role === 'host' ? link.code : null;
    if (this.phase === 'hub') this.toHub();
    say(link.role === 'host' ? `Online room ${link.code}\nFriend opens ?online=${link.code} · pegs close` : `Joining room ${link.code}…`, 600);
    link.onHello = () => {
      this.hub.roomCode = null;
      if (import.meta.env.DEV) console.log(`[ONLINE] ${link.role}: ${link.peerName} joined ${link.code}`);
      if (link.role === 'host') {
        const start = () => {
          if (this.online !== link || !link.peer) return;
          this.toHub();
          this.startMatch(this.remoteRival());
        };
        // Never pull the host out of the forge or the workshop (unsaved work): start when they are home.
        if (this.phase === 'placing') this.afterPlace = start;
        else if (this.phase === 'build' || this.phase === 'forge' || this.demo) {
          this.afterHome = start;
          say(`${link.peerName || 'A smith'} joined\nThe duel starts when you are home`);
        } else start();
      } else say(`In room ${link.code}\n${link.peerName} starts the match`);
    };
    link.onLaunch = (round, arena, layout, builds) => {
      if (round < 0 && this.phase === 'placing') {
        this.afterPlace = () => {
          if (this.online === link && link.peer) link.onLaunch?.(round, arena, layout, builds);
        };
        return;
      }
      if (round < 0 && (this.phase === 'build' || this.phase === 'forge' || this.demo)) {
        this.afterHome = () => {
          if (this.online === link && link.peer) link.onLaunch?.(round, arena, layout, builds);
        };
        say(`${link.peerName || 'The host'} is ready\nThe duel starts when you are home`);
        return;
      }
      if (round < 0) {
        // A match begins: the host's arena (by name, or whole when it was built in the workshop), against the host's top.
        // Home first: going home picks this device's own next bout and arena, which the host's replaces.
        this.toHub();
        const index = this.arenas.findIndex((a) => a.name === arena);
        // Untrusted input: a layout that fails to clone or validate falls back to the name.
        let sent: ArenaLayout | null = null;
        try {
          sent = layout && typeof layout === 'object' ? cloneLayout(layout as ArenaLayout) : null;
          if (sent && validate(sent)) sent = null;
        } catch {
          sent = null;
        }
        let placed = false;
        if (sent) {
          try {
            this.setArena(sent);
            placed = true;
          } catch {
            placed = false;
          }
        }
        if (placed) {
          // Kept: going home inside the session must not swap in the guest's own arena.
          this.arenas = [...this.arenas.filter((a) => a.name !== sent!.name), sent!];
          this.arenaIndex = this.arenas.length - 1;
        } else if (index >= 0) {
          this.arenaIndex = index;
          this.setArena(this.arenas[index]);
        }
        this.startMatch(this.remoteRival());
        return;
      }
      // The host has launched: whatever this side is doing with the cord, its sent rip is the one that flies.
      this.puller = null;
      this.cord.set(null);
      this.cordTone.update(null);
      this.chargeRing.visible = false;
      this.netGo = true;
      if (builds) {
        const hostBuild = decodeBuild(builds[0]);
        const guestBuild = decodeBuild(builds[1]);
        if (hostBuild && guestBuild) {
          this.myBuild = this.forge.allowed({ ...guestBuild });
          this.setBuilds(this.myBuild, { ...hostBuild, color: OPPONENT_COLOR });
          this.stamp.show('DECKS REVEALED', `${roleOf(this.mine.spec).toUpperCase()} VS ${roleOf(this.theirs.spec).toUpperCase()}`, 'neutral', 0.65);
        }
      }
      const [power, aim, from, dir, steep] = this.netPending ?? [0.75, 0, null, null, 0];
      this.launch(power, aim, from, dir, steep);
      this.netGo = false;
    };
    link.onEvent = (ev) => this.applyGuestEvent(ev);
    link.onResult = (winner, heat) => {
      if (this.phase !== 'fight') return;
      this.guestFight(0, true);
      const v = winner === 2 ? 2 : winner === 1 ? -1 : 1;
      const loser = v === 1 ? this.theirs : this.mine;
      if (v !== 2 && !loser.finish) loser.finish = 'spin';
      // Take the host's heat (seen from this side), less the points finish() is about to add.
      if (v !== 2) [this.myPoints, this.theirPoints] = guestPointsBefore(heat, v, finishPoints(loser, this.progress.matches === 0, false));
      this.finish(v);
    };
    link.onLeft = () => {
      // Close first, redraw home, then say it (a redraw would wipe the card).
      this.endOnline();
      if (this.phase === 'hub') this.toHub();
      say(`${link.peerName || 'Your opponent'} left\nThe online duel is over`);
    };
    // WebRTC through public relays: a room nobody reaches, or a strict network, ends with a plain reason.
    const t = link.transport as { onState?: (cb: (s: string) => void) => void; error?: string };
    t.onState?.((state) => {
      if (state === 'failed' && !link.peer) {
        this.endOnline();
        if (this.phase === 'hub') this.toHub();
        say(`Room ${link.code}: no one connected\n${t.error ?? 'Check the code, or try another network'}`, 12);
      }
    });
  }

  /** Host: a guest's launch spot, kept finite, inside the launch ring and LAUNCH_GAP clear of yours. */
  private guestSpot(at: [number, number], sx: number, sz: number): [number, number] {
    return clampGuestSpot(at, sx, sz, LAUNCH_MAX_N * this.arena.radius, LAUNCH_GAP) ?? this.rivalSpot();
  }

  /**
   * A refused move: the dull clunk, and the same news in words on the card (for anyone who plays
   * without sound), unless the card is already saying something.
   */
  private locked(why: string) {
    // A held refusal repeats every frame: say it at most every 0.6 s.
    if (this.time - this.lockedAt < 0.6) return;
    this.lockedAt = this.time;
    playLocked();
    // The card is busy (or just said it): a short stamp carries the same news (never over a stamp
    // already showing), never sound alone.
    if (this.labelTimer > 0 || this.time - this.lockedSaidAt < 2) {
      if (!this.stamp.busy) this.stamp.show(why.split('\n')[0].toUpperCase(), '', 'neutral', 0.35);
      return;
    }
    this.lockedSaidAt = this.time;
    this.label.set(why);
    this.labelTimer = 1.4;
  }

  /** Online: your rip is sent and held; drop the cord and wait in ready (MENU is there) until the other side rips. */
  private waitForPeer() {
    this.puller = null;
    this.chargeRing.visible = false;
    this.cord.set(null);
    this.cordTone.update(null);
    this.phase = 'ready';
  }

  /** Closes the online duel and returns to offline play (the pegs light for the seats again). */
  private endOnline() {
    // Whatever waited for the other smith (placement, home) is void with them gone.
    this.afterPlace = this.afterHome = null;
    this.netCup = null;
    this.hub.roomCode = null;
    if (!this.online) return;
    this.online.close();
    this.online = null;
    this.netRip = null;
    this.netPending = null;
    this.netShapes.clear();
    this.hub.setBrawl(this.seats);
  }

  /** The other smith's top, as a rival for the online duel. */
  private remoteRival(): Rival {
    const link = this.online!;
    const build = decodeBuild(link.peerBuild) ?? { ...PRESETS[0].build };
    const name = link.role === 'host' ? 'Guest' : 'Host';
    return { name, move: 'charge', style: 'another smith, live', title: link.peerName || 'online', intro: 'Live from another table.', win: 'GG.', lose: 'GG.', tip: 'Watch their ramps; forge before they do', build: { ...build, color: OPPONENT_COLOR }, level: 1 };
  }

  /** Host: what the guest's hands did, from the far side. */
  private applyGuestEvent(raw: GuestEvent) {
    // A trust boundary: a guest's event is checked and clamped before it can touch the simulation.
    const ev = sanitizeGuestEvent(raw, this.arena.radius, MAX_AIM);
    if (!ev) return;
    if (ev.kind === 'rip') {
      // A rip that arrives mid-fight belongs to no round: the next one starts from a fresh rip.
      if (this.phase === 'fight') return;
      this.netRip = { power: ev.power, aim: ev.aim, ...(ev.build ? { build: ev.build } : {}), ...(ev.at ? { at: ev.at } : {}), ...(ev.dir ? { dir: ev.dir } : {}) };
      // Only from ready: a host mid-pull finishes their own new rip, which then finds this one waiting.
      if (this.netPending && this.phase === 'ready') {
        const [power, aim, from, dir, steep] = this.netPending;
        this.netGo = true;
        this.launch(power, aim, from, dir, steep);
        this.netGo = false;
      }
      return;
    }
    if (this.phase !== 'fight') return;
    if (ev.kind === 'ramp') {
      this.arena.addShape('ramp', ev.x, ev.z, SHAPE_SIZE.ramp, 'rival', ev.dx, ev.dz);
      this.rivalHandMove(ev.x, ev.z, ev.dx, ev.dz);
      this.rivalShapeAt = this.elapsed;
      this.rivalShapeKind = 'RAMP';
      playThock();
    } else if (ev.kind === 'groove') {
      const shape = this.arena.addGroove(ev.sx, ev.sz, ev.ex, ev.ez, 'rival');
      if (!shape) return;
      this.rivalHandMove(ev.ex, ev.ez, shape.dx, shape.dz);
      this.rivalShapeAt = this.elapsed;
      this.rivalShapeKind = 'GROOVE';
      playThock();
    } else if (ev.kind === 'cup') {
      // The guest's cup, held here for them: it catches the first top in, then lets go after the hold.
      if (this.netCup && this.arena.shapes.includes(this.netCup.shape)) this.arena.free(this.netCup.shape);
      const shape = this.arena.addShape('well', ev.x, ev.z, CUP_DEPTH, 'rival-cup', 0, 0, CUP_SIGMA);
      shape.trap = shape.held = true;
      this.netCup = { shape, at: this.elapsed };
      this.rivalShapeAt = this.elapsed;
      this.rivalShapeKind = 'CUP';
      playThock();
    } else if (ev.kind === 'sling') {
      const cup = this.netCup?.shape;
      const t = cup?.caught;
      if (!cup || !t || !this.arena.shapes.includes(cup)) return;
      let a = Math.atan2(-ev.pz, -ev.px);
      let gap = SLING_SNAP;
      for (const p of this.arena.layout.pockets) {
        const b = Math.atan2(Math.sin(p.angle) * this.arena.radius - t.z, Math.cos(p.angle) * this.arena.radius - t.x);
        const d = Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)));
        if (d < gap) {
          gap = d;
          a = b;
        }
      }
      this.arena.sling(cup, Math.cos(a), Math.sin(a));
      this.netCup = null;
      this.rivalShapeAt = this.elapsed;
      this.rivalShapeKind = 'SLING';
      this.stamp.show('THEIR SLING', 'LIVE HANDS', 'rival', 0.6);
      playSling(t.x, t.z);
    } else if (ev.kind === 'rim') {
      const hits = springRim(this.arena, this.theirs, [this.mine], ev.sx, ev.sz, ev.x, ev.z, Math.max(0, Math.min(1.5, ev.f)));
      this.arenaView.flashRail(ev.sx, ev.sz);
      this.impacts.shock(ev.sx, this.arena.height(ev.sx, ev.sz), ev.sz, hits ? 0.75 : 0.35);
      if (hits) this.stamp.show('THEIR RIM SPRING', 'LIVE HANDS', 'rival', 0.6);
      this.rivalShapeAt = this.elapsed;
      this.rivalShapeKind = 'RIM SPRING';
      playThock();
    } else if (ev.kind === 'gust') {
      const targets = ev.target === 'mine' ? [this.theirs] : ev.target === 'rival' ? [this.mine] : this.tops;
      // An untargeted (paid) guest gust steers around the guest's own top, as it does locally.
      const own = ev.target ? null : this.theirs;
      const struck = targets.filter((top) => top !== own && palmGustCrosses(this.arena, top, ev.sx, ev.sz, ev.ex, ev.ez));
      const hits = palmGust(this.arena, targets, ev.sx, ev.sz, ev.ex, ev.ez, ev.f, own);
      this.rivalHandMove(ev.ex, ev.ez, ev.ex - ev.sx, ev.ez - ev.sz);
      this.rivalShapeAt = this.elapsed;
      this.rivalShapeKind = 'FORGE GUST';
      this.impacts.shock((ev.sx + ev.ex) * 0.5, this.arena.floorHeight(0.6), (ev.sz + ev.ez) * 0.5, hits ? 0.6 : 0.3, TEAM_RIVAL);
      for (const top of struck) {
        const view = top === this.mine ? this.myView : top === this.theirs ? this.theirView : null;
        view?.flash();
        this.impacts.hit(top.x, this.arena.height(top.x, top.z), top.z, 0.75);
      }
      if (hits) this.stamp.show('THEIR FORGE GUST', 'LIVE HANDS', 'rival', 0.6);
      playDash(ev.ex);
    } else if (ev.kind === 'flick') {
      // Guest-side 'mine' is the host's rival top.
      const top = ev.target === 'mine' ? this.theirs : this.mine;
      const reach = top.spec.radius + FINGER_RADIUS - 0.002;
      top.sinceTouch = 99;
      fingerContact(top, top.x - ev.dx * reach, top.z - ev.dz * reach, top.vx + ev.dx * ev.s, top.vz + ev.dz * ev.s, ev.f);
      const y = this.arena.height(top.x, top.z);
      (top === this.mine ? this.myView : this.theirView).flash();
      this.impacts.hit(top.x, y, top.z, 0.8);
      this.sparks.burst(top.x, y, top.z, 0.7);
      this.stamp.show('THEIR FLICK', 'LIVE HANDS', 'rival', 0.55);
      this.rivalShapeAt = this.elapsed;
      this.rivalShapeKind = 'FLICK';
      this.hitStop = Math.max(this.hitStop, 0.07);
      playThock(top.x, top.z);
    } else if (ev.kind === 'rub') {
      // Guest-side 'mine' is the host's rival top; one window's worth of spin per RUB_WINDOW at most.
      const top = this.theirs;
      if (!top.alive) return;
      if (this.time >= this.guestRubUntil) {
        this.guestRubUntil = this.time + RUB_WINDOW + RUB_REOPEN;
        this.guestRubSum = 0;
      }
      const gain = Math.min(ev.gain, RUB_WINDOW_MAX - this.guestRubSum);
      this.guestRubSum += Math.max(0, gain);
      top.spin = gain > 0 ? Math.max(top.spin, Math.min(1, top.spin + gain)) : Math.max(0, top.spin + gain);
      if (gain > 0 && this.time - this.guestRubSaidAt >= 1) {
        this.guestRubSaidAt = this.time;
        this.theirView.flash();
        this.stamp.show('THEIR SPIN RUB', 'LIVE HANDS', 'rival', 0.45);
        this.rivalShapeAt = this.elapsed;
        this.rivalShapeKind = 'SPIN RUB';
      }
    } else if (ev.kind === 'strike') {
      // The guest's palm comes down: their seal (Anvil when unknown), centred where they slapped, their top the striker.
      const seal = (SEALS as readonly string[]).includes(ev.seal ?? '') ? (ev.seal as Seal) : 'anvil';
      sealStrike(this.arena, this.theirs, this.mine, seal, ev.x, ev.z);
      const y = this.arena.height(ev.x, ev.z);
      this.impacts.shock(ev.x, y, ev.z, 1, TEAM_RIVAL);
      this.sparks.burst(ev.x, y, ev.z, 1);
      this.stamp.show(`THEIR ${SEAL_NAMES[seal].toUpperCase()}`, 'LIVE HANDS', 'rival', 0.9);
      this.rivalShapeAt = this.elapsed;
      this.rivalShapeKind = 'STRIKE';
      this.hitStop = Math.max(this.hitStop, 0.12);
      playThock();
    } else if (ev.kind === 'forge') {
      const action = ev.action as ArenaForgeAction;
      const gesture: ArenaForgeGesture = { pull: ev.pull, twist: ev.twist, tilt: ev.tilt };
      // The guest forged: its top (theirs, here on the host) is the forger, ours is the target.
      const forger = this.theirs;
      const target = this.mine;
      const aim = arenaForgeAim(target.x, target.z, target.vx, target.vz, this.arena.radius);
      if (forger.alive) forger.shieldUntil = Math.max(forger.shieldUntil, this.arena.elapsed + ARENA_FORGE_SHIELD);
      for (const top of this.tops) {
        if (!top.alive) continue;
        const own = top === forger;
        const impulse = arenaForgeImpulse(own ? action : arenaForgeRivalAction(action), gesture, top.x, top.z, this.arena.radius, ev.sx ?? -ev.sign, ev.sz ?? 0, (ev.force ?? 1) * (own ? 0.4 : aim));
        top.vx += impulse.x;
        top.vz += impulse.z;
        top.kick = Math.max(top.kick, 0.55);
        top.kickX = impulse.x;
        top.kickZ = impulse.z;
      }
      if (action === 'tilt' && ev.sx !== undefined) {
        this.arenaMorphShove.x = ev.sx;
        this.arenaMorphShove.z = ev.sz ?? 0;
        this.arenaMorphShove.t = 1.35;
        this.arena.shove = this.arenaMorphShove;
      }
      const [, g] = forgeGrips(this.arena.layout);
      const d = Math.hypot(g.x, g.z) || 1;
      this.rivalHandMove(-g.x, -g.z, g.x / d, g.z / d);
      this.rivalShapeAt = this.elapsed;
      this.rivalShapeKind = action.toUpperCase();
      this.stamp.show(`THEIR ${ARENA_FORGE_TITLE[action]}`, 'LIVE HANDS', 'rival', 0.9);
      this.impacts.shock(0, this.arena.height(0, 0), 0, 0.6);
      playThock();
    }
  }

  /** Guest: the fight as the host's snapshots show it, turned half round so your top is near you. */
  private guestFight(dt: number, newest = false) {
    const link = this.online!;
    link.tick();
    const s = link.buffer.sample(performance.now() + (newest ? 10000 : 0));
    // Snapshot time is the host's game clock (monotonic across rounds); the fight clock runs here.
    this.elapsed += dt;
    if (!s) return;
    if (newest) dt = 0;
    // The stage is turned half round on the guest, so the host's own coordinates are drawn as they are.
    const put = (t: Top, p: (typeof s.tops)[0]) => {
      t.x = p.x;
      t.z = p.z;
      t.vx = p.vx;
      t.vz = p.vz;
      t.spin = p.spin;
      t.angle = p.angle;
      t.wobble = p.wobble;
      t.damage = p.damage;
      t.state = p.state;
      t.finish = p.finish;
    };
    put(this.mine, s.tops[1]);
    put(this.theirs, s.tops[0]);
    this.arena.tiltX = s.tilt[0];
    this.arena.tiltZ = s.tilt[1];
    this.syncGuestShapes(link.shapes, dt);
    // The guest's own charges and strike bar refill here (the host's sim loop does it there).
    this.charges.update(dt);
    this.forgeBar.update(dt, false);
  }

  /** Guest: the host's floor shapes, turned half round; a shape keeps its age while it lasts. */
  private syncGuestShapes(packed: PackedShape[], dt: number) {
    const live = new Set<number>();
    const out: FloorShape[] = [];
    for (const [id, kind, x, z, dx, dz, amp, owner, length] of packed) {
      live.add(id);
      let shape = this.netShapes.get(id);
      // The host's 'rival' shapes are this guest's own; the host's hands' shapes are the rival's here.
      const mine = owner === 'rival' || owner === 'rival-cup' || owner === 'rival-groove';
      if (!shape) {
        shape = { kind: kind === 0 ? 'ramp' : kind === 4 ? 'groove' : 'well', x, z, dx, dz, amp, age: 0, owner: mine ? 'left' : 'rival', ...(length === undefined ? {} : { length }), ...(kind === 4 ? { boost: -1 } : {}) };
        this.netShapes.set(id, shape);
        this.arenaDirty = true;
      } else if (shape.dx !== dx || shape.dz !== dz || shape.amp !== amp || shape.length !== length) {
        Object.assign(shape, { x, z, dx, dz, amp, length });
        this.arenaDirty = true;
      }
      // A cup (2), or a cup holding a top (3), as the host says now: let go there, let go here.
      const trap = kind === 2 || kind === 3;
      if (!!shape.trap !== trap) this.arenaDirty = true;
      shape.trap = shape.held = trap;
      // The top it holds: the one nearest the cup (this side only needs it for the sling cord).
      shape.caught = kind === 3 ? [this.mine, this.theirs].reduce((a, b) => (Math.hypot(a.x - x, a.z - z) <= Math.hypot(b.x - x, b.z - z) ? a : b)) : null;
      shape.age += dt;
      out.push(shape);
    }
    for (const id of [...this.netShapes.keys()]) if (!live.has(id)) {
      this.netShapes.delete(id);
      this.arenaDirty = true;
    }
    this.arena.shapes = out;
    if (dt > 0) this.arenaDirty = true;
  }

  /** A duel just ended with your hands on record (the echo saved at match end): someone else can take the headset. */
  private canPass() {
    if (this.extras.length || this.online || this.progress.guide !== 'done') return false;
    try {
      return !!localStorage.getItem(ECHO_KEY);
    } catch {
      return false;
    }
  }

  /** Pass and play: the next smith fights this match's top and recorded hands, as a challenge code would bring them. */
  private passHeadset() {
    try {
      sessionStorage.setItem('spinsmith.vs', localStorage.getItem(ECHO_KEY) ?? '');
    } catch {
      return;
    }
    this.stamp.later('PASS THE HEADSET', 'NEXT SMITH: BEAT THAT TOP', 'neutral', 1.6, 1.2);
    playStamp();
    this.startMatch();
  }

  /** Seats the brawl's bots: other rivals' tops, each in its own color, spread round the sides. */
  private setupBrawl(n: number, names?: string[]) {
    // A bout names its crowd; otherwise other rivals you have met and the named smiths' tops (parts.ts NAMED_BUILDS), shuffled.
    const all = [...RIVALS, ...NAMED_BUILDS].map((r) => ({ name: r.name, build: r.build }));
    const met = RIVALS.filter((r) => r.name !== this.rival.name && r.level <= this.progress.level);
    const pool = [...met, ...NAMED_BUILDS].map((r) => ({ name: r.name, build: r.build }));
    const named = names?.map((x) => all.find((r) => r.name === x)).filter((r): r is (typeof all)[0] => !!r);
    const picks = named?.length ? named.slice(0, n) : [...pool].sort(() => Math.random() - 0.5).slice(0, n);
    this.brawlNames = picks.map((r) => r.name);
    this.barField.names = this.brawlNames.map((x) => x.toUpperCase());
    picks.forEach((r, i) => {
      const color = BRAWL_COLORS[i];
      const build = { ...r.build, color };
      const top = new Top(specFromBuild(build));
      top.hand = build.spin;
      top.state = 'out';
      const view = new TopView(build, color);
      // No team ring for a bot: its body is painted in its own colour already, and each ring is a
      // further additive draw per eye (a 4-top brawl on the hero arena sat right at the 150 budget).
      view.team(color, ringOf(build).radius, false);
      view.root.name = `brawl-top-${i}`;
      this.stage.add(view.root, view.shadowMesh, view.debris);
      this.extras.push(top);
      this.extraViews.push(view);
      this.tops.push(top);
    });
    this.refreshDepthOcclusion();
    if (import.meta.env.DEV) console.log(`[BRAWL] ${this.seats} tops: you, ${this.rival.name}, ${picks.map((r) => r.name).join(', ')}`);
  }

  /** The bar's brawl field this frame: tops not spinning count as out once the rip has gone. */
  private brawlBarField(): BrawlField {
    this.barField.live = this.phase === 'fight' || this.phase === 'result';
    return this.barField;
  }

  private clearBrawl() {
    for (const v of this.extraViews) {
      v.root.removeFromParent();
      v.shadowMesh.removeFromParent();
      v.debris.removeFromParent();
      v.dispose();
    }
    this.extras = [];
    this.extraViews = [];
    this.tops.length = 2;
    this.brawlLoser = null;
  }

  /** The bots rip from the arena's sides at the same moment, toward the middle and into the orbit. */
  private launchExtras() {
    this.extras.forEach((t, i) => {
      const angle = i === 0 ? 0 : Math.PI;
      const x = Math.cos(angle) * this.SPAWN;
      const z = Math.sin(angle) * this.SPAWN;
      const power = 0.7 + Math.random() * 0.25;
      const speed = launchSpeed(power);
      const dir = Math.atan2(-x, -z) + (Math.random() - 0.5) * 0.3 + LAUNCH_TILT * t.hand;
      t.launch(x, z, Math.sin(dir) * speed, Math.cos(dir) * speed, launchSpin(power), t.hand);
    });
  }

  /**
   * Brawl bots shape the floor too: every few seconds each raises a ramp just inside its nearest
   * foe, aimed at the rim (one ramp a bot; a new one replaces it). Nothing during the opening grace.
   */
  private botShaping() {
    if (!this.extras.length || this.elapsed < TUNING.grace) return;
    this.extras.forEach((bot, i) => {
      if (!bot.alive || this.elapsed < this.botShapeAt[i]) return;
      this.botShapeAt[i] = this.elapsed + 3.5 + Math.random() * 2;
      let foe: Top | null = null;
      let best = Infinity;
      for (const t of this.tops) {
        if (t === bot || !t.alive) continue;
        const d = Math.hypot(t.x - bot.x, t.z - bot.z);
        if (d < best) {
          best = d;
          foe = t;
        }
      }
      if (!foe) return;
      const r = Math.hypot(foe.x, foe.z) || 1;
      const dx = foe.x / r;
      const dz = foe.z / r;
      const offset = 0.012 * (this.arena.radius / 0.17);
      const x = foe.x - dx * offset;
      const z = foe.z - dz * offset;
      this.arena.addShape('ramp', x, z, SHAPE_SIZE.ramp * 0.75, `bot${i}`, dx, dz, RIVAL_RAMP_SIGMA);
      this.impacts.shock(x, this.arena.height(x, z), z, 0.35, BRAWL_COLORS[i]);
      playThock(x, z);
    });
  }

  /** A meeting in a brawl that is not you against the rival: sparks, both tops take it, a clash sound. */
  private brawlClash(c: Clash) {
    const y = this.arena.height(c.x, c.z);
    this.sparks.burst(c.x, y, c.z, c.strength);
    const views = [this.myView, this.theirView, ...this.extraViews];
    for (const k of [c.a ?? 0, c.b ?? 1]) views[k]?.hit(c.strength * 0.8, c.x - this.tops[k].x, c.z - this.tops[k].z);
    if (c.strength > HARD_HIT) this.impacts.hit(c.x, y, c.z, c.strength);
    if (this.sinceClashSound > 0.06) {
      playClash(c.strength, c.x);
      this.sinceClashSound = 0;
    }
  }

  /**
   * A brawl round ends when your top is out (you lose it) or you are the last top spinning (you win
   * it, scored on the foe that went out last). At the time cap the most spin wins.
   */
  private brawlVerdict(): -1 | 0 | 1 {
    // Out while a foe still spins is a lost round; out in the same step as the last foe goes to the ranking (spin left).
    if (!this.mine.alive && this.tops.some((t, i) => i > 0 && t.alive)) return -1;
    const target = targetWinner(this.activeBrawlMode, this.tops, this.brawlLastHit);
    if (target) {
      this.brawlLoser = this.tops[target.victim];
      const word = this.activeBrawlMode === 'crucible' ? 'CRUCIBLE HIT!' : 'POCKET CROWN!';
      this.stamp.show(word, target.winner === 0 ? 'YOUR HIT TOOK THE ROUND' : 'A RIVAL CLAIMED THE TARGET', target.winner === 0 ? 'mine' : 'rival', 0.8, 1.15);
      return target.winner === 0 ? 1 : -1;
    }
    if (!roundOverN(this.tops, this.elapsed)) return 0;
    const rank = rankingN(this.tops, this.elapsed);
    if (rank[0] !== 0) return -1;
    this.brawlLoser = this.tops[rank[1]];
    return 1;
  }

  /**
   * Medals earned in a bout this round build up through the match and are kept when it ends (won
   * or lost: a medal earned is earned). Each new one stamps in turn, then the map says what opened.
   */
  private trackBout(bout: Bout, event: Parameters<typeof medalsFrom>[1], matchOver: boolean, matchWon: boolean) {
    const earned = medalsFrom(bout, event, !!ROOM.poly);
    // A medal earned mid-match is said at once (feedback while the move is fresh); the match end sums up.
    const now = earned & ~1 & ~this.boutEarned & ~(this.progress.bouts[bout.id] ?? 0);
    this.boutEarned |= earned;
    if (!matchOver) {
      bout.medals.forEach((m, i) => {
        if (now & (2 << i) && !this.quietFirst) this.stamp.later('MEDAL!', MEDAL_TEXT[m].toUpperCase(), 'mine', 1.1, 1.1);
      });
      return;
    }
    const before = nextBout(this.progress.bouts);
    const { fresh, unlocked } = this.progress.recordBout(bout.id, this.boutEarned, matchWon);
    // One stamp for the bout (the queue keeps three; feats and levels share it), one for a new chapter.
    const got = bout.medals.filter((_, i) => fresh & (2 << i)).map((m) => MEDAL_TEXT[m].toUpperCase());
    const have = [1, 2, 4].filter((m) => (this.progress.bouts[bout.id] ?? 0) & m).length;
    const finale = !!(fresh & 1) && bout === BOUTS[BOUTS.length - 1];
    if (fresh & 1 && bout.boss) this.progress.feat((['cinder', 'iron', 'crown'] as const)[bout.chapter - 1]);
    // The finale's own stamps replace the bout's (the stamp queue holds three).
    if (fresh && !finale) {
      const word = fresh & 1 ? (bout.boss ? 'BOSS DOWN!' : 'BOUT WON!') : 'MEDAL!';
      this.stamp.later(word, `${bout.id} · ${have}/3 MEDALS${got.length ? ` · ${got.join(' · ')}` : ''}`, 'mine', 1.6, fresh & 1 && bout.boss ? 1.5 : 1.2);
      playStamp();
    }
    // The campaign's end: the last boss beaten for the first time is the game's finale.
    if (finale) {
      const medals = medalCount(this.progress.bouts);
      this.stamp.later('THE CROWN IS YOURS', 'EVERY CIRCUIT CLEARED', 'mine', 2.4, 1.6);
      this.stamp.later('SPINSMITH', `${medals} OF ${BOUTS.length * 3} MEDALS`, 'mine', 2, 1.4);
      this.levelUpText = `You took the Crown.\nThanks for playing. Medals, orders and brawls await`;
      this.celebrate = Math.max(this.celebrate, 4);
      playLevelUp();
    }
    const after = nextBout(this.progress.bouts);
    // A boss beaten without the medals to open the next chapter: say what is missing, right here.
    if (fresh & 1 && bout.boss && !finale && (!after || after.chapter <= bout.chapter) && nextGate(this.progress.bouts)) this.stamp.later('NOT YET', nextGate(this.progress.bouts).toUpperCase(), 'neutral', 1.8, 1.1);
    if (after && before && after.chapter > before.chapter) {
      this.stamp.later(`${CHAPTERS[after.chapter - 1].name.toUpperCase()} OPEN!`, `NEXT: ${after.rival.toUpperCase()} IN ${after.arena.toUpperCase()}`, 'mine', 1.8, 1.5);
      playLevelUp();
    }
    if (!this.quietFirst) this.reveals.push(...unlocked);
    if (import.meta.env.DEV) console.log(`[BOUT] ${bout.id} ${matchWon ? 'won' : 'lost'} bits ${this.progress.bouts[bout.id] ?? 0} (+${fresh}) next ${after?.id ?? '-'}${nextGate(this.progress.bouts) ? ` · ${nextGate(this.progress.bouts)}` : ''}`);
  }

  /** Shows a level-up, then each new unlock spinning over the arena before it flies off. */
  private updateRewards(dt: number) {
    if (this.levelUpText && this.phase === 'result' && this.resultTimer < RESULT_TIME - 1.4 && (this.matchOver || !this.quietFirst)) {
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
    } else if (this.comeBackPending && !this.reveal && !this.replay && this.matchOver && !this.reveals.length && this.phase === 'result' && this.resultTimer < 1.2) {
      // Once the result and every unlock have been read: why to come back tomorrow.
      this.comeBackPending = false;
      this.label.set(this.comeBackText());
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
      // Its own geometry. ponytail: materials stay (most are shared from materials.ts, and disposing
      // one forces a recompile stall); a few per-reveal ones leak, fine at one reveal per unlock.
      r.obj.traverse((o) => {
        const m = o as Mesh;
        if (m.isMesh) m.geometry.dispose();
      });
      this.reveal = null;
      // Its card stays readable a moment after the model flies off (a stamp may have covered its start).
      this.rewardHold = 1.5;
      this.resultTimer = Math.max(this.resultTimer, 1.5 + 1.3);
    }
  }

  /** A small dot where the pointing hand's ray (or, in dev, the gaze) meets the floor. */
  private updateReticle() {
    const h = this.hands.right.hasRay ? this.hands.right : this.hands.left;
    const handHit = this.rayFloor(h);
    const gazeHit = !handHit && this.gazePointer.tracked && this.gazeHit.ok;
    const hit = handHit ? this.rayHit : this.gazeHit;
    const arenaPhase = this.phase === 'ready' || this.phase === 'pulling' || this.phase === 'fight';
    this.reticle.visible = arenaPhase && (handHit || gazeHit);
    if (!this.reticle.visible) return;
    this.reticle.position.set(hit.x, this.arena.height(hit.x, hit.z) + 0.002, hit.z);
    const gazePinch = gazeHit && this.gazePointer.pinching;
    this.reticle.scale.setScalar(gazePinch ? 1.65 : 1 + Math.sin(this.time * 5) * 0.12);
    const material = this.reticle.material as MeshBasicMaterial;
    material.color.setHex(gazePinch ? 0xffa23f : gazeHit ? 0x66e4ff : 0xffb45a);
    material.opacity = gazePinch ? 1 : 0.82;
    if (gazeHit) this.gazeAssist.target = this.phase === 'ready' || this.phase === 'pulling' ? 'launch point' : 'forge terrain';
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
  if (kind === 'move') return `NEW MOVE: ${VERB_CARD[id as ReleasedVerb][0]}\n${VERB_CARD[id as ReleasedVerb][1]}`;
  return `NEW: ${unlockName(key)}\n${unlockBlurb(key)}`;
}

/** What a new thing does, in one line (so the card says why it matters and where to try it). */
function unlockBlurb(key: string): string {
  const [kind, id] = key.split(':');
  if (kind === 'ring') return RINGS.find((r) => r.id === id)?.blurb ?? '';
  if (kind === 'core') return CORES.find((c) => c.id === id)?.blurb ?? '';
  if (kind === 'tip') return TIPS.find((t) => t.id === id)?.blurb ?? '';
  if (kind === 'seal') return `${SEAL_BLURBS[id as Seal]} · set it in the forge's Combat drawer`;
  if (kind === 'arena') return ARENAS.find((a) => a.name === id)?.rule ?? 'A new arena in the rotation';
  if (kind === 'paint') return 'Try it in the forge';
  if (kind === 'emblem') return 'Pick it in the forge, Look drawer';
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
  if (kind === 'emblem' || kind === 'stamp' || kind === 'ledger' || kind === 'move') {
    // A struck medallion: the glow's color, the stamp's (or a new move's) orange, or the ledger's gold.
    const color = kind === 'emblem' ? EMBLEM_COLORS[Number(id)] : kind === 'stamp' || kind === 'move' ? 0xff8a2a : 0xffd34a;
    const g = new Group();
    const coin = new Mesh(new CylinderGeometry(0.02, 0.02, 0.004, 32), new MeshBasicMaterial({ color }));
    coin.rotation.x = Math.PI / 2;
    g.add(coin);
    return g;
  }
  for (const [, items] of ROWS) for (const item of items) if (itemKey(item) === key) return itemModel(item);
  return new Group();
}

/** One-hand forge: how long a lone rim grip is held before the far rim mirrors it (s). */
const ONE_HAND_HOLD = 0.3;

/** The brawl's extra tops: green and violet, apart from your orange and the rival's teal. */
const BRAWL_COLORS = [0x6fd35a, 0xb07cff];
const SEATS_KEY = 'spinsmith.seats.v1';
const BRAWL_KEY = 'spinsmith.brawl.v1';

function loadSeats(): number {
  try {
    const saved = JSON.parse(localStorage.getItem(BRAWL_KEY) ?? 'null') as { seats?: number } | null;
    if (saved?.seats && saved.seats >= 2 && saved.seats <= 4) return saved.seats;
    const n = Number(localStorage.getItem(SEATS_KEY));
    return n >= 2 && n <= 4 ? n : 2;
  } catch {
    return 2;
  }
}

function loadBrawlMode(): BrawlMode {
  try {
    const saved = JSON.parse(localStorage.getItem(BRAWL_KEY) ?? 'null') as { mode?: string } | null;
    return saved?.mode === 'pocket' || saved?.mode === 'crucible' ? saved.mode : 'last';
  } catch {
    return 'last';
  }
}

function saveBrawlSettings(seats: number, mode: BrawlMode) {
  try {
    localStorage.setItem(BRAWL_KEY, JSON.stringify({ seats, mode }));
    // Keep the old key for builds from before modes existed.
    localStorage.setItem(SEATS_KEY, String(seats));
  } catch {
    // Not kept: the pegs still work for this session.
  }
}

/** True the first time a one-off hint is asked for on this device (kept in localStorage). */
function once(hint: string): boolean {
  try {
    const key = `spinsmith.hint.${hint}`;
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, '1');
    return true;
  } catch {
    return false;
  }
}
