// Performs the production gentle-palm gesture through SpinSmith's IWER hand driver.
export default async function run({ page, frame }) {
  for (const candidate of [frame, ...page.frames()].filter(Boolean)) {
    const found = await candidate.evaluate(() => typeof window.drive?.slap === 'function').catch(() => false);
    if (!found) continue;
    return candidate.evaluate(async () => {
      const g = window.__game;
      const touch = g.touches.right;
      const original = touch.update.bind(touch);
      const probe = window.__deskProbe = {
        updates: 0,
        fed: 0,
        inBand: 0,
        hits: 0,
        minY: Infinity,
        maxY: -Infinity,
        maxDown: 0,
        last: null,
      };
      touch.update = (y, dt, lo, hi) => {
        const hit = original(y, dt, lo, hi);
        probe.updates += 1;
        if (y !== null) {
          probe.fed += 1;
          if (y >= lo && y <= hi) probe.inBand += 1;
          probe.minY = Math.min(probe.minY, y);
          probe.maxY = Math.max(probe.maxY, y);
        }
        probe.maxDown = Math.max(probe.maxDown, touch.v ?? 0);
        if (hit !== null) probe.hits += 1;
        probe.last = { y, dt, lo, hi, velocity: touch.v ?? null, still: touch.still ?? null, downAt: touch.downAt ?? null };
        return hit;
      };
      let error = null;
      try {
        await window.drive.slap({ gentle: true, side: 'right', angle: 180 });
      } catch (reason) {
        error = String(reason?.message ?? reason);
      } finally {
        touch.update = original;
      }
      return { error, state: window.drive.state(), probe };
    });
  }
  throw new Error('window.drive not found: enter the emulated XR session first');
}
