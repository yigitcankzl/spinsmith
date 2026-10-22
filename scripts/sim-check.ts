/**
 * Headless sanity check for the fight simulation. Run: npm run check:sim
 * Fails loudly if the core rules break (bowl pulls tops in, clashes happen,
 * bumps steer, fights end, verdict rules hold).
 */
import assert from 'node:assert/strict';
import { ARENAS } from '../src/game/arenas.ts';
import { cloneLayout, rimRadius, validate } from '../src/game/layout.ts';
import type { ArenaLayout } from '../src/game/layout.ts';
import { SHAPING, ShapingCharges, STRIKE_BAR, StrikeBar } from '../src/game/shaping.ts';
import { ARENA_UNLOCKS, CHAMPIONS, LEVEL_UNLOCKS, MARK, MAX_LEVEL, Progress, RIVAL_UNLOCKS, STAMP_UNLOCKS, VERB_CARD, VERB_RELEASE, verbReleasedAt, xpToNext } from '../src/game/progress.ts';
import { canKnockOut, dailyOrder, localDate, orderMet } from '../src/game/orders.ts';
import type { OrderEvent } from '../src/game/orders.ts';
import { reportArena } from '../src/game/arena-report.ts';
import { edgeDistance, fitToTable, insidePoly, MAX_FIT_MOVE, RIM_MARGIN } from '../src/game/room.ts';
import { nextArena, RIVAL_HOME } from '../src/game/rotation.ts';
import { TableTouch } from '../src/game/table-touch.ts';
import { demoSave, freshSave, SAVE_KEYS } from '../src/game/demo-save.ts';
import { clearSnapshot, decodeSnapshot, encodeSnapshot, loadSnapshot, RESUME_KEY, RESUME_MAX_AGE, RESUME_VERSION, saveSnapshot } from '../src/game/match-resume.ts';
import type { MatchSnapshot } from '../src/game/match-resume.ts';
import { addDays, boutLine, COME_BACK_WORDS, comeBackCard, dayStreak, streakTitle, tomorrowLine, wordsIn } from '../src/game/come-back.ts';
import { PEDESTAL, pickTable, pickTablePlane, placeArena, polyArea, polyMinWidth, REACH, reachSpot, tableRank, TRAY_DROP } from '../src/game/placement.ts';
import { eyeView, FORGE_GRIP, FORGE_GRIP_MAX_COS, forgeGripIntent, gazeAngles, hudAnchors, hudAnchorsOffMatch, forgeGrips, touchTargets, traySpot } from '../src/game/reach.ts';
import { decodeEcho, encodeEcho, splitCode } from '../src/game/echo.ts';
import { allBuilds, BALANCE_GAP, edgeOf, buildName, CORES, SEAL_NAMES, EMBLEM_COLORS, NAMED_BUILDS, PRESETS, RIVALS, roleOf, specFromBuild, statsOf, TIPS, WEIGHT_LIMIT, weightOf } from '../src/game/parts.ts';
import { crossguard, crossguardSling, CROSSGUARD_SLING, movingOut, pocketHeading, emberBumper, fingerContact, FINGER_RADIUS, FLICK_MAX, rankingN, roundOverN, stepN, sealStrike, rivalMove, stableHeading, strike, TELL_TIME, Arena, ATTACK, CUP_DEPTH, CUP_SIGMA, DEFENSE, SLING_SPEED, TUNING, finishPoints, MATCH_HEAT, LAUNCH_HEADING_STEP, LAUNCH_SPEED, LAUNCH_TILT, launchSpeed, launchSpin, palmGust, springRim, SPRING_SHIELD, RUB_RATE, RUB_STEP_MAX, spinRub, STAMINA, step, STEP, Top, verdict, DESK_DROP_ON } from '../src/game/sim.ts';
import { rematchAdvice } from '../src/game/mastery.ts';
import { CALL, CALL_REPEAT, callAllowed } from '../src/game/calls.ts';
import { BOUTS, boutOpen, boutSkill, CHAPTERS, medalCount, medalOrder, medalsFrom, nextBout, nextGate, nightBout } from '../src/game/campaign.ts';
import { ARENA_FORGE_SHIELD, arenaForgeAim, arenaForgeDanger, arenaForgeImpulse, arenaForgeRivalAction, classifyArenaForge, deskWrenchImpulse } from '../src/game/arena-forge.ts';
import { brawlSlots, spinStep, targetWinner } from '../src/game/brawl.ts';
import { CARD_HOW_WORDS, CLAIM, LESSON, lessonText, PROMPT_WORDS, promptWords } from '../src/game/lessons.ts';
import { deskSectors, deskWrenchAngle, deskWrenchSteer, inSector } from '../src/game/desk-edge.ts';
import { FpsBook, fpsPhase, QUALITY_MAX, QualityGuard, qualityThresholds } from '../src/game/quality.ts';
import { commitBlocker, FLICK_AFTER_RELEASE, FREE_HAND, gestureOwner, heldElsewhere, listenBlocker, mayCommit, mayListen, RELEASE_LOCK, RUB_TIP_GUST, RUB_TOUCH_SLACK, SHAPING_RELEASE_LOCK } from '../src/game/gesture-owner.ts';
import type { GestureOwner, HandFacts, HandVerb } from '../src/game/gesture-owner.ts';
import { BONES, boneMatrix, handOcclusionOn, JOINTS, PALM, palmMatrix } from '../src/game/hand-proxy.ts';
import { HAND_EURO, OneEuro3 } from '../src/game/one-euro.ts';
import { clampedGrooveX, clampedGrooveZ, grooveLength, hasGrooveIntent, GROOVE_INTENT_LENGTH, GROOVE_MAX_LENGTH, palmCatchDistance, palmCenterX, palmCenterZ } from '../src/game/hand-tools.ts';

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

// Rule tests start the clock at zero; the opening grace (no pockets or ring-outs) would hide
// the rules, so it is off for them and back on for the type loop.
const GRACE = TUNING.grace;
TUNING.grace = 0;

