export default async function run({ page, frame }) {
  for (const candidate of [frame, ...page.frames()].filter(Boolean)) {
    const found = await candidate.evaluate(() => !!window.__game).catch(() => false);
    if (!found) continue;
    return candidate.evaluate(() => {
      const game = window.__game;
      // Capture setup exits and re-enters XR, which correctly returns the product to placement.
      // Resolve that state before building the hero bout; otherwise a successful old probe can be
      // followed by a completely unrelated placement screenshot.
      game.cancelActiveGestures?.();
      game.needPlace = false;
      if (game.phase === 'placing') game.place();
      else if (game.phase !== 'hub') game.toHub();
      // Re-entering emulated XR can leave the placed world hidden even though the phase has already
      // advanced. A proof capture must make the same placed root visible before staging the bout.
      game.root.visible = true;
      if (game.phase !== 'hub') throw new Error(`Forge hero preparation could not reach the hub (got ${game.phase})`);
      const forgeBowl = game.arenas.find((arena) => arena.name === 'Forge Bowl');
      if (!forgeBowl) throw new Error('Forge Bowl arena not found');
      game.setArena(forgeBowl);
      game.progress.guide = 'done';
      game.progress.matches = Math.max(2, game.progress.matches);
      // The still is about the live two-hand verb, not the portal/launch sequence. Enter a fresh
      // production fight directly so a title animation or a low-IWER-fps UI tap cannot leave the
      // repeatable capture in the hub.
      game.startMatch();
      game.launch(0.88, 0);
      game.elapsed = Math.max(game.elapsed, 3.2);
      game.arena.elapsed = Math.max(game.arena.elapsed, 3.2);
      game.charges.charges = 3;
      // The opening trajectory lesson is useful to play, but it competes with the two hands in a
      // single hero frame. Advance that lesson beat so the photographed verb is only Arena Forge.
      game.firstClashPending = false;
      game.launchGuide.visible = false;
      for (const guide of [game.launchMarker, game.launchAim, game.launchGhost, game.openingEcho, game.rivalIntent]) {
        if (guide) guide.visible = false;
      }
      // Freeze only top simulation. Hand input and the arena-morph system run before hit-stop, so
      // the hero gesture remains production behavior while random clash timing cannot end the bout.
      game.hitStop = 999;
      // Placement visuals must never survive into a presentation frame.
      game.print.visible = false;
      game.printLabel.mesh.visible = false;
      return { arena: game.arena.layout.name, phase: game.phase, rootVisible: game.root.visible };
    });
  }
  throw new Error('game not found');
}
