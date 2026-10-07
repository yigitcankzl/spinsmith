/**
 * Measures arena shaping in simulation: simulated players with different shaping habits fight an
 * equal rival on every arena and type matchup, under the real shaping economy.
 */
import { ARENAS } from './arenas.ts';
import { Arena, ATTACK, CUP_DEPTH, CUP_HOLD, CUP_SIGMA, DEFENSE, finishPoints, LAUNCH_SPEED, LAUNCH_TILT, STAMINA, step, STEP, Top, TUNING, verdict } from './sim.ts';
import type { FloorShape } from './sim.ts';
import { SHAPE_SIZE, ShapingCharges } from './shaping.ts';


type Policy = (arena: Arena, me: Top, rival: Top, t: number, charges: ShapingCharges, rnd: () => number, owner?: string) => void;

export const POLICIES: Record<string, Policy> = {
  none: () => {},
  // Shapes at random places and in random directions, as often as charges allow.
  random: (arena, me, rival, t, charges, rnd, owner = 'me') => {
    if (rnd() > 0.01) return;
    const f = charges.spend(t, TUNING.grace);
    if (!f) return;
    const a = rnd() * Math.PI * 2;
    const r = rnd() * arena.radius * 0.8;
    const d = rnd() * Math.PI * 2;
    if (rnd() < 0.5) arena.addShape('ramp', Math.cos(a) * r, Math.sin(a) * r, SHAPE_SIZE.ramp * f, owner, Math.cos(d), Math.sin(d));
    else arena.addShape('well', Math.cos(a) * r, Math.sin(a) * r, SHAPE_SIZE.well * f, owner);
  },
  // When the rival is in the outer band, a ramp just inside it pushing it outward.
  pushOut: (arena, me, rival, t, charges, rnd, owner = 'me') => {
    const r = Math.hypot(rival.x, rival.z);
    if (!rival.alive || r < arena.radius * 0.55 || r < 1e-3) return;
    const f = charges.spend(t, TUNING.grace);
    if (!f) return;
    const dx = rival.x / r;
    const dz = rival.z / r;
    arena.addShape('ramp', rival.x - dx * 0.012, rival.z - dz * 0.012, SHAPE_SIZE.ramp * f, owner, dx, dz);
  },
  // When your own top is near the middle, a well under it to hold it there.
  centerWell: (arena, me, rival, t, charges, rnd, owner = 'me') => {
    if (!me.alive || Math.hypot(me.x, me.z) > arena.radius * 0.35) return;
    const f = charges.spend(t, TUNING.grace);
    if (!f) return;
    arena.addShape('well', me.x, me.z, SHAPE_SIZE.well * f, owner);
  },
};

export interface ShapingResult {
  win: number;
  pointsPerRound: number;
  koWins: number;
  medianRound: number;
  shapesPerRound: number;
  /** Rounds the shaper lost by a knockout within 1.5 s of its own shape. */
  ownKo: number;
  /** Against the same round played without shaping (the sim is deterministic): rounds the shaping won that the twin lost, and the reverse. */
  flipsWon: number;
  flipsLost: number;
  /** Share of the shaper's shapes no top ever came near while they were strong. */
  untouched: number;
}

/**
 * A human-feasible shaper (see docs/FIGHT-INTERACTION.md): it sees the rival in the outer band,
 * and the ramp exists only `delay` later (reaction, gesture and tracking), aimed where the rival
 * will be with some error. `delay` 0.62 s is a ramp set on release, 0.35 s one set at the pinch.
 */
export const HUMAN = { reaction: 0.25, gesture: 0.3, tracking: 0.07, posErr: 0.005, dirErr: 0.26, minGap: 1.0 };
export function humanRamp(delay = HUMAN.reaction + HUMAN.gesture + HUMAN.tracking, sigma?: number): Policy {
  let pending: { at: number; x: number; z: number; a: number }[] = [];
  let lastT = Infinity;
  let busy = 0;
  let last = -9;
  return (arena, me, rival, t, charges, rnd, owner = 'me') => {
    // A new round starts the clock again.
    if (t < lastT) {
      pending = [];
      busy = 0;
      last = -9;
    }
    lastT = t;
    for (const p of pending) {
      if (p.at > t) continue;
      const f = charges.spend(t, TUNING.grace);
      if (f) arena.addShape('ramp', p.x, p.z, SHAPE_SIZE.ramp * f, owner, Math.cos(p.a), Math.sin(p.a), sigma);
    }
    pending = pending.filter((p) => p.at > t);
    if (t < TUNING.grace || busy > t || t - last < HUMAN.minGap || charges.charges < 1) return;
    const r = Math.hypot(rival.x, rival.z);
    if (!rival.alive || r < arena.radius * 0.55) return;
    busy = t + delay;
    last = t;
    const p = predictOrbit(rival, delay, 1 + 0.25 * gauss(rnd));
    const pr = Math.hypot(p.x, p.z) || 1;
    pending.push({
      at: t + delay,
      x: p.x - (p.x / pr) * 0.012 + HUMAN.posErr * gauss(rnd),
      z: p.z - (p.z / pr) * 0.012 + HUMAN.posErr * gauss(rnd),
      a: Math.atan2(p.z, p.x) + HUMAN.dirErr * gauss(rnd),
    });
  };
}

