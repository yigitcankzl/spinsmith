// Puts the home pegs back to a one-on-one duel (the brawl pegs' setting persists across reloads);
// SEATS=3|4 sets a last-top-standing brawl instead.
export default async function run({ page, frame }) {
  for (const f of [frame, ...page.frames()].filter(Boolean)) {
    const ok = await f.evaluate((SEATS) => {
      const g = window.__game;
      if (!g) return false;
      const n = Number(SEATS);
      g.seats = n;
      g.brawlMode = 'last';
      g.hub.setBrawl(n);
      return true;
    }, process.env.SEATS ?? '2').catch(() => false);
    if (ok) return { seats: Number(process.env.SEATS ?? 2) };
  }
  throw new Error('game not found');
}
