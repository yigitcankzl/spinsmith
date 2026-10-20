/** Flick in the shared shaping harness: equal rivals on every arena and type pairing. argv: rounds per pairing (default 6). */
import { humanFlick, humanRamp, POLICIES, reportShaping } from '../src/game/shaping-report.ts';
const n = Number(process.argv[2] ?? 6);
const line = (name: string, r: ReturnType<typeof reportShaping>) => console.log(`${name.padEnd(28)} win ${(r.win * 100).toFixed(1)}%  KO wins ${(r.koWins * 100).toFixed(1)}%  median ${r.medianRound.toFixed(1)} s  flips won/lost ${(r.flipsWon * 100).toFixed(1)}/${(r.flipsLost * 100).toFixed(1)}%  comeback ${(r.comeback * 100).toFixed(0)}%`);
line('none', reportShaping(POLICIES.none, n));
line('human ramp (0.35 s)', reportShaping(humanRamp(0.35), n));
line('human flick (0.32 s)', reportShaping(humanFlick(), n));
line('human flick, soft swing', reportShaping(humanFlick(undefined, 0.3), n));
line('flick masher', reportShaping(humanFlick(undefined, 0.5, false), n));
