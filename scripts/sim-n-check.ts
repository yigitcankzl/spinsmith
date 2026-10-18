/**
 * Headless check for crowded (2-4 top, free-for-all) fights. Run: npm run check:sim-n
 * stepN with two tops must match step bit for bit; 3- and 4-top rounds must end, stay finite,
 * rank every top once, and replay identically.
 */
import assert from 'node:assert/strict';
import { ARENAS } from '../src/game/arenas.ts';
import { PRESETS, RIVALS, specFromBuild } from '../src/game/parts.ts';
import { Arena, ATTACK, DEFENSE, LAUNCH_SPEED, rankingN, roundOverN, STAMINA, step, STEP, stepN, TIME_LIMIT, Top } from '../src/game/sim.ts';
import type { TopSpec } from '../src/game/sim.ts';

const SPECS: TopSpec[] = [ATTACK, DEFENSE, STAMINA, ...PRESETS.map((p) => specFromBuild(p.build)), ...RIVALS.map((r) => specFromBuild(r.build))];
const STEPS = Math.round(TIME_LIMIT / STEP);

/** Running FNV-1a over the exact float bits of every top's position, velocity and spin. */
const bits = new DataView(new ArrayBuffer(8));
function hash(h: number, tops: readonly Top[]) {
  for (const t of tops) {
    for (const v of [t.x, t.z, t.vx, t.vz, t.spin, t.damage]) {
      bits.setFloat64(0, v);
      for (let i = 0; i < 8; i++) h = Math.imul(h ^ bits.getUint8(i), 16777619) >>> 0;
    }
    h = Math.imul(h ^ t.state.length, 16777619) >>> 0;
  }
  return h;
}

/** Launches n tops evenly round the rim, aimed in past the center, alternating spin hands. */
function launchRing(arena: Arena, specs: TopSpec[], phase = 0): Top[] {
  const n = specs.length;
  const r = arena.radius * 0.6;
  return specs.map((spec, i) => {
    const t = new Top(spec);
    const a = phase + (i / n) * Math.PI * 2;
    const cx = Math.cos(a);
    const sz = Math.sin(a);
    t.launch(cx * r, sz * r, -cx * LAUNCH_SPEED + sz * 0.05, -sz * LAUNCH_SPEED - cx * 0.05, 0.85 + 0.03 * i, i % 2 ? -1 : 1);
    return t;
  });
}

// (a) Two tops: stepN is step, bit for bit, every step for the full 45 s.
{
  let runs = 0;
  for (const layout of ARENAS) {
    for (let k = 0; k < 3; k++) {
      const specs = [SPECS[k], SPECS[(k + 1 + runs) % SPECS.length]];
      const arenaA = new Arena(layout);
      const arenaB = new Arena(layout);
      const [a1, b1] = launchRing(arenaA, specs, k * 0.7);
      const pair2 = launchRing(arenaB, specs, k * 0.7);
      let h1 = 2166136261;
      let h2 = 2166136261;
      for (let s = 0; s < STEPS; s++) {
        const c1 = step(arenaA, a1, b1);
        const c2 = stepN(arenaB, pair2);
        assert.equal(c2.length, c1 ? 1 : 0, `${layout.name}: clash count differs at step ${s}`);
        if (c1) assert.deepEqual(c2[0], c1, `${layout.name}: clash differs at step ${s}`);
        h1 = hash(h1, [a1, b1]);
        h2 = hash(h2, pair2);
        assert.equal(h2, h1, `${layout.name} run ${k}: stepN drifted from step at step ${s}`);
        assert.equal(arenaB.tiltX, arenaA.tiltX);
        assert.equal(arenaB.tiltZ, arenaA.tiltZ);
      }
      runs++;
    }
  }
  console.log(`ok (a) stepN == step for 2 tops: ${runs} runs x ${STEPS} steps`);
}

