// Confirms the persistent IWER hand driver still owns the current XR session after reload/re-entry.
export default async function run({ page, frame }) {
  let target = null;
  for (const candidate of [frame, ...page.frames()].filter(Boolean)) {
    if (await candidate.evaluate(() => typeof window.drive === 'object').catch(() => false)) {
      target = candidate;
      break;
    }
  }
  if (!target) throw new Error('window.drive not found: enter the emulated XR session first');
  return target.evaluate(async () => {
    const drive = window.drive;
    const g = window.__game;
    drive.rest();
    const before = g.root.worldToLocal(g.hands.left.pinch.clone()).toArray();
    const goal = g.root.localToWorld(g.hands.left.pinch.clone().set(0, 0.08, 0.08));
    await drive.move('left', goal.toArray(), 0.4, 'pinch');
    await drive.wait(0.2);
    const after = g.root.worldToLocal(g.hands.left.pinch.clone()).toArray();
    drive.rest();
    if (Math.hypot(after[0], after[1] - 0.08, after[2] - 0.08) > 0.04) throw new Error(`driver missed: ${after.map((n) => n.toFixed(3))}`);
    return { before, after };
  });
}
