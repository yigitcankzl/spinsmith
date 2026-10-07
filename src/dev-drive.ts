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
  onFrameStart(frame: unknown): void;
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
  arena: { radius: number; layout: unknown; height(x: number, z: number): number; floorHeight(n: number): number };
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
  progress: { level: number; matches: number; guide: string };
  SPAWN: number;
  gazeOff: boolean;
  menuButton: { mesh: { visible: boolean; getWorldPosition(v: Vector3): Vector3 } };
}

interface Goal {
  point: Point;
  from: Vector3;
  /** A fixed point, or one followed each frame (a moving top). */
  to: Vector3 | (() => Vector3);
  t: number;
  dur: number;
  pinch: number;
  done: () => void;
}

/** Pedestal height under the arena floor (m), as placement.ts. */
const PEDESTAL = 0.08;
const ARENA_SCALE = 2.4;

export function installDriver() {
  const w = window as unknown as { IWER_DEVICE?: { hands: Record<Side, EmuHand> }; __game?: Game; drive?: unknown };
  const goals: Record<Side, Goal | null> = { left: null, right: null };
  /** Where each held hand's steered point should be now. */
  const aim: Record<Side, { point: Point; at: Vector3 } | null> = { left: null, right: null };
  /** Hands the driver holds (until rest()); their last commanded root, world space. */
  const held: Record<Side, Vector3 | null> = { left: null, right: null };
  const pinchNow: Record<Side, number> = { left: 0, right: 0 };
  const lastRoot: Record<Side, Vector3> = { left: new Vector3(), right: new Vector3() };
  const lastPinch: Record<Side, number> = { left: 0, right: 0 };
  const offsets: Record<Side, [Partial<Record<Point, Vector3>>, Partial<Record<Point, Vector3>>]> = { left: [{}, {}], right: [{}, {}] };
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

  const frameHook = (side: Side, hand: EmuHand) => {
    const g = goals[side];
    const root = held[side];
    if (!root || !w.__game) return;
    const now = performance.now();
    const dt = Math.min(0.1, (now - lastAt[side]) / 1000);
    lastAt[side] = now;
    if (g) {
      g.t += dt;
      const k = g.dur > 0 ? Math.min(1, g.t / g.dur) : 1;
      aim[side] = { point: g.point, at: new Vector3().lerpVectors(g.from, typeof g.to === 'function' ? g.to() : g.to, k) };
      if (k >= 1) {
        goals[side] = null;
        g.done();
      }
    }
    // What the game saw last frame: each point's offset from the root, per pinch state.
    for (const pt of ['pinch', 'index', 'low'] as const) {
      const o = offsets[side][lastPinch[side] > 0.5 ? 1 : 0];
      measured(side, pt, o[pt] ?? (o[pt] = new Vector3())).sub(lastRoot[side]);
    }
    // Keep the steered point on its target (the fingers closing moves it): the offset from the
    // root to that point, as the game saw it last frame.
    // What the game saw last frame: each point's offset from the root, per pinch state.
    for (const pt of ['pinch', 'index', 'low'] as const) {
      const o = offsets[side][lastPinch[side] > 0.5 ? 1 : 0];
      measured(side, pt, o[pt] ?? (o[pt] = new Vector3())).sub(lastRoot[side]);
    }
    // Keep the steered point on its target: its offset from the root as the game saw it last frame,
    // kept per pinch state, so closing the fingers does not first move the point (a pinch that
    // drifts reads as a drag, not a tap).
    const a = aim[side];
    if (a) {
      const was = lastPinch[side] > 0.5 ? 1 : 0;
      const now = pinchNow[side] > 0.5 ? 1 : 0;
      root.copy(a.at).sub(offsets[side][now][a.point] ?? offsets[side][was][a.point]!);
    }
    lastPinch[side] = pinchNow[side];
    hand.updatePinchValue(pinchNow[side]);
    lastRoot[side].copy(root);
    const local = game().player.worldToLocal(v.copy(root));
    hand.position.set(local.x, local.y, local.z);
  };

  const hook = () => {
    if (hooked) return;
    const dev = w.IWER_DEVICE;
    if (!dev) throw new Error('no emulator (IWER_DEVICE)');
    for (const side of ['left', 'right'] as const) {
      const hand = dev.hands[side];
      const orig = hand.onFrameStart.bind(hand);
      hand.onFrameStart = (frame: unknown) => {
        frameHook(side, hand);
        orig(frame);
      };
    }
    hooked = true;
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

  const glide = async (side: Side, point: Point, to: Vector3 | (() => Vector3), dur: number, pinch = pinchNow[side]) => {
    await prime(side);
    return new Promise<void>((done) => {
      pinchNow[side] = pinch;
      const a = aim[side];
      const from = a && a.point === point ? a.at.clone() : measured(side, point, new Vector3());
      goals[side] = { point, from, to: typeof to === 'function' ? to : to.clone(), t: 0, dur, pinch, done };
    });
  };

  const wait = (s: number) => new Promise<void>((r) => setTimeout(r, s * 1000));
  const setPinch = async (side: Side, on: boolean) => {
    await prime(side);
    pinchNow[side] = on ? 1 : 0;
    await wait(0.12);
  };

  /** Arena-local point on the floor (plus `up`, arena units) to world. */
  const local = (x: number, z: number, up = 0) => {
    const g = game();
    return g.root.localToWorld(new Vector3(x, g.arena.height(x, z) + up, z));
  };
  const named = (name: string) => {
    const g = game();
    if (name === 'menu') return g.menuButton.mesh.getWorldPosition(new Vector3());
    const all = `${g.hub.debugPositions()} ${g.phase === 'forge' ? g.forge.debugPositions() : ''}`;
    const m = all.split(' ').find((s) => s.split('@')[0].toLowerCase() === name.toLowerCase());
    if (!m) throw new Error(`no "${name}" here; see state().targets`);
    const [x, y, z] = m.split('@')[1].split(',').map(Number);
    return new Vector3(x, y, z);
  };
  const above = (p: Vector3, dy: number) => p.clone().setY(p.y + dy);

  const api = {
    /** What an agent needs to choose the next move. */
    state() {
      const g = game();
      const top = (t: Game['mine']) => ({ x: +t.x.toFixed(3), z: +t.z.toFixed(3), spin: +t.spin.toFixed(2), alive: t.alive, state: t.state, r: +(Math.hypot(t.x, t.z) / g.arena.radius).toFixed(2) });
      const targets: Record<string, number[]> = {};
      const all = `${g.phase === 'hub' ? g.hub.debugPositions() : ''} ${g.phase === 'forge' ? g.forge.debugPositions() : ''}`;
      for (const s of all.split(' ').filter(Boolean)) targets[s.split('@')[0]] = s.split('@')[1].split(',').map(Number);
      if (g.menuButton.mesh.visible) targets.menu = g.menuButton.mesh.getWorldPosition(new Vector3()).toArray().map((n) => +n.toFixed(3));
      return {
        phase: g.phase,
        label: g.label.current,
        level: g.progress.level,
        matches: g.progress.matches,
        guide: g.progress.guide,
        rival: g.rival?.name,
        rivalMove: g.rival?.move,
        elapsed: +g.elapsed.toFixed(1),
        heat: [g.myPoints, g.theirPoints],
        charges: g.charges.charges,
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
    },

    /**
     * The rip: pinch over your top's spot, pull back toward you and let go while still moving.
     * power 0..1 (from the pull's length and its speed at release), aim in degrees (+ = to the
     * right), steep 0..1 (pull upward: slower, more spin).
     */
    async rip(opts: { power?: number; aim?: number; steep?: number; side?: Side } = {}) {
      const { power = 0.9, aim = 0, steep = 0, side = 'right' } = opts;
      const g = game();
      const start = local(g.mine.x, g.mine.z, 0.02);
      // Toward the player in the arena's frame, turned by the aim: the top goes the other way.
      const toward = g.root.localToWorld(new Vector3(0, 0, 1)).sub(g.root.position).setY(0).normalize();
      toward.applyAxisAngle(new Vector3(0, 1, 0), (-aim * Math.PI) / 180);
      const len = 0.22 * Math.min(1, Math.max(0.2, power / 0.4));
      const speed = Math.max(0.15, Math.min(1.3, (power - 0.4) / 0.6));
      const pull = toward.multiplyScalar(len * Math.cos((steep * Math.PI) / 2));
      pull.y = len * Math.sin((steep * Math.PI) / 2);
      await glide(side, 'pinch', above(start, 0.05), 0.4, 0);
      await glide(side, 'pinch', start, 0.2, 0);
      await setPinch(side, true);
      await wait(0.2);
      const end = start.clone().add(pull);
      await glide(side, 'pinch', end, len / speed);
      // Let go mid-motion: the release keeps the speed.
      const over = end.clone().add(pull.clone().multiplyScalar(0.15));
      pinchNow[side] = 0;
      await glide(side, 'pinch', over, (len * 0.15) / speed, 0);
      await wait(0.2);
    },

    /**
     * A ramp: pinch the floor just inside the target (the rival by default) and drag outward, so
     * the ramp throws it toward the rim. at: 'rival' | {x, z} (arena-local); angle: push
     * direction in degrees in the arena's frame (default: out from the middle through the target).
     */
    async ramp(opts: { at?: 'rival' | { x: number; z: number }; angle?: number; lead?: number; hold?: number; side?: Side } = {}) {
      const { at = 'rival', lead = 0.03, hold = 0.35, side = 'right' } = opts;
      const g = game();
      // Where the rival will be when the ramp rises (about 0.4 s on), or a fixed spot.
      const target = () => (at === 'rival' ? { x: g.theirs.x + g.theirs.vx * 0.4, z: g.theirs.z + g.theirs.vz * 0.4 } : at);
      const dir = () => {
        const t = target();
        const out = opts.angle !== undefined ? (opts.angle * Math.PI) / 180 : Math.atan2(t.z, t.x);
        return { t, dx: Math.cos(out), dz: Math.sin(out) };
      };
      const spot = (up: number) => () => {
        const { t, dx, dz } = dir();
        return local(t.x - dx * lead, t.z - dz * lead, 0.004 + up);
      };
      await glide(side, 'pinch', spot(0.05 / ARENA_SCALE), 0.2, 0);
      await glide(side, 'pinch', spot(0), 0.1, 0);
      const { t, dx, dz } = dir();
      const drag = local(t.x - dx * lead + dx * 0.025, t.z - dz * lead + dz * 0.025, 0.004);
      await setPinch(side, true);
      await glide(side, 'pinch', drag, hold);
      await setPinch(side, false);
      await glide(side, 'pinch', above(drag, 0.08), 0.2, 0);
    },

    /** A cup: a fingertip pressed down into the floor (fast enough to count), then lifted. at: 'rival' | 'mine' | {x, z}. */
    async cup(opts: { at?: 'rival' | 'mine' | { x: number; z: number }; side?: Side } = {}) {
      const { at = 'rival', side = 'right' } = opts;
      const g = game();
      // A moving top is met where it will be as the fingertip lands (about 0.3 s on).
      const spot = (up: number) => () => {
        const top = at === 'rival' ? g.theirs : at === 'mine' ? g.mine : null;
        const t = top ? { x: top.x + top.vx * 0.3, z: top.z + top.vz * 0.3 } : (at as { x: number; z: number });
        return local(t.x, t.z, up / ARENA_SCALE);
      };
      await glide(side, 'index', spot(0.06), 0.2, 0);
      const down = spot(-0.015)();
      await glide(side, 'index', down, 0.12, 0);
      await wait(0.1);
      await glide(side, 'index', above(down, 0.1), 0.25, 0);
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
    },

    /** The strike: a palm slapped down on the table beside the arena (or, gentle, pressed and held). */
    async slap(opts: { gentle?: boolean; side?: Side } = {}) {
      const { gentle = false, side = 'right' } = opts;
      const g = game();
      const tableY = g.root.position.y - PEDESTAL * g.rootK;
      // Beside the near-right rim, where the handprint shows.
      const a = Math.PI / 3;
      const r = g.arena.radius * 1.2;
      const spot = g.root.localToWorld(new Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)).setY(tableY);
      await glide(side, 'low', above(spot, 0.18), 0.35, 0);
      await wait(0.15);
      await glide(side, 'low', spot, gentle ? 0.6 : 0.12, 0);
      await wait(gentle ? 0.6 : 0.3);
      await glide(side, 'low', above(spot, 0.15), 0.3, 0);
    },

    /** Moves a point of a hand to a world point in `dur` seconds (low-level). */
    async move(side: Side, to: number[], dur = 0.3, point: Point = 'pinch') {
      await glide(side, point, new Vector3(...(to as [number, number, number])), dur);
    },
    pinch: setPinch,
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
}
