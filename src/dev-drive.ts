/**
 * Dev only: a hand driver for the emulator. `window.drive` plays real hand motions on the
 * emulated hands (move, pinch, pull, press, slap) so the game's own gesture code reads them,
 * unlike the dev keys, which skip it. Made for an agent (or a script) that looks at
 * `drive.state()`, picks a move, and calls it; and for repeatable demo shots.
 *
 * How: each emulated hand's `onFrameStart` is wrapped. It runs after the emulator UI has copied
 * its own hand handles in and before the joints are built, so the position written there wins
 * that frame. The game's reading of the last frame (pinch point, index tip, lowest point) gives
 * the offset from the hand's root to the point being steered, so the steered point lands where
 * asked. Pinching uses the emulator's pinch value (which also blends the fingers closed).
 * Coordinates: world metres, or arena-local {x, z} where an option says so.
 */
import { Vector3 } from '@iwsdk/core';
import { rimRadius, type ArenaLayout } from './game/layout.js';
import { forgeGrips } from './game/reach.js';

type Side = 'left' | 'right';
type Point = 'pinch' | 'index' | 'low' | 'palm';
type SlapAim = number | 'rival' | 'mine' | 'opposite-rival';

interface EmuVec {
  x: number;
  y: number;
  z: number;
  set(x: number, y: number, z: number): unknown;
}
interface EmuHand {
  position: EmuVec;
  poseId: string;
  updatePinchValue(v: number): void;
  setPinchValueImmediate?(v: number): void;
  updateTargetRaySpace?(): void;
  updateHandPose?(): void;
  onFrameStart(frame: unknown): void;
}
interface EmuHandle {
  position: EmuVec & { clone(): EmuVec; copy(v: unknown): unknown };
  parent: { worldToLocal(v: EmuVec): unknown } | null;
}
interface Hand {
  tracked: boolean;
  pinching: boolean;
  pinch: Vector3;
  index: Vector3;
  wrist: Vector3;
  low: number;
}
/** The game's fields the driver reads (MatchSystem, exposed as window.__game in dev). */
interface Game {
  phase: string;
  elapsed: number;
  hands: Record<Side, Hand>;
  player: { localToWorld(v: Vector3): Vector3; worldToLocal(v: Vector3): Vector3 };
  root: { position: Vector3; localToWorld(v: Vector3): Vector3; worldToLocal(v: Vector3): Vector3 };
  rootK: number;
  arena: { radius: number; layout: ArenaLayout & { name?: string }; height(x: number, z: number): number; floorHeight(n: number): number; shapes: { kind: string; boost?: number; length?: number }[] };
  mine: { x: number; z: number; vx: number; vz: number; spin: number; alive: boolean; state: string; sinceWall: number };
  theirs: { x: number; z: number; vx: number; vz: number; spin: number; alive: boolean; state: string; sinceWall: number };
  myPoints: number;
  theirPoints: number;
  barPoints: [number, number];
  deskVerdict?: { left: number } | null;
  deskKoScored?: boolean;
  lastRoundHeat?: number;
  theirView: { offDesk: boolean };
  forgeBar: { value: number };
  struckOnce: boolean;
  charges: { charges: number };
  handHoverClaim: Record<Side, '' | 'RAMP' | 'RIM' | 'FORGE' | 'CATCH' | 'SLING'>;
  rimPulls?: Record<Side, unknown | null>;
  cups: Record<Side, { shape: { x: number; z: number }; caught: unknown } | null>;
  label: { current: string };
  labelTimer: number;
  rival: { name: string; move: string };
  rivalShapeKind?: string;
  hub: { debugPositions(): string };
  forge: { debugPositions(): string };
  builder: { debugPositions(): string };
  myBuild: { ring: string; core: string; tip: string; spin: number; color: number; emblem?: number; seal?: string };
  progress: { level: number; matches: number; guide: string; deskTrophies?: { rival: string; angle: number; date: string }[] };
  launchZoneKind: string;
  launchArenaKind: string;
  launchTiming: number;
  launchTwist: number;
  firstClashPending: boolean;
  openingOutcome: string;
  sizeSettled: boolean;
  entrance: unknown | null;
  /** Readable evidence for the new duel-memory loop; populated by MatchSystem. */
  lastOpeningTrace?: { zone: string; outcome: string } | null;
  rivalRead?: string;
  rematchTip?: string;
  rimExperiment?: boolean;
  /** Hand-first combat state exposed for deterministic emulator captures. */
  overforgeMode?: string;
  palmBraceActive?: boolean;
  palmBraceAngles: Record<Side, number | null>;
  palmGustBlockedUntil: Record<Side, number>;
  crossguardActive?: boolean;
  crossguardHits?: number;
  crossguardA?: Vector3;
  crossguardB?: Vector3;
  palmGustTime?: number;
  palmGustCooldown?: number;
  palmGustCount?: number;
  palmGustSide?: Side | null;
  palmGustDirection?: { x: number; y: number };
  palmGustHits?: number;
  palmGustRiposte?: boolean;
  flickCount?: number;
  lastFlick?: { gain: number; dx: number; dz: number; rival: boolean };
  riposteUntil?: number;
  riposteSide?: Side | null;
  riposteTop?: Game['mine'] | null;
  bracedLaunch?: boolean;
  palmLauncherSide?: Side | null;
  palmLauncherDebug?: string;
  palmForgeActive?: boolean;
  forgeWheel: { visible: boolean; getWorldPosition(v: Vector3): Vector3; localToWorld(v: Vector3): Vector3 };
  forgeWheelHandle: { getWorldPosition(v: Vector3): Vector3 };
  forgeWheelCurrentTime?: number;
  forgeWheelTurn?: number;
  forgeWheelHeld?: Side | null;
  forgeWheelGrabGap?: number;
  emberState?: 0 | 1 | 2 | 3;
  emberGrabGap?: number;
  interventionCount: number;
  emberPickup: { visible: boolean; getWorldPosition(v: Vector3): Vector3 };
  spawnEmber(x: number, z: number): void;
  /** Competition-feature state exposed for repeatable emulator proof. */
  outerRingState?: 'idle' | 'rescue' | 'palm' | 'returned' | 'failed';
  outerRingCompleted?: boolean;
  outerRingLeft?: number;
  outerRingAt?: Vector3;
  outerRingGoal?: Vector3;
  anchorState?: 'unsupported' | 'restoring' | 'anchored';
  arenaMorph?: { scaleX: number; scaleZ: number; tilt: number };
  arenaForgeAction?: 'none' | 'squeeze' | 'stretch' | 'twist' | 'tilt';
  arenaForgeSwing?: number;
  arenaForgeCancels?: number;
  gazeAssist?: { active: boolean; target: string };
  overforgeSeal: { visible: boolean; getWorldPosition(v: Vector3): Vector3 };
  rivalLaunchPower: number;
  rivalLaunchAim: number;
  ripBeatAt: number;
  time: number;
  devLaunchTwist: number;
  SPAWN: number;
  gazeOff: boolean;
  photo: boolean;
  menuButton: { mesh: { visible: boolean; getWorldPosition(v: Vector3): Vector3 } };
  rematchButton: { mesh: { visible: boolean; getWorldPosition(v: Vector3): Vector3 } };
}

interface Goal {
  point: Point;
  /** Presentation intent used to shape acceleration and settle without changing the gameplay target. */
  intent?: 'reach' | 'grip' | 'force' | 'release';
  from: Vector3;
  /** A fixed point, or one followed each frame (a moving top). */
  to: Vector3 | (() => Vector3);
  t: number;
  dur: number;
  pinch: number;
  curve: 'natural' | 'linear';
  /** Small shoulder/elbow lift for an open-hand reach; contact drags stay exactly on the surface. */
  lift: number;
  /** Sideways bow in world space, giving relaxed reaches an elbow-led path instead of a rail. */
  arc: number;
  done: () => void;
}

/** Pedestal height under the arena floor (m), as placement.ts. */
const PEDESTAL = 0.08;
const ARENA_SCALE = 2.4;

