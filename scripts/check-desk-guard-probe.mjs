// Deterministically exercises the production rival table-edge policy in the managed IWER runtime.
export default async function run({ page, frame }) {
  for (const candidate of [frame, ...page.frames()].filter(Boolean)) {
    const found = await candidate.evaluate(() => !!window.__game).catch(() => false);
    if (!found) continue;
    return candidate.evaluate(() => {
      const g = window.__game;
      g.phase = 'fight';
      g.demo = false;
      g.rival = { ...g.rival, level: 6 };
      // A campaign bout without arena shaping keeps its rival quiet by design; test the policy itself.
      g.bout = null;
      g.elapsed = Math.max(g.elapsed, 10);
      g.arena.elapsed = Math.max(g.arena.elapsed, 10);
      g.rivalShapeAt = g.elapsed - 9;
      g.rivalCharges.reset();
      g.rivalShapeKind = '';
      g.arena.shapes.splice(0);
      // The half-second prediction crosses the known IWER table's +x edge. Calling the same
      // production policy used by updateFight isolates the AI decision from unrelated collisions.
      g.theirs.launch(g.arena.radius * 0.82, 0, 0.5, 0, 0.9, g.theirs.hand);
      g.rivalShaping();
      const guard = g.arena.shapes.find((shape) => shape.owner === 'rival');
      if (g.rivalShapeKind !== 'DESK GUARD' || !guard) {
        throw new Error(`Desk Guard did not fire: kind=${g.rivalShapeKind}, shapes=${g.arena.shapes.length}`);
      }
      return {
        arena: g.arena.layout.name,
        rivalShape: g.rivalShapeKind,
        chargesLeft: g.rivalCharges.charges,
        top: { x: g.theirs.x, z: g.theirs.z, vx: g.theirs.vx, vz: g.theirs.vz },
        guard: { kind: guard.kind, owner: guard.owner, x: guard.x, z: guard.z, dx: guard.dx, dz: guard.dz },
      };
    });
  }
  throw new Error('game not found');
}
