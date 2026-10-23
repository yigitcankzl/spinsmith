/**
 * Prints how the top parts play against each other on every arena. Run: npm run report:tops
 * The builds are split across worker threads; the result is the same as one thread's.
 */
import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';
import { allBuilds, buildName } from '../src/game/parts.ts';
import { summarize, topWarnings } from '../src/game/top-report.ts';

// 48 opponents per build: fewer and the luckiest of 226 builds looks dominant by chance.
const OPPONENTS = 48;
const t0 = Date.now();
const n = allBuilds().length;
const threads = Math.max(1, Math.min(n, availableParallelism() - 1));
const slices = Array.from({ length: threads }, (_, k) => [Math.floor((k * n) / threads), Math.floor(((k + 1) * n) / threads)]);
const parts = await Promise.all(
  slices.map(
    ([start, end]) =>
      new Promise<{ wins: number[]; games: number[] }>((resolve, reject) => {
        const w = new Worker(new URL('./top-worker.ts', import.meta.url), { workerData: { start, end, opponents: OPPONENTS } });
        w.once('message', resolve);
        w.once('error', reject);
      }),
  ),
);
const wins = new Array<number>(n).fill(0);
const games = new Array<number>(n).fill(0);
for (const p of parts) p.wins.forEach((v, i) => ((wins[i] += v), (games[i] += p.games[i])));
const r = summarize(wins, games);
console.log(`${n} legal builds, every arena, ${OPPONENTS} opponents each (${threads} threads, ${((Date.now() - t0) / 1000).toFixed(1)} s)\n\nBest builds:`);
for (const { build, win } of r.builds.slice(0, 10)) console.log(`  ${buildName(build).padEnd(24)} ${(win * 100).toFixed(0)}%`);
console.log('\nWorst builds:');
for (const { build, win } of r.builds.slice(-5)) console.log(`  ${buildName(build).padEnd(24)} ${(win * 100).toFixed(0)}%`);
console.log('\nParts (average win rate of their builds):');
for (const [k, v] of Object.entries(r.parts)) console.log(`  ${k.padEnd(14)} ${(v * 100).toFixed(0)}%`);
const warnings = topWarnings(r);
console.log(warnings.length ? `\nWarnings:\n  ${warnings.join('\n  ')}` : '\nNo warnings');
