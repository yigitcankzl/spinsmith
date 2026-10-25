// Starts a Circuit Map bout directly (dev page), the way the Circuit Map does:
// BOUT=1-5 npx @iwsdk/cli browser run scripts/capture/start-bout.mjs
export default async function run({ page, frame }) {
  for (const f of [frame, ...page.frames()].filter(Boolean)) {
    const out = await f.evaluate(async (id) => {
      const g = window.__game;
      if (!g) return null;
      const { BOUTS } = await import('/src/game/campaign.ts');
      const { RIVALS } = await import('/src/game/parts.ts');
      const bout = BOUTS.find((b) => b.id === id);
      if (!bout) throw new Error(`no bout ${id}`);
      const i = g.arenas.findIndex((a) => a.name === bout.arena);
      if (i >= 0) {
        g.arenaIndex = i;
        g.setArena(g.arenas[i]);
      }
      g.clearBrawl();
      // As the map does: the planned bout and its rival, so the entrance and round setup see the bout.
      g.nextRival = RIVALS.find((r) => r.name === bout.rival);
      g.nextBoutPick = bout;
      g.startMatch();
      g.rewards.boutEarned = 0;
      return { bout: bout.id, rival: g.rival.name, arena: g.arena.layout.name, phase: g.phase };
    }, process.env.BOUT ?? '1-5').catch((e) => ({ error: String(e) }));
    if (out) return out;
  }
  throw new Error('game not found');
}