/**
 * A human-feasible cup player: lays a cup ahead of the rival's path (with the same lag and aim
 * error as the ramp), and once it holds a top: the rival is slung toward the nearest slag pit
 * (or out over the wall), its own top is let go. Cups have their own owner, so a ramp and a cup
 * can live at once (one per hand).
 */
export function humanCup(delay = HUMAN.reaction + HUMAN.gesture + HUMAN.tracking): Policy {
  let cup: FloorShape | null = null;
  let madeAt = 0;
  let releaseAt = -1;
  let pending: { at: number; x: number; z: number } | null = null;
  let lastT = Infinity;
  let busy = 0;
  let last = -9;
  return (arena, me, rival, t, charges, rnd, owner = 'me') => {
    if (t < lastT) {
      cup = null;
      pending = null;
      releaseAt = -1;
      busy = 0;
      last = -9;
    }
    lastT = t;
    const cupOwner = `${owner}-cup`;
    if (pending && pending.at <= t) {
      const f = charges.spend(t, TUNING.grace);
      if (f) {
        cup = arena.addShape('well', pending.x, pending.z, CUP_DEPTH * f, cupOwner, 0, 0, CUP_SIGMA);
        cup.trap = true;
        cup.held = true;
        madeAt = t;
      }
      pending = null;
    }
    if (cup) {
      if (!arena.shapes.includes(cup)) {
        cup = null;
        return;
      }
      if (cup.caught && releaseAt < 0) releaseAt = t + HUMAN.reaction + HUMAN.tracking + 0.15;
      if (releaseAt >= 0 && t >= releaseAt) {
        if (cup.caught === rival) {
          const exit = nearestExit(rival, arena);
          const a = Math.atan2(exit.z - rival.z, exit.x - rival.x) + HUMAN.dirErr * gauss(rnd);
          arena.sling(cup, Math.cos(a), Math.sin(a));
        } else arena.free(cup);
        cup = null;
        releaseAt = -1;
      } else if (!cup.caught && t - madeAt > CUP_HOLD) {
        arena.free(cup);
        cup = null;
      }
      return;
    }
    if (pending || t < TUNING.grace || busy > t || t - last < HUMAN.minGap || charges.charges < 1 || !rival.alive) return;
    busy = t + delay;
    last = t;
    const p = predictOrbit(rival, delay + 0.3, 1 + 0.25 * gauss(rnd));
    pending = { at: t + delay, x: p.x + HUMAN.posErr * gauss(rnd), z: p.z + HUMAN.posErr * gauss(rnd) };
  };
}

/** Ramps when the rival is out in the outer band, cups it otherwise: both verbs, as a player would. */
export function humanBoth(rampDelay = 0.35): Policy {
  const ramp = humanRamp(rampDelay);
  const cup = humanCup();
  return (arena, me, rival, t, charges, rnd, owner = 'me') => {
    ramp(arena, me, rival, t, charges, rnd, owner);
    if (Math.hypot(rival.x, rival.z) < arena.radius * 0.55) cup(arena, me, rival, t, charges, rnd, owner);
  };
}

/** Where a top caught at (x, z) should go: the nearest slag-pit mouth, else straight out over the wall. */
function nearestExit(t: Top, arena: Arena): { x: number; z: number } {
  const L = arena.layout;
  const a0 = Math.atan2(t.z, t.x);
  let best = a0;
  let gap = Infinity;
  for (const p of L.pockets) {
    const d = Math.abs(Math.atan2(Math.sin(p.angle - a0), Math.cos(p.angle - a0)));
    if (d < gap) {
      gap = d;
      best = p.angle;
    }
  }
  return { x: Math.cos(best) * arena.radius, z: Math.sin(best) * arena.radius };
}

function gauss(rnd: () => number) {
  return Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
}

/** Where a top will be `dt` from now, carrying its angular motion around the center. */
function predictOrbit(t: Top, dt: number, lead: number): { x: number; z: number } {
  const r = Math.hypot(t.x, t.z) || 1e-6;
  const vr = (t.vx * t.x + t.vz * t.z) / r;
  const vt = (-t.vx * t.z + t.vz * t.x) / r;
  const a = Math.atan2(t.z, t.x) + (vt / r) * dt * lead;
  const r2 = Math.max(0, r + vr * dt * lead * 0.5);
  return { x: Math.cos(a) * r2, z: Math.sin(a) * r2 };
}

interface Setup {
  layout: (typeof ARENAS)[number];
  a: Top['spec'];
  b: Top['spec'];
  launchA: [number, number, number, number, number, number];
  launchB: [number, number, number, number, number, number];
}

