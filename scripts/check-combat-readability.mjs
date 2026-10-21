// Focused IWER proof for the readable threat → hand-authored impact → finish chain.
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
    const waitFor = async (read, message, frames = 160) => {
      for (let i = 0; i < frames; i++) {
        const value = read();
        if (value) return value;
        await sleep(25);
      }
      throw new Error(message);
    };

    drive.rest();
    game.progress.matches = Math.max(3, game.progress.matches);
    game.everyVerb = true;
    game.progress.guide = 'done';
    game.startMatch();
    await waitFor(() => drive.state().phase === 'ready', 'match did not reach ready');
    drive.key('KeyL');
    await waitFor(() => drive.state().phase === 'fight', 'launch did not reach fight');
    game.tellTaught = true;
    // Countdown, unlock and ember messages are valid independently; clear them to isolate the
    // combat hierarchy under test instead of waiting through a save-dependent queue.
    game.stamp.cut();
    game.stamp.queue.length = 0;
    game.label.set('');
    game.labelTimer = 0;
    await sleep(50);
    game.elapsed = Math.max(game.elapsed, 6);
    game.charges.charges = 3;
    drive.key('KeyU');

    const tells = {};
    for (const [move, code] of [['charge', 1], ['quake', 2], ['pull', 3]]) {
      game.stamp.cut();
      game.stamp.queue.length = 0;
      game.label.set('');
      game.labelTimer = 0;
      game.forgeBar.value = 0;
      game.barWasFull = false;
      game.strikeWindowShown = false;
      Object.assign(game.mine, { x: -0.045, z: 0.015, vx: 0, vz: 0, spin: 1.1, state: 'spinning' });
      Object.assign(game.theirs, { x: 0.045, z: -0.015, vx: 0, vz: 0, spin: 1.1, state: 'spinning' });
      game.rival = { ...game.rival, move };
      game.rivalBar.value = 1;
      // Trigger the AI's own update immediately, before unrelated live-fight rewards can claim the
      // shared attention band on the next animation frame.
      game.rivalTell(0);
      if (game.rivalTellCode !== code) {
        throw new Error(`${move} start blocked: stamp=${game.stamp.occupied} rivalBar=${game.rivalBar.value} elapsed=${game.elapsed} phase=${game.phase}`);
      }
      // Software-rendered CI frames can advance several simulation steps before Playwright samples
      // the scene. Hold the already-started wind-up; this changes duration only, not its visuals.
      game.rivalTellDuration = 999;
      game.tellAt = game.elapsed + 999;
      game.theirs.tell = 999;
      game.drawLane(0.5);
      game.syncUiHierarchy();
      await waitFor(() => drive.state().diagnostics?.rivalTell === code, `${move} did not publish tell code ${code}`);
      if (!game.rivalTellFx.visible || (move !== 'quake' && !game.lane.visible) || !game.rivalTellGuard.visible) {
        throw new Error(`${move} tell did not expose its arena threat/answer visuals`);
      }
      if (game.stamp.busy || game.label.mesh.visible) throw new Error(`${move} stacked UI: stamp=${game.stamp.busy} label=${game.label.mesh.visible} text=${game.label.current}`);
      if (drive.state().diagnostics?.uiLayer !== 3) throw new Error(`${move} did not keep the fight information layer active`);
      if (move === 'quake' && !game.rivalTellQuake.some((mesh) => mesh.visible)) throw new Error('quake tell did not expose expanding rings');
      if (game.barMessage !== move.toUpperCase()) throw new Error(`${move} duplicated or verbose bar message: ${game.barMessage}`);
      tells[move] = { code, bar: game.barMessage, target: game.rivalTellTarget.visible };
      // End this wind-up without applying its physics; the next move starts from the same stable duel.
      game.theirs.tell = 0;
      game.rivalTell(0);
      await waitFor(() => drive.state().diagnostics?.rivalTell === 0, `${move} tell did not clear`);
    }

    // The authored path itself is real emulator hand input. Direct top placement only makes its
    // contact deterministic; it does not create the ramp or advance the cause-chain state.
    game.progress.matches = 0;
    game.everyVerb = false;
    game.progress.guide = 'bump';
    game.startMatch();
    await waitFor(() => drive.state().phase === 'ready', 'tutorial match did not reach ready');
    drive.key('KeyL');
    await waitFor(() => drive.state().phase === 'fight', 'tutorial launch did not reach fight');
    drive.key('KeyU');
    game.stamp.cut();
    game.stamp.queue.length = 0;
    game.label.set('');
    game.labelTimer = 0;
    game.tutorialRound = 1;
    game.firstHeroRamp = false;
    game.elapsed = Math.max(game.elapsed, 3);
    game.charges.charges = 3;
    Object.assign(game.mine, { x: -0.07, z: -0.04, vx: 0, vz: 0, spin: 1.1, state: 'spinning' });
    Object.assign(game.theirs, { x: 0.06, z: 0, vx: 0, vz: 0, spin: 1.1, state: 'spinning' });
    await drive.ramp({ at: { x: 0.06, z: 0 }, angle: 0, hold: 0.4, side: 'right' });
    const impact = await waitFor(() => {
      const state = drive.state();
      return (state.diagnostics?.causeChain ?? 0) >= 2 ? state : null;
    }, 'real hand ramp never advanced the cause chain to impact');
    if (!game.firstHeroRamp) throw new Error('first taught ramp did not receive its one-time decisive assist');

    Object.assign(game.theirs, { state: 'out', finish: 'over' });
    game.finish(1, false);
    const finish = await waitFor(() => {
      const state = drive.state();
      return state.diagnostics?.uiLayer === 4 ? state : null;
    }, 'result information layer did not take over after the finish');
    if (finish.diagnostics?.causeChain !== 3) throw new Error(`finish did not complete cause chain (${finish.diagnostics?.causeChain})`);
    return {
      tells,
      cause: {
        impact: impact.diagnostics.causeChain,
        finish: finish.diagnostics.causeChain,
        firstHeroRamp: game.firstHeroRamp,
        label: game.lastCause,
      },
    };
  });
}