// Committed aim ignores sub-degree hand jitter while retaining deliberate changes between slots.
{
  const held = stableHeading(0.21);
  assert.equal(stableHeading(0.214), held, 'tiny tracking noise keeps the same launch heading');
  assert.notEqual(stableHeading(0.21 + LAUNCH_HEADING_STEP), held, 'a deliberate heading step still changes aim');
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

// 3b. The core move: a bump behind a top drops it into the glowing 3-point pocket.
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
  assert.equal(finishPoints(a), 3);
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

// 5. Verdict rules: one alive wins; both out -> more spin wins; exact spin ties use damage/position.
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
  assert.equal(verdict(a, b, 1), 1);
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

// Opening grace lets tops crack, but holds them together until the player can make a move.
{
  const arena = new Arena();
  arena.grace = 1;
  const a = new Top(STAMINA);
  const b = new Top(ATTACK);
  const clash = () => {
    a.launch(-0.012, 0, 0.2, 0, 1, 1);
    b.launch(0.012, 0, -0.2, 0, 1, -1);
    a.damage = b.damage = 0.99;
    return step(arena, a, b);
  };
  assert.ok(clash(), 'the grace check needs a hard clash');
  assert.ok(a.alive && b.alive && a.damage >= 1 && b.damage >= 1, 'grace should prevent an early burst');
  arena.elapsed = arena.grace;
  assert.ok(clash(), 'the post-grace check needs a hard clash');
  assert.ok(a.finish === 'burst' || b.finish === 'burst', 'the same hit should burst after grace');
}

// 6b. Player shapes: a ramp pushes toward its direction, a well catches and braces, player hands
// retain two ramps each, and the shaping economy's rules.
{
  const flat = arenaWith({ floor: 'flat', pockets: [], rails: [] });
  const t = new Top(DEFENSE);
  const idle = new Top(STAMINA);
  idle.state = 'toppled';
  t.launch(0, 0, 0, 0, 1, 1);
  flat.addShape('ramp', -0.01, 0, 0.06, 'me', 1, 0);
  for (let i = 0; i < 30; i++) step(flat, t, idle);
  assert.ok(t.vx > 0.02, `a ramp should push a top toward its direction, vx ${t.vx.toFixed(3)}`);
  flat.reset();
  flat.addShape('well', 0, 0, 0.02, 'me');
  t.launch(0, 0, 0, 0, 1, 1);
  assert.ok(flat.drag(t) > 0 && flat.well(0, 0) > 0.9 && flat.shapesHeight(0, 0) < 0, 'a well is a hollow that drags');
  flat.addShape('ramp', 0.05, 0, 0.06, 'me', 1, 0);
  assert.equal(flat.shapes.length, 1, 'an owner keeps one live shape');
  flat.addShape('well', -0.05, 0, 0.02, 'rival');
  assert.equal(flat.shapes.length, 2);
  for (let i = 0; i < 1000; i++) flat.update(STEP, t, idle);
  assert.equal(flat.shapes.length, 0, 'shapes leave a readable trace, then relax away');

  const c = new ShapingCharges();
  assert.equal(c.spend(1, 2.5), 0, 'no shaping during the opening grace');
  assert.equal(c.spend(3, 2.5), 1);
  assert.equal(c.spend(3.5, 2.5), SHAPING.strainFactor, 'a second shape within a second is weaker');
  assert.equal(c.spend(6, 2.5), 1, 'the third charge remains available');
  assert.equal(c.spend(7, 2.5), 0, 'three charges, then none');
  c.clash(0.9, 6);
  assert.equal(c.charges, 1, 'a solid clash refills a charge');
  c.update(SHAPING.refill + 0.01);
  assert.equal(c.charges, 2, 'the passive refill restores another charge');
  assert.equal(c.reward(), true, 'an arena combo refunds the last charge');
  assert.equal(c.reward(), false, 'arena combos cannot exceed the charge cap');

  const memory = arenaWith({ floor: 'flat', pockets: [], rails: [] });
  memory.addShape('ramp', -0.04, 0, 0.04, 'left', 1, 0);
  memory.addShape('ramp', 0, 0, 0.04, 'left', 1, 0);
  memory.addShape('ramp', 0.04, 0, 0.04, 'left', 1, 0);
  assert.equal(memory.shapes.length, 2, 'a hand retains its newest two ramps');
  assert.ok(memory.shapes.every((s) => s.x >= 0), 'the oldest same-hand ramp dissolves first');
  memory.addShape('ramp', 0, 0.04, 0.04, 'right', 0, -1);
  assert.equal(memory.shapes.length, 3, 'the other hand adds its own terrain history');

  const dashArena = arenaWith({ floor: 'flat', pockets: [], rails: [] });
  const dash = dashArena.addShape('ramp', 0, 0, 0.04, 'left', 1, 0);
  dash.boost = 1.4;
  const runner = new Top(ATTACK);
  runner.launch(0, 0, 0.12, 0, 0.8, 1);
  assert.equal(dashArena.dashShape(runner), true, 'a top on a live dash rail is claimed');
  assert.ok(runner.sinceDash < 0.2 && runner.vx > 0.4, 'a re-pinched ramp becomes a one-top dash rail');

  const grooveArena = arenaWith({ floor: 'flat', pockets: [], rails: [] });
  const groove = grooveArena.addGroove(-0.06, 0, 0.06, 0, 'left');
  assert.ok(groove && groove.kind === 'groove' && groove.length! > 0.11, 'a fingertip stroke authors one directional line');
  assert.ok(grooveArena.shapesHeight(0, 0) < -0.004 && Math.abs(grooveArena.shapesHeight(0, 0.06)) < 0.001, 'the line is a narrow physical channel');
  const rider = new Top(ATTACK);
  rider.launch(0, 0, 0, 0, 0.8, 1);
  rider.sinceDash = 1;
  assert.equal(grooveArena.dashShape(rider), true, 'the first top to touch a groove takes its direction');
  assert.ok(rider.vx > 0.5 && groove!.boost === 0, 'a groove gives one strong directional kick, then is spent');
  const second = new Top(ATTACK);
  second.launch(0, 0, 0, 0, 0.8, 1);
  second.sinceDash = 1;
  assert.equal(grooveArena.dashShape(second), false, 'the same groove cannot kick a second top');

  const gustArena = arenaWith({ floor: 'flat', pockets: [], rails: [] });
  const crossed = new Top(ATTACK);
  const missed = new Top(DEFENSE);
  crossed.launch(0, 0, 0, 0, 0.8, 1);
  missed.launch(0, gustArena.radius, 0, 0, 0.8, -1);
  assert.equal(palmGust(gustArena, [crossed, missed], -0.11, 0, 0.11, 0, 1), 1, 'an open-palm sweep affects only tops crossed by its path');
  assert.ok(crossed.vx > 0.1 && missed.vx === 0, 'Forge Gust pushes in the physical sweep direction without becoming arena-wide magic');
  const ownTop = new Top(ATTACK);
  const sweptRival = new Top(DEFENSE);
  ownTop.launch(-0.05, 0, 0, 0, 0.8, 1);
  sweptRival.launch(0.05, 0, 0, 0, 0.8, -1);
  assert.equal(palmGust(gustArena, [ownTop, sweptRival], -0.11, 0, 0.11, 0, 1, ownTop), 1, 'a paid gust steers around the sweeping player\'s own top');
  assert.ok(ownTop.vx === 0 && sweptRival.vx > 0.1 && sweptRival.lifted === 0, 'the rival is pushed; with no pocket ahead it is not lifted');
  const pitArena = arenaWith({ floor: 'flat', rails: [], pillars: [], pockets: [{ angle: 0, half: 0.2, points: 2 }] });
  const atPit = new Top(DEFENSE);
  const offPit = new Top(DEFENSE);
  atPit.launch(0, 0, 0, 0, 0.8, -1);
  offPit.launch(0, 0, 0, 0, 0.8, -1);
  palmGust(pitArena, [atPit], -0.11, 0, 0.11, 0, 1, ownTop);
  palmGust(pitArena, [offPit], 0, -0.11, 0, 0.11, 1, ownTop);
  assert.ok(atPit.lifted > 0 && atPit.vx > offPit.vz * 1.5 && offPit.lifted === 0, 'a gust that sweeps the rival at a pocket hits harder and lifts it');

  // Rim spring: your own top is pulled in and shielded; a rival in the sector is slung toward a pocket.
  const springArena = arenaWith({ floor: 'flat', rails: [] });
  const pocket = springArena.layout.pockets[0];
  assert.ok(pocket, 'the default spring arena has a pocket to sling toward');
  const sa = pocket.angle + 0.3;
  const sr = springArena.radius * 0.85;
  const own = new Top(ATTACK);
  const foe = new Top(DEFENSE);
  const far = new Top(DEFENSE);
  own.launch(Math.cos(sa) * sr, Math.sin(sa) * sr, 0, 0, 0.8, 1);
  foe.launch(Math.cos(sa - 0.1) * sr, Math.sin(sa - 0.1) * sr, 0, 0, 0.8, -1);
  far.launch(-Math.cos(sa) * sr, -Math.sin(sa) * sr, 0, 0, 0.8, -1);
  const rimX = Math.cos(sa) * springArena.radius;
  const rimZ = Math.sin(sa) * springArena.radius;
  assert.equal(springRim(springArena, own, [foe, far], rimX, rimZ, rimX * 0.85, rimZ * 0.85, 1), 2, 'a rim spring reaches only tops in its sector');
  assert.ok(own.vx * Math.cos(sa) + own.vz * Math.sin(sa) < -0.1, 'a rim spring pulls your own top inward');
  assert.ok(own.shieldUntil >= springArena.elapsed + SPRING_SHIELD - 1e-9, 'a rim spring holds the wall shut behind your own top');
  const pocketX = Math.cos(pocket.angle) * springArena.radius - foe.x;
  const pocketZ = Math.sin(pocket.angle) * springArena.radius - foe.z;
  assert.ok((foe.vx * pocketX + foe.vz * pocketZ) / Math.hypot(pocketX, pocketZ) > 0.2, 'a rim spring slings the rival along the wall toward its nearest pocket');
  assert.ok(foe.shieldUntil === 0 && far.vx === 0 && far.vz === 0, 'the rival gets no shield and tops outside the sector are untouched');

  const guarded = new Top(ATTACK);
  guarded.launch(0, 0.004, 0, -0.35, 0.8, 1);
  assert.equal(crossguard(guarded, -0.1, 0, 0.1, 0), true, 'two separated palms form one finite defensive rail');
  assert.ok(guarded.vz > 0.2, 'Crossguard visibly returns a top across the palm-authored line');
  const guardMiss = new Top(ATTACK);
  guardMiss.launch(0.13, 0.004, 0, -0.35, 0.8, 1);
  assert.equal(crossguard(guardMiss, -0.1, 0, 0.1, 0), false, 'Crossguard does not become an arena-wide wall');
  // An escaping rival crossing a live rail is sent on toward its nearest pocket, at least CROSSGUARD_SLING fast.
  const slingArena = arenaWith({ floor: 'flat', pockets: [{ angle: 0, half: 0.2, points: 2 }], rails: [] });
  const escaping = new Top(ATTACK);
  escaping.launch(slingArena.radius * 0.7, slingArena.radius * 0.3, 0.05, 0.05, 0.8, 1);
  assert.ok(movingOut(escaping), 'a top heading away from the centre is moving out');
  crossguardSling(slingArena, escaping);
  const heading = pocketHeading(slingArena, escaping.x, escaping.z);
  assert.ok(Math.abs(Math.hypot(escaping.vx, escaping.vz) - CROSSGUARD_SLING) < 1e-9 && escaping.vx * heading.x + escaping.vz * heading.z > CROSSGUARD_SLING * 0.999, 'the sling heads for the pocket mouth at least CROSSGUARD_SLING fast');

  const emberHit = new Top(ATTACK);
  emberHit.launch(0, 0.02, 0, -0.3, 0.8, 1);
  assert.equal(emberBumper(emberHit, 0, 0), true, 'a planted ember post reflects a top that hits it');
  assert.ok(emberHit.vz > 0.15, 'the ember bumper gives a readable return kick');
  const emberRival = new Top(ATTACK);
  emberRival.launch(0.05, 0.02, 0, -0.3, 0.8, 1);
  emberBumper(emberRival, 0.05, 0, 0.014, 0.4);
  assert.ok(emberRival.vx > 0.3, 'the ember post kicks the rival top outward, away from the bowl centre');

  // The fingertip is a body: a paid swing throws a tired top, a fresh one shrugs, a soft touch only nudges.
  const flicked = (spin: number, power: number, swing = 0.5) => {
    const t = new Top(STAMINA);
    t.launch(0, 0, 0, 0, spin, 1);
    fingerContact(t, -(t.spec.radius + FINGER_RADIUS - 0.002), 0, swing, 0, power);
    return t;
  };
  const tired = flicked(0.25, 1);
  const fresh = flicked(1, 1);
  const soft = flicked(0.25, 0);
  assert.ok(tired.vx > 0.4 && Math.abs(tired.vz) < 1e-9, 'a paid flick sends a tired top along the swing, hard enough to pocket it');
  assert.ok(fresh.vx > 0.1 && fresh.vx < tired.vx * 0.6, 'a fresh, fast-spinning top shrugs most of a flick off');
  assert.ok(soft.vx > 0 && soft.vx < 0.35, 'a soft touch nudges a top off the finger without the hand speed');
  assert.ok(flicked(0.2, 1, 5).vx <= FLICK_MAX * STAMINA.knockback + 1e-9, 'no swing hands a top more than FLICK_MAX');
  assert.ok(tired.x > -1e-9, 'a flicked top is pushed out of the finger, never through it');
  const away = new Top(STAMINA);
  away.launch(0.2, 0, 0, 0, 0.3, 1);
  assert.equal(fingerContact(away, 0, 0, 0.5, 0, 1), 0, 'a fingertip only touches the top it overlaps');
  assert.equal(fingerContact(tired, tired.x - 0.02, 0, 0.5, 0, 1), 0, 'one swing is one touch (no double hit on the next frame)');
}

// Spin Rub: a fingertip run along the rim the way the top turns puts spin back; against it brakes.
{
  const rubbed = (spin: number, hand: number) => {
    const t = new Top(STAMINA);
    t.launch(0, 0, 0, 0, spin, hand);
    return t;
  };
  // Tip on the rim at +x: the rim there moves along -z for hand +1 (angle advances by hand, rotation.y).
  const reach = STAMINA.radius + FINGER_RADIUS - 0.001;
  const t = rubbed(0.4, 1);
  const gain = spinRub(t, reach, 0, 0, -0.25, 1, 1 / 72);
  assert.ok(gain > 0 && Math.abs(t.spin - 0.4 - gain) < 1e-12, 'a rub along the spin puts spin back');
  const left = rubbed(0.4, -1);
  assert.ok(spinRub(left, reach, 0, 0, 0.25, 1, 1 / 72) > 0, 'a left-hand top spins up from a rub the other way');
  const wrong = rubbed(0.4, 1);
  const brake = spinRub(wrong, reach, 0, 0, 0.25, 1, 1 / 72);
  assert.ok(brake < 0 && -brake < gain, 'a rub against the spin brakes it, more gently than a right rub adds');
  const far = rubbed(0.4, 1);
  assert.equal(spinRub(far, reach + 0.02, 0, 0, -0.25, 1, 1 / 72), 0, 'no contact, no rub');
  assert.equal(spinRub(rubbed(0.4, 1), reach, 0, -0.3, -0.1, 1, 1 / 72), 0, 'a mostly radial motion is not a rub');
  assert.equal(spinRub(rubbed(0.4, 1), reach, 0, 0, -0.25, 0, 1 / 72), 0, 'an unpaid rub does nothing');
  assert.ok(spinRub(rubbed(0.4, 1), reach, 0, 0, -5, 1, 1) <= RUB_STEP_MAX + 1e-12, 'one rub call is capped');
  const second = rubbed(0.2, 1);
  let total = 0;
  for (let i = 0; i < 72; i++) total += spinRub(second, reach, 0, 0, -5, 1, 1 / 72);
  assert.ok(total <= RUB_RATE + 1e-9, 'a second of rubbing adds at most RUB_RATE');
  const full = rubbed(0.995, 1);
  for (let i = 0; i < 200; i++) spinRub(full, reach, 0, 0, -0.25, 1, 1 / 72);
  assert.ok(full.spin <= 1 + 1e-12 && full.spin > 0.999, 'a rub never raises spin above 1');
  const still = rubbed(0.4, 1);
  for (let i = 0; i < 86; i++) spinRub(still, reach - 0.002, 0, 0, -0.25, 1, 1 / 72);
  assert.ok(Math.hypot(still.x, still.z) < 0.004 && still.vx === 0 && still.vz === 0, 'a rub barely moves the top and never kicks it');
}

// Hand-tool geometry stays deterministic and allocation-free for the live gesture loop.
{
  const px = palmCenterX(-0.04, 0.06);
  const pz = palmCenterZ(0.02, 0.08);
  assert.ok(palmCatchDistance(px, pz, px + 0.02, pz) < 0.021, 'an open palm catch uses its broad centre');
  const x = clampedGrooveX(0, 0, 1, 1);
  const z = clampedGrooveZ(0, 0, 1, 1);
  assert.ok(Math.abs(grooveLength(0, 0, x, z) - GROOVE_MAX_LENGTH) < 1e-9, 'a traced groove is capped to seated reach');
  assert.equal(hasGrooveIntent(0, 0, GROOVE_INTENT_LENGTH - 0.001, 0), false, 'fingertip jitter stays a Cup candidate');
  assert.equal(hasGrooveIntent(0, 0, GROOVE_INTENT_LENGTH + 0.001, 0), true, 'a deliberate sideways trace claims Groove');
  assert.equal(forgeGripIntent(FORGE_GRIP.n, FORGE_GRIP.angle), true, 'the authored right Arena Forge grip owns the inner rim');
  assert.equal(forgeGripIntent(FORGE_GRIP.n, Math.PI - FORGE_GRIP.angle), true, 'the authored left Arena Forge grip owns the inner rim');
  assert.equal(forgeGripIntent(FORGE_GRIP.n, 0), false, 'an ordinary near-rim floor pinch remains a Ramp');
  assert.equal(forgeGripIntent(FORGE_GRIP.n - 0.06, FORGE_GRIP.angle), false, 'a floor pinch inside the forge grip remains a Ramp');
}

TUNING.grace = GRACE;
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
      const sa = launchSpeed(pa);
      const sb = launchSpeed(pb);
      a.launch(0, 0.108, Math.sin(da) * sa, -Math.cos(da) * sa, launchSpin(pa), 1);
      b.launch(0, -0.108, -Math.sin(db) * sb, Math.cos(db) * sb, launchSpin(pb), -1);
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

TUNING.grace = 0;
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

  // The highlighted Crucible pocket keeps its authored 3-point comeback value.
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
    // High closed walls isolate ember drain from the separate late-round pressure rule.
    const a1 = arenaWith({ shrink: false, wall: 'high', pockets: [], rails: [] });
    const a2 = arenaWith({ shrink: true, wall: 'high', pockets: [], rails: [] });
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

// 9. Top parts.
{
  // The classic tops are builds, and every preset fits the weight limit.
  for (const p of PRESETS) assert.ok(weightOf(p.build) <= WEIGHT_LIMIT, `${p.name} is over the weight limit`);
  assert.deepEqual({ ...specFromBuild(PRESETS[0].build), name: 'Striker' }, ATTACK);
  assert.ok(allBuilds().length > 100, 'the parts should allow over a hundred builds');
  const plain = arenaWith({ pockets: [], rails: [] });
  const r = plain.radius;
  // Upper: a lifted top clears a standard wall at a speed that would otherwise bounce back.
  const over = (lifted: boolean) => {
    plain.reset();
    const t = new Top(ATTACK);
    const idle = new Top(DEFENSE);
    idle.state = 'toppled';
    t.launch(r - ATTACK.radius - 0.002, 0, 0.95, 0, 1, 1);
    if (lifted) t.lifted = 0.4;
    step(plain, t, idle);
    return t.state === 'out';
  };
  assert.ok(!over(false) && over(true), 'an upper hit should let a top clear the wall more easily');
  // Height: in a head-on clash the taller top is knocked back harder.
  const clash = (ha: number, hb: number) => {
    plain.reset();
    const a = new Top({ ...ATTACK, height: ha });
    const b = new Top({ ...ATTACK, height: hb });
    a.launch(-0.03, 0, 0.3, 0, 1, 1);
    b.launch(0.03, 0, -0.3, 0, 1, -1);
    for (let i = 0; i < 60 && Math.hypot(b.vx, b.vz) > 0 && b.vx < 0; i++) step(plain, a, b);
    return b.vx;
  };
  assert.ok(clash(0.005, 0.008) > clash(0.006, 0.006), 'a lower top should knock a taller one back harder');
  // Spin direction: opposite spins pass spin from the faster top to the slower one; same spins both lose.
  const spinAfter = (hb: number) => {
    plain.reset();
    const a = new Top(DEFENSE);
    const b = new Top(DEFENSE);
    a.launch(-0.032, 0, 0.2, 0, 1, 1);
    b.launch(0.032, 0, -0.2, 0, 0.5, hb);
    for (let i = 0; i < 5; i++) step(plain, a, b);
    return b.spin;
  };
  assert.ok(spinAfter(-1) > spinAfter(1), 'the slower top should gain spin from an opposite spinner');
  // Gear: a tip without gear never dashes on a rail.
  const rails = arenaWith({ pockets: [] });
  const t = new Top({ ...ATTACK, gear: 0 });
  t.launch(rails.radius - ATTACK.radius - 0.001, 0, 0.3, 0, 1, 1);
  const idle = new Top(DEFENSE);
  idle.state = 'toppled';
  solo(rails, t, 0.05);
  assert.equal(t.sinceDash > 50, true, 'a gearless tip must not dash');
}

// 9b. Named builds and the balance type: a build whose two strongest of attack, defense and
// stamina are within BALANCE_GAP is a balance top; the classics keep their types; named builds
// are legal, made of real parts and play the role they are named for.
{
  assert.equal(roleOf(ATTACK), 'attack');
  assert.equal(roleOf(DEFENSE), 'defense');
  assert.equal(roleOf(STAMINA), 'stamina');
  for (const b of allBuilds()) {
    const st = statsOf(specFromBuild(b));
    const [top, second] = [st.attack, st.defense, st.stamina].sort((p, q) => q - p);
    assert.equal(roleOf(specFromBuild(b)) === 'balance', top - second <= BALANCE_GAP, `${buildName(b)}: balance means a gap of ${BALANCE_GAP} or less (${top} vs ${second})`);
  }
  const roles = new Set(allBuilds().map((b) => roleOf(specFromBuild(b))));
  assert.deepEqual([...roles].sort(), ['attack', 'balance', 'defense', 'stamina'], 'every role has builds');
  const names = new Set<string>();
  for (const n of NAMED_BUILDS) {
    assert.ok(!names.has(n.name), `${n.name} is named once`);
    names.add(n.name);
    assert.ok(!/bey|xtreme|blade|ratchet|driver|layer|stadium|let it rip/i.test(`${n.name} ${n.blurb}`), `${n.name} uses original words`);
    assert.ok(weightOf(n.build) <= WEIGHT_LIMIT, `${n.name} is over the weight limit (${weightOf(n.build)} g)`);
    assert.ok(allBuilds().some((b) => b.ring === n.build.ring && b.core === n.build.core && b.tip === n.build.tip), `${n.name} is a legal build`);
    assert.equal(roleOf(specFromBuild(n.build)), n.role, `${n.name} should be a ${n.role} top`);
    assert.ok(!PRESETS.some((p) => p.name === n.name), `${n.name} is not a preset name`);
  }
}

// 9c. The added arenas: valid, opened by a level of their own, and knockouts happen on them.
{
  for (const name of ['Crucible Gate', 'Gear Rink', 'Sentinel Gates', 'Bellows', 'Ridge Raceway']) {
    const a = ARENAS.find((x) => x.name === name);
    assert.ok(a, `${name} is a built-in arena`);
    assert.equal(validate(a), null, `${name}: ${validate(a)}`);
    assert.ok(a.rule, `${name} has a rule`);
    assert.ok(canKnockOut(a), `${name} can knock out`);
    const r = reportArena(a, 3);
    assert.ok(r.knockout > 0, `${name}: knockouts happen`);
    assert.ok(r.median > 8 && r.median < 30, `${name}: rounds last a while (${r.median.toFixed(1)} s)`);
    const levels = Object.entries(ARENA_UNLOCKS).filter(([, k]) => k === `arena:${name}`).map(([lv]) => Number(lv));
    assert.equal(levels.length, 1, `${name} opens at one level`);
    assert.ok(!String(LEVEL_UNLOCKS[levels[0]] ?? '').startsWith('arena:'), `${name} does not share Lv ${levels[0]} with another arena`);
  }
  assert.equal(new Set(ARENAS.map((a) => a.name)).size, ARENAS.length, 'arena names are unique');
}

// 10. Progression: levels open their unlocks, deeds open theirs, nothing else opens.
{
  const p = new Progress();
  assert.ok(p.isUnlocked('ring:striker') && !p.isUnlocked('ring:saw') && !p.isUnlocked('core:clamp'));
  assert.equal(p.lockText('ring:saw'), 'Knock out Sawtooth or Lv 14');
  const burst = p.award({ won: true, finish: 'burst', perfect: false, matchOver: false, matchWon: false });
  assert.deepEqual(burst.unlocked, ['core:clamp'], 'a burst win should open the 9-60 core');
  const again = p.award({ won: true, finish: 'burst', perfect: false, matchOver: false, matchWon: false });
  assert.ok(!again.unlocked.includes('core:clamp'), 'a deed opens its part once');
  let total = 0;
  for (let lv = 1; lv < 5; lv++) total += xpToNext(lv);
  // Enough lost rounds to reach level 5 from scratch.
  const q = new Progress();
  const levels: number[] = [];
  while (q.level < 5) levels.push(...q.award({ won: false, finish: null, perfect: false, matchOver: false, matchWon: false }).levels);
  assert.deepEqual(levels, [2, 3, 4, 5]);
  assert.ok(q.isUnlocked(LEVEL_UNLOCKS[5]) && !q.isUnlocked(LEVEL_UNLOCKS[6]), 'level 5 opens its part, not level 6');
  assert.ok(total > 0);
  // The first finished match opens the first-session part, win or lose.
  const first = new Progress();
  const r = first.award({ won: false, finish: null, perfect: false, matchOver: true, matchWon: false });
  assert.ok(r.unlocked.includes('tip:spur') && first.matches === 1, 'the first match should open the Rush tip');
}

// 11. The first-session guide only moves forward and survives a save and reload.
{
  const store = new Map<string, string>();
  const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
  const p = new Progress(storage);
  assert.equal(p.guide, 'launch', 'a new player starts at the launch step');
  p.advance('bump');
  p.advance('launch');
  assert.equal(p.guide, 'bump', 'the guide never goes back');
  p.advance('fit');
  p.award({ won: false, finish: null, perfect: false, matchOver: true, matchWon: false });
  const again = new Progress(storage);
  assert.equal(again.guide, 'fit', 'the guide resumes where it was after a reload');
  assert.equal(again.matches, 1);
  assert.ok(again.isUnlocked('tip:spur'));
  again.advance('done');
  assert.equal(new Progress(storage).guide, 'done');
  // Saves from before the guide existed skip it once the player has played.
  const old = new Map([['spinsmith.progress.v1', JSON.stringify({ level: 3, xp: 10, unlocked: [], quests: [] })]]);
  assert.equal(new Progress({ getItem: (k: string) => old.get(k) ?? null, setItem: () => {} }).guide, 'done');
}

// 12. Coming back: every level up to the top gives something, rivals arrive as announced, Smith
// Orders are the same all day and always playable, and stamps, marks and champions are kept.
{
  for (let lv = 2; lv <= MAX_LEVEL; lv++) assert.ok(LEVEL_UNLOCKS[lv] || RIVAL_UNLOCKS[lv], `level ${lv} should give something`);
  for (const r of RIVALS) {
    if (r.level === 1) continue;
    assert.equal(RIVAL_UNLOCKS[r.level], `rival:${r.name}`, `${r.name} should be announced at Lv ${r.level}`);
  }
  for (const k of [...Object.values(LEVEL_UNLOCKS), ...Object.values(STAMP_UNLOCKS)]) {
    if (k.startsWith('emblem:')) assert.ok(Number(k.slice(7)) < EMBLEM_COLORS.length, `${k} should be a known glow`);
  }
  // Orders: deterministic per date, playable with what the player has, different over days.
  const builtIn = ARENAS.slice(0, 3);
  const mine = { ...cloneLayout(ARENAS[0]), name: 'My Arena 1' };
  const ctx = { rivals: ['Rim Raider', 'Iron Keep', 'Drifter'], arenas: builtIn, built: [mine], cup: true, table: true };
  const goals = new Set<string>();
  const start = new Date(2026, 9, 1);
  for (let i = 0; i < 120; i++) {
    const date = localDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    const o = dailyOrder(date, ctx);
    assert.deepEqual(dailyOrder(date, ctx), o, 'the same date gives the same order');
    assert.ok(ctx.rivals.includes(o.rival), 'the order rival is one the player can meet');
    const arena = [...builtIn, mine].find((a) => a.name === o.arena);
    assert.ok(arena, 'the order arena is one the player has');
    if (o.goal === 'ownArena') assert.equal(o.arena, mine.name);
    if (o.goal === 'rampKO') assert.ok(canKnockOut(arena!), 'a knockout order needs an arena where knockouts happen');
    goals.add(o.goal);
  }
  assert.ok(goals.size >= 7, `orders should vary over days (got ${[...goals].join(', ')})`);
  assert.ok(goals.has('deskKO'), 'a known table can offer a real desk-edge order');
  // Tomorrow's teaser differs from today's order on most days.
  let differs = 0;
  for (let i = 0; i < 7; i++) {
    const d = (k: number) => localDate(new Date(2026, 9, 10 + i + k));
    const a = dailyOrder(d(0), ctx);
    const b = dailyOrder(d(1), ctx);
    if (a.rival !== b.rival || a.arena !== b.arena || a.goal !== b.goal) differs++;
  }
  assert.ok(differs >= 6, `tomorrow's order should differ from today's (${differs} of 7)`);
  assert.equal(localDate(new Date(2026, 0, 5)), '2026-01-05');
  // Feasible in play: knockouts and bursts actually happen in simulated rounds on these arenas.
  for (const a of ARENAS) {
    const r = reportArena(a, 3);
    if (canKnockOut(a)) assert.ok(r.knockout > 0, `${a.name}: knockouts should happen for knockout orders`);
  }
  assert.ok(ARENAS.some((a) => reportArena(a, 3).burst > 0), 'bursts should happen for burst orders');
  // Goals are measured from what a round or match reports.
  const o = dailyOrder('2026-10-07', ctx);
  const base: OrderEvent = { rival: o.rival, arena: o.arena, wonRound: true, finish: 'pocket', cause: 'ramp', cupCaughtInRound: false, matchWon: false, shutout: false, role: 'attack', perfectInMatch: false };
  assert.equal(orderMet({ ...o, goal: 'rampKO' }, base), true);
  assert.equal(orderMet({ ...o, goal: 'rampKO' }, { ...base, cause: null }), false, 'a knockout without your ramp does not count');
  assert.equal(orderMet({ ...o, goal: 'rampKO' }, { ...base, rival: 'Nobody' }), false, 'only against the order rival');
  assert.equal(orderMet({ ...o, goal: 'deskKO' }, { ...base, deskKo: true }), true);
  assert.equal(orderMet({ ...o, goal: 'deskKO' }, { ...base, deskKo: false }), false, 'a virtual rim-out is not a desk KO');
  assert.equal(orderMet({ ...o, goal: 'wellSpin' }, { ...base, finish: 'spin', cupCaughtInRound: false }), false, 'placing an empty cup is not enough');
  assert.equal(orderMet({ ...o, goal: 'wellSpin' }, { ...base, finish: 'spin', cupCaughtInRound: true }), true);
  const earlyGoals = new Set(Array.from({ length: 120 }, (_, i) => dailyOrder(localDate(new Date(2026, 9, 1 + i)), { ...ctx, cup: false, table: false }).goal));
  assert.ok(!earlyGoals.has('wellSpin'), 'orders must not ask for a cup before cups are taught');
  assert.ok(!earlyGoals.has('deskKO'), 'orders must not ask for a real edge when no table boundary exists');
  assert.equal(orderMet({ ...o, goal: 'sweep' }, { ...base, matchWon: true, shutout: true }), true);
  // Stamps: once per date, with XP; glows at 5 stamps; a fresh progress has none.
  const storage = new Map<string, string>();
  const st = { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v) };
  const p = new Progress(st);
  assert.ok(p.completeOrder('2026-10-01').gained > 0);
  assert.equal(p.completeOrder('2026-10-01').gained, 0, 'a day gives one stamp');
  for (let d = 2; d <= 5; d++) p.completeOrder(`2026-10-0${d}`);
  assert.equal(p.stamps, 5);
  assert.ok(p.isUnlocked(STAMP_UNLOCKS[5]), 'five stamps earn a glow');
  // Marks: only new marks are reported; champions keep their wins, newest first, at most three.
  assert.equal(p.mark('Iron Keep', MARK.beaten | MARK.knockout), MARK.beaten | MARK.knockout);
  assert.equal(p.mark('Iron Keep', MARK.knockout), 0);
  const b = (tip: 'chisel' | 'ball' | 'needle' | 'orb') => ({ ...PRESETS[0].build, tip });
  p.recordChampion(b('chisel'));
  p.recordChampion(b('dome'));
  p.recordChampion(b('chisel'));
  for (const t of ['pin', 'bead'] as const) p.recordChampion(b(t));
  assert.equal(p.champions.length, CHAMPIONS);
  assert.equal(p.champions[0].build.tip, 'bead');
  const back = new Progress(st);
  assert.equal(back.stamps, 5, 'stamps survive a reload');
  assert.equal(back.marksOf('Iron Keep'), MARK.beaten | MARK.knockout, 'marks survive a reload');
  assert.deepEqual(back.champions.map((c) => c.build.tip), ['bead', 'pin', 'chisel']);
  assert.equal(back.champions[2].wins, 2, 'a champion keeps its record');
  back.recordDeskKo('Iron Keep', PRESETS[1].build, Math.PI / 3, new Date(2026, 9, 7));
  back.recordDeskKo('Drifter', PRESETS[2].build, -Math.PI / 4, new Date(2026, 9, 8));
  back.recordDeskKo('Rim Raider', PRESETS[0].build, 0, new Date(2026, 9, 9));
  back.recordDeskKo('Hookjaw', PRESETS[0].build, Math.PI, new Date(2026, 9, 10));
  const rememberedDesk = new Progress(st).deskTrophies;
  assert.deepEqual(rememberedDesk.map((t) => t.rival), ['Hookjaw', 'Rim Raider', 'Drifter']);
  assert.equal(rememberedDesk[0].date, '2026-10-10', 'desk trophies survive reload with a local date');
  // Rivals remember a repeated opening zone without exposing their stored object to mutation.
  const firstOpening = back.rememberOpening('Iron Keep', 'edge', 0.7, 0.1);
  firstOpening.streak = 99;
  assert.equal(back.openingAgainst('Iron Keep')?.streak, 1, 'opening memory returns a copy');
  back.rememberOpening('Iron Keep', 'edge', 0.65, 0.15);
  back.finishOpening('Iron Keep', 'SIDE HIT · ANGLE WON');
  assert.deepEqual(new Progress(st).openingAgainst('Iron Keep'), { zone: 'edge', streak: 2, x: 0.65, z: 0.15, outcome: 'SIDE HIT · ANGLE WON' });
  assert.equal(back.rememberOpening('Iron Keep', 'center', 0.1, 0).streak, 1, 'changing zones breaks the read');
  // Scars belong to the exact physical build, persist, and reset with the rest of progression.
  const scarBuild = PRESETS[0].build;
  back.recordScar(scarBuild, 'wins');
  back.recordScar(scarBuild, 'shapes');
  back.recordScar(scarBuild, 'orders');
  assert.deepEqual(new Progress(st).scarsFor(scarBuild), { wins: 1, shapes: 1, orders: 1 });
  const resetStorage = new Map<string, string>();
  const resetStore = { getItem: (k: string) => resetStorage.get(k) ?? null, setItem: (k: string, v: string) => void resetStorage.set(k, v) };
  const resetProgress = new Progress(resetStore);
  resetProgress.rememberOpening('Hookjaw', 'ambush', -0.8, 0.2);
  resetProgress.recordScar(scarBuild, 'wins');
  resetProgress.reset();
  assert.equal(resetProgress.openingAgainst('Hookjaw'), null);
  assert.deepEqual(resetProgress.scarsFor(scarBuild), { wins: 0, shapes: 0, orders: 0 });
  // Today's order stays the same all day, even after a level-up opens new rivals, and after a reload.
  const first = back.orderFor('2026-10-07', () => dailyOrder('2026-10-07', ctx));
  const later = back.orderFor('2026-10-07', () => dailyOrder('2026-10-07', { ...ctx, rivals: [...ctx.rivals, 'Leech'] }));
  assert.deepEqual(later, first, 'the order is kept for the day');
  assert.deepEqual(new Progress(st).orderFor('2026-10-07', () => dailyOrder('2026-10-07', { ...ctx, rivals: ['Leech'] })), first);
  assert.notDeepEqual(back.orderFor('2026-10-08', () => dailyOrder('2026-10-08', ctx)).date, first.date);

  // A lost match names one evidenced cause, in priority order, and one concrete correction.
  const evidence = { openingOutcome: '', zone: 'edge' as const, rip: 0.9, finish: 'over' as const, ownBackfire: null, rivalMove: null, shaped: true };
  assert.match(rematchAdvice({ ...evidence, openingOutcome: 'AMBUSH · COUNTER-HIT' }), /change zones/);
  assert.match(rematchAdvice({ ...evidence, ownBackfire: 'RAMP' }), /ramp backfired/);
  assert.match(rematchAdvice({ ...evidence, rivalMove: 'QUAKE' }), /quake decided/);
  assert.match(rematchAdvice({ ...evidence, rip: 0.4 }), /launch was soft/);
  assert.match(rematchAdvice({ ...evidence, finish: 'spin' }), /ran dry/);
  assert.match(rematchAdvice({ ...evidence, shaped: false }), /shape the arena earlier/);
}

