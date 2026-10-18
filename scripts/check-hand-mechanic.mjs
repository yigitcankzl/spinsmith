// Browser-side regression probe for hand-first mechanics whose public state is transient.
// Usage: HAND_CHECK=palm-brace npx @iwsdk/cli browser run scripts/check-hand-mechanic.mjs --timeout 100000
// Other modes: single-rip, dual-rip, finger-groove, rim-spring, palm-brace, palm-gust, palm-gust-left, palm-gust-riposte, palm-forge, outer-ring, arena-morph-{tutorial,squeeze,stretch,twist,tilt,cancel}.
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
    const game = window.__game;
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    // Every probe begins from the current XR hand rig. This also makes the script repeatable after
    // a session exit/re-entry, when IWER has rebuilt the joints behind the same window.drive object.
    drive.rest();
    if (check === 'palm-forge' && drive.state().phase !== 'forge') {
      // The normal anvil remains the production path. Opening directly here keeps this probe
      // independent from tutorial locks and tests only the two-hand assembly interaction.
      window.__game.openForge();
      await sleep(1200);
    }
    const gustCheck = check === 'palm-gust' || check === 'palm-gust-left' || check === 'palm-gust-riposte';
    if (check === 'palm-brace' || gustCheck || check === 'rim-spring') game.progress.matches = Math.max(2, game.progress.matches);
    if (check.startsWith('arena-morph') && check !== 'arena-morph-tutorial') game.progress.matches = Math.max(1, game.progress.matches);
    const launchCheck = check === 'single-rip' || check === 'dual-rip';
    if (launchCheck && drive.state().phase !== 'ready') {
      window.__game.startMatch();
      for (let i = 0; i < 200 && drive.state().phase !== 'ready'; i++) await sleep(25);
    }
    if (launchCheck) window.__game.deckChoice = 0;
    if (check === 'outer-ring' || check === 'finger-groove' || check === 'palm-brace' || gustCheck || check === 'rim-spring' || check.startsWith('arena-morph')) {
      window.__game.startMatch();
      for (let i = 0; i < 200 && drive.state().phase !== 'ready'; i++) await sleep(25);
      if (drive.state().phase === 'ready') drive.key('KeyL');
      for (let i = 0; i < 120 && drive.state().phase !== 'fight'; i++) await sleep(25);
      if (drive.state().phase === 'fight') drive.key('KeyU');
    }
    // Headless IWER can run below 10 fps. The interaction itself is what this probe covers, so do
    // not spend most of its timeout waiting for the opening clock to reach the normal 2.5 s gate.
    if ((check === 'finger-groove' || check === 'palm-brace' || gustCheck || check === 'rim-spring' || check.startsWith('arena-morph')) && drive.state().phase === 'fight') {
      window.__game.elapsed = Math.max(window.__game.elapsed, 2.7);
      window.__game.charges.charges = 3;
      drive.key('KeyU');
    }
    const before = drive.state();
    let finished = false;
    let failure = '';
    let action;
    let stateKey;
    let tutorialProof;

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
    } else if (check === 'single-rip') {
      if (before.phase !== 'ready') throw new Error('single-rip check requires the launch phase');
      stateKey = 'oneHandLaunch';
      action = drive.rip({ power: 0.88, aim: 0, side: 'right' });
    } else if (check === 'rim-spring') {
      if (before.phase !== 'fight') throw new Error('rim-spring check requires a fight');
      const top = before.rival_top.alive ? before.rival_top : before.mine;
      const angle = Math.atan2(top.z, top.x) * 180 / Math.PI;
      action = drive.rimSpring({ angle, pull: 0.045, side: 'right' });
    } else if (gustCheck) {
      if (before.phase !== 'fight') throw new Error('palm-gust check requires a fight');
      stateKey = 'palmGust';
      action = check === 'palm-gust-riposte'
        ? drive.counterflow({ angle: 0, side: 'right' })
        : drive.palmGust({ angle: 0, side: check === 'palm-gust-left' ? 'left' : 'right' });
    } else if (check === 'palm-forge') {
      if (before.phase !== 'forge') throw new Error('palm-forge check requires the forge');
      stateKey = 'palmForge';
      const part = ['Spur', 'Chisel', 'Striker', 'Bolt', 'Awl', 'Dome', 'Pin', 'Bead'].find((name) => before.targets?.[name]);
      if (!part) throw new Error(`no visible forge part: ${Object.keys(before.targets ?? {}).join(', ')}`);
      action = drive.palmForge(part, 'left');
    } else if (check === 'outer-ring') {
      if (before.phase !== 'fight') throw new Error('outer-ring check requires a fight');
      stateKey = 'outerRing';
      action = drive.outerRingReturn('right');
    } else if (check === 'finger-groove') {
      if (before.phase !== 'fight') throw new Error('finger-groove check requires a fight');
      stateKey = 'groove';
      action = drive.groove({ side: 'right' });
    } else if (check === 'arena-morph-tutorial') {
      const g = window.__game;
      g.progress.matches = 0;
      g.progress.guide = 'match';
      g.tutorialRound = 2;
      g.morphedOnce = false;
      g.elapsed = 3.2;
      g.labelTimer = 0;
      await sleep(500);
      tutorialProof = {
        label: g.label.current,
        leftGhost: g.ghost.root.visible,
        rightGhost: g.forgeGhost.root.visible,
        tutorialRound: g.tutorialRound,
      };
      if (!tutorialProof.leftGhost || !tutorialProof.rightGhost || !tutorialProof.label.includes('SQUEEZE INWARD')) throw new Error(`two-hand Squeeze lesson missing: ${JSON.stringify(tutorialProof)}`);
      action = Promise.resolve();
    } else if (check.startsWith('arena-morph')) {
      if (before.phase !== 'fight') throw new Error('arena-morph check requires a fight');
      stateKey = 'morph';
      const variant = check.split('-').at(-1);
      const moves = {
        squeeze: { squeeze: 0.04, twist: 0, tilt: 0, hold: 0.35 },
        stretch: { squeeze: -0.04, twist: 0, tilt: 0, hold: 0.35 },
        twist: { squeeze: 0, twist: 28, tilt: 0, hold: 0.35 },
        tilt: { squeeze: 0, twist: 0, tilt: 0.07, hold: 0.35 },
        cancel: { squeeze: 0, twist: 0, tilt: 0, hold: 0.15 },
      };
      action = drive.arenaForge(moves[variant] ?? moves.squeeze);
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
      if (stateKey === 'outerRing') sawTransient ||= current.outerRing?.state === 'palm' || current.outerRing?.state === 'returned';
      else if (stateKey === 'morph') sawTransient ||= !!current.morph && (Math.abs(current.morph.scaleX - 1) > 0.015 || Math.abs(current.morph.scaleZ - 1) > 0.015 || Math.abs(current.morph.tilt) > 0.01);
      else if (launchCheck) sawTransient ||= current.phase === 'fight';
      else if (stateKey === 'groove') sawTransient ||= (current.grooves?.length ?? 0) > 0;
      else if (stateKey === 'palmGust') sawTransient ||= (current.palmGust?.count ?? 0) > (before.palmGust?.count ?? 0);
      else if (stateKey && current[stateKey]) sawTransient = true;
      peakCharges = Math.min(peakCharges, current.charges);
      await sleep(16);
    }
    // A very slow headless IWER may finish the launch but never advance the cosmetic hand-parking
    // tween. The gameplay transition is the proof; do not leave the browser command queued forever.
    if (!finished && launchCheck && drive.state().phase === 'fight') {
      drive.rest();
      finished = true;
    }
    for (let sample = 0; sample < 200 && !finished; sample++) await sleep(16);
    if (!finished) throw new Error(`${check} action did not settle`);
    if (failure) throw new Error(failure);
    if (stateKey && check !== 'arena-morph-cancel' && !sawTransient) throw new Error(`${stateKey} never became visibly active`);

    const after = drive.state();
    if (check === 'arena-morph-cancel') {
      if (after.charges !== before.charges) throw new Error(`cancel spent a charge (${before.charges} -> ${after.charges})`);
      if ((after.morph?.cancels ?? 0) <= (before.morph?.cancels ?? 0)) throw new Error('cancel was not recorded');
    }
    if ((check === 'palm-gust' || check === 'palm-gust-left') && after.charges !== before.charges - 1) throw new Error(`normal Forge Gust must spend exactly one charge (${before.charges} -> ${after.charges})`);
    if (check === 'palm-gust-riposte' && (after.charges !== before.charges || !after.palmGust?.riposte)) throw new Error(`Counterflow was not free and marked as a riposte (${before.charges} -> ${after.charges})`);
    if (check === 'rim-spring' && after.charges !== before.charges - 1) throw new Error(`Rim Spring must spend exactly one charge (${before.charges} -> ${after.charges})`);
    if (check.startsWith('arena-morph-') && check !== 'arena-morph-tutorial' && check !== 'arena-morph-cancel' && after.charges !== before.charges - 1) throw new Error(`Arena Forge must commit exactly one charge (${before.charges} -> ${after.charges})`);
    if (check.startsWith('arena-morph-') && check !== 'arena-morph-tutorial' && !before.strikeCommitted && after.strikeCommitted) throw new Error('pinched Arena Forge was misread as an ultimate slap');
    return {
      check,
      before: { phase: before.phase, charges: before.charges },
      observed: tutorialProof ?? (stateKey ? { stateKey, sawTransient } : { chargeSpent: peakCharges < before.charges }),
      after: { phase: after.phase, charges: after.charges, build: after.build, morph: after.morph, diagnostics: after.diagnostics },
    };
  }, mode);
}
