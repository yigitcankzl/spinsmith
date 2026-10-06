/**
 * Plays every legal build against a spread of opponents in simulation and reports win rates per
 * build and per part. Used to balance the parts (npm run report:tops).
 */
import { ARENAS } from './arenas.ts';
import { allBuilds, buildName, CORES, RINGS, specFromBuild, TIPS } from './parts.ts';
import type { TopBuild } from './parts.ts';
import { Arena, LAUNCH_SPEED, LAUNCH_TILT, step, STEP, Top, verdict } from './sim.ts';

export interface TopReport {
  /** Win rate per build, best first. */
  builds: { build: TopBuild; win: number }[];
  /** Average win rate of the builds using each part, by part name. */
  parts: Record<string, number>;
}

/** Deterministic: same parts, same report. */
export function reportTops(opponents = 24, arenas = [ARENAS[0], ARENAS[3]]): TopReport {
  let seed = 23;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const builds = allBuilds();
  const specs = builds.map(specFromBuild);
  const wins = builds.map(() => 0);
  const games = builds.map(() => 0);
  const a = new Top(specs[0]);
  const b = new Top(specs[0]);
  for (const layout of arenas) {
    const arena = new Arena(layout);
    const spawn = layout.radius * 0.72;
    for (let i = 0; i < builds.length; i++) {
      for (let k = 0; k < opponents; k++) {
        const j = Math.floor(rnd() * builds.length);
        if (j === i) continue;
        arena.reset(layout);
        a.spec = specs[i];
        b.spec = specs[j];
        // Half the rounds with both spinning the same way.
        const ha = 1;
        const hb = rnd() < 0.5 ? -1 : 1;
        const pa = 0.5 + rnd() * 0.5;
        const pb = 0.5 + rnd() * 0.5;
        const da = LAUNCH_TILT + (rnd() - 0.5) * 0.8;
        const db = LAUNCH_TILT + (rnd() - 0.5) * 0.8;
        const sa = LAUNCH_SPEED * (0.5 + 0.5 * pa);
        const sb = LAUNCH_SPEED * (0.5 + 0.5 * pb);
        a.launch(0, spawn, Math.sin(da) * sa * ha, -Math.cos(da) * sa, 0.55 + 0.45 * pa, ha);
        b.launch(0, -spawn, Math.sin(db) * sb * hb, Math.cos(db) * sb, 0.55 + 0.45 * pb, hb);
        let t = 0;
        while (verdict(a, b, t) === 0) {
          step(arena, a, b);
          t += STEP;
        }
        const v = verdict(a, b, t);
        if (v === 2) continue;
        games[i]++;
        games[j]++;
        if (v === 1) wins[i]++;
        else wins[j]++;
      }
    }
  }
  const win = builds.map((_, i) => wins[i] / (games[i] || 1));
  const parts: Record<string, number> = {};
  const avg = (pick: (b: TopBuild) => boolean) => {
    const ws = builds.flatMap((b, i) => (pick(b) ? [win[i]] : []));
    return ws.reduce((s, w) => s + w, 0) / (ws.length || 1);
  };
  for (const r of RINGS) parts[`ring ${r.name}`] = avg((b) => b.ring === r.id);
  for (const c of CORES) parts[`core ${c.name}`] = avg((b) => b.core === c.id);
  for (const t of TIPS) parts[`tip ${t.name}`] = avg((b) => b.tip === t.id);
  return {
    builds: builds.map((build, i) => ({ build, win: win[i] })).sort((p, q) => q.win - p.win),
    parts,
  };
}

/**
 * The balance gates from docs/GAMEPLAY-DIRECTION.md: no part averaging below 40% or above 60%,
 * no build above about 65% (67% allows for sampling noise).
 */
export function topWarnings(r: TopReport): string[] {
  const out: string[] = [];
  const best = r.builds[0];
  if (best.win > 0.67) out.push(`${buildName(best.build)} wins ${(best.win * 100).toFixed(0)}% of its rounds`);
  for (const [part, win] of Object.entries(r.parts)) {
    if (win < 0.4 || win > 0.6) out.push(`${part} averages ${(win * 100).toFixed(0)}%`);
  }
  return out;
}