// 13. Original vocabulary and heat scoring: no numbered cores or borrowed tip names; outlasting
// scores 1 heat, ordinary knockouts 2, one highlighted pocket 3, a real-desk KO adds 1, first to 4.
{
  const borrowed = ['Flat', 'Rush', 'Taper', 'Ball', 'Needle', 'Orb'];
  for (const c of CORES) assert.ok(!/^\d+-\d+$/.test(c.name), `core ${c.id} needs a name, not a number`);
  for (const t of TIPS) assert.ok(!borrowed.includes(t.name), `tip ${t.id} needs an original name`);
  for (const p of PRESETS) assert.ok(!borrowed.includes(p.name), `preset ${p.name} needs an original name`);
  assert.equal(MATCH_HEAT, 4);
  const t = new Top(ATTACK);
  for (const [finish, heat] of [['spin', 1], ['over', 2], ['pocket', 2], ['burst', 2]] as const) {
    t.finish = finish;
    assert.equal(finishPoints(t), heat, `${finish} should score ${heat} heat`);
    assert.equal(finishPoints(t, true), 1, `${finish} should score one tutorial heat`);
    assert.equal(finishPoints(t, false, finish === 'over'), heat + (finish === 'over' ? 1 : 0), 'only a thrown top can earn the desk bonus');
  }
  for (const a of ARENAS) {
    if (!a.pockets.length) continue;
    assert.equal(a.pockets.filter((p) => p.points === 3).length, 1, `${a.name}: exactly one pocket is the 3-point target`);
    assert.ok(a.pockets.slice(1).every((p) => p.points === 2), `${a.name}: other pockets stay worth 2`);
  }
}

// 14. Placement: the arena goes a reach ahead whichever way the head faces, turned to face it,
// onto the nearest usable table, and onto a tray when the only table is too low or too far.
{
  const head = { x: 0.3, y: 1.2, z: -0.4 };
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const at = placeArena(head, fx, fz, []);
    assert.ok(Math.abs(Math.hypot(at.x - head.x, at.z - head.z) - REACH) < 1e-9, 'the arena is a reach ahead');
    assert.ok(Math.abs(at.y - (head.y - TRAY_DROP)) < 1e-9 && !at.onTable, 'without a table it floats on the tray');
    // Local +Z (sin yaw, cos yaw) points back at the head.
    const back = [Math.sin(at.yaw), Math.cos(at.yaw)];
    const toHead = [(head.x - at.x) / REACH, (head.z - at.z) / REACH];
    assert.ok(Math.abs(back[0] - toHead[0]) < 1e-9 && Math.abs(back[1] - toHead[1]) < 1e-9, 'the arena faces the head');
  }
  const near = { x: 0.3, y: 0.75, z: -0.9 };
  const far = { x: 1.5, y: 0.7, z: 0.5 };
  const at = placeArena(head, 0, -1, [far, near]);
  assert.ok(at.onTable && Math.abs(at.y - (near.y + PEDESTAL)) < 1e-9, 'the nearest table is used');
  assert.ok(!placeArena(head, 0, -1, [{ x: 0.3, y: 0.4, z: -0.9 }]).onTable, 'a table far below the eyes is not used');
  assert.ok(!placeArena({ ...head, y: 1.7 }, 0, -1, [{ x: 0.3, y: 0.9, z: -0.9 }]).onTable, 'standing over a low table uses the tray');
  assert.ok(Number.isFinite(placeArena(head, 0, 0, []).x), 'looking straight down still places ahead');
}

// 14b. Unlabelled tables: a flat, upward-facing plane at desk height with a usable top counts as
// a table (ranked below a labelled one); floors, ceilings, walls, couches, tiny or odd-height
// planes never do; and the one used is under the spot in front of the seated player.
{
  const rect = (cx: number, cz: number, w: number, d: number) => [
    { x: cx - w / 2, z: cz - d / 2 }, { x: cx + w / 2, z: cz - d / 2 }, { x: cx + w / 2, z: cz + d / 2 }, { x: cx - w / 2, z: cz + d / 2 },
  ];
  const desk = rect(0, -0.75, 1.2, 0.6);
  assert.ok(Math.abs(polyArea(desk) - 0.72) < 1e-9 && Math.abs(polyMinWidth(desk) - 0.6) < 1e-9, 'polygon area and width');
  const flat = (semanticLabel: string | undefined, y: number, poly = desk, upY = 1, orientation = 'horizontal') => ({ orientation, semanticLabel, upY, y, poly });
  const headY = 1.2;
  assert.equal(tableRank(flat('table', 0.74), 0, headY), 0, 'a labelled table is rank 0');
  assert.equal(tableRank(flat('desk', 0.74), null, headY), 0, 'a labelled desk is rank 0');
  for (const label of [undefined, '', 'other', 'OTHER', 'something new']) assert.equal(tableRank(flat(label, 0.74), 0, headY), 1, `an unlabelled (${label}) desk-height plane is rank 1`);
  for (const label of ['floor', 'ceiling', 'wall', 'couch', 'bed', 'shelf', 'storage', 'global mesh']) assert.equal(tableRank(flat(label, 0.74), 0, headY), null, `a ${label} is never a table`);
  assert.equal(tableRank(flat('other', 0.74, desk, -1), 0, headY), 1, 'a flipped desk-height plane (IWER rooms store -1) still counts');
  assert.equal(tableRank(flat('other', 0.74, desk, 0.5), 0, headY), null, 'a tilted plane is not a table');
  assert.equal(tableRank(flat('other', 2.4, desk, -1), 0, headY), null, 'a ceiling-height plane is not a table');
  assert.equal(tableRank(flat('other', 0.74, desk, 1, 'vertical'), 0, headY), null, 'a vertical plane is not a table');
  assert.equal(tableRank(flat('other', 0.74, desk, 1, ''), 0, headY), 1, 'an unset orientation is judged by the normal (flat: a table)');
  assert.equal(tableRank(flat('other', 0.74, desk, 0.1, ''), 0, headY), null, 'an unset orientation is judged by the normal (upright: not a table)');
  assert.equal(tableRank(flat('other', 0.4), 0, headY), null, 'a surface below 0.45 m (a seat) is not a table');
  assert.equal(tableRank(flat('other', 1.2), 0, 1.7), null, 'a surface above 1.15 m is not a table');
  assert.equal(tableRank(flat('other', 0.74, rect(0, -0.75, 0.6, 0.2)), 0, headY), null, 'a narrow ledge is not a table');
  assert.equal(tableRank(flat('other', 0.74, rect(0, -0.75, 0.32, 0.32)), 0, headY), null, 'a stool-sized top is not a table');
  assert.equal(tableRank(flat('other', 0.74, []), 0, headY), null, 'a plane without an outline is not a table');
  // Heights are measured from the floor plane when there is one, else from the eyes.
  assert.equal(tableRank(flat('other', 0.25), -0.5, headY), 1, 'a desk 0.75 m above a lower floor plane counts');
  assert.equal(tableRank(flat('other', 0.74), null, headY), 1, 'without a floor, 0.46 m below the eyes counts');
  assert.equal(tableRank(flat('other', 1.1), null, headY), null, 'without a floor, a surface at eye level does not');

  const head = { x: 0, y: headY, z: 0 };
  const spot = reachSpot(head, 0, -1);
  assert.ok(Math.abs(spot.z + REACH) < 1e-9 && spot.x === 0, 'the spot is a reach ahead');
  const surface = { x: 0, y: 0.74, z: -0.75, rank: 1 as const, poly: desk };
  const at = placeArena(head, 0, -1, [surface]);
  assert.ok(at.onTable && Math.abs(at.y - (0.74 + PEDESTAL)) < 1e-9, 'an unlabelled desk in front holds the arena');
  assert.ok(!placeArena(head, 0, 1, [surface]).onTable, 'an unlabelled surface behind the player is not used');
  assert.equal(pickTable(head, [surface]), null, 'an unlabelled surface needs the spot it must be under');
  const chair = { x: 0, y: 0.74, z: 0, rank: 1 as const, poly: rect(0, 0, 1.6, 2) };
  assert.equal(pickTable(head, [chair], spot), null, 'a surface the head is above is not used');
  const labelled = { x: 0.8, y: 0.7, z: -0.6, rank: 0 as const, poly: rect(0.8, -0.6, 0.6, 0.6) };
  assert.equal(pickTablePlane(head, [surface, labelled], spot), labelled, 'a labelled table outranks a nearer unlabelled one');
  const nearSurface = { ...surface, x: 0.2, poly: rect(0.2, -0.75, 1.2, 0.6) };
  const sideSurface = { x: 0.9, y: 0.8, z: -0.5, rank: 1 as const, poly: rect(0.9, -0.5, 0.6, 0.6) };
  assert.equal(pickTablePlane(head, [sideSurface, nearSurface], spot), nearSurface, 'of two surfaces, the one under the spot');
  const edge = { x: 0, y: 0.74, z: -1.06, rank: 1 as const, poly: rect(0, -1.06, 1, 0.6) };
  assert.equal(pickTable(head, [edge], spot), 0.74, 'a surface within the fit move of the spot is used');
  const far = { x: 0, y: 0.74, z: -1.2, rank: 1 as const, poly: rect(0, -1.2, 1, 0.6) };
  assert.equal(pickTable(head, [far], spot), null, 'a surface out of reach of the spot is not used');
}

// 14c. The verb cliff is gone: after the first match's lessons, exactly one hand verb (with its own
// card) is released per completed match, the most useful (measured) first.
{
  const order = Object.entries(VERB_RELEASE).sort((a, b) => a[1] - b[1]);
  assert.deepEqual(order.map(([, m]) => m), order.map((_, i) => i + 1), 'one verb per completed match, from the second match on');
  assert.deepEqual(order.filter(([v]) => v !== 'cup').slice(0, 5).map(([v]) => v), ['spring', 'gust', 'ember', 'rub', 'crossguard'], 'measured verbs arrive by win points');
  // Bouts 1-2 to 1-4 teach the move the previous match's card just released (bout n is match n).
  for (let i = 1; i <= 3; i++) assert.ok(BOUTS[i].lesson.toLowerCase().includes(VERB_CARD[verbReleasedAt(i)!][0].split(' ')[0].toLowerCase()), `bout ${BOUTS[i].id} teaches ${verbReleasedAt(i)}`);
  // Campaign lessons and medals only ask for a verb its bout has released (bout n is match n).
  for (const b of BOUTS) if (b.medals.includes('wellSpin') || /cup/i.test(b.lesson)) assert.ok(BOUTS.indexOf(b) >= VERB_RELEASE.cup, `bout ${b.id} asks for a cup only after cups are released`);
  assert.equal(verbReleasedAt(0), undefined, 'the first match releases no extra verb');
  for (const [v, m] of order) {
    assert.equal(verbReleasedAt(m), v);
    const [name, blurb] = VERB_CARD[v as keyof typeof VERB_CARD];
    assert.ok(name.length > 0 && name.length <= 16 && blurb.length > 0 && blurb.length <= 60, `${v} has one short unlock card`);
  }
  assert.equal(verbReleasedAt(order.length + 1), undefined);
}

