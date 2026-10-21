// First Five Minutes probe: a brand-new player's first session, driven with the emulated hands the
// way a newcomer would play it (wait for each card, read it, then do what it says), timed in game
// seconds from ENTER. Run end to end with scripts/check-first-five.sh (npm run check:first-five).
//
// A browser lease is capped at 110 s, so the session spans several leases (FIRST_FIVE_PART):
//   fresh   wipe the save (demo-save.ts freshSave) and reload; then enter XR again
//   drive   play on from wherever the page is, for about FIRST_FIVE_BUDGET ms (default 80000), then
//           pause the game system (elics stop()) so no game time passes between leases; repeat
//           until the result says done
//   report  the JSON summary; throws when the first knockout took 90 s of game time or more
// Everything lives in the page (window.__firstFive) between leases. The office_small room's real
// table is where the staged DESK KO of the forge lesson round can happen.
//
// Measured: seconds from ENTER to the first knockout (yours, and either side's), to the first DESK
// KO and to the end of match 1; every distinct text prompt (card, stamp, print label) with its words;
// the verbs whose lessons were shown and the ones the driver performed; the result card after the
// match (the come-back card: streak and tomorrow's pull).
export default async function run({ page, frame }) {
  let target = null;
  for (const candidate of [frame, ...page.frames()].filter(Boolean)) {
    if (await candidate.evaluate(() => !!window.__game && typeof window.drive === 'object').catch(() => false)) {
      target = candidate;
      break;
    }
  }
  if (!target) throw new Error('window.__game / window.drive not found: is the dev server up and the page loaded?');
  const part = process.env.FIRST_FIVE_PART ?? 'drive';
  const budget = Number(process.env.FIRST_FIVE_BUDGET ?? 80000);

  if (part === 'fresh') {
    return target.evaluate(async () => {
      const { freshSave } = await import('/src/game/demo-save.ts');
      freshSave(localStorage);
      delete window.__firstFive;
      setTimeout(() => location.reload(), 50);
      return { ok: true, part: 'fresh', next: 'wait for the runtime, enter XR (scripts/emu.sh enter), then FIRST_FIVE_PART=drive' };
    });
  }

  const result = await target.evaluate(async ({ part, budget }) => {
    const g = window.__game;
    const drive = window.drive;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const words = (s) => s.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
    const V = g.root.position.constructor;

    // ---- state kept in the page between leases ----
    const ff = (window.__firstFive ??= {
      started: false, done: false, failed: '', t0: 0, gap: 0, lastEnd: null, leases: 0,
      prompts: {}, order: [], events: [], actions: [], errors: [], taught: {}, performed: {},
      firstKo: null, firstAnyKo: null, firstDeskKo: null, matchEnd: null, afterMatch: [],
    });
    const now = () => +(g.time - ff.t0 - ff.gap).toFixed(2);

    // Lesson cards, by the verb they teach (match-system.ts updateGuide / updateStrike / updateFlick).
    const LESSONS = [
      ['carry', /Put it in the arena to play|Put your top in the arena/],
      ['rip', /PULL BACK \+ RELEASE/],
      ['ramp', /PINCH THE FLOOR/],
      ['arenaForge', /SQUEEZE INWARD|PUSH INWARD/],
      ['deskKo', /WRENCH IT OFF YOUR DESK/],
      ['strike', /PINCH THE SEAL · STAMP THE ARENA|STRIKE NOW|: PINCH \+ STAMP/],
      ['flick', /FLICK/],
    ];
    const record = (kind, text) => {
      if (!ff.started || ff.done || typeof text !== 'string' || !text.trim()) return;
      const t = now();
      // Numbers that tick (a pull's percent, a countdown, a score) do not make a new prompt.
      const key = `${kind}:${text.replace(/\d+(\.\d+)?/g, '#')}`;
      if (!ff.prompts[key]) {
        ff.prompts[key] = { kind, text, words: words(text), at: t };
        ff.order.push(key);
      }
      for (const [verb, re] of LESSONS) if (re.test(text)) ff.taught[verb] ??= t;
      if (ff.matchEnd !== null && kind === 'card') ff.afterMatch.push({ at: t, text });
    };
    if (!g.label.__ffHooked) {
      const hook = (obj, method, kind, pick = (a) => a[0]) => {
        const orig = obj[method].bind(obj);
        obj[method] = (...args) => {
          try {
            record(kind, pick(args));
          } catch {}
          return orig(...args);
        };
      };
      hook(g.label, 'set', 'card');
      if (g.printLabel?.set) hook(g.printLabel, 'set', 'print');
      hook(g.stamp, 'show', 'stamp', (a) => [a[0], a[1]].filter(Boolean).join('\n'));
      g.label.__ffHooked = true;
      // Every finish: who went out and how (match-system.ts finish(v, deskKo)).
      const finish = g.finish;
      g.finish = function (v, deskKo = false) {
        const loser = v === 1 ? this.theirs : this.mine;
        const how = loser.finish;
        const out = finish.call(this, v, deskKo);
        try {
          if (ff.started && !ff.done) {
            const t = now();
            const ko = v !== 2 && how !== 'spin' && how !== null;
            ff.events.push({ at: t, winner: v === 1 ? 'you' : v === -1 ? 'rival' : 'draw', finish: deskKo ? 'desk' : how, round: this.tutorialRound, heat: [...this.barPoints] });
            if (ko) ff.firstAnyKo ??= t;
            if (ko && v === 1) ff.firstKo ??= t;
            if (deskKo && v === 1) ff.firstDeskKo ??= t;
            if (this.matchOver && ff.matchEnd === null) ff.matchEnd = t;
          }
        } catch {}
        return out;
      };
    }

    const summary = () => {
      const prompts = ff.order.map((k) => ff.prompts[k]);
      const upTo = (t) => prompts.filter((p) => t === null || p.at <= t);
      const inMatch = upTo(ff.matchEnd);
      return {
        done: ff.done,
        failed: ff.failed,
        leases: ff.leases,
        phase: g.phase,
        gameSeconds: ff.started ? now() : 0,
        secondsTo: { firstKo: ff.firstKo, firstAnyKo: ff.firstAnyKo, firstDeskKo: ff.firstDeskKo, matchEnd: ff.matchEnd },
        prompts: {
          distinctToMatchEnd: inMatch.length,
          wordsToMatchEnd: inMatch.reduce((n, p) => n + p.words, 0),
          cards: inMatch.filter((p) => p.kind !== 'stamp').length,
          stamps: inMatch.filter((p) => p.kind === 'stamp').length,
          all: prompts.map((p) => `${p.at}s ${p.kind}: ${p.text.replace(/\n/g, ' / ')}`),
        },
        verbs: { taught: ff.taught, performed: ff.performed },
        autoPlaced: !!ff.autoPlaced,
        rounds: ff.events,
        resultCards: ff.afterMatch.map((c) => c.text.replace(/\n/g, ' / ')),
        comeBackCard: ff.afterMatch.some((c) => /STREAK/i.test(c.text)),
        actions: ff.actions.slice(-40),
        errors: ff.errors,
      };
    };
    if (part === 'report') return summary();

    // ---- a drive lease ----
    if (typeof g.play === 'function') g.play();
    if (ff.lastEnd !== null) ff.gap += Math.max(0, g.time - ff.lastEnd);
    ff.leases++;
    drive.rest();
    const { COMFORT } = await import('/src/game/comfort.ts');
    COMFORT.oneHand = false;
    await sleep(300);
    if (!ff.started) {
      if (g.progress.matches !== 0 || g.progress.guide !== 'launch') throw new Error(`not a fresh save (matches ${g.progress.matches}, guide ${g.progress.guide}): run FIRST_FIVE_PART=fresh first`);
      // ENTER: the placement wait starts now (KeyP re-asks for the press when the arena is already up).
      if (g.phase === 'hub') {
        drive.key('KeyP');
        await sleep(100);
      }
      // On a detected table the arena can rise and settle before this lease starts: the clock then
      // starts at the ready card (placement time is not counted, and the summary says so).
      ff.autoPlaced = g.phase === 'ready';
      if (g.phase !== 'placing' && !ff.autoPlaced) throw new Error(`expected placement after ENTER, got ${g.phase}`);
      g.settle = 0;
      ff.t0 = g.time;
      ff.started = true;
    }

    const wall0 = performance.now();
    const left = () => budget - (performance.now() - wall0);
    /** Waits `s` game seconds (the game clock can run slower than the wall under a heavy emulator). */
    const gameWait = async (s) => {
      const end = g.time + s;
      for (let i = 0; i < 2000 && g.time < end && left() > 0; i++) await sleep(25);
    };
    const act = async (verb, fn) => {
      const t = now();
      try {
        await fn();
        ff.performed[verb] = (ff.performed[verb] ?? 0) + 1;
        ff.actions.push(`${t}s ${verb}`);
      } catch (e) {
        ff.errors.push(`${t}s ${verb}: ${e?.message ?? e}`);
        ff.actions.push(`${t}s ${verb} (failed)`);
      }
      drive.rest();
    };
    // Reading a card before acting on it: a newcomer is not a bot.
    const REACT = 0.8;
    let lastRamp = -9;
    let wrenchSeen = -1;

    while (!ff.done && left() > 12000) {
      const ph = g.phase;
      const label = g.label.current ?? '';
      if (now() > 420) {
        ff.failed = 'match 1 did not end within 7 minutes of game time';
        ff.done = true;
        break;
      }
      if (ph === 'placing') {
        if (g.print?.visible) {
          await gameWait(REACT);
          if (g.phase !== 'placing' || !g.print.visible) continue;
          const at = g.print.getWorldPosition(new V());
          await act('place', () => drive.tap([at.x, at.y + 0.01, at.z]));
          await gameWait(0.5);
        } else await sleep(50);
      } else if (ph === 'hub') {
        // The first hub: the note says to carry the top from its dock into the arena.
        await gameWait(REACT + 0.4);
        if (g.phase !== 'hub') continue;
        const c = g.root.localToWorld(new V(0, 0.03, 0));
        await act('carry', () => drive.drag('play', [c.x, c.y, c.z]));
        await gameWait(0.6);
        if (g.phase === 'hub') await act('carry-tap', () => drive.tap('play'));
        await gameWait(0.5);
      } else if (ph === 'ready') {
        // The rival's intro, then the card says to rip.
        const since = g.time - g.readySince;
        if (since < 2.6 && !/PULL BACK|RIP AGAIN/.test(label)) {
          await sleep(50);
          continue;
        }
        await gameWait(REACT * 0.5);
        await act('rip', () => drive.rip({ power: 0.86, aim: 0 }));
        wrenchSeen = -1;
        lastRamp = -9;
      } else if (ph === 'pulling') {
        await sleep(50);
      } else if (ph === 'fight') {
        const t = g.elapsed;
        const charges = g.charges.charges;
        const r = Math.hypot(g.theirs.x, g.theirs.z) / g.arena.radius;
        // The forge lesson round asks for the two-hand squeeze; a newcomer does that, not a ramp.
        const forgeLesson = g.progress.matches === 0 && g.tutorialRound === 2 && !g.morphedOnce;
        if (/WRENCH IT OFF YOUR DESK/.test(label) && !g.morphedOnce) {
          // The card names the move and the red arc shows the edge: squeeze when the rival is on it.
          if (wrenchSeen < 0) wrenchSeen = t;
          const aim = g.deskWrenchAt?.();
          const ang = Math.atan2(g.theirs.z, g.theirs.x);
          const onEdge = aim !== null && aim !== undefined && r > 0.45 && Math.abs(Math.atan2(Math.sin(ang - aim), Math.cos(ang - aim))) < 0.5;
          if ((onEdge && t - wrenchSeen > REACT) || t - wrenchSeen > 6) await act('arenaForge', () => drive.arenaForge({ squeeze: 0.04, twist: 0, tilt: 0, hold: 0.35 }));
          else await sleep(25);
        } else if (/SQUEEZE INWARD|PUSH INWARD/.test(label) && !g.morphedOnce) {
          await gameWait(REACT);
          if (g.phase === 'fight') await act('arenaForge', () => drive.arenaForge({ squeeze: 0.04, twist: 0, tilt: 0, hold: 0.35 }));
        } else if (/PINCH THE SEAL · STAMP THE ARENA|STRIKE NOW|: PINCH \+ STAMP/.test(label) && g.forgeBar.value >= 0.999) {
          await gameWait(REACT);
          if (g.phase === 'fight' && g.forgeBar.value >= 0.999) await act('strike', () => drive.stampUltimate({ at: 'rival' }));
        } else if (/PINCH THE FLOOR/.test(label) || (!forgeLesson && g.theirs.alive && charges >= 1 && t > 2.5 && t - lastRamp > 2.2 && r > 0.5)) {
          // The ramp lesson, and later the newcomer's one habit: ramp the rival when it nears the rim.
          if (/PINCH THE FLOOR/.test(label)) await gameWait(REACT);
          if (g.phase !== 'fight' || !g.theirs.alive) continue;
          lastRamp = g.elapsed;
          await act('ramp', () => drive.ramp({ at: 'rival', hold: 0.35 }));
        } else await sleep(40);
      } else if (ph === 'result') {
        // A finished match: stay on the result card while its reveals and the come-back card show.
        if (ff.matchEnd !== null && now() - ff.matchEnd > 14) ff.done = true;
        else await sleep(100);
      } else {
        ff.failed = `unexpected phase ${ph} before match 1 ended`;
        ff.done = true;
      }
    }
    drive.rest();
    if (!ff.done && typeof g.stop === 'function') {
      // No game time between leases: the next lease plays on from this exact moment.
      g.stop();
    }
    ff.lastEnd = g.time;
    return summary();
  }, { part, budget });

  if (part === 'report') {
    const fails = [];
    if (!result.done) fails.push('the session has not finished (run more drive leases)');
    if (result.failed) fails.push(result.failed);
    if (result.secondsTo.firstKo === null) fails.push('no knockout of yours in the first match');
    else if (result.secondsTo.firstKo >= 90) fails.push(`first knockout at ${result.secondsTo.firstKo} s of game time (want < 90 s)`);
    if (fails.length) throw new Error(`first five minutes failed: ${fails.join('; ')}\n${JSON.stringify(result, null, 2)}`);
    return { ok: true, ...result };
  }
  return result;
}
