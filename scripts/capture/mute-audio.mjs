// Keeps automated IWER tests and captures silent without changing the player's saved comfort mode.
export default async function run({ page, frame }) {
  for (const candidate of [frame, ...page.frames()].filter(Boolean)) {
    const found = await candidate.evaluate(() => !!window.__game).catch(() => false);
    if (!found) continue;
    return candidate.evaluate(async () => {
      const { COMFORT } = await import('/src/game/comfort.ts');
      const { applySound } = await import('/src/game/audio.ts');
      COMFORT.sound = false;
      applySound();
      return { muted: true };
    });
  }
  throw new Error('game not found');
}
