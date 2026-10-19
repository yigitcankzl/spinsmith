// Leave IWER in a stable fight frame with the rival charge telegraph visible.
// This is a capture helper, not a gameplay assertion; check-combat-readability.mjs
// owns the automated pass/fail proof.
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
    const game = window.__game;
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    drive.rest();
    game.progress.matches = Math.max(3, game.progress.matches);
    game.progress.guide = 'done';
    game.startMatch();
    for (let i = 0; i < 160 && drive.state().phase !== 'ready'; i++) await sleep(25);
    drive.key('KeyL');
    for (let i = 0; i < 160 && drive.state().phase !== 'fight'; i++) await sleep(25);
    game.elapsed = Math.max(game.elapsed, 6);
    game.charges.charges = 3;
    drive.key('KeyU');
    game.tellTaught = true;
    game.stamp.cut();
    game.stamp.queue.length = 0;
    game.label.set('');
    game.labelTimer = 0;
    game.forgeBar.value = 0;
    game.barWasFull = false;
    Object.assign(game.mine, { x: -0.06, z: 0.01, vx: 0, vz: 0, spin: 1.1, state: 'spinning' });
    Object.assign(game.theirs, { x: 0.08, z: -0.02, vx: 0, vz: 0, spin: 1.1, state: 'spinning' });
    game.rival = { ...game.rival, move: 'charge' };
    game.rivalBar.value = 1;
    game.rivalTell(0);
    if (game.rivalTellCode !== 1) throw new Error('charge tell did not start');
    // Hold the wind-up long enough for a separate screenshot command to capture it.
    game.rivalTellDuration = 999;
    game.tellAt = game.elapsed + 999;
    game.theirs.tell = 999;
    game.drawLane(0.5);
    game.syncUiHierarchy();
    game.rivalBar.value = 0;
    Object.assign(game.mine, { vx: 0, vz: 0, spin: 1.1 });
    Object.assign(game.theirs, { vx: 0, vz: 0, spin: 1.1 });
    return { phase: drive.state().phase, rivalTell: drive.state().diagnostics.rivalTell };
  });
}