/** Plays one crowded round to its end; returns the step count, a hash and the ranking. */
function round(layoutIndex: number, specs: TopSpec[], phase: number) {
  const arena = new Arena(ARENAS[layoutIndex]);
  const tops = launchRing(arena, specs, phase);
  let h = 2166136261;
  let t = 0;
  let steps = 0;
  let clashes = 0;
  while (!roundOverN(tops, t)) {
    clashes += stepN(arena, tops).length;
    t += STEP;
    steps++;
    h = hash(h, tops);
    for (const top of tops) assert.ok([top.x, top.z, top.vx, top.vz, top.spin].every(Number.isFinite), `non-finite top state on ${ARENAS[layoutIndex].name}`);
  }
  return { tops, t, steps, h, clashes, rank: rankingN(tops, t) };
}

// (b) 3- and 4-top free-for-all: ends by the cap, stays finite, ranks a permutation, survivor first.
// (c) The same round twice gives the same hash and ranking.
{
  const layouts = [0, 1, 2, 4, 5, 7, 9].filter((i) => i < ARENAS.length);
  let rounds = 0;
  let ko = 0;
  for (const li of layouts) {
    for (const n of [3, 4]) {
      for (let k = 0; k < 3; k++) {
        const specs = Array.from({ length: n }, (_, i) => SPECS[(i * 2 + k + li) % SPECS.length]);
        const r = round(li, specs, k * 1.3);
        assert.ok(r.steps <= STEPS + 1, `round ran past the cap: ${r.t.toFixed(2)} s`);
        assert.deepEqual([...r.rank].sort((x, y) => x - y), specs.map((_, i) => i), 'ranking must be a permutation');
        const alive = r.tops.filter((t) => t.alive);
        if (alive.length === 1) assert.equal(r.rank[0], r.tops.indexOf(alive[0]), 'the survivor must rank first');
        else if (alive.length > 1) {
          assert.ok(r.t >= TIME_LIMIT - 1e-9, 'several tops alive means the time cap ended it');
          const best = Math.max(...alive.map((t) => t.spin));
          assert.ok(r.tops[r.rank[0]].alive && r.tops[r.rank[0]].spin === best, 'at the cap the most spin wins');
        }
        // Everyone in play ranks above everyone out; those out rank by how long they lasted.
        for (let i = 1; i < r.rank.length; i++) {
          const p = r.tops[r.rank[i - 1]];
          const q = r.tops[r.rank[i]];
          assert.ok(p.alive || !q.alive, 'a live top ranked below a dead one');
          if (!p.alive && !q.alive) assert.ok(p.outAt >= q.outAt, 'a top out earlier ranked higher');
        }
        if (alive.length <= 1) ko++;
        const again = round(li, specs, k * 1.3);
        assert.equal(again.h, r.h, 'identical crowded rounds must replay identically');
        assert.deepEqual(again.rank, r.rank);
        rounds++;
      }
    }
  }
  console.log(`ok (b) ${rounds} crowded rounds end within ${TIME_LIMIT} s (${ko} decided before the cap), finite, ranked`);
  console.log('ok (c) every crowded round replayed to the same hash');
}

// (d) Four tops for the full 45 s at 120 Hz runs fast enough for headless matchmaking/replays.
{
  const arena = new Arena(ARENAS[0]);
  const tops = launchRing(arena, [DEFENSE, DEFENSE, STAMINA, STAMINA]);
  const t0 = performance.now();
  for (let s = 0; s < STEPS; s++) {
    // Keep all four spinning so the timing covers the full crowded cost.
    for (const t of tops) if (t.alive) t.spin = Math.max(t.spin, 0.5);
    stepN(arena, tops);
  }
  const ms = performance.now() - t0;
  assert.ok(ms < 2000, `4 tops x ${TIME_LIMIT} s took ${ms.toFixed(0)} ms`);
  console.log(`ok (d) 4 tops x ${TIME_LIMIT} s (${STEPS} steps) in ${ms.toFixed(0)} ms`);
}

console.log('sim-n check passed');