// 14d. The first match teaches with ghost hands, not paragraphs: every prompt a new smith reads in
// match 1 (and every NEW MOVE card's how-line) stays within its word budget.
{
  assert.equal(promptWords('PINCH + PULL: SPRING'), 3, 'symbols are not words');
  const seals = Object.values(SEAL_NAMES);
  const prompts: string[] = [
    ...Object.values(LESSON),
    ...Object.values(CLAIM),
    lessonText.rival(RIVALS[0].name, RIVALS[0].title),
    ...['SQUEEZE!', 'STRETCH!', 'TWIST!', 'TILT!'].map(lessonText.forgeLive),
    ...seals.map(lessonText.strike),
    ...seals.map(lessonText.overforge),
    lessonText.strikeNotReady(100),
  ];
  let total = 0;
  for (const p of prompts) {
    const n = promptWords(p);
    total += n;
    assert.ok(n <= PROMPT_WORDS, `first-match prompt over ${PROMPT_WORDS} words (${n}): ${JSON.stringify(p)}`);
  }
  for (const [name, how] of Object.values(VERB_CARD)) {
    const n = promptWords(how);
    total += n;
    assert.ok(n <= CARD_HOW_WORDS, `NEW MOVE ${name} card over ${CARD_HOW_WORDS} words (${n}): ${JSON.stringify(how)}`);
  }
  // The probes read these exact words.
  for (const [text, key] of [[LESSON.forge, 'SQUEEZE INWARD'], [LESSON.forgeDesk, 'WRENCH IT OFF YOUR DESK'], [CLAIM.FORGE, 'PINCH BOTH GLOWS'], [CLAIM.RIM, 'PINCH + PULL: SPRING'], [CLAIM.RAMP, 'PINCH + DRAG: RAMP']]) assert.ok(text.includes(key), `${key} kept for the probes`);
  console.log(`first-match prompts: ${prompts.length} + ${Object.keys(VERB_CARD).length} cards, ${total} words`);
}

// 15. Shared headsets: the demo save is a level-8 smith past the first session with stamps, marks
// and champions; a fresh save and Progress.reset() bring back the first session.
{
  const mem = new Map<string, string>();
  const st = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
  demoSave(st, new Date(2026, 9, 7));
  const p = new Progress(st);
  assert.equal(p.level, 8);
  assert.equal(p.guide, 'done');
  assert.equal(p.stamps, 3);
  assert.ok(p.matches >= Math.max(...Object.values(VERB_RELEASE)), 'the demo save plays with every released verb');
  assert.ok(p.champions.length >= 2 && p.marksOf('Rim Raider') === 7, 'the demo shows champions and a full medallion');
  assert.ok(mem.has('spinsmith.top.v1'));
  p.reset();
  const again = new Progress(st);
  assert.ok(again.level === 1 && again.guide === 'launch' && again.stamps === 0 && again.champions.length === 0, 'a reset is a new smith');
  freshSave(st);
  for (const k of SAVE_KEYS) assert.ok(!mem.has(k), `fresh clears ${k}`);
  // Real storage: keys outside the list (anchored pose, desk scars, comfort) go too; other sites' keys stay.
  for (const k of ['spinsmith.spatial-pose.v1', 'spinsmith.room-imprints.v1', 'spinsmith.comfort.v1', 'spinsmith.hint.flick', 'other.app']) mem.set(k, '1');
  const listed = { ...st, get length() { return mem.size; }, key: (i: number) => [...mem.keys()][i] ?? null };
  freshSave(listed);
  assert.deepEqual([...mem.keys()], ['other.app'], 'a fresh start on a shared headset forgets every spinsmith key, and only those');
}
{
  // An interrupted match: the round-start snapshot round-trips, and stale, future, other-version
  // or malformed ones are ignored (and dropped from storage). A fresh start clears it.
  const now = 1_800_000_000_000;
  const snap: MatchSnapshot = {
    v: RESUME_VERSION, at: now - 60_000, mine: 2, theirs: 1, round: 3, tutorialRound: 3, bout: '1-2', rival: RIVALS[1].name, arena: ARENAS[0].name,
    myBuild: 'abc', theirBuild: 'def', perfect: true, wasDown: false, heroRamp: true, rounds: ['RING OUT', 'POCKET', 'DESK KO'],
  };
  assert.deepEqual(decodeSnapshot(encodeSnapshot(snap), now), snap, 'resume snapshot round trip');
  assert.equal(decodeSnapshot(encodeSnapshot({ ...snap, at: now - RESUME_MAX_AGE - 1 }), now), null, 'a snapshot older than 12 h is ignored');
  assert.ok(RESUME_MAX_AGE === 12 * 3600 * 1000);
  assert.equal(decodeSnapshot(encodeSnapshot({ ...snap, at: now + 3_600_000 }), now), null, 'a snapshot from the future is ignored');
  assert.equal(decodeSnapshot(JSON.stringify({ ...snap, v: RESUME_VERSION + 1 }), now), null, 'a version mismatch is ignored');
  assert.equal(decodeSnapshot('{not json', now), null, 'garbage is ignored');
  assert.equal(decodeSnapshot(JSON.stringify({ ...snap, mine: -1 }), now), null, 'a negative score is ignored');
  assert.equal(decodeSnapshot(null, now), null);
  const mem = new Map<string, string>();
  const st = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
  saveSnapshot(snap, st);
  assert.ok(RESUME_KEY.startsWith('spinsmith.') && mem.has(RESUME_KEY), 'the snapshot lives under a spinsmith key');
  assert.deepEqual(loadSnapshot(st, now), snap, 'stored snapshot loads');
  assert.equal(loadSnapshot(st, now + RESUME_MAX_AGE), null, 'stale stored snapshot is ignored');
  assert.ok(!mem.has(RESUME_KEY), 'and removed');
  saveSnapshot(snap, st);
  clearSnapshot(st);
  assert.ok(!mem.has(RESUME_KEY), 'match end or home clears it');
  saveSnapshot(snap, st);
  freshSave(st);
  assert.ok(!mem.has(RESUME_KEY), 'freshSave clears the resume snapshot');
}

// Reason to come back: the day streak counts days in a row with a finished match (alive until
// today is over), survives a reload, and the result card names tomorrow's order and the next bout,
// every line at six words or fewer.
{
  assert.equal(addDays('2026-10-31', 1), '2026-11-01', 'tomorrow crosses a month');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01', 'tomorrow crosses a year');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28', 'yesterday crosses a month back');
  assert.equal(dayStreak([], '2026-10-22'), 0, 'no play, no streak');
  assert.equal(dayStreak(['2026-10-20', '2026-10-21', '2026-10-22'], '2026-10-22'), 3, 'three days in a row');
  assert.equal(dayStreak(['2026-10-20', '2026-10-21'], '2026-10-22'), 2, 'a streak is alive until today is over');
  assert.equal(dayStreak(['2026-10-19', '2026-10-21', '2026-10-22'], '2026-10-22'), 2, 'a missed day breaks the streak');
  assert.equal(dayStreak(['2026-10-19', '2026-10-20'], '2026-10-22'), 0, 'two days away ends it');
  assert.equal(streakTitle(1, true), 'DAY 1 STREAK');
  assert.equal(streakTitle(3, false), '3-DAY STREAK · PLAY TODAY');
  const mem = new Map<string, string>();
  const st = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
  const p = new Progress(st);
  for (const d of ['2026-10-21', '2026-10-22', '2026-10-22']) p.playedOn(d);
  const reloaded = new Progress(st);
  assert.ok(reloaded.hasPlayed('2026-10-22') && reloaded.streak('2026-10-22') === 2 && reloaded.streak('2026-10-23') === 2 && reloaded.streak('2026-10-24') === 0, 'the streak is saved and read back');
  reloaded.reset();
  assert.equal(new Progress(st).streak('2026-10-22'), 0, 'a new smith has no streak');
  // The demo save shows a live three-day streak on its board.
  const demo = demoSave(st, new Date(2026, 9, 7));
  assert.ok(demo.streak('2026-10-07') === 3 && !demo.hasPlayed('2026-10-07'), 'the demo smith has a streak to keep today');
  // Tomorrow's order is a real order for tomorrow's date: deterministic, and what the card says.
  const ctx = { rivals: RIVALS.map((r) => r.name), arenas: ARENAS, built: [], table: true };
  const tomorrow = dailyOrder(addDays('2026-10-22', 1), ctx);
  assert.equal(tomorrow.date, '2026-10-23');
  assert.deepEqual(dailyOrder('2026-10-23', ctx), tomorrow, 'the teaser is the order tomorrow brings');
  assert.equal(tomorrowLine(tomorrow), `Tomorrow: ${tomorrow.rival} in ${tomorrow.arena}`);
  const card = comeBackCard(1, tomorrow, nextBout({}, true, 0));
  assert.deepEqual(card.split('\n'), ['DAY 1 STREAK', `Tomorrow: ${tomorrow.rival} in ${tomorrow.arena}`, 'Next bout 1-1: Drifter'], 'the first card: streak, tomorrow, next bout');
  assert.equal(comeBackCard(4, null, null), 'DAY 4 STREAK\nTomorrow: a new Smith Order', 'no order known, no bout left: still a pull');
  // Every rival, arena and bout (and a long workshop arena name) stays within six words a line.
  const lines: string[] = [streakTitle(12, true), streakTitle(12, false), tomorrowLine(null)];
  for (const r of RIVALS) for (const a of [...ARENAS.map((x) => x.name), 'My Very Own Big Arena']) lines.push(tomorrowLine({ date: '2026-10-23', rival: r.name, arena: a, goal: 'burst', text: '' }));
  for (const b of BOUTS) lines.push(boutLine(b));
  for (const l of lines) assert.ok(wordsIn(l) <= COME_BACK_WORDS && wordsIn(l) > 0, `come-back line too long: ${l}`);
}

// 16. Reach: every target touched directly sits within a seated arm's comfortable reach and not
// too steeply below the eyes, for trays 0.30-0.45 m below the eyes (Meta suggests 0.42-0.46 m for
// direct touch and warns against 0.5-0.8 m; the arena is drawn 2.4x, so the far tray parts of a
// full forge drawer reach a little farther). The two-hand forge grips of every arena are held to the same bound.
{
  const targets: [string, { x: number; y: number; z: number }][] = [...touchTargets(ARENAS), ['tray, outer of a full drawer', traySpot(0, 8)]];
  const floor = new Map(ARENAS.map((l) => [l.name, new Arena(l)]));
  for (const drop of [0.3, 0.35, 0.4, 0.45]) {
    for (const [name, spot] of targets) {
      const grip = floor.get(name.replace(/ forge grip (left|right)$/, ''));
      const at = grip && name.includes('forge grip') ? { ...spot, y: grip.height(spot.x, spot.z) } : spot;
      const v = eyeView(at, drop);
      assert.ok(v.distance >= 0.32 && v.distance <= 0.67, `${name} at drop ${drop}: ${v.distance.toFixed(2)} m from the eyes`);
      assert.ok(v.below <= 63, `${name} at drop ${drop}: ${v.below.toFixed(0)} degrees below the eyes`);
    }
  }
}

// 16b. Reach: the two-hand forge grips of every arena sit within 2 ft (0.61 m) of a seated player's
// eyes for trays 0.30-0.40 m below them (the default is 0.35). The deepest tray (0.45 m) puts the
// eyes 0.45 m above the floor on its own, so there only the 16 bound holds. The old side grips
// (x = +-r) sat 0.83-0.90 m away.
{
  for (const layout of ARENAS) {
    const arena = new Arena(layout);
    for (const g of forgeGrips(layout)) {
      const at = { ...g, y: arena.height(g.x, g.z) };
      for (const drop of [0.3, 0.35, 0.4]) {
        const v = eyeView(at, drop);
        assert.ok(v.distance <= 0.61, `${layout.name} forge grip at drop ${drop}: ${v.distance.toFixed(2)} m from the eyes`);
      }
    }
    const [l, r] = forgeGrips(layout);
    assert.ok((l.x * r.x + l.z * r.z) / (Math.hypot(l.x, l.z) * Math.hypot(r.x, r.z)) < FORGE_GRIP_MAX_COS - 0.25, `${layout.name} grips leave slack under the forge's opposite-rim test`);
  }
}

// 16b2. Field of view: every essential read surface (the round card and its prompts, the match bar,
// the count/KO/verdict stamp, the forge card, the home note) sits within +-35 degrees vertically and
// +-40 degrees horizontally of a seated head looking at the arena centre, for trays 0.30-0.45 m below
// the eyes, on every arena (slid back as a match slides it), with a standard or a high wall.
{
  const near = (l: ArenaLayout) => Math.max(0, rimRadius(l, Math.PI / 2) - 0.17) * 2.4;
  for (const layout of ARENAS) {
    const surfaces: [string, { x: number; y: number; z: number }, number][] = [
      ...[0, 0.016].flatMap((lift) => hudAnchors(layout, lift, near(layout)).map(([n, at]): [string, typeof at, number] => [n, at, REACH + near(layout)])),
      ...hudAnchorsOffMatch(layout).map(([n, at]): [string, typeof at, number] => [n, at, REACH]),
    ];
    for (const drop of [0.3, 0.35, 0.4, 0.45]) {
      for (const [name, at, reach] of surfaces) {
        const g = gazeAngles(at, drop, reach);
        assert.ok(Math.abs(g.up) <= 35 && Math.abs(g.side) <= 40, `${layout.name} ${name} at drop ${drop}: ${g.up.toFixed(1)} up, ${g.side.toFixed(1)} across`);
      }
    }
  }
}

// 16c. Echo codes: a recorded match survives the code (to its steps), in any case, after the build.
{
  const echo = {
    rips: [{ power: 0.91, aim: -0.3 }, { power: 0.5, aim: 0.6 }, { power: 1, aim: 0 }],
    forges: [
      { round: 0, t: 3.5, action: 'squeeze' as const, sign: 1 as const },
      { round: 1, t: 12.25, action: 'twist' as const, sign: -1 as const },
      { round: 2, t: 0.75, action: 'tilt' as const, sign: 1 as const },
    ],
  };
  const text = encodeEcho(echo);
  const back = decodeEcho(text.toLowerCase());
  assert.ok(back, `echo ${text} decodes`);
  assert.equal(back.rips.length, 3);
  back.rips.forEach((r, i) => {
    assert.ok(Math.abs(r.power - echo.rips[i].power) <= 0.5 / 35 + 1e-9, `rip ${i} power`);
    assert.ok(Math.abs(r.aim - echo.rips[i].aim) <= 0.6 / 35 + 1e-9, `rip ${i} aim`);
  });
  assert.deepEqual(back.forges, echo.forges, 'forges survive exactly (quarter-second times)');
  assert.equal(decodeEcho(encodeEcho({ rips: [{ power: 0.7, aim: 0 }], forges: [] }))?.forges.length, 0, 'an echo without forges');
  assert.equal(decodeEcho('R1'), null, 'half a rip is not an echo');
  assert.equal(decodeEcho('R1A_1'), null, 'a cut-off forge is not an echo');
  const split = splitCode(`k3f9-2.${text}`);
  assert.equal(split.build, 'K3F9-2');
  assert.deepEqual(split.echo?.forges, echo.forges);
  assert.equal(splitCode('K3F9-2').echo, null, 'a plain challenge code has no echo');
}

// 17. The arena rotation: a newly opened arena comes first, then the rival's home unless it was
// just played, then the one played longest ago; never the same arena twice in a row.
{
  for (const [rival, home] of Object.entries(RIVAL_HOME)) {
    assert.ok(RIVALS.some((r) => r.name === rival), `${rival} is a rival`);
    assert.ok(ARENAS.some((a) => a.name === home), `${home} is an arena`);
  }
  const open = ['Forge Bowl', 'Ember Ring', 'Zero-G Dish'];
  assert.equal(nextArena(open, ['Forge Bowl'], ['Forge Bowl', 'Ember Ring'], 'Drifter'), 'Zero-G Dish', 'a never-played arena first');
  assert.equal(nextArena(open, ['Forge Bowl'], open, 'Hookjaw'), 'Ember Ring', "the rival's home next");
  assert.equal(nextArena(open, ['Ember Ring', 'Forge Bowl'], open, 'Hookjaw'), 'Zero-G Dish', 'not the home just played: the oldest');
  let recent = ['Forge Bowl'];
  const rivals = ['Rim Raider', 'Iron Keep', 'Drifter', 'Hookjaw'];
  for (let i = 0; i < 40; i++) {
    const a = nextArena(open, recent, open, rivals[i % rivals.length]);
    assert.notEqual(a, recent[0], 'never the same arena twice in a row');
    recent = [a, ...recent.filter((x) => x !== a)];
  }
  assert.equal(nextArena(['Forge Bowl'], ['Forge Bowl'], ['Forge Bowl'], 'Drifter'), 'Forge Bowl', 'one arena: that one');
}

// 18. The real table: inside tests, and the arena moved in from the edge so its rim stays on the wood,
// never by more than MAX_FIT_MOVE.
{
  const desk = [{ x: -0.6, z: -0.9 }, { x: 0.6, z: -0.9 }, { x: 0.6, z: -0.3 }, { x: -0.6, z: -0.3 }];
  assert.ok(insidePoly(desk, 0, -0.6) && !insidePoly(desk, 0, -0.2) && !insidePoly(desk, 0.7, -0.6));
  assert.ok(Math.abs(edgeDistance(desk, 0, -0.6) - 0.3) < 1e-9);
  const rim = 0.2;
  const fits = (p: { x: number; z: number }) => insidePoly(desk, p.x, p.z) && edgeDistance(desk, p.x, p.z) >= rim + RIM_MARGIN - 1e-9;
  const ok = fitToTable({ x: 0, z: -0.6 }, desk, rim);
  assert.deepEqual(ok, { x: 0, z: -0.6 }, 'an arena that fits stays where it is');
  const near = fitToTable({ x: 0, z: -0.45 }, desk, rim);
  assert.ok(fits(near) && Math.hypot(near.x, near.z + 0.45) <= MAX_FIT_MOVE + 1e-9, 'an arena over the near edge moves in just enough');
  const small = [{ x: -0.2, z: -0.8 }, { x: 0.2, z: -0.8 }, { x: 0.2, z: -0.6 }, { x: -0.2, z: -0.6 }];
  const far = fitToTable({ x: 0, z: -0.3 }, small, rim);
  assert.ok(Math.hypot(far.x, far.z + 0.3) <= MAX_FIT_MOVE + 1e-9, 'a table too small never pulls the arena further than MAX_FIT_MOVE');
}

