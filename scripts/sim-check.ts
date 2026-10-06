/**
 * Headless sanity check for the fight simulation. Run: npm run check:sim
 * Fails loudly if the core rules break (bowl pulls tops in, clashes happen,
 * bumps steer, fights end, verdict rules hold).
 */
import assert from 'node:assert/strict';
import { ARENAS } from '../src/game/arenas.ts';
import { cloneLayout, validate } from '../src/game/layout.ts';
import type { ArenaLayout } from '../src/game/layout.ts';
import { Arena, ATTACK, DEFENSE, finishPoints, LAUNCH_SPEED, LAUNCH_TILT, STAMINA, step, STEP, Top, verdict } from '../src/game/sim.ts';

const FORGE = ARENAS[0];
const ARENA_RADIUS = FORGE.radius;
const POCKETS = FORGE.pockets.map((p) => p.angle);
const POCKET_HALF = FORGE.pockets[0].half;
const RAILS = FORGE.rails.map((r) => r.angle);
const RAIL_HALF = FORGE.rails[0].half;
/** A plain test arena: the Forge Bowl with overrides. */
const arenaWith = (o: Partial<ArenaLayout>) => new Arena({ ...cloneLayout(FORGE), ...o });
/** Runs one top alone (the other parked out) for `seconds`. */
function solo(arena: Arena, t: Top, seconds: number, each?: () => void) {
  const idle = new Top(DEFENSE);
  idle.state = 'toppled';
  for (let s = 0; s < seconds && t.alive; s += STEP) {
    step(arena, t, idle);
    each?.();
  }
}
import type { TopSpec } from '../src/game/sim.ts';

function fight(arena: Arena, a: Top, b: Top, bump?: (t: number) => void) {
  let t = 0;
  let clashes = 0;
  while (verdict(a, b, t) === 0) {
    bump?.(t);
    if (step(arena, a, b)) clashes++;
    t += STEP;
  }
  return { t, clashes, result: verdict(a, b, t) };
}

// 1. A lone top launched toward the rim is pulled back by the bowl and eventually topples in place.
{
  const arena = new Arena();
  const a = new Top(DEFENSE);
  const idle = new Top(STAMINA); // parked dead outside so it does not interfere
  a.launch(0.06, 0, 0.1, 0, 1, 1);
  idle.state = 'toppled';
  let t = 0;
  let maxR = 0;
  while (a.alive && t < 60) {
    step(arena, a, idle);
    maxR = Math.max(maxR, Math.hypot(a.x, a.z));
    t += STEP;
  }
  assert.equal(a.state, 'toppled', 'a gentle launch should stay in and run out of spin');
  assert.ok(t > 8, `spin should last a while, lasted ${t.toFixed(1)} s`);
}

// 2. Two tops launched at each other clash and the fight ends with a winner within the time limit.
{
  const arena = new Arena();
  const a = new Top(DEFENSE);
  const b = new Top(STAMINA);
  a.launch(0.1, 0, -LAUNCH_SPEED, 0.01, 0.9, 1);
  b.launch(-0.1, 0, LAUNCH_SPEED, -0.01, 0.9, -1);
  const r = fight(arena, a, b);
  assert.ok(r.clashes > 0, 'tops launched at each other must clash');
  assert.notEqual(r.result, 0);
  console.log(`fight: ${r.t.toFixed(1)} s, ${r.clashes} clash steps, winner ${r.result === 1 ? 'defense' : 'stamina'}`);
}

// 3. A held bump tilts the floor: a top sitting next to it slides away from it.
{
  const arena = new Arena();
  arena.stamp(0, 0, 0.03);
  const a = new Top(DEFENSE);
  const idle = new Top(STAMINA);
  idle.state = 'toppled';
  a.launch(0.03, 0, 0, 0, 1, 1);
  for (let i = 0; i < 30; i++) step(arena, a, idle);
  assert.ok(a.x > 0.03, 'a top beside a bump must slide away from it');
}

// 3b. The core move: a bump raised behind a top in front of a pocket drops it in (2 points).
{
  const arena = new Arena();
  const a = new Top(STAMINA);
  const idle = new Top(DEFENSE);
  idle.state = 'toppled';
  const p = POCKETS[0];
  const r = ARENA_RADIUS * 0.72;
  a.launch(Math.cos(p) * r, Math.sin(p) * r, 0, 0, 0.8, 1);
  for (let t = 0; t < 2 && a.alive; t += STEP) {
    if (t < 0.6) arena.stamp(a.x - Math.cos(p) * 0.03, a.z - Math.sin(p) * 0.03, 0.04);
    step(arena, a, idle);
  }
  assert.equal(a.finish, 'pocket', `a bump behind a top facing a pocket must drop it in, got ${a.state}/${a.finish}`);
  assert.equal(finishPoints(a), 2);
}

