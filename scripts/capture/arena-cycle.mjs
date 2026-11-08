// Capture beat: one live fight whose arena turns into the next every CYCLE_EVERY seconds while the
// same two tops keep spinning (the tops are kept inside the new rim and topped up so the round never
// ends). Logs each switch on the long recording's clock (window.__long.t0) for the cut's captions.
// ARENAS=Forge Bowl,Frost Oval,... CYCLE_EVERY=1.2 npx @iwsdk/cli browser run scripts/capture/arena-cycle.mjs
export default async function run({ page, frame }) {
  const args = { names: (process.env.ARENAS ?? 'Forge Bowl,Frost Oval,Sumo Square,Crucible Gate,Clockwork Spire,Meteor Pit,Sentinel Gates,Gear Rink').split(','), every: Number(process.env.CYCLE_EVERY ?? 1.2) };
  for (const f of [frame, ...page.frames()].filter(Boolean)) {
    const out = await f.evaluate(async ({ names, every }) => {
      const g = window.__game;
      if (!g) return null;
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const layouts = names.map((n) => g.arenas.find((a) => a.name === n)).filter(Boolean);
      if (!layouts.length) throw new Error('no arenas found');
      g.setArena(layouts[0]);
      if (g.phase !== 'fight') {
        g.startMatch();
        for (let i = 0; i < 200 && g.phase !== 'ready'; i++) await sleep(25);
        window.drive.key('KeyL');
        for (let i = 0; i < 200 && g.phase !== 'fight'; i++) await sleep(25);
      }
      const t0 = window.__long?.t0 ?? performance.now();
      const log = [];
      const keep = () => {
        for (const top of [g.mine, g.theirs]) {
          top.spin = Math.max(top.spin, 0.85);
          const rim = g.arena.layout.radius * 0.55;
          const r = Math.hypot(top.x, top.z);
          if (r > rim) { top.x *= rim / r; top.z *= rim / r; }
        }
        g.elapsed = Math.min(g.elapsed, 20);
      };
      const hold = setInterval(keep, 50);
      for (const [i, L] of layouts.entries()) {
        if (i) g.setArena(L);
        keep();
        log.push([+((performance.now() - t0) / 1000).toFixed(2), L.name]);
        await sleep(every * 1000);
      }
      clearInterval(hold);
      return { phase: g.phase, log };
    }, args).catch((e) => ({ error: String(e) }));
    if (out) return out;
  }
  throw new Error('game not found');
}