// 19. The cup catches the first top that rolls in and holds only that one; the other rolls over it.
// A sling throws the caught top and removes the cup; letting go frees it.
{
  const layout = { ...ARENAS[0], pockets: [], rails: [], pillars: [], floor: 'flat' as const, depth: 0.0, vortex: 0, spinner: 0, tilt: 0, shrink: false };
  const arena = new Arena(layout);
  arena.elapsed = 10;
  const a = new Top(STAMINA);
  const b = new Top(STAMINA);
  a.launch(-0.03, 0, 0.12, 0, 1, 1);
  b.launch(0.05, 0.06, 0, 0, 1, -1);
  const cup = arena.addShape('well', 0, 0, CUP_DEPTH, 'me', 0, 0, CUP_SIGMA);
  cup.trap = true;
  cup.held = true;
  for (let i = 0; i < 240; i++) step(arena, a, b);
  assert.equal(cup.caught, a, 'the first top into the cup is caught');
  assert.ok(Math.hypot(a.x, a.z) < CUP_SIGMA, `the caught top stays in the cup (${Math.hypot(a.x, a.z).toFixed(3)})`);
  assert.equal(Arena.strength(cup), 1, 'a held cup stays at full strength');
  const thrown = arena.sling(cup, 1, 0);
  assert.equal(thrown, a);
  assert.ok(a.vx > SLING_SPEED * 0.9 && !arena.shapes.includes(cup), 'a sling throws the caught top and the cup is gone');
  const cup2 = arena.addShape('well', 0.06, 0.06, CUP_DEPTH, 'me', 0, 0, CUP_SIGMA);
  cup2.trap = true;
  cup2.held = true;
  arena.free(cup2);
  assert.ok(!cup2.held && !cup2.trap && Arena.strength(cup2) <= 1, 'letting go frees the cup');
}

// 20. Press to place: a palm brought down onto the table and held is a press, at the table's
// height; a hand resting from the start, a slow drift down or a hold in mid-air is not.
{
  const dt = 1 / 72;
  const TABLE = 0.74;
  /** Runs a trace of hand heights; returns the first contact height found, or null. */
  const run = (ys: (number | null)[], lo = TABLE - 0.04, hi = TABLE + 0.04) => {
    const touch = new TableTouch();
    for (const y of ys) {
      const hit = touch.update(y, dt, lo, hi);
      if (hit !== null) return hit;
    }
    return null;
  };
  const hold = (y: number, s: number) => Array.from({ length: Math.round(s / dt) }, () => y);
  const move = (a: number, b: number, s: number) => Array.from({ length: Math.round(s / dt) }, (_, i) => a + ((b - a) * (i + 1)) / Math.round(s / dt));
  const press = [...hold(0.9, 0.3), ...move(0.9, TABLE + 0.005, 0.4), ...hold(TABLE + 0.005, 0.5)];
  const hit = run(press);
  assert.ok(hit !== null && Math.abs(hit - (TABLE + 0.005)) < 1e-6, 'a palm brought down and held is a press, at its height');
  assert.equal(run(hold(TABLE + 0.005, 3)), null, 'a hand resting on the table from the start is not a press');
  assert.ok(run([...hold(TABLE + 0.005, 1), ...move(TABLE + 0.005, 0.85, 0.3), ...move(0.85, TABLE + 0.005, 0.3), ...hold(TABLE + 0.005, 0.5)]) !== null, 'it is, once it lifts and presses');
  assert.equal(run([...hold(0.9, 0.3), ...move(0.9, TABLE + 0.005, 5), ...hold(TABLE + 0.005, 1)]), null, 'a slow drift down is not a press');
  assert.equal(run([...hold(1.0, 0.3), ...move(1.0, TABLE + 0.15, 0.3), ...hold(TABLE + 0.15, 1)]), null, 'a hold 15 cm above the table is not a press');
  assert.ok(run([...hold(0.9, 0.3), null, null, ...hold(TABLE + 0.005, 0.1), ...hold(TABLE + 0.005, 0.5)]) === null, 'a hand reappearing still on the table is not a press');
  assert.equal(run([...hold(0.9, 0.3), ...move(0.9, TABLE + 0.005, 0.4), ...hold(TABLE + 0.005, 0.15), 0.9]), null, 'a touch let go before the hold is not a press');
}

// 21. The duel layer: the forge bar fills from clashes (twice as fast when behind) and spends whole;
// the Anvil Strike throws a top near the rim far more than one in the middle, a hot one further,
// and the player's own top less.
{
  const bar = new StrikeBar();
  assert.ok(!bar.spend(5, 2.5), 'an empty bar does not strike');
  for (let t = 3; t < 3 + 1 / STRIKE_BAR.clash + 2; t += 1.1) bar.clash(0.9, t, false);
  assert.ok(bar.full, 'solid clashes fill the bar');
  assert.ok(!bar.spend(1, 2.5), 'no strike in the opening grace');
  assert.ok(bar.spend(20, 2.5) && bar.value === 0, 'a strike spends the whole bar');
  const slow = new StrikeBar();
  const fast = new StrikeBar();
  slow.update(2, false);
  fast.update(2, true);
  assert.ok(Math.abs(fast.value - StrikeBar.START - STRIKE_BAR.behind * (slow.value - StrikeBar.START)) < 1e-9, 'behind, the bar fills faster');
  const arena = new Arena(FORGE);
  const outer = new Top(ATTACK);
  const inner = new Top(ATTACK);
  outer.launch(0, -0.12, 0, 0, 1, 1);
  inner.launch(0.02, 0, 0, 0, 1, -1);
  strike(arena, inner, outer);
  assert.ok(Math.hypot(outer.vx, outer.vz) > 4 * Math.hypot(inner.vx, inner.vz), 'the strike throws the top near the rim, barely the one in the middle');
  const hot = new Top(ATTACK);
  const cold = new Top(ATTACK);
  hot.launch(0, -0.12, 0, 0, 1, 1);
  cold.launch(0, 0.12, 0, 0, 1, -1);
  hot.damage = 0.8;
  strike(new Arena(FORGE), cold, hot);
  assert.ok(hot.vz < 0 && Math.abs(hot.vz) > Math.abs(cold.vz) * 1.5, 'a hot rival flies further than your own cold top');
}

// 22. Rivals' big moves: a charge rushes at you, a pull drags you toward a pit unless your top is
// braced in a cup, and the Anvil Strike cuts a rival's tell short.
{
  const arena = new Arena(FORGE);
  const rival = new Top(ATTACK);
  const you = new Top(DEFENSE);
  rival.launch(0, -0.1, 0, 0, 1, -1);
  you.launch(0.05, 0.05, 0, 0, 1, 1);
  rivalMove(arena, rival, you, 'charge');
  const toward = (rival.vx * 0.05 + rival.vz * 0.15) / Math.hypot(0.05, 0.15);
  assert.ok(toward > 1, 'a charge rushes straight at you');
  const free = new Top(DEFENSE);
  free.launch(0.03, 0.03, 0, 0, 1, 1);
  rivalMove(arena, rival, free, 'pull');
  assert.ok(Math.hypot(free.vx, free.vz) > 0.4, 'a pull drags your top');
  const cupped = new Top(DEFENSE);
  cupped.launch(0.03, 0.03, 0, 0, 1, 1);
  const cup = arena.addShape('well', 0.03, 0.03, CUP_DEPTH, 'me-cup', 0, 0, CUP_SIGMA);
  cup.trap = cup.held = true;
  cup.caught = cupped;
  rivalMove(arena, rival, cupped, 'pull');
  assert.ok(Math.hypot(cupped.vx, cupped.vz) < 1e-9, 'a top braced in a cup is not pulled');
  rival.tell = TELL_TIME;
  strike(new Arena(FORGE), you, rival);
  assert.equal(rival.tell, 0, 'the strike cuts the tell short');
}

// 23. A rival knocked out hands over its signature part; a spin-out win does not.
{
  const store = new Map<string, string>();
  const mem = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
  const p = new Progress(mem as unknown as Storage);
  p.advance('done');
  p.award({ won: true, finish: 'spin', pocketPoints: 2, perfect: false, matchOver: false, matchWon: false, rival: 'Rim Raider' });
  assert.ok(!p.isUnlocked('ring:gale'), 'a spin-out does not give the signature');
  const a = p.award({ won: true, finish: 'pocket', pocketPoints: 2, perfect: false, matchOver: false, matchWon: false, rival: 'Rim Raider' });
  assert.ok(p.isUnlocked('ring:gale') && a.unlocked.includes('ring:gale'), 'a knockout gives the signature part');
}

// 24. The strike's slap: a hand that comes down hard and stops is a slap; a hand set down gently
// beside the arena to rest is not (the same detector as press-to-place, with harder thresholds).
{
  const slap = { down: 0.6, window: 0.25, still: 0.08, hold: 0.05 };
  const dt = 1 / 72;
  const run = (ys: number[]) => {
    const t = new TableTouch(slap);
    for (const y of ys) if (t.update(y, dt, 0.72, 0.78) !== null) return true;
    return false;
  };
  const hold = (y: number, s: number) => Array.from({ length: Math.round(s / dt) }, () => y);
  const move = (a: number, b: number, s: number) => Array.from({ length: Math.round(s / dt) }, (_, i) => a + ((b - a) * (i + 1)) / Math.round(s / dt));
  assert.ok(run([...hold(0.95, 0.2), ...move(0.95, 0.75, 0.12), ...hold(0.75, 0.2)]), 'a hard slap is a strike');
  assert.ok(!run([...hold(0.95, 0.2), ...move(0.95, 0.75, 0.8), ...hold(0.75, 1)]), 'a hand set down to rest is not');
}

// 26. Spatial strikes: Tilt separates its shove from native rocking; Rush, Magnet, Hammer and Ward
// use the palm-authored lane, pit, forge mark and rim sector.
{
  const flat = arenaWith({ floor: 'flat', pockets: [], rails: [], pillars: [] });
  flat.elapsed = 5;
  const t = new Top(DEFENSE);
  t.launch(0, 0, 0, 0, 1, 1);
  const parked = new Top(DEFENSE);
  parked.state = 'toppled';
  sealStrike(flat, parked, t, 'tilt', 1, 0);
  assert.ok(flat.shove && flat.shapes.length === 0, 'Tilt changes the complete dish instead of adding a misleading local mound');
  solo(flat, t, 0.8);
  assert.ok(t.x > 0.01, `a tilt toward +x slides the rival that way (x ${t.x.toFixed(3)})`);
  // The striker's own top digs in.
  const flat2 = arenaWith({ floor: 'flat', pockets: [], rails: [], pillars: [] });
  flat2.elapsed = 5;
  const own = new Top(DEFENSE);
  own.launch(0, 0, 0, 0, 1, 1);
  sealStrike(flat2, own, parked, 'tilt', 1, 0);
  solo(flat2, own, 0.8);
  assert.ok(Math.abs(own.x) < 0.005, `your own top holds through your tilt (x ${own.x.toFixed(3)})`);

  // Anchoring removes only the seal's added slope on an arena that also rocks naturally.
  const rocker = arenaWith({ floor: 'flat', pockets: [], rails: [], pillars: [], tilt: 0.12 });
  rocker.elapsed = 5;
  const anchored = new Top(DEFENSE);
  anchored.launch(0, 0, 0, 0, 1, 1);
  sealStrike(rocker, anchored, parked, 'tilt', 1, 0);
  solo(rocker, anchored, 0.8);
  assert.ok(Math.abs(anchored.x) < 0.008, `your top ignores the added shove on a rocking arena (x ${anchored.x.toFixed(3)})`);

  // Rush follows the palm lane, not an automatic lock-on to the rival.
  const lane = arenaWith({ floor: 'flat', pockets: [], rails: [], pillars: [] });
  const rusher = new Top(ATTACK);
  const leftRival = new Top(DEFENSE);
  rusher.launch(0, 0, 0, 0, 1, 1);
  leftRival.launch(-0.08, 0, 0, 0, 1, -1);
  sealStrike(lane, rusher, leftRival, 'rush', 0.15, 0);
  assert.ok(rusher.vx > 1.1 && Math.abs(rusher.vz) < 0.01, 'Rush follows the +x palm-authored lane even with the rival on -x');
  assert.ok(lane.shapes.some((s) => s.owner === 'ultimate-rush' && s.kind === 'ramp'), 'Rush leaves a physical charge ramp');

  // Magnet chooses the pit nearest the palm sector, not the one nearest the rival.
  const twoPits = arenaWith({ floor: 'flat', rails: [], pillars: [], pockets: [{ angle: 0, half: 0.2, points: 2 }, { angle: Math.PI, half: 0.2, points: 2 }] });
  const pulled = new Top(DEFENSE);
  pulled.launch(0, 0.02, 0, 0, 1, -1);
  sealStrike(twoPits, parked, pulled, 'magnet', -0.15, 0);
  assert.ok(pulled.vx < -0.2, `Magnet selects the -x pit from the slap (vx ${pulled.vx.toFixed(3)})`);
  assert.ok(twoPits.shapes.some((s) => s.owner === 'ultimate-magnet' && s.kind === 'well'), 'Magnet leaves its selected gravity well in the arena');

  const ridged = arenaWith({ floor: 'flat', pockets: [], rails: [], pillars: [] });
  const anvilMine = new Top(DEFENSE);
  const anvilRival = new Top(ATTACK);
  anvilMine.launch(0, 0.05, 0, 0, 1, 1);
  anvilRival.launch(0, -0.05, 0, 0, 1, -1);
  sealStrike(ridged, anvilMine, anvilRival, 'anvil', 0.15, 0);
  assert.equal(ridged.shapes.filter((s) => s.owner.startsWith('ultimate-anvil')).length, 2, 'Anvil leaves two forged ridges');

  const cratered = arenaWith({ floor: 'flat', pockets: [], rails: [], pillars: [] });
  sealStrike(cratered, anvilMine, anvilRival, 'hammer', 0.15, 0);
  assert.ok(cratered.shapes.some((s) => s.owner === 'ultimate-hammer' && s.kind === 'well'), 'Hammer leaves a holding crater under its mark');

  const guarded = arenaWith({ floor: 'flat', pockets: [], rails: [], pillars: [] });
  sealStrike(guarded, anvilMine, anvilRival, 'ward', 0.15, 0);
  assert.ok(guarded.shapes.some((s) => s.owner === 'ultimate-ward' && s.kind === 'ramp'), 'Ward raises a physical inward guard ridge');

  // The activation flash is brief, but its battlefield rule stays readable long enough to play around.
  for (const changed of [lane, twoPits, ridged, cratered, guarded]) {
    const shape = changed.shapes.find((s) => s.owner.startsWith('ultimate-'))!;
    for (let elapsed = 0; elapsed < 3; elapsed += STEP) changed.update(STEP, parked, parked);
    assert.ok(Arena.strength(shape) > 0.65, `${shape.owner} terrain should still be strong after three seconds`);
  }

  const clashDamage = (hammer: boolean, zone = 0) => {
    const arena = arenaWith({ floor: 'flat', pockets: [], rails: [], pillars: [] });
    arena.elapsed = 5;
    const a = new Top(ATTACK);
    const b = new Top(DEFENSE);
    a.launch(-0.04, 0, 0.6, 0, 1, 1);
    b.launch(0.04, 0, -0.6, 0, 1, -1);
    if (hammer) {
      a.hammer = 5;
      a.hammerX = zone;
      a.hammerZ = 0;
    }
    for (let i = 0; i < 240; i++) if (step(arena, a, b)) break;
    return { damage: b.damage, armed: a.hammer };
  };
  const plain = clashDamage(false).damage;
  const hammered = clashDamage(true).damage;
  const missedMark = clashDamage(true, 0.12);
  assert.ok(plain > 0 && hammered > 2.5 * plain, `a clash inside the forge mark shatters harder (${plain.toFixed(3)} vs ${hammered.toFixed(3)})`);
  assert.ok(Math.abs(missedMark.damage - plain) < 1e-6 && missedMark.armed > 0, 'an off-mark clash stays normal and leaves Hammer armed');

  const outward = (guard: boolean, guardAngle = Math.PI / 2) => {
    const top = new Top(ATTACK);
    top.launch(0, 0.05, 0, 1.2, 1, 1);
    if (guard) {
      top.guard = 3;
      top.guardAngle = guardAngle;
    }
    const arena = arenaWith({ wall: 'none', pockets: [], rails: [] });
    arena.elapsed = 5;
    solo(arena, top, 0.6);
    return top.state;
  };
  assert.equal(outward(false), 'out', 'without a ward a hard-driven top goes over the edge');
  assert.notEqual(outward(true), 'out', 'a Ward holds the top inside its selected +z sector');
  assert.equal(outward(true, -Math.PI / 2), 'out', 'the opposite, unwarded sector remains dangerous');

  const parry = (guardAngle: number, deliberate = true) => {
    const arena = arenaWith({ floor: 'flat', wall: 'high', pockets: [], rails: [], pillars: [] });
    arena.elapsed = 5;
    const attacker = new Top(ATTACK);
    const defender = new Top(DEFENSE);
    attacker.launch(-0.055, 0, 0, 0, 1, 1);
    defender.launch(0.015, 0, 0, 0, 1, -1);
    defender.guard = 4;
    defender.guardAngle = guardAngle;
    if (deliberate) rivalMove(arena, attacker, defender, 'charge');
    else {
      attacker.vx = 1.1;
      attacker.sinceDash = 0;
    }
    for (let i = 0; i < 240; i++) {
      const clash = step(arena, attacker, defender);
      if (clash) return clash.parry === true;
    }
    return false;
  };
  assert.ok(parry(Math.PI), 'a deliberate charge through the guarded sector rebounds');
  assert.ok(!parry(0), 'a charge from an unguarded sector is not parried');
  assert.ok(!parry(Math.PI, false), 'an ordinary recent rail dash is not mistaken for a charge');

  // Remember the sector where a charge began even if it crosses the arena center before contact.
  const crossing = arenaWith({ floor: 'flat', wall: 'high', pockets: [], rails: [], pillars: [] });
  crossing.elapsed = 5;
  const charger = new Top(ATTACK);
  const warded = new Top(DEFENSE);
  charger.launch(-0.055, 0, 0, 0, 1, 1);
  warded.launch(0.04, 0, 0, 0, 1, -1);
  warded.guard = 4;
  warded.guardAngle = Math.PI;
  rivalMove(crossing, charger, warded, 'charge');
  // Put the charger just across x=0: its current angle is now 0, its entry sector was PI.
  charger.x = 0.025;
  charger.vx = 1.1;
  let crossedParry = false;
  for (let i = 0; i < 60; i++) {
    const clash = step(crossing, charger, warded);
    if (clash) {
      crossedParry = clash.parry === true;
      break;
    }
  }
  assert.ok(crossedParry, 'Ward remembers a charge entry sector across the arena center');
}

