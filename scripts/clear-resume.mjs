// Probe isolation: drop the interrupted-match snapshot (and the one this page would write as it
// unloads) so a reload starts at home instead of resuming the previous probe's match.
export default async function run({ page, frame }) {
  for (const f of [frame, ...page.frames()].filter(Boolean)) {
    const ok = await f.evaluate(async () => {
      if (!window.__game) return false;
      const { RESUME_KEY } = await import('/src/game/match-resume.ts');
      localStorage.removeItem(RESUME_KEY);
      addEventListener('pagehide', () => localStorage.removeItem(RESUME_KEY));
      return true;
    }).catch(() => false);
    if (ok) return 'cleared';
  }
  return 'no game';
}
