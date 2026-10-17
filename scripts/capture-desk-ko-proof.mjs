import { writeFile } from 'node:fs/promises';

// Captures the managed IWER surface after a successful Desk KO proof.
export default async function run({ page, frame, cdp, workspaceRoot }) {
  for (const candidate of [frame, ...page.frames()].filter(Boolean)) {
    await candidate.waitForFunction(() => !!window.__game?.deskKoScored && window.__game?.lastRoundHeat === 3, null, { timeout: 55_000 }).catch(() => {});
    const proof = await candidate.evaluate(() => {
      const g = window.__game;
      return g ? { phase: g.phase, scored: !!g.deskKoScored, awarded: g.lastRoundHeat, score: [...g.barPoints] } : null;
    }).catch(() => null);
    if (!proof) continue;
    if (!proof.scored || proof.awarded !== 3) throw new Error(`Desk KO proof is not ready: ${JSON.stringify(proof)}`);
    // The result immediately starts a slow-motion replay. End only that dev replay and re-show the
    // exact production result stamp so the still proves the rule instead of catching a depth-mask
    // transition halfway through the replay.
    await candidate.evaluate(() => {
      const g = window.__game;
      g.replay = null;
      g.replayCount = 0;
      g.koFreeze = 0;
      g.slowMo = 0;
      g.stamp.show('DESK KO!', 'REAL EDGE · +1 HEAT · MATCH WON', 'mine', 5, 1.5);
    });
    await candidate.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const path = `${workspaceRoot}/artifacts/desk-ko-hand-proof.png`;
    // Playwright's full-page screenshot waits forever on this very slow immersive canvas, so use
    // Chromium's XR surface directly. IWER depth is disabled at registration because it has no
    // physical camera-depth layer; real Quest sessions retain depth occlusion.
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    await writeFile(path, Buffer.from(shot.data, 'base64'));
    return { path, proof };
  }
  throw new Error('game not found');
}