// 27. Personal bests: the first is just kept; a better one is news; a worse one is not.
{
  const p = new Progress();
  assert.equal(p.best('rip', 0.8), false, 'the first rip only sets the record');
  assert.equal(p.best('rip', 0.7), false, 'a weaker rip is no record');
  assert.equal(p.best('rip', 0.9), true, 'a harder rip is a new best');
  p.best('fastestKo', 6);
  assert.equal(p.best('fastestKo', 4.2), true, 'a faster knockout is a new best');
  assert.equal(p.records.fastestKo, 4.2);
}

// 28. Feats are earned once; unknown ones are not; ten arenas won is a feat's condition.
{
  const p = new Progress();
  assert.equal(p.feat('ramp'), true, 'a first ramp-out is a feat');
  assert.equal(p.feat('ramp'), false, 'only once');
  assert.equal(p.feat('nonsense'), false, 'no unknown feats');
  let ten = false;
  for (let i = 0; i < 10; i++) ten = p.wonMatchIn(`Arena ${i % 10}`);
  assert.ok(ten && !new Progress().wonMatchIn('x'), 'ten different arenas');
}

// 29. Saves from before the part rename load with today's ids.
{
  const store = new Map<string, string>([['spinsmith.progress.v1', JSON.stringify({ level: 3, xp: 0, unlocked: ['tip:rush', 'core:9-60'], quests: [], champions: [{ build: { ring: 'striker', core: '4-60', tip: 'flat', spin: 1, color: 0 }, wins: 1 }] })]]);
  const p = new Progress({ getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v) });
  assert.ok(p.isUnlocked('tip:spur') && p.isUnlocked('core:clamp'), 'old unlock keys load as the new ids');
  assert.equal(p.champions[0].build.tip, 'chisel');
  assert.equal(p.champions[0].build.core, 'bolt');
}

// 30. Challenge codes: every legal build survives a round trip; nonsense is rejected.
{
  const { encodeBuild, decodeBuild } = await import('../src/game/challenge.ts');
  for (const b of allBuilds().slice(0, 60)) {
    for (const spin of [1, -1]) {
      const build = { ...b, spin, color: 0xc94a3a };
      assert.deepEqual(decodeBuild(encodeBuild(build)), build, `round trip ${encodeBuild(build)}`);
    }
  }
  assert.equal(decodeBuild('HELLO'), null);
  assert.equal(decodeBuild('ZZZZ-0'), null);
}

// 25. Comfort: the dial picks a setting and its plate toggles it, so the toggles combine; each is
// saved and read back; an old single-mode save migrates to its matching toggles; ?lefty holds the
// left-handed layout on and ?lefty=0 undoes it.
{
  const { COMFORT, COMFORT_DIAL, LEGACY_COMFORT_MODES, comfortMode, comfortStop, loadComfort, nextComfort, toggleComfort, SAFE_COLORS, warnColor } = await import('../src/game/comfort.ts');
  const memStore = (init: Record<string, string> = {}) => {
    const mem = new Map(Object.entries(init));
    return { mem, st: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as unknown as Storage };
  };
  const turnTo = (name: string) => {
    for (let i = 0; i < COMFORT_DIAL.length && comfortStop().name !== name; i++) nextComfort();
    assert.equal(comfortStop().name, name, `the dial reaches ${name}`);
  };
  const std = { sound: true, flashes: true, gentle: false, assist: false, oneHand: false, contrast: false, lefty: false, colorSafe: false };
  const { mem, st } = memStore();
  loadComfort(st, '');
  assert.deepEqual({ ...COMFORT }, std, 'a fresh smith starts standard');
  const seen = new Set<number>();
  for (let i = 0; i < COMFORT_DIAL.length; i++) seen.add((nextComfort(), comfortMode()));
  assert.equal(seen.size, COMFORT_DIAL.length, 'the dial reaches every stop and wraps round');
  assert.deepEqual({ ...COMFORT }, std, 'turning the dial alone changes nothing');
  for (const s of ['Quiet', 'No flashes', 'Press to strike', 'Assist', 'One hand', 'High contrast', 'Left-handed', 'Colour-safe', 'Calm', 'Standard']) assert.ok(COMFORT_DIAL.some((d) => d.name === s), `the dial has ${s}`);
  // Toggles combine: left-handed, high contrast and quiet at once.
  turnTo('Left-handed');
  assert.ok(!comfortStop().on && toggleComfort().includes('ON'), 'the plate turns left-handed on');
  turnTo('High contrast');
  toggleComfort();
  turnTo('Quiet');
  toggleComfort();
  assert.ok(COMFORT.lefty && COMFORT.contrast && !COMFORT.sound && COMFORT.flashes && !COMFORT.gentle, 'left-handed, high contrast and quiet combine');
  turnTo('Colour-safe');
  toggleComfort();
  assert.equal(warnColor(0xff2a3a, SAFE_COLORS.edge), SAFE_COLORS.edge, 'colour-safe swaps the desk-edge red');
  toggleComfort();
  assert.equal(warnColor(0xff2a3a, SAFE_COLORS.edge), 0xff2a3a, 'and toggling it again brings it back');
  // A preset is a combination of toggles and keeps the others.
  turnTo('Calm');
  toggleComfort();
  assert.ok(!COMFORT.flashes && COMFORT.gentle && COMFORT.lefty && COMFORT.contrast && !COMFORT.sound, 'Calm adds no flashes and press to strike to the rest');
  assert.ok(comfortStop().on, 'the Calm plate reads ON');
  // Persistence round trip: a reload reads back every toggle.
  const before = { ...COMFORT };
  assert.ok(mem.has('spinsmith.comfort.v2'), 'the toggles are saved under spinsmith.*');
  loadComfort(st, '');
  assert.deepEqual({ ...COMFORT }, before, 'every toggle survives a reload');
  turnTo('Standard');
  toggleComfort();
  assert.ok(COMFORT.lefty && COMFORT.sound && COMFORT.flashes && !COMFORT.contrast, 'Standard resets all but the hand');
  turnTo('Left-handed');
  toggleComfort();
  assert.deepEqual({ ...COMFORT }, std, 'and left-handed toggles off');
  // Migration: each old dial mode becomes its matching toggles (and the old key goes).
  LEGACY_COMFORT_MODES.forEach(({ name, ...mode }, i) => {
    const old = memStore({ 'spinsmith.comfort.v1': String(i) });
    loadComfort(old.st, '');
    assert.deepEqual({ ...COMFORT }, { ...std, ...mode }, `old mode ${i} (${name}) migrates`);
    assert.ok(!old.mem.has('spinsmith.comfort.v1') && old.mem.has('spinsmith.comfort.v2'), `old mode ${i} is saved as toggles`);
    loadComfort(old.st, '');
    assert.deepEqual({ ...COMFORT }, { ...std, ...mode }, `old mode ${i} stays migrated`);
  });
  loadComfort(memStore({ 'spinsmith.comfort.v1': 'junk' }).st, '');
  assert.deepEqual({ ...COMFORT }, std, 'a broken old save is standard');
  // ?lefty holds the left-handed layout on with other toggles; ?lefty=0 undoes it.
  const q = memStore({ 'spinsmith.comfort.v2': JSON.stringify({ ...std, contrast: true }) });
  loadComfort(q.st, '?lefty');
  assert.ok(COMFORT.lefty && COMFORT.contrast, '?lefty turns the left-handed layout on with the saved toggles');
  loadComfort(q.st, '');
  assert.ok(COMFORT.lefty, '?lefty is kept once given');
  loadComfort(q.st, '?lefty=0');
  assert.ok(!COMFORT.lefty && COMFORT.contrast, '?lefty=0 undoes it and keeps the rest');
  loadComfort(q.st, '?lefty=1');
  turnTo('Left-handed');
  assert.ok(comfortStop().on, 'the plate shows ?lefty as ON');
  toggleComfort();
  loadComfort(q.st, '');
  assert.ok(!COMFORT.lefty, 'toggling left-handed off by hand also drops the ?lefty flag');
  loadComfort(memStore().st, '');
}

// 26. The rip's speed is measured over a window: 3 mm of tracking jitter neither makes an honest
// mid rip white hot nor changes its power with the refresh rate, and a real full rip still is.
{
  const { RipMeter, ripPower } = await import('../src/game/rip.ts');
  let seed = 7;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  /** Pulls `len` m at `speed` m/s, sampled at `hz` with jitter; lets go at the end of the pull. */
  const pull = (len: number, speed: number, hz: number) => {
    const meter = new RipMeter();
    const dt = 1 / hz;
    let maxPull = 0;
    let peak = 0;
    for (let t = 0; t <= len / speed + 1e-9; t += dt) {
      const dist = Math.max(0, speed * t + gauss() * 0.003);
      maxPull = Math.max(maxPull, dist);
      peak = meter.push(dt, dist);
    }
    return ripPower(maxPull, peak, 0.05, 0.22, 1.0);
  };
  const means: number[] = [];
  for (const hz of [72, 90, 120]) {
    let hot = 0;
    let sum = 0;
    for (let i = 0; i < 400; i++) {
      const p = pull(0.18, 0.75, hz);
      sum += p;
      if (p >= 0.92) hot++;
    }
    means.push(sum / 400);
    assert.ok(hot / 400 < 0.05, `an honest mid rip at ${hz} Hz is rarely white hot (${((hot / 400) * 100).toFixed(1)}%)`);
    let full = 0;
    for (let i = 0; i < 400; i++) if (pull(0.22, 1.0, hz) >= 0.92) full++;
    assert.ok(full / 400 >= 0.8, `a full rip at ${hz} Hz is white hot (${((full / 400) * 100).toFixed(1)}%)`);
  }
  assert.ok(Math.max(...means) - Math.min(...means) < 0.03, `the refresh rate barely changes a rip's power (${means.map((m) => m.toFixed(3)).join(' / ')})`);
}

// 31. Arena Forge is four distinct tactical moves, while tracking jitter is no move at all.
{
  assert.equal(classifyArenaForge({ pull: 0.01, twist: 0.03, tilt: 0.005 }), null, 'two-hand tracking noise stays inside the deadzone');
  assert.equal(classifyArenaForge({ pull: -0.03, twist: 0, tilt: 0 }), 'squeeze');
  assert.equal(classifyArenaForge({ pull: 0.03, twist: 0, tilt: 0 }), 'stretch');
  assert.equal(classifyArenaForge({ pull: 0, twist: 0.09, tilt: 0 }), 'twist');
  assert.equal(classifyArenaForge({ pull: 0, twist: 0, tilt: 0.045 }), 'tilt');

  const radius = 0.17;
  const squeeze = { pull: -0.05, twist: 0, tilt: 0 };
  const left = { x: -0.05, z: 0, vx: 0, vz: 0 };
  const right = { x: 0.05, z: 0, vx: 0, vz: 0 };
  const leftKick = arenaForgeImpulse('squeeze', squeeze, left.x, left.z, radius, 0, 0);
  const rightKick = arenaForgeImpulse('squeeze', squeeze, right.x, right.z, radius, 0, 0);
  left.vx += leftKick.x;
  right.vx += rightKick.x;
  assert.ok(right.vx - left.vx < 0, 'Squeeze makes separated tops converge toward a clash');
  const clashArena = arenaWith({ floor: 'flat', wall: 'high', pockets: [], rails: [], pillars: [] });
  clashArena.elapsed = 5;
  const clashLeft = new Top(ATTACK);
  const clashRight = new Top(DEFENSE);
  clashLeft.launch(-0.05, 0, 0, 0, 1, 1);
  clashRight.launch(0.05, 0, 0, 0, 1, -1);
  for (const top of [clashLeft, clashRight]) {
    const kick = arenaForgeImpulse('squeeze', squeeze, top.x, top.z, clashArena.radius, 0, 0);
    top.vx += kick.x;
    top.vz += kick.z;
  }
  let forcedClash = false;
  for (let i = 0; i < 120 && !forcedClash; i++) forcedClash = !!step(clashArena, clashLeft, clashRight);
  assert.ok(forcedClash, 'Squeeze produces a collision in a separated-top scenario');

  const stretch = { pull: 0.05, twist: 0, tilt: 0 };
  const safe = { x: 0.025, z: 0, vx: 0, vz: 0 };
  const exposed = { x: 0.135, z: 0, vx: 0, vz: 0 };
  const before = arenaForgeDanger(exposed.x, exposed.z, exposed.vx, exposed.vz, radius)
    - arenaForgeDanger(safe.x, safe.z, safe.vx, safe.vz, radius);
  const safeKick = arenaForgeImpulse('stretch', stretch, safe.x, safe.z, radius, 0, 0);
  const exposedKick = arenaForgeImpulse('stretch', stretch, exposed.x, exposed.z, radius, 0, 0);
  safe.vx += safeKick.x;
  exposed.vx += exposedKick.x;
  const after = arenaForgeDanger(exposed.x, exposed.z, exposed.vx, exposed.vz, radius)
    - arenaForgeDanger(safe.x, safe.z, safe.vx, safe.vz, radius);
  assert.ok(after > before, 'Stretch increases ring-out pressure more on the exposed rival than a protected center top');

  const twist = { pull: 0, twist: 0.2, tilt: 0 };
  for (const top of [{ x: 0.08, z: 0 }, { x: 0, z: -0.08 }]) {
    const kick = arenaForgeImpulse('twist', twist, top.x, top.z, radius, 0, 0);
    const tangentX = -top.z;
    const tangentZ = top.x;
    assert.ok(kick.x * tangentX + kick.z * tangentZ > 0, 'Twist shifts every orbit in the chosen direction');
  }

  const tilt = { pull: 0, twist: 0, tilt: 0.07 };
  for (const top of [{ x: 0.08, z: 0 }, { x: -0.06, z: 0.04 }]) {
    const kick = arenaForgeImpulse('tilt', tilt, top.x, top.z, radius, 0.6, -0.8);
    assert.ok(kick.x * 0.6 + kick.z * -0.8 > 0, 'Tilt sends every top down the same slope');
  }

  // Aimed forge: squeeze draws your own top in but throws the rival out, and a rival caught in
  // the outer band or heading out takes a far harder kick than one forged at mid-bowl.
  assert.equal(arenaForgeRivalAction('squeeze'), 'stretch', 'Squeeze throws the rival out');
  assert.equal(arenaForgeRivalAction('twist'), 'twist');
  assert.ok(arenaForgeAim(0.15, 0, 0.05, 0, radius) > 2 * arenaForgeAim(0.03, 0, 0, 0, radius), 'a forge aimed at an exposed rival hits it much harder than a mashed one');
  assert.ok(ARENA_FORGE_SHIELD > 0, 'the forging top gets a brief rim shield');

  const charges = new ShapingCharges();
  const cancelled = classifyArenaForge({ pull: 0, twist: 0, tilt: 0 });
  if (cancelled) charges.spend(3, 2.5);
  assert.equal(charges.charges, SHAPING.charges, 'a no-move release spends no shaping charge');
}

