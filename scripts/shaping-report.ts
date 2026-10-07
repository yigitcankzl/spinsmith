/** How much arena shaping decides a fight, by shaping habit. Run: npm run report:shaping */
import { humanBoth, humanCup, humanRamp, humanStrike, masherStrike, POLICIES, reportShaping, rivalWithMove } from '../src/game/shaping-report.ts';
import type { ShapingResult } from '../src/game/shaping-report.ts';
import { RIVAL_RAMP_SIGMA } from '../src/game/sim.ts';

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
const line = (name: string, r: ShapingResult, goal = '') =>
  console.log(
    `${name.padEnd(30)} win ${pct(r.win)}, KO wins ${pct(r.koWins)}, median ${r.medianRound.toFixed(1)} s, shapes ${r.shapesPerRound.toFixed(1)}, flips +${pct(r.flipsWon)} / -${pct(r.flipsLost)}, untouched ${pct(r.untouched)}, own KO ${pct(r.ownKo)}, comeback ${pct(r.comeback)}${goal ? `   (target: ${goal})` : ''}`,
  );

// 24 rounds per type pair and arena: fewer and the policies' gaps drown in noise.
line('none', reportShaping(POLICIES.none, 24));
line('masher (random)', reportShaping(POLICIES.random, 24), 'win at most +3 over none');
line('human ramp (lag 0.35 s, pinch)', reportShaping(humanRamp(0.35), 24), 'win 55-60%, untouched <= 35%, flips lost <= 7%, median >= 13 s');
line('human ramp (lag 0.62 s, release)', reportShaping(humanRamp(0.62), 24));
line('human cup and sling', reportShaping(humanCup(), 24));
line('human ramp + cup', reportShaping(humanBoth(), 24), 'win 58-63%, median 12.5-16 s, flips lost <= 9%');
line('superhuman push-out (no lag)', reportShaping(POLICIES.pushOut, 24));
line('center well', reportShaping(POLICIES.centerWell, 24));
// Rivals from level 6 ramp you out too: how a player fares against them.
line('none vs a ramping rival', reportShaping(POLICIES.none, 24, humanRamp(0.62, RIVAL_RAMP_SIGMA)));
line('human ramp vs a ramping rival', reportShaping(humanRamp(0.35), 24, humanRamp(0.62, RIVAL_RAMP_SIGMA)));
// The duel layer (docs/DUEL-DESIGN.md): the forge bar's strike, and rivals' telegraphed moves.
line('masher + strike', reportShaping(masherStrike, 12));
line('human + anvil strike', reportShaping(humanStrike(humanBoth()), 12), 'beats masher + strike by >= 12, median 12-20 s');
line('human + rush', reportShaping(humanStrike(humanBoth(), undefined, 'rush'), 12), 'within 3 of the anvil');
line('human + magnet', reportShaping(humanStrike(humanBoth(), undefined, 'magnet'), 12), 'within 3 of the anvil');
line('human + tilt', reportShaping(humanStrike(humanBoth(), undefined, 'tilt'), 12), 'within 3 of the anvil');
line('human + hammer', reportShaping(humanStrike(humanBoth(), undefined, 'hammer'), 12), 'within 3 of the anvil');
line('human + bulwark', reportShaping(humanStrike(humanBoth(), undefined, 'bulwark'), 12), 'within 3 of the anvil');
line('none vs a charging rival', reportShaping(POLICIES.none, 12, rivalWithMove('charge')));
line('human + strike vs charging', reportShaping(humanStrike(humanBoth()), 12, rivalWithMove('charge')));
