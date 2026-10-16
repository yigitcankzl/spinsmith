// Browser-side regression probe for hand-first mechanics whose public state is transient.
// Usage: HAND_CHECK=palm-brace npx @iwsdk/cli browser run scripts/check-hand-mechanic.mjs --timeout 100000
// Other modes: dual-rip, rim-spring, palm-forge, outer-ring, arena-morph.
export default async function run({ page, frame }) {
  let target = null;
  for (const candidate of [frame, ...page.frames()].filter(Boolean)) {
    if (await candidate.evaluate(() => typeof window.drive === 'object').catch(() => false)) {
      target = candidate;
      break;
    }
  }
  if (!target) throw new Error('window.drive not found: enter the emulated XR session first');

  const mode = process.env.HAND_CHECK ?? 'palm-brace';
  return target.evaluate(async (check) => {
    const drive = window.drive;
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    if (check === 'palm-forge' && drive.state().phase === 'hub') {
      // The normal anvil remains the production path. Opening directly here keeps this probe
      // independent from tutorial locks and tests only the two-hand assembly interaction.
      window.__game.openForge();
      await sleep(500);
    }
    if (check === 'outer-ring' || check === 'arena-morph') {
      window.__game.startMatch();
      for (let i = 0; i < 200 && drive.state().phase !== 'ready'; i++) await sleep(25);
      if (drive.state().phase === 'ready') drive.key('KeyL');
      for (let i = 0; i < 120 && drive.state().phase !== 'fight'; i++) await sleep(25);
      if (drive.state().phase === 'fight') drive.key('KeyU');
    }
    // Headless IWER can run below 10 fps. The interaction itself is what this probe covers, so do
    // not spend most of its timeout waiting for the opening clock to reach the normal 2.5 s gate.
    if (check === 'arena-morph' && drive.state().phase === 'fight') {
      window.__game.elapsed = Math.max(window.__game.elapsed, 2.7);
      drive.key('KeyU');
    }
    const before = drive.state();
    let finished = false;
    let failure = '';
    let action;
    let stateKey;

    if (check === 'palm-brace') {
      if (before.phase !== 'fight') throw new Error('palm-brace check requires a fight');
      const top = before.mine.alive ? before.mine : before.rival_top;
      const angle = Math.atan2(top.z, top.x) * 180 / Math.PI;
      stateKey = 'palmBrace';
      action = drive.palmBrace({ angle, hold: 1.2, side: 'left' });
    } else if (check === 'dual-rip') {
      if (before.phase !== 'ready') throw new Error('dual-rip check requires the launch phase');
      stateKey = 'bracedLaunch';
      action = drive.dualRip({ power: 0.88, aim: 0, side: 'right' });
    } else if (check === 'rim-spring') {
      if (before.phase !== 'fight') throw new Error('rim-spring check requires a fight');
      const top = before.rival_top.alive ? before.rival_top : before.mine;
      const angle = Math.atan2(top.z, top.x) * 180 / Math.PI;
      action = drive.rimSpring({ angle, pull: 0.045, side: 'right' });
    } else if (check === 'palm-forge') {
      if (before.phase !== 'forge') throw new Error('palm-forge check requires the forge');
      stateKey = 'palmForge';
      // Striker is always available, so the carry check is independent from account unlocks.
      action = drive.palmForge('Striker', 'left');
    } else if (check === 'outer-ring') {
      if (before.phase !== 'fight') throw new Error('outer-ring check requires a fight');
      stateKey = 'outerRing';
      action = drive.outerRingReturn('right');
    } else if (check === 'arena-morph') {
      if (before.phase !== 'fight') throw new Error('arena-morph check requires a fight');
      stateKey = 'morph';
      action = drive.arenaForge({ squeeze: 0.028, twist: 12, tilt: 0.03, hold: 0.45 });
    } else {
      throw new Error(`unknown HAND_CHECK ${check}`);
    }

    void Promise.resolve(action)
      .catch((error) => { failure = error instanceof Error ? error.message : String(error); })
      .finally(() => { finished = true; });

    let sawTransient = false;
    let peakCharges = before.charges;
    for (let sample = 0; sample < 700 && !finished; sample++) {
      const current = drive.state();
      if (stateKey === 'outerRing') sawTransient ||= current.outerRing?.state === 'rail' || current.outerRing?.state === 'returned';
      else if (stateKey === 'morph') sawTransient ||= !!current.morph && (Math.abs(current.morph.scaleX - 1) > 0.015 || Math.abs(current.morph.scaleZ - 1) > 0.015 || Math.abs(current.morph.tilt) > 0.01);
      else if (stateKey && current[stateKey]) sawTransient = true;
      peakCharges = Math.min(peakCharges, current.charges);
      await sleep(16);
    }
    while (!finished) await sleep(16);
    if (failure) throw new Error(failure);
    if ((stateKey === 'outerRing' || stateKey === 'morph') && !sawTransient) throw new Error(`${stateKey} never became visibly active`);

    const after = drive.state();
    return {
      check,
      before: { phase: before.phase, charges: before.charges },
      observed: stateKey ? { stateKey, sawTransient } : { chargeSpent: peakCharges < before.charges },
      after: { phase: after.phase, charges: after.charges, build: after.build },
    };
  }, mode);
}