// 32. The Circuit Map: every bout names a real rival and arena; KO medals sit in arenas that allow
// a knockout; difficulty is a sawtooth; bouts open in order, chapters open by medals and a beaten
// boss; medals are kept win or lose; two losses in a row ease the rival.
{
  const ids = new Set<string>();
  for (const b of BOUTS) {
    assert.ok(!ids.has(b.id), `bout ${b.id} is unique`);
    ids.add(b.id);
    assert.ok(RIVALS.some((r) => r.name === b.rival), `bout ${b.id} rival ${b.rival} exists`);
    const arena = ARENAS.find((a) => a.name === b.arena);
    assert.ok(arena, `bout ${b.id} arena ${b.arena} exists`);
    for (const m of b.medals) if (m === 'rampKO' || m === 'forgeKO' || m === 'edgeKO') assert.ok(canKnockOut(arena!), `bout ${b.id}'s ${m} medal is possible in ${b.arena}`);
    assert.ok(b.skill >= 0 && b.skill <= 1, `bout ${b.id} skill in range`);
    for (const c of b.crowd ?? []) assert.ok([...RIVALS, ...NAMED_BUILDS].some((r) => r.name === c), `bout ${b.id}'s crowd top ${c} exists`);
    if (b.crowd) assert.ok(b.crowd.length <= 2 && new Set([b.rival, ...b.crowd]).size === b.crowd.length + 1, `bout ${b.id}'s crowd is at most two other tops`);
  }
  assert.equal(BOUTS.length, CHAPTERS.length * 5, 'five bouts a chapter');
  for (let c = 1; c <= CHAPTERS.length; c++) {
    const ch = BOUTS.filter((b) => b.chapter === c);
    for (let i = 1; i < ch.length; i++) assert.ok(ch[i].skill > ch[i - 1].skill, `chapter ${c} climbs`);
    assert.ok(ch[ch.length - 1].boss && ch.filter((b) => b.boss).length === 1, `chapter ${c} ends in its one boss`);
    if (c > 1) assert.ok(ch[0].skill < BOUTS.filter((b) => b.chapter === c - 1).at(-1)!.skill, `chapter ${c} starts below the last boss (sawtooth)`);
  }
  const p = new Progress(null);
  assert.equal(nextBout(p.bouts)?.id, '1-1', 'a new smith starts at 1-1');
  assert.ok(!boutOpen(BOUTS[1], p.bouts), '1-2 waits for 1-1');
  const ev = (o: Partial<OrderEvent>): OrderEvent => ({ rival: '', arena: '', wonRound: false, finish: null, cause: null, cupCaughtInRound: false, matchWon: false, shutout: false, role: 'attack', perfectInMatch: false, ...o });
  assert.equal(medalsFrom(BOUTS[0], ev({ wonRound: true, finish: 'pocket', cause: 'ramp' }), false), 2, 'a ramp KO round earns 1-1\'s ramp medal, not the win');
  assert.equal(medalsFrom(BOUTS[0], ev({ wonRound: true, matchWon: true, perfectInMatch: true }), false), 5, 'a won match with a white-hot rip earns win and perfect');
  assert.equal(medalsFrom(BOUTS[1], ev({ wonRound: true, finish: 'over', cause: 'twist' }), false), 2, 'a twist ring-out is a forge KO');
  assert.equal(medalsFrom(BOUTS[14], ev({ wonRound: true, finish: 'over' }), false), 2, 'without a table, the edge medal is any ring-out');
  assert.equal(medalsFrom(BOUTS[14], ev({ wonRound: true, finish: 'over' }), true), 0, 'with a table, the edge medal needs the real edge');
  assert.equal(medalsFrom(BOUTS[14], ev({ wonRound: true, finish: 'over', deskKo: true }), true), 2, 'a desk KO earns the edge medal');
  // A lost match keeps its medal and counts a loss; two losses ease the rival.
  let r = p.recordBout('1-1', 2, false);
  assert.equal(r.fresh, 2, 'a medal earned in a lost match is kept');
  p.recordBout('1-1', 0, false);
  assert.ok(Math.abs(boutSkill(BOUTS[0], p.boutLosses['1-1']) - 0) < 1e-9 && boutSkill(BOUTS[4], 2) < BOUTS[4].skill, 'two losses ease the bout');
  r = p.recordBout('1-1', 1, true);
  assert.equal(p.boutLosses['1-1'], 0, 'a win clears the loss streak');
  assert.equal(nextBout(p.bouts)?.id, '1-2', 'winning 1-1 opens 1-2');
  assert.ok(r.unlocked.includes('arena:Ember Ring') || p.isUnlocked('arena:Ember Ring'), "the next bout's arena opens");
  // Win every Cinder bout with the win alone: the Iron Circuit still needs medals.
  for (const b of BOUTS.filter((x) => x.chapter === 1)) p.recordBout(b.id, 1, true);
  assert.equal(medalCount(p.bouts), 6, 'six medals: five wins and 1-1\'s ramp');
  assert.ok(nextGate(p.bouts).includes('2 more medals to open the Iron Circuit'), `the map says what opens the next chapter (${nextGate(p.bouts)})`);
  assert.equal(nextBout(p.bouts)?.id, '1-1', 'with the chapter won, the map points back at missing medals');
  p.recordBout('1-2', 7, true);
  assert.equal(nextBout(p.bouts)?.id, '2-1', 'eight medals and the boss open the Iron Circuit');
  // The record survives a reload.
  const store = new Map<string, string>();
  const st = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
  const q = new Progress(st);
  q.recordBout('1-1', 3, true);
  assert.equal(new Progress(st).bouts['1-1'], 3, 'bout medals reload');
  // A save from before the Circuit Map that cleared the Cinder Circuit keeps that chapter won.
  const old = new Map<string, string>([['spinsmith.progress.v1', JSON.stringify({ level: 12, xp: 0, unlocked: [], quests: [], matches: 40, guide: 'done', marks: { 'Iron Keep': MARK.beaten } })]]);
  const vet = new Progress({ getItem: (k) => old.get(k) ?? null, setItem: (k, v) => void old.set(k, v) });
  assert.equal(nextBout(vet.bouts)?.id, '2-1', 'a veteran who beat Iron Keep starts the map at 2-1');
  assert.equal(new Progress(null).bouts['1-1'], undefined, 'a new save seeds nothing');
  // Every bout won: missing medals share matches with free play.
  const all: Record<string, number> = {};
  for (const b of BOUTS) all[b.id] = 1;
  assert.ok(nextBout(all, true) && nextBout(all, false) === null, 'with the map won, medal turns alternate with free play');
  // Bouts missing medals take turns instead of one bout repeating.
  const short = { '1-1': 3, '1-2': 1, '1-3': 5, '1-4': 1, '1-5': 1 };
  assert.deepEqual([0, 1, 2, 3].map((r) => nextBout(short, true, r)?.id), ['1-1', '1-2', '1-3', '1-4'], 'missing-medal bouts rotate (seven medals: the Iron Circuit is still shut)');
  // With every bout won, medal turns come on even match counts: every missing bout still gets a turn.
  const won: Record<string, number> = {};
  for (const b of BOUTS) won[b.id] = 7;
  won['1-2'] = 1;
  won['2-4'] = 1;
  assert.deepEqual([0, 2].map((m) => nextBout(won, true, m)?.id), ['1-2', '2-4'], 'after a full clear both missing bouts come up');

  // One persistent hidden shard per bout opens a harder, arena-shifted remix only after the Crown.
  const secretStore = new Map<string, string>();
  const secretStorage = { getItem: (k: string) => secretStore.get(k) ?? null, setItem: (k: string, v: string) => void secretStore.set(k, v) };
  const seeker = new Progress(secretStorage);
  assert.equal(seeker.collectSecret('not-a-bout'), false, 'invented shards are rejected');
  for (const b of BOUTS) seeker.recordBout(b.id, 1, true);
  for (const b of BOUTS.slice(0, -1)) assert.equal(seeker.collectSecret(b.id), true);
  assert.equal(seeker.nightUnlocked, false, 'fourteen shards are not the Night Circuit');
  assert.equal(seeker.collectSecret(BOUTS.at(-1)!.id), true);
  assert.ok(seeker.nightUnlocked && new Progress(secretStorage).nightUnlocked, 'the Crown plus all shards persistently opens Night');
  assert.equal(seeker.collectSecret(BOUTS[0].id), false, 'a shard is collectible once');
  const remix = nightBout(BOUTS[0], BOUTS[5].arena);
  assert.ok(remix.night && remix.shapes && remix.skill > BOUTS[0].skill && remix.arena !== BOUTS[0].arena, 'Night remixes arena, skill and rival shaping');
}

// 33. The type loop: each type beats one and loses to one; balance and mirrors are even.
assert.equal(edgeOf('attack', 'stamina'), 1);
assert.equal(edgeOf('stamina', 'defense'), 1);
assert.equal(edgeOf('defense', 'attack'), 1);
assert.equal(edgeOf('stamina', 'attack'), -1);
assert.equal(edgeOf('balance', 'attack'), 0);
assert.equal(edgeOf('defense', 'defense'), 0);

// 33b. Crowded target modes credit the last attacker, and the Crucible ignores ordinary pockets.
{
  const tops = [
    { finish: null, pocketPoints: 2 },
    { finish: 'pocket', pocketPoints: 2 },
    { finish: null, pocketPoints: 2 },
  ];
  const hits = new Int8Array([-1, 0, 1]);
  assert.deepEqual(targetWinner('pocket', tops, hits), { winner: 0, victim: 1 }, 'the top that sent a foe into a pocket wins King of the Pocket');
  assert.equal(targetWinner('crucible', tops, hits), null, 'an ordinary pocket does not finish a Crucible race');
  tops[1].pocketPoints = 3;
  assert.deepEqual(targetWinner('crucible', tops, hits), { winner: 0, victim: 1 }, 'the three-heat pocket decides a Crucible race');
  assert.equal(targetWinner('last', tops, hits), null, 'last-spin mode keeps the existing survival verdict');
}

// 34. Orders chase map medals: the first won bout missing an order-able medal, about every other day.
{
  assert.equal(medalOrder({}, false), null, 'no won bout, no medal order');
  const m = medalOrder({ '1-1': 1 | 2 }, false);
  assert.deepEqual(m, { bout: '1-1', rival: 'Drifter', arena: 'Forge Bowl', goal: 'perfect' }, "1-1 won with its ramp medal: the order chases its white-hot medal");
  assert.equal(medalOrder({ '1-2': 1 }, false)?.goal, 'sweep', 'forge KO has no order goal, so 1-2 asks for no heat lost');
  assert.equal(medalOrder({ '3-5': 1 }, false)?.goal, 'sweep', 'the edge medal needs a real table');
  assert.equal(medalOrder({ '3-5': 1 }, true)?.goal, 'deskKO', 'with a table the order asks for the desk edge');
  const ctx = { rivals: ['Drifter', 'Rim Raider'], arenas: ARENAS.slice(0, 3), built: [], medal: m! };
  let chased = 0;
  for (let d = 1; d <= 30; d++) {
    const o = dailyOrder(`2026-11-${String(d).padStart(2, '0')}`, ctx);
    if (o.bout) {
      chased++;
      assert.ok(o.rival === 'Drifter' && o.arena === 'Forge Bowl' && o.goal === 'perfect' && o.text.includes('1-1'), 'a medal order names its bout');
    }
  }
  assert.ok(chased >= 8 && chased <= 22, `medal orders come about every other day (${chased}/30)`);
}

// 35. No wall on the map: in every bout's arena, some build a smith can forge beats that bout's
// rival at least about half the time (crowded bouts measured one on one against the named rival).
{
  const candidates = [...PRESETS.map((p) => p.build), ...NAMED_BUILDS.map((n) => n.build), ...RIVALS.map((r) => r.build)];
  const a = new Top(specFromBuild(candidates[0]));
  const b = new Top(specFromBuild(candidates[0]));
  let worst = 1;
  let worstBout = '';
  for (const bout of BOUTS) {
    const layout = ARENAS.find((x) => x.name === bout.arena)!;
    const rival = RIVALS.find((r) => r.name === bout.rival)!;
    const arena = new Arena(layout);
    const spawn = layout.shape === 'oval' ? layout.radius * 0.78 * 0.72 : layout.radius * 0.72;
    let best = 0;
    for (const build of candidates) {
      let wins = 0;
      let games = 0;
      for (let k = 0; k < 10; k++) {
        arena.reset(layout);
        a.spec = specFromBuild(build);
        b.spec = specFromBuild(rival.build);
        const pa = 0.7 + (k % 4) * 0.08;
        const pb = 0.6 + ((k * 3) % 5) * 0.08;
        const da = LAUNCH_TILT + ((k % 3) - 1) * 0.25;
        const db = LAUNCH_TILT + (((k + 1) % 3) - 1) * 0.25;
        const sa = launchSpeed(pa);
        const sb = launchSpeed(pb);
        a.launch(0, spawn, Math.sin(da) * sa, -Math.cos(da) * sa, launchSpin(pa), 1);
        b.launch(0, -spawn, Math.sin(db) * sb * rival.build.spin, Math.cos(db) * sb, launchSpin(pb), rival.build.spin);
        let t = 0;
        while (verdict(a, b, t) === 0) {
          step(arena, a, b);
          t += STEP;
        }
        const v = verdict(a, b, t);
        if (v === 2) continue;
        games++;
        if (v === 1) wins++;
      }
      best = Math.max(best, games ? wins / games : 0);
    }
    if (best < worst) {
      worst = best;
      worstBout = bout.id;
    }
    assert.ok(best >= 0.5, `bout ${bout.id}: some forgeable build beats ${bout.rival} in ${bout.arena} (best ${best.toFixed(2)})`);
  }
  console.log(`map counters: the hardest bout to counter is ${worstBout} (best build wins ${(worst * 100).toFixed(0)}% without hands)`);
}

// 36. Crowded bouts can be won too: against the bout's rival and its crowd together, some build is
// the last top spinning above a fair share (1 in 3 or 1 in 4) by a quarter, without hands, with
// either spin direction (the spin token), yet none is last spinning more than 65% (no walkover build).
{
  const candidates = [...PRESETS.map((p) => p.build), ...NAMED_BUILDS.map((n) => n.build), ...RIVALS.map((r) => r.build)];
  const all = [...RIVALS, ...NAMED_BUILDS];
  for (const bout of BOUTS.filter((b) => b.crowd?.length)) {
    const layout = ARENAS.find((x) => x.name === bout.arena)!;
    const foes = [bout.rival, ...bout.crowd!].map((n) => all.find((r) => r.name === n)!.build);
    const arena = new Arena(layout);
    const spawn = layout.shape === 'oval' ? layout.radius * 0.78 * 0.72 : layout.radius * 0.72;
    const n = foes.length + 1;
    let best = 0;
    for (const build of candidates) for (const mySpin of [1, -1]) {
      let wins = 0;
      const rounds = 8;
      for (let k = 0; k < rounds; k++) {
        arena.reset(layout);
        const tops = [build, ...foes].map((b) => new Top(specFromBuild(b)));
        tops.forEach((t, i) => {
          const ang = Math.PI / 2 + (i * 2 * Math.PI) / n + k * 0.3;
          const x = Math.cos(ang) * spawn;
          const z = Math.sin(ang) * spawn;
          const p = 0.65 + ((k + i) % 4) * 0.08;
          const sp = launchSpeed(p);
          const dir = Math.atan2(-x, -z) + LAUNCH_TILT;
          const hand = i === 0 ? mySpin : foes[i - 1].spin;
          t.launch(x, z, Math.sin(dir) * sp, Math.cos(dir) * sp, launchSpin(p), hand);
        });
        let t = 0;
        while (!roundOverN(tops, t)) {
          stepN(arena, tops);
          t += STEP;
        }
        if (rankingN(tops, t)[0] === 0) wins++;
      }
      best = Math.max(best, wins / rounds);
    }
    // Without hands: the player's ramps, forges and strike, and the assist after two losses, add the rest.
    assert.ok(best >= 1.25 / n, `crowded bout ${bout.id}: some build is last spinning ${(best * 100).toFixed(0)}% of rounds (fair share ${(100 / n).toFixed(0)}%)`);
    // ...but no single build walks through the crowd: the crowd tops still have to be played.
    assert.ok(best <= 0.65, `crowded bout ${bout.id}: no build is last spinning more than 65% of rounds (best ${(best * 100).toFixed(0)}%)`);
    console.log(`crowded bout ${bout.id}: best build last spinning ${(best * 100).toFixed(0)}% (fair share ${(100 / n).toFixed(0)}%)`);
  }
}

// Real-edge danger sectors: arena-local table outlines (arena centre at the origin).
{
  const square = (cx: number, cz: number, h: number) => [
    { x: cx - h, z: cz - h },
    { x: cx + h, z: cz - h },
    { x: cx + h, z: cz + h },
    { x: cx - h, z: cz + h },
  ];
  // 1 m table, arena 0.3 m right of its middle: only the +x edge (0.2 m away) is in reach.
  const one = deskSectors(square(-0.3, 0, 0.5), 0.15, 0.1);
  assert.equal(one.length, 1, `edge arena: ${one.length} sectors`);
  assert.ok(Math.abs(one[0].angle) < 0.05 && Math.abs(one[0].distance - 0.2) < 1e-6, `edge sector points at +x: ${one[0].angle}`);
  assert.ok(inSector(one[0], 0.3) && !inSector(one[0], Math.PI / 2), 'edge sector width');
  // Centred on a 4 m table: nothing in reach.
  assert.equal(deskSectors(square(0, 0, 2), 0.15, 0.1).length, 0, 'big table: no sectors');
  // Corner, diagonal out of reach (0.283 > 0.25): two sectors, at +x and +z.
  const two = deskSectors(square(-0.3, -0.3, 0.5), 0.15, 0.1);
  assert.equal(two.length, 2, `corner arena: ${two.length} sectors`);
  assert.ok(two.some((s) => Math.abs(s.angle) < 0.05) && two.some((s) => Math.abs(s.angle - Math.PI / 2) < 0.05), 'corner sectors at +x and +z');
  // Corner with the diagonal in reach too: the runs join into one wide sector across the corner.
  const wide = deskSectors(square(-0.3, -0.3, 0.5), 0.15, 0.15);
  assert.equal(wide.length, 1, `tight corner: ${wide.length} sectors`);
  assert.ok(Math.abs(wide[0].angle - Math.PI / 4) < 0.05 && wide[0].halfWidth > Math.PI / 4, 'tight corner sector spans the corner');
  // Centre off the table, or no table: none.
  assert.equal(deskSectors(square(2, 0, 0.5), 0.15, 0.1).length, 0, 'off table: no sectors');
  assert.equal(deskSectors(null, 0.15, 0.1).length, 0, 'no table: no sectors');
}

// The drop side: the rim facing a close real desk edge is lower for both tops, every round. A throw
// the plain rim holds goes over it there (every wall kind, every top type), the same throw facing
// away from it is held, the opening grace still holds, and no sectors (the tray) is the plain rim.
if (DESK_DROP_ON) {
  const thrown = (wall: ArenaLayout['wall'], a: number, v: number, drop: number | null, spec: TopSpec, elapsed = 5) => {
    const arena = arenaWith({ wall, pockets: [], rails: [] });
    arena.grace = 1.8;
    arena.elapsed = elapsed;
    if (drop !== null) arena.drops = [{ angle: drop, half: Math.PI / 4 }];
    const t = new Top(spec);
    const r = FORGE.radius * 0.6;
    t.launch(Math.cos(a) * r, Math.sin(a) * r, Math.cos(a) * v, Math.sin(a) * v, 1, 1);
    solo(arena, t, 0.6);
    return t.finish;
  };
  const cases: [ArenaLayout['wall'], number][] = [['low', 0.7], ['standard', 0.9], ['high', 0.9], ['none', 0.8]];
  for (const [wall, v] of cases)
    for (const spec of [ATTACK, DEFENSE, STAMINA])
      for (const a of [0.3, 2.2, -1.6]) {
        if (wall !== 'none' || spec !== ATTACK) assert.equal(thrown(wall, a, v, null, spec), null, `${wall} wall holds a ${v} m/s ${spec.name} on the plain rim`);
        assert.equal(thrown(wall, a, v, a, spec), 'over', `${wall} wall: a ${v} m/s ${spec.name} goes over the drop side at ${a}`);
        assert.equal(thrown(wall, a, v, a + Math.PI, spec), wall === 'none' && spec === ATTACK ? 'over' : null, `${wall} wall: the rim across from the drop side is unchanged`);
      }
  assert.equal(thrown('standard', 1, 0.9, 1, ATTACK, 0), null, 'the opening grace holds the drop side too');
  assert.equal(thrown('standard', 1, 0.5, 1, ATTACK), null, 'a soft roll stays in on the drop side');
  const plain = arenaWith({});
  assert.ok(!plain.dropAt(0) && !plain.dropAt(Math.PI), 'no sectors: no drop side (tray play unchanged)');
  plain.drops = [{ angle: Math.PI - 0.1, half: 0.3 }];
  assert.ok(plain.dropAt(-Math.PI + 0.1) && !plain.dropAt(0), 'drop side is wrap-safe');
}

// The first match's staged DESK KO: steered to the edge-facing rim, the forge wrench throws every
// rival over the Forge Bowl rim (a thrown ring-out, never a pocket) toward the real edge.
{
  for (let deg = 0; deg < 360; deg += 15) {
    const sector = { angle: (deg * Math.PI) / 180, halfWidth: Math.PI / 4, distance: 0.2 };
    const angle = deskWrenchAngle(sector, FORGE.pockets);
    assert.ok(inSector(sector, angle), `wrench at ${deg}deg stays in its sector`);
    assert.ok(FORGE.pockets.every((p) => Math.abs(Math.atan2(Math.sin(angle - p.angle), Math.cos(angle - p.angle))) > p.half), `wrench at ${deg}deg avoids pockets`);
    for (const rival of RIVALS) {
      const arena = arenaWith({});
      arena.elapsed = 5;
      const top = new Top(specFromBuild(rival.build));
      top.launch(0, -0.08, 0.3, 0.2, 0.9, rival.build.spin);
      solo(arena, top, 1.5, () => deskWrenchSteer(top, angle, FORGE.radius, STEP));
      assert.ok(top.alive && Math.hypot(top.x, top.z) > FORGE.radius * 0.45, `${rival.name} steered to the rim at ${deg}deg`);
      const kick = deskWrenchImpulse(top, { x: 0, z: 0 }, angle, FORGE.radius);
      top.vx += kick.x;
      top.vz += kick.z;
      solo(arena, top, 0.6);
      assert.equal(top.finish, 'over', `${rival.name} wrenched at ${deg}deg finished ${top.finish}`);
      const exit = Math.atan2(top.z, top.x);
      assert.ok(Math.abs(Math.atan2(Math.sin(exit - angle), Math.cos(exit - angle))) < 0.35, `${rival.name} left toward the desk edge at ${deg}deg (${exit.toFixed(2)})`);
    }
  }
}

