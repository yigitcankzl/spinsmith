export default async function run({ page, frame }) {
  for (const candidate of [frame, ...page.frames()].filter(Boolean)) {
    const found = await candidate.evaluate(() => !!window.__game).catch(() => false);
    if (!found) continue;
    return candidate.evaluate(() => {
      const game = window.__game;
      if (game.phase !== 'hub') throw new Error(`Forge hero preparation needs the hub, got ${game.phase}`);
      const forgeBowl = game.arenas.find((arena) => arena.name === 'Forge Bowl');
      if (!forgeBowl) throw new Error('Forge Bowl arena not found');
      game.setArena(forgeBowl);
      game.progress.guide = 'done';
      // The still is about the live two-hand verb, not the portal/launch sequence. Enter a fresh
      // production fight directly so a title animation or a low-IWER-fps UI tap cannot leave the
      // repeatable capture in the hub.
      game.startMatch();
      game.launch(0.88, 0);
      game.elapsed = Math.max(game.elapsed, 3.2);
      game.arena.elapsed = Math.max(game.arena.elapsed, 3.2);
      // Freeze only top simulation. Hand input and the arena-morph system run before hit-stop, so
      // the hero gesture remains production behavior while random clash timing cannot end the bout.
      game.hitStop = 999;
      return { arena: game.arena.layout.name, phase: game.phase };
    });
  }
  throw new Error('game not found');
}
