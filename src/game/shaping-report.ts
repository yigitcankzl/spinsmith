/**
 * Measures arena shaping in simulation: simulated players with different shaping habits fight an
 * equal rival on every arena and type matchup, under the real shaping economy.
 */
import { ARENAS } from './arenas.ts';
import { Arena, ATTACK, DEFENSE, finishPoints, LAUNCH_SPEED, LAUNCH_TILT, STAMINA, step, STEP, Top, TUNING, verdict } from './sim.ts';
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
}

/** Deterministic: same rules, same result. */
/** `rivalPolicy` lets the rival shape too, under its own charges. */
export function reportShaping(policy: Policy, roundsPerPair = 16, rivalPolicy: Policy = POLICIES.none): ShapingResult {
  let seed = 3;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const types = [ATTACK, DEFENSE, STAMINA];
  const charges = new ShapingCharges();
  const rivalCharges = new ShapingCharges();
  let wins = 0, n = 0, points = 0, ko = 0, shapes = 0, ownKo = 0;
  const lengths: number[] = [];
  for (const layout of ARENAS) {
    const arena = new Arena(layout);
    const spawn = layout.shape === 'oval' ? layout.radius * 0.78 * 0.72 : layout.radius * 0.72;
    for (const x of types)
      for (const y of types)
        for (let i = 0; i < roundsPerPair; i++) {
          arena.reset(layout);
          charges.reset();
          rivalCharges.reset();
          const a = new Top(x);
          const b = new Top(y);
          const pa = 0.5 + rnd() * 0.5, pb = 0.5 + rnd() * 0.5;
          const da = LAUNCH_TILT + (rnd() - 0.5) * 0.6, db = LAUNCH_TILT + (rnd() - 0.5) * 0.6;
          const sa = LAUNCH_SPEED * (0.5 + 0.5 * pa), sb = LAUNCH_SPEED * (0.5 + 0.5 * pb);
          // Half the rounds from the other side and spin, so the shaper has no side advantage.
          const side = i % 2 === 0 ? 1 : -1;
          a.launch(0, side * spawn, side * Math.sin(da) * sa, -side * Math.cos(da) * sa, 0.55 + 0.45 * pa, side);
          b.launch(0, -side * spawn, -side * Math.sin(db) * sb, side * Math.cos(db) * sb, 0.55 + 0.45 * pb, -side);
          let t = 0;
          let lastShape = -99;
          while (verdict(a, b, t) === 0) {
            const before = arena.shapes.length ? arena.shapes[arena.shapes.length - 1] : null;
            policy(arena, a, b, t, charges, rnd);
            rivalPolicy(arena, b, a, t, rivalCharges, rnd, 'rival');
            const after = arena.shapes.length ? arena.shapes[arena.shapes.length - 1] : null;
            if (after && after !== before) {
              shapes++;
              lastShape = t;
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
          const v = verdict(a, b, t);
          n++;
          lengths.push(t);
          if (v === 1) {
            wins++;
            points += finishPoints(b);
            if (b.finish !== 'spin') ko++;
          } else if (v === -1 && a.finish !== 'spin' && t - lastShape < 1.5) ownKo++;
        }
  }
  lengths.sort((p, q) => p - q);
  return { win: wins / n, pointsPerRound: points / n, koWins: ko / n, medianRound: lengths[n >> 1], shapesPerRound: shapes / n, ownKo: ownKo / n };
}
