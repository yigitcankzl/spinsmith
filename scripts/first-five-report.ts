/**
 * Headless estimate of a new player's first five minutes: match 1 (bout 1-1, Drifter in the Forge
 * Bowl, your Striker against its Halo) played by the HUMAN-lag shaper of shaping-report.ts, with
 * the first match's lesson rules: every finish scores 1 heat (first to MATCH_HEAT), each round's
 * rim shield (6 s, the forge round 10 s) holds the rival only until your first shape, ramps from
 * round 1 and the Anvil Strike from round 3 (its bar starting at 0.8). The staged DESK KO and the
 * two-hand Arena Forge are not in the headless sim, so round 2 is played with ramps only.
 * Off-fight time is added from the game's own constants and a seated player's gesture times.
 * Run: npm run report:first-five   (FIRST_FIVE_MATCHES=400 for more samples)
 */
import { ARENAS } from '../src/game/arenas.ts';
import { PRESETS, RIVALS, specFromBuild } from '../src/game/parts.ts';
import { HUMAN, humanRamp, humanStrike } from '../src/game/shaping-report.ts';
import { ShapingCharges, StrikeBar, behindOn } from '../src/game/shaping.ts';
import { Arena, LAUNCH_TILT, MATCH_HEAT, STEP, TUNING, Top, launchSpeed, launchSpin, step, verdict } from '../src/game/sim.ts';

const MATCHES = Number(process.env.FIRST_FIVE_MATCHES ?? 200);
const layout = ARENAS.find((a) => a.name === 'Forge Bowl')!;
const rival = RIVALS.find((r) => r.name === 'Drifter')!;
const mineSpec = specFromBuild(PRESETS[0].build);
const rivalSpec = specFromBuild(rival.build);

// Off-fight seconds (match-system.ts constants; gestures at HUMAN reaction plus a read).
const READ = 1.2; // reading a two-line card before acting
const PLACE = READ + HUMAN.reaction + 0.8 + 1.1; // see the print, pinch it, RISE_TIME
const CARRY = READ + 2.2; // the dock note, then carry the top into the arena
const INTRO = 2.5; // INTRO_TIME: rival and arena intro before the rip hint
const RIP = HUMAN.reaction + 1.4; // reach, pinch, pull back, let go
const RESULT = 4; // RESULT_TIME (a spin finish between rounds: 1.15)
const RESULT_SPIN = 1.15;
const REPLAY = 240 / 120 / 0.4; // REPLAY_STEPS at REPLAY_SPEED: the first knockout of your making replays
const LESSON_GRACE = 6;

let seed = 11;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

function round(n: number) {
  const policy = n >= 3 ? humanStrike(humanRamp(HUMAN.reaction + HUMAN.gesture + HUMAN.tracking)) : humanRamp(HUMAN.reaction + HUMAN.gesture + HUMAN.tracking);
  const arena = new Arena(layout);
  const charges = new ShapingCharges();
  const bar = new StrikeBar();
  if (n >= 3) bar.value = 0.8;
  const a = new Top(mineSpec);
  const b = new Top(rivalSpec);
  const spawn = layout.radius * 0.72;
  const pa = 0.75 + rnd() * 0.25;
  const pb = 0.5 + rnd() * 0.5;
  const da = LAUNCH_TILT + (rnd() - 0.5) * 0.6;
  const db = LAUNCH_TILT + (rnd() - 0.5) * 0.6;
  a.launch(0, spawn, Math.sin(da) * launchSpeed(pa), -Math.cos(da) * launchSpeed(pa), launchSpin(pa), 1);
  b.launch(0, -spawn, -Math.sin(db) * launchSpeed(pb), Math.cos(db) * launchSpeed(pb), launchSpin(pb), -1);
  a.shieldUntil = b.shieldUntil = n === 2 ? 10 : LESSON_GRACE;
  let t = 0;
  let shaped = false;
  while (verdict(a, b, t) === 0) {
    const before = arena.shapes.length;
    policy(arena, a, b, t, charges, rnd, 'me', bar);
    // recordIntervention: the player's first move drops the rival's lesson shield.
    if (!shaped && (arena.shapes.length > before || bar.value === 0)) {
      shaped = true;
      b.shieldUntil = 0;
    }
    charges.update(STEP);
    const lagging = t >= TUNING.grace && behindOn(a, b);
    bar.update(STEP, lagging);
    const clash = step(arena, a, b);
    if (clash) {
      if (clash.shapeOwner?.startsWith('me')) charges.clash(clash.strength, t);
      bar.clash(clash.strength, t, lagging);
    }
    t += STEP;
  }
  const v = verdict(a, b, t);
  const loser = v === 1 ? b : a;
  return { v, t, ko: v !== 2 && loser.finish !== 'spin' };
}

function match() {
  let clock = PLACE + CARRY;
  let heat = [0, 0];
  let firstKo: number | null = null;
  let firstAnyKo: number | null = null;
  let replayed = false;
  let rounds = 0;
  for (let n = 1; heat[0] < MATCH_HEAT && heat[1] < MATCH_HEAT && n < 40; n++) {
    clock += (n === 1 ? INTRO : READ) + RIP;
    const r = round(n);
    rounds++;
    clock += r.t;
    if (r.ko) firstAnyKo ??= clock;
    if (r.ko && r.v === 1) firstKo ??= clock;
    if (r.v === 1) heat[0]++;
    else if (r.v === -1) heat[1]++;
    const decided = heat[0] >= MATCH_HEAT || heat[1] >= MATCH_HEAT;
    if (!decided) clock += r.ko ? RESULT : RESULT_SPIN;
    if (r.ko && r.v === 1 && !replayed) {
      replayed = true;
      clock += REPLAY;
    }
  }
  return { firstKo, firstAnyKo, end: clock, won: heat[0] > heat[1], rounds };
}

const runs = Array.from({ length: MATCHES }, match);
const median = (xs: number[]) => {
  const s = [...xs].sort((p, q) => p - q);
  return s.length ? +s[s.length >> 1].toFixed(1) : null;
};
const ko = runs.map((r) => r.firstKo).filter((x): x is number => x !== null);
const summary = {
  matches: MATCHES,
  medianFirstKoS: median(ko),
  medianFirstAnyKoS: median(runs.map((r) => r.firstAnyKo).filter((x): x is number => x !== null)),
  firstKoUnder90: +(runs.filter((r) => r.firstKo !== null && r.firstKo < 90).length / MATCHES).toFixed(2),
  noKoInMatch: +(runs.filter((r) => r.firstKo === null).length / MATCHES).toFixed(2),
  medianMatchEndS: median(runs.map((r) => r.end)),
  medianRounds: median(runs.map((r) => r.rounds)),
  matchWon: +(runs.filter((r) => r.won).length / MATCHES).toFixed(2),
  note: 'game seconds from ENTER; round 2 without the staged DESK KO (not in the headless sim)',
};
console.log(JSON.stringify(summary, null, 2));
