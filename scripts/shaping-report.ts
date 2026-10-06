/** How much arena shaping decides a fight, by shaping habit. Run: npm run report:shaping */
import { POLICIES, reportShaping } from '../src/game/shaping-report.ts';

// Acceptance ranges from docs/QUESTLESS-PLAN.md.
const goal: Record<string, string> = { none: '', random: 'win 48-52%', pushOut: 'win 58-63%, median 14-20 s, 2-4 shapes, own KO < 10%', centerWell: 'beats none, own KO < 10%' };
for (const [name, policy] of Object.entries(POLICIES)) {
  // 24 rounds per type pair and arena: fewer and the policies' gaps drown in noise.
  const r = reportShaping(policy, 24);
  console.log(
    `${name.padEnd(11)} win ${(r.win * 100).toFixed(0)}%, points/round ${r.pointsPerRound.toFixed(2)}, KO wins ${(r.koWins * 100).toFixed(0)}%, median round ${r.medianRound.toFixed(1)} s, shapes/round ${r.shapesPerRound.toFixed(1)}, own KO after a shape ${(r.ownKo * 100).toFixed(0)}%${goal[name] ? `   (target: ${goal[name]})` : ''}`,
  );
}
