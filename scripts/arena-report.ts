/** Prints how each built-in arena plays. Run: npm run report:arenas */
import { reportArena, arenaWarning } from '../src/game/arena-report.ts';
import { ARENAS } from '../src/game/arenas.ts';

for (const layout of ARENAS) {
  const r = reportArena(layout, 20);
  const types = Object.entries(r.typeWin)
    .map(([k, v]) => `${k} ${(v * 100).toFixed(0)}%`)
    .join(', ');
  console.log(
    `${layout.name.padEnd(16)} median ${r.median.toFixed(1)} s, quick ${(r.quick * 100).toFixed(0)}%, ` +
      `KO ${(r.knockout * 100).toFixed(0)}% (burst ${(r.burst * 100).toFixed(0)}%), clashes ${r.clashes.toFixed(0)}, ${types}` +
      `${arenaWarning(r) ? `  <- ${arenaWarning(r)}` : ''}`,
  );
}
