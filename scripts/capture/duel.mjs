// Puts the home pegs back to a one-on-one duel (the brawl pegs' setting persists across reloads).
export default async function run({ page, frame }) {
  for (const f of [frame, ...page.frames()].filter(Boolean)) {
    const ok = await f.evaluate(() => {
      const g = window.__game;
      if (!g) return false;
      g.seats = 2;
      g.brawlMode = 'last';
      g.hub.setBrawl(2);
      return true;
    }).catch(() => false);
    if (ok) return { seats: 2 };
  }
  throw new Error('game not found');
}
