import probe from '../check-desk-ko-first-match.mjs';
// Run after a fresh reload and scripts/emu.sh enter: npx @iwsdk/cli browser run scripts/capture/desk-ko-first-shots.mjs --timeout 108000
// IWER-labelled stills of the first match's staged DESK KO: the cue, the throw, the verdict.
export default async function run({ page, frame }) {
  let target = null;
  for (const c of [frame, ...page.frames()].filter(Boolean)) {
    if (await c.evaluate(() => !!window.__game).catch(() => false)) { target = c; break; }
  }
  await page.evaluate(() => {
    document.querySelector('#spinsmith-capture-disclosure')?.remove();
    const b = document.createElement('div');
    b.id = 'spinsmith-capture-disclosure';
    b.textContent = 'IWER EMULATOR · office_small ROOM · NO HEADSET FOOTAGE';
    Object.assign(b.style, { position: 'fixed', zIndex: 2147483647, right: '18px', bottom: '14px', padding: '6px 9px', borderRadius: '6px', color: 'rgba(255,255,255,.85)', background: 'rgba(5,8,12,.72)', font: '600 11px system-ui', letterSpacing: '.08em', pointerEvents: 'none' });
    document.body.appendChild(b);
  });
  const shots = [];
  const done = probe({ page, frame }).then((r) => ({ r }), (e) => ({ e: String(e) }));
  const want = [
    ['cue', () => window.__game.label?.current?.includes('WRENCH')],
    ['flight', () => !!window.__game.deskVerdict && window.__game.slowMo > 0.3],
  ];
  for (const [name, test] of want) {
    for (let i = 0; i < 700; i++) {
      if (await target.evaluate(test).catch(() => false)) {
        const path = `artifacts/capture/desk-ko-first-${name}.png`;
        await page.screenshot({ path });
        shots.push(path);
        break;
      }
      await new Promise((r) => setTimeout(r, 120));
    }
  }
  return { shots, probe: await done };
}
