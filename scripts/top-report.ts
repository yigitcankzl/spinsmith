/** Prints how the top parts play against each other. Run: npm run report:tops */
import { buildName } from '../src/game/parts.ts';
import { reportTops, topWarnings } from '../src/game/top-report.ts';

// 48 opponents per build: fewer and the luckiest of 136 builds looks dominant by chance.
const r = reportTops(48);
console.log(`${r.builds.length} legal builds\n\nBest builds:`);
for (const { build, win } of r.builds.slice(0, 10)) console.log(`  ${buildName(build).padEnd(24)} ${(win * 100).toFixed(0)}%`);
console.log('\nWorst builds:');
for (const { build, win } of r.builds.slice(-5)) console.log(`  ${buildName(build).padEnd(24)} ${(win * 100).toFixed(0)}%`);
console.log('\nParts (average win rate of their builds):');
for (const [k, v] of Object.entries(r.parts)) console.log(`  ${k.padEnd(14)} ${(v * 100).toFixed(0)}%`);
const warnings = topWarnings(r);
console.log(warnings.length ? `\nWarnings:\n  ${warnings.join('\n  ')}` : '\nNo warnings');