// 3c. The wall: a slow top driven into the rim away from pockets and rails bounces back in.
{
  const arena = new Arena();
  const a = new Top(DEFENSE);
  const idle = new Top(STAMINA);
  idle.state = 'toppled';
  // Plain wall: between the rail at 90 degrees and the pocket at 135 degrees.
  const angle = (RAILS[1] + RAIL_HALF + POCKETS[1] - POCKET_HALF) / 2;
  const dx = Math.cos(angle);
  const dz = Math.sin(angle);
  a.launch(dx * ARENA_RADIUS * 0.6, dz * ARENA_RADIUS * 0.6, dx * 0.2, dz * 0.2, 0.8, 1);
  let bounced = false;
  for (let i = 0; i < 120 && a.alive; i++) {
    step(arena, a, idle);
    if (a.vx * dx + a.vz * dz < 0 && a.sinceDash > 1) bounced = true;
  }
  assert.ok(bounced, 'the top must bounce off the plain wall without a dash');
  assert.ok(a.alive, `a slow hit on the wall must bounce, got ${a.state}/${a.finish}`);
  assert.ok(Math.hypot(a.x, a.z) < ARENA_RADIUS, 'the top must stay inside');
}

// 3d. A rail dash: touching a side rail shoots the top back toward the middle.
{
  const arena = new Arena();
  const a = new Top(DEFENSE);
  const idle = new Top(STAMINA);
  idle.state = 'toppled';
  a.launch(ARENA_RADIUS * 0.8, 0, 0.15, 0, 0.9, 1); // toward the rail at angle 0
  let dashed = false;
  for (let i = 0; i < 120 && !dashed; i++) {
    step(arena, a, idle);
    dashed = a.sinceDash === 0 || a.sinceDash < 0.02;
  }
  assert.ok(dashed, 'touching the rail must trigger a dash');
  assert.ok(a.vx < -0.2, `the dash must throw the top inward, vx=${a.vx.toFixed(2)}`);
}

// 4. Shapes relax back to flat within ~3 s.
{
  const arena = new Arena();
  arena.stamp(0, 0, 0.03);
  for (let t = 0; t < 3; t += STEP) arena.update(STEP, new Top(DEFENSE), new Top(STAMINA));
  assert.ok(arena.height(0, 0) < 0.003, 'bump should be mostly gone after 3 s');
}

// 5. Verdict rules: one alive wins; both out -> more spin wins; exact tie -> replay.
{
  const a = new Top(DEFENSE);
  const b = new Top(STAMINA);
  a.state = 'spinning';
  b.state = 'out';
  assert.equal(verdict(a, b, 1), 1);
  a.state = 'out';
  a.spin = 0.3;
  b.spin = 0.2;
  assert.equal(verdict(a, b, 1), 1);
  b.spin = 0.3;
  assert.equal(verdict(a, b, 1), 2);
  b.finish = 'spin';
  assert.equal(finishPoints(b), 1);
}

// 6. Hard hits accumulate damage and can burst a top apart (2 points).
{
  const a = new Top(STAMINA);
  const b = new Top(ATTACK);
  let bursts = 0;
  let seed = 9;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < 40; i++) {
    const arena = new Arena();
    a.launch(0, 0.1, (rnd() - 0.5) * 0.3, -LAUNCH_SPEED, 1, 1);
    b.launch(0, -0.1, (rnd() - 0.5) * 0.3, LAUNCH_SPEED, 1, -1);
    for (let t = 0; verdict(a, b, t) === 0; t += STEP) step(arena, a, b);
    if (a.finish === 'burst') {
      bursts++;
      assert.equal(finishPoints(a), 2);
    }
  }
  assert.ok(bursts > 0, 'full-power head-on fights must sometimes burst the stamina top');
}

// 7. The type loop holds: attack beats stamina, defense beats attack, stamina beats defense.
{
  let seed = 3;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const winRate = (x: TopSpec, y: TopSpec) => {
    let wins = 0;
    const n = 120;
    for (let i = 0; i < n; i++) {
      const arena = new Arena();
      const a = new Top(x);
      const b = new Top(y);
      const pa = 0.5 + rnd() * 0.5;
      const pb = 0.5 + rnd() * 0.5;
      // Launched the way the game launches: angled into the orbit, with some aim spread.
      const da = LAUNCH_TILT + (rnd() - 0.5) * 0.6;
      const db = LAUNCH_TILT + (rnd() - 0.5) * 0.6;
      const sa = LAUNCH_SPEED * (0.5 + 0.5 * pa);
      const sb = LAUNCH_SPEED * (0.5 + 0.5 * pb);
      a.launch(0, 0.108, Math.sin(da) * sa, -Math.cos(da) * sa, 0.55 + 0.45 * pa, 1);
      b.launch(0, -0.108, -Math.sin(db) * sb, Math.cos(db) * sb, 0.55 + 0.45 * pb, -1);
      let t = 0;
      while (verdict(a, b, t) === 0) {
        step(arena, a, b);
        t += STEP;
      }
      if (verdict(a, b, t) === 1) wins++;
    }
    return wins / n;
  };
  const as = winRate(ATTACK, STAMINA);
  const da = winRate(DEFENSE, ATTACK);
  const sd = winRate(STAMINA, DEFENSE);
  console.log(`type loop: attack>stamina ${as.toFixed(2)}, defense>attack ${da.toFixed(2)}, stamina>defense ${sd.toFixed(2)}`);
  assert.ok(as > 0.55 && da > 0.55 && sd > 0.55, 'each type must beat the one it counters');
}

