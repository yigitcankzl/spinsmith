/**
 * Headless sanity check for the fight simulation. Run: npm run check:sim
 * Fails loudly if the core rules break (bowl pulls tops in, clashes happen,
 * bumps steer, fights end, verdict rules hold).
 */
import assert from 'node:assert/strict';
import { Arena, ARENA_RADIUS, ATTACK, DEFENSE, finishPoints, LAUNCH_SPEED, LAUNCH_TILT, POCKET_HALF, POCKETS, RAIL_HALF, RAILS, STAMINA, step, STEP, Top, verdict } from '../src/game/sim.ts';
import type { TopSpec } from '../src/game/sim.ts';

function fight(arena: Arena, a: Top, b: Top, bump?: (t: number) => void) {
  let t = 0;
  let clashes = 0;
  while (verdict(a, b, t) === 0) {
    bump?.(t);
    arena.relax(STEP);
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
  for (let t = 0; t < 3; t += STEP) arena.relax(STEP);
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
    const n = 60;
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

console.log('sim-check: all passed');
