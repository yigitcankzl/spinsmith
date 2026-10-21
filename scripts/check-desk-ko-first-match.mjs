// Browser probe: a brand-new player's first match stages a DESK KO in its forge-lesson round.
// The rival is steered to the rim facing the nearest real desk edge, the card says WRENCH IT OFF
// YOUR DESK, and one two-hand Squeeze (the emulated hands, not a scripted velocity) throws it off
// the desk with the longer slow motion. Run through scripts/check-desk-ko-first-match.sh.
export default async function run({ page, frame }) {
  let target = null;
  for (const candidate of [frame, ...page.frames()].filter(Boolean)) {
    if (await candidate.evaluate(() => typeof window.drive === 'object' && !!window.__game).catch(() => false)) {
      target = candidate;
      break;
    }
  }
  if (!target) throw new Error('window.drive not found: enter the emulated XR session first');
  return target.evaluate(async () => {
    const g = window.__game;
    const drive = window.drive;
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const { COMFORT } = await import('/src/game/comfort.ts');
    COMFORT.oneHand = false;
    drive.rest();
    // A fresh first match: matches 0, the guided first bout, in the Forge Bowl.
    g.progress.matches = 0;
    g.progress.guide = 'match';
    if (g.arena.layout.name !== 'Forge Bowl') g.setArena(g.arenas.find((arena) => arena.name === 'Forge Bowl'));
    g.startMatch();
    for (let i = 0; i < 200 && g.phase !== 'ready'; i++) await sleep(25);
    if (g.phase !== 'ready') throw new Error(`first match never reached the rip (phase ${g.phase})`);
    // Round one (the ramp lesson) is not this probe's subject: the next rip is the forge lesson.
    g.tutorialRound = 1;
    g.launch(0.82, 0);
    if (g.tutorialRound !== 2 || !g.deskWrench.armed) throw new Error(`forge-lesson round did not arm the staged DESK KO (round ${g.tutorialRound}, armed ${g.deskWrench.armed})`);
    // Skip the opening grace (the rim holds every top in it) without touching the 10 s lesson shield.
    g.arena.elapsed = Math.max(g.arena.elapsed, g.arena.grace + 0.1);
    g.elapsed = Math.max(g.elapsed, g.arena.grace + 0.1);
    g.charges.charges = 3;
    let aim = null;
    let steered = false;
    for (let i = 0; i < 160 && !steered; i++) {
      aim = g.deskWrenchAt();
      const r = Math.hypot(g.theirs.x, g.theirs.z);
      steered = aim !== null && r > g.arena.radius * 0.45
        && Math.abs(Math.atan2(Math.sin(Math.atan2(g.theirs.z, g.theirs.x) - aim), Math.cos(Math.atan2(g.theirs.z, g.theirs.x) - aim))) < 0.5;
      await sleep(25);
    }
    if (!steered) throw new Error(`rival never reached the edge-facing rim (aim ${aim}, sectors ${g.deskEdgeSectors.length}, rival ${g.theirs.x.toFixed(3)},${g.theirs.z.toFixed(3)})`);
    g.labelTimer = 0;
    await sleep(400);
    const cue = { label: g.label.current, arc: !!g.deskArcs[0]?.visible, arcOpacity: +(g.deskArcs[0]?.material.opacity ?? 0).toFixed(2) };
    if (!cue.label.includes('WRENCH IT OFF YOUR DESK')) throw new Error(`staged prompt missing: ${JSON.stringify(cue)}`);
    if (!cue.arc) throw new Error('nearest red desk-edge arc is not shown');
    const interventions = window.spinsmithDiagnostics?.().interventions ?? 0;
    await drive.arenaForge({ squeeze: 0.04, twist: 0, tilt: 0, hold: 0.35 });
    let peakSlowMo = 0;
    let offDesk = false;
    let pendingSeen = false;
    for (let i = 0; i < 400 && !g.deskKoScored; i++) {
      peakSlowMo = Math.max(peakSlowMo, g.slowMo);
      offDesk ||= !!g.theirView.offDesk;
      pendingSeen ||= !!g.deskVerdict;
      await sleep(25);
    }
    const proof = {
      aim: +aim.toFixed(2),
      cue,
      action: g.arenaForgeAction,
      fired: g.deskWrench.fired,
      pendingSeen,
      offDesk,
      scored: g.deskKoScored,
      peakSlowMo: +peakSlowMo.toFixed(2),
      round: g.matchLog.rounds.at(-1),
      interventions: [interventions, window.spinsmithDiagnostics?.().interventions ?? 0],
      matches: g.progress.matches,
    };
    if (!proof.fired) throw new Error(`the forge did not fire the staged wrench: ${JSON.stringify(proof)}`);
    if (proof.interventions[1] <= proof.interventions[0]) throw new Error(`the emulated hands did not author the forge: ${JSON.stringify(proof)}`);
    if (!proof.scored || !proof.offDesk || proof.round !== 'DESK KO') throw new Error(`no DESK KO from the first-match forge wrench: ${JSON.stringify(proof)}`);
    if (proof.peakSlowMo < 0.9) throw new Error(`staged DESK KO slow motion too short: ${JSON.stringify(proof)}`);
    return { ok: true, ...proof };
  });
}
