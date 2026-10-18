export default async function run({ page, frame }) {
  for (const candidate of [frame, ...page.frames()].filter(Boolean)) {
    const found = await candidate.evaluate(() => !!window.__game).catch(() => false);
    if (!found) continue;
    return candidate.evaluate(async () => {
      await window.__capturePosePromise;
      const error = window.__capturePoseError ?? '';
      delete window.__capturePosePromise;
      delete window.__capturePoseError;
      return { finished: true, error, phase: window.__game.phase };
    });
  }
  throw new Error('game not found');
}