/** One round from a setup: the verdict, its length, and what the shaper's shapes did. */
function playRound(s: Setup, policy: Policy, rivalPolicy: Policy, rnd: () => number) {
  const arena = new Arena(s.layout);
  const charges = new ShapingCharges();
  const rivalCharges = new ShapingCharges();
  const a = new Top(s.a);
  const b = new Top(s.b);
  a.launch(...s.launchA);
  b.launch(...s.launchB);
  let t = 0;
  let lastShape = -99;
  let shapes = 0;
  const mine: { s: (typeof arena.shapes)[number]; touched: boolean }[] = [];
  while (verdict(a, b, t) === 0) {
    const before = new Set(arena.shapes);
    policy(arena, a, b, t, charges, rnd);
    rivalPolicy(arena, b, a, t, rivalCharges, rnd, 'rival');
    for (const sh of arena.shapes) {
      if (before.has(sh) || !sh.owner.startsWith('me')) continue;
      shapes++;
      lastShape = t;
      mine.push({ s: sh, touched: false });
    }
    // A shape counts as noticed once a top comes within reach of it while it is strong.
    for (const m of mine) {
      if (m.touched || Arena.strength(m.s) < 0.3 || !arena.shapes.includes(m.s)) continue;
      for (const top of [a, b]) if (top.alive && Math.hypot(top.x - m.s.x, top.z - m.s.z) < 0.05) m.touched = true;
    }
    charges.update(STEP);
    rivalCharges.update(STEP);
    const clash = step(arena, a, b);
    if (clash) {
      charges.clash(clash.strength, t);
      rivalCharges.clash(clash.strength, t);
    }
    t += STEP;
  }
  return { v: verdict(a, b, t), t, a, b, shapes, lastShape, untouched: mine.filter((m) => !m.touched).length };
}

/**
 * Deterministic: same rules, same result. Every round is also played without shaping from the
 * same launch (its twin), so the report can say what the shaping changed.
 * `rivalPolicy` lets the rival shape too, under its own charges.
 */
export function reportShaping(policy: Policy, roundsPerPair = 16, rivalPolicy: Policy = POLICIES.none): ShapingResult {
  let seed = 3;
  const launchRnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let pseed = 7;
  const rnd = () => ((pseed = (pseed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const types = [ATTACK, DEFENSE, STAMINA];
  let wins = 0, n = 0, points = 0, ko = 0, shapes = 0, ownKo = 0, flipsWon = 0, flipsLost = 0, untouched = 0;
  const lengths: number[] = [];
  for (const layout of ARENAS) {
    const spawn = layout.shape === 'oval' ? layout.radius * 0.78 * 0.72 : layout.radius * 0.72;
    for (const x of types)
      for (const y of types)
        for (let i = 0; i < roundsPerPair; i++) {
          const pa = 0.5 + launchRnd() * 0.5, pb = 0.5 + launchRnd() * 0.5;
          const da = LAUNCH_TILT + (launchRnd() - 0.5) * 0.6, db = LAUNCH_TILT + (launchRnd() - 0.5) * 0.6;
          const sa = LAUNCH_SPEED * (0.5 + 0.5 * pa), sb = LAUNCH_SPEED * (0.5 + 0.5 * pb);
          // Half the rounds from the other side and spin, so the shaper has no side advantage.
          const side = i % 2 === 0 ? 1 : -1;
          const setup: Setup = {
            layout,
            a: x,
            b: y,
            launchA: [0, side * spawn, side * Math.sin(da) * sa, -side * Math.cos(da) * sa, 0.55 + 0.45 * pa, side],
            launchB: [0, -side * spawn, -side * Math.sin(db) * sb, side * Math.cos(db) * sb, 0.55 + 0.45 * pb, -side],
          };
          const r = playRound(setup, policy, rivalPolicy, rnd);
          const twin = policy === POLICIES.none ? r : playRound(setup, POLICIES.none, rivalPolicy, rnd);
          n++;
          lengths.push(r.t);
          shapes += r.shapes;
          untouched += r.untouched;
          if (r.v === 1) {
            wins++;
            points += finishPoints(r.b);
            if (r.b.finish !== 'spin') ko++;
          } else if (r.v === -1 && r.a.finish !== 'spin' && r.t - r.lastShape < 1.5) ownKo++;
          if (r.v === 1 && twin.v !== 1) flipsWon++;
          if (r.v !== 1 && twin.v === 1) flipsLost++;
        }
  }
  lengths.sort((p, q) => p - q);
  return {
    win: wins / n,
    pointsPerRound: points / n,
    koWins: ko / n,
    medianRound: lengths[n >> 1],
    shapesPerRound: shapes / n,
    ownKo: ownKo / n,
    flipsWon: flipsWon / n,
    flipsLost: flipsLost / n,
    untouched: shapes ? untouched / shapes : 0,
  };
}
