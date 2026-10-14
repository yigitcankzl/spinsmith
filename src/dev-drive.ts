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

type Side = 'left' | 'right';
type Point = 'pinch' | 'index' | 'low';
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
  arena: { radius: number; layout: { name?: string }; height(x: number, z: number): number; floorHeight(n: number): number };
  mine: { x: number; z: number; vx: number; vz: number; spin: number; alive: boolean; state: string };
  theirs: { x: number; z: number; vx: number; vz: number; spin: number; alive: boolean; state: string };
  myPoints: number;
  theirPoints: number;
  forgeBar: { value: number };
  charges: { charges: number };
  cups: Record<Side, { shape: { x: number; z: number }; caught: unknown } | null>;
  label: { current: string };
  rival: { name: string; move: string };
  hub: { debugPositions(): string };
  forge: { debugPositions(): string };
  builder: { debugPositions(): string };
  myBuild: { ring: string; core: string; tip: string; spin: number; color: number; emblem?: number; seal?: string };
  progress: { level: number; matches: number; guide: string };
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
  from: Vector3;
  /** A fixed point, or one followed each frame (a moving top). */
  to: Vector3 | (() => Vector3);
  t: number;
  dur: number;
  pinch: number;
  curve: 'natural' | 'linear';
  done: () => void;
}

/** Pedestal height under the arena floor (m), as placement.ts. */
const PEDESTAL = 0.08;
const ARENA_SCALE = 2.4;

export function installDriver() {
  const w = window as unknown as { IWER_DEVICE?: { hands: Record<Side, EmuHand> }; transformHandles?: Map<string, EmuHandle>; __game?: Game; drive?: unknown };
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
      // Reaches ease in and out like a hand; fast physical gestures keep their measured speed.
      const k = g.curve === 'natural' ? raw * raw * (3 - 2 * raw) : raw;
      aim[side] = { point: g.point, at: new Vector3().lerpVectors(g.from, typeof g.to === 'function' ? g.to() : g.to, k) };
      if (raw >= 1) {
        goals[side] = null;
        g.done();
      }
    }
    // What the game saw last frame: each point's offset from the root, per pinch state.
    for (const pt of ['pinch', 'index', 'low'] as const) {
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
    if (hooked) return;
    const dev = w.IWER_DEVICE;
    if (!dev) throw new Error('no emulator (IWER_DEVICE)');
    hooked = true;
    // IWER may replace a hand's onFrameStart callback when an immersive session settles. Drive
    // the public hand state from the page's frame clock instead; IWER consumes it on its next XR
    // frame, and a gesture can no longer stall halfway through after that callback is replaced.
    const ensureHook = (side: Side) => {
      const hand = dev.hands[side];
      const current = hand.onFrameStart as EmuHand['onFrameStart'] & { __spinDrive?: boolean };
      if (current.__spinDrive) return;
      const original = current.bind(hand);
      const wrapped = ((frame: unknown) => {
        frameHook(side, hand, false);
        original(frame);
      }) as EmuHand['onFrameStart'] & { __spinDrive?: boolean };
      wrapped.__spinDrive = true;
      hand.onFrameStart = wrapped;
    };
    const tick = () => {
      if (!hooked) return;
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
  ) => {
    await prime(side);
    return new Promise<void>((done) => {
      pinchNow[side] = pinch;
      const a = aim[side];
      const from = a && a.point === point ? a.at.clone() : measured(side, point, new Vector3());
      goals[side] = { point, from, to: typeof to === 'function' ? to : to.clone(), t: 0, dur, pinch, curve, done };
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
  const park = async (side: Side) => glide(side, 'pinch', idlePoint(side), 0.3, 0);

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
        phase: g.phase,
        label: g.label.current,
        level: g.progress.level,
        matches: g.progress.matches,
        guide: g.progress.guide,
        rival: g.rival?.name,
        rivalMove: g.rival?.move,
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
        charges: g.charges.charges,
        rimExperiment: !!g.rimExperiment,
        bar: +g.forgeBar.value.toFixed(2),
        arenaRadius: g.arena.radius,
        mine: top(g.mine),
        rival_top: top(g.theirs),
        cups: { left: !!g.cups.left, right: !!g.cups.right, holding: !!(g.cups.left?.caught || g.cups.right?.caught) },
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
    async rip(opts: { power?: number; aim?: number; steep?: number; twist?: number; at?: { x: number; z: number }; onBeat?: boolean; side?: Side } = {}) {
      const { power = 0.9, aim = 0, steep = 0, twist = 0, side = 'right' } = opts;
      const g = game();
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
        await glide(side, 'pinch', end, len / speed, pinchNow[side], 'linear');
        if (opts.onBeat) g.ripBeatAt = g.time;
        await tweenPinch(side, 0, 0.12);
        await wait(0.3);
        if ((g.phase as string) === 'fight') break;
        if (attempt === 2) throw new Error('rip did not build enough motion to launch');
      }
      await park(side);
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
      await glide(side, 'pinch', drag, hold);
      await setPinch(side, false);
      await glide(side, 'pinch', above(drag, 0.08), 0.2, 0);
      await park(side);
    },

    /** Experimental ?rim move: pinch a rim sector, pull it toward the middle, then release. */
    async rimSpring(opts: { angle?: number; pull?: number; side?: Side } = {}) {
      const { angle = 35, pull = 0.04, side = 'right' } = opts;
      const g = game();
      if (!g.rimExperiment) throw new Error('rimSpring needs ?rim in the page URL');
      const a = (angle * Math.PI) / 180;
      const r = g.arena.radius * 0.94;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const start = local(x, z, 0.004);
      const end = local(x - Math.cos(a) * pull, z - Math.sin(a) * pull, 0.004);
      await glide(side, 'pinch', above(start, 0.06), 0.3, 0);
      await glide(side, 'pinch', start, 0.15, 0);
      await setPinch(side, true);
      await glide(side, 'pinch', end, 0.28);
      await setPinch(side, false);
      await glide(side, 'pinch', above(end, 0.08), 0.2, 0);
      await park(side);
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
        await glide(side, 'low', spot, gentle ? 0.6 : 0.1, 0, gentle ? 'natural' : 'linear');
        await wait(gentle ? 0.6 : 0.35);
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

    /** Moves a point of a hand to a world point in `dur` seconds (low-level). */
    async move(side: Side, to: number[], dur = 0.3, point: Point = 'pinch') {
      await glide(side, point, new Vector3(...(to as [number, number, number])), dur);
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