export function installDriver() {
  const w = window as unknown as { IWER_DEVICE?: { hands: Record<Side, EmuHand>; primaryInputMode: 'controller' | 'hand' }; transformHandles?: Map<string, EmuHandle>; __game?: Game; drive?: unknown; __spinDriveGeneration?: number; spinsmithDiagnostics?: () => Record<string, string | number | boolean> };
  // Vite HMR re-evaluates this module without cancelling requestAnimationFrame callbacks created by
  // the previous copy. Give the newest driver sole ownership so an old closure cannot keep writing
  // a parked pose over a fresh test after a source edit.
  const generation = (w.__spinDriveGeneration ?? 0) + 1;
  w.__spinDriveGeneration = generation;
  const goals: Record<Side, Goal | null> = { left: null, right: null };
  /** Where each held hand's steered point should be now. */
  const aim: Record<Side, { point: Point; at: Vector3 } | null> = { left: null, right: null };
  /** Hands the driver holds (until rest()); their last commanded root, world space. */
  const held: Record<Side, Vector3 | null> = { left: null, right: null };
  const pinchNow: Record<Side, number> = { left: 0, right: 0 };
  const lastRoot: Record<Side, Vector3> = { left: new Vector3(), right: new Vector3() };
  const lastPinch: Record<Side, number> = { left: 0, right: 0 };
  const offsets: Record<Side, [Partial<Record<Point, Vector3>>, Partial<Record<Point, Vector3>>]> = { left: [{}, {}], right: [{}, {}] };
  const offsetMix: Record<Side, Vector3> = { left: new Vector3(), right: new Vector3() };
  const lastAt: Record<Side, number> = { left: performance.now(), right: performance.now() };
  const v = new Vector3();
  let hooked = false;

  const game = () => {
    if (!w.__game) throw new Error('game not ready');
    return w.__game;
  };

  /** Where a steered point is now (world), from the game's last reading. */
  const measured = (side: Side, point: Point, out: Vector3) => {
    const h = game().hands[side];
    if (point === 'pinch') return out.copy(h.pinch);
    if (point === 'palm') return out.copy(h.wrist).lerp(h.index, 0.48);
    out.copy(h.index);
    if (point === 'low') out.y = h.low;
    return out;
  };

  const frameHook = (side: Side, hand: EmuHand, advance = true) => {
    const g = goals[side];
    const root = held[side];
    if (!root || !w.__game) return;
    const now = performance.now();
    const dt = advance ? Math.min(0.1, (now - lastAt[side]) / 1000) : 0;
    if (advance) lastAt[side] = now;
    if (g && advance) {
      g.t += dt;
      const raw = g.dur > 0 ? Math.min(1, g.t / g.dur) : 1;
      // A reach, a precise grip and a forceful stroke do not share one robotic tween. Minimum-jerk
      // reaches settle softly, grips decelerate into contact, and releases clear the prop quickly.
      let k = raw;
      if (g.intent === 'force') {
        // Smooth acceleration into a readable mid-stroke snap without sacrificing the velocity
        // thresholds used by the real gesture system.
        k = 0.5 - Math.cos(raw * Math.PI) * 0.5;
      } else if (g.curve === 'natural') {
        if (g.intent === 'grip') k = 1 - ((1 - raw) ** 3);
        else if (g.intent === 'release') k = 1 - ((1 - raw) ** 2);
        else if (g.intent === 'reach') {
          const r3 = raw * raw * raw;
          k = r3 * (10 + raw * (-15 + raw * 6));
        } else k = raw * raw * (3 - 2 * raw);
      }
      const at = new Vector3().lerpVectors(g.from, typeof g.to === 'function' ? g.to() : g.to, k);
      // Human reaches do not travel on a ruler-straight line. A restrained lift keeps the hand
      // clear of the arena on approach, while pinched drags and fast gameplay strokes remain flat.
      if (g.lift > 0) at.y += Math.sin(raw * Math.PI) * g.lift;
      if (g.arc !== 0) at.x += Math.sin(raw * Math.PI) * g.arc;
      aim[side] = { point: g.point, at };
      if (raw >= 1) {
        goals[side] = null;
        g.done();
      }
    }
    // What the game saw last frame: each point's offset from the root, per pinch state.
    for (const pt of ['pinch', 'index', 'low', 'palm'] as const) {
      const o = offsets[side][lastPinch[side] > 0.5 ? 1 : 0];
      if (!o[pt]) measured(side, pt, (o[pt] = new Vector3())).sub(lastRoot[side]);
    }
    // Keep the steered point on its target: its offset from the root as the game saw it last frame,
    // kept per pinch state, so closing the fingers does not first move the point (a pinch that
    // drifts reads as a drag, not a tap).
    const a = aim[side];
    if (a) {
      const open = offsets[side][0][a.point];
      const closed = offsets[side][1][a.point];
      const offset = open && closed ? offsetMix[side].lerpVectors(open, closed, pinchNow[side]) : (closed ?? open)!;
      root.copy(a.at).sub(offset);
    }
    lastPinch[side] = pinchNow[side];
    if (hand.setPinchValueImmediate) hand.setPinchValueImmediate(pinchNow[side]);
    else hand.updatePinchValue(pinchNow[side]);
    lastRoot[side].copy(root);
    const local = game().player.worldToLocal(v.copy(root));
    hand.position.set(local.x, local.y, local.z);
    // `position` is only IWER's public input value; its XRSpace matrix is normally copied in
    // onFrameStart. Browser-run automation and the renderer can use different RAF turns, so sync
    // that public value immediately as well. Otherwise the debug handle moves while WebXR keeps
    // reporting the previous hand pose until the command has already finished.
    hand.updateTargetRaySpace?.();
    hand.updateHandPose?.();
    // IWER's visible handle is its pose authority and normally copies back into the input every
    // frame. Move it too, otherwise the UI can overwrite an automated hand before the game reads it.
    const handle = w.transformHandles?.get(side);
    if (handle) {
      const p = handle.position.clone();
      p.set(root.x, root.y, root.z);
      handle.parent?.worldToLocal(p);
      handle.position.copy(p);
    }
  };

  const hook = () => {
    if (!w.IWER_DEVICE) throw new Error('no emulator (IWER_DEVICE)');
    // IWER starts every new immersive session in controller mode. The driver animates tracked
    // hands, so explicitly make those the active WebXR input sources instead of moving an input
    // object the app is not currently reading.
    w.IWER_DEVICE.primaryInputMode = 'hand';
    if (hooked) return;
    hooked = true;
    // IWER may replace a hand's onFrameStart callback when an immersive session settles. Drive
    // the public hand state from the page's frame clock instead; IWER consumes it on its next XR
    // frame, and a gesture can no longer stall halfway through after that callback is replaced.
    const ensureHook = (side: Side) => {
      const dev = w.IWER_DEVICE;
      if (!dev) return;
      const hand = dev.hands[side];
      type DriveFrameStart = EmuHand['onFrameStart'] & { __spinDriveGeneration?: number; __spinDriveOriginal?: EmuHand['onFrameStart'] };
      const current = hand.onFrameStart as DriveFrameStart;
      if (current.__spinDriveGeneration === generation) return;
      const base = current.__spinDriveOriginal ?? current;
      const original = base.bind(hand);
      const wrapped = ((frame: unknown) => {
        // IWER first copies its visible transform handle into the input. Apply the automated pose
        // afterwards so it is the value the XR frame consumes; doing this in the opposite order
        // leaves the visible hand permanently parked at IWER's default pose.
        original(frame);
        frameHook(side, hand, false);
      }) as DriveFrameStart;
      wrapped.__spinDriveGeneration = generation;
      wrapped.__spinDriveOriginal = base;
      hand.onFrameStart = wrapped;
    };
    const tick = () => {
      if (!hooked || w.__spinDriveGeneration !== generation) return;
      // Entering XR again can replace IWER_DEVICE and its hand objects. Resolve it every frame;
      // retaining the first session's device makes a probe animate a dead rig while the visible
      // hands stay parked.
      const dev = w.IWER_DEVICE;
      if (!dev) {
        requestAnimationFrame(tick);
        return;
      }
      for (const side of ['left', 'right'] as const) {
        ensureHook(side);
        frameHook(side, dev.hands[side]);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /** Takes a hand (it stays where it is) so the driver can steer it. */
  const take = (side: Side) => {
    hook();
    game().gazeOff = true;
    if (held[side]) return;
    const dev = w.IWER_DEVICE!;
    const p = dev.hands[side].position;
    held[side] = game().player.localToWorld(new Vector3(p.x, p.y, p.z));
    lastRoot[side].copy(held[side]!);
  };

  /** Steers a point of the hand to `to` (world) in `dur` seconds, with the pinch at `pinch` (0..1). */
  /** First use of a hand: a quick pinch where it hangs, so its offsets are known pinched and open. */
  const prime = async (side: Side) => {
    take(side);
    if (offsets[side][1].pinch) return;
    pinchNow[side] = 1;
    await wait(0.2);
    pinchNow[side] = 0;
    await wait(0.2);
  };

  const glide = async (
    side: Side,
    point: Point,
    to: Vector3 | (() => Vector3),
    dur: number,
    pinch = pinchNow[side],
    curve: Goal['curve'] = 'natural',
    intent?: Goal['intent'],
  ) => {
    await prime(side);
    return new Promise<void>((done) => {
      pinchNow[side] = pinch;
      const a = aim[side];
      const from = a && a.point === point ? a.at.clone() : measured(side, point, new Vector3());
      const target = typeof to === 'function' ? to() : to;
      const lift = curve === 'natural' && pinch < 0.15 && intent !== 'grip'
        ? Math.min(0.018, Math.max(0.004, from.distanceTo(target) * 0.08))
        : 0;
      const arc = curve === 'natural' && (intent === 'reach' || intent === 'release')
        ? (side === 'left' ? -1 : 1) * Math.min(0.012, Math.max(0.003, from.distanceTo(target) * 0.045))
        : 0;
      goals[side] = { point, intent, from, to: typeof to === 'function' ? to : to.clone(), t: 0, dur, pinch, curve, lift, arc, done };
    });
  };

  const wait = (s: number) => new Promise<void>((r) => setTimeout(r, s * 1000));
  const tweenPinch = async (side: Side, to: number, dur = 0.12) => {
    const from = pinchNow[side];
    const started = performance.now();
    for (;;) {
      const raw = Math.min(1, (performance.now() - started) / (dur * 1000));
      const k = raw * raw * (3 - 2 * raw);
      pinchNow[side] = from + (to - from) * k;
      if (raw >= 1) return;
      await wait(1 / 60);
    }
  };
  /** Keeps a two-hand grip on one clock, so sparse XR frames cannot see two separate gestures. */
  const tweenBothPinches = async (to: number, dur = 0.12) => {
    const fromLeft = pinchNow.left;
    const fromRight = pinchNow.right;
    const started = performance.now();
    for (;;) {
      const raw = Math.min(1, (performance.now() - started) / (dur * 1000));
      const k = raw * raw * (3 - 2 * raw);
      pinchNow.left = fromLeft + (to - fromLeft) * k;
      pinchNow.right = fromRight + (to - fromRight) * k;
      if (raw >= 1) return;
      await wait(1 / 60);
    }
  };
  const setPinch = async (side: Side, on: boolean) => {
    await prime(side);
    await tweenPinch(side, on ? 1 : 0);
  };

  /** Arena-local point on the floor (plus `up`, arena units) to world. */
  const local = (x: number, z: number, up = 0) => {
    const g = game();
    return g.root.localToWorld(new Vector3(x, g.arena.height(x, z) + up, z));
  };
  const named = (name: string) => {
    const g = game();
    if (name === 'menu') return g.menuButton.mesh.getWorldPosition(new Vector3());
    if (name === 'rematch') return g.rematchButton.mesh.getWorldPosition(new Vector3());
    const all = `${g.hub.debugPositions()} ${g.phase === 'forge' ? g.forge.debugPositions() : ''} ${g.phase === 'build' ? g.builder.debugPositions() : ''}`;
    const m = all.split(' ').find((s) => s.split('@')[0].toLowerCase() === name.toLowerCase());
    if (!m) throw new Error(`no "${name}" here; see state().targets`);
    const [x, y, z] = m.split('@')[1].split(',').map(Number);
    return new Vector3(x, y, z);
  };
  const above = (p: Vector3, dy: number) => p.clone().setY(p.y + dy);
  const idlePoint = (side: Side) => {
    const g = game();
    // Rest below the near table edge, like hands in the player's lap, so clips show only
    // deliberate reaches instead of two open hands hovering beside the arena.
    const x = g.arena.radius * (side === 'left' ? -1.3 : 1.3);
    return g.root.localToWorld(new Vector3(x, -0.11, g.arena.radius * 1.7));
  };
  const park = async (side: Side) => glide(side, 'pinch', idlePoint(side), 0.42, 0, 'natural', 'release');

  const api = {
    /** What an agent needs to choose the next move. */
    state() {
      const g = game();
      const top = (t: Game['mine']) => ({ x: +t.x.toFixed(3), z: +t.z.toFixed(3), spin: +t.spin.toFixed(2), alive: t.alive, state: t.state, r: +(Math.hypot(t.x, t.z) / g.arena.radius).toFixed(2) });
      const targets: Record<string, number[]> = {};
      const all = `${g.phase === 'hub' ? g.hub.debugPositions() : ''} ${g.phase === 'forge' ? g.forge.debugPositions() : ''} ${g.phase === 'build' ? g.builder.debugPositions() : ''}`;
      for (const s of all.split(' ').filter(Boolean)) targets[s.split('@')[0]] = s.split('@')[1].split(',').map(Number);
      if (g.menuButton.mesh.visible) targets.menu = g.menuButton.mesh.getWorldPosition(new Vector3()).toArray().map((n) => +n.toFixed(3));
      if (g.rematchButton.mesh.visible) targets.rematch = g.rematchButton.mesh.getWorldPosition(new Vector3()).toArray().map((n) => +n.toFixed(3));
      return {
        diagnostics: w.spinsmithDiagnostics?.() ?? null,
        phase: g.phase,
        label: g.label.current,
        level: g.progress.level,
        matches: g.progress.matches,
        guide: g.progress.guide,
        rival: g.rival?.name,
        rivalMove: g.rival?.move,
        rivalShape: g.rivalShapeKind ?? '',
        arena: g.arena.layout.name ?? '',
        build: { ...g.myBuild },
        opening: {
          zone: g.launchZoneKind,
          arena: g.launchArenaKind,
          timing: +g.launchTiming.toFixed(2),
          twist: +g.launchTwist.toFixed(2),
          pending: g.firstClashPending,
          outcome: g.openingOutcome,
          echo: g.lastOpeningTrace ? { zone: g.lastOpeningTrace.zone, outcome: g.lastOpeningTrace.outcome } : null,
          rivalRead: g.rivalRead ?? '',
          rematchTip: g.rematchTip ?? '',
          rivalPower: +g.rivalLaunchPower.toFixed(2),
          rivalAim: +g.rivalLaunchAim.toFixed(2),
          beatIn: g.ripBeatAt < 0 ? null : +(g.ripBeatAt - g.time).toFixed(2),
        },
        elapsed: +g.elapsed.toFixed(1),
        heat: [g.myPoints, g.theirPoints],
        score: [...g.barPoints],
        desk: {
          pending: !!g.deskVerdict,
          left: +(g.deskVerdict?.left ?? 0).toFixed(2),
          offDesk: !!g.theirView.offDesk,
          scored: !!g.deskKoScored,
          awarded: g.lastRoundHeat ?? 0,
          trophies: g.progress.deskTrophies?.map((t) => ({ rival: t.rival, angle: +t.angle.toFixed(2), date: t.date })) ?? [],
        },
        charges: g.charges.charges,
        intent: { ...g.handHoverClaim },
        rimExperiment: !!g.rimExperiment,
        overforge: g.overforgeMode ?? 'idle',
        palmBrace: !!g.palmBraceActive,
        crossguard: {
          active: !!g.crossguardActive,
          hits: g.crossguardHits ?? 0,
        },
        forgeWheel: {
          visible: !!g.forgeWheel?.visible,
          turn: +(g.forgeWheelTurn ?? 0).toFixed(2),
          current: +(g.forgeWheelCurrentTime ?? 0).toFixed(2),
          gap: +(g.forgeWheelGrabGap ?? -1).toFixed(3),
        },
        ember: { state: g.emberState ?? 0, gap: +(g.emberGrabGap ?? -1).toFixed(3) },
        palmGust: {
          active: (g.palmGustTime ?? 0) > 0,
          cooldown: +(g.palmGustCooldown ?? 0).toFixed(2),
          count: g.palmGustCount ?? 0,
          side: g.palmGustSide ?? null,
          direction: [+(g.palmGustDirection?.x ?? 0).toFixed(2), +(g.palmGustDirection?.y ?? 0).toFixed(2)],
          hits: g.palmGustHits ?? 0,
          riposte: !!g.palmGustRiposte,
          counterReady: !!g.riposteSide && (g.riposteUntil ?? -9) >= g.elapsed,
        },
        flick: { count: g.flickCount ?? 0, last: g.lastFlick ?? null },
        bracedLaunch: !!g.bracedLaunch,
        palmLauncher: g.palmLauncherSide ?? null,
        palmLauncherDebug: g.palmLauncherDebug ?? '',
        palmForge: !!g.palmForgeActive,
        outerRing: {
          state: g.outerRingState ?? 'idle',
          completed: !!g.outerRingCompleted,
          left: +(g.outerRingLeft ?? 0).toFixed(2),
          at: g.outerRingAt?.toArray().map((n) => +n.toFixed(3)) ?? null,
          goal: g.outerRingGoal?.toArray().map((n) => +n.toFixed(3)) ?? null,
        },
        anchor: g.anchorState ?? 'unsupported',
        morph: g.arenaMorph ? {
          scaleX: +g.arenaMorph.scaleX.toFixed(3),
          scaleZ: +g.arenaMorph.scaleZ.toFixed(3),
          tilt: +g.arenaMorph.tilt.toFixed(3),
          action: g.arenaForgeAction ?? 'none',
          swing: +(g.arenaForgeSwing ?? 0).toFixed(3),
          cancels: g.arenaForgeCancels ?? 0,
        } : null,
        gazeAssist: g.gazeAssist ? { ...g.gazeAssist } : null,
        bar: +g.forgeBar.value.toFixed(2),
        strikeCommitted: !!g.struckOnce,
        arenaRadius: g.arena.radius,
        mine: top(g.mine),
        rival_top: top(g.theirs),
        cups: { left: !!g.cups.left, right: !!g.cups.right, holding: !!(g.cups.left?.caught || g.cups.right?.caught) },
        grooves: g.arena.shapes.filter((s) => s.kind === 'groove').map((s) => ({ length: +(s.length ?? 0).toFixed(3), armed: s.boost !== 0 })),
        hands: { left: { tracked: g.hands.left.tracked, pinching: g.hands.left.pinching }, right: { tracked: g.hands.right.tracked, pinching: g.hands.right.pinching } },
        targets,
      };
    },

    /** Pinch a named thing (state().targets: play, forge, workshop, order, comfort, a forge part...) or a world point, and let go. */
    async tap(target: string | number[], side: Side = 'right') {
      const p = typeof target === 'string' ? named(target) : new Vector3(...(target as [number, number, number]));
      await glide(side, 'pinch', above(p, 0.06), 0.35, 0);
      await glide(side, 'pinch', p, 0.2, 0);
      await setPinch(side, true);
      await wait(0.15);
      await setPinch(side, false);
      await glide(side, 'pinch', above(p, 0.08), 0.25, 0);
      await park(side);
    },

    /** Pinch a named thing or point, carry it to another (or a world point), let go there. */
    async drag(from: string | number[], to: string | number[], side: Side = 'right') {
      const a = typeof from === 'string' ? named(from) : new Vector3(...(from as [number, number, number]));
      const b = typeof to === 'string' ? named(to) : new Vector3(...(to as [number, number, number]));
      await glide(side, 'pinch', above(a, 0.05), 0.35, 0);
      await glide(side, 'pinch', a, 0.2, 0);
      await setPinch(side, true);
      await glide(side, 'pinch', above(a, 0.08), 0.3);
      await glide(side, 'pinch', above(b, 0.06), 0.6);
      await glide(side, 'pinch', b, 0.25);
      await setPinch(side, false);
      await glide(side, 'pinch', above(b, 0.1), 0.25, 0);
      await park(side);
    },

    /** Seat the top on one open palm and fit a visible drawer part with the other hand. */
    async palmForge(part: string, topSide: Side = 'left') {
      const g = game();
      if (g.phase !== 'forge') throw new Error('Palm Forge only exists in the forge');
      const partSide: Side = topSide === 'left' ? 'right' : 'left';
      const top = named('top');
      const piece = named(part);
      const palm = g.root.localToWorld(new Vector3(topSide === 'left' ? -0.065 : 0.065, 0.09, 0.105));
      await setPinch(topSide, false);
      await glide(topSide, 'index', above(top, 0.05), 0.3, 0);
      await glide(topSide, 'index', top, 0.2, 0);
      await wait(0.2);
      await glide(topSide, 'index', palm, 0.4, 0);
      await glide(partSide, 'pinch', above(piece, 0.05), 0.3, 0);
      await glide(partSide, 'pinch', piece, 0.15, 0);
      await setPinch(partSide, true);
      await glide(partSide, 'pinch', above(palm, 0.04), 0.4);
      await glide(partSide, 'pinch', palm, 0.2);
      await setPinch(partSide, false);
      await wait(0.3);
      await Promise.all([park(topSide), park(partSide)]);
    },

    /** Workshop rim resize: pinch the rim and keep the hand on the arena plane while pulling. */
    async arenaResize(opts: { from?: string; to?: string; side?: Side } = {}) {
      const { from = 'arena_rim_clear', to = 'arena_rim_clear_out', side = 'right' } = opts;
      const a = named(from);
      const b = named(to);
      await glide(side, 'pinch', above(a, 0.06), 0.3, 0);
      await glide(side, 'pinch', a, 0.18, 0);
      await setPinch(side, true);
      await wait(0.12);
      await glide(side, 'pinch', b, 0.7, pinchNow[side], 'linear');
      await wait(0.12);
      await setPinch(side, false);
      await glide(side, 'pinch', above(b, 0.08), 0.25, 0);
      await park(side);
    },

    /**
     * The rip: pinch over your top's spot, pull back toward you and let go while still moving.
     * power 0..1 (from the pull's length and its speed at release), aim in degrees (+ = to the
     * right), steep 0..1 (pull upward: slower, more spin).
     */
    async rip(opts: { power?: number; aim?: number; steep?: number; twist?: number; at?: { x: number; z: number }; onBeat?: boolean; brace?: boolean; side?: Side } = {}) {
      const { power = 0.9, aim = 0, steep = 0, twist = 0, brace = false, side = 'right' } = opts;
      const g = game();
      const support: Side = side === 'left' ? 'right' : 'left';
      // The rival portal and the arena's match-size slide are filmed first. Waiting here keeps the
      // chosen launch point fixed in world space instead of chasing a moving arena.
      for (let i = 0; i < 160 && g.phase === 'ready' && (g.entrance || !g.sizeSettled); i++) await wait(0.05);
      g.devLaunchTwist = Math.max(-1, Math.min(1, twist));
      const at = opts.at ?? { x: g.mine.x, z: g.mine.z };
      const len = 0.22 * Math.min(1, Math.max(0.2, power / 0.4));
      const speed = Math.max(0.15, Math.min(1.3, (power - 0.4) / 0.6));
      for (let attempt = 0; attempt < 3; attempt++) {
        // Recompute world positions: the arena can still be completing its match-size slide during
        // a rival entrance, and a retry must follow its settled location.
        const start = local(at.x, at.z, 0.02);
        if (brace) {
          // The game seats the launcher under the palm midpoint, while the driver steers a named
          // joint. Offset the index target by the measured index-to-palm vector so the broad palm,
          // not a fingertip or an abstract pinch point, lands on the top.
          const h = g.hands[support];
          const palmNow = h.wrist.clone().lerp(h.index, 0.5);
          const indexTarget = local(at.x, at.z, 0.035).add(h.index.clone().sub(palmNow));
          await glide(support, 'index', indexTarget, 0.35, 0);
          for (let i = 0; i < 40 && g.palmLauncherSide !== support; i++) await wait(0.025);
          if (g.palmLauncherSide !== support) {
            const got = g.root.worldToLocal(g.hands[support].wrist.clone().lerp(g.hands[support].index, 0.5));
            const want = g.root.worldToLocal(local(at.x, at.z, 0.035));
            throw new Error(`open support palm did not accept the launcher (got ${got.toArray().map((n) => n.toFixed(3))}, want ${want.toArray().map((n) => n.toFixed(3))}, phase ${g.phase}, settled ${g.sizeSettled}, entrance ${!!g.entrance}, reason ${g.palmLauncherDebug ?? 'unknown'})`);
          }
        }
        const toward = g.root.localToWorld(new Vector3(0, 0, 1)).sub(g.root.position).setY(0).normalize();
        toward.applyAxisAngle(new Vector3(0, 1, 0), (-aim * Math.PI) / 180);
        const pull = toward.multiplyScalar(len * Math.cos((steep * Math.PI) / 2));
        pull.y = len * Math.sin((steep * Math.PI) / 2);
        await glide(side, 'pinch', start, 0.5, 0);
        await setPinch(side, true);
        await wait(0.2);
        if (g.phase !== 'pulling') {
          await setPinch(side, false);
          await wait(0.2);
          continue;
        }
        const end = start.clone().add(pull);
        // A real rip lets go while the hand is still moving: power is the speed at release and
        // fades within ~0.1 s of stopping, so open the fingers over the last 60 ms of the pull.
        const dur = len / speed;
        const letGo = (async () => {
          await wait(Math.max(0, dur - 0.06));
          if (opts.onBeat) g.ripBeatAt = g.time;
          await tweenPinch(side, 0, 0.06);
        })();
        await glide(side, 'pinch', end, dur, pinchNow[side], 'linear');
        await letGo;
        await wait(0.3);
        if ((g.phase as string) === 'fight') break;
        if (attempt === 2) throw new Error('rip did not build enough motion to launch');
      }
      await Promise.all(brace ? [park(side), park(support)] : [park(side)]);
    },

    /** The hero launch: one open hand braces the launcher while the other pulls the ripcord. */
    async dualRip(opts: { power?: number; aim?: number; steep?: number; twist?: number; at?: { x: number; z: number }; onBeat?: boolean; side?: Side } = {}) {
      await api.rip({ ...opts, brace: true });
    },

    /**
     * A ramp: pinch the floor just inside the target (the rival by default) and drag outward, so
     * the ramp throws it toward the rim. at: 'rival' | {x, z} (arena-local); angle: push
     * direction in degrees in the arena's frame (default: out from the middle through the target).
     */
    async ramp(opts: { at?: 'rival' | { x: number; z: number }; angle?: number; lead?: number; hold?: number; side?: Side } = {}) {
      const { at = 'rival', lead = 0.03, hold = 0.35, side = 'right' } = opts;
      const g = game();
      // Pick one spot before the reach: chasing a moving top makes the filmed hand zig-zag.
      const target = at === 'rival' ? { x: g.theirs.x, z: g.theirs.z } : { ...at };
      const r = Math.hypot(target.x, target.z);
      const inside = g.arena.radius * 0.8;
      if (r > inside) {
        target.x *= inside / r;
        target.z *= inside / r;
      }
      const out = opts.angle !== undefined ? (opts.angle * Math.PI) / 180 : Math.atan2(target.z, target.x);
      const dx = Math.cos(out);
      const dz = Math.sin(out);
      const x = target.x - dx * lead;
      const z = target.z - dz * lead;
      await glide(side, 'pinch', local(x, z, 0.004 + 0.05 / ARENA_SCALE), 0.2, 0);
      await glide(side, 'pinch', local(x, z, 0.004), 0.1, 0);
      const drag = local(x + dx * 0.025, z + dz * 0.025, 0.004);
      await setPinch(side, true);
      // A short grip beat makes the pinch readable in proof footage and mirrors the deliberate
      // pause a player naturally takes before pulling live arena material.
      await wait(0.28);
      await glide(side, 'pinch', drag, hold);
      await wait(0.18);
      await setPinch(side, false);
      await glide(side, 'pinch', above(drag, 0.08), 0.2, 0);
      await park(side);
    },

    /** Draws a one-use directional groove with an open index finger, then lifts to commit it. */
    async groove(opts: { at?: { x: number; z: number }; angle?: number; length?: number; side?: Side } = {}) {
      const { at = { x: -0.045, z: 0.02 }, angle = 15, length = 0.105, side = 'right' } = opts;
      const a = (angle * Math.PI) / 180;
      const end = { x: at.x + Math.cos(a) * length, z: at.z + Math.sin(a) * length };
      const before = game().arena.shapes.filter((s) => s.kind === 'groove').length;
      const startWorld = local(at.x, at.z, -0.002);
      const endWorld = local(end.x, end.z, -0.002);
      await setPinch(side, false);
      await glide(side, 'index', above(startWorld, 0.07), 0.25, 0);
      await glide(side, 'index', startWorld, 0.18, 0);
      await glide(side, 'index', endWorld, 0.55, 0, 'linear');
      await glide(side, 'index', above(endWorld, 0.08), 0.18, 0);
      await park(side);
      const after = game().arena.shapes.filter((s) => s.kind === 'groove').length;
      if (after <= before) throw new Error('fingertip groove did not commit');
    },

    /** Pinch a rim sector, pull its spring rail toward the middle, then release. */
    async rimSpring(opts: { angle?: number; pull?: number; side?: Side; target?: 'rival' | 'mine' | false } = {}) {
      const { angle = 35, pull = 0.04, side = 'right', target = 'rival' } = opts;
      const g = game();
      const a = (angle * Math.PI) / 180;
      // Non-circular arenas do not share `arena.radius` at every angle. Aim at the actual local
      // rim so the pinch claims a rim grip instead of accidentally beginning a floor ramp.
      const r = rimRadius(g.arena.layout, a) * 0.94;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const start = local(x, z, 0.004);
      const end = local(x - Math.cos(a) * pull, z - Math.sin(a) * pull, 0.004);
      await glide(side, 'pinch', above(start, 0.06), 0.3, 0);
      await glide(side, 'pinch', start, 0.15, 0);
      await setPinch(side, true);
      await wait(0.08);
      if (!g.rimPulls?.[side]) {
        const actual = g.root.worldToLocal(g.hands[side].pinch.clone());
        throw new Error(`rim grip was not claimed at n=${(Math.hypot(actual.x, actual.z) / rimRadius(g.arena.layout, Math.atan2(actual.z, actual.x))).toFixed(3)}, y=${actual.y.toFixed(3)}, floor=${g.arena.height(actual.x, actual.z).toFixed(3)}`);
      }
      // Readable grip beat, and long enough to satisfy the production anti-brush intent threshold
      // even when the emulator is rendering only a few XR frames per second.
      await wait(0.45);
      // Proof and regression runs need to demonstrate the tactical result, not merely a valid pull
      // into an empty sector. Stage one live top late enough that normal simulation cannot drift it
      // away before release; production gameplay is untouched because this exists only in DEV.
      if (target) {
        const top = target === 'mine' ? g.mine : g.theirs;
        const tr = rimRadius(g.arena.layout, a) * 0.76;
        Object.assign(top, {
          x: Math.cos(a) * tr,
          z: Math.sin(a) * tr,
          vx: Math.cos(a) * 0.025,
          vz: Math.sin(a) * 0.025,
          spin: Math.max(0.55, top.spin),
          state: 'spinning',
          finish: null,
          lifted: 0,
        });
      }
      await glide(side, 'pinch', end, 0.3, 1, 'natural', 'force');
      await setPinch(side, false);
      await glide(side, 'pinch', above(end, 0.08), 0.26, 0, 'natural', 'release');
      await park(side);
    },

    /** Grab the two forge grips on the near rim, squeeze/twist/tilt the bowl, then release its impulse. */
    async arenaForge(opts: { squeeze?: number; twist?: number; tilt?: number; hold?: number } = {}) {
      const { squeeze = 0.026, twist = 10, tilt = 0.025, hold = 0.35 } = opts;
      const g = game();
      if (g.phase !== 'fight') throw new Error('Arena Forge only exists during a fight');
      // The real grips (reach.ts): on the near half of the rim, where a seated player can reach.
      const [gl, gr] = forgeGrips(g.arena.layout);
      const turn = (twist * Math.PI) / 180;
      const startLeft = local(gl.x, gl.z, 0.004);
      const startRight = local(gr.x, gr.z, 0.004);
      await Promise.all([
        glide('left', 'pinch', above(startLeft, 0.06), 0.31, 0, 'natural', 'reach'),
        (async () => {
          await wait(0.045);
          await glide('right', 'pinch', above(startRight, 0.06), 0.34, 0, 'natural', 'reach');
        })(),
      ]);
      await Promise.all([
        glide('left', 'pinch', startLeft, 0.18, 0, 'natural', 'grip'),
        glide('right', 'pinch', startRight, 0.2, 0, 'natural', 'grip'),
      ]);
      // The comfort system mirrors a lone forge grip. Close together so the first hand is never
      // briefly interpreted as a complete one-hand forge before the second grip arrives.
      await tweenBothPinches(1, 0.15);
      await wait(0.12);
      // Squeeze, twist and tilt about the midpoint between the grips, as two real hands would.
      const mx = (gl.x + gr.x) / 2;
      const mz = (gl.z + gr.z) / 2;
      const half = Math.hypot(gr.x - gl.x, gr.z - gl.z) / 2;
      const a0 = Math.atan2(gr.z - gl.z, gr.x - gl.x) + turn;
      const targetHalf = Math.max(half * 0.72, half - squeeze);
      const targetLeft = local(mx - Math.cos(a0) * targetHalf, mz - Math.sin(a0) * targetHalf, 0.004 - tilt * 0.5);
      const targetRight = local(mx + Math.cos(a0) * targetHalf, mz + Math.sin(a0) * targetHalf, 0.004 + tilt * 0.5);
      await Promise.all([
        glide('left', 'pinch', targetLeft, 0.46, 1, 'natural', 'force'),
        glide('right', 'pinch', targetRight, 0.48, 1, 'natural', 'force'),
      ]);
      await wait(hold);
      // Release is the gameplay commit edge, so both fingers open together even though the reach
      // and grip are intentionally offset. Two separate release frames would spend two charges.
      await tweenBothPinches(0, 0.13);
      await Promise.all([
        glide('left', 'pinch', above(targetLeft, 0.09), 0.28, 0, 'natural', 'release'),
        glide('right', 'pinch', above(targetRight, 0.09), 0.3, 0, 'natural', 'release'),
      ]);
      await Promise.all([park('left'), park('right')]);
    },

    /** Competition hero move: throw your top onto the desk, catch it on an open palm, and sweep in. */
    async outerRingReturn(side: Side = 'right') {
      const g = game();
      if (g.phase !== 'fight') throw new Error('Outer Ring requires a fight');
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyO', shiftKey: true }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyO', shiftKey: true }));
      for (let i = 0; i < 260 && (g.outerRingState !== 'rescue' || !g.outerRingGoal || g.outerRingGoal.lengthSq() < 1e-6); i++) await wait(0.016);
      if (g.outerRingState !== 'rescue' || !g.outerRingAt || !g.outerRingGoal) throw new Error(`Outer Ring did not arm (${g.outerRingState ?? 'unknown'})`);
      const start = g.root.localToWorld(g.outerRingAt.clone());
      const goal = g.root.localToWorld(g.outerRingGoal.clone());
      await setPinch(side, false);
      await glide(side, 'palm', above(start, 0.04), 0.22, 0);
      // Follow the drifting desk top with relaxed fingers; the game's palm midpoint, not a pinch,
      // performs the catch. The wider dev tolerance covers IWER's generic open-hand proportions.
      await glide(side, 'palm', () => g.root.localToWorld(g.outerRingAt!.clone()), 0.22, 0);
      await glide(side, 'palm', goal, 0.65, 0, 'linear');
      for (let i = 0; i < 180 && String(g.outerRingState) !== 'returned'; i++) await wait(0.016);
      const returned = !!g.outerRingCompleted || String(g.outerRingState) === 'returned';
      await glide(side, 'palm', above(goal, 0.08), 0.2, 0);
      await park(side);
      // The visible return state intentionally fades back to idle after 1.2 game seconds. On a
      // slow headless run that fade can finish while the hand is merely parking, so remember the
      // successful transition rather than requiring a transient cosmetic state after cleanup.
      if (!returned) throw new Error(`Outer Ring ended ${g.outerRingState ?? 'unknown'}`);
    },

    /** A cup: a fingertip pressed down into the floor (fast enough to count), then lifted. at: 'rival' | 'mine' | {x, z}. */
    async cup(opts: { at?: 'rival' | 'mine' | { x: number; z: number }; side?: Side } = {}) {
      const { at = 'rival', side = 'right' } = opts;
      const g = game();
      // Commit to one anticipated contact point; following the top during the reach looks erratic.
      const top = at === 'rival' ? g.theirs : at === 'mine' ? g.mine : null;
      const target = top ? { x: top.x + top.vx * 0.2, z: top.z + top.vz * 0.2 } : (at as { x: number; z: number });
      await glide(side, 'index', local(target.x, target.z, 0.1 / ARENA_SCALE), 0.2, 0);
      const down = local(target.x, target.z, -0.025 / ARENA_SCALE);
      await glide(side, 'index', down, 0.08, 0, 'linear');
      await wait(0.1);
      await glide(side, 'index', above(down, 0.1), 0.25, 0);
      await park(side);
    },

    /** The sling: pinch the top held in your cup, pull back the other way, let go. angle: throw direction (degrees, arena frame); default out through the nearest side. */
    async sling(opts: { angle?: number; pull?: number; side?: Side } = {}) {
      const { pull = 0.08, side = 'right' } = opts;
      const g = game();
      const cup = g.cups.left?.caught ? g.cups.left : g.cups.right?.caught ? g.cups.right : g.cups.left ?? g.cups.right;
      if (!cup) throw new Error('no cup');
      const c = cup.shape;
      const a = opts.angle !== undefined ? (opts.angle * Math.PI) / 180 : Math.atan2(c.z, c.x);
      const p = local(c.x, c.z, 0.006);
      // Pull the opposite way, in the arena's frame.
      const back = local(c.x - Math.cos(a) * (pull / ARENA_SCALE), c.z - Math.sin(a) * (pull / ARENA_SCALE), 0.02);
      await glide(side, 'pinch', above(p, 0.05), 0.25, 0);
      await glide(side, 'pinch', p, 0.12, 0);
      await setPinch(side, true);
      await glide(side, 'pinch', back, 0.35);
      await setPinch(side, false);
      await glide(side, 'pinch', above(back, 0.08), 0.2, 0);
      await park(side);
    },

    /**
     * The strike: a palm slapped down beside the arena. `angle` is degrees, or a semantic target
     * for repeatable ultimate footage. Anvil wants `opposite-rival`; aimed seals want `rival`.
     */
    async slap(opts: { gentle?: boolean; side?: Side; angle?: SlapAim; fallback?: boolean } = {}) {
      const { gentle = false, side = 'right', angle = 60, fallback = false } = opts;
      const g = game();
      const tableY = g.root.position.y - PEDESTAL * g.rootK;
      const armedAtStart = g.phase === 'fight' && g.forgeBar.value >= 0.999;
      const aimAngle = () => {
        if (typeof angle === 'number') return (angle * Math.PI) / 180;
        const target = angle === 'mine' ? g.mine : g.theirs;
        return Math.atan2(target.z, target.x) + (angle === 'opposite-rival' ? Math.PI : 0);
      };
      // Steer the hand's lowest joint, while gameplay judges the palm midpoint. Keep enough room
      // outside the rim that either hand pose still leaves that midpoint in the strike band.
      // A capture is allowed one retry: under heavy video encoding IWER can skip the two frames
      // that establish the downward velocity. Never silently save footage in which the bar stayed
      // full and the advertised ultimate did not happen.
      const attempts = armedAtStart ? 2 : 1;
      for (let attempt = 0; attempt < attempts; attempt++) {
        const r = g.arena.radius * (attempt === 0 ? 1.55 : 1.35);
        const spotAt = (a: number) => g.root.localToWorld(new Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)).setY(tableY);
        let spot = spotAt(aimAngle());
        await glide(side, 'low', above(spot, 0.18), 0.35, 0);
        await wait(0.15);
        // Semantic targets orbit during the reach. Re-aim just before the palm drops instead of
        // guarding where the rival was a second ago.
        if (typeof angle !== 'number') {
          spot = spotAt(aimAngle());
          await glide(side, 'low', above(spot, 0.18), 0.16, 0);
        }
        // 300 ms still reads as a deliberate human palm slap, and retains the production minimum
        // downward speed even when IWER only samples the natural easing every 50 ms.
        await glide(side, 'low', spot, gentle ? 0.3 : 0.1, 0, gentle ? 'natural' : 'linear');
        // Low-IWER-fps capture runs may expose only a handful of stable contact frames. Keep the
        // dev hand visibly planted long enough to prove the production hold gesture every time.
        await wait(gentle ? 1.2 : 0.35);
        await glide(side, 'low', above(spot, 0.15), 0.3, 0);
        if (!armedAtStart || g.forgeBar.value < 0.999) break;
        await wait(0.15);
      }
      await park(side);
      // Recording-only safety net. The footage still contains the complete natural reach/drop,
      // but a heavily loaded emulator must not silently save a clip with no advertised effect.
      // Interactive QA leaves this false so a missed gesture remains a real test failure.
      if (armedAtStart && g.forgeBar.value >= 0.999 && fallback) {
        console.warn('[DRIVE] recorded slap missed under load; firing the dev-only capture fallback');
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyJ', key: 'j', shiftKey: true }));
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyJ', key: 'j', shiftKey: true }));
        await wait(0.2);
      }
      if (armedAtStart && g.forgeBar.value >= 0.999) throw new Error('slap did not spend the armed ultimate');
    },

    /** Pinch the raised forge seal, stamp it into the arena, and optionally steer its live field. */
    async stampUltimate(opts: { at?: 'rival' | 'mine' | { x: number; z: number }; steerAngle?: number; hold?: number; side?: Side } = {}) {
      const { at = 'rival', steerAngle, hold = 0.8, side = 'right' } = opts;
      const g = game();
      if (g.phase !== 'fight' || g.forgeBar.value < 0.999) throw new Error('ultimate is not ready');
      for (let i = 0; i < 80 && !g.overforgeSeal.visible; i++) await wait(0.025);
      if (!g.overforgeSeal.visible) throw new Error('forge seal did not rise');
      const from = g.overforgeSeal.getWorldPosition(new Vector3());
      const top = at === 'rival' ? g.theirs : at === 'mine' ? g.mine : null;
      const target = top ? { x: top.x, z: top.z } : { ...(at as { x: number; z: number }) };
      await glide(side, 'pinch', above(from, 0.06), 0.25, 0);
      await glide(side, 'pinch', from, 0.14, 0);
      await setPinch(side, true);
      await glide(side, 'pinch', above(local(target.x, target.z, 0), 0.07), 0.35);
      await glide(side, 'pinch', local(target.x, target.z, -0.008), 0.16, pinchNow[side], 'linear');
      await wait(0.12);
      if (steerAngle !== undefined && g.forgeBar.value < 0.999) {
        const a = (steerAngle * Math.PI) / 180;
        const r = g.arena.radius * 0.95;
        await glide(side, 'pinch', local(Math.cos(a) * r, Math.sin(a) * r, 0.06), Math.max(0.2, hold));
      } else await wait(hold);
      await setPinch(side, false);
      await glide(side, 'pinch', above(local(target.x, target.z, 0), 0.1), 0.2, 0);
      await park(side);
      if (g.forgeBar.value >= 0.999) throw new Error('seal stamp did not spend the armed ultimate');
    },

    /** Hold an open hand at one rim sector so it becomes the physical Palm Brace wall. */
    async palmBrace(opts: { angle?: number; hold?: number; side?: Side } = {}) {
      const { angle = 60, hold = 1.2, side = 'left' } = opts;
      const g = game();
      if (g.phase !== 'fight') throw new Error('Palm Brace only exists during a fight');
      const a = (angle * Math.PI) / 180;
      const r = g.arena.radius * 0.98;
      const at = local(Math.cos(a) * r, Math.sin(a) * r, 0.055);
      await glide(side, 'pinch', above(at, 0.08), 0.3, 0);
      await glide(side, 'pinch', at, 0.22, 0);
      await wait(hold);
      await park(side);
    },

    /** Hold both palms at different rim sectors and drive one top through the finite Crossguard. */
    async crossguard(opts: { leftAngle?: number; rightAngle?: number; hold?: number } = {}) {
      const { leftAngle = 155, rightAngle = 25, hold = 0.8 } = opts;
      const g = game();
      if (g.phase !== 'fight') throw new Error('Crossguard only exists during a fight');
      const before = g.crossguardHits ?? 0;
      // Keep the live tops away from the forming rail. Without this setup one can naturally cross
      // during the two-hand reach, consume the one-hit guard, and make a successful take look idle.
      Object.assign(g.mine, { x: -0.04, z: -0.055, vx: 0, vz: 0, spin: Math.max(0.65, g.mine.spin), state: 'spinning', sinceWall: 1 });
      Object.assign(g.theirs, { x: 0.04, z: -0.055, vx: 0, vz: 0, spin: Math.max(0.65, g.theirs.spin), state: 'spinning', sinceWall: 1 });
      const rimPoint = (degrees: number) => {
        const a = (degrees * Math.PI) / 180;
        const r = g.arena.radius * 0.98;
        return local(Math.cos(a) * r, Math.sin(a) * r, 0.052);
      };
      await Promise.all([
        glide('left', 'palm', above(rimPoint(leftAngle), 0.08), 0.25, 0),
        glide('right', 'palm', above(rimPoint(rightAngle), 0.08), 0.25, 0),
      ]);
      await Promise.all([
        glide('left', 'palm', rimPoint(leftAngle), 0.2, 0),
        glide('right', 'palm', rimPoint(rightAngle), 0.2, 0),
      ]);
      for (let i = 0; i < 30 && !g.crossguardActive && (g.crossguardHits ?? 0) <= before; i++) await wait(0.02);
      // A live top may cross on the same frame the second palm completes the rail. That is a
      // successful one-hit Crossguard, not a failed formation whose active state was missed.
      if ((g.crossguardHits ?? 0) > before) {
        await Promise.all([park('left'), park('right')]);
        return;
      }
      if (!g.crossguardActive || !g.crossguardA || !g.crossguardB) {
        throw new Error(`two open palms did not form Crossguard (elapsed ${g.elapsed.toFixed(2)}, blocked ${g.palmGustBlockedUntil.left.toFixed(2)}/${g.palmGustBlockedUntil.right.toFixed(2)}, angles ${g.palmBraceAngles.left}/${g.palmBraceAngles.right})`);
      }
      const ax = g.crossguardA.x;
      const az = g.crossguardA.z;
      const bx = g.crossguardB.x;
      const bz = g.crossguardB.z;
      const dx = bx - ax;
      const dz = bz - az;
      const length = Math.hypot(dx, dz) || 1;
      const nx = -dz / length;
      const nz = dx / length;
      Object.assign(g.theirs, {
        x: (ax + bx) * 0.5 + nx * 0.035,
        z: (az + bz) * 0.5 + nz * 0.035,
        vx: -nx * 0.32,
        vz: -nz * 0.32,
        spin: Math.max(0.65, g.theirs.spin),
        state: 'spinning',
        sinceWall: 1,
      });
      for (let i = 0; i < 80 && (g.crossguardHits ?? 0) <= before; i++) await wait(0.02);
      await wait(hold);
      await Promise.all([park('left'), park('right')]);
      if ((g.crossguardHits ?? 0) <= before) throw new Error('top crossed the line but Crossguard did not fire');
    },

    /** Pinch and turn the physical forge wheel through a quarter arc. */
    async forgeWheel(opts: { side?: Side; direction?: -1 | 1 } = {}) {
      const { side = 'right', direction = 1 } = opts;
      const g = game();
      if (g.phase !== 'fight') throw new Error('Forge Wheel is not available');
      for (let i = 0; i < 50 && !g.forgeWheel.visible; i++) await wait(0.02);
      if (!g.forgeWheel.visible) throw new Error('Forge Wheel did not appear after the fight settled');
      const handle = g.forgeWheelHandle.getWorldPosition(new Vector3());
      const center = g.forgeWheel.getWorldPosition(new Vector3());
      const px = g.forgeWheel.localToWorld(new Vector3(0.04, 0, 0)).sub(center);
      const py = g.forgeWheel.localToWorld(new Vector3(0, 0.04, 0)).sub(center);
      await glide(side, 'pinch', above(handle, 0.055), 0.22, 0);
      await glide(side, 'pinch', handle, 0.14, 0);
      await setPinch(side, true);
      // IWER's closed-hand joint can sit centimetres away from the visual pose authority. Preserve
      // the authored wheel path but offset its later samples so the reported pinch follows it.
      const closedCorrection = handle.clone().sub(g.hands[side].pinch);
      let claimed = g.forgeWheelHeld === side;
      let peakTurn = Math.abs(g.forgeWheelTurn ?? 0);
      // Hold each arc sample long enough for a low-fps IWER capture to expose it to the real
      // gesture system. The path is still one continuous, human-speed quarter turn.
      for (let i = 1; i <= 12; i++) {
        const a = direction * (i / 12) * (Math.PI / 2);
        const target = center.clone()
          .addScaledVector(py, Math.cos(a))
          .addScaledVector(px, Math.sin(a))
          .add(closedCorrection);
        await glide(side, 'pinch', target, 0.1, 1, 'linear');
        claimed ||= g.forgeWheelHeld === side;
        peakTurn = Math.max(peakTurn, Math.abs(g.forgeWheelTurn ?? 0));
      }
      await setPinch(side, false);
      await wait(0.15);
      await park(side);
      if ((g.forgeWheelCurrentTime ?? 0) <= 0) throw new Error(`quarter turn did not fire the arena current (claimed=${claimed}, peak=${peakTurn.toFixed(2)}, gap=${(g.forgeWheelGrabGap ?? -1).toFixed(3)})`);
    },

    /** Spawn the deterministic hard-hit rivet, catch it, and plant it low in the bowl. */
    async emberPlant(opts: { side?: Side; x?: number; z?: number } = {}) {
      const { side = 'right', x = 0.055, z = 0.035 } = opts;
      const g = game();
      if (g.phase !== 'fight') throw new Error('Ember rivet only exists during a fight');
      const interventionsBefore = g.interventionCount;
      if ((g.emberState ?? 0) === 0) g.spawnEmber(0, 0);
      for (let i = 0; i < 50 && (!g.emberPickup.visible || (g.emberState ?? 0) !== 1); i++) await wait(0.02);
      await wait(0.7);
      const ember = g.emberPickup.getWorldPosition(new Vector3());
      await glide(side, 'pinch', above(ember, 0.055), 0.24, 0);
      await glide(side, 'pinch', ember, 0.13, 0);
      await setPinch(side, true);
      // Closing IWER's hand can move its reported pinch joint far away from the open-hand target.
      // Approach once more while closed; production intentionally supports pinch-then-contact.
      await glide(side, 'pinch', () => g.emberPickup.getWorldPosition(new Vector3()), 0.2, 1, 'linear');
      for (let i = 0; i < 30 && (g.emberState ?? 0) !== 2; i++) await wait(0.02);
      if ((g.emberState ?? 0) !== 2) throw new Error('pinch did not catch the ember rivet');
      const target = local(x, z, 0.018);
      await glide(side, 'pinch', above(target, 0.07), 0.3, 1);
      await glide(side, 'pinch', target, 0.18, 1, 'linear');
      await setPinch(side, false);
      // A top can hit the planted bumper on the very next physics frame and consume state 3.
      // The intervention counter is the durable proof that the release authored the rivet.
      for (let i = 0; i < 12 && g.interventionCount === interventionsBefore; i++) await wait(0.02);
      await park(side);
      if (g.interventionCount === interventionsBefore) throw new Error('rivet did not plant as a bumper');
    },

    /** Sweep a relaxed open palm across the inner bowl so the real gesture drives Forge Gust. */
    async palmGust(opts: { angle?: number; side?: Side; riposte?: boolean; settle?: number } = {}) {
      const { angle = 0, side = 'right', riposte = false, settle = 0.55 } = opts;
      if (game().phase !== 'fight') throw new Error('Forge Gust only exists during a fight');
      if (riposte) {
        game().riposteSide = side;
        game().riposteUntil = game().elapsed + 1;
        game().riposteTop = game().theirs;
      }
      const a = (angle * Math.PI) / 180;
      const r = game().arena.radius * 0.58;
      const start = local(-Math.cos(a) * r, -Math.sin(a) * r, 0.065);
      const end = local(Math.cos(a) * r, Math.sin(a) * r, 0.065);
      const follow = end.clone().add(end.clone().sub(start).setLength(0.018));
      const before = game().palmGustCount ?? 0;
      await setPinch(side, false);
      await glide(side, 'palm', above(start, 0.07), 0.32, 0, 'natural', 'reach');
      await glide(side, 'palm', start, 0.2, 0, 'natural', 'grip');
      // Hold one readable beat before the sweep. Besides communicating intent, this gives even a
      // heavily loaded IWER capture two stationary frames to arm the production recognizer.
      await wait(settle);
      // Keep the combat stroke at constant velocity: recorder load can leave only a handful of XR
      // samples, and the production recognizer must still see a fast path through the whole bowl.
      await glide(side, 'palm', end, 0.32, 0, 'linear');
      await glide(side, 'palm', follow, 0.1, 0, 'linear');
      await wait(0.22);
      await glide(side, 'palm', above(follow, 0.08), 0.26, 0, 'natural', 'release');
      await park(side);
      if ((game().palmGustCount ?? 0) <= before) throw new Error('open-palm sweep did not trigger Forge Gust');
    },

    /**
     * Lower an open index beside a top, then swing it straight through at `speed` real m/s. The
     * real fingertip collider decides the hit; the probe only makes the rival tired and still so
     * the proof is repeatable.
     */
    async flick(opts: { target?: 'rival' | 'mine'; angle?: number; speed?: number; side?: Side } = {}) {
      const { target = 'rival', angle = 0, speed = 1.4, side = 'right' } = opts;
      const g = game();
      if (g.phase !== 'fight') throw new Error('a flick only exists during a fight');
      const top = target === 'rival' ? g.theirs : g.mine;
      const a = (angle * Math.PI) / 180;
      const dx = Math.cos(a);
      const dz = Math.sin(a);
      const r = g.arena.radius * 0.4;
      Object.assign(top, { x: -dx * r * 0.2, z: -dz * r * 0.2, vx: 0, vz: 0, spin: 0.3 });
      const back = 0.05;
      const start = () => local(top.x - dx * back, top.z - dz * back, 0.008);
      const before = g.flickCount ?? 0;
      await setPinch(side, false);
      await glide(side, 'index', () => above(start(), 0.06), 0.3, 0, 'natural', 'reach');
      await glide(side, 'index', start, 0.16, 0, 'natural', 'grip');
      Object.assign(top, { vx: 0, vz: 0 });
      // Constant velocity through the top: the collider must see a real swing, not a teleport.
      const travel = back + 0.06;
      const end = local(top.x + dx * 0.06, top.z + dz * 0.06, 0.008);
      await glide(side, 'index', end, (travel * ARENA_SCALE) / speed, 0, 'linear');
      await wait(0.15);
      // Lift clear of the bowl before going home, as a hand does: parking low would sweep the rim.
      await glide(side, 'index', above(end, 0.08), 0.24, 0, 'natural', 'release');
      await glide(side, 'index', above(local(0, g.arena.radius * 1.5), 0.1), 0.3, 0, 'natural', 'release');
      await park(side);
      if ((game().flickCount ?? 0) <= before) throw new Error(`fingertip swing did not flick the ${target} top`);
      return { flicks: (game().flickCount ?? 0) - before };
    },

    /** Prepare one outward-moving rival, parry it with an open palm, then sweep that force inward. */
    async counterflow(opts: { angle?: number; side?: Side } = {}) {
      const { angle = 0, side = 'right' } = opts;
      const g = game();
      if (g.phase !== 'fight') throw new Error('Counterflow only exists during a fight');
      // This driver is also the reusable proof shot. Keep an unrelated ready ultimate's raised
      // seal from hiding the hand, the parried top, and the return corridor.
      g.forgeBar.value = Math.min(g.forgeBar.value, 0.7);
      const a = (angle * Math.PI) / 180;
      const ux = Math.cos(a);
      const uz = Math.sin(a);
      const top = g.theirs;
      const brace = local(ux * g.arena.radius * 0.98, uz * g.arena.radius * 0.98, 0.05);
      const start = local(ux * g.arena.radius * 0.58, uz * g.arena.radius * 0.58, 0.065);
      const end = local(-ux * g.arena.radius * 0.58, -uz * g.arena.radius * 0.58, 0.065);
      const follow = end.clone().add(end.clone().sub(start).setLength(0.018));
      const beforeCount = g.palmGustCount ?? 0;
      const beforeCharges = g.charges.charges;
      await setPinch(side, false);
      // The parry window is timing-critical: arrive at the brace with constant speed so IWER's
      // sparse low-fps samples still include the outward-moving contact frame.
      await glide(side, 'palm', above(brace, 0.07), 0.2, 0, 'linear');
      await glide(side, 'palm', brace, 0.12, 0, 'linear');
      // Establish the visible palm wall before releasing the test top. Otherwise the top can reach
      // the physical rail during the hand's approach and the arena—not the player's palm—rebounds it.
      Object.assign(top, {
        x: ux * g.arena.radius * 0.82,
        z: uz * g.arena.radius * 0.82,
        vx: ux * 0.24,
        vz: uz * 0.24,
        spin: Math.max(0.55, top.spin),
        state: 'spinning',
        sinceWall: 1,
      });
      for (let i = 0; i < 30 && g.riposteSide !== side; i++) await wait(0.01);
      if (g.riposteSide !== side) throw new Error('open palm did not earn a riposte window');
      await glide(side, 'palm', start, 0.18, 0, 'natural', 'grip');
      // Settle at the sweep origin long enough for the real recognizer to distinguish an intended
      // Counterflow from the preceding parry/reposition. This also gives the move a readable beat.
      await wait(0.55);
      await glide(side, 'palm', end, 0.3, 0, 'linear', 'force');
      await glide(side, 'palm', follow, 0.1, 0, 'linear');
      const countered = (g.palmGustCount ?? 0) > beforeCount && !!g.palmGustRiposte;
      await park(side);
      if (!countered) throw new Error('parry sweep did not trigger Counterflow');
      if (g.charges.charges !== beforeCharges) {
        throw new Error(`Counterflow changed shaping charges (${beforeCharges} -> ${g.charges.charges}; elapsed ${g.elapsed.toFixed(2)}; riposteUntil ${(g.riposteUntil ?? -9).toFixed(2)}; gustRiposte ${!!g.palmGustRiposte})`);
      }
    },

    /** Moves a point of a hand to a world point in `dur` seconds (low-level). */
    async move(side: Side, to: number[], dur = 0.3, point: Point = 'pinch') {
      await glide(side, point, new Vector3(...(to as [number, number, number])), dur);
    },
    /** Park an open pinch point over an authored arena sector and report the action preview. */
    async hoverArena(opts: { n: number; angle: number; side?: Side }) {
      const { n, angle, side = 'right' } = opts;
      const g = game();
      const r = rimRadius(g.arena.layout, angle) * n;
      const target = local(Math.cos(angle) * r, Math.sin(angle) * r, 0.025);
      g.labelTimer = 0;
      await setPinch(side, false);
      await glide(side, 'pinch', target, 0.28, 0);
      // Re-arm only the transient preview after the reach. A clash/rivet message may legitimately
      // use the shared card during the approach; the next real update now proves the hover copy.
      g.handHoverClaim[side] = '';
      g.labelTimer = 0;
      await wait(0.08);
      return { claim: g.handHoverClaim[side], label: g.label.current };
    },
    pinch: setPinch,
    /** Calibrates the emulated fingers before a recording, so the calibration pose is not filmed. */
    async prepare() {
      await Promise.all((['left', 'right'] as const).map((side) => prime(side)));
      await Promise.all((['left', 'right'] as const).map((side) => park(side)));
      await wait(0.2);
    },
    /** Returns one or both hands to their relaxed table-edge pose. */
    async park(side?: Side) {
      await Promise.all((side ? [side] : (['left', 'right'] as const)).map((s) => park(s)));
    },
    /** Photo mode for store art: cards, buttons and stamps hidden; the hands moved out of view. */
    async photo(on = true) {
      game().photo = on;
      if (!on) return api.rest();
      const g = game();
      const low = g.root.localToWorld(new Vector3(0, -0.6, 0.6));
      await Promise.all((['left', 'right'] as const).map((side) => glide(side, 'pinch', low.clone().setX(low.x + (side === 'left' ? -0.3 : 0.3)), 0.2, 0)));
    },
    /** Sets a challenge code (as ?vs=CODE would) for the next match. */
    challenge(code: string) {
      sessionStorage.setItem('spinsmith.vs', code);
    },
    /** Presses a dev key (README: 'KeyJ' fills the bar, 'KeyK' shatters the rival, 'KeyT' starts its tell). */
    key(code: string, shift = false) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code.replace('Key', '').toLowerCase(), shiftKey: shift }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code, key: code.replace('Key', '').toLowerCase(), shiftKey: shift }));
    },
    /** A game field by dotted path ('hub.held', 'theirs.spin'), for debugging. */
    peek(path: string) {
      const v = path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], game());
      try {
        return JSON.parse(JSON.stringify(v, (_k, x) => (typeof x === 'object' && x && 'isObject3D' in x ? `[${(x as { type: string }).type}]` : x)));
      } catch {
        return String(v);
      }
    },
    wait,
    /** Waits for the fight clock, which can run slower than wall time while recording. */
    async fightAt(seconds: number) {
      while (game().phase === 'fight' && game().elapsed < seconds) await wait(1 / 30);
    },
    /** Starts over as a prepared level-8 smith (`demo`) or a new player (`fresh`); the page reloads, then enter XR again. */
    async demo() {
      const m = await import('./game/demo-save.js');
      m.demoSave(localStorage);
      setTimeout(() => location.reload(), 50);
    },
    async fresh() {
      const m = await import('./game/demo-save.js');
      m.freshSave(localStorage);
      setTimeout(() => location.reload(), 50);
    },
    /** Gives a hand back to the emulator's own controls. */
    rest(side?: Side) {
      for (const s of side ? [side] : (['left', 'right'] as const)) {
        held[s] = null;
        goals[s] = null;
        aim[s] = null;
        pinchNow[s] = 0;
        lastPinch[s] = 0;
        // A later XR session may rebuild the emulated hand skeleton. Recalibrate its open/closed
        // fingertip offsets on the next take instead of steering with measurements from that old rig.
        offsets[s][0] = {};
        offsets[s][1] = {};
        w.IWER_DEVICE?.hands[s].updatePinchValue(0);
      }
      if (!held.left && !held.right && w.__game) w.__game.gazeOff = false;
    },
    /** Runs a list of [name, ...args] steps in order and returns the state after. */
    async run(steps: [string, ...unknown[]][]) {
      let out: unknown;
      for (const [name, ...args] of steps) {
        const fn = (api as unknown as Record<string, (...a: unknown[]) => unknown>)[name];
        if (!fn) throw new Error(`unknown step ${name}`);
        out = await fn(...args);
      }
      return out === undefined ? api.state() : out;
    },
  };
  w.drive = api;
  // For recording (scripts/drive.mjs): the game's sound as a stream.
  void import('./game/audio.js').then((m) => ((window as unknown as { __audioTap: () => MediaStream | null }).__audioTap = m.audioTap));
}
