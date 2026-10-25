// Counts what the rival does with its strike bar (dev page): METER_PART=hook installs the counters,
// METER_PART=read returns them. A tell is one telegraphed rival move (or boss seal); rounds and
// matches come from finish(). Used to compare rival pressure before and after a tuning change.
export default async function run({ page, frame }) {
  for (const f of [frame, ...page.frames()].filter(Boolean)) {
    const out = await f.evaluate((part) => {
      const g = window.__game;
      if (!g) return null;
      const m = (window.__rivalMeter ??= { tells: 0, seals: 0, rounds: 0, matches: 0, fightSeconds: 0, last: 0 });
      if (part === 'hook' && !g.__meterHooked) {
        g.__meterHooked = true;
        const tell = g.setRivalTellState.bind(g);
        g.setRivalTellState = (code) => {
          if (code && !g.rivalFeinting) m.tells++;
          return tell(code);
        };
        if (typeof g.rivalSeal === 'function') {
          const seal = g.rivalSeal.bind(g);
          g.rivalSeal = (...a) => {
            m.seals++;
            return seal(...a);
          };
        }
        const finish = g.finish.bind(g);
        g.finish = (v, desk) => {
          m.rounds++;
          m.fightSeconds += g.elapsed;
          const r = finish(v, desk);
          if (g.matchOver) m.matches++;
          return r;
        };
      }
      if (part === 'reset') Object.assign(m, { tells: 0, seals: 0, rounds: 0, matches: 0, fightSeconds: 0 });
      return { ...m, fightSeconds: +m.fightSeconds.toFixed(1), tellsPerRound: +(m.tells / Math.max(1, m.rounds)).toFixed(2) };
    }, process.env.METER_PART ?? 'read').catch(() => null);
    if (out) return out;
  }
  throw new Error('game not found');
}
