// Re-places the arena where the emulated head now looks (P, then a tap on the glowing print), so it
// stands on the emulator desk after a page loaded with the head standing (it was then on the tray).
export default async function run({ page, frame }) {
  for (const f of [frame, ...page.frames()].filter(Boolean)) {
    const r = await f.evaluate(async () => { const g = window.__game; if (!g) return null;
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      window.drive.key('KeyP');
      for (let i = 0; i < 120 && !g.print?.visible; i++) await sleep(50);
      await sleep(800);
      if (!g.print?.visible) return { phase: g.phase, print: false };
      const at = g.print.getWorldPosition(g.p.clone());
      await window.drive.tap([at.x, at.y + 0.01, at.z]);
      for (let i = 0; i < 120 && g.phase === 'placing'; i++) await sleep(50);
      await sleep(1500);
      const p = g.root.getWorldPosition(g.p.clone());
      return { phase: g.phase, onTable: g.onTable, root: [p.x, p.y, p.z].map((v) => +v.toFixed(3)) };
    }).catch((e) => String(e));
    if (r) return r;
  }
}
