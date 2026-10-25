// One continuous recording across many browser leases (each lease is capped near 110 s).
// LONG_PART=start  composite the room + game canvases into a MediaRecorder kept in the page
// LONG_PART=flush  append the chunks recorded so far to LONG_OUT (raw recorder stream)
// LONG_PART=stop   stop the recorder and append the last chunks
// LONG_PART=auto   play on with the emulated hands for LONG_BUDGET ms (match autopilot, no pause)
// The game keeps running between leases, so nothing is skipped: the file is one unbroken take.
import { appendFileSync } from 'node:fs';

export default async function run({ page, frame }) {
  let target = null;
  for (const f of [frame, ...page.frames()].filter(Boolean)) {
    if (await f.evaluate(() => typeof window.drive === 'object').catch(() => false)) {
      target = f;
      break;
    }
  }
  if (!target) throw new Error('window.drive not found');
  const part = process.env.LONG_PART ?? 'flush';
  const out = process.env.LONG_OUT ?? '';

  const pull = async () => {
    const size = await target.evaluate(async () => {
      const r = window.__long;
      if (!r) return 0;
      const blob = new Blob(r.parts.splice(0));
      const buf = new Uint8Array(await blob.arrayBuffer());
      let bin = '';
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      r.b64 = btoa(bin);
      return r.b64.length;
    });
    let b64 = '';
    for (let at = 0; at < size; at += 700000) b64 += await target.evaluate(([a, n]) => window.__long.b64.slice(a, a + n), [at, 700000]);
    await target.evaluate(() => window.__long && (window.__long.b64 = ''));
    if (out && b64) appendFileSync(out, Buffer.from(b64, 'base64'));
    return +(b64.length * 0.75 / 1e6).toFixed(1);
  };

  if (part === 'start') {
    await target.evaluate(() => window.drive.prepare());
    return target.evaluate(({ bitrate }) => {
      if (window.__long) return { ok: true, already: true };
      const byZ = (z) => [...document.querySelectorAll('canvas')].find((c) => c.style.zIndex === z);
      const room = byZ('1');
      const game = byZ('2');
      if (!room || !game) throw new Error('canvases not found');
      const cv = document.createElement('canvas');
      cv.width = 1920;
      cv.height = 1080;
      const g = cv.getContext('2d');
      const cover = (s) => {
        const sa = s.width / s.height, oa = cv.width / cv.height;
        let sx = 0, sy = 0, sw = s.width, sh = s.height;
        if (sa > oa) { sw = s.height * oa; sx = (s.width - sw) / 2; } else if (sa < oa) { sh = s.width / oa; sy = (s.height - sh) / 2; }
        g.drawImage(s, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
      };
      const r = { parts: [], on: true, b64: '' };
      const draw = () => {
        if (!r.on) return;
        g.clearRect(0, 0, cv.width, cv.height);
        cover(room);
        cover(game);
        requestAnimationFrame(draw);
      };
      draw();
      const stream = cv.captureStream(60);
      for (const t of window.__audioTap?.()?.getAudioTracks() ?? []) stream.addTrack(t);
      const types = ['video/webm;codecs=h264,opus', 'video/mp4;codecs=avc1.42E01E,opus', 'video/mp4;codecs=avc1.42E01E', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp8'];
      const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t));
      r.rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
      r.rec.ondataavailable = (e) => e.data.size && r.parts.push(e.data);
      r.rec.start(1000);
      r.mimeType = mimeType;
      window.__long = r;
      return { ok: true, mimeType };
    }, { bitrate: Number(process.env.LONG_BITRATE ?? 14_000_000) });
  }
  if (part === 'flush') return { mb: await pull() };
  if (part === 'stop') {
    await target.evaluate(
      () =>
        new Promise((done) => {
          const r = window.__long;
          r.rec.onstop = () => done();
          r.rec.stop();
          r.on = false;
        }),
    );
    const mb = await pull();
    await target.evaluate(() => delete window.__long);
    return { mb };
  }

  // ---- auto: a player who reads each card and uses every move the match offers ----
  const budget = Number(process.env.LONG_BUDGET ?? 85000);
  const res = await target.evaluate(async ({ budget, carry, hold }) => {
    window.__autoCarry = carry;
    window.__autoResultHold = hold;
    const g = window.__game;
    const drive = window.drive;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const V = g.root.position.constructor;
    const wall0 = performance.now();
    const left = () => budget - (performance.now() - wall0);
    const st = (window.__autoState ??= { resultAt: null, lastRamp: -9, wrenchSeen: -1, did: {}, log: [] });
    const act = async (verb, fn) => {
      try {
        await fn();
        st.did[verb] = (st.did[verb] ?? 0) + 1;
      } catch (e) {
        st.log.push(`${verb}: ${e?.message ?? e}`);
      }
      drive.rest();
    };
    const wait = async (s) => {
      const end = g.time + s;
      while (g.time < end && left() > 0) await sleep(25);
    };
    let stopReason = 'budget';
    while (left() > 9000) {
      const ph = g.phase;
      const label = g.label.current ?? '';
      if (ph !== 'result') st.resultAt = null;
      if (ph === 'placing') {
        if (g.print?.visible) {
          await wait(0.8);
          const at = g.print.getWorldPosition(new V());
          await act('place', () => drive.tap([at.x, at.y + 0.01, at.z]));
          await wait(0.5);
        } else await sleep(50);
      } else if (ph === 'hub') {
        if (!window.__autoCarry) {
          stopReason = 'hub';
          break;
        }
        // Carry the top from its dock into the arena, as the hub's card asks.
        await wait(1.2);
        if (g.phase !== 'hub') continue;
        const c = g.root.localToWorld(new V(0, 0.03, 0));
        await act('carry', () => drive.drag('play', [c.x, c.y, c.z]));
        await wait(0.6);
        if (g.phase === 'hub') await act('carry-tap', () => drive.tap('play'));
        await wait(0.5);
      } else if (ph === 'ready') {
        if (g.time - g.readySince < 2.6 && !/PULL BACK|RIP AGAIN/.test(label)) {
          await sleep(50);
          continue;
        }
        await wait(0.4);
        await act('rip', () => drive.rip({ power: 0.86, aim: (Math.random() - 0.5) * 20 }));
        st.wrenchSeen = -1;
        st.lastRamp = -9;
      } else if (ph === 'fight') {
        const t = g.elapsed;
        const r = Math.hypot(g.theirs.x, g.theirs.z) / g.arena.radius;
        const forgeLesson = g.progress.matches === 0 && g.tutorialRound === 2 && !g.morphedOnce;
        if (/WRENCH IT OFF YOUR DESK/.test(label) && !g.morphedOnce) {
          if (st.wrenchSeen < 0) st.wrenchSeen = t;
          const aim = g.deskWrenchAt?.();
          const ang = Math.atan2(g.theirs.z, g.theirs.x);
          const onEdge = aim != null && r > 0.45 && Math.abs(Math.atan2(Math.sin(ang - aim), Math.cos(ang - aim))) < 0.5;
          if ((onEdge && t - st.wrenchSeen > 0.8) || t - st.wrenchSeen > 6) await act('squeeze', () => drive.arenaForge({ squeeze: 0.04, hold: 0.35 }));
          else await sleep(25);
        } else if (/SQUEEZE INWARD|PUSH INWARD/.test(label) && !g.morphedOnce) {
          await wait(0.8);
          if (g.phase === 'fight') await act('squeeze', () => drive.arenaForge({ squeeze: 0.04, hold: 0.35 }));
        } else if (/PINCH THE SEAL|STRIKE NOW|PINCH \+ STAMP|PRESS THE SEAL/.test(label)) {
          await wait(0.6);
          if (g.phase === 'fight') await act('strike', () => drive.stampUltimate({ at: 'rival' }));
        } else if (/FLICK/.test(label)) {
          await wait(0.6);
          if (g.phase === 'fight') await act('flick', () => drive.flick({ target: 'rival' }));
        } else if (/CROSSGUARD|RAIL/.test(label) && !/SPENT/.test(label)) {
          await wait(0.6);
          if (g.phase === 'fight') await act('crossguard', () => drive.crossguard({ hold: 0.8 }));
        } else if (/RUB/.test(label) && !/LIFT/.test(label)) {
          await wait(0.6);
          if (g.phase === 'fight') await act('rub', () => drive.rub({ seconds: 1.2 }));
        } else if (/CUP|PINCH \+ PULL TO SLING/.test(label)) {
          await wait(0.5);
          if (/SLING/.test(label)) await act('sling', () => drive.sling({}));
          else await act('cup', () => drive.cup({ at: 'mine' }));
        } else if (/PINCH THE FLOOR/.test(label) || (!forgeLesson && g.theirs.alive && g.charges.charges >= 1 && t > 2.5 && t - st.lastRamp > 2.2 && r > 0.5)) {
          if (/PINCH THE FLOOR/.test(label)) await wait(0.8);
          if (g.phase !== 'fight' || !g.theirs.alive) continue;
          st.lastRamp = g.elapsed;
          // Now and then a different move, the way a player tries what they have.
          const roll = Math.random();
          const lessonMove = { '1-2': () => drive.rimSpring({ target: 'rival' }), '1-3': () => drive.palmGust({}), '1-4': async () => { await drive.cup({ at: 'mine' }); await drive.sling({}); } }[g.bout?.id];
          if (lessonMove && roll < 0.55) await act(`lesson ${g.bout.id}`, lessonMove);
          else if (!forgeLesson && g.progress.matches > 0 && roll < 0.68 && !g.morphedOnce) await act('squeeze', () => drive.arenaForge({ squeeze: 0.04, hold: 0.35 }));
          else if (g.mine.spin < 0.45 && roll < 0.5) await act('rub', () => drive.rub({ seconds: 1.2 }));
          else await act('ramp', () => drive.ramp({ at: 'rival', hold: 0.35 }));
        } else await sleep(40);
      } else if (ph === 'result') {
        st.resultAt ??= g.time;
        if (g.matchOver && g.time - st.resultAt > window.__autoResultHold) {
          stopReason = 'result';
          break;
        }
        await sleep(100);
      } else await sleep(50);
    }
    drive.rest();
    return { stopReason, phase: g.phase, matches: g.progress.matches, guide: g.progress.guide, did: st.did, log: st.log.slice(-6), score: [g.myPoints, g.theirPoints] };
  }, { budget, carry: process.env.LONG_CARRY === '1', hold: Number(process.env.LONG_HOLD ?? 12) });
  return { ...res, mb: await pull() };
}