// Fight calls: one card, priorities, no quick repeats.
{
  const empty = { key: '', priority: 0, until: 0, onScreen: false };
  assert.ok(callAllowed(empty, 10, 'a', CALL.ambient, undefined), 'empty card takes any call');
  const tip = { key: 'tip', priority: CALL.tactic, until: 12, onScreen: true };
  assert.ok(!callAllowed(tip, 11, 'amb', CALL.ambient, undefined), 'lower call waits for a fresh higher one');
  assert.ok(!callAllowed(tip, 11, 'tip2', CALL.tactic, undefined), 'equal call waits while fresh');
  assert.ok(callAllowed(tip, 11, 'tell', CALL.danger, undefined), 'danger interrupts a tip');
  assert.ok(callAllowed(tip, 12.5, 'amb', CALL.ambient, undefined), 'a stale card can be replaced');
  assert.ok(!callAllowed(tip, 11, 'tip', CALL.danger, undefined), 'the call already up is not re-shown');
  assert.ok(!callAllowed(empty, 10, 'a', CALL.danger, 10 - CALL_REPEAT + 0.5), 'same key waits out the repeat gap');
  assert.ok(callAllowed(empty, 10, 'a', CALL.ambient, 10 - CALL_REPEAT - 0.1), 'same key returns after the gap');
  const lesson = { key: '', priority: CALL.lesson, until: 13, onScreen: true };
  assert.ok(!callAllowed(lesson, 11, 'ult', CALL.ultimate, undefined), 'lesson text is not drowned out');
  const held = { key: 'strike-ready', priority: CALL.ultimate, until: 5, onScreen: true };
  assert.ok(callAllowed(held, 11, 'amb', CALL.ambient, undefined), 'a persistent card is never fresh');
}
{
  // The match bar's brawl row: 3 and 4 equal slots filling the plate between its margins.
  const three = brawlSlots(3, 1400, 48, 28);
  assert.deepEqual(three.map((s) => Math.round(s.x)), [48, 492, 936], 'three brawl slots start');
  assert.ok(Math.abs(three[0].w - 1248 / 3) < 1e-9 && Math.abs(three[2].x + three[2].w - 1352) < 1e-9, 'three brawl slots fill the plate');
  const four = brawlSlots(4, 1400, 48, 28);
  assert.equal(four[0].w, 305, 'four brawl slots width');
  assert.equal(four[3].x + four[3].w, 1352, 'four brawl slots end at the margin');
  assert.deepEqual([spinStep(-1), spinStep(0.024), spinStep(0.5), spinStep(1.4)], [0, 0, 10, 20], 'spin steps');
}
{
  // The frame-rate guard: 3 s of slow 1 s windows steps down once, 10 s comfortable steps back up.
  assert.deepEqual(qualityThresholds(undefined), { slow: 66, comfort: 72 * 0.97 }, 'no frameRate: 72 Hz defaults');
  assert.ok(Math.abs(qualityThresholds(90).slow - 81) < 1e-9, '90 Hz: slow below 0.9x');
  const q = new QualityGuard();
  assert.equal(q.sample(60, 1), null, 'one slow second is jitter');
  assert.equal(q.sample(60, 1), null, 'two slow seconds still wait');
  assert.deepEqual(q.sample(60, 1), { from: 0, to: 1, fps: 60, reason: 'slow' }, 'third slow second: lite');
  assert.equal(q.sample(60, 1), null, 'the slow clock restarts after a step');
  q.sample(60, 1);
  assert.equal(q.sample(60, 1)?.to, 2, 'three more slow seconds: foveation');
  for (let i = 0; i < 6; i++) assert.equal(q.sample(50, 1), null, 'no step below the lowest level');
  assert.equal(q.level, QUALITY_MAX, 'stays at the lowest level');
  for (let i = 0; i < 9; i++) assert.equal(q.sample(72, 1), null, 'comfort must last 10 s');
  assert.deepEqual(q.sample(72, 1), { from: 2, to: 1, fps: 72, reason: 'comfortable' }, 'ten comfortable seconds: one step up');
  for (let i = 0; i < 9; i++) q.sample(72, 1);
  q.sample(68, 1);
  assert.equal(q.level, 1, 'a merely-ok window (between thresholds) resets the comfort clock');
  for (let i = 0; i < 10; i++) q.sample(72, 1);
  assert.equal(q.level, 0, 'back to full');
  for (let i = 0; i < 20; i++) assert.equal(q.sample(72, 1), null, 'never above full');
  q.sample(60, 1);
  q.sample(70, 1);
  q.sample(60, 1);
  q.sample(60, 1);
  assert.equal(q.level, 0, 'slow seconds must be consecutive');
  const r = new QualityGuard();
  for (let i = 0; i < 3; i++) r.sample(85, 1, 90);
  assert.equal(r.level, 0, '90 Hz session at 85 fps is fine');
  for (let i = 0; i < 3; i++) r.sample(80, 1, 90);
  assert.equal(r.level, 1, '90 Hz session at 80 fps steps down');
  const book = new FpsBook();
  assert.equal(book.summary('hub'), 'no samples', 'empty phase');
  book.add('hub', 72);
  book.add('hub', 70);
  assert.equal(book.summary('hub'), 'n=2 mean 71.0 min 70 last 72,70', 'phase summary');
  assert.deepEqual(['hub', 'pulling', 'result', 'build', 'placing'].map(fpsPhase), ['hub', 'fight', 'fight', 'forge', null], 'phase buckets');
}

// Gesture ownership (src/game/gesture-owner.ts): every pair of hand verbs that can share one hand
// near the bowl floor, and the single verb that must own it.
{
  const ring = 0.03 + FINGER_RADIUS + 0.004;
  const hand = (o: Partial<HandFacts>): HandFacts => ({ ...FREE_HAND, ownTopRing: ring, ...o });
  const cases: { name: string; f: HandFacts; owner: GestureOwner; listen?: HandVerb[]; deaf?: HandVerb[]; fire?: HandVerb[]; hold?: HandVerb[] }[] = [
    { name: 'a free open hand', f: hand({}), owner: null, listen: ['flick', 'groove', 'gust', 'crossguard', 'rub', 'slap'], fire: ['flick', 'cup', 'gust', 'groove'] },
    // A flick's swing started a floor stroke: the stroke is not also a Finger Groove (blockShapingRelease + follow-through).
    { name: 'flick vs groove', f: hand({ releaseLock: SHAPING_RELEASE_LOCK, shapingLock: SHAPING_RELEASE_LOCK, needsClearance: true, followLock: 0.4 }), owner: 'release', deaf: ['groove', 'cup', 'flick', 'gust'] },
    { name: 'flick vs groove, lock run out, fingertip still down', f: hand({ needsClearance: true }), owner: 'release', deaf: ['groove', 'cup'], listen: ['flick'] },
    { name: 'rub window vs gust', f: hand({ rubWindow: true }), owner: 'rub', deaf: ['gust', 'groove', 'crossguard'], listen: ['flick', 'rub'] },
    { name: 'fingertip arriving on own top vs gust', f: hand({ tipToOwnTop: RUB_TIP_GUST * 0.6 }), owner: 'rub', listen: ['gust'], hold: ['gust'], deaf: ['groove'] },
    // A sweep that crosses its own top still fires once the fingertip is past it.
    { name: 'gust sweep crossing own top, past it', f: hand({ tipToOwnTop: RUB_TIP_GUST + 0.005 }), owner: 'rub', fire: ['gust'], deaf: ['groove'] },
    { name: 'gust sweep clear of own top', f: hand({ tipToOwnTop: ring + RUB_TOUCH_SLACK + 0.01 }), owner: null, fire: ['gust', 'groove'] },
    { name: 'rub vs crossguard', f: hand({ rubWindow: true, onForgeGrip: false }), owner: 'rub', deaf: ['crossguard'] },
    // Arena Forge release: both hands get the open-palm lock and the release pull-back.
    { name: 'forge release vs cup', f: hand({ releaseLock: RELEASE_LOCK, followLock: FLICK_AFTER_RELEASE }), owner: 'release', hold: ['cup'], listen: ['groove'] },
    { name: 'forge release vs crossguard', f: hand({ releaseLock: RELEASE_LOCK, followLock: FLICK_AFTER_RELEASE }), owner: 'release', deaf: ['crossguard', 'gust', 'flick', 'rub'] },
    { name: 'forge release vs cup after the open-palm lock', f: hand({ followLock: 0.05 }), owner: 'release', hold: ['cup', 'flick'], fire: ['gust'], listen: ['crossguard'] },
    { name: 'rim spring release vs flick', f: hand({ releaseLock: SHAPING_RELEASE_LOCK, shapingLock: SHAPING_RELEASE_LOCK, needsClearance: true, followLock: FLICK_AFTER_RELEASE }), owner: 'release', deaf: ['flick', 'rub', 'cup', 'groove', 'ramp', 'grip'] },
    { name: 'slap vs cup', f: hand({ slapPose: true }), owner: 'slap', hold: ['cup'], listen: ['slap'] },
    { name: 'two-hand forge grip vs crossguard', f: hand({ onForgeGrip: true }), owner: 'grip', deaf: ['crossguard'], listen: ['slap', 'flick'] },
    { name: 'two-hand forge held vs crossguard', f: hand({ held: 'forge', pinching: true }), owner: 'forge', deaf: ['crossguard', 'gust', 'flick', 'rub', 'slap', 'cup', 'groove', 'ramp'] },
    { name: 'one-hand forge: the free hand', f: hand({ held: 'forge' }), owner: 'forge', deaf: ['crossguard', 'gust', 'flick', 'slap'] },
    { name: 'crossguard post vs flick and slap', f: hand({ railPost: true, crossguardUp: true }), owner: 'crossguard', deaf: ['flick', 'rub', 'slap'], listen: ['crossguard', 'gust'] },
    { name: 'crossguard beam vs the other hand\'s slap', f: hand({ crossguardUp: true }), owner: 'crossguard', deaf: ['slap'], listen: ['flick'] },
    { name: 'cup press vs flick', f: hand({ pressing: true }), owner: 'cup', deaf: ['flick', 'rub'], fire: ['cup'] },
    { name: 'own gust sweep vs flick', f: hand({ gustSweep: true }), owner: 'gust', deaf: ['flick', 'rub'], listen: ['gust'] },
    { name: 'held seal vs everything', f: hand({ held: 'overforge', pinching: true }), owner: 'overforge', deaf: ['ramp', 'cup', 'groove', 'crossguard', 'gust', 'flick', 'slap'] },
    { name: 'held rim grip keeps its shaping upkeep', f: hand({ held: 'grip', pinching: true }), owner: 'grip', listen: ['grip', 'ramp'], deaf: ['flick', 'slap', 'gust', 'crossguard', 'cup'] },
    { name: 'flick follow-through', f: hand({ followLock: 0.3 }), owner: 'release', listen: ['flick', 'rub'], hold: ['flick', 'cup'] },
    { name: 'an untracked hand', f: hand({ tracked: false }), owner: null, deaf: ['flick', 'cup', 'gust', 'crossguard', 'slap', 'ramp'] },
    { name: 'a plain pinch', f: hand({ pinching: true }), owner: null, deaf: ['flick', 'cup', 'groove', 'gust', 'crossguard', 'rub', 'slap'], listen: ['ramp', 'grip', 'sling'] },
  ];
  for (const c of cases) {
    assert.equal(gestureOwner(c.f), c.owner, `${c.name}: owner`);
    for (const v of c.listen ?? []) assert.ok(mayListen(c.f, v), `${c.name}: ${v} listens (blocked by ${listenBlocker(c.f, v)})`);
    for (const v of c.deaf ?? []) assert.ok(!mayListen(c.f, v), `${c.name}: ${v} must not listen`);
    for (const v of c.fire ?? []) assert.ok(mayCommit(c.f, v), `${c.name}: ${v} fires (blocked by ${commitBlocker(c.f, v)})`);
    for (const v of c.hold ?? []) assert.ok(mayListen(c.f, v) && !mayCommit(c.f, v), `${c.name}: ${v} listens but must not fire`);
  }
  assert.ok(heldElsewhere(hand({ held: 'ember' })) && !heldElsewhere(hand({ held: 'ramp' })), 'held rivet skips shaping, a held ramp does not');
  assert.equal(commitBlocker(hand({ slapPose: true, followLock: 0.2 }), 'cup'), 'follow', 'the first claim in the table names the blocker');
}

// Hand occluder proxies (hand-proxy.ts): rods span their joints, the palm lies between wrist and knuckles, and the gate.
{
  assert.equal(JOINTS.length, 25, 'the 25 WebXR hand joints');
  assert.equal(BONES.length, 24, 'one bone per joint past the wrist');
  for (const [a, b] of BONES) assert.ok(a < b && (a === 0) === JOINTS[b].endsWith('metacarpal'), `bone ${JOINTS[a]} -> ${JOINTS[b]}`);
  assert.ok(Object.values(PALM).every((i) => i >= 0), 'palm joints found');
  const apply = (m: number[], x: number, y: number, z: number) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
  const near = (p: number[], q: number[], what: string) => assert.ok(Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < 1e-9, `${what}: ${p} vs ${q}`);
  for (const [a, b] of [[{ x: 0.1, y: 1, z: -0.3 }, { x: 0.13, y: 1.02, z: -0.33 }], [{ x: 0, y: 1, z: 0 }, { x: 0, y: 1.04, z: 0 }], [{ x: 0, y: 1, z: 0 }, { x: 0, y: 0.97, z: 0 }]]) {
    const m = boneMatrix(a, b, 0.008)!;
    near(apply(m, 0, -0.5, 0), [a.x, a.y, a.z], 'rod bottom on joint a');
    near(apply(m, 0, 0.5, 0), [b.x, b.y, b.z], 'rod top on joint b');
    for (const [x, z] of [[1, 0], [0, 1]]) {
      const p = apply(m, x, 0, z);
      const d = [p[0] - m[12], p[1] - m[13], p[2] - m[14]];
      assert.ok(Math.abs(Math.hypot(d[0], d[1], d[2]) - 0.008) < 1e-9, 'rod radius is the joint radius');
      assert.ok(Math.abs(d[0] * (b.x - a.x) + d[1] * (b.y - a.y) + d[2] * (b.z - a.z)) < 1e-12, 'rod radius is across the bone');
    }
  }
  assert.equal(boneMatrix({ x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 0 }, 0.01), null, 'a zero-length bone draws nothing');
  const w = { x: 0, y: 1, z: 0 }, ix = { x: -0.04, y: 1, z: -0.09 }, mid = { x: -0.015, y: 1, z: -0.095 }, pk = { x: 0.03, y: 1, z: -0.08 };
  const pm = palmMatrix(w, ix, mid, pk, 0.012)!;
  near(apply(pm, 0, 0, -1), [w.x, w.y, w.z], 'palm reaches the wrist');
  near(apply(pm, 0, 0, 1), [mid.x, mid.y, mid.z], 'palm reaches the middle knuckle');
  const up = apply(pm, 0, 1, 0);
  assert.ok(Math.abs(Math.abs(up[1] - pm[13]) - 0.012) < 1e-9, 'a flat palm is wrist-thick, facing up or down');
  assert.equal(palmMatrix(w, ix, ix, ix, 0.012), null, 'collapsed knuckles draw no palm');
  const gate = { blend: 'alpha-blend', depthOcclusion: false, optOut: false, knob: 1 };
  assert.ok(handOcclusionOn(gate), 'on over passthrough with no depth');
  assert.ok(!handOcclusionOn({ ...gate, blend: 'opaque' }), 'off in VR');
  assert.ok(handOcclusionOn({ ...gate, depthOcclusion: true }), 'still on under real depth occlusion (tops are not depth-occluded)');
  assert.ok(!handOcclusionOn({ ...gate, optOut: true }), 'off with ?nohandocclude');
  assert.ok(!handOcclusionOn({ ...gate, knob: 0 }), 'off with ?occluder=0');
}

// Hand smoothing (hands.ts pinchSmooth/indexSmooth): the One-Euro filter steadies a still hand,
// keeps up with a sweep, and forgets a lost hand. Speed verbs never read it (they use the raw joints).
{
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
  for (const hz of [72, 90]) {
    const dt = 1 / hz;
    // A hand held still with 1.5 mm of tracking noise per axis.
    const still = new OneEuro3(HAND_EURO);
    let rawSq = 0;
    let outSq = 0;
    for (let i = 0; i < hz * 4; i++) {
      const x = gauss() * 0.0015, y = 1 + gauss() * 0.0015, z = gauss() * 0.0015;
      const v = still.update(x, y, z, dt);
      if (i < hz) continue;
      rawSq += x * x + (y - 1) ** 2 + z * z;
      outSq += v.x * v.x + (v.y - 1) ** 2 + v.z * v.z;
    }
    const drop = 1 - Math.sqrt(outSq / rawSq);
    assert.ok(drop >= 0.6, `${hz} Hz: a still hand's jitter drops ${(drop * 100).toFixed(0)}% (needs >= 60%)`);
    // A steady 1.5 m/s sweep, measured once the filter has settled on it (0.4 s, 60 cm).
    const sweep = new OneEuro3(HAND_EURO);
    let lag = 0;
    for (let i = 0; i <= hz * 0.4; i++) lag = 1.5 * i * dt - sweep.update(1.5 * i * dt, 1, 0, dt).x;
    assert.ok(lag < 0.015, `${hz} Hz: a 1.5 m/s sweep lags ${(lag * 1000).toFixed(1)} mm (needs < 15 mm)`);
    // Tracking lost and found 40 cm away: the first sample is the hand, not a glide from the old spot.
    sweep.reset();
    const back = sweep.update(-0.4, 1.2, 0.1, dt);
    assert.ok(back.x === -0.4 && back.y === 1.2 && back.z === 0.1, 'a reset filter passes the first sample through');
    const next = sweep.update(-0.4, 1.2, 0.1, dt);
    assert.ok(Math.abs(next.x + 0.4) < 1e-9, 'and does not drift back toward the lost position');
    if (hz === 72) console.log(`hand smoothing: still jitter -${(drop * 100).toFixed(0)}%, 1.5 m/s lag ${(lag * 1000).toFixed(1)} mm`);
  }
}

console.log('sim-check: all passed');