// 8. Arena knobs.
{
  // Every built-in arena is a valid layout.
  for (const a of ARENAS) assert.equal(validate(a), null, `${a.name}: ${validate(a)}`);

  // A pillar deflects a top heading at it; a bumper throws it back faster than it came.
  for (const bumper of [false, true]) {
    const arena = arenaWith({ pillars: [{ x: 0, z: 0, r: 0.01, bumper }], floor: 'flat', depth: 0 });
    const t = new Top(STAMINA);
    t.launch(0.06, 0, -0.3, 0, 1, 1);
    let rebound = -Infinity;
    solo(arena, t, 0.15, () => (rebound = Math.max(rebound, t.vx)));
    assert.ok(rebound > 0.1, `${bumper ? 'bumper' : 'pillar'} must turn the top back`);
    if (bumper) assert.ok(rebound > 0.5, `the bumper must kick it back faster, got ${rebound.toFixed(2)}`);
  }

  // A high wall is never cleared, even by a very fast top; with no wall at all, crossing the edge is a ring-out.
  {
    const t = new Top(ATTACK);
    t.launch(0, 0.05, 0, 1.8, 1, 1);
    solo(arenaWith({ wall: 'high', pockets: [], rails: [] }), t, 0.5);
    assert.ok(t.alive, 'a high wall must hold');
    // No wall: the edge berm holds a slow top, a hard-driven one goes over it and is out.
    const slow = new Top(ATTACK);
    slow.launch(0, 0.05, 0, 0.3, 0.2, 1);
    solo(arenaWith({ wall: 'none', pockets: [], rails: [] }), slow, 0.6);
    assert.ok(slow.state !== 'out', 'the berm must hold a slow top');
    const fast = new Top(ATTACK);
    fast.launch(0, 0.05, 0, 1.2, 1, 1);
    solo(arenaWith({ wall: 'none', pockets: [], rails: [] }), fast, 1);
    assert.equal(fast.finish, 'over', 'no wall: leaving the edge is a ring-out');
  }

  // A 3-point pocket scores 3.
  {
    const arena = arenaWith({ pockets: [{ angle: Math.PI / 2, half: 0.3, points: 3 }], rails: [] });
    const t = new Top(STAMINA);
    t.launch(0, 0.05, 0, 0.6, 1, 1);
    solo(arena, t, 1);
    assert.equal(t.finish, 'pocket');
    assert.equal(finishPoints(t), 3);
  }

  // Embers drain spin outside the shrinking safe zone.
  {
    const calm = new Top(STAMINA);
    const burned = new Top(STAMINA);
    const a1 = arenaWith({ shrink: false });
    const a2 = arenaWith({ shrink: true });
    a1.elapsed = a2.elapsed = 30;
    calm.launch(0.12, 0, 0, 0.2, 1, 1);
    burned.launch(0.12, 0, 0, 0.2, 1, 1);
    solo(a1, calm, 1);
    solo(a2, burned, 1);
    assert.ok(burned.spin < calm.spin - 0.15, 'the embers must drain spin');
  }

  // A rocking dish tips toward the tops' weight.
  {
    const arena = arenaWith({ tilt: 0.12 });
    const t = new Top(DEFENSE);
    t.launch(0.1, 0, 0, 0, 1, 1);
    solo(arena, t, 0.3);
    assert.ok(arena.tiltZ < -0.01, `the dish must dip toward the top, tiltZ=${arena.tiltZ.toFixed(3)}`);
  }

  // The vortex speeds a top up in the middle; the turntable drags it around.
  for (const knob of [{ vortex: 1.5 }, { spinner: 8 }]) {
    const plain = new Top(DEFENSE);
    const fast = new Top(DEFENSE);
    plain.launch(0.02, 0, 0, 0.05, 0.6, 1);
    fast.launch(0.02, 0, 0, 0.05, 0.6, 1);
    solo(arenaWith({ floor: 'flat' }), plain, 0.3);
    solo(arenaWith({ floor: 'flat', ...knob }), fast, 0.3);
    assert.ok(Math.hypot(fast.vx, fast.vz) > Math.hypot(plain.vx, plain.vz) + 0.02, `${Object.keys(knob)[0]} must add speed`);
  }

  // Every built-in arena plays: rounds end on their own and nobody gets stuck.
  for (const layout of ARENAS) {
    const arena = new Arena(layout);
    const a = new Top(ATTACK);
    const b = new Top(STAMINA);
    const r = fight(arena, a, b);
    assert.notEqual(r.result, 0, `${layout.name} must produce a result`);
  }
}

console.log('sim-check: all passed');
