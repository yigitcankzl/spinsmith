// Creates a deterministic fight and resets the press detector before the real emulated palm falls.
export default async function run({ page, frame }) {
  for (const candidate of [frame, ...page.frames()].filter(Boolean)) {
    const found = await candidate.evaluate(() => !!window.__game).catch(() => false);
    if (!found) continue;
    return candidate.evaluate(async () => {
      const g = window.__game;
      const { COMFORT } = await import('/src/game/comfort.ts');
      const { TableTouch } = await import('/src/game/table-touch.ts');
      COMFORT.gentle = true;
      g.progress.matches = Math.max(3, g.progress.matches);
      g.progress.guide = 'done';
      if (g.arena.layout.name !== 'Forge Bowl') g.setArena(g.arenas.find((arena) => arena.name === 'Forge Bowl'));
      if (g.phase !== 'fight') {
        g.startMatch();
        g.launch(0.82, 0);
      }
      // Browser commands can queue behind a very slow IWER frame. Re-launch both simulation tops
      // here so the final setup is fresh at the instant this command executes.
      g.mine.launch(0, g.arena.radius * 0.55, 0, 0, 0.9, g.mine.hand);
      g.theirs.launch(g.arena.radius * 0.97, 0, 0, 0, 0.9, g.theirs.hand);
      g.arena.shapes.splice(0);
      g.deskVerdict = null;
      g.deskKoScored = false;
      g.setDeskKoStage(0);
      g.lastRoundHeat = 0;
      g.myPoints = 0;
      g.theirPoints = 0;
      g.barPoints = [0, 0];
      g.myBuild.seal = 'anvil';
      g.lite = true;
      // Hold only fight physics until the real emulated hand has fired. Rendering and hand input
      // keep running, so this proves the production gesture without command-queue races.
      g.hitStop = 999;
      // Reset the detector while the emulated hand is still above the table. The next downward
      // transform must therefore be the gesture that arms the press, never stale motion.
      g.touches.left = new TableTouch();
      g.touches.right = new TableTouch();
      g.forgeBar.value = 1;
      g.fullSince = g.elapsed - 1;
      g.barWasFull = true;
      g.elapsed = Math.max(g.elapsed, 3.2);
      g.arena.elapsed = Math.max(g.arena.elapsed, 3.2);
      const strike = g.root.localToWorld(g.handAt.set(-g.arena.radius * 1.55, 0, 0));
      return {
        phase: g.phase,
        bar: g.forgeBar.value,
        frozen: g.hitStop > 100,
        interventions: window.spinsmithDiagnostics?.().interventions ?? 0,
        strike: { x: strike.x, y: g.root.position.y - 0.08 * g.rootK, z: strike.z },
        rival: { x: g.theirs.x, z: g.theirs.z },
      };
    });
  }
  throw new Error('game not found');
}
