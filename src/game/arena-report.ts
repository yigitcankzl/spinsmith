/**
 * Plays many simulated rounds on an arena and summarizes how it plays: round length, how rounds
 * end, and how each top type fares. Used to balance the built-in arenas (npm run report:arenas)
 * and by the arena builder to warn about layouts that play badly.
 */
import type { ArenaLayout } from './layout.ts';
import { Arena, launchSpin, LAUNCH_SPEED, LAUNCH_TILT, step, STEP, Top, TYPES, verdict } from './sim.ts';

export interface ArenaReport {
  /** Median round length (s). */
  median: number;
  /** Share of rounds under 2 s (too abrupt). */
  quick: number;
  /** Share of rounds ending in a pocket, over the wall, or a burst. */
  knockout: number;
  burst: number;
  /** Win rate of each type across all its matchups, by type name. */
  typeWin: Record<string, number>;
  /** Average clashes per round. */
  clashes: number;
}

/** Deterministic: the same layout always gives the same report. */
export function reportArena(layout: ArenaLayout, roundsPerPair = 12): ArenaReport {
  let seed = 17;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const times: number[] = [];
  const wins: Record<string, number> = {};
  const games: Record<string, number> = {};
  let ko = 0;
  let burst = 0;
  let clashes = 0;
  const arena = new Arena(layout);
  const a = new Top(TYPES[0]);
  const b = new Top(TYPES[0]);
  for (const x of TYPES) {
    for (const y of TYPES) {
      for (let i = 0; i < roundsPerPair; i++) {
        arena.reset(layout);
        a.spec = x;
        b.spec = y;
        const pa = 0.5 + rnd() * 0.5;
        const pb = 0.5 + rnd() * 0.5;
        const da = LAUNCH_TILT + (rnd() - 0.5) * 0.8;
        const db = LAUNCH_TILT + (rnd() - 0.5) * 0.8;
        const sa = LAUNCH_SPEED * (0.5 + 0.5 * pa);
        const sb = LAUNCH_SPEED * (0.5 + 0.5 * pb);
        const spawn = layout.shape === 'oval' ? layout.radius * 0.78 * 0.72 : layout.radius * 0.72;
        a.launch(0, spawn, Math.sin(da) * sa, -Math.cos(da) * sa, launchSpin(pa), 1);
        b.launch(0, -spawn, -Math.sin(db) * sb, Math.cos(db) * sb, launchSpin(pb), -1);
        let t = 0;
        while (verdict(a, b, t) === 0) {
          if (step(arena, a, b)) clashes++;
          t += STEP;
        }
        const v = verdict(a, b, t);
        times.push(t);
        const loser = v === 1 ? b : a;
        if (loser.finish === 'pocket' || loser.finish === 'over' || loser.finish === 'burst') ko++;
        if (loser.finish === 'burst') burst++;
        if (x !== y && v !== 2) {
          const winner = v === 1 ? x : y;
          wins[winner.name] = (wins[winner.name] ?? 0) + 1;
          games[x.name] = (games[x.name] ?? 0) + 1;
          games[y.name] = (games[y.name] ?? 0) + 1;
        }
      }
    }
  }
  times.sort((p, q) => p - q);
  const n = times.length;
  const typeWin: Record<string, number> = {};
  for (const t of TYPES) typeWin[t.name] = (wins[t.name] ?? 0) / (games[t.name] || 1);
  return {
    median: times[n >> 1],
    quick: times.filter((t) => t < 2).length / n,
    knockout: ko / n,
    burst: burst / n,
    typeWin,
    clashes: clashes / n,
  };
}

/** A short warning when an arena plays badly, or null when it looks fine. */
export function arenaWarning(r: ArenaReport): string | null {
  if (r.quick > 0.35) return 'Rounds end too abruptly';
  if (r.median > 30) return 'Rounds drag on';
  if (r.knockout < 0.15) return 'Rounds rarely end in a knockout';
  const best = Object.entries(r.typeWin).sort((p, q) => q[1] - p[1])[0];
  if (best[1] > 0.8) return `${best[0]} wins almost every time here`;
  return null;
}
